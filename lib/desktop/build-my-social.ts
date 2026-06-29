import { mergeNotDeleted } from "@/lib/db/active-filters";
import {
  ensurePersonalityActivityIndexes,
  getActivityPageForPersonalities,
} from "@/lib/db/personality-activity";
import { aggregatePersonalityEngagementStats } from "@/lib/db/personality-stats";
import { avatarColorForHandle } from "@/lib/feed/format";
import {
  getPersonalitiesByIds,
  getPersonalitiesCollection,
  normalizePersonality,
} from "@/lib/personalities";
import { normalizeStoredStats } from "@/lib/personalities/stats";
import {
  resolveSocialRanksForPersonalities,
  type PersonalityListItem,
  type PersonalitySocialRank,
} from "@/lib/profile/social-rank";
import type {
  MySocialActivityItem,
  MySocialActivityPayload,
  MySocialLeaderboardEntry,
  MySocialPayload,
  MySocialPersonalityEntry,
} from "@/lib/types/desktop";
import type { PersonalityActivity } from "@/lib/types/personality-activity";
import type { Personality } from "@/lib/types/personality";

function toParticipant(personality: Personality) {
  return {
    id: personality.id,
    name: personality.name,
    handle: personality.handle,
    avatarUrl: personality.avatarUrl ?? null,
    avatarColor: avatarColorForHandle(personality.handle),
  };
}

function buildLeaderboard(
  personalities: PersonalityListItem[],
  rankById: Map<string, PersonalitySocialRank>,
): MySocialLeaderboardEntry[] {
  return [...personalities]
    .map((personality) => {
      const stats = normalizeStoredStats(personality.stats);
      const rankInfo = rankById.get(personality.id);

      return {
        sortRank: rankInfo?.globalRank ?? Number.MAX_SAFE_INTEGER,
        entry: {
          rank: rankInfo?.globalRank ?? 0,
          id: personality.id,
          name: personality.name,
          handle: personality.handle,
          avatarUrl: personality.avatarUrl ?? null,
          avatarColor: avatarColorForHandle(personality.handle),
          clout: stats.socialScore,
          socialRank: personality.socialRank ?? "novice",
          socialRankLabel: personality.socialRankLabel ?? "Novice",
        } satisfies MySocialLeaderboardEntry,
      };
    })
    .sort((a, b) => {
      if (a.sortRank !== b.sortRank) {
        return a.sortRank - b.sortRank;
      }

      return a.entry.handle.localeCompare(b.entry.handle);
    })
    .map(({ entry }) => entry);
}

function buildPersonalityEntries(
  personalities: PersonalityListItem[],
  statsById: Awaited<ReturnType<typeof aggregatePersonalityEngagementStats>>,
): MySocialPersonalityEntry[] {
  return personalities.map((personality) => {
    const stats = normalizeStoredStats(personality.stats);
    const engagement = statsById.get(personality.id) ?? {
      posts: 0,
      replies: 0,
      reposts: 0,
      likes: 0,
      views: 0,
    };

    return {
      id: personality.id,
      name: personality.name,
      handle: personality.handle,
      avatarUrl: personality.avatarUrl ?? null,
      avatarColor: avatarColorForHandle(personality.handle),
      posts: engagement.posts,
      reposts: engagement.reposts,
      replies: engagement.replies,
      likes: engagement.likes,
      views: engagement.views,
      clout: stats.socialScore,
      heat: stats.controversy,
      socialRank: personality.socialRank ?? "novice",
      socialRankLabel: personality.socialRankLabel ?? "Novice",
    };
  });
}

function buildActivityItems(
  activities: PersonalityActivity[],
  personalityById: Map<string, Personality>,
): MySocialActivityItem[] {
  return activities.map((activity) => {
    const personality = personalityById.get(activity.personalityId);
    const actor = activity.actorPersonalityId
      ? personalityById.get(activity.actorPersonalityId)
      : null;
    const target = activity.targetPersonalityId
      ? personalityById.get(activity.targetPersonalityId)
      : null;

    return {
      id: activity.id,
      personalityId: activity.personalityId,
      personalityName: personality?.name ?? "Unknown",
      personalityHandle: personality?.handle ?? "unknown",
      type: activity.type,
      at: activity.at.toISOString(),
      actor: actor ? toParticipant(actor) : null,
      target: target ? toParticipant(target) : null,
      preview: activity.preview ?? null,
    };
  });
}

async function getOwnerPersonalityIds(ownerId: string): Promise<string[]> {
  const collection = await getPersonalitiesCollection();
  const rawPersonalities = await collection
    .find(mergeNotDeleted({ ownerId }))
    .sort({ createdAt: -1 })
    .toArray();

  return rawPersonalities.map((personality) => normalizePersonality(personality).id);
}

export async function buildMySocial(ownerId: string): Promise<MySocialPayload> {
  await ensurePersonalityActivityIndexes();

  const collection = await getPersonalitiesCollection();
  const rawPersonalities = await collection
    .find(mergeNotDeleted({ ownerId }))
    .sort({ createdAt: -1 })
    .toArray();

  const normalized = rawPersonalities.map(normalizePersonality);
  const rankById = await resolveSocialRanksForPersonalities(normalized);
  const personalities: PersonalityListItem[] = normalized.map((personality) => {
    const rankInfo = rankById.get(personality.id);

    return {
      ...personality,
      socialRank: rankInfo?.rank ?? "novice",
      socialRankLabel: rankInfo?.label ?? "Novice",
    };
  });
  const personalityIds = personalities.map((personality) => personality.id);

  const statsById = await aggregatePersonalityEngagementStats(personalityIds);

  const leaderboard = buildLeaderboard(personalities, rankById);
  const personalityEntries = buildPersonalityEntries(personalities, statsById);

  personalityEntries.sort((a, b) => {
    const rankA = rankById.get(a.id)?.globalRank ?? Number.MAX_SAFE_INTEGER;
    const rankB = rankById.get(b.id)?.globalRank ?? Number.MAX_SAFE_INTEGER;
    return rankA - rankB;
  });

  return {
    leaderboard,
    personalities: personalityEntries,
    updatedAt: new Date().toISOString(),
  };
}

export async function buildMySocialActivity(
  ownerId: string,
  offset: number,
  limit: number,
): Promise<MySocialActivityPayload> {
  await ensurePersonalityActivityIndexes();

  const personalityIds = await getOwnerPersonalityIds(ownerId);

  if (personalityIds.length === 0) {
    return {
      items: [],
      hasMore: false,
      updatedAt: new Date().toISOString(),
    };
  }

  const activities = await getActivityPageForPersonalities(
    personalityIds,
    limit + 1,
    offset,
  );
  const hasMore = activities.length > limit;
  const pageActivities = hasMore ? activities.slice(0, limit) : activities;

  const relatedIds = new Set<string>(personalityIds);

  for (const activity of pageActivities) {
    if (activity.actorPersonalityId) {
      relatedIds.add(activity.actorPersonalityId);
    }

    if (activity.targetPersonalityId) {
      relatedIds.add(activity.targetPersonalityId);
    }
  }

  const relatedPersonalities = await getPersonalitiesByIds([...relatedIds]);
  const personalityById = new Map(
    relatedPersonalities.map((personality) => [
      personality.id,
      normalizePersonality(personality),
    ]),
  );

  return {
    items: buildActivityItems(pageActivities, personalityById),
    hasMore,
    updatedAt: new Date().toISOString(),
  };
}
