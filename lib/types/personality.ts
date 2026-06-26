export type Archetype =
  | "comedian"
  | "journalist"
  | "reply_guy"
  | "conspiracy"
  | "artist";

export type MemoryType =
  | "friendship"
  | "rivalry"
  | "scandal"
  | "milestone"
  | "belief_change";

export type Traits = {
  humor: number;
  aggression: number;
  charisma: number;
  curiosity: number;
  chaos: number;
  empathy: number;
};

export type Stats = {
  followers: number;
  reputation: number;
  controversy: number;
  creativity: number;
};

export type Relationship = {
  trust: number;
  rivalry: number;
  admiration: number;
  familiarity: number;
};

export type MemoryItem = {
  type: MemoryType;
  text: string;
  importance: number;
};

export type Personality = {
  id: string;
  name: string;
  archetype: Archetype;
  traits: Traits;
  interests: string[];
  beliefs: Record<string, number>;
  stats: Stats;
  memory: MemoryItem[];
  relationships: Record<string, Relationship>;
};
