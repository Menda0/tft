import { countMirroredPostsByPersonality } from "@/lib/db/posts";
import { getAllRankNpcs, normalizePersonality } from "@/lib/personalities";
import { getRankNpcRealName } from "@/lib/personalities/rank-npc";

import type { SocialRank } from "@/lib/scoring/ranks";

export type RankNpcAdminItem = {
  id: string;
  name: string;
  handle: string;
  realName: string;
  xHandle: string;
  fixedSocialRank: SocialRank | null;
  rankNpcActive: boolean;
  avatarStatus: string;
  descriptionStatus: string;
  avatarUrl: string | null;
  mirroredPostCount: number;
  lastSyncedAt: string | null;
  lastSyncedTweetId: string | null;
};

export async function listRankNpcsForAdmin(): Promise<RankNpcAdminItem[]> {
  const personalities = await getAllRankNpcs();
  const items: RankNpcAdminItem[] = [];

  for (const personality of personalities) {
    const normalized = normalizePersonality(personality);
    const mirroredPostCount = await countMirroredPostsByPersonality(
      normalized.id,
    );

    items.push({
      id: normalized.id,
      name: normalized.name,
      handle: normalized.handle,
      realName: getRankNpcRealName(normalized),
      xHandle: normalized.xSync?.xHandle ?? "",
      fixedSocialRank: normalized.fixedSocialRank ?? null,
      rankNpcActive: normalized.rankNpcActive !== false,
      avatarStatus: normalized.avatarStatus,
      descriptionStatus: normalized.descriptionStatus,
      avatarUrl: normalized.avatarUrl,
      mirroredPostCount,
      lastSyncedAt: normalized.xSync?.lastSyncedAt
        ? normalized.xSync.lastSyncedAt.toISOString()
        : null,
      lastSyncedTweetId: normalized.xSync?.lastSyncedTweetId ?? null,
    });
  }

  items.sort((left, right) => left.name.localeCompare(right.name));

  return items;
}
