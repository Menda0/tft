import type { Post } from "@/lib/types/post";
import type { Personality } from "@/lib/types/personality";

import { topicsMatchInterest } from "./topics";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function interestMatchesPost(
  interests: string[],
  post: Pick<Post, "topic" | "content">,
): number {
  if (interests.length === 0) {
    return 0;
  }

  let best = 0;
  const content = normalize(post.content);

  for (const interest of interests) {
    const normalizedInterest = normalize(interest);

    if (!normalizedInterest) {
      continue;
    }

    let score = 0;

    if (post.topic && topicsMatchInterest(post.topic, interest)) {
      score = 1;
    } else if (content.includes(normalizedInterest)) {
      score = 0.7;
    }

    best = Math.max(best, score);
  }

  return best;
}

function scoreBeliefAlignment(
  personality: Pick<Personality, "beliefs">,
  post: Pick<Post, "topic" | "content">,
): number {
  const beliefEntries = Object.entries(personality.beliefs);

  if (beliefEntries.length === 0 || !post.topic) {
    return 0.5;
  }

  const topic = normalize(post.topic);
  const content = normalize(post.content);
  let matched = 0;
  let total = 0;

  for (const [belief, strength] of beliefEntries) {
    const normalizedBelief = normalize(belief);

    if (
      topic.includes(normalizedBelief) ||
      content.includes(normalizedBelief)
    ) {
      matched += strength;
      total += 10;
    }
  }

  if (total === 0) {
    return 0.5;
  }

  return matched / total;
}

export function scorePostRelevance(
  personality: Pick<Personality, "interests" | "relationships">,
  post: Post,
): number {
  const interestScore = interestMatchesPost(personality.interests, post);
  const relationship = personality.relationships[post.author.personalityId];
  const familiarityBoost = relationship
    ? (relationship.familiarity / 10) * 0.15
    : 0;

  return clamp01(interestScore * 0.85 + familiarityBoost);
}

export function scorePostAlignment(
  personality: Personality,
  post: Post,
  author: Personality | null,
): number {
  const interestAlignment = interestMatchesPost(personality.interests, post);

  let politicalAlignment = 0.5;

  if (author) {
    const swingGap = Math.abs(personality.politicalSwing - author.politicalSwing);
    politicalAlignment = 1 - swingGap / 20;
  }

  const relationship = personality.relationships[post.author.personalityId];
  let relationshipAlignment = 0.5;

  if (relationship) {
    relationshipAlignment =
      0.5 +
      (relationship.admiration - relationship.rivalry) / 20 +
      relationship.trust / 40;
  }

  let beliefAlignment = 0.5;
  const beliefEntries = Object.entries(personality.beliefs);

  if (beliefEntries.length > 0 && post.topic) {
    beliefAlignment = scoreBeliefAlignment(personality, post);
  }

  return clamp01(
    interestAlignment * 0.4 +
      politicalAlignment * 0.3 +
      relationshipAlignment * 0.2 +
      beliefAlignment * 0.1,
  );
}

export function scorePostRevelatory(
  personality: Personality,
  post: Post,
  author: Personality | null,
): number {
  const beliefAlignment = scoreBeliefAlignment(personality, post);
  const beliefShock = beliefAlignment < 0.5 ? 1 - beliefAlignment : 0;

  let expectationBetrayal = 0;

  if (author) {
    const relationship = personality.relationships[author.id];

    if (relationship) {
      const priorPositive = (relationship.trust + relationship.admiration) / 20;
      const swingGap =
        Math.abs(personality.politicalSwing - author.politicalSwing) / 20;
      expectationBetrayal = priorPositive * swingGap;
    }
  }

  const authorShock = author
    ? (author.traits.radical / 10) * 0.5 +
      Math.min(1, author.stats.controversy / 40) * 0.5
    : 0;

  return clamp01(
    beliefShock * 0.45 + expectationBetrayal * 0.35 + authorShock * 0.2,
  );
}
