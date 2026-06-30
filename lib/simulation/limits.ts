import { simulationConfig } from "@/lib/simulation/config";

export const MAX_POSTS_PER_PERSONALITY_PER_DAY =
  simulationConfig.limits.maxPostsPerPersonalityPerDay;
export const SIMULATION_PERSONALITY_SAMPLE_RATE =
  simulationConfig.tick.personalitySampleRate;
export const SIMULATION_PERSONALITY_MIN_BATCH =
  simulationConfig.tick.personalityMinBatch;

export function getTrendingTopicsTtlMs(): number {
  return simulationConfig.limits.trendingTopicsTtlMs;
}

export function getDailyPostWindowMs(): number {
  return simulationConfig.limits.dailyPostWindowMs;
}

export function getDailyPostLimit(): number {
  return simulationConfig.limits.maxPostsPerPersonalityPerDay;
}

export function startOfRollingWindow(now = Date.now()): Date {
  return new Date(now - getDailyPostWindowMs());
}

export function startOfThreadingWindow(now = Date.now()): Date {
  return new Date(now - getTrendingTopicsTtlMs());
}

export function startOfDisagreeCooldownWindow(now = Date.now()): Date {
  return new Date(now - simulationConfig.limits.disagreeCooldownWindowMs);
}

export function getSimulationPersonalitySampleRate(): number {
  return simulationConfig.tick.personalitySampleRate;
}

export function getSimulationMinBatchSize(): number {
  return simulationConfig.tick.personalityMinBatch;
}

export function getSimulationBatchSize(eligibleCount: number): number {
  if (eligibleCount <= 0) {
    return 0;
  }

  const sampled = Math.round(
    eligibleCount * getSimulationPersonalitySampleRate(),
  );
  const minimum = getSimulationMinBatchSize();

  return Math.min(eligibleCount, Math.max(minimum, sampled));
}
