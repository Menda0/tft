import type { PageKind } from "@/lib/avatars/page-kind";
import type { Archetype } from "@/lib/personalities/archetypes";
import type { Gender } from "@/lib/personalities/gender";
import type { PoliticalSwing } from "@/lib/personalities/political-swing";
import type { Pronouns } from "@/lib/personalities/pronouns";
import type { SocialRank } from "@/lib/scoring/ranks";

export type { PageKind };

export type { Archetype };
export type { Gender };
export type { Pronouns };
export type { PoliticalSwing };

export type MemoryType =
  | "friendship"
  | "rivalry"
  | "scandal"
  | "endorsement"
  | "exchange"
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
  socialScore: number;
  controversy: number;
  creativity: number;
};

export type Relationship = {
  trust: number;
  rivalry: number;
  admiration: number;
  familiarity: number;
  endorsementStreak?: number;
};

export type MemoryItem = {
  type: MemoryType;
  text: string;
  importance: number;
};

export type AvatarStatus = "pending" | "generating" | "ready" | "failed";

export type DescriptionStatus = AvatarStatus;

export type PersonalityRole = "player" | "rank_npc";

export type XSyncState = {
  xHandle: string;
  xUserId: string | null;
  realName?: string;
  lastSyncedTweetId: string | null;
  lastSyncedAt: Date | null;
};

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
  archetype: Archetype | null;
  traits: Traits;
  politicalSwing: PoliticalSwing;
  interests: string[];
  beliefs: Record<string, number>;
  stats: Stats;
  memory: MemoryItem[];
  relationships: Record<string, Relationship>;
  role?: PersonalityRole;
  rankNpcActive?: boolean;
  xSync?: XSyncState;
  fixedSocialRank?: SocialRank;
  deletedAt?: Date | null;
};
