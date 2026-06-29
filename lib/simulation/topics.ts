const STOP_WORDS = new Set([
  "about",
  "after",
  "against",
  "among",
  "because",
  "before",
  "being",
  "between",
  "could",
  "during",
  "first",
  "from",
  "into",
  "just",
  "like",
  "more",
  "most",
  "online",
  "other",
  "over",
  "some",
  "than",
  "that",
  "their",
  "them",
  "there",
  "these",
  "they",
  "this",
  "through",
  "under",
  "users",
  "while",
  "with",
  "would",
]);

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function topicTokens(topic: string): Set<string> {
  return new Set(
    normalize(topic)
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !STOP_WORDS.has(word)),
  );
}

export function topicsAreSimilar(a: string, b: string): boolean {
  const left = normalize(a);
  const right = normalize(b);

  if (!left || !right) {
    return false;
  }

  if (left === right) {
    return true;
  }

  if (left.includes(right) || right.includes(left)) {
    return true;
  }

  const leftTokens = topicTokens(left);
  const rightTokens = topicTokens(right);

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return false;
  }

  let overlap = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  const unionSize = new Set([...leftTokens, ...rightTokens]).size;
  return overlap / unionSize >= 0.45;
}

export function topicWasUsedBefore(
  candidate: string,
  usedTopics: string[],
): boolean {
  return usedTopics.some((used) => topicsAreSimilar(candidate, used));
}

export function topicsMatchInterest(topic: string, interest: string): boolean {
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

function filterUnusedTopics(candidates: string[], usedTopics: string[]): string[] {
  return candidates.filter((topic) => !topicWasUsedBefore(topic, usedTopics));
}

export function pickTopicForPersonality(
  personality: { interests: string[] },
  topicLabels: string[],
  usedTopics: string[],
): string | null {
  const availableTrending = filterUnusedTopics(topicLabels, usedTopics);
  const availableInterests = filterUnusedTopics(personality.interests, usedTopics);

  if (
    availableTrending.length === 0 &&
    availableInterests.length === 0 &&
    topicLabels.length === 0 &&
    personality.interests.length === 0
  ) {
    return topicWasUsedBefore("the internet", usedTopics) ? null : "the internet";
  }

  if (availableTrending.length > 0 && Math.random() < 0.6) {
    const matchingTopics = availableTrending.filter((topic) =>
      personality.interests.some((interest) =>
        topicsMatchInterest(topic, interest),
      ),
    );

    const matched = pickRandom(matchingTopics);

    if (matched) {
      return matched;
    }
  }

  const randomTrending = pickRandom(availableTrending);

  if (randomTrending) {
    return randomTrending;
  }

  return pickRandom(availableInterests);
}
