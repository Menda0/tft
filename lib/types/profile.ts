import type { PageKind } from "@/lib/avatars/page-kind";
import type { Archetype } from "@/lib/personalities/archetypes";
import type { Gender } from "@/lib/personalities/gender";
import type { PoliticalSwing } from "@/lib/personalities/political-swing";
import type { Pronouns } from "@/lib/personalities/pronouns";
import type { RelationshipCategory } from "@/lib/profile/relationship-category";
import type { Stats, Traits, MemoryItem } from "@/lib/types/personality";
import type { SocialRank } from "@/lib/scoring/ranks";
import type { PostMediaStatus, PostStats } from "@/lib/types/post";

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
  isRankNpc: boolean;
  isOwner?: boolean;
  socialRank?: SocialRank;
  socialRankLabel?: string;
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
  category: RelationshipCategory;
  categoryLabel: string;
};

export type ProfileCharacterSheet = {
  traits: Traits;
  stats: Stats;
  cloutBreakdown: {
    gross: number;
    heat: number;
    penalty: number;
    net: number;
  };
  interests: string[];
  evolutions: MemoryItem[];
  socialRank: SocialRank;
  socialRankLabel: string;
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
  mediaUrl?: string | null;
  mediaStatus?: PostMediaStatus;
  stats?: PostStats;
  replyToPostId?: string;
  parentAuthorHandle?: string;
  parentPost?: ProfileParentPost;
  repostOfPostId?: string;
  sourceAuthorHandle?: string;
};
