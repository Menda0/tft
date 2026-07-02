import { aggregateAiUsageSince } from "@/lib/db/ai-usage";
import {
  countAllOriginalPostsSince,
  countAllRepliesSince,
  countAllRepostsSince,
  countRepliesByToneSince,
  sumLikesOnPostsCreatedSince,
} from "@/lib/db/posts";
import { countPostReadsSince } from "@/lib/db/post-reads";
import { sumTickUnfollowsSince } from "@/lib/db/tick-results";
import { getUserCount } from "@/lib/db/users";
import { getWorldState } from "@/lib/db/world";
import { getActivePersonalityCount } from "@/lib/personalities";
import type { AiUsageSummary } from "@/lib/types/ai-usage";

export type DashboardRange = 7 | 30 | 90;

export type AdminDashboardData = {
  range: {
    days: DashboardRange;
    since: string;
    until: string;
  };
  aiUsage: AiUsageSummary;
  platform: {
    totalPosts: number;
    totalReplies: number;
    totalReposts: number;
    totalViews: number;
    totalLikes: number;
    agreeReplies: number;
    neutralReplies: number;
    disagreeReplies: number;
    unfollows: number;
    totalPlayers: number;
    totalPersonalities: number;
    totalTicks: number;
  };
};

export function parseDashboardRange(value: string | null): DashboardRange {
  if (value === "30d") {
    return 30;
  }

  if (value === "90d") {
    return 90;
  }

  return 7;
}

function rangeSince(days: DashboardRange, until = new Date()): Date {
  return new Date(until.getTime() - days * 24 * 60 * 60 * 1000);
}

export async function buildAdminDashboard(
  days: DashboardRange,
): Promise<AdminDashboardData> {
  const until = new Date();
  const since = rangeSince(days, until);

  const [
    aiUsage,
    totalPosts,
    totalReplies,
    totalReposts,
    totalViews,
    totalLikes,
    replyToneCounts,
    unfollows,
    totalPlayers,
    totalPersonalities,
    worldState,
  ] = await Promise.all([
    aggregateAiUsageSince(since),
    countAllOriginalPostsSince(since),
    countAllRepliesSince(since),
    countAllRepostsSince(since),
    countPostReadsSince(since),
    sumLikesOnPostsCreatedSince(since),
    countRepliesByToneSince(since),
    sumTickUnfollowsSince(since),
    getUserCount(),
    getActivePersonalityCount(),
    getWorldState(),
  ]);

  return {
    range: {
      days,
      since: since.toISOString(),
      until: until.toISOString(),
    },
    aiUsage,
    platform: {
      totalPosts,
      totalReplies,
      totalReposts,
      totalViews,
      totalLikes,
      agreeReplies: replyToneCounts.agreeReplies,
      neutralReplies: replyToneCounts.neutralReplies,
      disagreeReplies: replyToneCounts.disagreeReplies,
      unfollows,
      totalPlayers,
      totalPersonalities,
      totalTicks: worldState.tickNumber,
    },
  };
}
