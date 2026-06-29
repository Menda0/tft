import {
  ensureWorldStateIndexes,
  getWorldState,
  releaseWorldLock,
  tryAcquireWorldLock,
} from "@/lib/db/world";
import { ensureFollowIndexes } from "@/lib/db/follows";
import { ensurePostIndexes } from "@/lib/db/posts";
import { ensurePersonalityIndexes } from "@/lib/personalities";
import {
  getSimulationTickIntervalMs,
  shouldRunTick,
  simulationTick,
  type SimulationLogFn,
} from "@/lib/simulation/tick";
import { isTickCancelled } from "@/lib/simulation/cancel";
import { noopSimulationLog } from "@/lib/simulation/logger";
import { loadSimulationWorld } from "@/lib/simulation/world";

export type SimulationTickResult =
  | {
      ok: true;
      tickNumber: number;
      lastTickAt: Date | null;
      trendingTopics: string[];
      personalityCount: number;
      postCount: number;
    }
  | {
      ok: false;
      status: number;
      error: string;
      cancelled?: boolean;
      lastTickAt?: Date | null;
      intervalMs?: number;
    };

export async function runSimulationTick(
  force = false,
  log: SimulationLogFn = noopSimulationLog,
  signal?: AbortSignal,
): Promise<SimulationTickResult> {
  await Promise.all([
    ensureWorldStateIndexes(),
    ensurePostIndexes(),
    ensureFollowIndexes(),
    ensurePersonalityIndexes(),
  ]);

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

    if (!force && !shouldRunTick(world.state.lastTickAt)) {
      log("warn", "Tick skipped: interval has not elapsed yet.");
      return {
        ok: false,
        status: 429,
        error: "Simulation tick interval has not elapsed yet.",
        lastTickAt: world.state.lastTickAt,
        intervalMs: getSimulationTickIntervalMs(),
      };
    }

    const result = await simulationTick(world, log, signal);

    return {
      ok: true,
      tickNumber: result.state.tickNumber,
      lastTickAt: result.state.lastTickAt,
      trendingTopics: result.state.trendingTopics.map((entry) => entry.topic),
      personalityCount: result.personalities.length,
      postCount: result.posts.length,
    };
  } catch (error) {
    if (isTickCancelled(error) || signal?.aborted) {
      log("warn", "Tick cancelled.");
      return {
        ok: false,
        status: 499,
        error: "Tick cancelled.",
        cancelled: true,
      };
    }

    throw error;
  } finally {
    await releaseWorldLock();
  }
}
