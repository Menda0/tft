import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  findTooSimilarPost,
  postContentSimilarity,
  postsAreTooSimilar,
} from "@/lib/simulation/post-content-similarity";

describe("postContentSimilarity", () => {
  it("treats identical posts as fully similar", () => {
    const content = "This AI bill is going to break startups before it helps anyone.";

    assert.equal(postContentSimilarity(content, content), 1);
    assert.equal(postsAreTooSimilar(content, content), true);
  });

  it("flags near-duplicate wording", () => {
    const left =
      "This AI bill is going to break startups before it helps anyone.";
    const right =
      "This AI bill will break startups before it helps anyone.";

    assert.ok(postContentSimilarity(left, right) >= 0.72);
    assert.equal(postsAreTooSimilar(left, right), true);
  });

  it("allows clearly different takes on the same topic", () => {
    const left =
      "This AI bill is going to break startups before it helps anyone.";
    const right =
      "If Congress wants safer AI, start with open model cards instead of vague fear.";

    assert.ok(postContentSimilarity(left, right) < 0.72);
    assert.equal(postsAreTooSimilar(left, right), false);
  });

  it("finds the first too-similar post in a list", () => {
    const candidate = "Everyone is overreacting to the playoff comeback.";
    const existing = [
      "The market is pricing in a soft landing again.",
      "Everyone is overreacting to that playoff comeback.",
    ];

    assert.equal(findTooSimilarPost(candidate, existing), existing[1]);
  });
});
