import {
  PAGE_KIND_LABELS,
  type PageKind,
} from "@/lib/avatars/page-kind";
import {
  ARCHETYPE_LABELS,
  BRAND_ARCHETYPES,
  NEWS_ARCHETYPES,
  PERSON_ARCHETYPES,
  type Archetype,
  type BrandArchetype,
  type NewsArchetype,
  type PersonArchetype,
} from "@/lib/personalities/archetypes";

const MEME_ARCHETYPES = ["troll", "comedian"] as const satisfies readonly Archetype[];

const ARCHETYPES_BY_PAGE_KIND: Record<
  PageKind,
  readonly Archetype[] | null
> = {
  person: PERSON_ARCHETYPES,
  artist: null,
  band_page: null,
  news: NEWS_ARCHETYPES,
  meme_page: MEME_ARCHETYPES,
  brand: BRAND_ARCHETYPES,
};

const DEFAULT_ARCHETYPE_BY_PAGE_KIND: Record<PageKind, Archetype | null> = {
  person: "comedian",
  artist: null,
  band_page: null,
  news: "traditional",
  meme_page: "comedian",
  brand: "tech",
};

const REMOVED_KIND_MAP: Record<string, PageKind> = {
  mascot: "brand",
  company_page: "brand",
  fan_page: "artist",
};

const NEWS_ARCHETYPE_MIGRATION: Record<string, NewsArchetype> = {
  journalist: "traditional",
  politician: "politics",
  detective: "crime",
  negacionist: "fakenews",
  conspiracy: "conspiracy",
  comedian: "fakenews",
  reply_guy: "politics",
  artist: "traditional",
  tech_bro: "traditional",
  philosopher: "traditional",
  troll: "fakenews",
  boomer: "traditional",
  coach: "sports",
  woke: "politics",
  fitness: "sports",
  lifestyle: "traditional",
  fakenews: "fakenews",
  traditional: "traditional",
  politics: "politics",
  crime: "crime",
  sports: "sports",
};

const BRAND_ARCHETYPE_MIGRATION: Record<string, BrandArchetype> = {
  tech_bro: "tech",
  tech: "tech",
  fitness: "fitness",
  lifestyle: "other",
  coach: "other",
  comedian: "other",
  journalist: "other",
  reply_guy: "other",
  conspiracy: "other",
  artist: "other",
  philosopher: "other",
  troll: "other",
  boomer: "other",
  detective: "other",
  politician: "other",
  woke: "other",
  negacionist: "other",
  food_and_beverages: "food_and_beverages",
  other: "other",
};

export function pageKindUsesArchetype(kind: PageKind): boolean {
  return ARCHETYPES_BY_PAGE_KIND[kind] !== null;
}

export function getArchetypesForPageKind(
  kind: PageKind,
): readonly Archetype[] | null {
  return ARCHETYPES_BY_PAGE_KIND[kind];
}

export function defaultArchetypeForPageKind(kind: PageKind): Archetype | null {
  return DEFAULT_ARCHETYPE_BY_PAGE_KIND[kind];
}

export function isArchetypeAllowedForPageKind(
  kind: PageKind,
  archetype: Archetype | null,
): boolean {
  const allowed = ARCHETYPES_BY_PAGE_KIND[kind];

  if (allowed === null) {
    return archetype === null;
  }

  return archetype !== null && (allowed as readonly string[]).includes(archetype);
}

export function coerceArchetypeForPageKind(
  kind: PageKind,
  archetype: Archetype | null | undefined,
): Archetype | null {
  if (!pageKindUsesArchetype(kind)) {
    return null;
  }

  if (archetype && isArchetypeAllowedForPageKind(kind, archetype)) {
    return archetype;
  }

  return defaultArchetypeForPageKind(kind);
}

export function getArchetypeOptionsForPageKind(kind: PageKind) {
  const archetypes = getArchetypesForPageKind(kind);

  if (!archetypes) {
    return [];
  }

  return archetypes.map((value) => ({
    value,
    label: ARCHETYPE_LABELS[value],
  }));
}

export function migrateStoredPageKind(kind: string | undefined): PageKind | undefined {
  if (!kind) {
    return undefined;
  }

  if (kind in REMOVED_KIND_MAP) {
    return REMOVED_KIND_MAP[kind];
  }

  return undefined;
}

export function remapArchetypeForMigration(
  kind: PageKind,
  archetype: Archetype | null | undefined,
): Archetype | null {
  if (!pageKindUsesArchetype(kind)) {
    return null;
  }

  if (archetype && isArchetypeAllowedForPageKind(kind, archetype)) {
    return archetype;
  }

  if (kind === "news") {
    return NEWS_ARCHETYPE_MIGRATION[archetype ?? ""] ?? "traditional";
  }

  if (kind === "brand") {
    return BRAND_ARCHETYPE_MIGRATION[archetype ?? ""] ?? "tech";
  }

  if (kind === "meme_page") {
    if (archetype === "troll" || archetype === "comedian") {
      return archetype;
    }

    return "comedian";
  }

  if (kind === "person") {
    if (archetype && (PERSON_ARCHETYPES as readonly string[]).includes(archetype)) {
      return archetype as PersonArchetype;
    }

    return "comedian";
  }

  return defaultArchetypeForPageKind(kind);
}

export function formatPersonalityVoiceLabel(
  kind: PageKind,
  archetype: Archetype | null,
): string {
  if (archetype) {
    return ARCHETYPE_LABELS[archetype];
  }

  if (kind === "artist") {
    return "creative artist";
  }

  if (kind === "band_page") {
    return "band";
  }

  return PAGE_KIND_LABELS[kind];
}
