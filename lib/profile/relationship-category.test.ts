import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildRelationshipCategoryCounts,
  classifyRelationship,
  compareRelationshipsByCategory,
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

describe("compareRelationshipsByCategory", () => {
  it("sorts haters before friends and admirers", () => {
    assert.ok(compareRelationshipsByCategory("hater", "friend") < 0);
    assert.ok(compareRelationshipsByCategory("friend", "admirer") < 0);
    assert.ok(compareRelationshipsByCategory("admirer", "stranger") < 0);
  });

  it("breaks ties by name", () => {
    assert.ok(compareRelationshipsByCategory("friend", "friend", "Amy", "Zoe") < 0);
  });
});

describe("buildRelationshipCategoryCounts", () => {
  it("returns counts in display order and omits zero categories", () => {
    const counts = buildRelationshipCategoryCounts({
      a1: { trust: 4, rivalry: 6, admiration: 2, familiarity: 3 },
      a2: { trust: 6, rivalry: 3, admiration: 5, familiarity: 4 },
      a3: { trust: 5, rivalry: 2, admiration: 8, familiarity: 5 },
    });

    assert.deepEqual(
      counts.map((entry) => entry.category),
      ["hater", "friend", "admirer"],
    );
    assert.equal(counts[0]?.count, 1);
    assert.equal(counts[1]?.count, 1);
    assert.equal(counts[2]?.count, 1);
  });
});

describe("getRelationshipCategoryLabel", () => {
  it("returns display label", () => {
    assert.equal(getRelationshipCategoryLabel("nemesis"), "Nemesis");
  });
});
