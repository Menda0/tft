import { randomUUID } from "crypto";

import { Collection } from "mongodb";

import { getDb } from "@/lib/mongodb";
import { defaultPostStats, type Post, type PostAuthor } from "@/lib/types/post";

const COLLECTION = "posts";

export function createPostId(): string {
  return randomUUID();
}

export async function getPostsCollection(): Promise<Collection<Post>> {
  const db = await getDb();
  return db.collection<Post>(COLLECTION);
}

export async function ensurePostIndexes(): Promise<void> {
  const collection = await getPostsCollection();
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ createdAt: -1 });
  await collection.createIndex({ replyToPostId: 1 });
  await collection.createIndex({ "author.personalityId": 1 });
}

export async function insertPost(
  input: Omit<Post, "id" | "stats"> & { stats?: Post["stats"] },
): Promise<Post> {
  const collection = await getPostsCollection();
  const post: Post = {
    ...input,
    id: createPostId(),
    stats: input.stats ?? defaultPostStats(),
  };

  await collection.insertOne(post);
  return post;
}

export async function getRecentPosts(limit = 100): Promise<Post[]> {
  const collection = await getPostsCollection();
  return collection.find().sort({ createdAt: -1 }).limit(limit).toArray();
}

export async function getTopLevelPosts(limit = 50): Promise<Post[]> {
  const collection = await getPostsCollection();
  return collection
    .find({ replyToPostId: null })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function getRepliesForPosts(postIds: string[]): Promise<Post[]> {
  if (postIds.length === 0) {
    return [];
  }

  const collection = await getPostsCollection();
  return collection
    .find({ replyToPostId: { $in: postIds } })
    .sort({ createdAt: 1 })
    .toArray();
}

export async function getPostById(id: string): Promise<Post | null> {
  const collection = await getPostsCollection();
  return collection.findOne({ id });
}

export async function incrementPostStat(
  id: string,
  field: "replies" | "reposts" | "likes" | "views",
  amount = 1,
): Promise<void> {
  const collection = await getPostsCollection();
  await collection.updateOne(
    { id },
    { $inc: { [`stats.${field}`]: amount } },
  );
}

export function toPostAuthor(input: {
  personalityId: string;
  name: string;
  handle: string;
  archetype: string;
  avatarUrl: string | null;
}): PostAuthor {
  return {
    personalityId: input.personalityId,
    name: input.name,
    handle: input.handle,
    archetype: input.archetype,
    avatarUrl: input.avatarUrl,
  };
}
