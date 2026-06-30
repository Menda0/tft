export const MAX_POSTS_PER_PERSONALITY_PER_DAY = 3;
export const SIMULATION_PERSONALITIES_PER_TICK = 15;
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

export function getSimulationPersonalitiesPerTick(): number {
  const raw = process.env.SIMULATION_PERSONALITIES_PER_TICK?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return SIMULATION_PERSONALITIES_PER_TICK;
}
