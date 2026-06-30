import { getTopLevelOriginalPostsSince, getTopRepliesForPost, countDisagreeRepliesFromToSince } from "@/lib/db/posts";
import { getReadPostIds, recordPostRead } from "@/lib/db/post-reads";
import { getFollowingIds, getFollowerIds, isMutualFollow } from "@/lib/db/follows";
import { recordLikeReceivedActivity } from "@/lib/personality-activity/record";
import type { ReplyEngagementContext } from "@/lib/openai/post";
import {
  classifyRelationship,
  getRelationshipCategoryLabel,
} from "@/lib/profile/relationship-category";
import type { Post } from "@/lib/types/post";
import type { Personality } from "@/lib/types/personality";

import { decideEngagement, decideReplyLike } from "./engagement";
import {
  computeAgreeIntensity,
  computeDisagreeIntensity,
  getRelationshipTowardAuthor,
} from "./engagement-intensity";
import {
  recordAgreeReplyEffects,
  recordDisagreeReplyEffects,
  recordFollowEffects,
  recordLikeEffects,
  recordRepostEffects,
  recordUnfollowEffects,
} from "./engagement-effects";
import { startOfDisagreeCooldownWindow, startOfRollingWindow } from "./limits";
import { truncateForLog, type SimulationLogFn } from "./logger";
import {
  followAuthor,
  likePost,
  recordPostView,
  replyToSpecificPost,
  repostSpecificPost,
  unfollowAuthor,
} from "./posts";
import type { SimulationWorld } from "./world";
import { weightedSampleWithoutReplacement } from "./utils";

const READ_POST_COUNT = 5;
const REPLIES_TO_EVALUATE = 5;
const FOLLOWED_AUTHOR_WEIGHT = 3;
const DEFAULT_AUTHOR_WEIGHT = 1;
const THREADING_POST_READ_BOOST = 5;

function engagementReadWeight(post: Post, authorSocialScore = 0): number {
  const { replies, views, reposts, likes } = post.stats;
  const engagementScore =
    replies * 4 + likes * 2 + reposts * 3 + views * 0.05;
  const fameBoost = 1 + Math.log1p(authorSocialScore / 500);

  return (1 + Math.log1p(engagementScore)) * fameBoost;
}

function getPostReadWeight(
  post: Post,
  followingIds: Set<string>,
  authorSocialScore = 0,
  threadingPostIds: Set<string>,
): number {
  const followWeight = followingIds.has(post.author.personalityId)
    ? FOLLOWED_AUTHOR_WEIGHT
    : DEFAULT_AUTHOR_WEIGHT;

  const baseWeight = followWeight * engagementReadWeight(post, authorSocialScore);

  if (threadingPostIds.has(post.id)) {
    return baseWeight * THREADING_POST_READ_BOOST;
  }

  return baseWeight;
}

function findAuthor(
  world: SimulationWorld,
  personalityId: string,
): Personality | null {
  return (
    world.personalities.find(
      (personality) => personality.id === personalityId,
    ) ?? null
  );
}

function buildReplyEngagementContext(
  actor: Personality,
  author: Personality,
  tone: "agree" | "disagree",
  mutuallyFollowing: boolean,
): ReplyEngagementContext {
  const relationship = getRelationshipTowardAuthor(actor, author.id);
  const category = classifyRelationship(relationship, mutuallyFollowing);

  return {
    targetAuthor: {
      name: author.name,
      handle: author.handle,
    },
    relationship,
    category,
    categoryLabel: getRelationshipCategoryLabel(category),
    agreeIntensity:
      tone === "agree"
        ? computeAgreeIntensity(actor, relationship)
        : undefined,
    disagreeIntensity:
      tone === "disagree"
        ? computeDisagreeIntensity(actor, author, relationship)
        : undefined,
  };
}

async function pickPostsToRead(
  personality: Personality,
  followingIds: Set<string>,
  readPostIds: Set<string>,
  world: SimulationWorld,
): Promise<Post[]> {
  const since = startOfRollingWindow();
  const candidates = await getTopLevelOriginalPostsSince(since);
  const eligible = candidates.filter(
    (post) =>
      post.author.personalityId !== personality.id &&
      !readPostIds.has(post.id),
  );

  return weightedSampleWithoutReplacement(
    eligible,
    READ_POST_COUNT,
    (post) => {
      const author = findAuthor(world, post.author.personalityId);
      return getPostReadWeight(
        post,
        followingIds,
        author?.stats.socialScore ?? 0,
        world.threadingPostIds,
      );
    },
  );
}

