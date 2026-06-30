import type { Post } from "@/lib/types/post";
import type { Personality } from "@/lib/types/personality";

import { classifyRelationship } from "@/lib/profile/relationship-category";

import {
  computeAgreeProbabilityModifiers,
  computeDisagreeCooldownMultiplier,
  computeDisagreeProbabilityModifiers,
  getRelationshipTowardAuthor,
} from "./engagement-intensity";
import { scorePostAlignment, scorePostRevelatory } from "./engagement-scoring";

const MAX_PROBABILITY = 0.85;
const THREADING_ENGAGEMENT_BOOST = 2.5;
const THREADING_REPLY_BOOST = 1.25;

function capProbability(value: number): number {
  return Math.min(MAX_PROBABILITY, value);
}

function applyThreadingBoost(
  probability: number,
  isThreadingPost?: boolean,
  boost = THREADING_ENGAGEMENT_BOOST,
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

  const followingLikeBonus = alreadyFollowing ? 0.08 : 0;
  const followingAgreeBonus = alreadyFollowing ? 0.012 : 0;
  const followingDisagreeDrag = alreadyFollowing ? 0.008 : 0;

  let respondDisagreeProbability = applyThreadingBoost(
    0.002 +
      (1 - alignment) * 0.035 +
      computeDisagreeProbabilityModifiers(relationship, traits, author, category) -
      followingDisagreeDrag,
    isThreadingPost,
    THREADING_REPLY_BOOST,
  );
  respondDisagreeProbability *= computeDisagreeCooldownMultiplier(
    recentDisagreeCount,
    relationship.rivalry,
  );

  const revelatory = scorePostRevelatory(personality, post, author);
  const disagrees = alignment < 0.4;
  const unfollowProbability =
    alreadyFollowing && disagrees
      ? 0.02 +
        (1 - alignment) * 0.1 +
        revelatory * 0.3 +
        traits.aggression * 0.01 +
        traits.negacionist * 0.01
      : 0;

  return {
    like: capProbability(
      applyThreadingBoost(
        0.1 + alignment * 0.35 + traits.humor * 0.02 + followingLikeBonus,
        isThreadingPost,
      ),
    ),
    repost: capProbability(
      applyThreadingBoost(
        0.012 + alignment * 0.18 + traits.radical * 0.015,
        isThreadingPost,
      ),
    ),
    respondAgree: capProbability(
      applyThreadingBoost(
        0.003 +
          alignment * 0.035 +
          computeAgreeProbabilityModifiers(relationship, traits, category) +
          followingAgreeBonus,
        isThreadingPost,
        THREADING_REPLY_BOOST,
      ),
    ),
    respondDisagree: capProbability(respondDisagreeProbability),
    follow: capProbability(
      applyThreadingBoost(
        0.015 + alignment * 0.12 + traits.negacionist * 0.01,
        isThreadingPost,
      ),
    ),
    unfollow: capProbability(unfollowProbability),
  };
}
