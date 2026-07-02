import { randomUUID } from "crypto";

import { Collection } from "mongodb";

import { getDb } from "@/lib/mongodb";
import { mergeNotDeletedPost } from "@/lib/db/active-filters";
import { countPostReadsForPosts } from "@/lib/db/post-reads";
import {
  defaultPostStats,
  type Post,
  type PostAuthor,
  type PostMediaStatus,
  type PostStats,
} from "@/lib/types/post";

const COLLECTION = "posts";

export function createPostId(): string {
  return randomUUID();
}

export async function getPostsCollection(): Promise<Collection<Post>> {
  const db = await getDb();
  return db.collection<Post>(COLLECTION);
}

let postIndexesReady: Promise<void> | null = null;

export async function ensurePostIndexes(): Promise<void> {
  if (!postIndexesReady) {
    postIndexesReady = (async () => {
      const collection = await getPostsCollection();
      await collection.createIndex({ id: 1 }, { unique: true });
      await collection.createIndex({ createdAt: -1 });
      await collection.createIndex({ replyToPostId: 1 });
      await collection.createIndex({ replyToPostId: 1, "stats.likes": -1 });
      await collection.createIndex({ "author.personalityId": 1 });
      await collection.createIndex({
        "author.personalityId": 1,
        createdAt: -1,
        replyToPostId: 1,
        repostOfPostId: 1,
      });
      await collection.createIndex(
        { externalId: 1 },
        { unique: true, sparse: true },
      );
      await collection.createIndex({ mediaStatus: 1 });
      await collection.createIndex({ deletedAt: 1 });
    })();
  }

  return postIndexesReady;
}

export async function softDeletePostsByPersonalityIds(
  personalityIds: string[],
  deletedAt = new Date(),
): Promise<number> {
  if (personalityIds.length === 0) {
    return 0;
  }

  const collection = await getPostsCollection();
  const authoredPosts = await collection
    .find(
      mergeNotDeletedPost({
        "author.personalityId": { $in: personalityIds },
      }),
      { projection: { id: 1 } },
    )
    .toArray();
  const authoredPostIds = authoredPosts.map((post) => post.id);

  let deletedCount = 0;

  const authoredResult = await collection.updateMany(
    mergeNotDeletedPost({
      "author.personalityId": { $in: personalityIds },
    }),
    { $set: { deletedAt } },
  );
  deletedCount += authoredResult.modifiedCount;

  if (authoredPostIds.length > 0) {
    deletedCount += await softDeletePostThreads(authoredPostIds, deletedAt);
  }

  await recalculateEngagementStatsForActivePosts({ resetLikes: true });

  return deletedCount;
}

async function softDeletePostThreads(
  rootPostIds: string[],
  deletedAt: Date,
): Promise<number> {
  const collection = await getPostsCollection();
  let deletedCount = 0;
  let frontier = rootPostIds;

  while (frontier.length > 0) {
    const children = await collection
      .find(
        mergeNotDeletedPost({
          $or: [
            { replyToPostId: { $in: frontier } },
            { repostOfPostId: { $in: frontier } },
          ],
        }),
        { projection: { id: 1 } },
      )
      .toArray();

    if (children.length === 0) {
      break;
    }

    const childIds = children.map((post) => post.id);
    await collection.updateMany({ id: { $in: childIds } }, { $set: { deletedAt } });
    deletedCount += childIds.length;
    frontier = childIds;
  }

  return deletedCount;
}

function resolveStoredLikes(
  storedLikes: number,
  replies: number,
  reposts: number,
  views: number,
  resetLikes = false,
): number {
  if (resetLikes) {
    return 0;
  }

  if (replies === 0 && reposts === 0 && views === 0 && storedLikes > 0) {
    return 0;
  }

  return storedLikes;
}

