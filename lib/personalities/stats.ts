import { defaultStats } from "@/lib/personalities/validation";
import { computeNetClout } from "@/lib/scoring/social-score";
import type { Stats } from "@/lib/types/personality";

type StoredStats = Stats & { reputation?: number | null };

function toFiniteNumber(value: unknown, fallback = 0): number {
  if (value == null) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseGrossSocialScore(raw: StoredStats): number {
  if (raw.socialScore != null) {
    return toFiniteNumber(raw.socialScore);
  }

  if (raw.reputation != null) {
    return Math.round(toFiniteNumber(raw.reputation) * 10);
  }

  return 0;
}

export function normalizeStoredStatsRaw(stats: Stats | undefined): Stats {
  const raw = (stats ?? defaultStats()) as StoredStats;

  return {
    followers: Math.max(0, Math.round(toFiniteNumber(raw.followers))),
    socialScore: Math.max(0, Math.round(parseGrossSocialScore(raw))),
    controversy: Math.max(0, Math.round(toFiniteNumber(raw.controversy))),
    creativity: Math.min(
      100,
      Math.max(0, Math.round(toFiniteNumber(raw.creativity, 50))),
    ),
  };
}

export function normalizeStoredStats(stats: Stats | undefined): Stats {
  const raw = normalizeStoredStatsRaw(stats);

  return {
    ...raw,
    socialScore: computeNetClout(raw.socialScore, raw.controversy),
  };
}

export function formatStatValue(value: number | null | undefined): string {
  return Math.max(0, Math.round(toFiniteNumber(value))).toLocaleString();
}
