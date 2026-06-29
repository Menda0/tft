import type { SocialRank } from "@/lib/scoring/ranks";

export type ThreadingTopicParticipant = {
  name: string;
  handle: string;
  avatarUrl: string | null;
  avatarColor: string;
  postCount: number;
};

export type ThreadingTopic = {
  topic: string;
  postCount: number;
  participantCount: number;
  participants: ThreadingTopicParticipant[];
};

export type ThreadingTopicsPayload = {
  topics: ThreadingTopic[];
  updatedAt: string | null;
};

export type PersonalityLeaderboardEntry = {
  rank: number;
  id: string;
  name: string;
  handle: string;
  ownerUsername: string;
  avatarUrl: string | null;
  avatarColor: string;
  score: number;
  socialRank: SocialRank;
  socialRankLabel: string;
};

export type FarmerLeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  score: number;
  botCount: number;
};

export type LeaderboardsPayload = {
  personalitiesByClout: PersonalityLeaderboardEntry[];
  farmersByClout: FarmerLeaderboardEntry[];
  personalitiesByHeat: PersonalityLeaderboardEntry[];
  farmersByHeat: FarmerLeaderboardEntry[];
  updatedAt: string;
};
