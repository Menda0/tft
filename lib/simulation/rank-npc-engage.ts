import { getTopLevelOriginalPostsSince } from "@/lib/db/posts";
import { hasFollow } from "@/lib/db/follows";
import { getActiveRankNpcs } from "@/lib/personalities";
import {
  getRankNpcRealName,
  isActiveRankNpc,
  isRankNpc,
} from "@/lib/personalities/rank-npc";
import { generateRankNpcReply } from "@/lib/openai/rank-npc-reply";
import { recordLikeReceivedActivity } from "@/lib/personality-activity/record";
import { resolvePersonalitySocialRank } from "@/lib/profile/social-rank";
import {
  recordRankNpcAgreeReplyEffects,
  recordRankNpcDisagreeReplyEffects,
  recordRankNpcFollowEffects,
  recordRankNpcLikeEffects,
} from "@/lib/scoring/rank-npc-effects";
import { isAtLeastInfluencer } from "@/lib/scoring/ranks";
import type { Post } from "@/lib/types/post";
import type { Personality } from "@/lib/types/personality";

import { throwIfCancelled } from "./cancel";
import { startOfRollingWindow } from "./limits";
import { truncateForLog, type SimulationLogFn } from "./logger";
import {
  followAuthor,
  likePost,
  replyToSpecificPost,
} from "./posts";
import type { SimulationWorld } from "./world";
import { weightedRandom, weightedSampleWithoutReplacement } from "./utils";
import { recordTickStat } from "./tick-stats";
import { threadingLowViewBoost } from "@/lib/feed/threading-discovery";
import { simulationConfig } from "./config";
import {
  canFollowAfterEndorsements,
  getEndorsementStreak,
  persistEndorsementStreak,
  recordAuthorEndorsementOutcome,
} from "./endorsement-streak";

type RankNpcAction = "like" | "follow" | "reply";

const rankNpcConfig = simulationConfig.rankNpc;
const ACTION_WEIGHTS: Record<RankNpcAction, number> = rankNpcConfig.actionWeights;
const THREADING_POST_READ_BOOST = rankNpcConfig.threadingPostReadBoost;

function getRankNpcEngageChance(): number {
  return rankNpcConfig.engageChance;
}

function postSelectionWeight(
  post: Post,
  author: Personality | null | undefined,
  threadingPostIds: Set<string>,
): number {
  const clout = author?.stats.socialScore ?? 0;
  const weights = rankNpcConfig.postSelectionWeights;
  const engagement =
    post.stats.likes * weights.likes +
    post.stats.reposts * weights.reposts +
    post.stats.replies * weights.replies +
    post.stats.views * weights.views;

  const baseWeight =
    (1 + Math.log1p(engagement)) *
    (1 + Math.log1p(clout / rankNpcConfig.cloutDivisor));

  if (threadingPostIds.has(post.id)) {
    return (
      baseWeight *
      THREADING_POST_READ_BOOST *
      threadingLowViewBoost(post.stats.views)
    );
  }

  return baseWeight;
}

function findAuthor(
  world: SimulationWorld,
  personalityId: string,
): Personality | null {
  return (
    world.personalities.find((personality) => personality.id === personalityId) ??
    null
  );
}

async function buildEligiblePosts(
  world: SimulationWorld,
): Promise<Array<{ post: Post; author: Personality }>> {
  const since = startOfRollingWindow();
  const candidates = await getTopLevelOriginalPostsSince(since);
  const eligible: Array<{ post: Post; author: Personality }> = [];

  for (const post of candidates) {
    const author = findAuthor(world, post.author.personalityId);

    if (!author || isRankNpc(author)) {
      continue;
    }

    const { rank } = await resolvePersonalitySocialRank(author);

    if (!isAtLeastInfluencer(rank)) {
      continue;
    }

    eligible.push({ post, author });
  }

  return eligible;
}

function pickAction(): RankNpcAction {
  return weightedRandom(ACTION_WEIGHTS);
}

async function maybeNpcFollowAfterEndorsements(
  npc: Personality,
  author: Personality,
  world: SimulationWorld,
  log: SimulationLogFn,
  npcLabel: string,
  endorsementStreak: number,
): Promise<void> {
  if (
    !canFollowAfterEndorsements(endorsementStreak) ||
    (await hasFollow(npc.id, author.id))
  ) {
    return;
  }

  const followed = await followAuthor(npc, author, world);

  if (!followed) {
    log("warn", `${npcLabel} failed to follow @${author.handle}.`);
    return;
  }

  await recordRankNpcFollowEffects(world, npc, author);
  await persistEndorsementStreak(world, npc.id, author.id, 0);
  recordTickStat(world.tickStats, "follows");
  log(
    "success",
    `${npcLabel} followed @${author.handle} after ${endorsementStreak} consecutive endorsements`,
  );
}

