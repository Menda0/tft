import "./load-env";

import { mergeNotDeletedPost } from "@/lib/db/active-filters";
import { getFollowsCollection } from "@/lib/db/follows";
import {
  ensurePersonalityActivityIndexes,
  getPersonalityActivityCollection,
  recordPersonalityActivities,
} from "@/lib/db/personality-activity";
import { getPostsCollection } from "@/lib/db/posts";
import { truncateForLog } from "@/lib/simulation/logger";
import type { Post } from "@/lib/types/post";
import type { RecordActivityInput } from "@/lib/db/personality-activity";

const BATCH_SIZE = 500;

function previewText(content: string): string {
  return truncateForLog(content, 80);
}

function activityFromPost(
  post: Post,
  parentById: Map<string, Post>,
): RecordActivityInput | null {
  const preview = previewText(post.content);

  if (post.repostOfPostId) {
    const target = parentById.get(post.repostOfPostId);

    return {
      personalityId: post.author.personalityId,
      type: "repost",
      at: post.createdAt,
      postId: post.id,
      targetPersonalityId: target?.author.personalityId,
      preview: target ? previewText(target.content) : preview,
    };
  }

  if (post.replyToPostId) {
    const target = parentById.get(post.replyToPostId);

    return {
      personalityId: post.author.personalityId,
      type: "reply",
      at: post.createdAt,
      postId: post.id,
      targetPersonalityId: target?.author.personalityId,
      preview,
    };
  }

  return {
    personalityId: post.author.personalityId,
    type: "post",
    at: post.createdAt,
    postId: post.id,
    preview,
  };
}

async function backfillPosts(): Promise<number> {
  const collection = await getPostsCollection();
  const posts = await collection.find(mergeNotDeletedPost({})).toArray();
  const parentIds = new Set<string>();

  for (const post of posts) {
    if (post.replyToPostId) {
      parentIds.add(post.replyToPostId);
    }

    if (post.repostOfPostId) {
      parentIds.add(post.repostOfPostId);
    }
  }

  const parentPosts = await collection
    .find({ id: { $in: [...parentIds] } })
    .toArray();
  const parentById = new Map(parentPosts.map((post) => [post.id, post]));

  const activities: RecordActivityInput[] = [];

  for (const post of posts) {
    const activity = activityFromPost(post, parentById);

    if (activity) {
      activities.push(activity);
    }
  }

  let inserted = 0;

  for (let index = 0; index < activities.length; index += BATCH_SIZE) {
    const batch = activities.slice(index, index + BATCH_SIZE);
    await recordPersonalityActivities(batch);
    inserted += batch.length;
  }

  return inserted;
}

async function backfillFollows(): Promise<number> {
  const collection = await getFollowsCollection();
  const follows = await collection.find({}).toArray();
  const activities: RecordActivityInput[] = [];

  for (const follow of follows) {
    activities.push(
      {
        personalityId: follow.followerId,
        type: "follow",
        at: follow.createdAt,
        targetPersonalityId: follow.followingId,
      },
      {
        personalityId: follow.followingId,
        type: "follow_received",
        at: follow.createdAt,
        actorPersonalityId: follow.followerId,
      },
    );
  }

  let inserted = 0;

  for (let index = 0; index < activities.length; index += BATCH_SIZE) {
    const batch = activities.slice(index, index + BATCH_SIZE);
    await recordPersonalityActivities(batch);
    inserted += batch.length;
  }

  return inserted;
}

async function main(): Promise<void> {
  const force = process.argv.includes("--force");

  await ensurePersonalityActivityIndexes();

  const activityCollection = await getPersonalityActivityCollection();
  const existingCount = await activityCollection.countDocuments();

  if (existingCount > 0 && !force) {
    console.info(
      `personality_activity already has ${existingCount} row(s). Pass --force to rebuild.`,
    );
    return;
  }

  if (force && existingCount > 0) {
    const deleted = await activityCollection.deleteMany({});
    console.info(`Cleared ${deleted.deletedCount} existing activity row(s).`);
  }

  const [postCount, followCount] = await Promise.all([
    backfillPosts(),
    backfillFollows(),
  ]);

  console.info("Personality activity backfill complete:", {
    postActivities: postCount,
    followActivities: followCount,
    total: postCount + followCount,
  });
}

main().catch((error) => {
  console.error("Personality activity backfill failed:", error);
  process.exit(1);
});
