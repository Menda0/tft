import {
  recordPersonalityActivities,
  recordPersonalityActivity,
} from "@/lib/db/personality-activity";
import { truncateForLog } from "@/lib/simulation/logger";
import type { Post } from "@/lib/types/post";

function previewText(content: string): string {
  return truncateForLog(content, 80);
}

export async function recordAuthoredPostActivity(
  personalityId: string,
  post: Post,
): Promise<void> {
  await recordPersonalityActivity({
    personalityId,
    type: "post",
    at: post.createdAt,
    postId: post.id,
    preview: previewText(post.content),
  });
}

export async function recordAuthoredReplyActivity(
  personalityId: string,
  reply: Post,
  target: Post,
): Promise<void> {
  await recordPersonalityActivity({
    personalityId,
    type: "reply",
    at: reply.createdAt,
    postId: reply.id,
    targetPersonalityId: target.author.personalityId,
    preview: previewText(reply.content),
  });
}

export async function recordAuthoredRepostActivity(
  personalityId: string,
  repost: Post,
  target: Post,
): Promise<void> {
  await recordPersonalityActivity({
    personalityId,
    type: "repost",
    at: repost.createdAt,
    postId: repost.id,
    targetPersonalityId: target.author.personalityId,
    preview: previewText(target.content),
  });
}

export async function recordFollowActivityPair(
  followerId: string,
  followingId: string,
  at: Date,
): Promise<void> {
  await recordPersonalityActivities([
    {
      personalityId: followerId,
      type: "follow",
      at,
      targetPersonalityId: followingId,
    },
    {
      personalityId: followingId,
      type: "follow_received",
      at,
      actorPersonalityId: followerId,
    },
  ]);
}

export async function recordLikeReceivedActivity(
  authorId: string,
  actorId: string,
  post: Post,
): Promise<void> {
  await recordPersonalityActivity({
    personalityId: authorId,
    type: "like_received",
    actorPersonalityId: actorId,
    postId: post.id,
    preview: previewText(post.content),
  });
}
