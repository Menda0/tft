import type { PageKind } from "@/lib/avatars/page-kind";
import type { Archetype } from "@/lib/personalities/archetypes";
import type { Gender } from "@/lib/personalities/gender";
import type { PoliticalSwing } from "@/lib/personalities/political-swing";
import type { Pronouns } from "@/lib/personalities/pronouns";

export type { PageKind };

export type { Archetype };
export type { Gender };
export type { Pronouns };
export type { PoliticalSwing };

export type MemoryType =
  | "friendship"
  | "rivalry"
  | "scandal"
  | "milestone"
  | "belief_change";

export type Traits = {
  humor: number;
  aggression: number;
  troll: number;
  woke: number;
  negacionist: number;
  radical: number;
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

export type AvatarStatus = "pending" | "generating" | "ready" | "failed";

export type DescriptionStatus = AvatarStatus;

export type Personality = {
  id: string;
  name: string;
  handle: string;
  kind: PageKind;
  gender: Gender;
  pronouns: Pronouns;
  avatarUrl: string | null;
  avatarStatus: AvatarStatus;
  description: string | null;
  descriptionStatus: DescriptionStatus;
  ownerId: string;
  createdAt: Date;
  archetype: Archetype;
  traits: Traits;
  politicalSwing: PoliticalSwing;
  interests: string[];
  beliefs: Record<string, number>;
  stats: Stats;
  memory: MemoryItem[];
  relationships: Record<string, Relationship>;
};
