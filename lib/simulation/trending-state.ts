import {
  fetchTrendingTopics,
  getFallbackTrendingTopics,
} from "@/lib/openai/trending";
import { getWorldState, saveWorldState } from "@/lib/db/world";
import type { TrendingTopic, WorldState } from "@/lib/types/world";

import { getTrendingTopicsTtlMs } from "./limits";
import type { SimulationLogFn } from "./logger";
import { noopSimulationLog } from "./logger";

export type RefreshTrendingTopicsResult = {
  topics: string[];
  trendingTopics: TrendingTopic[];
  updatedAt: Date;
  usedFallback: boolean;
  fromCache: boolean;
};

function getTrendingTopicsAnchor(state: WorldState): Date | null {
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
  state: WorldState,
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

export async function refreshTrendingTopics(
  options: { force?: boolean; log?: SimulationLogFn } = {},
): Promise<RefreshTrendingTopicsResult> {
  const log = options.log ?? noopSimulationLog;
  const state = await getWorldState();

  if (!options.force && !shouldRefreshTrendingTopics(state)) {
    const anchor = getTrendingTopicsAnchor(state);
    const topics = state.trendingTopics.map((entry) => entry.topic);

    log(
      "info",
      `Using cached trending topics from ${anchor?.toISOString() ?? "unknown time"}.`,
    );

    for (const topic of topics) {
      log("info", topic);
    }

    return {
      topics,
      trendingTopics: state.trendingTopics,
      updatedAt: anchor ?? new Date(),
      usedFallback: false,
      fromCache: true,
    };
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
      state.trendingTopics.length > 0
        ? state.trendingTopics.map((entry) => entry.topic)
        : getFallbackTrendingTopics();
  }

  const now = new Date();
  const trendingTopics: TrendingTopic[] = topicLabels.map((topic) => ({
    topic,
    fetchedAt: now,
  }));

  await saveWorldState({
    trendingTopics,
    trendingTopicsUpdatedAt: now,
  });

  if (usedFallback) {
    log("warn", "Trending fetch failed. Using cached/fallback topics.");
  } else {
    log("success", `Trending topics refreshed (${topicLabels.length}).`);
  }

  for (const topic of topicLabels) {
    log("info", topic);
  }

  return {
    topics: topicLabels,
    trendingTopics,
    updatedAt: now,
    usedFallback,
    fromCache: false,
  };
}
