export const PERSON_ARCHETYPES = [
  "comedian",
  "journalist",
  "reply_guy",
  "conspiracy",
  "artist",
  "tech_bro",
  "philosopher",
  "troll",
  "boomer",
  "coach",
  "detective",
  "politician",
  "woke",
  "negacionist",
  "fitness",
  "lifestyle",
] as const;

/** @deprecated Use PERSON_ARCHETYPES for person-only sets. */
export const ARCHETYPES = PERSON_ARCHETYPES;

export const NEWS_ARCHETYPES = [
  "fakenews",
  "conspiracy",
  "traditional",
  "politics",
  "crime",
  "sports",
] as const;

export const BRAND_ARCHETYPES = [
  "tech",
  "fitness",
  "food_and_beverages",
  "other",
] as const;

export const ALL_ARCHETYPE_SLUGS = [
  ...new Set([
    ...PERSON_ARCHETYPES,
    ...NEWS_ARCHETYPES,
    ...BRAND_ARCHETYPES,
  ]),
] as const;

export type PersonArchetype = (typeof PERSON_ARCHETYPES)[number];
export type NewsArchetype = (typeof NEWS_ARCHETYPES)[number];
export type BrandArchetype = (typeof BRAND_ARCHETYPES)[number];
export type Archetype = (typeof ALL_ARCHETYPE_SLUGS)[number];

const LEGACY_ARCHETYPE_MAP: Record<string, Archetype> = {
  fan_account: "comedian",
  poet: "artist",
};

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  comedian: "Comedian",
  journalist: "Journalist",
  reply_guy: "Reply Guy",
  conspiracy: "Conspiracy",
  artist: "Artist",
  tech_bro: "Tech Bro",
  philosopher: "Philosopher",
  troll: "Troll",
  boomer: "Boomer",
  coach: "Coach",
  detective: "Detective",
  politician: "Politician",
  woke: "Woke",
  negacionist: "Negacionist",
  fitness: "Fitness",
  lifestyle: "Lifestyle",
  fakenews: "Fake News",
  traditional: "Traditional",
  politics: "Politics",
  crime: "Crime",
  sports: "Sports",
  tech: "Tech",
  food_and_beverages: "Food & Beverages",
  other: "Other",
};

export const ARCHETYPE_DESCRIPTIONS: Record<PersonArchetype, string> = {
  comedian: "witty chaotic comedian with expressive eyes and a smirk",
  journalist: "sharp focused investigative journalist with notepad energy",
  reply_guy: "opinionated internet debater with confident posture",
  conspiracy: "mysterious paranoid theorist with intense stare",
  artist: "creative eccentric artist with colorful style",
  tech_bro: "startup tech bro with hoodie, headset, and founder energy",
  philosopher: "thoughtful philosopher with calm gaze and ancient book vibes",
  troll: "mischievous internet troll with chaotic grin and neon accents",
  boomer: "older internet uncle with glasses, polo shirt, and newspaper energy",
  coach: "intense motivational coach with whistle and power pose",
  detective: "noir detective with trench coat, magnifying glass, and sharp eyes",
  politician: "polished political operator with suit energy and camera-ready smile",
  woke: "earnest activist profile with protest-pin energy and intense conviction",
  negacionist: "contrarian denialist with skeptical glare and debate-ready posture",
  fitness: "athletic fitness influencer with gym energy, defined jawline, and activewear vibes",
  lifestyle: "curated lifestyle creator with soft aesthetic, clean style, and aspirational calm",
};

export function isArchetype(value: string): value is Archetype {
  return (ALL_ARCHETYPE_SLUGS as readonly string[]).includes(value);
}

export function isPersonArchetype(value: string): value is PersonArchetype {
  return (PERSON_ARCHETYPES as readonly string[]).includes(value);
}

export function isNewsArchetype(value: string): value is NewsArchetype {
  return (NEWS_ARCHETYPES as readonly string[]).includes(value);
}

export function isBrandArchetype(value: string): value is BrandArchetype {
  return (BRAND_ARCHETYPES as readonly string[]).includes(value);
}

export function normalizeArchetype(value: string): Archetype | null {
  if (isArchetype(value)) {
    return value;
  }

  return LEGACY_ARCHETYPE_MAP[value] ?? null;
}

export function formatArchetypeLabel(archetype: Archetype | null): string {
  if (!archetype) {
    return "";
  }

  return ARCHETYPE_LABELS[archetype];
}
