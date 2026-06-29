import type { PageKind } from "@/lib/avatars/page-kind";
import type { Archetype } from "@/lib/personalities/archetypes";
import type { Gender } from "@/lib/personalities/gender";
import type { PoliticalSwing } from "@/lib/personalities/political-swing";
import type { Pronouns } from "@/lib/personalities/pronouns";
import type { Stats, Traits, MemoryItem } from "@/lib/types/personality";
import type { PostStats } from "@/lib/types/post";

export type PublicPersonality = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  description: string | null;
  archetype: Archetype | null;
  kind: PageKind;
  gender: Gender;
  pronouns: Pronouns;
  stats: Stats;
  politicalSwing: PoliticalSwing;
};

export type ProfileFollower = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
};

export type ProfilePostType = "posts" | "replies" | "reposts";

export type ProfileTab = ProfilePostType | "character";

export type ProfileRelationship = {
  personalityId: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  trust: number;
  rivalry: number;
  admiration: number;
  familiarity: number;
};

export type ProfileCharacterSheet = {
  traits: Traits;
  stats: Stats;
  interests: string[];
  memories: MemoryItem[];
  relationships: ProfileRelationship[];
  evolutions: MemoryItem[];
};

export type ProfileParentPost = {
  id: string;
  authorName: string;
  authorHandle: string;
  content: string;
  timestamp: string;
};

export type ProfilePostItem = {
  id: string;
  content: string;
  timestamp: string;
  threadId: string;
  stats?: PostStats;
  replyToPostId?: string;
  parentAuthorHandle?: string;
  parentPost?: ProfileParentPost;
  repostOfPostId?: string;
  sourceAuthorHandle?: string;
};
