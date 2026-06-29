import type { Personality } from "@/lib/types/personality";

export type SocialScoreEvent =
  | "like_received"
  | "repost_received"
  | "follow_received"
  | "agree_reply_on_post"
  | "agree_reply_written"
  | "unfollow_after_conflict"
  | "disagree_reply_on_post";

const BASE_DELTAS: Record<SocialScoreEvent, number> = {
  like_received: 2,
  repost_received: 5,
  follow_received: 10,
  agree_reply_on_post: 8,
  agree_reply_written: 3,
  unfollow_after_conflict: -12,
  disagree_reply_on_post: -2,
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

export function aggregatePostSocialScore(stats: {
  likes: number;
  reposts: number;
  replies: number;
}): number {
  return stats.likes * 2 + stats.reposts * 5 + stats.replies * 8;
}

export function backfillSocialScoreFromFollowers(followers: number): number {
  return followers * 10;
}
