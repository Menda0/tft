import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  scoreBeliefCompatibility,
  scoreIdeologicalCompatibility,
  scorePoliticalAffinity,
  scoreTraitAffinity,
} from "@/lib/simulation/ideological-compatibility";
import type { Post } from "@/lib/types/post";
import type { Personality } from "@/lib/types/personality";

function personality(overrides: Partial<Personality> = {}): Personality {
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
      followers: 0,
      socialScore: 0,
      controversy: 0,
      creativity: 50,
    },
    memory: [],
    relationships: {},
    ...overrides,
  };
}

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: "post-1",
    author: {
      personalityId: "author",
      handle: "author",
      name: "Author",
      avatarUrl: null,
      archetype: "",
    },
    content: "Tech policy needs reform.",
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
      stronglyAgreeReplies: 0,
      agreeReplies: 0,
      neutralReplies: 0,
      disagreeReplies: 0,
      stronglyDisagreeReplies: 0,
    },
    ...overrides,
  };
}

describe("ideological compatibility", () => {
  it("scores higher political affinity for aligned swings", () => {
    const reader = personality({ politicalSwing: 2 });
    const ally = personality({ id: "ally", politicalSwing: 3 });
    const rival = personality({ id: "rival", politicalSwing: -8 });

    assert.ok(scorePoliticalAffinity(reader, ally) > scorePoliticalAffinity(reader, rival));
  });

  it("scores higher trait affinity for similar traits", () => {
    const reader = personality({
      traits: {
        humor: 5,
        aggression: 8,
        troll: 4,
        woke: 9,
        negacionist: 3,
        radical: 7,
      },
    });
    const similar = personality({
      id: "similar",
      traits: {
        humor: 5,
        aggression: 7,
        troll: 5,
        woke: 8,
        negacionist: 4,
        radical: 6,
      },
    });
    const different = personality({
      id: "different",
      traits: {
        humor: 5,
        aggression: 1,
        troll: 5,
        woke: 1,
        negacionist: 9,
        radical: 1,
      },
    });

    assert.ok(scoreTraitAffinity(reader, similar) > scoreTraitAffinity(reader, different));
  });

  it("rewards shared beliefs on matching topics", () => {
    const reader = personality({ beliefs: { tech: 8 } });
    const ally = personality({ id: "ally", beliefs: { tech: 9 } });
    const opponent = personality({ id: "opponent", beliefs: { "anti-tech": 9 } });

    const target = post();

    assert.ok(
      scoreBeliefCompatibility(reader, ally, target) >
        scoreBeliefCompatibility(reader, opponent, target),
    );
  });

  it("raises overall compatibility for aligned reader and author", () => {
    const reader = personality({ politicalSwing: 5, interests: ["tech"] });
    const ally = personality({
      id: "ally",
      handle: "ally",
      politicalSwing: 4,
      interests: ["tech"],
      beliefs: { tech: 8 },
    });
    const rival = personality({
      id: "rival",
      handle: "rival",
      politicalSwing: -8,
      interests: ["sports"],
      beliefs: { "anti-tech": 9 },
    });

    const target = post();

    assert.ok(
      scoreIdeologicalCompatibility(reader, ally, target) >
        scoreIdeologicalCompatibility(reader, rival, target),
    );
  });
});
