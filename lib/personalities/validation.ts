import { randomUUID } from "crypto";

import { isPageKind, type PageKind } from "@/lib/avatars/page-kind";
import type {
  Archetype,
  Gender,
  Personality,
  Pronouns,
  Traits,
} from "@/lib/types/personality";
import { isArchetype } from "@/lib/personalities/archetypes";
import {
  defaultPronounsForGender,
  isGender,
} from "@/lib/personalities/gender";
import { isPronouns } from "@/lib/personalities/pronouns";

const TRAIT_KEYS: (keyof Traits)[] = [
  "humor",
  "aggression",
  "charisma",
  "curiosity",
  "chaos",
  "empathy",
];

export { isArchetype };

export function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase().replace(/^@+/, "");
}

export function slugifyHandle(name: string): string {
  return normalizeHandle(
    name
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, ""),
  ).slice(0, 24);
}

export function validateHandle(handle: string): string | null {
  const normalized = normalizeHandle(handle);

  if (!normalized) {
    return "Enter a handle.";
  }

  if (normalized.length < 3) {
    return "Handle must be at least 3 characters.";
  }

  if (normalized.length > 24) {
    return "Handle must be 24 characters or less.";
  }

  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return "Handle can only use letters, numbers, and underscores.";
  }

  return null;
}

export function parseInterests(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function normalizeTraits(input: Partial<Traits>): Traits | null {
  const traits = {} as Traits;

  for (const key of TRAIT_KEYS) {
    const value = input[key];

    if (typeof value !== "number" || Number.isNaN(value)) {
      return null;
    }

    traits[key] = Math.min(10, Math.max(0, Math.round(value)));
  }

  return traits;
}

export function createPersonalityId(): string {
  return randomUUID();
}

export function defaultStats(): Personality["stats"] {
  return {
    followers: 0,
    reputation: 50,
    controversy: 0,
    creativity: 50,
  };
}

export type CreatePersonalityInput = {
  name: string;
  handle: string;
  kind: PageKind;
  gender: Gender;
  pronouns: Pronouns;
  archetype: Archetype;
  traits: Traits;
  interests: string[];
  beliefs?: Record<string, number>;
};

export function validateCreatePersonalityInput(
  body: unknown,
): { ok: true; value: CreatePersonalityInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const data = body as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : "";

  if (name.length < 2) {
    return { ok: false, error: "Name must be at least 2 characters." };
  }

  if (name.length > 40) {
    return { ok: false, error: "Name must be 40 characters or less." };
  }

  const handle =
    typeof data.handle === "string" ? normalizeHandle(data.handle) : "";
  const handleError = validateHandle(handle);

  if (handleError) {
    return { ok: false, error: handleError };
  }

  if (typeof data.gender !== "string" || !isGender(data.gender)) {
    return { ok: false, error: "Choose a valid gender." };
  }

  const pronouns =
    typeof data.pronouns === "string"
      ? isPronouns(data.pronouns)
        ? data.pronouns
        : null
      : defaultPronounsForGender(data.gender);

  if (!pronouns) {
    return { ok: false, error: "Choose valid pronouns." };
  }

  if (typeof data.archetype !== "string" || !isArchetype(data.archetype)) {
    return { ok: false, error: "Choose a valid archetype." };
  }

  if (typeof data.kind !== "string" || !isPageKind(data.kind)) {
    return { ok: false, error: "Choose a valid profile kind." };
  }

  const traits = normalizeTraits(data.traits as Partial<Traits>);

  if (!traits) {
    return { ok: false, error: "Traits must be numbers from 0 to 10." };
  }

  const interests =
    typeof data.interests === "string"
      ? parseInterests(data.interests)
      : Array.isArray(data.interests)
        ? data.interests
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 8)
        : [];

  return {
    ok: true,
    value: {
      name,
      handle,
      kind: data.kind,
      gender: data.gender,
      pronouns,
      archetype: data.archetype,
      traits,
      interests,
      beliefs: {},
    },
  };
}
