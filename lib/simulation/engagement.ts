import type { Post } from "@/lib/types/post";
import type { Personality } from "@/lib/types/personality";

import { topicsMatchInterest } from "./topics";

export type ResponseTone = "agree" | "disagree";

export type EngagementDecision = {
  like: boolean;
  repost: boolean;
  respond: boolean;
  responseTone: ResponseTone | null;
  follow: boolean;
};

const MAX_PROBABILITY = 0.85;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function capProbability(value: number): number {
  return Math.min(MAX_PROBABILITY, value);
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

    if (total > 0) {
      beliefAlignment = matched / total;
    }
  }

  return clamp01(
    interestAlignment * 0.4 +
      politicalAlignment * 0.3 +
      relationshipAlignment * 0.2 +
      beliefAlignment * 0.1,
  );
}

type EngagementContext = {
  personality: Personality;
  post: Post;
  author: Personality | null;
  alreadyFollowing: boolean;
};

function roll(probability: number): boolean {
  return Math.random() < capProbability(probability);
}

export function decideEngagement(context: EngagementContext): EngagementDecision {
  const { personality, post, author, alreadyFollowing } = context;
  const alignment = scorePostAlignment(personality, post, author);
  const traits = personality.traits;

  const likeProbability =
    0.1 + alignment * 0.35 + traits.humor * 0.02;
  const repostProbability =
    0.05 + alignment * 0.25 + traits.radical * 0.02;
  const respondAgreeProbability =
    0.06 + alignment * 0.28 + traits.humor * 0.015;
  const respondDisagreeProbability =
    0.06 +
    (1 - alignment) * 0.28 +
    traits.aggression * 0.015 +
    traits.troll * 0.015 +
    traits.negacionist * 0.01;
  const followProbability =
    0.04 + alignment * 0.3 + traits.negacionist * 0.02;

  const agreeRoll = Math.random();
  const disagreeRoll = Math.random();
  const agreeHit = agreeRoll < capProbability(respondAgreeProbability);
  const disagreeHit = disagreeRoll < capProbability(respondDisagreeProbability);

  let respond = false;
  let responseTone: ResponseTone | null = null;

  if (agreeHit && disagreeHit) {
    const agreeStrength = agreeRoll / respondAgreeProbability;
    const disagreeStrength = disagreeRoll / respondDisagreeProbability;
    respond = true;
    responseTone = agreeStrength <= disagreeStrength ? "agree" : "disagree";
  } else if (agreeHit) {
    respond = true;
    responseTone = "agree";
  } else if (disagreeHit) {
    respond = true;
    responseTone = "disagree";
  }

  const skipLike = responseTone === "disagree";

  return {
    like: !skipLike && roll(likeProbability),
    repost: roll(repostProbability),
    respond,
    responseTone,
    follow:
      !alreadyFollowing &&
      post.author.personalityId !== personality.id &&
      roll(followProbability),
  };
}
