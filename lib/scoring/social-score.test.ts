import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decayControversy } from "@/lib/scoring/controversy";
import {
  computeFollowerClout,
  computeGrossClout,
  computeLinearEngagementRaw,
  computeNetClout,
  computePostClout,
  getCloutBreakdown,
} from "@/lib/scoring/social-score";

describe("computeNetClout", () => {
  it("applies 10% heat penalty", () => {
    assert.equal(computeNetClout(100, 96), 90);
  });

  it("caps heat penalty at 30% of gross clout", () => {
    assert.equal(computeNetClout(20, 96), 14);
  });

  it("returns zero when gross clout is zero", () => {
    assert.equal(computeNetClout(0, 96), 0);
  });
});

describe("getCloutBreakdown", () => {
  it("returns gross, heat, penalty, and net", () => {
    assert.deepEqual(getCloutBreakdown(100, 96), {
      gross: 100,
      heat: 96,
      penalty: 10,
      net: 90,
    });
  });
});

describe("computeLinearEngagementRaw", () => {
  it("weights agree and disagree replies differently", () => {
    const raw = computeLinearEngagementRaw({
      likes: 0,
      reposts: 0,
      replies: 0,
      views: 0,
      agreeReplies: 3,
      disagreeReplies: 2,
    });

    assert.equal(raw, 3 * 8 + 2 * 2);
  });

  it("falls back to agree reply weight when tone breakdown is missing", () => {
    const raw = computeLinearEngagementRaw({
      likes: 0,
      reposts: 0,
      replies: 4,
      views: 0,
    });

    assert.equal(raw, 32);
  });

  it("includes views at 0.05 weight", () => {
    const raw = computeLinearEngagementRaw({
      likes: 0,
      reposts: 0,
      replies: 0,
      views: 100,
    });

    assert.equal(raw, 5);
  });
});

describe("log-scaled clout", () => {
  it("returns zero post clout for zero engagement", () => {
    assert.equal(
      computePostClout({
        likes: 0,
        reposts: 0,
        replies: 0,
        views: 0,
      }),
      0,
    );
  });

  it("has diminishing returns as engagement grows", () => {
    const small = computePostClout({
      likes: 10,
      reposts: 0,
      replies: 0,
      views: 0,
    });
    const large = computePostClout({
      likes: 100,
      reposts: 0,
      replies: 0,
      views: 0,
    });

    assert.ok(small > 0);
    assert.ok(large > small);
    assert.ok(large < small * 10);
  });

  it("adds follower clout with diminishing returns", () => {
    assert.equal(computeFollowerClout(0), 0);
    assert.ok(computeFollowerClout(20) > 0);
    assert.ok(computeFollowerClout(200) < computeFollowerClout(20) * 10);
  });

  it("combines post and follower clout in computeGrossClout", () => {
    const gross = computeGrossClout(
      { likes: 10, reposts: 0, replies: 0, views: 0 },
      20,
    );

    assert.ok(gross > computePostClout({ likes: 10, reposts: 0, replies: 0, views: 0 }));
  });
});

describe("decayControversy", () => {
  it("reduces heat by about 2% per tick", () => {
    assert.equal(decayControversy(96), 94);
  });

  it("does not drop below zero", () => {
    assert.equal(decayControversy(0), 0);
    assert.equal(decayControversy(1), 1);
  });
});
