import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyRelationship,
  getRelationshipCategoryLabel,
} from "@/lib/profile/relationship-category";
import type { Relationship } from "@/lib/types/personality";

function rel(overrides: Partial<Relationship> = {}): Relationship {
  return {
    trust: 5,
    rivalry: 0,
    admiration: 0,
    familiarity: 0,
    ...overrides,
  };
}

describe("classifyRelationship", () => {
  it("classifies nemesis", () => {
    assert.equal(classifyRelationship(rel({ rivalry: 9, trust: 3 })), "nemesis");
  });

  it("classifies frenemy", () => {
    assert.equal(
      classifyRelationship(rel({ rivalry: 6, admiration: 6, trust: 5 })),
      "frenemy",
    );
  });

  it("classifies admirer", () => {
    assert.equal(
      classifyRelationship(rel({ admiration: 8, rivalry: 2 })),
      "admirer",
    );
  });

  it("classifies acquaintance", () => {
    assert.equal(classifyRelationship(rel({ familiarity: 3 })), "acquaintance");
  });

  it("classifies stranger by default", () => {
    assert.equal(classifyRelationship(rel()), "stranger");
  });
});

describe("getRelationshipCategoryLabel", () => {
  it("returns display label", () => {
    assert.equal(getRelationshipCategoryLabel("nemesis"), "Nemesis");
  });
});