export async function readPostsAndEngage(
  personality: Personality,
  world: SimulationWorld,
  log: SimulationLogFn,
): Promise<void> {
  const handle = `@${personality.handle}`;
  const [followingIds, followerIds, readPostIds] = await Promise.all([
    getFollowingIds(personality.id),
    getFollowerIds(personality.id),
    getReadPostIds(personality.id),
  ]);
  const posts = await pickPostsToRead(personality, followingIds, readPostIds, world);

  if (posts.length === 0) {
    log("warn", `${handle} has no unread posts in the last 24 hours.`);
    return;
  }

  log("info", `${handle} reading ${posts.length} posts`);

  const respondQueue: Array<{
    post: Post;
    tone: "agree" | "disagree";
  }> = [];

  const disagreeCooldownSince = startOfDisagreeCooldownWindow();

  for (const post of posts) {
    await recordPostView(post, world);
    await recordPostRead(personality.id, post.id);
    log(
      "info",
      `${handle} read @${post.author.handle}: ${truncateForLog(post.content)}`,
    );

    const author = findAuthor(world, post.author.personalityId);
    const isThreadingPost = world.threadingPostIds.has(post.id);
    const recentDisagreeCount =
      author && author.id !== personality.id
        ? await countDisagreeRepliesFromToSince(
            personality.id,
            author.id,
            disagreeCooldownSince,
          )
        : 0;
    const decision = decideEngagement({
      personality,
      post,
      author,
      alreadyFollowing: followingIds.has(post.author.personalityId),
      mutuallyFollowing: isMutualFollow(
        post.author.personalityId,
        followingIds,
        followerIds,
      ),
      isThreadingPost,
      recentDisagreeCount,
    });

    if (decision.like && author) {
      await likePost(personality, post, world);
      await recordLikeEffects(world, personality, author);
      void recordLikeReceivedActivity(
        author.id,
        personality.id,
        post,
        author.ownerId,
      );
      log("success", `${handle} liked @${post.author.handle}`);
    }

    if (decision.repost && author) {
      await repostSpecificPost(personality, post, world);
      await recordRepostEffects(world, personality, author);
      log("success", `${handle} reposted @${post.author.handle}`);
    }

    if (decision.follow && author) {
      const followed = await followAuthor(personality, author, world);

      if (followed) {
        followingIds.add(followed.id);
        await recordFollowEffects(world, personality, author, post);
        log(
          "success",
          `${handle} followed @${followed.handle} (${followed.stats.followers} followers)`,
        );
      }
    }

    if (decision.unfollow && author) {
      const unfollowed = await unfollowAuthor(personality, author, world);

      if (unfollowed) {
        followingIds.delete(unfollowed.id);
        await recordUnfollowEffects(world, personality, author, post);
        log(
          "success",
          `${handle} unfollowed @${unfollowed.handle} after disagreeing`,
        );
      }
    }

    if (decision.respond && decision.responseTone) {
      respondQueue.push({ post, tone: decision.responseTone });
    }

    const replies = await getTopRepliesForPost(post.id, REPLIES_TO_EVALUATE);

    for (const reply of replies) {
      const replyAuthor = findAuthor(world, reply.author.personalityId);

      if (
        !decideReplyLike({
          reader: personality,
          reply,
          replyAuthor,
          parentPost: post,
          parentAuthor: author,
          likedParent: decision.like,
        })
      ) {
        continue;
      }

      if (!replyAuthor) {
        continue;
      }

      await likePost(personality, reply, world);
      await recordLikeEffects(world, personality, replyAuthor);
      void recordLikeReceivedActivity(
        replyAuthor.id,
        personality.id,
        reply,
        replyAuthor.ownerId,
      );
      log(
        "success",
        `${handle} liked @${reply.author.handle}'s reply: ${truncateForLog(reply.content)}`,
      );
    }
  }

  for (const { post, tone } of respondQueue) {
    const author = findAuthor(world, post.author.personalityId);

    log(
      "info",
      `${handle} ${tone === "agree" ? "agreeing with" : "pushing back on"} @${post.author.handle}...`,
    );

    const engagementContext =
      author
        ? buildReplyEngagementContext(
            personality,
            author,
            tone,
            isMutualFollow(author.id, followingIds, followerIds),
          )
        : undefined;

    const reply = await replyToSpecificPost(personality, post, world, {
      tone,
      engagementContext,
    });

    if (!reply) {
      log("warn", `${handle} failed to reply to @${post.author.handle}.`);
      continue;
    }

    if (author) {
      if (tone === "agree") {
        await recordAgreeReplyEffects(world, personality, author, post);
      } else {
        await recordDisagreeReplyEffects(world, personality, author, post);
      }
    }

    log(
      "success",
      `${handle} ${tone === "agree" ? "agreed with" : "pushed back on"} @${post.author.handle}: ${truncateForLog(reply.content)}`,
    );
  }
}
