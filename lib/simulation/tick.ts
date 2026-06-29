import { saveWorldState } from "@/lib/db/world";

import { chooseOptionalAction } from "./actions";
import { createPost } from "./posts";
import {
  noopSimulationLog,
  truncateForLog,
  type SimulationLogFn,
} from "./logger";
import { getDailyPostLimit } from "./limits";
import { throwIfCancelled } from "./cancel";
import { readPostsAndEngage } from "./read-posts";
import { refreshTrendingTopics } from "./trending-state";
import type { SimulationWorld } from "./world";
import { runWithConcurrency, shuffle } from "./utils";
import type { Personality } from "@/lib/types/personality";

export type { SimulationLogFn, TickLogEntry, TickLogLevel } from "./logger";
export { createSimulationLogger, noopSimulationLog } from "./logger";
export { shouldRefreshTrendingTopics } from "./trending-state";

async function updateTrendingTopics(
  world: SimulationWorld,
  log: SimulationLogFn,
): Promise<void> {
  const result = await refreshTrendingTopics({ log });

  world.state.trendingTopics = result.trendingTopics;
  world.state.trendingTopicsUpdatedAt = result.updatedAt;
}

async function simulatePersonality(
  personality: Personality,
  world: SimulationWorld,
  log: SimulationLogFn,
): Promise<void> {
  const handle = `@${personality.handle}`;

  await readPostsAndEngage(personality, world, log);

  const optional = chooseOptionalAction(personality);

  if (optional === "post") {
    log("info", `${handle} chose POST`);
    const result = await createPost(personality, world, log);

    if (!result.ok) {
      if (result.reason === "daily_limit") {
        log(
          "warn",
          `${handle} hit the daily post limit (${getDailyPostLimit()}/day).`,
        );
      } else if (result.reason === "no_topic") {
        log("warn", `${handle} skipped posting — no fresh topic available.`);
      } else {
        log("warn", `${handle} failed to post.`);
      }
      return;
    }

    log(
      "success",
      `${handle} posted about "${result.post.topic ?? "general"}": ${truncateForLog(result.post.content)}`,
    );
    return;
  }

  if (optional === "lurk") {
    log("info", `${handle} is lurking.`);
  }
}

export async function simulationTick(
  world: SimulationWorld,
  log: SimulationLogFn = noopSimulationLog,
  signal?: AbortSignal,
): Promise<SimulationWorld> {
  const nextTick = world.state.tickNumber + 1;
  log("info", `--- Tick #${nextTick} starting ---`);
  log("info", `${world.personalities.length} personalities in world.`);

  throwIfCancelled(signal);

  await updateTrendingTopics(world, log);

  throwIfCancelled(signal);

  if (world.personalities.length === 0) {
    log("warn", "No personalities to simulate.");
  }

  const personalities = shuffle(world.personalities);

  log("info", `Simulating ${personalities.length} personalities (read + optional action)`);

  await runWithConcurrency(
    personalities,
    3,
    async (personality) => {
      await simulatePersonality(personality, world, log);
    },
    signal,
  );

  throwIfCancelled(signal);

  const now = new Date();
  world.state.tickNumber = nextTick;
  world.state.lastTickAt = now;

  await saveWorldState({
    tickNumber: world.state.tickNumber,
    lastTickAt: now,
  });

  log("success", `--- Tick #${nextTick} complete ---`);

  return world;
}

export function getSimulationTickIntervalMs(): number {
  const raw = process.env.SIMULATION_TICK_INTERVAL_MS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return 30 * 60 * 1000;
}

export function shouldRunTick(lastTickAt: Date | null, now = Date.now()): boolean {
  if (!lastTickAt) {
    return true;
  }

  return now - lastTickAt.getTime() >= getSimulationTickIntervalMs();
}
