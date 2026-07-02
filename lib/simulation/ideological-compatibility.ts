import type { Post } from "@/lib/types/post";
import type { Personality, Relationship, Traits } from "@/lib/types/personality";

import { topicsMatchInterest } from "./topics";
import { normalizeBeliefs } from "@/lib/personalities/validation";

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

const TRAIT_AFFINITY_KEYS: (keyof Traits)[] = [
  "woke",
  "radical",
  "negacionist",
  "aggression",
];

export function scoreTraitAffinity(
  reader: Pick<Personality, "traits">,
  author: Pick<Personality, "traits">,
): number {
  let totalDistance = 0;

  for (const key of TRAIT_AFFINITY_KEYS) {
    totalDistance += Math.abs(reader.traits[key] - author.traits[key]) / 10;
  }

  return clamp01(1 - totalDistance / TRAIT_AFFINITY_KEYS.length);
}

export function scorePoliticalAffinity(
  reader: Pick<Personality, "politicalSwing">,
  author: Pick<Personality, "politicalSwing">,
): number {
  const swingGap = Math.abs(reader.politicalSwing - author.politicalSwing);
  return clamp01(1 - swingGap / 20);
}

function beliefMatchesPost(
  beliefKey: string,
  post: Pick<Post, "topic" | "content">,
): boolean {
  const topic = post.topic ? normalize(post.topic) : "";
  const content = normalize(post.content);
  const belief = normalize(beliefKey);

  return topic.includes(belief) || content.includes(belief);
}

export function scoreBeliefCompatibility(
  reader: Pick<Personality, "beliefs">,
  author: Pick<Personality, "beliefs"> | null,
  post: Pick<Post, "topic" | "content">,
): number {
  const readerBeliefs = normalizeBeliefs(reader.beliefs);
  const authorBeliefs = normalizeBeliefs(author?.beliefs ?? {});

  const readerEntries = Object.entries(readerBeliefs);
  const authorEntries = Object.entries(authorBeliefs);

  if (readerEntries.length === 0 && authorEntries.length === 0) {
    return 0.5;
  }

  let support = 0;
  let opposition = 0;
  let total = 0;

  for (const [belief, strength] of readerEntries) {
    if (!beliefMatchesPost(belief, post)) {
      continue;
    }

    total += strength;

    if (authorEntries.some(([authorBelief]) => normalize(authorBelief) === belief)) {
      support += strength;
    } else if (
      authorEntries.some(([authorBelief]) => {
        const normalizedAuthor = normalize(authorBelief);
        return (
          normalizedAuthor.includes(`anti-${belief}`) ||
          normalizedAuthor.includes(`no-${belief}`) ||
          belief.includes(`anti-${normalizedAuthor}`)
        );
      })
    ) {
      opposition += strength;
    } else {
      support += strength * 0.5;
    }
  }

  for (const [belief, strength] of authorEntries) {
    if (!beliefMatchesPost(belief, post)) {
      continue;
    }

    if (readerEntries.some(([readerBelief]) => normalize(readerBelief) === belief)) {
      continue;
    }

    total += strength * 0.5;
    opposition += strength * 0.35;
  }

  if (total === 0) {
    return 0.5;
  }

  return clamp01(0.5 + (support - opposition) / (total * 2));
}

export function scoreIdeologicalCompatibility(
  reader: Personality,
  author: Personality | null,
  post: Post,
): number {
  const interestAlignment = interestMatchesPost(reader.interests, post);
  const politicalAlignment = author
    ? scorePoliticalAffinity(reader, author)
    : 0.5;
  const traitAlignment = author ? scoreTraitAffinity(reader, author) : 0.5;
  const beliefAlignment = scoreBeliefCompatibility(reader, author, post);

  return clamp01(
    politicalAlignment * 0.35 +
      traitAlignment * 0.35 +
      beliefAlignment * 0.2 +
      interestAlignment * 0.1,
  );
}

export function scoreRelationshipAlignment(
  relationship: Relationship | undefined,
): number {
  if (!relationship) {
    return 0.5;
  }

  return clamp01(
    0.5 +
      (relationship.admiration - relationship.rivalry) / 20 +
      relationship.trust / 40,
  );
}

export function scoreBeliefOpposition(
  reader: Pick<Personality, "beliefs">,
  author: Pick<Personality, "beliefs"> | null,
  post: Pick<Post, "topic" | "content">,
): number {
  return clamp01(1 - scoreBeliefCompatibility(reader, author, post));
}
