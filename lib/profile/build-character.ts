import { getPersonalitiesByIds, normalizePersonality } from "@/lib/personalities";
import { normalizeStoredStats, normalizeStoredStatsRaw } from "@/lib/personalities/stats";
import { resolvePersonalitySocialRank } from "@/lib/profile/social-rank";
import { getCloutBreakdown } from "@/lib/scoring/social-score";
import { filterEvolutionMemories } from "@/lib/simulation/memory";
import type { MemoryItem, Personality } from "@/lib/types/personality";
import type {
  ProfileCharacterSheet,
  ProfileRelationship,
} from "@/lib/types/profile";

function sortMemoriesByImportance<T extends { importance: number }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => b.importance - a.importance);
}

function getMemoriesRecentFirst(personality: Personality): MemoryItem[] {
  return [...(normalizePersonality(personality).memory ?? [])].reverse();
}

function relationshipInteractionScore(
  relationship: ProfileRelationship,
): number {
  return (
    relationship.trust +
    relationship.rivalry +
    relationship.admiration +
    relationship.familiarity
  );
}

function buildAllRelationships(
  personality: Personality,
  relatedPersonalities: Personality[],
): ProfileRelationship[] {
  const normalized = normalizePersonality(personality);
  const relatedById = new Map(
    relatedPersonalities.map((entry) => [entry.id, normalizePersonality(entry)]),
  );

  return Object.entries(normalized.relationships ?? {})
    .map(([personalityId, relationship]) => {
      const related = relatedById.get(personalityId);

      if (!related) {
        return null;
      }

      return {
        personalityId,
        name: related.name,
        handle: related.handle,
        avatarUrl: related.avatarUrl,
        trust: relationship.trust,
        rivalry: relationship.rivalry,
        admiration: relationship.admiration,
        familiarity: relationship.familiarity,
      };
    })
    .filter((entry): entry is ProfileRelationship => entry !== null)
    .sort(
      (a, b) => relationshipInteractionScore(b) - relationshipInteractionScore(a),
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
  personality: Personality,
  limit: number,
  offset: number,
): Promise<{ items: ProfileRelationship[]; hasMore: boolean }> {
  const normalized = normalizePersonality(personality);
  const relatedIds = Object.keys(normalized.relationships ?? {});
  const relatedPersonalities = await getPersonalitiesByIds(relatedIds);
  const relationships = buildAllRelationships(normalized, relatedPersonalities);

  return paginateItems(relationships, limit, offset);
}

export async function loadProfileCharacterSheet(
  personality: Personality,
): Promise<ProfileCharacterSheet> {
  return buildProfileCharacterSheet(personality);
}
