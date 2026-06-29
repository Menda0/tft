import type { Archetype } from "@/lib/personalities/archetypes";
import type { Gender } from "@/lib/personalities/gender";
import { GENDER_AVATAR_HINTS, isDoorGender } from "@/lib/personalities/gender";
import { PRONOUN_AVATAR_HINTS, type Pronouns } from "@/lib/personalities/pronouns";
import type { Traits } from "@/lib/types/personality";
import { PIXEL_ART_STYLE } from "@/lib/avatars/pixel-canvas";

export const PAGE_KINDS = [
  "person",
  "artist",
  "brand",
  "band_page",
  "news",
  "meme_page",
] as const;

export type PageKind = (typeof PAGE_KINDS)[number];

export const PAGE_KIND_LABELS: Record<PageKind, string> = {
  person: "Person",
  artist: "Artist",
  brand: "Brand page",
  band_page: "Band page",
  news: "News page",
  meme_page: "Meme page",
};

export function profileKindUsesIdentity(kind: PageKind): boolean {
  return kind === "person" || kind === "artist";
}

export function normalizeStoredPageKind(kind: string | undefined): PageKind | undefined {
  if (kind === "fan_page") {
    return "artist";
  }

  if (kind === "mascot" || kind === "company_page") {
    return "brand";
  }

  if (kind && isPageKind(kind)) {
    return kind;
  }

  return undefined;
}

export function isPageKind(value: string): value is PageKind {
  return (PAGE_KINDS as readonly string[]).includes(value);
}

export type AvatarPageProfile = {
  kind: PageKind;
  name: string;
  handle: string;
  archetype: Archetype | null;
  gender: Gender;
  pronouns: Pronouns;
  traits: Traits;
  interests: string[];
};

const NON_PERSON_KEYWORDS = [
  "bot",
  "machine",
  "factory",
  "desk",
  "times",
  "news",
  "daily",
  "meme",
  "memes",
  "archive",
  "official",
  "fan",
  "fans",
  "updates",
  "hq",
  "inc",
  "corp",
  "media",
  "post",
  "posting",
  "thread",
  "watch",
  "report",
  "wire",
  "bulletin",
  "herald",
  "observer",
  "monitor",
  "review",
  "channel",
  "network",
  "studio",
  "labs",
  "lab",
  "goblin",
  "gremlin",
  "engine",
  "overlord",
  "supreme",
  "saint",
  "demon",
  "wizard",
  "merchant",
  "bandit",
  "intern",
  "agent",
  "menace",
  "legend",
  "breaking",
  "dispatch",
  "scoop",
  "signal",
  "source",
  "global",
  "city",
  "shitpost",
  "viral",
  "dank",
  "based",
  "cursed",
  "ratio",
  "punchline",
  "team",
  "club",
  "stan",
  "highlights",
  "facts",
  "central",
  "united",
  "feed",
  "page",
  "account",
  "alerts",
  "digest",
  "weekly",
  "hourly",
  "live",
  "broadcast",
  "radio",
  "podcast",
  "gazette",
  "journal",
  "ledger",
  "chronicle",
  "headlines",
  "ticker",
  "portal",
  "hub",
  "zone",
  "vault",
  "depot",
  "works",
  "systems",
  "digital",
  "pixel",
  "byte",
  "data",
  "cloud",
  "stack",
  "code",
  "dev",
  "tech",
  "startup",
  "founder",
  "capital",
  "ventures",
  "industries",
  "group",
  "collective",
  "guild",
  "league",
  "nation",
  "world",
  "universe",
  "galaxy",
  "planet",
  "band",
  "music",
  "tour",
  "records",
  "vinyl",
  "gig",
  "album",
  "ensemble",
  "company",
  "ltd",
  "llc",
  "consulting",
  "partners",
  "holdings",
  "solutions",
  "services",
];

const MASCOT_KEYWORDS = [
  "bot",
  "goblin",
  "gremlin",
  "wizard",
  "demon",
  "saint",
  "dragon",
  "cat",
  "dog",
  "frog",
  "owl",
  "bear",
  "fox",
  "pilot",
  "captain",
  "agent",
  "lord",
  "king",
  "queen",
  "machine",
  "engine",
  "creature",
  "mascot",
  "monster",
  "alien",
  "robot",
  "puppet",
  "sprite",
  "imp",
  "spirit",
  "ghost",
  "phantom",
  "golem",
  "titan",
  "beast",
  "critter",
  "penguin",
  "duck",
  "bunny",
  "hamster",
  "slime",
  "blob",
  "toad",
  "crow",
  "wolf",
  "shark",
  "crab",
  "snail",
  "worm",
  "eyeball",
];