async function engageWithPost(
  npc: Personality,
  post: Post,
  author: Personality,
  action: RankNpcAction,
  world: SimulationWorld,
  log: SimulationLogFn,
): Promise<void> {
  const realName = getRankNpcRealName(npc);
  const npcLabel = `@${npc.handle} (as ${realName})`;
  const streakBefore = getEndorsementStreak(npc, author.id);

  if (action === "follow") {
    if (await hasFollow(npc.id, author.id)) {
      log("info", `${npcLabel} already follows @${author.handle}, skipping.`);
      return;
    }

    if (!canFollowAfterEndorsements(streakBefore)) {
      action = "like";
    } else {
      await maybeNpcFollowAfterEndorsements(
        npc,
        author,
        world,
        log,
        npcLabel,
        streakBefore,
      );
      return;
    }
  }

  if (action === "like") {
    await likePost(npc, post, world);
    await recordRankNpcLikeEffects(world, npc, author);
    recordTickStat(world.tickStats, "likes");
    void recordLikeReceivedActivity(author.id, npc.id, post, author.ownerId);
    log("success", `${npcLabel} liked @${author.handle}`);

    const endorsementStreak = await recordAuthorEndorsementOutcome(
      world,
      npc.id,
      author.id,
      "endorsed",
      streakBefore,
    );
    await maybeNpcFollowAfterEndorsements(
      npc,
      author,
      world,
      log,
      npcLabel,
      endorsementStreak,
    );
    return;
  }

  const tone =
    Math.random() < rankNpcConfig.replyToneAgreeChance ? "agree" : "disagree";
  log(
    "info",
    `${npcLabel} ${tone === "agree" ? "agreeing with" : "pushing back on"} @${author.handle}...`,
  );

  let content: string;

  try {
    content = await generateRankNpcReply(npc, post, tone);
  } catch (error) {
    console.error(`Rank NPC reply failed for ${npc.handle}:`, error);
    log("warn", `${npcLabel} failed to reply to @${author.handle}.`);
    await recordAuthorEndorsementOutcome(
      world,
      npc.id,
      author.id,
      "broken",
      streakBefore,
    );
    return;
  }

  const reply = await replyToSpecificPost(npc, post, world, {
    tone,
    content,
  });

  if (!reply) {
    log("warn", `${npcLabel} failed to post reply to @${author.handle}.`);
    await recordAuthorEndorsementOutcome(
      world,
      npc.id,
      author.id,
      "broken",
      streakBefore,
    );
    return;
  }

  recordTickStat(world.tickStats, "replies");

  if (tone === "agree") {
    recordTickStat(world.tickStats, "agreeReplies");
    await recordRankNpcAgreeReplyEffects(world, npc, author);
    const endorsementStreak = await recordAuthorEndorsementOutcome(
      world,
      npc.id,
      author.id,
      "endorsed",
      streakBefore,
    );
    await maybeNpcFollowAfterEndorsements(
      npc,
      author,
      world,
      log,
      npcLabel,
      endorsementStreak,
    );
  } else {
    recordTickStat(world.tickStats, "disagreeReplies");
    await recordRankNpcDisagreeReplyEffects(world, npc, author);
    await recordAuthorEndorsementOutcome(
      world,
      npc.id,
      author.id,
      "broken",
      streakBefore,
    );
  }

  log(
    "success",
    `${npcLabel} ${tone === "agree" ? "agreed with" : "pushed back on"} @${author.handle}: ${truncateForLog(reply.content)}`,
  );
}

export async function rankNpcEngagementPass(
  world: SimulationWorld,
  log: SimulationLogFn = () => {},
  signal?: AbortSignal,
): Promise<void> {
  const npcs =
    world.personalities.filter(isActiveRankNpc).length > 0
      ? world.personalities.filter(isActiveRankNpc)
      : await getActiveRankNpcs();

  if (npcs.length === 0) {
    return;
  }

  const eligiblePosts = await buildEligiblePosts(world);

  if (eligiblePosts.length === 0) {
    log("info", "No influencer+ player posts available for rank NPC engagement.");
    return;
  }

  const chance = getRankNpcEngageChance();
  log(
    "info",
    `Rank NPC engagement pass: ${npcs.length} NPCs, ${eligiblePosts.length} eligible posts.`,
  );

  for (const npc of npcs) {
    throwIfCancelled(signal);

    if (Math.random() >= chance) {
      continue;
    }

    const [picked] = weightedSampleWithoutReplacement(
      eligiblePosts,
      1,
      (entry) =>
        postSelectionWeight(entry.post, entry.author, world.threadingPostIds),
    );

    if (!picked) {
      continue;
    }

    let action = pickAction();

    if (action === "follow" && (await hasFollow(npc.id, picked.author.id))) {
      action =
        Math.random() < rankNpcConfig.followFallbackLikeChance ? "like" : "reply";
    }

    await engageWithPost(npc, picked.post, picked.author, action, world, log);
  }
}
