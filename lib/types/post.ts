export type PostStats = {
  replies: number;
  reposts: number;
  likes: number;
  views: number;
  stronglyAgreeReplies: number;
  agreeReplies: number;
  neutralReplies: number;
  disagreeReplies: number;
  stronglyDisagreeReplies: number;
};

export type ReplyTone =
  | "strongly_disagree"
  | "disagree"
  | "neutral"
  | "agree"
  | "strongly_agree";

/** @deprecated Use ReplyTone — kept for legacy posts */
export type LegacyReplyTone = "agree" | "disagree";

export type PostSource = "simulated" | "mirrored";

export type PostMediaStatus =
  | "none"
  | "pending"
  | "generating"
  | "ready"
  | "failed";

export type PostAuthor = {
  personalityId: string;
  name: string;
  handle: string;
  archetype: string;
  avatarUrl: string | null;
};

export type Post = {
  id: string;
  author: PostAuthor;
  content: string;
  topic: string | null;
  createdAt: Date;
  tickNumber: number;
  stats: PostStats;
  replyToPostId: string | null;
  repostOfPostId: string | null;
  replyTone?: ReplyTone | null;
  source?: PostSource;
  externalId?: string | null;
  sourceImageUrls?: string[];
  mediaUrl?: string | null;
  mediaStatus?: PostMediaStatus;
  deletedAt?: Date | null;
};

export function defaultPostStats(): PostStats {
  return {
    replies: 0,
    reposts: 0,
    likes: 0,
    views: 0,
    stronglyAgreeReplies: 0,
    agreeReplies: 0,
    neutralReplies: 0,
    disagreeReplies: 0,
    stronglyDisagreeReplies: 0,
  };
}

export type FeedAuthor = {
  name: string;
  handle: string;
  avatarColor: string;
  archetype: string;
  avatarUrl: string | null;
};

export type FeedReply = {
  id: string;
  author: FeedAuthor;
  content: string;
  timestamp: string;
  likes: number;
};

export type FeedThread = {
  id: string;
  author: FeedAuthor;
  content: string;
  timestamp: string;
  stats: PostStats;
  mediaUrl?: string | null;
  mediaStatus?: PostMediaStatus;
  replies: FeedReply[];
};
