import type { Post, ReplyTone } from "@/lib/types/post";
import type { Personality } from "@/lib/types/personality";

import { simulationConfig } from "./config";
import {
  computeEngagementProbabilities,
  type EngagementProbabilityContext,
} from "./engagement-probabilities";
import { scorePostAlignment } from "./engagement-scoring";
import { getRelationshipTowardAuthor } from "./engagement-intensity";
import {
  breaksEndorsementStreak,
  decideReplyTone,
  isDisagreeTone,
  isEndorsementTone,
} from "./reply-tone";

export type { EngagementProbabilities } from "./engagement-probabilities";
export { computeEngagementProbabilities } from "./engagement-probabilities";
export {
  scorePostAlignment,
  scorePostRelevance,
  scorePostRevelatory,
} from "./engagement-scoring";

export type EngagementDecision = {
  like: boolean;
  repost: boolean;
  respond: boolean;
  responseTone: ReplyTone | null;
  follow: boolean;
  unfollow: boolean;
};

const {
  maxProbability,
  disagreeAlignmentThreshold,
  disagreeUnfollowMultiplier,
} = simulationConfig.engagement;
const replyLikeConfig = simulationConfig.replyLike;

function capProbability(value: number): number {
  return Math.min(maxProbability, value);
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

  const relationship = getRelationshipTowardAuthor(
    personality,
    post.author.personalityId,
  );

  const probabilities = computeEngagementProbabilities({
    personality,
    post,
    author,
    alreadyFollowing,
    projectedEndorsementStreak: Math.max(1, consecutiveEndorsements + 1),
    ...probabilityContext,
  });

  let respond = false;
  let responseTone: ReplyTone | null = null;

  if (roll(probabilities.respond)) {
    respond = true;
    responseTone = decideReplyTone(
      probabilities.compatibility,
      probabilities.alignment,
      personality.traits,
      relationship,
    );
  }

  const skipLike = responseTone !== null && isDisagreeTone(responseTone);

  const disagrees =
    (responseTone !== null && isDisagreeTone(responseTone)) ||
    probabilities.compatibility < disagreeAlignmentThreshold;
  let unfollowProbability =
    alreadyFollowing && disagrees ? probabilities.unfollow : 0;

  if (alreadyFollowing && responseTone !== null && isDisagreeTone(responseTone)) {
    unfollowProbability = capProbability(
      unfollowProbability * disagreeUnfollowMultiplier,
    );
  }

  const liked = !skipLike && roll(probabilities.like);
  const reposted = roll(probabilities.repost);
  const willEndorse =
    liked ||
    reposted ||
    (respond && responseTone !== null && isEndorsementTone(responseTone));

  const streakAfterAction = willEndorse ? consecutiveEndorsements + 1 : consecutiveEndorsements;

  const followProbabilities =
    willEndorse && streakAfterAction >= 1
      ? computeEngagementProbabilities({
          personality,
          post,
          author,
          alreadyFollowing,
          projectedEndorsementStreak: streakAfterAction,
          ...probabilityContext,
        })
      : probabilities;

  const followEligible =
    willEndorse && streakAfterAction >= 1 && !alreadyFollowing;

  return {
    like: liked,
    repost: reposted,
    respond,
    responseTone,
    follow:
      followEligible &&
      post.author.personalityId !== personality.id &&
      roll(followProbabilities.follow),
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
    replyLikeConfig.base +
    alignment * replyLikeConfig.alignment +
    traits.humor * replyLikeConfig.humor +
    Math.log1p(socialScore / replyLikeConfig.socialScoreDivisor) *
      replyLikeConfig.socialScoreLog +
    Math.log1p(reply.stats.likes) * replyLikeConfig.replyLikesLog;

  if (
    likedParent &&
    parentPost &&
    scorePostAlignment(reader, parentPost, parentAuthor ?? null) >
      replyLikeConfig.likedParentAlignmentThreshold
  ) {
    probability += replyLikeConfig.likedParentBonus;
  }

  return roll(probability);
}

export { breaksEndorsementStreak, isEndorsementTone };
