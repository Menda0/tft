export const ARCHETYPES = [
  "comedian",
  "journalist",
  "reply_guy",
  "conspiracy",
  "artist",
  "tech_bro",
  "philosopher",
  "troll",
  "fan_account",
  "boomer",
  "poet",
  "coach",
  "detective",
] as const;

export type Archetype = (typeof ARCHETYPES)[number];

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  comedian: "Comedian",
  journalist: "Journalist",
  reply_guy: "Reply Guy",
  conspiracy: "Conspiracy",
  artist: "Artist",
  tech_bro: "Tech Bro",
  philosopher: "Philosopher",
  troll: "Troll",
  fan_account: "Fan Account",
  boomer: "Boomer",
  poet: "Poet",
  coach: "Coach",
  detective: "Detective",
};

export const ARCHETYPE_DESCRIPTIONS: Record<Archetype, string> = {
  comedian: "witty chaotic comedian with expressive eyes and a smirk",
  journalist: "sharp focused investigative journalist with notepad energy",
  reply_guy: "opinionated internet debater with confident posture",
  conspiracy: "mysterious paranoid theorist with intense stare",
  artist: "creative eccentric artist with colorful style",
  tech_bro: "startup tech bro with hoodie, headset, and founder energy",
  philosopher: "thoughtful philosopher with calm gaze and ancient book vibes",
  troll: "mischievous internet troll with chaotic grin and neon accents",
  fan_account: "hyper stan fan with stars in eyes and team merch",
  boomer: "older internet uncle with glasses, polo shirt, and newspaper energy",
  poet: "dramatic romantic poet with soft lighting and notebook",
  coach: "intense motivational coach with whistle and power pose",
  detective: "noir detective with trench coat, magnifying glass, and sharp eyes",
};

export function isArchetype(value: string): value is Archetype {
  return ARCHETYPES.includes(value as Archetype);
}

export function formatArchetypeLabel(archetype: Archetype): string {
  return ARCHETYPE_LABELS[archetype];
}