const PERSON_NAME_PATTERN =
  /^[A-Z][a-z]+(?:[-'][A-Z][a-z]+)?\s+[A-Z][a-z]+(?:[-'][A-Z][a-z]+)?$/;

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function containsKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => {
    const pattern = new RegExp(`\\b${keyword}\\b`, "i");
    return pattern.test(text) || text.includes(keyword);
  });
}

function looksLikePersonName(name: string): boolean {
  const trimmed = name.trim();

  if (!PERSON_NAME_PATTERN.test(trimmed)) {
    return false;
  }

  return !containsKeyword(normalizeText(trimmed), NON_PERSON_KEYWORDS);
}

function isCompoundPageName(name: string): boolean {
  const trimmed = name.trim();

  if (trimmed.includes(" ")) {
    return false;
  }

  if (/[A-Z].*[A-Z]/.test(trimmed.slice(1))) {
    return true;
  }

  return containsKeyword(normalizeText(trimmed), NON_PERSON_KEYWORDS);
}

export function classifyPageKind(input: {
  name: string;
  handle: string;
  archetype: Archetype | null;
}): PageKind {
  const nameText = normalizeText(input.name);
  const handleText = normalizeText(input.handle);
  const combined = `${nameText} ${handleText}`;

  if (looksLikePersonName(input.name)) {
    return "person";
  }

  if (
    input.archetype === "journalist" ||
    input.archetype === "traditional" ||
    input.archetype === "fakenews" ||
    input.archetype === "politics" ||
    input.archetype === "crime" ||
    input.archetype === "sports" ||
    containsKeyword(combined, [
      "news",
      "daily",
      "times",
      "herald",
      "bulletin",
      "report",
      "wire",
      "dispatch",
      "breaking",
      "journal",
      "chronicle",
      "gazette",
      "headlines",
      "broadcast",
    ])
  ) {
    return "news";
  }

  if (
    input.archetype === "artist" ||
    containsKeyword(combined, [
      "artist",
      "art",
      "arts",
      "painter",
      "illustrator",
      "sculptor",
      "gallery",
      "canvas",
      "sketch",
      "creative",
      "mural",
      "designer",
      "draws",
      "drawing",
    ])
  ) {
    return "artist";
  }

  if (
    containsKeyword(combined, [
      "band",
      "music",
      "tour",
      "records",
      "vinyl",
      "gig",
      "album",
      "ensemble",
      "chorus",
      "orchestra",
      "sound",
      "beats",
      "riff",
      "anthem",
    ])
  ) {
    return "band_page";
  }

  if (
    input.archetype === "comedian" ||
    input.archetype === "troll" ||
    containsKeyword(combined, [
      "meme",
      "memes",
      "shitpost",
      "viral",
      "dank",
      "based",
      "cursed",
      "ratio",
      "punchline",
      "cringe",
      "irony",
      "parody",
    ])
  ) {
    return "meme_page";
  }

  if (
    containsKeyword(combined, [
      "company",
      "corp",
      "inc",
      "ltd",
      "llc",
      "consulting",
      "partners",
      "holdings",
      "solutions",
      "services",
      "enterprises",
      "official",
      "hq",
      "media",
      "studio",
      "labs",
      "network",
      "channel",
      "group",
      "industries",
      "ventures",
      "systems",
      "digital",
      "hub",
      "portal",
    ]) ||
    containsKeyword(combined, MASCOT_KEYWORDS) ||
    isCompoundPageName(input.name) ||
    input.archetype === "tech_bro" ||
    input.archetype === "tech"
  ) {
    return "brand";
  }

  if (input.name.trim().includes(" ")) {
    return "brand";
  }

  return "brand";
}

const BASE_RULES = [
  "Create exactly one pixel art social media profile picture.",
  PIXEL_ART_STYLE,
  "No anti-aliasing, no photorealism, no 3D, no vector gradients, no anime shading.",
  "Solid flat dark navy background (#1d2b53).",
  "No text, no letters, no numbers, no watermark, no logo text, no frame.",
  "Do not add extra characters, props, scenery, or details beyond what is requested.",
  "Stay literal to the page identity. Do not invent unrelated objects or people.",
];

function interestText(interests: string[]): string {
  return interests.length > 0 ? interests.join(", ") : "social media";
}

function traitSummary(traits: Traits): string {
  return `humor ${traits.humor}, aggression ${traits.aggression}, troll ${traits.troll}, woke ${traits.woke}, negacionist ${traits.negacionist}, radical ${traits.radical}`;
}

