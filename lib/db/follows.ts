import { randomUUID } from "crypto";

import { Collection } from "mongodb";

import { getDb } from "@/lib/mongodb";
import type { Follow } from "@/lib/types/follow";

const COLLECTION = "follows";

export async function getFollowsCollection(): Promise<Collection<Follow>> {
  const db = await getDb();
  return db.collection<Follow>(COLLECTION);
}

export async function ensureFollowIndexes(): Promise<void> {
  const collection = await getFollowsCollection();
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex(
    { followerId: 1, followingId: 1 },
    { unique: true },
  );
  await collection.createIndex({ followingId: 1, createdAt: -1 });
  await collection.createIndex({ followerId: 1, createdAt: -1 });
}

export async function hasFollow(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const collection = await getFollowsCollection();
  const existing = await collection.findOne({ followerId, followingId });
  return existing !== null;
}

export async function insertFollow(
  followerId: string,
  followingId: string,
): Promise<Follow | null> {
  const collection = await getFollowsCollection();
  const follow: Follow = {
    id: randomUUID(),
    followerId,
    followingId,
    createdAt: new Date(),
  };

  try {
    await collection.insertOne(follow);
    return follow;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return null;
    }

    throw error;
  }
}

export async function deleteFollow(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const collection = await getFollowsCollection();
  const result = await collection.deleteOne({ followerId, followingId });
  return result.deletedCount === 1;
}

export async function getFollowingIds(followerId: string): Promise<Set<string>> {
  const collection = await getFollowsCollection();
  const follows = await collection
    .find({ followerId }, { projection: { followingId: 1 } })
    .toArray();

  return new Set(follows.map((follow) => follow.followingId));
}

export async function getFollowerIds(followingId: string): Promise<Set<string>> {
  const collection = await getFollowsCollection();
  const follows = await collection
    .find({ followingId }, { projection: { followerId: 1 } })
    .toArray();

  return new Set(follows.map((follow) => follow.followerId));
}

export function isMutualFollow(
  targetId: string,
  followingIds: Set<string>,
  followerIds: Set<string>,
): boolean {
  return followingIds.has(targetId) && followerIds.has(targetId);
}

export async function getFollowersForPersonality(
  personalityId: string,
  limit = 100,
  offset = 0,
): Promise<Follow[]> {
  const collection = await getFollowsCollection();
  return collection
    .find({ followingId: personalityId })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray();
}

export async function deleteFollowsForPersonalityIds(
  personalityIds: string[],
): Promise<number> {
  if (personalityIds.length === 0) {
    return 0;
  }

  const collection = await getFollowsCollection();
  const result = await collection.deleteMany({
    $or: [
      { followerId: { $in: personalityIds } },
      { followingId: { $in: personalityIds } },
    ],
  });

  return result.deletedCount;
}

export async function deleteAllFollows(): Promise<number> {
  const collection = await getFollowsCollection();
  const result = await collection.deleteMany({});
  return result.deletedCount;
}
