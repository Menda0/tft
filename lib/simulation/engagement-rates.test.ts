import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeEngagementProbabilities } from "@/lib/simulation/engagement-probabilities";
import { decideEngagement } from "@/lib/simulation/engagement";
import { simulationConfig } from "@/lib/simulation/config";
import type { Post } from "@/lib/types/post";
import type { Personality } from "@/lib/types/personality";

function basePersonality(overrides: Partial<Personality> = {}): Personality {
  return {
    id: "reader",
    name: "Reader",
    handle: "reader",
    kind: "person",
    gender: "male",
    pronouns: "he_him",
    avatarUrl: null,
    avatarStatus: "ready",
    description: null,
    descriptionStatus: "ready",
    ownerId: "owner",
    createdAt: new Date(),
    archetype: null,
    traits: {
      humor: 5,
      aggression: 5,
      troll: 5,
      woke: 5,
      negacionist: 5,
      radical: 5,
    },
    politicalSwing: 0,
    interests: ["tech"],
    beliefs: {},
    stats: {
      followers: 10,
      socialScore: 100,
      controversy: 0,
      creativity: 50,
    },
    memory: [],
    relationships: {},
    ...overrides,
  };
}

function baseAuthor(): Personality {
  return basePersonality({
    id: "author",
    name: "Author",
    handle: "author",
    interests: ["tech"],
    politicalSwing: 0,
  });
}

function basePost(author: Personality): Post {
  return {
    id: "post-1",
    author: {
      personalityId: author.id,
      handle: author.handle,
      name: author.name,
      avatarUrl: null,
    },
    content: "Tech is changing everything.",
    topic: "tech",
    replyToPostId: null,
    repostOfPostId: null,
    createdAt: new Date(),
    tickNumber: 1,
    stats: {
      likes: 0,
      reposts: 0,
      replies: 0,
      views: 0,
      agreeReplies: 0,
      disagreeReplies: 0,
    },
  };
}

function expectedReplyRate(agree: number, disagree: number): number {
  return 1 - (1 - agree) * (1 - disagree);
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (Math.imul(1_664_525, state) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function simulateEngagementRates(
  iterations: number,
  seed: number,
  context: {
    alreadyFollowing: boolean;
    isThreadingPost: boolean;
  },
): { likeRate: number; replyRate: number } {
  const personality = basePersonality();
  const author = baseAuthor();
  const post = basePost(author);
  const random = createSeededRandom(seed);
  const originalRandom = Math.random;

  Math.random = random;

  let likes = 0;
  let replies = 0;

  try {
    for (let index = 0; index < iterations; index += 1) {
      const decision = decideEngagement({
        personality,
        post,
        author,
        alreadyFollowing: context.alreadyFollowing,
        mutuallyFollowing: false,
        isThreadingPost: context.isThreadingPost,
        recentDisagreeCount: 0,
        consecutiveEndorsements: 0,
      });

      if (decision.like) {
        likes += 1;
      }

      if (decision.respond) {
        replies += 1;
      }
    }
  } finally {
    Math.random = originalRandom;
  }

  return {
    likeRate: likes / iterations,
    replyRate: replies / iterations,
  };
}

describe("simulation engagement rates", () => {
  it("keeps typical per-read reply probability near the target band", () => {
    const personality = basePersonality();
    const author = baseAuthor();
    const post = basePost(author);
    const probabilities = computeEngagementProbabilities({
      personality,
      post,
      author,
      alreadyFollowing: false,
      mutuallyFollowing: false,
      isThreadingPost: false,
    });

    const replyRate = expectedReplyRate(
      probabilities.respondAgree,
      probabilities.respondDisagree,
    );

    assert.ok(
      replyRate >= 0.16 && replyRate <= 0.28,
      `expected reply rate between 16% and 28%, got ${(replyRate * 100).toFixed(1)}%`,
    );
  });

  it("keeps typical per-read like probability near the target band", () => {
    const personality = basePersonality();
    const author = baseAuthor();
    const post = basePost(author);
    const probabilities = computeEngagementProbabilities({
      personality,
      post,
      author,
      alreadyFollowing: false,
      mutuallyFollowing: false,
      isThreadingPost: false,
    });

    assert.ok(
      probabilities.like >= 0.3 && probabilities.like <= 0.42,
      `expected like probability between 30% and 42%, got ${(probabilities.like * 100).toFixed(1)}%`,
    );
  });

  it("matches weighted tick ratios (~21 reads, ~5 replies, ~9 likes)", () => {
    const scenarios = [
      { weight: 0.45, alreadyFollowing: false, isThreadingPost: false },
      { weight: 0.35, alreadyFollowing: true, isThreadingPost: false },
      { weight: 0.2, alreadyFollowing: false, isThreadingPost: true },
    ] as const;

    let weightedLikeRate = 0;
    let weightedReplyRate = 0;

    for (const scenario of scenarios) {
      const rates = simulateEngagementRates(20_000, 42_001, scenario);
      weightedLikeRate += scenario.weight * rates.likeRate;
      weightedReplyRate += scenario.weight * rates.replyRate;
    }

    const targetReplyRate = 5 / 21;
    const targetLikeRate = 9 / 21;

    assert.ok(
      weightedReplyRate >= targetReplyRate * 0.75 &&
        weightedReplyRate <= targetReplyRate * 1.35,
      `weighted reply rate ${(weightedReplyRate * 100).toFixed(1)}% outside target band around ${(targetReplyRate * 100).toFixed(1)}%`,
    );
    assert.ok(
      weightedLikeRate >= targetLikeRate * 0.75 &&
        weightedLikeRate <= targetLikeRate * 1.35,
      `weighted like rate ${(weightedLikeRate * 100).toFixed(1)}% outside target band around ${(targetLikeRate * 100).toFixed(1)}%`,
    );
  });

  it("reads config from config/simulation.ts", () => {
    assert.equal(simulationConfig.readPosts.postsPerPersonality, 2);
    assert.equal(simulationConfig.tick.personalityMinBatch, 10);
  });
});
