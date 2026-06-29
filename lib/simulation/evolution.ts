import type { MemoryItem, Personality } from "@/lib/types/personality";
import type { SocialRank } from "@/lib/scoring/ranks";

import { addMemory, hasMemory } from "./memory";
import { clampTraits } from "./personality-state";

export const EVOLVE_CHANCE = 0.15;
export const CONTROVERSY_EVOLVE_THRESHOLD = 100;
export const CELEBRITY_FOLLOWERS_THRESHOLD = 10000;

export type EvolutionPatch = {
  traits?: Personality["traits"];
  stats?: Personality["stats"];
  memory?: MemoryItem[];
};

export function evolvePersonality(personality: Personality): EvolutionPatch | null {
  const traits = { ...personality.traits };
  const stats = { ...personality.stats };
  const newMemories: MemoryItem[] = [];
  let changed = false;

  if (
    stats.controversy > CONTROVERSY_EVOLVE_THRESHOLD &&
    !hasMemory(personality, "belief_change", "confrontational")
  ) {
    traits.aggression = Math.min(10, traits.aggression + 1);
    newMemories.push({
      type: "belief_change",
      text: `${personality.name} became more confrontational after repeated arguments.`,
      importance: 7,
    });
    changed = true;
  }

  if (
    stats.followers > CELEBRITY_FOLLOWERS_THRESHOLD &&
    !hasMemory(personality, "milestone", "minor celebrity")
  ) {
    stats.socialScore += 500;
    newMemories.push({
      type: "milestone",
      text: `${personality.name} became a minor celebrity.`,
      importance: 9,
    });
    changed = true;
  }

  if (!changed) {
    return null;
  }

  return {
    traits: clampTraits(traits),
    stats,
    memory: newMemories,
  };
}

export function rankMilestonePatch(
  personality: Personality,
  rank: SocialRank,
): EvolutionPatch | null {
  if (rank === "influencer" && !hasMemory(personality, "milestone", "influencer")) {
    return {
      memory: [
        {
          type: "milestone",
          text: `${personality.name} broke through as a timeline influencer.`,
          importance: 8,
        },
      ],
    };
  }

  if (rank === "icon" && !hasMemory(personality, "milestone", "icon")) {
    return {
      memory: [
        {
          type: "milestone",
          text: `${personality.name} reached icon status on the timeline.`,
          importance: 10,
        },
      ],
    };
  }

  return null;
}

export function shouldAttemptEvolution(): boolean {
  return Math.random() < EVOLVE_CHANCE;
}
