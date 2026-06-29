export type SocialRank =
  | "novice"
  | "normie"
  | "regular"
  | "influencer"
  | "celebrity"
  | "icon";

export const SOCIAL_RANK_ORDER: SocialRank[] = [
  "novice",
  "normie",
  "regular",
  "influencer",
  "celebrity",
  "icon",
];

export const MIN_ICON_SCORE = 5000;
export const ICON_GLOBAL_RANK_LIMIT = 50;

const SCORE_FLOORS: Record<SocialRank, number> = {
  novice: 0,
  normie: 100,
  regular: 500,
  influencer: 2000,
  celebrity: 10000,
  icon: MIN_ICON_SCORE,
};

const INFLUENCER_PERCENTILE = 0.9;
const CELEBRITY_PERCENTILE = 0.98;

export const SOCIAL_RANK_LABELS: Record<SocialRank, string> = {
  novice: "Novice",
  normie: "Normie",
  regular: "Regular",
  influencer: "Influencer",
  celebrity: "Celebrity",
  icon: "Icon",
};

export type SocialRankContext = {
  socialScore: number;
  globalRank: number;
  totalPersonalities: number;
};

function rankFromScoreFloor(socialScore: number): SocialRank {
  if (socialScore >= SCORE_FLOORS.celebrity) {
    return "celebrity";
  }

  if (socialScore >= SCORE_FLOORS.influencer) {
    return "influencer";
  }

  if (socialScore >= SCORE_FLOORS.regular) {
    return "regular";
  }

  if (socialScore >= SCORE_FLOORS.normie) {
    return "normie";
  }

  return "novice";
}

function percentileFromRank(globalRank: number, totalPersonalities: number): number {
  if (totalPersonalities <= 1) {
    return 1;
  }

  return 1 - (globalRank - 1) / (totalPersonalities - 1);
}

function capRankByPercentile(
  rank: SocialRank,
  percentile: number,
): SocialRank {
  if (rank === "celebrity" && percentile < CELEBRITY_PERCENTILE) {
    return percentile >= INFLUENCER_PERCENTILE ? "influencer" : "regular";
  }

  if (rank === "influencer" && percentile < INFLUENCER_PERCENTILE) {
    return "regular";
  }

  return rank;
}

export function resolveSocialRank(context: SocialRankContext): SocialRank {
  const { socialScore, globalRank, totalPersonalities } = context;

  if (
    globalRank <= ICON_GLOBAL_RANK_LIMIT &&
    socialScore >= MIN_ICON_SCORE
  ) {
    return "icon";
  }

  const scoreRank = rankFromScoreFloor(socialScore);
  const percentile = percentileFromRank(globalRank, totalPersonalities);

  return capRankByPercentile(scoreRank, percentile);
}

export function formatSocialRank(rank: SocialRank): string {
  return SOCIAL_RANK_LABELS[rank];
}
