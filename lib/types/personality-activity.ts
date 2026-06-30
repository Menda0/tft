export type PersonalityActivityType =
  | "post"
  | "reply"
  | "repost"
  | "follow"
  | "follow_received"
  | "like_received";

export type PersonalityActivity = {
  id: string;
  personalityId: string;
  ownerId?: string;
  type: PersonalityActivityType;
  at: Date;
  actorPersonalityId?: string;
  targetPersonalityId?: string;
  postId?: string;
  preview?: string;
};
