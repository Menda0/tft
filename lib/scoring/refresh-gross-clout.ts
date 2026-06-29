import { aggregateSocialScoreForPersonality } from "@/lib/db/posts";
import { getPersonalityById, getPersonalitiesCollection } from "@/lib/personalities";
import { normalizeStoredStatsRaw } from "@/lib/personalities/stats";
import { isRankNpc } from "@/lib/personalities/rank-npc";
import { computeGrossClout } from "@/lib/scoring/social-score";

import type { SimulationWorld } from "@/lib/simulation/world";

async function setGrossSocialScore(
  personalityId: string,
  grossClout: number,
): Promise<void> {
  const collection = await getPersonalitiesCollection();
  await collection.updateOne(
    { id: personalityId },
    { $set: { "stats.socialScore": Math.max(0, Math.round(grossClout)) } },
  );
}

export async function refreshGrossClout(personalityId: string): Promise<number | null> {
  const personality = await getPersonalityById(personalityId);

  if (!personality || isRankNpc(personality)) {
    return null;
  }

  const rawStats = normalizeStoredStatsRaw(personality.stats);
  const totals = await aggregateSocialScoreForPersonality(personalityId);
  const grossClout = computeGrossClout(totals, rawStats.followers);

  await setGrossSocialScore(personalityId, grossClout);

  return grossClout;
}

export async function refreshGrossCloutInWorld(
  world: SimulationWorld,
  personalityId: string,
): Promise<void> {
  const grossClout = await refreshGrossClout(personalityId);

  if (grossClout == null) {
    return;
  }

  const cached = world.personalities.find((entry) => entry.id === personalityId);

  if (cached) {
    cached.stats.socialScore = grossClout;
  }
}
