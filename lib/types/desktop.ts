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

export type LeaderboardTab =
  | "clout-personality"
  | "clout-farmers"
  | "heat-personality"
  | "heat-farmers";

export type LeaderboardPagePayload =
  | {
      kind: "personality";
      tab: LeaderboardTab;
      entries: PersonalityLeaderboardEntry[];
      hasMore: boolean;
      updatedAt: string;
    }
  | {
      kind: "farmer";
      tab: LeaderboardTab;
      entries: FarmerLeaderboardEntry[];
      hasMore: boolean;
      updatedAt: string;
    };

export type MySocialLeaderboardEntry = {
  rank: number;
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  avatarColor: string;
  clout: number;
  socialRank: SocialRank;
  socialRankLabel: string;
};

export type MySocialPersonalityEntry = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  avatarColor: string;
  posts: number;
  reposts: number;
  replies: number;
  likes: number;
  views: number;
  clout: number;
  heat: number;
  socialRank: SocialRank;
  socialRankLabel: string;
};

export type MySocialActivityParticipant = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  avatarColor: string;
};

export type MySocialActivityItem = {
  id: string;
  personalityId: string;
  personalityName: string;
  personalityHandle: string;
  type:
    | "post"
    | "reply"
    | "repost"
    | "follow"
    | "follow_received"
    | "like_received";
  at: string;
  actor: MySocialActivityParticipant | null;
  target: MySocialActivityParticipant | null;
  preview: string | null;
};

export type MySocialPayload = {
  leaderboard: MySocialLeaderboardEntry[];
  personalities: MySocialPersonalityEntry[];
  updatedAt: string;
};

export type MySocialActivityPayload = {
  items: MySocialActivityItem[];
  hasMore: boolean;
  updatedAt: string;
};
