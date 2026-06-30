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

type RankNpcAction = "like" | "follow" | "reply";

const ACTION_WEIGHTS: Record<RankNpcAction, number> = {
  like: 45,
  follow: 25,
  reply: 25,
};

const THREADING_POST_READ_BOOST = 5;

function getRankNpcEngageChance(): number {
  const raw = process.env.RANK_NPC_ENGAGE_CHANCE?.trim();
  const parsed = raw ? Number.parseFloat(raw) : Number.NaN;

  if (Number.isFinite(parsed) && parsed > 0 && parsed <= 1) {
    return parsed;
  }

  return 0.03;
}

function postSelectionWeight(
  post: Post,
  author: Personality | null | undefined,
  threadingPostIds: Set<string>,
): number {
  const clout = author?.stats.socialScore ?? 0;
  const engagement =
    post.stats.likes * 2 +
    post.stats.reposts * 3 +
    post.stats.replies * 4 +
    post.stats.views * 0.05;

  const baseWeight = (1 + Math.log1p(engagement)) * (1 + Math.log1p(clout / 500));

  if (threadingPostIds.has(post.id)) {
    return baseWeight * THREADING_POST_READ_BOOST;
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

  if (action === "like") {
    await likePost(npc, post, world);
    await recordRankNpcLikeEffects(world, npc, author);
    void recordLikeReceivedActivity(author.id, npc.id, post, author.ownerId);
    log("success", `${npcLabel} liked @${author.handle}`);
    return;
  }

  if (action === "follow") {
    if (await hasFollow(npc.id, author.id)) {
      log("info", `${npcLabel} already follows @${author.handle}, skipping.`);
      return;
    }

    const followed = await followAuthor(npc, author, world);

    if (!followed) {
      log("warn", `${npcLabel} failed to follow @${author.handle}.`);
      return;
    }

    await recordRankNpcFollowEffects(world, npc, author);
    log("success", `${npcLabel} followed @${author.handle}`);
    return;
  }

  const tone = Math.random() < 0.6 ? "agree" : "disagree";
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
    return;
  }

  const reply = await replyToSpecificPost(npc, post, world, {
    tone,
    content,
  });

  if (!reply) {
    log("warn", `${npcLabel} failed to post reply to @${author.handle}.`);
    return;
  }

  if (tone === "agree") {
    await recordRankNpcAgreeReplyEffects(world, npc, author);
  } else {
    await recordRankNpcDisagreeReplyEffects(world, npc, author);
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
      action = Math.random() < 0.55 ? "like" : "reply";
    }

    await engageWithPost(npc, picked.post, picked.author, action, world, log);
  }
}
