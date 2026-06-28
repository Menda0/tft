import type { TrendingTopic } from "@/lib/types/world";
import type { Personality } from "@/lib/types/personality";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function topicsMatchInterest(topic: string, interest: string): boolean {
  const normalizedTopic = normalize(topic);
  const normalizedInterest = normalize(interest);

  return (
    normalizedTopic.includes(normalizedInterest) ||
    normalizedInterest.includes(normalizedTopic)
  );
}

function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) {
    return null;
  }

  return items[Math.floor(Math.random() * items.length)] ?? null;
}

export function pickTopicForPersonality(
  personality: Personality,
  trendingTopics: TrendingTopic[],
): string {
  const topicLabels = trendingTopics.map((entry) => entry.topic);

  if (topicLabels.length === 0 && personality.interests.length === 0) {
    return "the internet";
  }

  if (topicLabels.length > 0 && Math.random() < 0.6) {
    const matchingTopics = topicLabels.filter((topic) =>
      personality.interests.some((interest) =>
        topicsMatchInterest(topic, interest),
      ),
    );

    const matched = pickRandom(matchingTopics);

    if (matched) {
      return matched;
    }
  }

  const randomTrending = pickRandom(topicLabels);

  if (randomTrending) {
    return randomTrending;
  }

  return pickRandom(personality.interests) ?? "the internet";
}
