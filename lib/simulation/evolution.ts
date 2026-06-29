import type { MemoryItem, Personality } from "@/lib/types/personality";

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
    stats.reputation = Math.min(100, stats.reputation + 5);
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

export function shouldAttemptEvolution(): boolean {
  return Math.random() < EVOLVE_CHANCE;
}
