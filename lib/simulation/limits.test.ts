import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getSimulationBatchSize,
  getSimulationPersonalitySampleRate,
} from "@/lib/simulation/limits";

describe("getSimulationBatchSize", () => {
  it("samples at least 10% rounded, with a floor of 10 personalities", () => {
    assert.equal(getSimulationBatchSize(100), 10);
    assert.equal(getSimulationBatchSize(50), 10);
    assert.equal(getSimulationBatchSize(200), 20);
  });

  it("never exceeds the eligible personality count", () => {
    assert.equal(getSimulationBatchSize(8), 8);
    assert.equal(getSimulationBatchSize(3), 3);
  });

  it("returns zero when no personalities are eligible", () => {
    assert.equal(getSimulationBatchSize(0), 0);
  });

  it("defaults sample rate to 10%", () => {
    assert.equal(getSimulationPersonalitySampleRate(), 0.1);
  });
});
