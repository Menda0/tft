import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { chooseOptionalAction } from "@/lib/simulation/actions";
import { getDailyPostLimit } from "@/lib/simulation/limits";
import type { Personality } from "@/lib/types/personality";

function basePersonality(): Personality {
  return {
    id: "poster",
    name: "Poster",
    handle: "poster",
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
      creativity: 50,
    },
    memory: [],
    relationships: {},
  };
}

describe("chooseOptionalAction", () => {
  it("excludes post option when daily limit is reached", () => {
    const samples = Array.from({ length: 500 }, () =>
      chooseOptionalAction(basePersonality(), getDailyPostLimit()),
    );

    assert.equal(samples.includes("post"), false);
  });

  it("reduces post selection rate after the first post of the day", () => {
    const firstPostSamples = Array.from({ length: 2000 }, () =>
      chooseOptionalAction(basePersonality(), 0),
    );
    const secondPostSamples = Array.from({ length: 2000 }, () =>
      chooseOptionalAction(basePersonality(), 1),
    );

    const firstPostRate =
      firstPostSamples.filter((action) => action === "post").length / 2000;
    const secondPostRate =
      secondPostSamples.filter((action) => action === "post").length / 2000;

    assert.ok(firstPostRate > secondPostRate);
  });
});
