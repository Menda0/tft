export const POLITICAL_SWING_MIN = -10;
export const POLITICAL_SWING_MAX = 10;

export type PoliticalSwing = number;

export function normalizePoliticalSwing(value: unknown): PoliticalSwing | null {
  if (typeof value === "string") {
    if (value === "left") {
      return POLITICAL_SWING_MIN;
    }

    if (value === "right") {
      return POLITICAL_SWING_MAX;
    }

    const parsed = Number(value);

    if (!Number.isNaN(parsed)) {
      return clampPoliticalSwing(parsed);
    }

    return null;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return clampPoliticalSwing(value);
}

export function clampPoliticalSwing(value: number): PoliticalSwing {
  return Math.min(
    POLITICAL_SWING_MAX,
    Math.max(POLITICAL_SWING_MIN, Math.round(value)),
  );
}

export function formatPoliticalSwingLabel(swing: PoliticalSwing): string {
  const normalized = clampPoliticalSwing(swing);

  if (normalized === 0) {
    return "Center (0)";
  }

  if (normalized < 0) {
    return `Left wing (${normalized})`;
  }

  return `Right wing (+${normalized})`;
}

export function randomPoliticalSwing(): PoliticalSwing {
  return clampPoliticalSwing(
    Math.floor(Math.random() * (POLITICAL_SWING_MAX - POLITICAL_SWING_MIN + 1)) +
      POLITICAL_SWING_MIN,
  );
}
