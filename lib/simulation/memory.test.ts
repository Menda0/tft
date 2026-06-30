import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  recordEndorsementMemory,
  recordExchangeMemory,
} from "@/lib/simulation/memory";
import type { Personality } from "@/lib/types/personality";

function personality(
  id: string,
  handle: string,
  relationships: Personality["relationships"] = {},
  memory: Personality["memory"] = [],
): Personality {
  return {
    id,
    name: handle,
    handle,
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
      aggression: 8,
      troll: 5,
      woke: 5,
      negacionist: 5,
      radical: 5,
    },
    politicalSwing: 0,
    interests: [],
    beliefs: {},
    stats: {
      followers: 0,
      socialScore: 0,
      controversy: 0,
      creativity: 0,
    },
    memory,
    relationships,
  };
}

describe("recordEndorsementMemory", () => {
  it("dedupes per actor handle", () => {
    const author = personality("a1", "author");
    const actor = personality("a2", "actor");
    const first = recordEndorsementMemory(author, actor, "AI", "agreed");
    const second = recordEndorsementMemory(
      {
        ...author,
        memory: first ? [first] : [],
      },
      actor,
      "crypto",
      "agreed",
    );

    assert.ok(first);
    assert.equal(second, null);
  });
});

describe("recordExchangeMemory", () => {
  it("returns null below rivalry threshold", () => {
    const author = personality("a1", "author", {
      a2: { trust: 5, rivalry: 3, admiration: 0, familiarity: 2 },
    });
    const actor = personality("a2", "actor");

    assert.equal(recordExchangeMemory(author, actor, "politics"), null);
  });

  it("creates exchange memory at rivalry threshold with scaled importance", () => {
    const author = personality("a1", "author", {
      a2: { trust: 3, rivalry: 7, admiration: 0, familiarity: 4 },
    });
    const actor = personality("a2", "actor");

    const memory = recordExchangeMemory(author, actor, "politics");

    assert.ok(memory);
    assert.equal(memory?.type, "exchange");
    assert.ok(memory.importance >= 5);
    assert.ok(memory.importance <= 9);
  });
});
