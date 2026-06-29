import { randomUUID } from "crypto";

import { Collection } from "mongodb";

import { getDb } from "@/lib/mongodb";
import type { PostRead } from "@/lib/types/post-read";

const COLLECTION = "post_reads";

export async function getPostReadsCollection(): Promise<Collection<PostRead>> {
  const db = await getDb();
  return db.collection<PostRead>(COLLECTION);
}

export async function ensurePostReadIndexes(): Promise<void> {
  const collection = await getPostReadsCollection();
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex(
    { personalityId: 1, postId: 1 },
    { unique: true },
  );
  await collection.createIndex({ personalityId: 1, readAt: -1 });
}

export async function getReadPostIds(
  personalityId: string,
): Promise<Set<string>> {
  const collection = await getPostReadsCollection();
  const reads = await collection
    .find({ personalityId }, { projection: { postId: 1 } })
    .toArray();

  return new Set(reads.map((read) => read.postId));
}

export async function deletePostReadsForPersonalityIds(
  personalityIds: string[],
): Promise<number> {
  if (personalityIds.length === 0) {
    return 0;
  }

  const collection = await getPostReadsCollection();
  const result = await collection.deleteMany({
    personalityId: { $in: personalityIds },
  });

  return result.deletedCount;
}

export async function countPostReadsForPosts(
  postIds: string[],
): Promise<Map<string, number>> {
  if (postIds.length === 0) {
    return new Map();
  }

  const collection = await getPostReadsCollection();
  const rows = await collection
    .aggregate<{ _id: string; count: number }>([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
    ])
    .toArray();

  return new Map(rows.map((row) => [row._id, row.count]));
}

export async function recordPostRead(
  personalityId: string,
  postId: string,
): Promise<void> {
  const collection = await getPostReadsCollection();
  const read: PostRead = {
    id: randomUUID(),
    personalityId,
    postId,
    readAt: new Date(),
  };

  try {
    await collection.insertOne(read);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return;
    }

    throw error;
  }
}
