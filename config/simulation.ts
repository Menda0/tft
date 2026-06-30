/**
 * Central simulation tuning. Adjust values here to change tick cadence,
 * personality sampling, and engagement rates across the feed.
 *
 * Target per-read engagement (typical tick): ~21 reads, ~5 replies, ~9 likes.
 */
export const simulationConfig = {
  tick: {
    /** Minimum time between simulation ticks. */
    intervalMs: 15 * 60 * 1000,
    /** Personalities processed concurrently during a tick. */
    concurrency: 3,
    /** Fraction of eligible personalities sampled each tick. */
    personalitySampleRate: 0.1,
    /** Floor on personalities simulated per tick when enough are eligible. */
    personalityMinBatch: 10,
  },

  limits: {
    maxPostsPerPersonalityPerDay: 1,
    dailyPostWindowMs: 24 * 60 * 60 * 1000,
    trendingTopicsTtlMs: 6 * 60 * 60 * 1000,
    disagreeCooldownWindowMs: 24 * 60 * 60 * 1000,
  },

  heatDecay: {
    tickIntervalMs: 30 * 60 * 1000,
  },

  readPosts: {
    postsPerPersonality: 2,
    repliesToEvaluate: 3,
    followedAuthorWeight: 5,
    defaultAuthorWeight: 1,
    threadingPostReadBoost: 5,
    engagementScoreWeights: {
      replies: 4,
      likes: 2,
      reposts: 3,
      views: 0.05,
    },
    fameBoostDivisor: 500,
  },

  engagement: {
    maxProbability: 0.85,
    threadingEngagementBoost: 1.85,
    threadingReplyBoost: 1,
    disagreeAlignmentThreshold: 0.4,
    disagreeUnfollowMultiplier: 1.5,

    like: {
      base: 0.07,
      alignment: 0.26,
      humor: 0.015,
      followingBonus: 0.045,
    },
    repost: {
      base: 0.012,
      alignment: 0.18,
      radical: 0.015,
    },
    respondAgree: {
      base: 0.001,
      alignment: 0.012,
      followingBonus: 0.006,
    },
    respondDisagree: {
      base: 0.0008,
      misalignment: 0.012,
      followingDrag: 0.005,
    },
    follow: {
      base: 0.015,
      alignment: 0.12,
      negacionist: 0.01,
    },
    unfollow: {
      base: 0.02,
      misalignment: 0.1,
      revelatory: 0.3,
      aggression: 0.01,
      negacionist: 0.01,
    },
  },

  replyLike: {
    base: 0.022,
    alignment: 0.1,
    humor: 0.008,
    socialScoreDivisor: 500,
    socialScoreLog: 0.012,
    replyLikesLog: 0.015,
    likedParentBonus: 0.025,
    likedParentAlignmentThreshold: 0.5,
  },

  relationshipModifiers: {
    admirationAgreePerPoint: 0.005,
    trustAgreePerPoint: 0.0025,
    humorAgree: 0.008,
    wokeAgree: 0.005,
    radicalAgree: 0.0025,
    rivalryDisagreePerPoint: 0.06,
    admirationDisagreeDragPerPoint: 0.04,
    aggressionDisagree: 0.009,
    trollDisagree: 0.007,
    negacionistDisagree: 0.006,
    radicalDisagree: 0.004,
    authorHeatControversyThreshold: 80,
    authorHeatMaxPull: 0.015,
    categoryAgreeNudge: {
      ally: 0.025,
      friend: 0.025,
      admirer: 0.025,
      frenemy: 0.01,
      skeptic: -0.01,
      nemesis: -0.025,
      rival: -0.025,
      hater: -0.025,
      stranger: 0,
    },
    categoryDisagreeNudge: {
      nemesis: 0.025,
      rival: 0.025,
      hater: 0.025,
      frenemy: 0.01,
      skeptic: 0.015,
      ally: -0.025,
      friend: -0.025,
      admirer: -0.025,
      stranger: 0,
    },
  },

  optionalAction: {
    postBase: 2,
    postCreativityMultiplier: 0.12,
    lurk: 40,
    skip: 115,
  },

  endorsement: {
    consecutiveForFollow: 3,
  },

  rankNpc: {
    engageChance: 0.015,
    actionWeights: {
      like: 68,
      follow: 24,
      reply: 5,
    },
    followFallbackLikeChance: 0.55,
    replyToneAgreeChance: 0.6,
    threadingPostReadBoost: 5,
    postSelectionWeights: {
      likes: 2,
      reposts: 3,
      replies: 4,
      views: 0.05,
    },
    cloutDivisor: 500,
  },

  evolution: {
    chance: 0.15,
    controversyThreshold: 200,
    celebrityFollowersThreshold: 10000,
    highRivalryMin: 6,
    highRivalryCount: 2,
  },

  memory: {
    friendshipThreshold: 7,
  },
} as const;

export type SimulationConfig = typeof simulationConfig;
