import {
  fetchTrendingTopics,
  getFallbackTrendingTopics,
} from "@/lib/openai/trending";
import { saveWorldState } from "@/lib/db/world";
import type { TrendingTopic } from "@/lib/types/world";

import { chooseAction } from "./actions";
import {
  createPost,
  followSomeone,
  replyToPost,
  repostPost,
} from "./posts";
import {
  noopSimulationLog,
  truncateForLog,
  type SimulationLogFn,
} from "./logger";
import { getDailyPostLimit, getTrendingTopicsTtlMs } from "./limits";
import { throwIfCancelled } from "./cancel";
import type { SimulationWorld } from "./world";
import { runWithConcurrency, shuffle } from "./utils";
import type { Personality } from "@/lib/types/personality";
import type { ActionType } from "@/lib/types/world";

export type { SimulationLogFn, TickLogEntry, TickLogLevel } from "./logger";
export { createSimulationLogger, noopSimulationLog } from "./logger";

type PersonalityAction = {
  personality: Personality;
  action: ActionType;
};

function getTrendingTopicsAnchor(state: SimulationWorld["state"]): Date | null {
  if (state.trendingTopicsUpdatedAt) {
    return new Date(state.trendingTopicsUpdatedAt);
  }

  const firstTopic = state.trendingTopics[0];

  if (firstTopic?.fetchedAt) {
    return new Date(firstTopic.fetchedAt);
  }

  return null;
}

export function shouldRefreshTrendingTopics(
  state: SimulationWorld["state"],
  now = Date.now(),
): boolean {
  if (state.trendingTopics.length === 0) {
    return true;
  }

  const anchor = getTrendingTopicsAnchor(state);

  if (!anchor) {
    return true;
  }

  return now - anchor.getTime() >= getTrendingTopicsTtlMs();
}

async function updateTrendingTopics(
  world: SimulationWorld,
  log: SimulationLogFn,
): Promise<void> {
  if (!shouldRefreshTrendingTopics(world.state)) {
    const anchor = getTrendingTopicsAnchor(world.state);
    const labels = world.state.trendingTopics.map((entry) => entry.topic);

    log(
      "info",
      `Using cached trending topics from ${anchor?.toISOString() ?? "unknown time"}.`,
    );
    log(
      "success",
      `Trending topics (${labels.length}): ${labels.join(" | ")}`,
    );
    return;
  }

  log("info", "Fetching trending topics...");

  let topicLabels: string[];
  let usedFallback = false;

  try {
    topicLabels = await fetchTrendingTopics();
  } catch (error) {
    console.error("Trending topic fetch failed, using fallback:", error);
    usedFallback = true;
    topicLabels =
      world.state.trendingTopics.length > 0
        ? world.state.trendingTopics.map((entry) => entry.topic)
        : getFallbackTrendingTopics();
  }

  const now = new Date();
  const trendingTopics: TrendingTopic[] = topicLabels.map((topic) => ({
    topic,
    fetchedAt: now,
  }));

  world.state.trendingTopics = trendingTopics;
  world.state.trendingTopicsUpdatedAt = now;

  await saveWorldState({
    trendingTopics,
    trendingTopicsUpdatedAt: now,
  });

  if (usedFallback) {
    log("warn", "Trending fetch failed. Using cached/fallback topics.");
  }

  log(
    "success",
    `Trending topics refreshed (${topicLabels.length}): ${topicLabels.join(" | ")}`,
  );
}

async function executeAction(
  personality: Personality,
  action: ActionType,
  world: SimulationWorld,
  log: SimulationLogFn,
): Promise<void> {
  const handle = `@${personality.handle}`;

  switch (action) {
    case "post": {
      log("info", `${handle} chose POST — generating...`);
      const result = await createPost(personality, world);

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
    case "reply": {
      log("info", `${handle} chose REPLY — generating...`);
      const reply = await replyToPost(personality, world);

      if (!reply) {
        log("warn", `${handle} had no post to reply to.`);
        return;
      }

      const targetHandle = world.posts.find(
        (post) => post.id === reply.replyToPostId,
      )?.author.handle;

      log(
        "success",
        `${handle} replied to @${targetHandle ?? "unknown"}: ${truncateForLog(reply.content)}`,
      );
      return;
    }
    case "repost": {
      log("info", `${handle} chose REPOST`);
      const repost = await repostPost(personality, world);

      if (!repost) {
        log("warn", `${handle} had no post to repost.`);
        return;
      }

      const source = world.posts.find(
        (post) => post.id === repost.repostOfPostId,
      );

      log(
        "success",
        `${handle} reposted @${source?.author.handle ?? "unknown"}: ${truncateForLog(repost.content)}`,
      );
      return;
    }
    case "follow": {
      log("info", `${handle} chose FOLLOW`);
      const target = await followSomeone(personality, world);

      if (!target) {
        log("warn", `${handle} had nobody to follow.`);
        return;
      }

      log(
        "success",
        `${handle} followed @${target.handle} (${target.stats.followers} followers)`,
      );
      return;
    }
    case "lurk":
      log("info", `${handle} is lurking.`);
      return;
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

  const actions: PersonalityAction[] = shuffle(world.personalities).map(
    (personality) => ({
      personality,
      action: chooseAction(personality),
    }),
  );

  const llmActions = actions.filter(
    (entry) => entry.action === "post" || entry.action === "reply",
  );
  const otherActions = actions.filter(
    (entry) => entry.action !== "post" && entry.action !== "reply",
  );

  log(
    "info",
    `Actions queued: ${actions.length} (${llmActions.length} LLM, ${otherActions.length} instant)`,
  );

  await runWithConcurrency(
    llmActions,
    3,
    async ({ personality, action }) => {
      await executeAction(personality, action, world, log);
    },
    signal,
  );

  for (const { personality, action } of otherActions) {
    throwIfCancelled(signal);
    await executeAction(personality, action, world, log);
  }

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
