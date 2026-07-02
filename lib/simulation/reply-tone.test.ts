import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  breaksEndorsementStreak,
  decideReplyTone,
  isEndorsementTone,
} from "@/lib/simulation/reply-tone";

describe("decideReplyTone", () => {
  it("marks agree tones as endorsements but not neutral", () => {
    assert.equal(isEndorsementTone("agree"), true);
    assert.equal(isEndorsementTone("strongly_agree"), true);
    assert.equal(isEndorsementTone("neutral"), false);
    assert.equal(breaksEndorsementStreak("disagree"), true);
    assert.equal(breaksEndorsementStreak("neutral"), false);
  });

  it("favors agree tones at high compatibility", () => {
    const samples = Array.from({ length: 500 }, () =>
      decideReplyTone(
        0.9,
        0.9,
        {
          humor: 5,
          aggression: 3,
          troll: 3,
          woke: 7,
          negacionist: 2,
          radical: 4,
        },
        undefined,
      ),
    );

    const agreeish = samples.filter(
      (tone) => tone === "agree" || tone === "strongly_agree",
    ).length;

    assert.ok(agreeish > samples.length * 0.5);
  });

  it("favors disagree tones at low compatibility", () => {
    const samples = Array.from({ length: 500 }, () =>
      decideReplyTone(
        0.1,
        0.1,
        {
          humor: 5,
          aggression: 9,
          troll: 8,
          woke: 2,
          negacionist: 9,
          radical: 8,
        },
        { trust: 1, admiration: 1, rivalry: 9, familiarity: 5, endorsementStreak: 0 },
      ),
    );

    const disagreeish = samples.filter(
      (tone) => tone === "disagree" || tone === "strongly_disagree",
    ).length;

    assert.ok(disagreeish > samples.length * 0.35);
  });
});
