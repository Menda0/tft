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
