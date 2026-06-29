import { mergeNotDeleted } from "@/lib/db/active-filters";
import { findUserById } from "@/lib/db/users";
import { avatarColorForHandle } from "@/lib/feed/format";
import {
  getPersonalitiesCollection,
  isPersonalityDeleted,
  normalizePersonality,
} from "@/lib/personalities";
import { isRankNpc } from "@/lib/personalities/rank-npc";
import { normalizeStoredStats } from "@/lib/personalities/stats";
import { resolveSocialRanksForPersonalities } from "@/lib/profile/social-rank";
import type { SocialRank } from "@/lib/scoring/ranks";
import type { Personality } from "@/lib/types/personality";
import { LEADERBOARD_LIMIT } from "@/lib/pagination";
import type {
  FarmerLeaderboardEntry,
  PersonalityLeaderboardEntry,
} from "@/lib/types/desktop";

function toPersonalityEntry(
  personality: Personality,
  score: number,
  rank: number,
  ownerUsername: string,
  socialRank: SocialRank,
  socialRankLabel: string,
): PersonalityLeaderboardEntry {
  return {
    rank,
    id: personality.id,
    name: personality.name,
    handle: personality.handle,
    ownerUsername,
    avatarUrl: personality.avatarUrl ?? null,
    avatarColor: avatarColorForHandle(personality.handle),
    score,
    socialRank,
    socialRankLabel,
  };
}

type LeaderboardPage<T> = {
  entries: T[];
  hasMore: boolean;
};

