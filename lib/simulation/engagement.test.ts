import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeEngagementProbabilities } from "@/lib/simulation/engagement-probabilities";
import { defaultPostStats, type Post } from "@/lib/types/post";
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

function baseAuthor(overrides: Partial<Personality> = {}): Personality {
  return basePersonality({
    id: "author",
    name: "Author",
    handle: "author",
    interests: ["tech"],
    politicalSwing: 0,
    ...overrides,
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
      archetype: "",
    },
    content: "Tech is changing everything.",
    topic: "tech",
    replyToPostId: null,
    repostOfPostId: null,
    createdAt: new Date(),
    tickNumber: 1,
    stats: defaultPostStats(),
  };
}

describe("computeEngagementProbabilities", () => {
  it("scales follow probability with endorsement streak", () => {
    const personality = basePersonality();
    const author = baseAuthor();
    const post = basePost(author);
    const baseContext = {
      personality,
      post,
      author,
      alreadyFollowing: false,
      mutuallyFollowing: false,
      isThreadingPost: false,
    };

    const streakOne = computeEngagementProbabilities({
      ...baseContext,
      projectedEndorsementStreak: 1,
    });
    const streakThree = computeEngagementProbabilities({
      ...baseContext,
      projectedEndorsementStreak: 3,
    });

    assert.ok(streakThree.follow > streakOne.follow);
  });

  it("boosts like and agree odds for followed authors", () => {
    const personality = basePersonality();
    const author = baseAuthor();
    const post = basePost(author);
    const baseContext = {
      personality,
      post,
      author,
      mutuallyFollowing: false,
      isThreadingPost: false,
    };

    const notFollowing = computeEngagementProbabilities({
      ...baseContext,
      alreadyFollowing: false,
    });
    const following = computeEngagementProbabilities({
      ...baseContext,
      alreadyFollowing: true,
    });

    assert.ok(following.like > notFollowing.like);
    assert.ok(following.respondAgree > notFollowing.respondAgree);
  });

  it("keeps disagree odds above zero for followed authors", () => {
    const personality = basePersonality({
      traits: {
        humor: 5,
        aggression: 8,
        troll: 8,
        woke: 5,
        negacionist: 8,
        radical: 8,
      },
      politicalSwing: 10,
    });
    const author = baseAuthor({ politicalSwing: -10 });
    const post = basePost(author);

    const probabilities = computeEngagementProbabilities({
      personality,
      post,
      author,
      alreadyFollowing: true,
      mutuallyFollowing: false,
      isThreadingPost: false,
    });

    assert.ok(probabilities.respondDisagree > 0);
  });
});
