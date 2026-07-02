import type { Post } from "@/lib/types/post";
import type { ReplyTone } from "@/lib/types/post";
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
import { scoreIdeologicalCompatibility } from "./ideological-compatibility";

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
  boost: number = threadingEngagementBoost,
): number {
  if (!isThreadingPost) {
    return probability;
  }

  return probability * boost;
}

function followStreakFactor(streak: number): number {
  const normalized = Math.max(1, Math.round(streak));
  return 1 + (normalized - 1) * follow.streakBonusPerStep;
}

export type EngagementProbabilityContext = {
  personality: Personality;
  post: Post;
  author: Personality | null;
  alreadyFollowing: boolean;
  mutuallyFollowing: boolean;
  isThreadingPost?: boolean;
  recentDisagreeCount?: number;
  projectedEndorsementStreak?: number;
};

export type EngagementProbabilities = {
  like: number;
  repost: number;
  respond: number;
  respondAgree: number;
  respondDisagree: number;
  follow: number;
  unfollow: number;
  compatibility: number;
  alignment: number;
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
    projectedEndorsementStreak = 1,
  } = context;
  const alignment = scorePostAlignment(personality, post, author);
  const compatibility = scoreIdeologicalCompatibility(personality, author, post);
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
      (1 - compatibility) * respondDisagree.misalignment +
      computeDisagreeProbabilityModifiers(relationship, traits, author, category) -
      followingDisagreeDrag,
    isThreadingPost,
    threadingReplyBoost,
  );
  respondDisagreeProbability *= computeDisagreeCooldownMultiplier(
    recentDisagreeCount,
    relationship.rivalry,
  );

  const respondAgreeProbability = applyThreadingBoost(
    respondAgree.base +
      compatibility * respondAgree.alignment +
      computeAgreeProbabilityModifiers(relationship, traits, category) +
      followingAgreeBonus,
    isThreadingPost,
    threadingReplyBoost,
  );

  const respondProbability = capProbability(
    respondAgreeProbability + respondDisagreeProbability,
  );

  const revelatory = scorePostRevelatory(personality, post, author);
  const disagrees = compatibility < disagreeAlignmentThreshold;
  const unfollowProbability =
    alreadyFollowing && disagrees
      ? unfollow.base +
        (1 - compatibility) * unfollow.misalignment +
        revelatory * unfollow.revelatory +
        traits.aggression * unfollow.aggression +
        traits.negacionist * unfollow.negacionist
      : 0;

  const baseFollow = applyThreadingBoost(
    follow.base +
      compatibility * follow.alignment +
      traits.negacionist * follow.negacionist,
    isThreadingPost,
  );

  return {
    like: capProbability(
      applyThreadingBoost(
        like.base +
          compatibility * like.alignment +
          traits.humor * like.humor +
          followingLikeBonus,
        isThreadingPost,
      ),
    ),
    repost: capProbability(
      applyThreadingBoost(
        repost.base +
          compatibility * repost.alignment +
          traits.radical * repost.radical,
        isThreadingPost,
      ),
    ),
    respond: respondProbability,
    respondAgree: capProbability(respondAgreeProbability),
    respondDisagree: capProbability(respondDisagreeProbability),
    follow: capProbability(baseFollow * followStreakFactor(projectedEndorsementStreak)),
    unfollow: capProbability(unfollowProbability),
    compatibility,
    alignment,
  };
}
