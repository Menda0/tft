import { updatePersonality } from "@/lib/personalities";
import { isRankNpc } from "@/lib/personalities/rank-npc";
import type {
  MemoryItem,
  Personality,
  Relationship,
  Stats,
  Traits,
} from "@/lib/types/personality";

import { mergeMemories } from "./memory";
import type { SimulationWorld } from "./world";

function clampTrait(value: number): number {
  return Math.min(10, Math.max(0, Math.round(value)));
}

function clampRelationshipField(value: number): number {
  return Math.min(10, Math.max(0, value));
}

function clampStats(stats: Stats): Stats {
  return {
    followers: Math.max(0, Math.round(stats.followers)),
    socialScore: Math.max(0, Math.round(stats.socialScore)),
    controversy: Math.max(0, Math.round(stats.controversy)),
    creativity: Math.min(100, Math.max(0, Math.round(stats.creativity))),
  };
}

export function clampTraits(traits: Traits): Traits {
  return {
    humor: clampTrait(traits.humor),
    aggression: clampTrait(traits.aggression),
    troll: clampTrait(traits.troll),
    woke: clampTrait(traits.woke),
    negacionist: clampTrait(traits.negacionist),
    radical: clampTrait(traits.radical),
  };
}

export function defaultRelationship(): Relationship {
  return {
    trust: 5,
    rivalry: 0,
    admiration: 0,
    familiarity: 0,
  };
}

export function applyRelationshipDelta(
  relationships: Record<string, Relationship>,
  targetId: string,
  delta: Partial<Relationship>,
): Record<string, Relationship> {
  const current = relationships[targetId] ?? defaultRelationship();

  return {
    ...relationships,
    [targetId]: {
      trust: clampRelationshipField(current.trust + (delta.trust ?? 0)),
      rivalry: clampRelationshipField(current.rivalry + (delta.rivalry ?? 0)),
      admiration: clampRelationshipField(
        current.admiration + (delta.admiration ?? 0),
      ),
      familiarity: clampRelationshipField(
        current.familiarity + (delta.familiarity ?? 0),
      ),
    },
  };
}

export function applyStatsDelta(stats: Stats, delta: Partial<Stats>): Stats {
  return clampStats({
    followers: stats.followers + (delta.followers ?? 0),
    socialScore: stats.socialScore + (delta.socialScore ?? 0),
    controversy: stats.controversy + (delta.controversy ?? 0),
    creativity: stats.creativity + (delta.creativity ?? 0),
  });
}

export type PersonalityPatch = Partial<
  Pick<Personality, "traits" | "stats" | "memory" | "relationships">
>;

function normalizePatch(
  personality: Personality,
  patch: PersonalityPatch,
): PersonalityPatch {
  const normalized: PersonalityPatch = {};

  if (patch.traits) {
    normalized.traits = clampTraits({ ...personality.traits, ...patch.traits });
  }

  if (patch.stats) {
    normalized.stats = clampStats({ ...personality.stats, ...patch.stats });
  }

  if (patch.memory) {
    normalized.memory = mergeMemories(personality.memory ?? [], patch.memory);
  }

  if (patch.relationships) {
    normalized.relationships = patch.relationships;
  }

  return normalized;
}

function syncWorldPersonality(
  world: SimulationWorld,
  personalityId: string,
  updated: Personality,
): void {
  const index = world.personalities.findIndex(
    (personality) => personality.id === personalityId,
  );

  if (index >= 0) {
    world.personalities[index] = updated;
  }
}

export async function applyPersonalityUpdate(
  world: SimulationWorld,
  personalityId: string,
  patch: PersonalityPatch,
): Promise<Personality | null> {
  const personality = world.personalities.find(
    (entry) => entry.id === personalityId,
  );

  if (!personality) {
    return null;
  }

  if (isRankNpc(personality)) {
    return personality;
  }

  const normalized = normalizePatch(personality, patch);

  if (Object.keys(normalized).length === 0) {
    return personality;
  }

  const updated = await updatePersonality(personalityId, normalized);

  if (!updated) {
    return null;
  }

  syncWorldPersonality(world, personalityId, updated);
  return updated;
}

export async function appendMemories(
  world: SimulationWorld,
  personalityId: string,
  memories: MemoryItem[],
): Promise<Personality | null> {
  if (memories.length === 0) {
    return world.personalities.find((entry) => entry.id === personalityId) ?? null;
  }

  const personality = world.personalities.find(
    (entry) => entry.id === personalityId,
  );

  if (!personality) {
    return null;
  }

  return applyPersonalityUpdate(world, personalityId, {
    memory: memories,
  });
}
