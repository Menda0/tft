import { Collection } from "mongodb";

import { getDb } from "@/lib/mongodb";
import type { TrendingTopic, WorldState } from "@/lib/types/world";

const COLLECTION = "world_state";
const GLOBAL_ID = "global";

export function createDefaultWorldState(): WorldState {
  return {
    id: GLOBAL_ID,
    tickNumber: 0,
    lastTickAt: null,
    trendingTopics: [],
    trendingTopicsUpdatedAt: null,
    isRunning: false,
    lastRankNpcSeedAt: null,
    rankNpcSeedInProgress: false,
    lastHeatDecayAt: null,
  };
}

export async function getWorldStateCollection(): Promise<
  Collection<WorldState>
> {
  const db = await getDb();
  return db.collection<WorldState>(COLLECTION);
}

export async function ensureWorldStateIndexes(): Promise<void> {
  const collection = await getWorldStateCollection();
  await collection.createIndex({ id: 1 }, { unique: true });
}

export async function getWorldState(): Promise<WorldState> {
  const collection = await getWorldStateCollection();
  const existing = await collection.findOne({ id: GLOBAL_ID });

  if (existing) {
    return existing;
  }

  const initial = createDefaultWorldState();
  await collection.insertOne(initial);
  return initial;
}

export async function saveWorldState(
  updates: Partial<Omit<WorldState, "id">>,
): Promise<WorldState> {
  const collection = await getWorldStateCollection();
  const result = await collection.findOneAndUpdate(
    { id: GLOBAL_ID },
    { $set: updates },
    { upsert: true, returnDocument: "after" },
  );

  return result ?? { ...createDefaultWorldState(), ...updates };
}

export async function tryAcquireWorldLock(): Promise<WorldState | null> {
  const collection = await getWorldStateCollection();
  const result = await collection.findOneAndUpdate(
    { id: GLOBAL_ID, isRunning: false },
    { $set: { isRunning: true } },
    { upsert: true, returnDocument: "after" },
  );

  return result;
}

export async function releaseWorldLock(): Promise<void> {
  const collection = await getWorldStateCollection();
  await collection.updateOne({ id: GLOBAL_ID }, { $set: { isRunning: false } });
}

export async function tryAcquireRankNpcSeedLock(
  cutoff: Date,
): Promise<WorldState | null> {
  const collection = await getWorldStateCollection();
  const result = await collection.findOneAndUpdate(
    {
      id: GLOBAL_ID,
      $and: [
        {
          $or: [
            { rankNpcSeedInProgress: false },
            { rankNpcSeedInProgress: { $exists: false } },
          ],
        },
        {
          $or: [
            { lastRankNpcSeedAt: null },
            { lastRankNpcSeedAt: { $exists: false } },
            { lastRankNpcSeedAt: { $lte: cutoff } },
          ],
        },
      ],
    },
    { $set: { rankNpcSeedInProgress: true } },
    { upsert: true, returnDocument: "after" },
  );

  return result;
}

export async function updateTrendingTopicsInDb(
  topics: TrendingTopic[],
): Promise<void> {
  await saveWorldState({ trendingTopics: topics });
}

export async function resetWorldStateToDefault(): Promise<WorldState> {
  const { id: _id, ...defaults } = createDefaultWorldState();
  return saveWorldState(defaults);
}
