import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CONTROVERSY_EVOLVE_THRESHOLD,
  evolvePersonality,
} from "@/lib/simulation/evolution";
import type { Personality } from "@/lib/types/personality";

function personality(
  controversy: number,
  relationships: Personality["relationships"] = {},
): Personality {
  return {
    id: "p1",
    name: "Test",
    handle: "test",
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
    interests: [],
    beliefs: {},
    stats: {
      followers: 0,
      socialScore: 0,
      controversy,
      creativity: 0,
    },
    memory: [],
    relationships,
  };
}

describe("evolvePersonality", () => {
  it("does not evolve with heat alone", () => {
    const patch = evolvePersonality(
      personality(CONTROVERSY_EVOLVE_THRESHOLD + 10, {
        a2: { trust: 3, rivalry: 4, admiration: 0, familiarity: 2 },
      }),
    );

    assert.equal(patch, null);
  });

  it("evolves when heat and multiple feuds are present", () => {
    const patch = evolvePersonality(
      personality(CONTROVERSY_EVOLVE_THRESHOLD + 10, {
        a2: { trust: 2, rivalry: 7, admiration: 0, familiarity: 4 },
        a3: { trust: 2, rivalry: 8, admiration: 1, familiarity: 5 },
      }),
    );

    assert.ok(patch);
    assert.equal(patch?.traits?.aggression, 6);
    assert.equal(patch?.memory?.[0]?.type, "belief_change");
  });
});
