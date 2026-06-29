import { findUserById } from "@/lib/db/users";
import { avatarColorForHandle } from "@/lib/feed/format";
import {
  getPersonalitiesCollection,
  normalizePersonality,
} from "@/lib/personalities";
import { isRankNpc } from "@/lib/personalities/rank-npc";
import { normalizeStoredStats } from "@/lib/personalities/stats";
import { resolveSocialRanksForPersonalities } from "@/lib/profile/social-rank";
import type { SocialRank } from "@/lib/scoring/ranks";
import type { Personality } from "@/lib/types/personality";
import type {
  FarmerLeaderboardEntry,
  PersonalityLeaderboardEntry,
} from "@/lib/types/desktop";

export const LEADERBOARD_LIMIT = 5;

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

async function sortPersonalitiesByScore(
  personalities: Personality[],
  getScore: (personality: Personality) => number,
  limit: number,
): Promise<PersonalityLeaderboardEntry[]> {
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
    })
    .slice(0, limit);

  const ownerIds = [
    ...new Set(
      sorted
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
    sorted.map((entry) => entry.personality),
  );

  return sorted.map((entry, index) => {
    const rankInfo = socialRanks.get(entry.personality.id);

    return toPersonalityEntry(
      entry.personality,
      entry.score,
      index + 1,
      entry.personality.ownerId
        ? (usernameByOwnerId.get(entry.personality.ownerId) ?? "Unknown")
        : "Unknown",
      rankInfo?.rank ?? "novice",
      rankInfo?.label ?? "Novice",
    );
  });
}

export async function getTopPersonalitiesByClout(
  limit = LEADERBOARD_LIMIT,
): Promise<PersonalityLeaderboardEntry[]> {
  const collection = await getPersonalitiesCollection();
  const personalities = await collection
    .find({
      $or: [
        { role: { $exists: false } },
        { role: { $ne: "rank_npc" as const } },
      ],
    })
    .toArray();

  return sortPersonalitiesByScore(
    personalities,
    (personality) => normalizeStoredStats(personality.stats).socialScore,
    limit,
  );
}

export async function getTopPersonalitiesByHeat(
  limit = LEADERBOARD_LIMIT,
): Promise<PersonalityLeaderboardEntry[]> {
  const collection = await getPersonalitiesCollection();
  const personalities = await collection
    .find({
      $or: [
        { role: { $exists: false } },
        { role: { $ne: "rank_npc" as const } },
      ],
    })
    .toArray();

  return sortPersonalitiesByScore(
    personalities,
    (personality) => normalizeStoredStats(personality.stats).controversy,
    limit,
  );
}

async function getTopFarmersByMetric(
  getScore: (personality: Personality) => number,
  limit: number,
): Promise<FarmerLeaderboardEntry[]> {
  const collection = await getPersonalitiesCollection();
  const personalities = await collection.find().toArray();

  const farmTotals = new Map<string, { score: number; botCount: number }>();

  for (const raw of personalities) {
    const personality = normalizePersonality(raw);

    if (isRankNpc(personality) || !personality.ownerId) {
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

  const sorted = [...farmTotals.entries()]
    .sort((a, b) => {
      if (b[1].score !== a[1].score) {
        return b[1].score - a[1].score;
      }

      return a[0].localeCompare(b[0]);
    })
    .slice(0, limit);

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

export async function getTopFarmersByClout(
  limit = LEADERBOARD_LIMIT,
): Promise<FarmerLeaderboardEntry[]> {
  return getTopFarmersByMetric(
    (personality) => normalizeStoredStats(personality.stats).socialScore,
    limit,
  );
}

export async function getTopFarmersByHeat(
  limit = LEADERBOARD_LIMIT,
): Promise<FarmerLeaderboardEntry[]> {
  return getTopFarmersByMetric(
    (personality) => normalizeStoredStats(personality.stats).controversy,
    limit,
  );
}
