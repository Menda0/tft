export type TrendingTopic = {
  topic: string;
  fetchedAt: Date;
};

export type WorldState = {
  id: "global";
  tickNumber: number;
  lastTickAt: Date | null;
  trendingTopics: TrendingTopic[];
  isRunning: boolean;
};

export type ActionType = "post" | "reply" | "repost" | "lurk" | "follow";