function postStatsEqual(left: PostStats, right: PostStats): boolean {
  return (
    left.replies === right.replies &&
    left.reposts === right.reposts &&
    left.likes === right.likes &&
    left.views === right.views &&
    left.stronglyAgreeReplies === right.stronglyAgreeReplies &&
    left.agreeReplies === right.agreeReplies &&
    left.neutralReplies === right.neutralReplies &&
    left.disagreeReplies === right.disagreeReplies &&
    left.stronglyDisagreeReplies === right.stronglyDisagreeReplies
  );
}

const REPLY_TONE_GROUP_FIELDS = {
  stronglyAgreeReplies: {
    $sum: { $cond: [{ $eq: ["$replyTone", "strongly_agree"] }, 1, 0] },
  },
  agreeReplies: {
    $sum: {
      $cond: [
        {
          $or: [
            { $eq: ["$replyTone", "agree"] },
            { $eq: ["$replyTone", null] },
            { $not: ["$replyTone"] },
          ],
        },
        1,
        0,
      ],
    },
  },
  neutralReplies: {
    $sum: { $cond: [{ $eq: ["$replyTone", "neutral"] }, 1, 0] },
  },
  disagreeReplies: {
    $sum: { $cond: [{ $eq: ["$replyTone", "disagree"] }, 1, 0] },
  },
  stronglyDisagreeReplies: {
    $sum: { $cond: [{ $eq: ["$replyTone", "strongly_disagree"] }, 1, 0] },
  },
} as const;

export async function resolvePostStatsBatch(
  posts: Array<Pick<Post, "id" | "stats">>,
): Promise<Map<string, PostStats>> {
  const ids = posts.map((post) => post.id);

  if (ids.length === 0) {
    return new Map();
  }

  const collection = await getPostsCollection();
  const [replyRows, repostRows, viewCounts] = await Promise.all([
    collection
      .aggregate<{
        _id: string;
        count: number;
        stronglyAgreeReplies: number;
        agreeReplies: number;
        neutralReplies: number;
        disagreeReplies: number;
        stronglyDisagreeReplies: number;
      }>([
        { $match: mergeNotDeletedPost({ replyToPostId: { $in: ids } }) },
        {
          $group: {
            _id: "$replyToPostId",
            count: { $sum: 1 },
            ...REPLY_TONE_GROUP_FIELDS,
          },
        },
      ])
      .toArray(),
    collection
      .aggregate<{ _id: string; count: number }>([
        { $match: mergeNotDeletedPost({ repostOfPostId: { $in: ids } }) },
        { $group: { _id: "$repostOfPostId", count: { $sum: 1 } } },
      ])
      .toArray(),
    countPostReadsForPosts(ids),
  ]);

  const replyCounts = new Map(replyRows.map((row) => [row._id, row.count]));
  const stronglyAgreeReplyCounts = new Map(
    replyRows.map((row) => [row._id, row.stronglyAgreeReplies]),
  );
  const agreeReplyCounts = new Map(
    replyRows.map((row) => [row._id, row.agreeReplies]),
  );
  const neutralReplyCounts = new Map(
    replyRows.map((row) => [row._id, row.neutralReplies]),
  );
  const disagreeReplyCounts = new Map(
    replyRows.map((row) => [row._id, row.disagreeReplies]),
  );
  const stronglyDisagreeReplyCounts = new Map(
    replyRows.map((row) => [row._id, row.stronglyDisagreeReplies]),
  );
  const repostCounts = new Map(repostRows.map((row) => [row._id, row.count]));

  return new Map(
    posts.map((post) => {
      const replies = replyCounts.get(post.id) ?? 0;
      const reposts = repostCounts.get(post.id) ?? 0;
      const views = viewCounts.get(post.id) ?? 0;

      return [
        post.id,
        {
          replies,
          reposts,
          likes: resolveStoredLikes(post.stats.likes, replies, reposts, views),
          views,
          stronglyAgreeReplies: stronglyAgreeReplyCounts.get(post.id) ?? 0,
          agreeReplies: agreeReplyCounts.get(post.id) ?? 0,
          neutralReplies: neutralReplyCounts.get(post.id) ?? 0,
          disagreeReplies: disagreeReplyCounts.get(post.id) ?? 0,
          stronglyDisagreeReplies: stronglyDisagreeReplyCounts.get(post.id) ?? 0,
        },
      ];
    }),
  );
}

