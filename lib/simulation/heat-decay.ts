import { saveWorldState } from "@/lib/db/world";
import { isRankNpc } from "@/lib/personalities/rank-npc";
import { decayControversy } from "@/lib/scoring/controversy";

import type { SimulationLogFn } from "./logger";
import { applyPersonalityUpdate } from "./personality-state";
import { simulationConfig } from "./config";
import type { SimulationWorld } from "./world";

export async function runHeatDecayPass(
  world: SimulationWorld,
  log: SimulationLogFn,
): Promise<void> {
  for (const personality of world.personalities) {
    if (isRankNpc(personality)) {
      continue;
    }

    const current =
      world.personalities.find((entry) => entry.id === personality.id) ??
      personality;
    const nextHeat = decayControversy(current.stats.controversy);

    if (nextHeat === current.stats.controversy) {
      continue;
    }

    const updated = await applyPersonalityUpdate(world, personality.id, {
      stats: {
        ...current.stats,
        controversy: nextHeat,
      },
    });

    if (updated) {
      log(
        "info",
        `@${personality.handle} heat decayed ${current.stats.controversy} → ${nextHeat}`,
      );
    }
  }
}

export async function heatDecayTick(
  world: SimulationWorld,
  log: SimulationLogFn,
): Promise<void> {
  log("info", "--- Heat decay tick starting ---");

  await runHeatDecayPass(world, log);

  const now = new Date();
  world.state.lastHeatDecayAt = now;

  await saveWorldState({
    lastHeatDecayAt: now,
  });

  log("success", "--- Heat decay tick complete ---");
}

export function getHeatDecayTickIntervalMs(): number {
  return simulationConfig.heatDecay.tickIntervalMs;
}

export function shouldRunHeatDecayTick(
  lastHeatDecayAt: Date | null | undefined,
  now = Date.now(),
): boolean {
  if (!lastHeatDecayAt) {
    return true;
  }

  return now - lastHeatDecayAt.getTime() >= getHeatDecayTickIntervalMs();
}