function toneLine(archetype: Archetype | null, traits: Traits): string {
  const summary = traitSummary(traits);

  if (archetype) {
    return `Tone: ${archetype}, ${summary}.`;
  }

  return `Tone: ${summary}.`;
}

export function buildAvatarPrompt(profile: AvatarPageProfile): string {
  const interests = interestText(profile.interests);
  const kind = profile.kind;

  if (profileKindUsesIdentity(kind)) {
    if (isDoorGender(profile.gender)) {
      return [
        ...BASE_RULES,
        "Subject: a pixel art door filling the frame, NOT a human face or person.",
        "Choose one clear door only: wooden front door, arched portal door, painted cottage door, or office door with a window panel.",
        `Name inspiration: ${profile.name}.`,
        toneLine(profile.archetype, profile.traits),
        `Theme cues: ${interests}.`,
        "Include a visible door frame, panel, and knob or handle. No people, faces, mascots, or extra scenery.",
      ].join(" ");
    }

    const identityLabel =
      kind === "artist" ? "creative artist" : "person";

    return [
      ...BASE_RULES,
      `Subject: a close-up pixel art face of a ${identityLabel}, filling the frame.`,
      `Name: ${profile.name}.`,
      `Presentation: ${GENDER_AVATAR_HINTS[profile.gender]}.`,
      `Pronouns: ${PRONOUN_AVATAR_HINTS[profile.pronouns]}.`,
      kind === "artist"
        ? "Give subtle creative-artist energy through expression and style only. No props, tools, or scenery."
        : "Do not turn this into a logo, mascot, animal, object, or scene.",
    ].join(" ");
  }

  if (kind === "news") {
    return [
      ...BASE_RULES,
      "Subject: a pixel art news-page icon, NOT a human portrait.",
      "Choose one clear symbol only: vintage microphone, folded newspaper, broadcast tower, or press badge emblem.",
      `Page name inspiration: ${profile.name}.`,
      toneLine(profile.archetype, profile.traits),
      `Topic cues: ${interests}.`,
      "Do not draw a realistic human face or full person.",
    ].join(" ");
  }

  if (kind === "meme_page") {
    return [
      ...BASE_RULES,
      "Subject: a pixel art meme-page icon, NOT a realistic human portrait.",
      "Choose one clear symbol only: cartoon frog-like mascot, reaction face icon, megaphone, clown nose badge, or chaotic emoji creature.",
      `Page name inspiration: ${profile.name}.`,
      toneLine(profile.archetype, profile.traits),
      `Meme cues: ${interests}.`,
      "Keep it playful and simple. No realistic humans.",
    ].join(" ");
  }

  if (kind === "brand") {
    return [
      ...BASE_RULES,
      "Subject: a pixel art brand emblem or app icon, NOT a human portrait.",
      "Choose one clear symbol only: geometric badge, monogram-like shape without letters, storefront icon, or abstract emblem tied to the page theme.",
      `Brand/page name inspiration: ${profile.name}.`,
      toneLine(profile.archetype, profile.traits),
      `Theme cues: ${interests}.`,
      "Do not draw a person, face, or mascot character.",
    ].join(" ");
  }

  if (kind === "band_page") {
    return [
      ...BASE_RULES,
      "Subject: a pixel art band-page icon, NOT a human portrait.",
      "Choose one clear symbol only: electric guitar, drum kit, vinyl record, microphone on stand, or music note badge.",
      `Band name inspiration: ${profile.name}.`,
      toneLine(profile.archetype, profile.traits),
      `Music cues: ${interests}.`,
      "Do not draw a realistic human face or full person.",
    ].join(" ");
  }

  return [
    ...BASE_RULES,
    "Subject: a pixel art brand emblem or app icon, NOT a human portrait.",
    "Choose one clear symbol only: geometric badge, monogram-like shape without letters, storefront icon, or abstract emblem tied to the page theme.",
    `Page name inspiration: ${profile.name}.`,
    toneLine(profile.archetype, profile.traits),
    `Theme cues: ${interests}.`,
    "Do not draw a person, face, or mascot character.",
  ].join(" ");
}

export function resolveAvatarPageProfile(input: {
  name: string;
  handle: string;
  gender: Gender;
  pronouns: Pronouns;
  archetype: Archetype | null;
  traits: Traits;
  interests: string[];
  kind?: PageKind;
}): AvatarPageProfile {
  return {
    kind: input.kind ?? classifyPageKind(input),
    ...input,
  };
}
