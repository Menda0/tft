export const MAX_POSTS_PER_PERSONALITY_PER_DAY = 1;
export const SIMULATION_PERSONALITY_SAMPLE_RATE = 0.1;
export const SIMULATION_PERSONALITY_MIN_BATCH = 10;
const DISAGREE_COOLDOWN_WINDOW_MS = 24 * 60 * 60 * 1000;

const DEFAULT_TRENDING_TOPICS_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_DAY_MS = 24 * 60 * 60 * 1000;

export function getTrendingTopicsTtlMs(): number {
  const raw = process.env.TRENDING_TOPICS_TTL_MS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return DEFAULT_TRENDING_TOPICS_TTL_MS;
}

export function getDailyPostWindowMs(): number {
  const raw = process.env.DAILY_POST_WINDOW_MS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return DEFAULT_DAY_MS;
}

export function getDailyPostLimit(): number {
  const raw = process.env.MAX_POSTS_PER_PERSONALITY_PER_DAY?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return MAX_POSTS_PER_PERSONALITY_PER_DAY;
}

export function startOfRollingWindow(now = Date.now()): Date {
  return new Date(now - getDailyPostWindowMs());
}

export function startOfThreadingWindow(now = Date.now()): Date {
  return new Date(now - getTrendingTopicsTtlMs());
}

export function startOfDisagreeCooldownWindow(now = Date.now()): Date {
  return new Date(now - DISAGREE_COOLDOWN_WINDOW_MS);
}

export function getSimulationPersonalitySampleRate(): number {
  const raw = process.env.SIMULATION_PERSONALITY_SAMPLE_RATE?.trim();
  const parsed = raw ? Number.parseFloat(raw) : Number.NaN;

  if (Number.isFinite(parsed) && parsed > 0 && parsed <= 1) {
    return parsed;
  }

  return SIMULATION_PERSONALITY_SAMPLE_RATE;
}

export function getSimulationMinBatchSize(): number {
  const raw = process.env.SIMULATION_PERSONALITY_MIN_BATCH?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return SIMULATION_PERSONALITY_MIN_BATCH;
}

export function getSimulationBatchSize(eligibleCount: number): number {
  if (eligibleCount <= 0) {
    return 0;
  }

  const sampled = Math.round(eligibleCount * getSimulationPersonalitySampleRate());
  const minimum = getSimulationMinBatchSize();

  return Math.min(eligibleCount, Math.max(minimum, sampled));
}
