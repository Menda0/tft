import type { Post } from "@/lib/types/post";
import type { Personality } from "@/lib/types/personality";

import { classifyRelationship } from "@/lib/profile/relationship-category";

import { simulationConfig } from "./config";
import {
  computeAgreeProbabilityModifiers,
  computeDisagreeCooldownMultiplier,
  computeDisagreeProbabilityModifiers,
  getRelationshipTowardAuthor,
} from "./engagement-intensity";
import { scorePostAlignment, scorePostRevelatory } from "./engagement-scoring";

const {
  maxProbability,
  threadingEngagementBoost,
  threadingReplyBoost,
  disagreeAlignmentThreshold,
  like,
  repost,
  respondAgree,
  respondDisagree,
  follow,
  unfollow,
} = simulationConfig.engagement;

function capProbability(value: number): number {
  return Math.min(maxProbability, value);
}

function applyThreadingBoost(
  probability: number,
  isThreadingPost?: boolean,
  boost = threadingEngagementBoost,
): number {
  if (!isThreadingPost) {
    return probability;
  }

  return probability * boost;
}

export type EngagementProbabilityContext = {
  personality: Personality;
  post: Post;
  author: Personality | null;
  alreadyFollowing: boolean;
  mutuallyFollowing: boolean;
  isThreadingPost?: boolean;
  recentDisagreeCount?: number;
};

export type EngagementProbabilities = {
  like: number;
  repost: number;
  respondAgree: number;
  respondDisagree: number;
  follow: number;
  unfollow: number;
};

export function computeEngagementProbabilities(
  context: EngagementProbabilityContext,
): EngagementProbabilities {
  const {
    personality,
    post,
    author,
    alreadyFollowing,
    mutuallyFollowing,
    isThreadingPost,
    recentDisagreeCount = 0,
  } = context;
  const alignment = scorePostAlignment(personality, post, author);
  const traits = personality.traits;
  const relationship = getRelationshipTowardAuthor(
    personality,
    post.author.personalityId,
  );
  const category = classifyRelationship(relationship, mutuallyFollowing);

  const followingLikeBonus = alreadyFollowing ? like.followingBonus : 0;
  const followingAgreeBonus = alreadyFollowing ? respondAgree.followingBonus : 0;
  const followingDisagreeDrag = alreadyFollowing
    ? respondDisagree.followingDrag
    : 0;

  let respondDisagreeProbability = applyThreadingBoost(
    respondDisagree.base +
      (1 - alignment) * respondDisagree.misalignment +
      computeDisagreeProbabilityModifiers(relationship, traits, author, category) -
      followingDisagreeDrag,
    isThreadingPost,
    threadingReplyBoost,
  );
  respondDisagreeProbability *= computeDisagreeCooldownMultiplier(
    recentDisagreeCount,
    relationship.rivalry,
  );

  const revelatory = scorePostRevelatory(personality, post, author);
  const disagrees = alignment < disagreeAlignmentThreshold;
  const unfollowProbability =
    alreadyFollowing && disagrees
      ? unfollow.base +
        (1 - alignment) * unfollow.misalignment +
        revelatory * unfollow.revelatory +
        traits.aggression * unfollow.aggression +
        traits.negacionist * unfollow.negacionist
      : 0;

  return {
    like: capProbability(
      applyThreadingBoost(
        like.base +
          alignment * like.alignment +
          traits.humor * like.humor +
          followingLikeBonus,
        isThreadingPost,
      ),
    ),
    repost: capProbability(
      applyThreadingBoost(
        repost.base +
          alignment * repost.alignment +
          traits.radical * repost.radical,
        isThreadingPost,
      ),
    ),
    respondAgree: capProbability(
      applyThreadingBoost(
        respondAgree.base +
          alignment * respondAgree.alignment +
          computeAgreeProbabilityModifiers(relationship, traits, category) +
          followingAgreeBonus,
        isThreadingPost,
        threadingReplyBoost,
      ),
    ),
    respondDisagree: capProbability(respondDisagreeProbability),
    follow: capProbability(
      applyThreadingBoost(
        follow.base +
          alignment * follow.alignment +
          traits.negacionist * follow.negacionist,
        isThreadingPost,
      ),
    ),
    unfollow: capProbability(unfollowProbability),
  };
}
