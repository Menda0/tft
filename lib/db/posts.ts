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
  await collection.createIndex({
    "author.personalityId": 1,
    createdAt: -1,
    replyToPostId: 1,
    repostOfPostId: 1,
  });
}

function isOriginalTopLevelPost(post: Pick<Post, "replyToPostId" | "repostOfPostId">): boolean {
  return post.replyToPostId === null && post.repostOfPostId === null;
}

export async function countOriginalPostsSince(
  personalityId: string,
  since: Date,
): Promise<number> {
  const collection = await getPostsCollection();

  return collection.countDocuments({
    "author.personalityId": personalityId,
    replyToPostId: null,
    repostOfPostId: null,
    createdAt: { $gte: since },
  });
}

export async function getOriginalPostTopicsSince(
  personalityId: string,
  since: Date,
): Promise<string[]> {
  const collection = await getPostsCollection();
  const posts = await collection
    .find(
      {
        "author.personalityId": personalityId,
        replyToPostId: null,
        repostOfPostId: null,
        createdAt: { $gte: since },
        topic: { $ne: null },
      },
      { projection: { topic: 1 } },
    )
    .sort({ createdAt: -1 })
    .toArray();

  return posts
    .map((post) => post.topic?.trim())
    .filter((topic): topic is string => Boolean(topic));
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

export async function getTopLevelOriginalPostsSince(
  since: Date,
  limit = 500,
): Promise<Post[]> {
  const collection = await getPostsCollection();
  return collection
    .find({
      replyToPostId: null,
      repostOfPostId: null,
      createdAt: { $gte: since },
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function getRecentPosts(limit = 100): Promise<Post[]> {
  const collection = await getPostsCollection();
  return collection.find().sort({ createdAt: -1 }).limit(limit).toArray();
}

export async function getTopLevelPosts(
  limit = 50,
  skip = 0,
): Promise<Post[]> {
  const collection = await getPostsCollection();
  return collection
    .find({ replyToPostId: null })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
}

export async function getTrendingTopLevelPostsSince(
  since: Date,
  limit = 50,
  skip = 0,
): Promise<Post[]> {
  const collection = await getPostsCollection();

  return collection
    .aggregate<Post>([
      {
        $match: {
          replyToPostId: null,
          createdAt: { $gte: since },
        },
      },
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $multiply: ["$stats.replies", 4] },
              { $multiply: ["$stats.reposts", 3] },
              { $multiply: ["$stats.likes", 2] },
              "$stats.views",
            ],
          },
        },
      },
      { $sort: { engagementScore: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: { engagementScore: 0 } },
    ])
    .toArray();
}

export async function getRepliesForPost(
  postId: string,
  limit = 50,
  skip = 0,
): Promise<Post[]> {
  const collection = await getPostsCollection();
  return collection
    .find({ replyToPostId: postId })
    .sort({ createdAt: 1 })
    .skip(skip)
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

export async function getPostsByIds(ids: string[]): Promise<Post[]> {
  if (ids.length === 0) {
    return [];
  }

  const collection = await getPostsCollection();
  return collection.find({ id: { $in: ids } }).toArray();
}

export async function getOriginalPostsByPersonality(
  personalityId: string,
  limit = 50,
  skip = 0,
): Promise<Post[]> {
  const collection = await getPostsCollection();
  return collection
    .find({
      "author.personalityId": personalityId,
      replyToPostId: null,
      repostOfPostId: null,
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
}

export async function getRepliesByPersonality(
  personalityId: string,
  limit = 50,
  skip = 0,
): Promise<Post[]> {
  const collection = await getPostsCollection();
  return collection
    .find({
      "author.personalityId": personalityId,
      replyToPostId: { $ne: null },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
}

export async function getRepostsByPersonality(
  personalityId: string,
  limit = 50,
  skip = 0,
): Promise<Post[]> {
  const collection = await getPostsCollection();
  return collection
    .find({
      "author.personalityId": personalityId,
      repostOfPostId: { $ne: null },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
}

export async function aggregateSocialScoreByPersonality(): Promise<
  Map<string, { likes: number; reposts: number; replies: number }>
> {
  const collection = await getPostsCollection();
  const rows = await collection
    .aggregate<{
      _id: string;
      likes: number;
      reposts: number;
      replies: number;
    }>([
      {
        $group: {
          _id: "$author.personalityId",
          likes: { $sum: "$stats.likes" },
          reposts: { $sum: "$stats.reposts" },
          replies: { $sum: "$stats.replies" },
        },
      },
    ])
    .toArray();

  return new Map(
    rows.map((row) => [
      row._id,
      {
        likes: row.likes,
        reposts: row.reposts,
        replies: row.replies,
      },
    ]),
  );
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
