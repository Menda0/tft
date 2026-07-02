import { randomUUID } from "crypto";

import { isPageKind, profileKindUsesIdentity, type PageKind } from "@/lib/avatars/page-kind";
import {
  isArchetypeAllowedForPageKind,
  pageKindUsesArchetype,
} from "@/lib/personalities/kind-archetypes";
import type {
  Archetype,
  Gender,
  Personality,
  Pronouns,
  Traits,
} from "@/lib/types/personality";
import type { PoliticalSwing } from "@/lib/personalities/political-swing";
import { isArchetype, normalizeArchetype } from "@/lib/personalities/archetypes";
import {
  defaultPronounsForGender,
  isGender,
} from "@/lib/personalities/gender";
import {
  normalizePoliticalSwing,
} from "@/lib/personalities/political-swing";
import { isPronouns } from "@/lib/personalities/pronouns";

const TRAIT_KEYS: (keyof Traits)[] = [
  "humor",
  "aggression",
  "troll",
  "woke",
  "negacionist",
  "radical",
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

export function normalizeTraits(input: Partial<Traits> | Record<string, unknown>): Traits | null {
  const data =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  const traits = {} as Traits;

  const readTrait = (key: keyof Traits, legacyKeys: string[] = []): number | null => {
    const direct = data[key];

    if (typeof direct === "number" && !Number.isNaN(direct)) {
      return Math.min(10, Math.max(0, Math.round(direct)));
    }

    for (const legacyKey of legacyKeys) {
      const legacy = data[legacyKey];

      if (typeof legacy === "number" && !Number.isNaN(legacy)) {
        return Math.min(10, Math.max(0, Math.round(legacy)));
      }
    }

    return null;
  };

  const defaults: Record<keyof Traits, string[]> = {
    humor: [],
    aggression: [],
    troll: ["chaos"],
    woke: ["empathy"],
    negacionist: ["curiosity"],
    radical: ["charisma"],
  };

  for (const key of TRAIT_KEYS) {
    const value = readTrait(key, defaults[key]);

    if (value === null) {
      return null;
    }

    traits[key] = value;
  }

  return traits;
}

const MAX_BELIEF_ENTRIES = 12;

export function normalizeBeliefs(
  beliefs: Record<string, number> | undefined | null,
): Record<string, number> {
  if (!beliefs || typeof beliefs !== "object") {
    return {};
  }

  const normalized: Record<string, number> = {};

  for (const [rawKey, rawStrength] of Object.entries(beliefs)) {
    const key = rawKey.trim().toLowerCase();

    if (!key || key in normalized) {
      continue;
    }

    const strength = Number(rawStrength);

    if (!Number.isFinite(strength)) {
      continue;
    }

    normalized[key] = Math.min(10, Math.max(0, Math.round(strength)));

    if (Object.keys(normalized).length >= MAX_BELIEF_ENTRIES) {
      break;
    }
  }

  return normalized;
}

export function normalizeStoredTraits(input: unknown): Traits {
  const normalized = normalizeTraits(
    input && typeof input === "object" ? (input as Record<string, unknown>) : {},
  );

  if (normalized) {
    return normalized;
  }

  return {
    humor: 5,
    aggression: 5,
    troll: 5,
    woke: 5,
    negacionist: 5,
    radical: 5,
  };
}

export function createPersonalityId(): string {
  return randomUUID();
}

export function defaultStats(): Personality["stats"] {
  return {
    followers: 0,
    socialScore: 0,
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
  archetype: Archetype | null;
  traits: Traits;
  politicalSwing: PoliticalSwing;
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

  if (typeof data.kind !== "string" || !isPageKind(data.kind)) {
    return { ok: false, error: "Choose a valid profile kind." };
  }

  const kind = data.kind;
  const usesIdentity = profileKindUsesIdentity(kind);

  let gender: Gender;
  let pronouns: Pronouns;

  if (usesIdentity) {
    if (typeof data.gender !== "string" || !isGender(data.gender)) {
      return { ok: false, error: "Choose a valid gender." };
    }

    gender = data.gender;

    const parsedPronouns =
      typeof data.pronouns === "string"
        ? isPronouns(data.pronouns)
          ? data.pronouns
          : null
        : defaultPronounsForGender(gender);

    if (!parsedPronouns) {
      return { ok: false, error: "Choose valid pronouns." };
    }

    pronouns = parsedPronouns;
  } else {
    gender = "prefer_not_to_say";
    pronouns = "prefer_not_to_say";
  }

  let archetype: Archetype | null;

  if (!pageKindUsesArchetype(kind)) {
    const rawArchetype = data.archetype;

    if (
      rawArchetype !== undefined &&
      rawArchetype !== null &&
      rawArchetype !== ""
    ) {
      return {
        ok: false,
        error: "This profile kind does not use an archetype.",
      };
    }

    archetype = null;
  } else {
    if (typeof data.archetype !== "string") {
      return { ok: false, error: "Choose a valid archetype." };
    }

    const parsedArchetype = normalizeArchetype(data.archetype);

    if (!parsedArchetype) {
      return { ok: false, error: "Choose a valid archetype." };
    }

    if (!isArchetypeAllowedForPageKind(kind, parsedArchetype)) {
      return {
        ok: false,
        error: "That archetype doesn't fit this profile kind.",
      };
    }

    archetype = parsedArchetype;
  }

  const traits = normalizeTraits(data.traits as Partial<Traits>);

  if (!traits) {
    return { ok: false, error: "Traits must be numbers from 0 to 10." };
  }

  const politicalSwing = normalizePoliticalSwing(data.politicalSwing);

  if (politicalSwing === null) {
    return { ok: false, error: "Political swing must be a number from -10 to 10." };
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

  const beliefs =
    data.beliefs && typeof data.beliefs === "object" && !Array.isArray(data.beliefs)
      ? normalizeBeliefs(data.beliefs as Record<string, number>)
      : {};

  return {
    ok: true,
    value: {
      name,
      handle,
      kind,
      gender,
      pronouns,
      archetype,
      traits,
      politicalSwing,
      interests,
      beliefs,
    },
  };
}
