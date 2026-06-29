import {
  getMyFarmerLeaderboardEntry,
  getMyPersonalityLeaderboardEntries,
  getTopFarmersByClout,
  getTopFarmersByHeat,
  getTopPersonalitiesByClout,
  getTopPersonalitiesByHeat,
} from "@/lib/leaderboards";
import { LEADERBOARD_LIMIT } from "@/lib/pagination";
import type {
  LeaderboardPagePayload,
  LeaderboardTab,
  MyLeaderboardEntriesPayload,
} from "@/lib/types/desktop";

export async function buildLeaderboardPage(
  tab: LeaderboardTab,
  offset: number,
  limit = LEADERBOARD_LIMIT,
): Promise<LeaderboardPagePayload> {
  const updatedAt = new Date().toISOString();

  if (tab === "clout-personality") {
    const page = await getTopPersonalitiesByClout(offset, limit);

    return {
      kind: "personality",
      tab,
      entries: page.entries,
      hasMore: page.hasMore,
      updatedAt,
    };
  }

  if (tab === "clout-farmers") {
    const page = await getTopFarmersByClout(offset, limit);

    return {
      kind: "farmer",
      tab,
      entries: page.entries,
      hasMore: page.hasMore,
      updatedAt,
    };
  }

  if (tab === "heat-personality") {
    const page = await getTopPersonalitiesByHeat(offset, limit);

    return {
      kind: "personality",
      tab,
      entries: page.entries,
      hasMore: page.hasMore,
      updatedAt,
    };
  }

  const page = await getTopFarmersByHeat(offset, limit);

  return {
    kind: "farmer",
    tab,
    entries: page.entries,
    hasMore: page.hasMore,
    updatedAt,
  };
}

export async function buildMyLeaderboardEntries(
  ownerId: string,
  tab: LeaderboardTab,
): Promise<MyLeaderboardEntriesPayload> {
  if (tab === "clout-personality" || tab === "heat-personality") {
    return {
      kind: "personality",
      tab,
      entries: await getMyPersonalityLeaderboardEntries(ownerId, tab),
    };
  }

  return {
    kind: "farmer",
    tab,
    entry: await getMyFarmerLeaderboardEntry(ownerId, tab),
  };
}
