import type { ActionType } from "@/lib/types/world";

import { throwIfCancelled } from "./cancel";

export function weightedRandom<T extends string>(
  weights: Record<T, number>,
): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, weight]) => sum + Math.max(weight, 0), 0);

  if (total <= 0) {
    return entries[0][0];
  }

  let roll = Math.random() * total;

  for (const [key, weight] of entries) {
    roll -= Math.max(weight, 0);

    if (roll <= 0) {
      return key;
    }
  }

  return entries[entries.length - 1][0];
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
  signal?: AbortSignal,
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  let index = 0;

  async function runWorker(): Promise<void> {
    while (index < items.length) {
      throwIfCancelled(signal);

      const currentIndex = index;
      index += 1;
      await worker(items[currentIndex]);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => runWorker(),
  );

  await Promise.all(workers);
}

export function weightedSampleWithoutReplacement<T>(
  items: T[],
  count: number,
  getWeight: (item: T) => number,
): T[] {
  const pool = [...items];
  const picked: T[] = [];

  while (pool.length > 0 && picked.length < count) {
    const weights = Object.fromEntries(
      pool.map((item, index) => [String(index), getWeight(item)]),
    ) as Record<string, number>;
    const indexKey = weightedRandom(weights);
    const index = Number.parseInt(indexKey, 10);
    const [item] = pool.splice(index, 1);

    if (item) {
      picked.push(item);
    }
  }

  return picked;
}

export function isActionType(value: string): value is ActionType {
  return value === "post" || value === "lurk";
}
