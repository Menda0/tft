import { getPersonalitiesByIds, normalizePersonality } from "@/lib/personalities";
import { filterEvolutionMemories } from "@/lib/simulation/memory";
import type { Personality } from "@/lib/types/personality";
import type {
  ProfileCharacterSheet,
  ProfileRelationship,
} from "@/lib/types/profile";

function sortMemories<T extends { importance: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.importance - a.importance);
}

export function buildProfileCharacterSheet(
  personality: Personality,
  relatedPersonalities: Personality[],
): ProfileCharacterSheet {
  const normalized = normalizePersonality(personality);
  const relatedById = new Map(
    relatedPersonalities.map((entry) => [entry.id, normalizePersonality(entry)]),
  );

  const relationships: ProfileRelationship[] = Object.entries(
    normalized.relationships ?? {},
  )
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
    .sort((a, b) => b.familiarity - a.familiarity);

  const memories = sortMemories(normalized.memory ?? []);

  return {
    traits: normalized.traits,
    stats: normalized.stats,
    interests: normalized.interests,
    memories,
    relationships,
    evolutions: sortMemories(filterEvolutionMemories(memories)),
  };
}

export async function loadProfileCharacterSheet(
  personality: Personality,
): Promise<ProfileCharacterSheet> {
  const normalized = normalizePersonality(personality);
  const relatedIds = Object.keys(normalized.relationships ?? {});
  const relatedPersonalities = await getPersonalitiesByIds(relatedIds);

  return buildProfileCharacterSheet(normalized, relatedPersonalities);
}