export async function syncPostStatsIfStale(
  post: Pick<Post, "id" | "stats">,
  options?: { resetLikes?: boolean },
): Promise<PostStats> {
  const resolved = (await resolvePostStatsBatch([post])).get(post.id)!;
  const stats = options?.resetLikes
    ? {
        ...resolved,
        likes: resolveStoredLikes(
          post.stats.likes,
          resolved.replies,
          resolved.reposts,
          resolved.views,
          true,
        ),
      }
    : resolved;

  if (!postStatsEqual(post.stats, stats)) {
    await updatePost(post.id, { stats });
  }

  return stats;
}

export async function recalculateEngagementStatsForActivePosts(options?: {
  resetLikes?: boolean;
}): Promise<number> {
  const collection = await getPostsCollection();
  const activePosts = await collection
    .find(mergeNotDeletedPost({}), { projection: { id: 1, stats: 1 } })
    .toArray();

  const resolvedById = await resolvePostStatsBatch(activePosts);
  let updated = 0;

  for (const post of activePosts) {
    const resolved = resolvedById.get(post.id)!;
    const stats = {
      ...resolved,
      likes: resolveStoredLikes(
        post.stats.likes,
        resolved.replies,
        resolved.reposts,
        resolved.views,
        options?.resetLikes,
      ),
    };

    if (!postStatsEqual(post.stats, stats)) {
      await collection.updateOne({ id: post.id }, { $set: { stats } });
      updated += 1;
    }
  }

  return updated;
}

function isOriginalTopLevelPost(post: Pick<Post, "replyToPostId" | "repostOfPostId">): boolean {
  return post.replyToPostId === null && post.repostOfPostId === null;
}

export async function countOriginalPostsSince(
  personalityId: string,
  since: Date,
): Promise<number> {
  const collection = await getPostsCollection();

  return collection.countDocuments(
    mergeNotDeletedPost({
      "author.personalityId": personalityId,
      replyToPostId: null,
      repostOfPostId: null,
      createdAt: { $gte: since },
    }),
  );
}

export async function countAllOriginalPostsSince(since: Date): Promise<number> {
  const collection = await getPostsCollection();
  return collection.countDocuments(
    mergeNotDeletedPost({
      replyToPostId: null,
      repostOfPostId: null,
      createdAt: { $gte: since },
    }),
  );
}

export async function countAllRepliesSince(since: Date): Promise<number> {
  const collection = await getPostsCollection();
  return collection.countDocuments(
    mergeNotDeletedPost({
      replyToPostId: { $ne: null },
      createdAt: { $gte: since },
    }),
  );
}

export async function countAllRepostsSince(since: Date): Promise<number> {
  const collection = await getPostsCollection();
  return collection.countDocuments(
    mergeNotDeletedPost({
      repostOfPostId: { $ne: null },
      createdAt: { $gte: since },
    }),
  );
}

export async function sumLikesOnPostsCreatedSince(since: Date): Promise<number> {
  const collection = await getPostsCollection();
  const rows = await collection
    .aggregate<{ total: number }>([
      {
        $match: mergeNotDeletedPost({
          createdAt: { $gte: since },
        }),
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$stats.likes" },
        },
      },
    ])
    .toArray();

  return rows[0]?.total ?? 0;
}

