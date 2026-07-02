import { randomUUID } from "crypto";

import { Collection } from "mongodb";

import { getDb } from "@/lib/mongodb";
import type { TickResult, TickResultsPage } from "@/lib/types/tick-result";

const COLLECTION = "tick_results";

export async function getTickResultsCollection(): Promise<Collection<TickResult>> {
  const db = await getDb();
  return db.collection<TickResult>(COLLECTION);
}

export async function ensureTickResultIndexes(): Promise<void> {
  const collection = await getTickResultsCollection();
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ tickNumber: -1 });
  await collection.createIndex({ completedAt: -1 });
}

export async function insertTickResult(
  result: Omit<TickResult, "id">,
): Promise<TickResult> {
  const collection = await getTickResultsCollection();
  const record: TickResult = {
    id: randomUUID(),
    ...result,
  };

  await collection.insertOne(record);
  return record;
}

export async function countTickResults(): Promise<number> {
  const collection = await getTickResultsCollection();
  return collection.countDocuments();
}

export async function sumTickUnfollowsSince(since: Date): Promise<number> {
  const collection = await getTickResultsCollection();
  const rows = await collection
    .aggregate<{ total: number }>([
      { $match: { completedAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          total: { $sum: "$stats.unfollows" },
        },
      },
    ])
    .toArray();

  return rows[0]?.total ?? 0;
}

export async function listTickResults(options: {
  offset: number;
  limit: number;
}): Promise<TickResultsPage> {
  const collection = await getTickResultsCollection();
  const { offset, limit } = options;
  const [items, total] = await Promise.all([
    collection
      .find({})
      .sort({ tickNumber: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    collection.countDocuments(),
  ]);

  return {
    items,
    offset,
    limit,
    total,
    hasMore: offset + items.length < total,
  };
}

export async function deleteAllTickResults(): Promise<number> {
  const collection = await getTickResultsCollection();
  const result = await collection.deleteMany({});
  return result.deletedCount;
}
