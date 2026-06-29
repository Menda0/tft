export type AiOperation =
  | "bio"
  | "avatar"
  | "rank_npc_avatar"
  | "post"
  | "post_research"
  | "reply"
  | "rank_npc_reply"
  | "trending"
  | "post_media_describe"
  | "post_media_image"
  | "moderation_text"
  | "moderation_image";

export type AiUsageEvent = {
  id: string;
  operation: AiOperation;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  createdAt: Date;
  personalityId?: string;
  postId?: string;
};

export type AiUsageBreakdownRow = {
  operation?: AiOperation;
  model?: string;
  requestCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
};

export type AiUsageSummary = {
  totalCostUsd: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  requestCount: number;
  byOperation: AiUsageBreakdownRow[];
  byModel: AiUsageBreakdownRow[];
};