export async function getOriginalPostTopicsSince(
  personalityId: string,
  since: Date,
): Promise<string[]> {
  const collection = await getPostsCollection();
  const posts = await collection
    .find(
      mergeNotDeletedPost({
        "author.personalityId": personalityId,
        replyToPostId: null,
        repostOfPostId: null,
        createdAt: { $gte: since },
        topic: { $ne: null },
      }),
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

export async function findPostByExternalId(
  externalId: string,
): Promise<Post | null> {
  const collection = await getPostsCollection();
  return collection.findOne({ externalId });
}

export async function countMirroredPostsByPersonality(
  personalityId: string,
): Promise<number> {
  const collection = await getPostsCollection();
  return collection.countDocuments({
    "author.personalityId": personalityId,
    source: "mirrored",
    replyToPostId: null,
    repostOfPostId: null,
  });
}

export async function getMirroredPostIdsByPersonalityIds(
  personalityIds: string[],
): Promise<string[]> {
  if (personalityIds.length === 0) {
    return [];
  }

  const collection = await getPostsCollection();
  const posts = await collection
    .find({
      "author.personalityId": { $in: personalityIds },
      source: "mirrored",
    })
    .project({ id: 1 })
    .toArray();

  return posts.map((post) => post.id);
}

export async function deleteRepliesToPosts(postIds: string[]): Promise<number> {
  if (postIds.length === 0) {
    return 0;
  }

  const collection = await getPostsCollection();
  const result = await collection.deleteMany({
    replyToPostId: { $in: postIds },
  });

  return result.deletedCount;
}

export async function deletePostsByIds(postIds: string[]): Promise<number> {
  if (postIds.length === 0) {
    return 0;
  }

  const collection = await getPostsCollection();
  const result = await collection.deleteMany({
    id: { $in: postIds },
  });

  return result.deletedCount;
}

export async function deletePostsByPersonality(
  personalityId: string,
): Promise<number> {
  const collection = await getPostsCollection();
  const result = await collection.deleteMany({
    "author.personalityId": personalityId,
  });
  return result.deletedCount;
}

export async function deleteAllPosts(): Promise<number> {
  const collection = await getPostsCollection();
  const result = await collection.deleteMany({});
  return result.deletedCount;
}

export async function getTopLevelOriginalPostsSince(
  since: Date,
  limit = 500,
): Promise<Post[]> {
  const collection = await getPostsCollection();
  return collection
    .find(
      mergeNotDeletedPost({
        replyToPostId: null,
        repostOfPostId: null,
        createdAt: { $gte: since },
      }),
    )
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function getRecentPosts(limit = 100): Promise<Post[]> {
  const collection = await getPostsCollection();
  return collection
    .find(mergeNotDeletedPost({}))
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function getTopLevelPosts(
  limit = 50,
  skip = 0,
): Promise<Post[]> {
  const collection = await getPostsCollection();
  return collection
    .find(mergeNotDeletedPost({ replyToPostId: null }))
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
        $match: mergeNotDeletedPost({
          replyToPostId: null,
          createdAt: { $gte: since },
        }),
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
          discoveryBonus: {
            $divide: [
              35,
              {
                $add: [
                  1,
                  {
                    $ln: {
                      $add: [{ $ifNull: ["$stats.views", 0] }, 1],
                    },
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          rankScore: { $add: ["$engagementScore", "$discoveryBonus"] },
        },
      },
      { $sort: { rankScore: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: { engagementScore: 0, discoveryBonus: 0, rankScore: 0 } },
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
    .find(mergeNotDeletedPost({ replyToPostId: postId }))
    .sort({ "stats.likes": -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
}

export async function getTopRepliesForPost(
  postId: string,
  limit = 5,
): Promise<Post[]> {
  return getRepliesForPost(postId, limit);
}

export async function getTopPreviewRepliesForPosts(
  postIds: string[],
): Promise<Map<string, Post>> {
  if (postIds.length === 0) {
    return new Map();
  }

  const collection = await getPostsCollection();
  const rows = await collection
    .aggregate<{ _id: string; reply: Post }>([
      { $match: mergeNotDeletedPost({ replyToPostId: { $in: postIds } }) },
      { $sort: { "stats.likes": -1, createdAt: -1 } },
      {
        $group: {
          _id: "$replyToPostId",
          reply: { $first: "$$ROOT" },
        },
      },
    ])
    .toArray();

  return new Map(rows.map((row) => [row._id, row.reply]));
}

export async function getRepliesForPosts(postIds: string[]): Promise<Post[]> {
  if (postIds.length === 0) {
    return [];
  }

  const collection = await getPostsCollection();
  return collection
    .find(mergeNotDeletedPost({ replyToPostId: { $in: postIds } }))
    .sort({ "stats.likes": -1, createdAt: -1 })
    .toArray();
}

export async function getPostById(id: string): Promise<Post | null> {
  const collection = await getPostsCollection();
  const post = await collection.findOne(mergeNotDeletedPost({ id }));

  return post;
}

export async function getPostsByIds(ids: string[]): Promise<Post[]> {
  if (ids.length === 0) {
    return [];
  }

  const collection = await getPostsCollection();
  return collection
    .find(mergeNotDeletedPost({ id: { $in: ids } }))
    .toArray();
}

export async function getOriginalPostsByPersonality(
  personalityId: string,
  limit = 50,
  skip = 0,
): Promise<Post[]> {
  const collection = await getPostsCollection();
  return collection
    .find(
      mergeNotDeletedPost({
        "author.personalityId": personalityId,
        replyToPostId: null,
        repostOfPostId: null,
      }),
    )
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
    .find(
      mergeNotDeletedPost({
        "author.personalityId": personalityId,
        replyToPostId: { $ne: null },
      }),
    )
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
    .find(
      mergeNotDeletedPost({
        "author.personalityId": personalityId,
        repostOfPostId: { $ne: null },
      }),
    )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
}

export type PersonalityEngagementTotals = {
  likes: number;
  reposts: number;
  replies: number;
  views: number;
  stronglyAgreeReplies: number;
  agreeReplies: number;
  neutralReplies: number;
  disagreeReplies: number;
  stronglyDisagreeReplies: number;
};

function engagementTotalsFromRow(row: {
  likes: number;
  reposts: number;
  replies: number;
  views: number;
  stronglyAgreeReplies: number;
  agreeReplies: number;
  neutralReplies: number;
  disagreeReplies: number;
  stronglyDisagreeReplies: number;
}): PersonalityEngagementTotals {
  return {
    likes: row.likes,
    reposts: row.reposts,
    replies: row.replies,
    views: row.views,
    stronglyAgreeReplies: row.stronglyAgreeReplies,
    agreeReplies: row.agreeReplies,
    neutralReplies: row.neutralReplies,
    disagreeReplies: row.disagreeReplies,
    stronglyDisagreeReplies: row.stronglyDisagreeReplies,
  };
}

const ENGAGEMENT_GROUP_STAGE = {
  $group: {
    _id: "$author.personalityId",
    likes: { $sum: "$stats.likes" },
    reposts: { $sum: "$stats.reposts" },
    replies: { $sum: "$stats.replies" },
    views: { $sum: "$stats.views" },
    stronglyAgreeReplies: {
      $sum: { $ifNull: ["$stats.stronglyAgreeReplies", 0] },
    },
    agreeReplies: {
      $sum: { $ifNull: ["$stats.agreeReplies", 0] },
    },
    neutralReplies: {
      $sum: { $ifNull: ["$stats.neutralReplies", 0] },
    },
    disagreeReplies: {
      $sum: { $ifNull: ["$stats.disagreeReplies", 0] },
    },
    stronglyDisagreeReplies: {
      $sum: { $ifNull: ["$stats.stronglyDisagreeReplies", 0] },
    },
  },
} as const;

export async function aggregateSocialScoreForPersonality(
  personalityId: string,
): Promise<PersonalityEngagementTotals> {
  const collection = await getPostsCollection();
  const rows = await collection
    .aggregate<{
      _id: string;
      likes: number;
      reposts: number;
      replies: number;
      views: number;
      stronglyAgreeReplies: number;
      agreeReplies: number;
      neutralReplies: number;
      disagreeReplies: number;
      stronglyDisagreeReplies: number;
    }>([
      {
        $match: mergeNotDeletedPost({
          "author.personalityId": personalityId,
        }),
      },
      ENGAGEMENT_GROUP_STAGE,
    ])
    .toArray();

  const row = rows[0];

  if (!row) {
    return {
      likes: 0,
      reposts: 0,
      replies: 0,
      views: 0,
      stronglyAgreeReplies: 0,
      agreeReplies: 0,
      neutralReplies: 0,
      disagreeReplies: 0,
      stronglyDisagreeReplies: 0,
    };
  }

  return engagementTotalsFromRow(row);
}

export async function aggregateSocialScoreByPersonality(): Promise<
  Map<string, PersonalityEngagementTotals>
> {
  const collection = await getPostsCollection();
  const rows = await collection
    .aggregate<{
      _id: string;
      likes: number;
      reposts: number;
      replies: number;
      views: number;
      stronglyAgreeReplies: number;
      agreeReplies: number;
      neutralReplies: number;
      disagreeReplies: number;
      stronglyDisagreeReplies: number;
    }>([
      {
        $match: mergeNotDeletedPost({}),
      },
      ENGAGEMENT_GROUP_STAGE,
    ])
    .toArray();

  return new Map(
    rows.map((row) => [row._id, engagementTotalsFromRow(row)]),
  );
}

export async function incrementPostStat(
  id: string,
  field: keyof PostStats,
  amount = 1,
): Promise<void> {
  const collection = await getPostsCollection();
  await collection.updateOne(mergeNotDeletedPost({ id }), {
    $inc: { [`stats.${field}`]: amount },
  });
}

export async function updatePost(
  id: string,
  updates: Partial<Omit<Post, "id">>,
): Promise<Post | null> {
  const collection = await getPostsCollection();
  const result = await collection.findOneAndUpdate(
    { id },
    { $set: updates },
    { returnDocument: "after" },
  );

  return result;
}

export async function claimPostMediaGeneration(
  postId: string,
): Promise<Post | null> {
  const collection = await getPostsCollection();
  const result = await collection.findOneAndUpdate(
    {
      id: postId,
      mediaStatus: { $in: ["pending", "failed"] },
      sourceImageUrls: { $exists: true, $ne: [] },
    },
    { $set: { mediaStatus: "generating" } },
    { returnDocument: "after" },
  );

  return result;
}

export async function getPostsPendingMedia(limit = 100): Promise<Post[]> {
  const collection = await getPostsCollection();
  return collection
    .find({
      mediaStatus: { $in: ["pending", "failed"] },
      sourceImageUrls: { $exists: true, $ne: [] },
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
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

export async function countDisagreeRepliesFromToSince(
  replierId: string,
  authorId: string,
  since: Date,
): Promise<number> {
  const collection = await getPostsCollection();
  const rows = await collection
    .aggregate<{ total: number }>([
      {
        $match: mergeNotDeletedPost({
          "author.personalityId": replierId,
          replyTone: { $in: ["disagree", "strongly_disagree"] },
          replyToPostId: { $ne: null },
          createdAt: { $gte: since },
        }),
      },
      {
        $lookup: {
          from: COLLECTION,
          localField: "replyToPostId",
          foreignField: "id",
          as: "parent",
        },
      },
      { $unwind: "$parent" },
      {
        $match: {
          "parent.author.personalityId": authorId,
        },
      },
      { $count: "total" },
    ])
    .toArray();

  return rows[0]?.total ?? 0;
}
