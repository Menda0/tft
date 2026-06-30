import {
  ensureWorldStateIndexes,
  getWorldState,
  releaseWorldLock,
  tryAcquireWorldLock,
} from "@/lib/db/world";
import { ensureAiUsageIndexes } from "@/lib/db/ai-usage";
import { ensureFollowIndexes } from "@/lib/db/follows";
import { ensurePersonalityActivityIndexes } from "@/lib/db/personality-activity";
import { ensurePostReadIndexes } from "@/lib/db/post-reads";
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
import type { SimulationTickStats } from "@/lib/simulation/tick-stats";

export type SimulationTickResult =
  | {
      ok: true;
      tickNumber: number;
      lastTickAt: Date | null;
      trendingTopics: string[];
      personalityCount: number;
      postCount: number;
      simulatedPersonalityCount: number;
      eligiblePersonalityCount: number;
      stats: SimulationTickStats;
    }
  | {
      ok: false;
      skipped: true;
      error: string;
      lastTickAt: Date | null;
      intervalMs: number;
    }
  | {
      ok: false;
      status: number;
      error: string;
      cancelled?: boolean;
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
    ensurePostReadIndexes(),
    ensurePersonalityActivityIndexes(),
    ensurePersonalityIndexes(),
    ensureAiUsageIndexes(),
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
        skipped: true,
        error: "Simulation tick interval has not elapsed yet.",
        lastTickAt: world.state.lastTickAt,
        intervalMs: getSimulationTickIntervalMs(),
      };
    }

    const result = await simulationTick(world, log, signal);

    return {
      ok: true,
      tickNumber: result.world.state.tickNumber,
      lastTickAt: result.world.state.lastTickAt,
      trendingTopics: result.world.state.trendingTopics.map((entry) => entry.topic),
      personalityCount: result.world.personalities.length,
      postCount: result.world.posts.length,
      simulatedPersonalityCount: result.simulatedPersonalityCount,
      eligiblePersonalityCount: result.eligiblePersonalityCount,
      stats: result.stats,
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
