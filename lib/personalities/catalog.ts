import {
  createPersonalityId,
  defaultStats,
  type CreatePersonalityInput,
} from "@/lib/personalities/validation";
import type { Personality } from "@/lib/types/personality";

export const CATALOG_OWNER_ID = "__catalog__";

export function isCatalogPersonality(personality: Personality): boolean {
  return personality.role === "catalog";
}

export function createCatalogPersonalityDocument(
  input: CreatePersonalityInput,
): Personality {
  return {
    id: createPersonalityId(),
    name: input.name,
    handle: input.handle,
    kind: input.kind,
    gender: input.gender,
    pronouns: input.pronouns,
    avatarUrl: null,
    avatarStatus: "pending",
    description: null,
    descriptionStatus: "pending",
    ownerId: CATALOG_OWNER_ID,
    createdAt: new Date(),
    archetype: input.archetype,
    traits: input.traits,
    politicalSwing: input.politicalSwing,
    interests: input.interests,
    beliefs: input.beliefs ?? {},
    stats: defaultStats(),
    memory: [],
    relationships: {},
    role: "catalog",
  };
}
