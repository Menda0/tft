import type { PageKind } from "@/lib/avatars/page-kind";
import type { Archetype, Gender, Pronouns, Stats } from "@/lib/types/personality";
import type { PostStats } from "@/lib/types/post";

export type PublicPersonality = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  description: string | null;
  archetype: Archetype;
  kind: PageKind;
  gender: Gender;
  pronouns: Pronouns;
  stats: Stats;
};

export type ProfilePostType = "posts" | "replies" | "reposts";

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
