import type { Post } from "@/lib/types/post";
import type { Personality } from "@/lib/types/personality";

import {
  scoreBeliefOpposition,
  scoreIdeologicalCompatibility,
  scoreRelationshipAlignment,
} from "./ideological-compatibility";
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
  return 1 - scoreBeliefOpposition(personality, null, post);
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
  const compatibility = scoreIdeologicalCompatibility(personality, author, post);
  const relationship = personality.relationships[post.author.personalityId];
  const relationshipAlignment = scoreRelationshipAlignment(relationship);

  return clamp01(compatibility * 0.85 + relationshipAlignment * 0.15);
}

export function scorePostRevelatory(
  personality: Personality,
  post: Post,
  author: Personality | null,
): number {
  const beliefOpposition = scoreBeliefOpposition(personality, author, post);
  const beliefShock = beliefOpposition > 0.5 ? beliefOpposition : 0;

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

/** @deprecated Internal — use scoreIdeologicalCompatibility */
export { scoreBeliefAlignment as scoreLegacyBeliefAlignment };
