import type { Personality } from "@/lib/types/personality";

export type SocialScoreEvent =
  | "like_received"
  | "repost_received"
  | "follow_received"
  | "agree_reply_on_post"
  | "agree_reply_written"
  | "unfollow_after_conflict"
  | "disagree_reply_on_post";

export const HEAT_PENALTY_RATE = 0.1;
export const MAX_HEAT_DEDUCTION_RATIO = 0.3;

export const AGREE_REPLY_CLOUT = 8;
export const DISAGREE_REPLY_CLOUT = 2;

export const POST_CLOUT_LOG_SOFTNESS = 50;
export const POST_CLOUT_LOG_SCALE = 60;
export const FOLLOWER_CLOUT_LOG_SOFTNESS = 20;
export const FOLLOWER_CLOUT_LOG_SCALE = 45;

const LIKE_WEIGHT = 2;
const REPOST_WEIGHT = 5;
const VIEW_WEIGHT = 0.05;

const BASE_DELTAS: Record<SocialScoreEvent, number> = {
  like_received: 2,
  repost_received: 5,
  follow_received: 10,
  agree_reply_on_post: 8,
  agree_reply_written: 3,
  unfollow_after_conflict: 0,
  disagree_reply_on_post: 0,
};

export type PostEngagementTotals = {
  likes: number;
  reposts: number;
  replies: number;
  views: number;
  agreeReplies?: number;
  disagreeReplies?: number;
};

export type CloutBreakdown = {
  gross: number;
  heat: number;
  penalty: number;
  net: number;
};

export type SocialScoreContext = {
  actor?: Pick<Personality, "stats">;
};

function fameMultiplier(actor: Pick<Personality, "stats"> | undefined): number {
  if (!actor) {
    return 1;
  }

  const followers = Math.max(1, actor.stats.followers);
  return 1 + Math.log10(followers / 100);
}

export function computeSocialScoreDelta(
  event: SocialScoreEvent,
  context: SocialScoreContext = {},
): number {
  const base = BASE_DELTAS[event];

  if (base <= 0) {
    return base;
  }

  return Math.round(base * fameMultiplier(context.actor));
}

export function computeLinearEngagementRaw(totals: PostEngagementTotals): number {
  const agreeReplies = totals.agreeReplies ?? 0;
  const disagreeReplies = totals.disagreeReplies ?? 0;
  const hasToneBreakdown = agreeReplies > 0 || disagreeReplies > 0;

  const replyScore = hasToneBreakdown
    ? agreeReplies * AGREE_REPLY_CLOUT + disagreeReplies * DISAGREE_REPLY_CLOUT
    : totals.replies * AGREE_REPLY_CLOUT;

  return (
    totals.likes * LIKE_WEIGHT +
    totals.reposts * REPOST_WEIGHT +
    replyScore +
    Math.round(totals.views * VIEW_WEIGHT)
  );
}

function logScaledClout(
  value: number,
  scale: number,
  softness: number,
): number {
  if (value <= 0) {
    return 0;
  }

  return Math.round(scale * Math.log1p(value / softness));
}

export function computePostClout(totals: PostEngagementTotals): number {
  return logScaledClout(
    computeLinearEngagementRaw(totals),
    POST_CLOUT_LOG_SCALE,
    POST_CLOUT_LOG_SOFTNESS,
  );
}

export function computeFollowerClout(followers: number): number {
  return logScaledClout(
    Math.max(0, followers),
    FOLLOWER_CLOUT_LOG_SCALE,
    FOLLOWER_CLOUT_LOG_SOFTNESS,
  );
}

export function computeGrossClout(
  totals: PostEngagementTotals,
  followers: number,
): number {
  return computePostClout(totals) + computeFollowerClout(followers);
}

export function computeHeatPenalty(grossClout: number, heat: number): number {
  if (grossClout <= 0 || heat <= 0) {
    return 0;
  }

  const heatPenalty = heat * HEAT_PENALTY_RATE;
  const maxPenalty = grossClout * MAX_HEAT_DEDUCTION_RATIO;
  return Math.min(heatPenalty, maxPenalty);
}

export function computeNetClout(grossClout: number, heat: number): number {
  const gross = Math.max(0, Math.round(grossClout));
  const penalty = computeHeatPenalty(gross, heat);
  return Math.max(0, Math.round(gross - penalty));
}

export function getCloutBreakdown(
  grossClout: number,
  heat: number,
): CloutBreakdown {
  const gross = Math.max(0, Math.round(grossClout));
  const normalizedHeat = Math.max(0, Math.round(heat));
  const penalty = Math.round(computeHeatPenalty(gross, normalizedHeat));

  return {
    gross,
    heat: normalizedHeat,
    penalty,
    net: Math.max(0, gross - penalty),
  };
}

/** @deprecated Use computeGrossClout — kept for scripts migrating off the old API */
export function aggregatePostSocialScore(stats: PostEngagementTotals): number {
  return computePostClout(stats);
}

/** @deprecated Use computeFollowerClout */
export function backfillSocialScoreFromFollowers(followers: number): number {
  return computeFollowerClout(followers);
}