async function sortPersonalitiesByScore(
  personalities: Personality[],
  getScore: (personality: Personality) => number,
  offset: number,
  limit: number,
): Promise<LeaderboardPage<PersonalityLeaderboardEntry>> {
  const sorted = personalities
    .map((raw) => {
      const personality = normalizePersonality(raw);
      return {
        personality,
        score: getScore(personality),
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.personality.id.localeCompare(b.personality.id);
    });

  const page = sorted.slice(offset, offset + limit + 1);
  const hasMore = page.length > limit;
  const items = hasMore ? page.slice(0, limit) : page;

  const ownerIds = [
    ...new Set(
      items
        .map((entry) => entry.personality.ownerId)
        .filter((ownerId): ownerId is string => Boolean(ownerId)),
    ),
  ];

  const users = await Promise.all(ownerIds.map((ownerId) => findUserById(ownerId)));
  const usernameByOwnerId = new Map(
    ownerIds.map((ownerId, index) => [
      ownerId,
      users[index]?.username ?? "Unknown",
    ]),
  );

  const socialRanks = await resolveSocialRanksForPersonalities(
    items.map((entry) => entry.personality),
  );

  return {
    entries: items.map((entry, index) => {
      const rankInfo = socialRanks.get(entry.personality.id);

      return toPersonalityEntry(
        entry.personality,
        entry.score,
        offset + index + 1,
        entry.personality.ownerId
          ? (usernameByOwnerId.get(entry.personality.ownerId) ?? "Unknown")
          : "Unknown",
        rankInfo?.rank ?? "novice",
        rankInfo?.label ?? "Novice",
      );
    }),
    hasMore,
  };
}

export async function getTopPersonalitiesByClout(
  offset = 0,
  limit = LEADERBOARD_LIMIT,
): Promise<LeaderboardPage<PersonalityLeaderboardEntry>> {
  const collection = await getPersonalitiesCollection();
  const personalities = await collection
    .find(
      mergeNotDeleted({
        $or: [
          { role: { $exists: false } },
          { role: { $ne: "rank_npc" as const } },
        ],
      }),
    )
    .toArray();

  return sortPersonalitiesByScore(
    personalities,
    (personality) => normalizeStoredStats(personality.stats).socialScore,
    offset,
    limit,
  );
}

export async function getTopPersonalitiesByHeat(
  offset = 0,
  limit = LEADERBOARD_LIMIT,
): Promise<LeaderboardPage<PersonalityLeaderboardEntry>> {
  const collection = await getPersonalitiesCollection();
  const personalities = await collection
    .find(
      mergeNotDeleted({
        $or: [
          { role: { $exists: false } },
          { role: { $ne: "rank_npc" as const } },
        ],
      }),
    )
    .toArray();

  return sortPersonalitiesByScore(
    personalities,
    (personality) => normalizeStoredStats(personality.stats).controversy,
    offset,
    limit,
  );
}

async function getTopFarmersByMetric(
  getScore: (personality: Personality) => number,
  offset: number,
  limit: number,
): Promise<LeaderboardPage<FarmerLeaderboardEntry>> {
  const collection = await getPersonalitiesCollection();
  const personalities = await collection.find().toArray();

  const farmTotals = new Map<string, { score: number; botCount: number }>();

  for (const raw of personalities) {
    const personality = normalizePersonality(raw);

    if (isRankNpc(personality) || !personality.ownerId || isPersonalityDeleted(personality)) {
      continue;
    }

    const score = getScore(personality);
    const existing = farmTotals.get(personality.ownerId);

    if (existing) {
      existing.score += score;
      existing.botCount += 1;
    } else {
      farmTotals.set(personality.ownerId, { score, botCount: 1 });
    }
  }

  const sorted = [...farmTotals.entries()].sort((a, b) => {
    if (b[1].score !== a[1].score) {
      return b[1].score - a[1].score;
    }

    return a[0].localeCompare(b[0]);
  });

  const page = sorted.slice(offset, offset + limit + 1);
  const hasMore = page.length > limit;
  const items = hasMore ? page.slice(0, limit) : page;

  const users = await Promise.all(
    items.map(([userId]) => findUserById(userId)),
  );

  return {
    entries: items.map(([userId, totals], index) => ({
      rank: offset + index + 1,
      userId,
      username: users[index]?.username ?? "Unknown",
      score: totals.score,
      botCount: totals.botCount,
    })),
    hasMore,
  };
}

export async function getTopFarmersByClout(
  offset = 0,
  limit = LEADERBOARD_LIMIT,
): Promise<LeaderboardPage<FarmerLeaderboardEntry>> {
  return getTopFarmersByMetric(
    (personality) => normalizeStoredStats(personality.stats).socialScore,
    offset,
    limit,
  );
}

export async function getTopFarmersByHeat(
  offset = 0,
  limit = LEADERBOARD_LIMIT,
): Promise<LeaderboardPage<FarmerLeaderboardEntry>> {
  return getTopFarmersByMetric(
    (personality) => normalizeStoredStats(personality.stats).controversy,
    offset,
    limit,
  );
}

async function getCompetitivePersonalities(): Promise<Personality[]> {
  const collection = await getPersonalitiesCollection();
  const personalities = await collection
    .find(
      mergeNotDeleted({
        $or: [
          { role: { $exists: false } },
          { role: { $ne: "rank_npc" as const } },
        ],
      }),
    )
    .toArray();

  return personalities.map(normalizePersonality);
}

export async function getMyPersonalityLeaderboardEntries(
  ownerId: string,
  tab: "clout-personality" | "heat-personality",
): Promise<PersonalityLeaderboardEntry[]> {
  const getScore =
    tab === "clout-personality"
      ? (personality: Personality) =>
          normalizeStoredStats(personality.stats).socialScore
      : (personality: Personality) =>
          normalizeStoredStats(personality.stats).controversy;

  const personalities = await getCompetitivePersonalities();
  const sorted = personalities
    .map((personality) => ({
      personality,
      score: getScore(personality),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.personality.id.localeCompare(b.personality.id);
    });

  const ownerUser = await findUserById(ownerId);
  const ownerUsername = ownerUser?.username ?? "Unknown";

  const myItems = sorted
    .map((entry, index) => ({ ...entry, rank: index + 1 }))
    .filter((entry) => entry.personality.ownerId === ownerId);

  if (myItems.length === 0) {
    return [];
  }

  const socialRanks = await resolveSocialRanksForPersonalities(
    myItems.map((entry) => entry.personality),
  );

  return myItems.map((entry) => {
    const rankInfo = socialRanks.get(entry.personality.id);

    return toPersonalityEntry(
      entry.personality,
      entry.score,
      entry.rank,
      ownerUsername,
      rankInfo?.rank ?? "novice",
      rankInfo?.label ?? "Novice",
    );
  });
}

async function buildFullFarmerLeaderboard(
  getScore: (personality: Personality) => number,
): Promise<FarmerLeaderboardEntry[]> {
  const collection = await getPersonalitiesCollection();
  const personalities = await collection.find().toArray();
  const farmTotals = new Map<string, { score: number; botCount: number }>();

  for (const raw of personalities) {
    const personality = normalizePersonality(raw);

    if (
      isRankNpc(personality) ||
      !personality.ownerId ||
      isPersonalityDeleted(personality)
    ) {
      continue;
    }

    const score = getScore(personality);
    const existing = farmTotals.get(personality.ownerId);

    if (existing) {
      existing.score += score;
      existing.botCount += 1;
    } else {
      farmTotals.set(personality.ownerId, { score, botCount: 1 });
    }
  }

  const sorted = [...farmTotals.entries()].sort((a, b) => {
    if (b[1].score !== a[1].score) {
      return b[1].score - a[1].score;
    }

    return a[0].localeCompare(b[0]);
  });

  const users = await Promise.all(
    sorted.map(([userId]) => findUserById(userId)),
  );

  return sorted.map(([userId, totals], index) => ({
    rank: index + 1,
    userId,
    username: users[index]?.username ?? "Unknown",
    score: totals.score,
    botCount: totals.botCount,
  }));
}

export async function getMyFarmerLeaderboardEntry(
  userId: string,
  tab: "clout-farmers" | "heat-farmers",
): Promise<FarmerLeaderboardEntry | null> {
  const getScore =
    tab === "clout-farmers"
      ? (personality: Personality) =>
          normalizeStoredStats(personality.stats).socialScore
      : (personality: Personality) =>
          normalizeStoredStats(personality.stats).controversy;

  const entries = await buildFullFarmerLeaderboard(getScore);
  return entries.find((entry) => entry.userId === userId) ?? null;
}
