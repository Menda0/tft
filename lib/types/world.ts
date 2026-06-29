export type TrendingTopic = {
  topic: string;
  fetchedAt: Date;
};

export type WorldState = {
  id: "global";
  tickNumber: number;
  lastTickAt: Date | null;
  trendingTopics: TrendingTopic[];
  trendingTopicsUpdatedAt: Date | null;
  isRunning: boolean;
  lastRankNpcSeedAt: Date | null;
  rankNpcSeedInProgress: boolean;
};

export type ActionType = "post" | "lurk";
