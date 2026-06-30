import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeAgreeIntensity,
  computeAgreeProbabilityModifiers,
  computeAuthorHeatDefense,
  computeAuthorHeatPull,
  computeDisagreeCooldownMultiplier,
  computeDisagreeIntensity,
  computeDisagreeProbabilityModifiers,
} from "@/lib/simulation/engagement-intensity";
import type { Personality, Relationship } from "@/lib/types/personality";

function basePersonality(overrides: Partial<Personality> = {}): Personality {
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
      controversy: 0,
      creativity: 0,
    },
    memory: [],
    relationships: {},
    ...overrides,
  };
}

function relationship(overrides: Partial<Relationship> = {}): Relationship {
  return {
    trust: 5,
    rivalry: 0,
    admiration: 0,
    familiarity: 0,
    ...overrides,
  };
}

describe("computeAgreeProbabilityModifiers", () => {
  it("boosts agree odds more for high admiration", () => {
    const low = computeAgreeProbabilityModifiers(
      relationship({ admiration: 2 }),
      basePersonality().traits,
    );
    const high = computeAgreeProbabilityModifiers(
      relationship({ admiration: 8 }),
      basePersonality().traits,
    );

    assert.ok(high > low);
  });
});

describe("computeDisagreeProbabilityModifiers", () => {
  it("boosts disagree odds more for high rivalry", () => {
    const low = computeDisagreeProbabilityModifiers(
      relationship({ rivalry: 2 }),
      basePersonality().traits,
      null,
    );
    const high = computeDisagreeProbabilityModifiers(
      relationship({ rivalry: 8 }),
      basePersonality().traits,
      null,
    );

    assert.ok(high > low);
  });

  it("admiration partially offsets rivalry boost", () => {
    const rivalOnly = computeDisagreeProbabilityModifiers(
      relationship({ rivalry: 8, admiration: 0 }),
      basePersonality().traits,
      null,
    );
    const admireRival = computeDisagreeProbabilityModifiers(
      relationship({ rivalry: 8, admiration: 8 }),
      basePersonality().traits,
      null,
    );

    assert.ok(admireRival < rivalOnly);
  });
});

describe("computeDisagreeIntensity", () => {
  it("is higher for aggressive actors than humorous ones", () => {
    const aggressive = computeDisagreeIntensity(
      basePersonality({ traits: { ...basePersonality().traits, aggression: 9, humor: 2 } }),
      basePersonality({ id: "author", handle: "author" }),
      relationship(),
    );
    const humorous = computeDisagreeIntensity(
      basePersonality({ traits: { ...basePersonality().traits, aggression: 2, humor: 9 } }),
      basePersonality({ id: "author", handle: "author" }),
      relationship(),
    );

    assert.ok(aggressive > humorous);
  });
});

describe("computeDisagreeCooldownMultiplier", () => {
  it("reduces probability after repeated disagrees unless feud-level rivalry", () => {
    assert.equal(computeDisagreeCooldownMultiplier(2, 5), 0.35);
    assert.equal(computeDisagreeCooldownMultiplier(2, 8), 1);
    assert.equal(computeDisagreeCooldownMultiplier(1, 5), 1);
  });
});

describe("computeAuthorHeatDefense", () => {
  it("reduces incoming heat for humorous authors", () => {
    assert.equal(
      computeAuthorHeatDefense(
        basePersonality({ traits: { ...basePersonality().traits, humor: 0 } }),
      ),
      1,
    );
    assert.equal(
      computeAuthorHeatDefense(
        basePersonality({ traits: { ...basePersonality().traits, humor: 10 } }),
      ),
      0.85,
    );
  });
});

describe("computeAuthorHeatPull", () => {
  it("only pulls extra disagrees for very hot authors", () => {
    assert.equal(
      computeAuthorHeatPull(
        basePersonality({ stats: { ...basePersonality().stats, controversy: 50 } }),
      ),
      0,
    );
    assert.ok(
      computeAuthorHeatPull(
        basePersonality({ stats: { ...basePersonality().stats, controversy: 120 } }),
      ) > 0,
    );
  });
});

describe("computeAgreeIntensity", () => {
  it("scales with admiration", () => {
    const low = computeAgreeIntensity(
      basePersonality(),
      relationship({ admiration: 1 }),
    );
    const high = computeAgreeIntensity(
      basePersonality(),
      relationship({ admiration: 9 }),
    );

    assert.ok(high > low);
  });
});
