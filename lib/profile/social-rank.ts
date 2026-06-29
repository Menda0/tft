import {
  getPersonalityCount,
  getSocialScoreGlobalRank,
  normalizePersonality,
} from "@/lib/personalities";
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

export async function resolvePersonalitySocialRank(
  personality: Personality,
): Promise<PersonalitySocialRank> {
  const normalized = normalizePersonality(personality);
  const [globalRank, totalPersonalities] = await Promise.all([
    getSocialScoreGlobalRank(normalized.id),
    getPersonalityCount(),
  ]);

  const rank = resolveSocialRank({
    socialScore: normalized.stats.socialScore,
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
