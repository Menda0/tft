import { getTopLevelOriginalPostsSince } from "@/lib/db/posts";
import { getWorldState } from "@/lib/db/world";
import { avatarColorForHandle } from "@/lib/feed/format";
import { topicsAreSimilar } from "@/lib/simulation/topics";
import type {
  ThreadingTopic,
  ThreadingTopicParticipant,
  ThreadingTopicsPayload,
} from "@/lib/types/desktop";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const MAX_VISIBLE_PARTICIPANTS = 5;

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

export async function buildThreadingTopics(): Promise<ThreadingTopicsPayload> {
  const state = await getWorldState();
  const since = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);
  const posts = await getTopLevelOriginalPostsSince(since);
  const trendingLabels = state.trendingTopics.map((entry) => entry.topic);

  const topicMap = new Map<
    string,
    {
      postCount: number;
      participants: Map<string, ThreadingTopicParticipant>;
    }
  >();

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

    const personalityId = post.author.personalityId;
    const existing = entry.participants.get(personalityId);

    if (existing) {
      existing.postCount += 1;
      continue;
    }

    entry.participants.set(personalityId, {
      name: post.author.name,
      handle: post.author.handle,
      avatarUrl: post.author.avatarUrl,
      avatarColor: avatarColorForHandle(post.author.handle),
      postCount: 1,
    });
  }

  const topics: ThreadingTopic[] = state.trendingTopics
    .map((entry) => {
      const bucket = topicMap.get(entry.topic) ?? {
        postCount: 0,
        participants: new Map(),
      };

      const sortedParticipants = [...bucket.participants.values()].sort(
        (left, right) => right.postCount - left.postCount,
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
