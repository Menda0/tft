import type { Personality } from "@/lib/types/personality";

import { applyPersonalityUpdate } from "@/lib/simulation/personality-state";
import type { SimulationWorld } from "@/lib/simulation/world";

export type RankNpcEffectEvent =
  | "rank_npc_like"
  | "rank_npc_follow"
  | "rank_npc_agree"
  | "rank_npc_disagree";

const BASE_DELTAS: Record<RankNpcEffectEvent, number> = {
  rank_npc_like: 150,
  rank_npc_follow: 300,
  rank_npc_agree: 250,
  rank_npc_disagree: -120,
};

function fameMultiplier(npc: Pick<Personality, "stats">): number {
  const followers = Math.max(1, npc.stats.followers);
  return 1 + Math.log10(followers / 100);
}

export function computeRankNpcSocialScoreDelta(
  event: RankNpcEffectEvent,
  npc: Personality,
): number {
  const base = BASE_DELTAS[event];

  if (base < 0) {
    return Math.round(base * fameMultiplier(npc));
  }

  return Math.round(base * fameMultiplier(npc));
}

function milestoneMemory(npc: Personality, action: string): Personality["memory"] {
  return [
    {
      type: "milestone",
      text: `@${npc.handle} ${action}`,
      importance: 9,
    },
  ];
}

async function applyTargetBoost(
  world: SimulationWorld,
  npc: Personality,
  targetId: string,
  event: RankNpcEffectEvent,
  memoryAction: string,
): Promise<void> {
  const target = world.personalities.find((entry) => entry.id === targetId);

  if (!target) {
    return;
  }

  const socialScoreDelta = computeRankNpcSocialScoreDelta(event, npc);

  await applyPersonalityUpdate(world, targetId, {
    stats: {
      ...target.stats,
      socialScore: Math.max(0, target.stats.socialScore + socialScoreDelta),
    },
    memory: milestoneMemory(npc, memoryAction),
  });
}

export async function recordRankNpcLikeEffects(
  world: SimulationWorld,
  npc: Personality,
  target: Personality,
): Promise<void> {
  await applyTargetBoost(world, npc, target.id, "rank_npc_like", "liked your post");
}

export async function recordRankNpcFollowEffects(
  world: SimulationWorld,
  npc: Personality,
  target: Personality,
): Promise<void> {
  await applyTargetBoost(
    world,
    npc,
    target.id,
    "rank_npc_follow",
    "followed you",
  );
}

export async function recordRankNpcAgreeReplyEffects(
  world: SimulationWorld,
  npc: Personality,
  target: Personality,
): Promise<void> {
  await applyTargetBoost(
    world,
    npc,
    target.id,
    "rank_npc_agree",
    "replied in support of your post",
  );
}

export async function recordRankNpcDisagreeReplyEffects(
  world: SimulationWorld,
  npc: Personality,
  target: Personality,
): Promise<void> {
  const targetEntry = world.personalities.find((entry) => entry.id === target.id);

  if (!targetEntry) {
    return;
  }

  const socialScoreDelta = computeRankNpcSocialScoreDelta(
    "rank_npc_disagree",
    npc,
  );

  await applyPersonalityUpdate(world, target.id, {
    stats: {
      ...targetEntry.stats,
      socialScore: Math.max(0, targetEntry.stats.socialScore + socialScoreDelta),
      controversy: targetEntry.stats.controversy + 15,
    },
    memory: milestoneMemory(npc, "pushed back on your post"),
  });
}
