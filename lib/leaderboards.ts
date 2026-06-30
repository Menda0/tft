import { findUserById, findUsersByIds } from "@/lib/db/users";
import { avatarColorForHandle } from "@/lib/feed/format";
import {
  competitiveMatchStage,
  farmerMatchStage,
  heatScoreAddFieldsStage,
  netCloutAddFieldsStages,
} from "@/lib/leaderboards/aggregation";
import {
  getPersonalitiesCollection,
  normalizePersonality,
} from "@/lib/personalities";
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

type RankedPersonalityRow = {
  id: string;
  ownerId?: string | null;
  name: string;
  handle: string;
  avatarUrl?: string | null;
  stats: Personality["stats"];
  score: number;
  rank: number;
};

async function hydratePersonalityLeaderboardPage(
  rows: RankedPersonalityRow[],
  offset: number,
  limit: number,
): Promise<LeaderboardPage<PersonalityLeaderboardEntry>> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  if (items.length === 0) {
    return { entries: [], hasMore };
  }

  const ownerIds = [
    ...new Set(
      items
        .map((entry) => entry.ownerId)
        .filter((ownerId): ownerId is string => Boolean(ownerId)),
    ),
  ];
  const usersById = await findUsersByIds(ownerIds);
  const personalities = items.map((row) =>
    normalizePersonality(row as unknown as Personality),
  );
  const socialRanks = await resolveSocialRanksForPersonalities(personalities);

  return {
    entries: personalities.map((personality, index) => {
      const row = items[index]!;
      const rankInfo = socialRanks.get(personality.id);

      return toPersonalityEntry(
        personality,
        row.score,
        offset + index + 1,
        row.ownerId
          ? (usersById.get(row.ownerId)?.username ?? "Unknown")
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
  const rows = await collection
    .aggregate<RankedPersonalityRow>([
      competitiveMatchStage(),
      ...netCloutAddFieldsStages(),
      { $sort: { _netClout: -1, id: 1 } },
      { $skip: offset },
      { $limit: limit + 1 },
      {
        $project: {
          _id: 0,
          id: 1,
          ownerId: 1,
          name: 1,
          handle: 1,
          avatarUrl: 1,
          stats: 1,
          score: "$_netClout",
        },
      },
    ])
    .toArray();

  return hydratePersonalityLeaderboardPage(rows, offset, limit);
}

export async function getTopPersonalitiesByHeat(
  offset = 0,
  limit = LEADERBOARD_LIMIT,
): Promise<LeaderboardPage<PersonalityLeaderboardEntry>> {
  const collection = await getPersonalitiesCollection();
  const rows = await collection
    .aggregate<RankedPersonalityRow>([
      competitiveMatchStage(),
      heatScoreAddFieldsStage(),
      { $sort: { _heatScore: -1, id: 1 } },
      { $skip: offset },
      { $limit: limit + 1 },
      {
        $project: {
          _id: 0,
          id: 1,
          ownerId: 1,
          name: 1,
          handle: 1,
          avatarUrl: 1,
          stats: 1,
          score: "$_heatScore",
        },
      },
    ])
    .toArray();

  return hydratePersonalityLeaderboardPage(rows, offset, limit);
}

type FarmerAggregateRow = {
  userId: string;
  score: number;
  botCount: number;
  rank: number;
};

async function queryFarmerLeaderboardPage(
  metric: "clout" | "heat",
  offset: number,
  limit: number,
): Promise<LeaderboardPage<FarmerLeaderboardEntry>> {
  const collection = await getPersonalitiesCollection();
  const scoreStages =
    metric === "clout"
      ? [...netCloutAddFieldsStages(), { $group: {
            _id: "$ownerId",
            score: { $sum: "$_netClout" },
            botCount: { $sum: 1 },
          } }]
      : [
          heatScoreAddFieldsStage(),
          {
            $group: {
              _id: "$ownerId",
              score: { $sum: "$_heatScore" },
              botCount: { $sum: 1 },
            },
          },
        ];

  const rows = await collection
    .aggregate<FarmerAggregateRow>([
      farmerMatchStage(),
      ...scoreStages,
      { $sort: { score: -1, _id: 1 } },
      { $skip: offset },
      { $limit: limit + 1 },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          score: 1,
          botCount: 1,
        },
      },
    ])
    .toArray();

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  if (items.length === 0) {
    return { entries: [], hasMore };
  }

  const usersById = await findUsersByIds(items.map((entry) => entry.userId));

  return {
    entries: items.map((entry, index) => ({
      rank: offset + index + 1,
      userId: entry.userId,
      username: usersById.get(entry.userId)?.username ?? "Unknown",
      score: entry.score,
      botCount: entry.botCount,
    })),
    hasMore,
  };
}

export async function getTopFarmersByClout(
  offset = 0,
  limit = LEADERBOARD_LIMIT,
): Promise<LeaderboardPage<FarmerLeaderboardEntry>> {
  return queryFarmerLeaderboardPage("clout", offset, limit);
}

export async function getTopFarmersByHeat(
  offset = 0,
  limit = LEADERBOARD_LIMIT,
): Promise<LeaderboardPage<FarmerLeaderboardEntry>> {
  return queryFarmerLeaderboardPage("heat", offset, limit);
}

export async function getMyPersonalityLeaderboardEntries(
  ownerId: string,
  tab: "clout-personality" | "heat-personality",
): Promise<PersonalityLeaderboardEntry[]> {
  const collection = await getPersonalitiesCollection();
  const scoreStages =
    tab === "clout-personality"
      ? [
          ...netCloutAddFieldsStages(),
          { $sort: { _netClout: -1, id: 1 } },
          {
            $setWindowFields: {
              sortBy: { _netClout: -1, id: 1 },
              output: { rank: { $rank: {} } },
            },
          },
          {
            $project: {
              _id: 0,
              id: 1,
              ownerId: 1,
              name: 1,
              handle: 1,
              avatarUrl: 1,
              stats: 1,
              score: "$_netClout",
              rank: 1,
            },
          },
        ]
      : [
          heatScoreAddFieldsStage(),
          { $sort: { _heatScore: -1, id: 1 } },
          {
            $setWindowFields: {
              sortBy: { _heatScore: -1, id: 1 },
              output: { rank: { $rank: {} } },
            },
          },
          {
            $project: {
              _id: 0,
              id: 1,
              ownerId: 1,
              name: 1,
              handle: 1,
              avatarUrl: 1,
              stats: 1,
              score: "$_heatScore",
              rank: 1,
            },
          },
        ];

  const rows = await collection
    .aggregate<RankedPersonalityRow>([
      competitiveMatchStage(),
      ...scoreStages,
      { $match: { ownerId } },
    ])
    .toArray();

  if (rows.length === 0) {
    return [];
  }

  const ownerUser = await findUserById(ownerId);
  const ownerUsername = ownerUser?.username ?? "Unknown";
  const personalities = rows.map((row) =>
    normalizePersonality(row as unknown as Personality),
  );
  const socialRanks = await resolveSocialRanksForPersonalities(personalities);

  return personalities.map((personality, index) => {
    const row = rows[index]!;
    const rankInfo = socialRanks.get(personality.id);

    return toPersonalityEntry(
      personality,
      row.score,
      row.rank,
      ownerUsername,
      rankInfo?.rank ?? "novice",
      rankInfo?.label ?? "Novice",
    );
  });
}

async function queryMyFarmerLeaderboardEntry(
  userId: string,
  metric: "clout" | "heat",
): Promise<FarmerLeaderboardEntry | null> {
  const collection = await getPersonalitiesCollection();
  const scoreStages =
    metric === "clout"
      ? [
          ...netCloutAddFieldsStages(),
          {
            $group: {
              _id: "$ownerId",
              score: { $sum: "$_netClout" },
              botCount: { $sum: 1 },
            },
          },
        ]
      : [
          heatScoreAddFieldsStage(),
          {
            $group: {
              _id: "$ownerId",
              score: { $sum: "$_heatScore" },
              botCount: { $sum: 1 },
            },
          },
        ];

  const rows = await collection
    .aggregate<FarmerAggregateRow>([
      farmerMatchStage(),
      ...scoreStages,
      { $sort: { score: -1, _id: 1 } },
      {
        $setWindowFields: {
          sortBy: { score: -1, _id: 1 },
          output: { rank: { $rank: {} } },
        },
      },
      { $match: { _id: userId } },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          score: 1,
          botCount: 1,
          rank: 1,
        },
      },
    ])
    .toArray();

  const entry = rows[0];

  if (!entry) {
    return null;
  }

  const user = await findUserById(userId);

  return {
    rank: entry.rank,
    userId: entry.userId,
    username: user?.username ?? "Unknown",
    score: entry.score,
    botCount: entry.botCount,
  };
}

export async function getMyFarmerLeaderboardEntry(
  userId: string,
  tab: "clout-farmers" | "heat-farmers",
): Promise<FarmerLeaderboardEntry | null> {
  return queryMyFarmerLeaderboardEntry(
    userId,
    tab === "clout-farmers" ? "clout" : "heat",
  );
}
