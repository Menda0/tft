import { updatePersonality } from "@/lib/personalities";
import type { Personality } from "@/lib/types/personality";

import { simulationConfig } from "./config";
import { defaultRelationship } from "./personality-state";
import type { SimulationWorld } from "./world";

export const CONSECUTIVE_ENDORSEMENTS_FOR_FOLLOW =
  simulationConfig.endorsement.consecutiveForFollow;

export function getEndorsementStreak(
  personality: Pick<Personality, "relationships">,
  authorId: string,
): number {
  return Math.max(
    0,
    Math.round(personality.relationships[authorId]?.endorsementStreak ?? 0),
  );
}

export function canFollowAfterEndorsements(streak: number): boolean {
  return streak >= CONSECUTIVE_ENDORSEMENTS_FOR_FOLLOW;
}

export function syncWorldPersonality(
  world: SimulationWorld,
  personalityId: string,
  updated: Personality,
): void {
  const index = world.personalities.findIndex(
    (personality) => personality.id === personalityId,
  );

  if (index >= 0) {
    world.personalities[index] = updated;
  }
}

export async function persistEndorsementStreak(
  world: SimulationWorld,
  actorId: string,
  authorId: string,
  streak: number,
): Promise<number> {
  const actor =
    world.personalities.find((personality) => personality.id === actorId) ??
    null;

  if (!actor) {
    return streak;
  }

  const nextStreak = Math.max(0, Math.round(streak));
  const relationships = {
    ...(actor.relationships ?? {}),
    [authorId]: {
      ...(actor.relationships?.[authorId] ?? defaultRelationship()),
      endorsementStreak: nextStreak,
    },
  };

  const updated = await updatePersonality(actorId, { relationships });

  if (updated) {
    syncWorldPersonality(world, actorId, updated);
  }

  return nextStreak;
}

export async function recordAuthorEndorsementOutcome(
  world: SimulationWorld,
  actorId: string,
  authorId: string,
  outcome: "endorsed" | "broken",
  streakBefore: number,
): Promise<number> {
  if (outcome === "endorsed") {
    return persistEndorsementStreak(
      world,
      actorId,
      authorId,
      streakBefore + 1,
    );
  }

  if (streakBefore === 0) {
    return 0;
  }

  return persistEndorsementStreak(world, actorId, authorId, 0);
}
