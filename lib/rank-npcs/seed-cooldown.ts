import {
  ensureWorldStateIndexes,
  getWorldState,
  saveWorldState,
  tryAcquireRankNpcSeedLock,
} from "@/lib/db/world";

const DEFAULT_SEED_WINDOW_MS = 24 * 60 * 60 * 1000;

export class RankNpcSeedCooldownError extends Error {
  nextAvailableAt: Date;

  constructor(nextAvailableAt: Date) {
    super(
      `Rank NPC seed already ran recently. Next available at ${nextAvailableAt.toISOString()}.`,
    );
    this.name = "RankNpcSeedCooldownError";
    this.nextAvailableAt = nextAvailableAt;
  }
}

export function getRankNpcSeedWindowMs(): number {
  const raw = process.env.RANK_NPC_SEED_WINDOW_MS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return DEFAULT_SEED_WINDOW_MS;
}

export function isRankNpcSeedBypassEnabled(): boolean {
  return process.env.RANK_NPC_SEED_BYPASS_COOLDOWN?.trim() === "true";
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

export function getNextRankNpcSeedAvailableAt(
  lastSeedAt: Date | null,
): Date | null {
  if (!lastSeedAt) {
    return null;
  }

  return new Date(lastSeedAt.getTime() + getRankNpcSeedWindowMs());
}

export type RankNpcSeedStatus = {
  canRun: boolean;
  inProgress: boolean;
  lastSeedAt: Date | null;
  nextAvailableAt: Date | null;
};

export async function getRankNpcSeedStatus(): Promise<RankNpcSeedStatus> {
  await ensureWorldStateIndexes();
  const world = await getWorldState();
  const lastSeedAt = toDate(world.lastRankNpcSeedAt);
  const inProgress = world.rankNpcSeedInProgress === true;
  const nextAvailableAt = getNextRankNpcSeedAvailableAt(lastSeedAt);
  const canRun =
    isRankNpcSeedBypassEnabled() ||
    (!inProgress &&
      (nextAvailableAt === null || nextAvailableAt.getTime() <= Date.now()));

  return {
    canRun,
    inProgress,
    lastSeedAt,
    nextAvailableAt: canRun ? null : nextAvailableAt,
  };
}

export async function tryBeginRankNpcSeed(): Promise<RankNpcSeedStatus> {
  if (isRankNpcSeedBypassEnabled()) {
    await ensureWorldStateIndexes();
    await saveWorldState({ rankNpcSeedInProgress: true });

    return {
      canRun: true,
      inProgress: true,
      lastSeedAt: null,
      nextAvailableAt: null,
    };
  }

  await ensureWorldStateIndexes();
  await getWorldState();
  const cutoff = new Date(Date.now() - getRankNpcSeedWindowMs());
  const acquired = await tryAcquireRankNpcSeedLock(cutoff);

  if (acquired) {
    return {
      canRun: true,
      inProgress: true,
      lastSeedAt: toDate(acquired.lastRankNpcSeedAt),
      nextAvailableAt: null,
    };
  }

  const status = await getRankNpcSeedStatus();

  return {
    ...status,
    canRun: false,
  };
}

export async function completeRankNpcSeed(): Promise<void> {
  await saveWorldState({
    lastRankNpcSeedAt: new Date(),
    rankNpcSeedInProgress: false,
  });
}

export async function abortRankNpcSeed(): Promise<void> {
  await saveWorldState({ rankNpcSeedInProgress: false });
}

export async function assertRankNpcSeedAllowed(): Promise<void> {
  if (isRankNpcSeedBypassEnabled()) {
    return;
  }

  const status = await getRankNpcSeedStatus();

  if (!status.canRun && status.nextAvailableAt) {
    throw new RankNpcSeedCooldownError(status.nextAvailableAt);
  }
}
