import {
  ensureWorldStateIndexes,
  getWorldState,
  releaseWorldLock,
  tryAcquireWorldLock,
} from "@/lib/db/world";
import { ensurePersonalityIndexes } from "@/lib/personalities";
import { noopSimulationLog, type SimulationLogFn } from "@/lib/simulation/logger";
import {
  getHeatDecayTickIntervalMs,
  heatDecayTick,
  shouldRunHeatDecayTick,
} from "@/lib/simulation/heat-decay";
import { loadSimulationWorld } from "@/lib/simulation/world";

export type HeatDecayTickResult =
  | {
      ok: true;
      lastHeatDecayAt: Date | null;
      personalityCount: number;
    }
  | {
      ok: false;
      status: number;
      error: string;
      lastHeatDecayAt?: Date | null;
      intervalMs?: number;
    };

export async function runHeatDecayTick(
  force = false,
  log: SimulationLogFn = noopSimulationLog,
): Promise<HeatDecayTickResult> {
  await Promise.all([ensureWorldStateIndexes(), ensurePersonalityIndexes()]);

  await getWorldState();

  const locked = await tryAcquireWorldLock();

  if (!locked) {
    log("error", "Simulation is already running.");
    return {
      ok: false,
      status: 409,
      error: "Simulation is already running.",
    };
  }

  try {
    const world = await loadSimulationWorld();

    if (!force && !shouldRunHeatDecayTick(world.state.lastHeatDecayAt)) {
      log("warn", "Heat decay tick skipped: interval has not elapsed yet.");
      return {
        ok: false,
        status: 429,
        error: "Heat decay tick interval has not elapsed yet.",
        lastHeatDecayAt: world.state.lastHeatDecayAt,
        intervalMs: getHeatDecayTickIntervalMs(),
      };
    }

    await heatDecayTick(world, log);

    return {
      ok: true,
      lastHeatDecayAt: world.state.lastHeatDecayAt,
      personalityCount: world.personalities.length,
    };
  } finally {
    await releaseWorldLock();
  }
}
