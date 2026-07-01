import { saveWorldState } from "@/lib/db/world";
import { insertTickResult } from "@/lib/db/tick-results";

import { chooseOptionalAction } from "./actions";
import { createPost } from "./posts";
import {
  evolvePersonality,
  rankMilestonePatch,
  shouldAttemptEvolution,
} from "./evolution";
import { resolvePersonalitySocialRank } from "@/lib/profile/social-rank";
import {
  noopSimulationLog,
  truncateForLog,
  type SimulationLogFn,
} from "./logger";
import { getDailyPostLimit, getSimulationBatchSize } from "./limits";
import { throwIfCancelled } from "./cancel";
import { runHeatDecayPass } from "./heat-decay";
import { applyPersonalityUpdate } from "./personality-state";
import { rankNpcEngagementPass } from "./rank-npc-engage";
import { readPostsAndEngage } from "./read-posts";
import { refreshTrendingTopics } from "./trending-state";
import type { SimulationWorld } from "./world";
import { runWithConcurrency, shuffle } from "./utils";
import { isRankNpc } from "@/lib/personalities/rank-npc";
import { isCatalogPersonality } from "@/lib/personalities/catalog";
import type { Personality } from "@/lib/types/personality";
import { getThreadingPosts } from "@/lib/feed/threading";
import {
  createTickStats,
  formatTickStatsSummary,
  recordTickStat,
  type SimulationTickStats,
} from "./tick-stats";
import { simulationConfig } from "./config";

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

  const current =
    world.personalities.find((entry) => entry.id === personality.id) ??
    personality;

  const optional = chooseOptionalAction(current);

  if (optional === "post") {
    log("info", `${handle} chose POST`);
    const result = await createPost(current, world, log);

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
    recordTickStat(world.tickStats, "posts");
    return;
  }

  if (optional === "lurk") {
    log("info", `${handle} is lurking.`);
  }
}

async function runEvolutionPass(
  world: SimulationWorld,
  personalities: Personality[],
  log: SimulationLogFn,
): Promise<void> {
  for (const personality of personalities) {
    if (isRankNpc(personality)) {
      continue;
    }

    if (shouldAttemptEvolution()) {
      const patch = evolvePersonality(personality);

      if (patch) {
        const updated = await applyPersonalityUpdate(world, personality.id, patch);

        if (updated) {
          log(
            "success",
            `@${personality.handle} evolved: ${patch.memory?.map((memory) => memory.text).join(" ") ?? "traits or stats shifted"}`,
          );
        }
      }
    }

    const current =
      world.personalities.find((entry) => entry.id === personality.id) ??
      personality;
    const { rank } = await resolvePersonalitySocialRank(current);
    const rankPatch = rankMilestonePatch(current, rank);

    if (!rankPatch) {
      continue;
    }

    const updated = await applyPersonalityUpdate(world, personality.id, rankPatch);

    if (updated) {
      log(
        "success",
        `@${personality.handle} rank milestone: ${rankPatch.memory?.map((memory) => memory.text).join(" ") ?? rank}`,
      );
    }
  }
}

export type SimulationTickOutput = {
  world: SimulationWorld;
  simulatedPersonalityCount: number;
  eligiblePersonalityCount: number;
  stats: SimulationTickStats;
};

export async function simulationTick(
  world: SimulationWorld,
  log: SimulationLogFn = noopSimulationLog,
  signal?: AbortSignal,
): Promise<SimulationTickOutput> {
  const nextTick = world.state.tickNumber + 1;
  world.tickStats = createTickStats();
  log("info", `--- Tick #${nextTick} starting ---`);
  log("info", `${world.personalities.length} personalities in world.`);

  throwIfCancelled(signal);

  await updateTrendingTopics(world, log);

  throwIfCancelled(signal);

  const threadingPosts = await getThreadingPosts();
  world.threadingPostIds = new Set(threadingPosts.map((post) => post.id));

  if (threadingPosts.length > 0) {
    log(
      "info",
      `Threading set: ${threadingPosts.length} posts from last 6 hours.`,
    );
  }

  throwIfCancelled(signal);

  const eligible = world.personalities.filter(
    (personality) => !isRankNpc(personality) && !isCatalogPersonality(personality),
  );

  if (eligible.length === 0) {
    log("warn", "No personalities to simulate.");
  }

  const batchSize = getSimulationBatchSize(eligible.length);
  const personalities = shuffle(eligible).slice(0, batchSize);

  log(
    "info",
    `Simulating ${personalities.length}/${eligible.length} personalities (read + optional action)`,
  );

  if (personalities.length > 0) {
    log(
      "info",
      `Selected: ${personalities.map((personality) => `@${personality.handle}`).join(", ")}`,
    );
  }

  await runWithConcurrency(
    personalities,
    simulationConfig.tick.concurrency,
    async (personality) => {
      await simulatePersonality(personality, world, log);
    },
    signal,
  );

  throwIfCancelled(signal);

  await rankNpcEngagementPass(world, log, signal);

  throwIfCancelled(signal);

  await runEvolutionPass(world, personalities, log);

  throwIfCancelled(signal);

  await runHeatDecayPass(world, log);

  throwIfCancelled(signal);

  const now = new Date();
  world.state.tickNumber = nextTick;
  world.state.lastTickAt = now;

  await saveWorldState({
    tickNumber: world.state.tickNumber,
    lastTickAt: now,
  });

  const stats = world.tickStats ?? createTickStats();
  world.tickStats = null;

  await insertTickResult({
    tickNumber: nextTick,
    completedAt: now,
    simulatedPersonalityCount: personalities.length,
    eligiblePersonalityCount: eligible.length,
    stats,
  });

  log("success", `--- Tick #${nextTick} complete ---`);
  log("success", `Tick activity: ${formatTickStatsSummary(stats)}`);

  return {
    world,
    simulatedPersonalityCount: personalities.length,
    eligiblePersonalityCount: eligible.length,
    stats,
  };
}

export function getSimulationTickIntervalMs(): number {
  return simulationConfig.tick.intervalMs;
}

export function shouldRunTick(lastTickAt: Date | null, now = Date.now()): boolean {
  if (!lastTickAt) {
    return true;
  }

  return now - lastTickAt.getTime() >= getSimulationTickIntervalMs();
}
