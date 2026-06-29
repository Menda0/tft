import { randomUUID } from "crypto";

import { Collection } from "mongodb";

import { getDb } from "@/lib/mongodb";
import type {
  AiOperation,
  AiUsageBreakdownRow,
  AiUsageEvent,
  AiUsageSummary,
} from "@/lib/types/ai-usage";

const COLLECTION = "ai_usage_events";

export async function getAiUsageCollection(): Promise<Collection<AiUsageEvent>> {
  const db = await getDb();
  return db.collection<AiUsageEvent>(COLLECTION);
}

export async function ensureAiUsageIndexes(): Promise<void> {
  const collection = await getAiUsageCollection();
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ createdAt: -1 });
  await collection.createIndex({ operation: 1, createdAt: -1 });
  await collection.createIndex({ model: 1, createdAt: -1 });
}

export async function insertAiUsageEvent(
  input: Omit<AiUsageEvent, "id" | "createdAt"> & { createdAt?: Date },
): Promise<void> {
  const collection = await getAiUsageCollection();
  const event: AiUsageEvent = {
    ...input,
    id: randomUUID(),
    createdAt: input.createdAt ?? new Date(),
  };

  await collection.insertOne(event);
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function mapBreakdownRows(
  rows: Array<{
    _id: AiOperation | string;
    requestCount: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd: number;
  }>,
  key: "operation" | "model",
): AiUsageBreakdownRow[] {
  return rows
    .map((row) => ({
      [key]: row._id,
      requestCount: row.requestCount,
      promptTokens: row.promptTokens,
      completionTokens: row.completionTokens,
      totalTokens: row.totalTokens,
      costUsd: roundUsd(row.costUsd),
    }))
    .sort((a, b) => b.costUsd - a.costUsd) as AiUsageBreakdownRow[];
}

export async function aggregateAiUsageSince(since: Date): Promise<AiUsageSummary> {
  const collection = await getAiUsageCollection();

  const [totals, byOperation, byModel] = await Promise.all([
    collection
      .aggregate<{
        requestCount: number;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        costUsd: number;
      }>([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: null,
            requestCount: { $sum: 1 },
            promptTokens: { $sum: "$promptTokens" },
            completionTokens: { $sum: "$completionTokens" },
            totalTokens: { $sum: "$totalTokens" },
            costUsd: { $sum: "$estimatedCostUsd" },
          },
        },
      ])
      .toArray(),
    collection
      .aggregate<{
        _id: AiOperation;
        requestCount: number;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        costUsd: number;
      }>([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: "$operation",
            requestCount: { $sum: 1 },
            promptTokens: { $sum: "$promptTokens" },
            completionTokens: { $sum: "$completionTokens" },
            totalTokens: { $sum: "$totalTokens" },
            costUsd: { $sum: "$estimatedCostUsd" },
          },
        },
      ])
      .toArray(),
    collection
      .aggregate<{
        _id: string;
        requestCount: number;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        costUsd: number;
      }>([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: "$model",
            requestCount: { $sum: 1 },
            promptTokens: { $sum: "$promptTokens" },
            completionTokens: { $sum: "$completionTokens" },
            totalTokens: { $sum: "$totalTokens" },
            costUsd: { $sum: "$estimatedCostUsd" },
          },
        },
      ])
      .toArray(),
  ]);

  const total = totals[0];

  return {
    totalCostUsd: roundUsd(total?.costUsd ?? 0),
    totalTokens: total?.totalTokens ?? 0,
    promptTokens: total?.promptTokens ?? 0,
    completionTokens: total?.completionTokens ?? 0,
    requestCount: total?.requestCount ?? 0,
    byOperation: mapBreakdownRows(byOperation, "operation"),
    byModel: mapBreakdownRows(byModel, "model"),
  };
}
