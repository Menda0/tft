import {
  getRepliesForPosts,
  getTopLevelOriginalPostsSince,
} from "@/lib/db/posts";
import { getWorldState } from "@/lib/db/world";
import { avatarColorForHandle } from "@/lib/feed/format";
import { startOfThreadingWindow } from "@/lib/simulation/limits";
import { topicsAreSimilar } from "@/lib/simulation/topics";
import type { Post } from "@/lib/types/post";
import type {
  ThreadingTopic,
  ThreadingTopicParticipant,
  ThreadingTopicsPayload,
} from "@/lib/types/desktop";

const MAX_VISIBLE_PARTICIPANTS = 6;

function findMatchingTopicLabel(
  postTopic: string,
  trendingLabels: string[],
): string | null {
  for (const label of trendingLabels) {
    if (topicsAreSimilar(postTopic, label)) {
      return label;
    }
  }

  return null;
}

function participantActivity(participant: ThreadingTopicParticipant): number {
  return participant.postCount + participant.replyCount;
}

function upsertParticipant(
  participants: Map<string, ThreadingTopicParticipant>,
  personalityId: string,
  author: Post["author"],
  postId: string,
  kind: "post" | "reply",
): void {
  const existing = participants.get(personalityId);

  if (existing) {
    if (kind === "post") {
      existing.postCount += 1;
      existing.postId = postId;
    } else {
      existing.replyCount += 1;
      if (existing.postCount === 0) {
        existing.postId = postId;
      }
    }

    return;
  }

  participants.set(personalityId, {
    personalityId,
    name: author.name,
    handle: author.handle,
    avatarUrl: author.avatarUrl,
    avatarColor: avatarColorForHandle(author.handle),
    postCount: kind === "post" ? 1 : 0,
    replyCount: kind === "reply" ? 1 : 0,
    postId,
  });
}

export async function buildThreadingTopics(): Promise<ThreadingTopicsPayload> {
  const state = await getWorldState();
  const since = startOfThreadingWindow();
  const posts = await getTopLevelOriginalPostsSince(since);
  const trendingLabels = state.trendingTopics.map((entry) => entry.topic);

  const topicMap = new Map<
    string,
    {
      postCount: number;
      participants: Map<string, ThreadingTopicParticipant>;
    }
  >();
  const postToTopic = new Map<string, string>();

  for (const label of trendingLabels) {
    topicMap.set(label, { postCount: 0, participants: new Map() });
  }

  for (const post of posts) {
    const postTopic = post.topic?.trim();

    if (!postTopic) {
      continue;
    }

    const matchedLabel = findMatchingTopicLabel(postTopic, trendingLabels);

    if (!matchedLabel) {
      continue;
    }

    const entry = topicMap.get(matchedLabel);

    if (!entry) {
      continue;
    }

    entry.postCount += 1;
    postToTopic.set(post.id, matchedLabel);
    upsertParticipant(
      entry.participants,
      post.author.personalityId,
      post.author,
      post.id,
      "post",
    );
  }

  if (postToTopic.size > 0) {
    const replies = await getRepliesForPosts([...postToTopic.keys()]);

    for (const reply of replies) {
      const parentId = reply.replyToPostId;

      if (!parentId) {
        continue;
      }

      const matchedLabel = postToTopic.get(parentId);
      const entry = matchedLabel ? topicMap.get(matchedLabel) : undefined;

      if (!entry) {
        continue;
      }

      upsertParticipant(
        entry.participants,
        reply.author.personalityId,
        reply.author,
        reply.id,
        "reply",
      );
    }
  }

  const topics: ThreadingTopic[] = state.trendingTopics
    .map((entry) => {
      const bucket = topicMap.get(entry.topic) ?? {
        postCount: 0,
        participants: new Map(),
      };

      const sortedParticipants = [...bucket.participants.values()].sort(
        (left, right) => {
          const activityDelta = participantActivity(right) - participantActivity(left);

          if (activityDelta !== 0) {
            return activityDelta;
          }

          return right.postCount - left.postCount;
        },
      );

      return {
        topic: entry.topic,
        postCount: bucket.postCount,
        participantCount: sortedParticipants.length,
        participants: sortedParticipants.slice(0, MAX_VISIBLE_PARTICIPANTS),
      };
    })
    .sort((left, right) => right.postCount - left.postCount);

  return {
    topics,
    updatedAt: state.trendingTopicsUpdatedAt?.toISOString() ?? null,
  };
}
