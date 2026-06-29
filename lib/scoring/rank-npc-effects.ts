import type { Personality } from "@/lib/types/personality";

import { applyPersonalityUpdate } from "@/lib/simulation/personality-state";
import type { SimulationWorld } from "@/lib/simulation/world";

function milestoneMemory(npc: Personality, action: string): Personality["memory"] {
  return [
    {
      type: "milestone",
      text: `@${npc.handle} ${action}`,
      importance: 9,
    },
  ];
}

async function applyTargetMemory(
  world: SimulationWorld,
  npc: Personality,
  targetId: string,
  memoryAction: string,
): Promise<void> {
  const target = world.personalities.find((entry) => entry.id === targetId);

  if (!target) {
    return;
  }

  await applyPersonalityUpdate(world, targetId, {
    memory: milestoneMemory(npc, memoryAction),
  });
}

export async function recordRankNpcLikeEffects(
  world: SimulationWorld,
  npc: Personality,
  target: Personality,
): Promise<void> {
  await applyTargetMemory(world, npc, target.id, "liked your post");
}

export async function recordRankNpcFollowEffects(
  world: SimulationWorld,
  npc: Personality,
  target: Personality,
): Promise<void> {
  await applyTargetMemory(
    world,
    npc,
    target.id,
    "followed you",
  );
}

export async function recordRankNpcAgreeReplyEffects(
  world: SimulationWorld,
  npc: Personality,
  target: Personality,
): Promise<void> {
  await applyTargetMemory(
    world,
    npc,
    target.id,
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

  await applyPersonalityUpdate(world, target.id, {
    stats: {
      ...targetEntry.stats,
      controversy: targetEntry.stats.controversy + 15,
    },
    memory: milestoneMemory(npc, "pushed back on your post"),
  });
}
