import { getPersonalityDisplayByIds, normalizePersonality } from "@/lib/personalities";
import { normalizeStoredStats, normalizeStoredStatsRaw } from "@/lib/personalities/stats";
import { getFollowerIds, getFollowingIds } from "@/lib/db/follows";
import {
  classifyRelationship,
  compareRelationshipsByCategory,
  buildRelationshipCategoryCounts,
  getRelationshipCategoryLabel,
} from "@/lib/profile/relationship-category";
import { resolvePersonalitySocialRank } from "@/lib/profile/social-rank";
import { getCloutBreakdown } from "@/lib/scoring/social-score";
import { filterEvolutionMemories } from "@/lib/simulation/memory";
import type { MemoryItem, Personality, Relationship } from "@/lib/types/personality";
import type {
  ProfileCharacterSheet,
  ProfileRelationship,
  ProfileRelationshipCategoryCount,
} from "@/lib/types/profile";

function sortMemoriesByImportance<T extends { importance: number }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => b.importance - a.importance);
}

function getMemoriesRecentFirst(personality: Personality): MemoryItem[] {
  return [...(normalizePersonality(personality).memory ?? [])].reverse();
}

type RelationshipEntry = {
  personalityId: string;
  trust: number;
  rivalry: number;
  admiration: number;
  familiarity: number;
  category: ProfileRelationship["category"];
  categoryLabel: string;
};

function buildRelationshipEntries(
  relationships: Record<string, Relationship>,
  mutualFollowIds: Set<string>,
): RelationshipEntry[] {
  return Object.entries(relationships).map(([personalityId, relationship]) => {
    const category = classifyRelationship(
      relationship,
      mutualFollowIds.has(personalityId),
    );

    return {
      personalityId,
      trust: relationship.trust,
      rivalry: relationship.rivalry,
      admiration: relationship.admiration,
      familiarity: relationship.familiarity,
      category,
      categoryLabel: getRelationshipCategoryLabel(category),
    };
  });
}

function sortRelationshipEntries(entries: RelationshipEntry[]): RelationshipEntry[] {
  return [...entries].sort((a, b) =>
    compareRelationshipsByCategory(
      a.category,
      b.category,
      a.personalityId,
      b.personalityId,
    ),
  );
}

function paginateItems<T>(
  items: T[],
  limit: number,
  offset: number,
): { items: T[]; hasMore: boolean } {
  const slice = items.slice(offset, offset + limit + 1);
  const hasMore = slice.length > limit;

  return {
    items: hasMore ? slice.slice(0, limit) : slice,
    hasMore,
  };
}

export async function buildProfileCharacterSheet(
  personality: Personality,
): Promise<ProfileCharacterSheet> {
  const normalized = normalizePersonality(personality);
  const memories = normalized.memory ?? [];
  const rawStats = normalizeStoredStatsRaw(normalized.stats);
  const displayStats = normalizeStoredStats(normalized.stats);
  const { rank, label } = await resolvePersonalitySocialRank(normalized);

  return {
    traits: normalized.traits,
    stats: displayStats,
    cloutBreakdown: getCloutBreakdown(rawStats.socialScore, rawStats.controversy),
    interests: normalized.interests,
    evolutions: sortMemoriesByImportance(filterEvolutionMemories(memories)),
    socialRank: rank,
    socialRankLabel: label,
  };
}

export function buildProfileMemoriesPage(
  personality: Personality,
  limit: number,
  offset: number,
): { items: MemoryItem[]; hasMore: boolean } {
  return paginateItems(getMemoriesRecentFirst(personality), limit, offset);
}

export async function buildProfileRelationshipsPage(
  personalityId: string,
  relationships: Record<string, Relationship>,
  limit: number,
  offset: number,
): Promise<{
  items: ProfileRelationship[];
  hasMore: boolean;
  categoryCounts: ProfileRelationshipCategoryCount[];
}> {
  const [followingIds, followerIds] = await Promise.all([
    getFollowingIds(personalityId),
    getFollowerIds(personalityId),
  ]);
  const mutualFollowIds = new Set(
    [...followingIds].filter((targetId) => followerIds.has(targetId)),
  );
  const categoryCounts = buildRelationshipCategoryCounts(
    relationships,
    mutualFollowIds,
  );
  const sorted = sortRelationshipEntries(
    buildRelationshipEntries(relationships, mutualFollowIds),
  );
  const page = paginateItems(sorted, limit, offset);

  if (page.items.length === 0) {
    return { items: [], hasMore: page.hasMore, categoryCounts };
  }

  const displays = await getPersonalityDisplayByIds(
    page.items.map((entry) => entry.personalityId),
  );
  const displayById = new Map(displays.map((entry) => [entry.id, entry]));

  const items = page.items
    .map((entry) => {
      const display = displayById.get(entry.personalityId);

      if (!display) {
        return null;
      }

      return {
        personalityId: entry.personalityId,
        name: display.name,
        handle: display.handle,
        avatarUrl: display.avatarUrl,
        trust: entry.trust,
        rivalry: entry.rivalry,
        admiration: entry.admiration,
        familiarity: entry.familiarity,
        category: entry.category,
        categoryLabel: entry.categoryLabel,
      };
    })
    .filter((entry): entry is ProfileRelationship => entry !== null);

  return { items, hasMore: page.hasMore, categoryCounts };
}

export async function loadProfileCharacterSheet(
  personality: Personality,
): Promise<ProfileCharacterSheet> {
  return buildProfileCharacterSheet(personality);
}
