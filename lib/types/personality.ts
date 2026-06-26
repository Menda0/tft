import type { Archetype } from "@/lib/personalities/archetypes";
import type { Gender } from "@/lib/personalities/gender";

export type { Archetype };
export type { Gender };

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
  handle: string;
  gender: Gender;
  avatarUrl: string;
  ownerId: string;
  createdAt: Date;
  archetype: Archetype;
  traits: Traits;
  interests: string[];
  beliefs: Record<string, number>;
  stats: Stats;
  memory: MemoryItem[];
  relationships: Record<string, Relationship>;
};
