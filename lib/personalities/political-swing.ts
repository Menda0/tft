export const POLITICAL_SWING_MIN = -10;
export const POLITICAL_SWING_MAX = 10;

export type PoliticalSwing = number;

export type PoliticalPosition =
  | "far_left"
  | "left"
  | "center_left"
  | "center"
  | "center_right"
  | "right"
  | "far_right";

export type PoliticalPositionInfo = {
  position: PoliticalPosition;
  label: string;
  broadCategory: string;
  examples: string;
  min: number;
  max: number;
};

export const POLITICAL_POSITIONS: PoliticalPositionInfo[] = [
  {
    position: "far_left",
    label: "Far Left",
    broadCategory: "Revolutionary socialism / Communism",
    examples: "Marxism, Leninism, some forms of anarcho-communism",
    min: -10,
    max: -8,
  },
  {
    position: "left",
    label: "Left",
    broadCategory: "Socialism",
    examples: "Democratic socialism, market socialism",
    min: -7,
    max: -5,
  },
  {
    position: "center_left",
    label: "Center-Left",
    broadCategory: "Social democracy / Progressive liberalism",
    examples: "Nordic-style social democracy, progressive parties",
    min: -4,
    max: -2,
  },
  {
    position: "center",
    label: "Center",
    broadCategory: "Centrism",
    examples: "Moderate liberals, moderate conservatives, pragmatists",
    min: -1,
    max: 1,
  },
  {
    position: "center_right",
    label: "Center-Right",
    broadCategory: "Liberal conservatism / Christian democracy",
    examples: "Fiscal conservatism with moderate social policies",
    min: 2,
    max: 4,
  },
  {
    position: "right",
    label: "Right",
    broadCategory: "Conservatism",
    examples: "Traditional conservatism, national conservatism",
    min: 5,
    max: 7,
  },
  {
    position: "far_right",
    label: "Far Right",
    broadCategory: "Ultranationalism / Fascism",
    examples:
      "Fascism, Nazism, some forms of authoritarian ultranationalism",
    min: 8,
    max: 10,
  },
];

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

export function getPoliticalPositionInfo(
  swing: PoliticalSwing,
): PoliticalPositionInfo {
  const normalized = clampPoliticalSwing(swing);
  const match = POLITICAL_POSITIONS.find(
    (entry) => normalized >= entry.min && normalized <= entry.max,
  );

  return match ?? POLITICAL_POSITIONS[3];
}

export function formatPoliticalSwingLabel(swing: PoliticalSwing): string {
  return getPoliticalPositionInfo(swing).label;
}

export function formatPoliticalSwingCategory(swing: PoliticalSwing): string {
  return getPoliticalPositionInfo(swing).broadCategory;
}

export function formatPoliticalSwingDescription(swing: PoliticalSwing): string {
  const info = getPoliticalPositionInfo(swing);

  return `${info.label} (${info.broadCategory}; e.g. ${info.examples})`;
}

export function randomPoliticalSwing(): PoliticalSwing {
  return clampPoliticalSwing(
    Math.floor(Math.random() * (POLITICAL_SWING_MAX - POLITICAL_SWING_MIN + 1)) +
      POLITICAL_SWING_MIN,
  );
}
