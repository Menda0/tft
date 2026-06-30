import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getSimulationBatchSize,
  getSimulationPersonalitySampleRate,
} from "@/lib/simulation/limits";

describe("getSimulationBatchSize", () => {
  it("samples 10% of eligible personalities rounded", () => {
    assert.equal(getSimulationBatchSize(100), 10);
    assert.equal(getSimulationBatchSize(50), 5);
    assert.equal(getSimulationBatchSize(8), 1);
  });

  it("returns zero when no personalities are eligible", () => {
    assert.equal(getSimulationBatchSize(0), 0);
  });

  it("defaults sample rate to 10%", () => {
    assert.equal(getSimulationPersonalitySampleRate(), 0.1);
  });
});
