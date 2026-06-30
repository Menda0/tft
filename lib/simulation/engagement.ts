import type { Post } from "@/lib/types/post";
import type { Personality } from "@/lib/types/personality";

import {
  classifyRelationship,
} from "@/lib/profile/relationship-category";

import {
  computeAgreeProbabilityModifiers,
  computeDisagreeCooldownMultiplier,
  computeDisagreeProbabilityModifiers,
  getRelationshipTowardAuthor,
} from "./engagement-intensity";
import { topicsMatchInterest } from "./topics";
import { CONSECUTIVE_ENDORSEMENTS_FOR_FOLLOW } from "./endorsement-streak";

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
const THREADING_ENGAGEMENT_BOOST = 2.5;
const THREADING_REPLY_BOOST = 1.25;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function capProbability(value: number): number {
  return Math.min(MAX_PROBABILITY, value);
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function interestMatchesPost(
  interests: string[],
  post: Pick<Post, "topic" | "content">,
): number {
  if (interests.length === 0) {
    return 0;
  }

  let best = 0;
  const content = normalize(post.content);

  for (const interest of interests) {
    const normalizedInterest = normalize(interest);

    if (!normalizedInterest) {
      continue;
    }

    let score = 0;

    if (post.topic && topicsMatchInterest(post.topic, interest)) {
      score = 1;
    } else if (content.includes(normalizedInterest)) {
      score = 0.7;
    }

    best = Math.max(best, score);
  }

  return best;
}

export function scorePostRelevance(
  personality: Pick<Personality, "interests" | "relationships">,
  post: Post,
): number {
  const interestScore = interestMatchesPost(personality.interests, post);
  const relationship = personality.relationships[post.author.personalityId];
  const familiarityBoost = relationship
    ? (relationship.familiarity / 10) * 0.15
    : 0;

  return clamp01(interestScore * 0.85 + familiarityBoost);
}

export function scorePostAlignment(
  personality: Personality,
  post: Post,
  author: Personality | null,
): number {
  const interestAlignment = interestMatchesPost(personality.interests, post);

  let politicalAlignment = 0.5;

  if (author) {
    const swingGap = Math.abs(personality.politicalSwing - author.politicalSwing);
    politicalAlignment = 1 - swingGap / 20;
  }

  const relationship = personality.relationships[post.author.personalityId];
  let relationshipAlignment = 0.5;

  if (relationship) {
    relationshipAlignment =
      0.5 +
      (relationship.admiration - relationship.rivalry) / 20 +
      relationship.trust / 40;
  }

  let beliefAlignment = 0.5;
  const beliefEntries = Object.entries(personality.beliefs);

  if (beliefEntries.length > 0 && post.topic) {
    beliefAlignment = scoreBeliefAlignment(personality, post);
  }

  return clamp01(
    interestAlignment * 0.4 +
      politicalAlignment * 0.3 +
      relationshipAlignment * 0.2 +
      beliefAlignment * 0.1,
  );
}

function scoreBeliefAlignment(
  personality: Pick<Personality, "beliefs">,
  post: Pick<Post, "topic" | "content">,
): number {
  const beliefEntries = Object.entries(personality.beliefs);

  if (beliefEntries.length === 0 || !post.topic) {
    return 0.5;
  }

  const topic = normalize(post.topic);
  const content = normalize(post.content);
  let matched = 0;
  let total = 0;

  for (const [belief, strength] of beliefEntries) {
    const normalizedBelief = normalize(belief);

    if (
      topic.includes(normalizedBelief) ||
      content.includes(normalizedBelief)
    ) {
      matched += strength;
      total += 10;
    }
  }

  if (total === 0) {
    return 0.5;
  }

  return matched / total;
}

export function scorePostRevelatory(
  personality: Personality,
  post: Post,
  author: Personality | null,
): number {
  const beliefAlignment = scoreBeliefAlignment(personality, post);
  const beliefShock = beliefAlignment < 0.5 ? 1 - beliefAlignment : 0;

  let expectationBetrayal = 0;

  if (author) {
    const relationship = personality.relationships[author.id];

    if (relationship) {
      const priorPositive = (relationship.trust + relationship.admiration) / 20;
      const swingGap =
        Math.abs(personality.politicalSwing - author.politicalSwing) / 20;
      expectationBetrayal = priorPositive * swingGap;
    }
  }

  const authorShock = author
    ? (author.traits.radical / 10) * 0.5 +
      Math.min(1, author.stats.controversy / 40) * 0.5
    : 0;

  return clamp01(
    beliefShock * 0.45 + expectationBetrayal * 0.35 + authorShock * 0.2,
  );
}

type EngagementContext = {
  personality: Personality;
  post: Post;
  author: Personality | null;
  alreadyFollowing: boolean;
  mutuallyFollowing: boolean;
  isThreadingPost?: boolean;
  recentDisagreeCount?: number;
  consecutiveEndorsements?: number;
};

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

function roll(probability: number): boolean {
  return Math.random() < capProbability(probability);
}

export function decideEngagement(context: EngagementContext): EngagementDecision {
  const {
    personality,
    post,
    author,
    alreadyFollowing,
    mutuallyFollowing,
    isThreadingPost,
    recentDisagreeCount = 0,
    consecutiveEndorsements = 0,
  } = context;
  const alignment = scorePostAlignment(personality, post, author);
  const traits = personality.traits;
  const relationship = getRelationshipTowardAuthor(
    personality,
    post.author.personalityId,
  );
  const category = classifyRelationship(relationship, mutuallyFollowing);

  const likeProbability = applyThreadingBoost(
    0.1 + alignment * 0.35 + traits.humor * 0.02,
    isThreadingPost,
  );
  const repostProbability = applyThreadingBoost(
    0.025 + alignment * 0.25 + traits.radical * 0.02,
    isThreadingPost,
  );
  let respondAgreeProbability = applyThreadingBoost(
    0.003 +
      alignment * 0.035 +
      computeAgreeProbabilityModifiers(relationship, traits, category),
    isThreadingPost,
    THREADING_REPLY_BOOST,
  );
  let respondDisagreeProbability = applyThreadingBoost(
    0.002 +
      (1 - alignment) * 0.035 +
      computeDisagreeProbabilityModifiers(relationship, traits, author, category),
    isThreadingPost,
    THREADING_REPLY_BOOST,
  );
  respondDisagreeProbability *= computeDisagreeCooldownMultiplier(
    recentDisagreeCount,
    relationship.rivalry,
  );
  const followProbability = applyThreadingBoost(
    0.015 + alignment * 0.12 + traits.negacionist * 0.01,
    isThreadingPost,
  );

  const agreeRoll = Math.random();
  const disagreeRoll = Math.random();
  const agreeHit = agreeRoll < capProbability(respondAgreeProbability);
  const disagreeHit = disagreeRoll < capProbability(respondDisagreeProbability);

  let respond = false;
  let responseTone: ResponseTone | null = null;

  if (agreeHit && disagreeHit) {
    const agreeStrength = agreeRoll / respondAgreeProbability;
    const disagreeStrength = disagreeRoll / respondDisagreeProbability;
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

  const revelatory = scorePostRevelatory(personality, post, author);
  const disagrees = responseTone === "disagree" || alignment < 0.4;
  const unfollowProbability =
    alreadyFollowing && disagrees
      ? 0.02 +
        (1 - alignment) * 0.1 +
        revelatory * 0.3 +
        traits.aggression * 0.01 +
        traits.negacionist * 0.01
      : 0;

  const liked = !skipLike && roll(likeProbability);
  const reposted = roll(repostProbability);
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
      roll(followProbability),
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
