import { getTopLevelOriginalPostsSince } from "@/lib/db/posts";
import { getReadPostIds, recordPostRead } from "@/lib/db/post-reads";
import { getFollowingIds } from "@/lib/db/follows";
import type { Post } from "@/lib/types/post";
import type { Personality } from "@/lib/types/personality";

import { decideEngagement } from "./engagement";
import {
  recordAgreeReplyEffects,
  recordDisagreeReplyEffects,
  recordFollowEffects,
  recordLikeEffects,
  recordRepostEffects,
} from "./engagement-effects";
import { startOfRollingWindow } from "./limits";
import { truncateForLog, type SimulationLogFn } from "./logger";
import {
  followAuthor,
  likePost,
  recordPostView,
  replyToSpecificPost,
  repostSpecificPost,
} from "./posts";
import type { SimulationWorld } from "./world";
import { weightedSampleWithoutReplacement } from "./utils";

const READ_POST_COUNT = 5;
const FOLLOWED_AUTHOR_WEIGHT = 3;
const DEFAULT_AUTHOR_WEIGHT = 1;

function engagementReadWeight(post: Post): number {
  const { replies, views, reposts, likes } = post.stats;
  const engagementScore =
    replies * 4 + likes * 2 + reposts * 3 + views * 0.05;

  return 1 + Math.log1p(engagementScore);
}

function getPostReadWeight(post: Post, followingIds: Set<string>): number {
  const followWeight = followingIds.has(post.author.personalityId)
    ? FOLLOWED_AUTHOR_WEIGHT
    : DEFAULT_AUTHOR_WEIGHT;

  return followWeight * engagementReadWeight(post);
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

async function pickPostsToRead(
  personality: Personality,
  followingIds: Set<string>,
  readPostIds: Set<string>,
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
    (post) => getPostReadWeight(post, followingIds),
  );
}

export async function readPostsAndEngage(
  personality: Personality,
  world: SimulationWorld,
  log: SimulationLogFn,
): Promise<void> {
  const handle = `@${personality.handle}`;
  const [followingIds, readPostIds] = await Promise.all([
    getFollowingIds(personality.id),
    getReadPostIds(personality.id),
  ]);
  const posts = await pickPostsToRead(personality, followingIds, readPostIds);

  if (posts.length === 0) {
    log("warn", `${handle} has no unread posts in the last 24 hours.`);
    return;
  }

  log("info", `${handle} reading ${posts.length} posts`);

  const respondQueue: Array<{
    post: Post;
    tone: "agree" | "disagree";
  }> = [];

  for (const post of posts) {
    await recordPostView(post, world);
    await recordPostRead(personality.id, post.id);
    log(
      "info",
      `${handle} read @${post.author.handle}: ${truncateForLog(post.content)}`,
    );

    const author = findAuthor(world, post.author.personalityId);
    const decision = decideEngagement({
      personality,
      post,
      author,
      alreadyFollowing: followingIds.has(post.author.personalityId),
    });

    if (decision.like && author) {
      await likePost(personality, post, world);
      await recordLikeEffects(world, personality, author);
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

    if (decision.respond && decision.responseTone) {
      respondQueue.push({ post, tone: decision.responseTone });
    }
  }

  for (const { post, tone } of respondQueue) {
    const author = findAuthor(world, post.author.personalityId);

    log(
      "info",
      `${handle} ${tone === "agree" ? "agreeing with" : "pushing back on"} @${post.author.handle}...`,
    );

    const reply = await replyToSpecificPost(personality, post, world, { tone });

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
