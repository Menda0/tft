import {
  getCompetitivePersonalityCount,
  getGlobalSocialScoreLeaderboard,
  getSocialScoreGlobalRank,
  normalizePersonality,
} from "@/lib/personalities";
import { normalizeStoredStats } from "@/lib/personalities/stats";
import { isActiveRankNpc } from "@/lib/personalities/rank-npc";
import {
  formatSocialRank,
  resolveSocialRank,
  type SocialRank,
} from "@/lib/scoring/ranks";
import type { Personality } from "@/lib/types/personality";

export type PersonalitySocialRank = {
  rank: SocialRank;
  label: string;
  globalRank: number;
  totalPersonalities: number;
};

function buildRankFromContext(
  socialScore: number,
  globalRank: number,
  totalPersonalities: number,
): PersonalitySocialRank {
  const rank = resolveSocialRank({
    socialScore,
    globalRank,
    totalPersonalities,
  });

  return {
    rank,
    label: formatSocialRank(rank),
    globalRank,
    totalPersonalities,
  };
}

export async function resolvePersonalitySocialRank(
  personality: Personality,
): Promise<PersonalitySocialRank> {
  const normalized = normalizePersonality(personality);

  if (isActiveRankNpc(normalized) && normalized.fixedSocialRank) {
    const totalPersonalities = await getCompetitivePersonalityCount();

    return {
      rank: normalized.fixedSocialRank,
      label: formatSocialRank(normalized.fixedSocialRank),
      globalRank: 0,
      totalPersonalities,
    };
  }

  const [globalRank, totalPersonalities] = await Promise.all([
    getSocialScoreGlobalRank(normalized.id),
    getCompetitivePersonalityCount(),
  ]);

  return buildRankFromContext(
    normalizeStoredStats(normalized.stats).socialScore,
    globalRank,
    totalPersonalities,
  );
}

export async function resolveSocialRanksForPersonalities(
  personalities: Personality[],
): Promise<Map<string, PersonalitySocialRank>> {
  const [leaderboard, totalPersonalities] = await Promise.all([
    getGlobalSocialScoreLeaderboard(),
    getCompetitivePersonalityCount(),
  ]);

  const globalRankById = new Map<string, number>(
    leaderboard.map((entry, index) => [entry.id, index + 1]),
  );
  const ranks = new Map<string, PersonalitySocialRank>();

  for (const personality of personalities) {
    const normalized = normalizePersonality(personality);
    const globalRank =
      globalRankById.get(normalized.id) ?? totalPersonalities;

    ranks.set(
      normalized.id,
      buildRankFromContext(
        normalizeStoredStats(normalized.stats).socialScore,
        globalRank,
        totalPersonalities,
      ),
    );
  }

  return ranks;
}

export type PersonalityListItem = Personality & {
  socialRank: SocialRank;
  socialRankLabel: string;
};

export async function attachSocialRanksToPersonalities(
  personalities: Personality[],
): Promise<PersonalityListItem[]> {
  const ranks = await resolveSocialRanksForPersonalities(personalities);

  return personalities.map((personality) => {
    const normalized = normalizePersonality(personality);
    const rankInfo = ranks.get(normalized.id);

    return {
      ...normalized,
      socialRank: rankInfo?.rank ?? "novice",
      socialRankLabel: rankInfo?.label ?? "Novice",
    };
  });
}
