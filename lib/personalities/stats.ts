import { defaultStats } from "@/lib/personalities/validation";
import type { Stats } from "@/lib/types/personality";

type StoredStats = Stats & { reputation?: number | null };

function toFiniteNumber(value: unknown, fallback = 0): number {
  if (value == null) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeStoredStats(stats: Stats | undefined): Stats {
  const raw = (stats ?? defaultStats()) as StoredStats;
  const legacyReputation = raw.reputation;
  const socialScore =
    raw.socialScore != null
      ? toFiniteNumber(raw.socialScore)
      : legacyReputation != null
        ? Math.round(toFiniteNumber(legacyReputation) * 10)
        : 0;

  return {
    followers: Math.max(0, Math.round(toFiniteNumber(raw.followers))),
    socialScore: Math.max(0, Math.round(socialScore)),
    controversy: Math.max(0, Math.round(toFiniteNumber(raw.controversy))),
    creativity: Math.min(
      100,
      Math.max(0, Math.round(toFiniteNumber(raw.creativity, 50))),
    ),
  };
}

export function formatStatValue(value: number | null | undefined): string {
  return Math.max(0, Math.round(toFiniteNumber(value))).toLocaleString();
}
