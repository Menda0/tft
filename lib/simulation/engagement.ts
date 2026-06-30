import type { Post } from "@/lib/types/post";
import type { Personality } from "@/lib/types/personality";

import { CONSECUTIVE_ENDORSEMENTS_FOR_FOLLOW } from "./endorsement-streak";
import {
  computeEngagementProbabilities,
  type EngagementProbabilityContext,
} from "./engagement-probabilities";
import { scorePostAlignment } from "./engagement-scoring";

export type { EngagementProbabilities } from "./engagement-probabilities";
export { computeEngagementProbabilities } from "./engagement-probabilities";
export {
  scorePostAlignment,
  scorePostRelevance,
  scorePostRevelatory,
} from "./engagement-scoring";

export type ResponseTone = "agree" | "disagree";

export type EngagementDecision = {
  like: boolean;
  repost: boolean;
  respond: boolean;
  responseTone: ResponseTone | null;
  follow: boolean;
  unfollow: boolean;
};

const MAX_PROBABILITY = 0.85;

function capProbability(value: number): number {
  return Math.min(MAX_PROBABILITY, value);
}

function roll(probability: number): boolean {
  return Math.random() < capProbability(probability);
}

type EngagementContext = EngagementProbabilityContext & {
  consecutiveEndorsements?: number;
};

export function decideEngagement(context: EngagementContext): EngagementDecision {
  const {
    personality,
    post,
    author,
    alreadyFollowing,
    consecutiveEndorsements = 0,
    ...probabilityContext
  } = context;
  const alignment = scorePostAlignment(personality, post, author);
  const probabilities = computeEngagementProbabilities({
    personality,
    post,
    author,
    alreadyFollowing,
    ...probabilityContext,
  });

  const agreeRoll = Math.random();
  const disagreeRoll = Math.random();
  const agreeHit = agreeRoll < probabilities.respondAgree;
  const disagreeHit = disagreeRoll < probabilities.respondDisagree;

  let respond = false;
  let responseTone: ResponseTone | null = null;

  if (agreeHit && disagreeHit) {
    const agreeStrength = agreeRoll / probabilities.respondAgree;
    const disagreeStrength = disagreeRoll / probabilities.respondDisagree;
    respond = true;
    responseTone = agreeStrength <= disagreeStrength ? "agree" : "disagree";
  } else if (agreeHit) {
    respond = true;
    responseTone = "agree";
  } else if (disagreeHit) {
    respond = true;
    responseTone = "disagree";
  }

  const skipLike = responseTone === "disagree";

  const disagrees = responseTone === "disagree" || alignment < 0.4;
  let unfollowProbability =
    alreadyFollowing && disagrees ? probabilities.unfollow : 0;

  if (alreadyFollowing && responseTone === "disagree") {
    unfollowProbability = capProbability(unfollowProbability * 1.5);
  }

  const liked = !skipLike && roll(probabilities.like);
  const reposted = roll(probabilities.repost);
  const willEndorse =
    liked || reposted || (respond && responseTone === "agree");
  const followEligible =
    consecutiveEndorsements >= CONSECUTIVE_ENDORSEMENTS_FOR_FOLLOW - 1 &&
    willEndorse;

  return {
    like: liked,
    repost: reposted,
    respond,
    responseTone,
    follow:
      !alreadyFollowing &&
      post.author.personalityId !== personality.id &&
      followEligible &&
      roll(probabilities.follow),
    unfollow: roll(unfollowProbability),
  };
}

export type ReplyLikeContext = {
  reader: Personality;
  reply: Post;
  replyAuthor: Personality | null;
  parentPost?: Post;
  parentAuthor?: Personality | null;
  likedParent: boolean;
};

export function decideReplyLike(context: ReplyLikeContext): boolean {
  const { reader, reply, replyAuthor, parentPost, parentAuthor, likedParent } =
    context;

  if (reply.author.personalityId === reader.id) {
    return false;
  }

  const alignment = scorePostAlignment(reader, reply, replyAuthor);
  const traits = reader.traits;
  const socialScore = replyAuthor?.stats.socialScore ?? 0;

  let probability =
    0.025 +
    alignment * 0.12 +
    traits.humor * 0.01 +
    Math.log1p(socialScore / 500) * 0.015 +
    Math.log1p(reply.stats.likes) * 0.02;

  if (
    likedParent &&
    parentPost &&
    scorePostAlignment(reader, parentPost, parentAuthor ?? null) > 0.5
  ) {
    probability += 0.03;
  }

  return roll(probability);
}
