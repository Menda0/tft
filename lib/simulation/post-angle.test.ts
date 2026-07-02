import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatPostAngleGuidance,
  pickPostAngle,
  POST_ANGLE_GUIDANCE,
} from "@/lib/simulation/post-angle";
import type { Personality } from "@/lib/types/personality";

function personality(overrides: Partial<Personality> = {}): Personality {
  return {
    id: "p1",
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
      creativity: 5,
    },
    memory: [],
    relationships: {},
    ...overrides,
  };
}

describe("pickPostAngle", () => {
  it("returns a known angle with guidance", () => {
    const angle = pickPostAngle(personality());

    assert.ok(angle in POST_ANGLE_GUIDANCE);
    assert.match(formatPostAngleGuidance(angle), /./);
  });

  it("biases humorous personalities toward joke angles", () => {
    const counts = new Map<string, number>();

    for (let index = 0; index < 40; index += 1) {
      const angle = pickPostAngle(
        personality({
          traits: {
            humor: 10,
            aggression: 1,
            troll: 1,
            woke: 1,
            negacionist: 1,
            radical: 1,
          },
        }),
      );
      counts.set(angle, (counts.get(angle) ?? 0) + 1);
    }

    assert.ok((counts.get("joke") ?? 0) > 5);
  });
});
