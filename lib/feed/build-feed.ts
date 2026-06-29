import {
  ensurePostIndexes,
  getPostById,
  getRepliesForPost,
  getRepliesForPosts,
  getTopLevelPosts,
  getTrendingTopLevelPostsSince,
  resolvePostStatsBatch,
  syncPostStatsIfStale,
} from "@/lib/db/posts";
import { PAGE_SIZE } from "@/lib/pagination";
import { avatarColorForHandle, formatRelativeTime } from "@/lib/feed/format";
import type {
  FeedAuthor,
  FeedReply,
  FeedThread,
  Post,
  PostStats,
} from "@/lib/types/post";

function toFeedAuthor(author: Post["author"]): FeedAuthor {
  return {
    name: author.name,
    handle: author.handle,
    archetype: author.archetype,
    avatarUrl: author.avatarUrl,
    avatarColor: avatarColorForHandle(author.handle),
  };
}

function toFeedReply(post: Post, now: number): FeedReply {
  return {
    id: post.id,
    author: toFeedAuthor(post.author),
    content: post.content,
    timestamp: formatRelativeTime(post.createdAt, now),
    likes: post.stats.likes,
  };
}

function sortRepliesByLikes(replies: Post[]): Post[] {
  return [...replies].sort((left, right) => {
    const likeDelta = right.stats.likes - left.stats.likes;

    if (likeDelta !== 0) {
      return likeDelta;
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  });
}

function toFeedThread(
  post: Post,
  replies: Post[],
  now: number,
  stats: PostStats,
): FeedThread {
  return {
    id: post.id,
    author: toFeedAuthor(post.author),
    content: post.content,
    timestamp: formatRelativeTime(post.createdAt, now),
    stats,
    mediaUrl: post.mediaUrl ?? null,
    mediaStatus: post.mediaStatus ?? "none",
    replies: replies.map((reply) => toFeedReply(reply, now)),
  };
}

export async function buildThreadByPostId(
  postId: string,
  replyLimit = PAGE_SIZE,
  replyOffset = 0,
): Promise<{ thread: FeedThread; hasMore: boolean } | null> {
  await ensurePostIndexes();

  const post = await getPostById(postId);

  if (!post) {
    return null;
  }

  const rootId = post.replyToPostId ?? post.id;
  const rootPost = rootId === post.id ? post : await getPostById(rootId);

  if (!rootPost) {
    return null;
  }

  const replies = await getRepliesForPost(
    rootPost.id,
    replyLimit + 1,
    replyOffset,
  );
  const hasMore = replies.length > replyLimit;
  const pageReplies = hasMore ? replies.slice(0, replyLimit) : replies;
  const stats = await syncPostStatsIfStale(rootPost);
  const now = Date.now();

  return {
    thread: toFeedThread(rootPost, pageReplies, now, stats),
    hasMore,
  };
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

async function buildFeedThreadsFromPosts(
  topLevelPosts: Post[],
): Promise<FeedThread[]> {
  if (topLevelPosts.length === 0) {
    return [];
  }

  const replies = await getRepliesForPosts(topLevelPosts.map((post) => post.id));
  const repliesByPostId = new Map<string, Post[]>();

  for (const reply of replies) {
    if (!reply.replyToPostId) {
      continue;
    }

    const bucket = repliesByPostId.get(reply.replyToPostId) ?? [];
    bucket.push(reply);
    repliesByPostId.set(reply.replyToPostId, bucket);
  }

  const resolvedStats = await resolvePostStatsBatch(topLevelPosts);
  const now = Date.now();
  return topLevelPosts.map((post) =>
    toFeedThread(
      post,
      sortRepliesByLikes(repliesByPostId.get(post.id) ?? []),
      now,
      resolvedStats.get(post.id) ?? post.stats,
    ),
  );
}

export async function buildFeedThreads(
  limit = 50,
  offset = 0,
): Promise<FeedThread[]> {
  await ensurePostIndexes();

  const topLevelPosts = await getTopLevelPosts(limit, offset);
  return buildFeedThreadsFromPosts(topLevelPosts);
}

export async function buildThreadingFeedThreads(
  limit = 50,
  offset = 0,
): Promise<FeedThread[]> {
  await ensurePostIndexes();

  const since = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);
  const topLevelPosts = await getTrendingTopLevelPostsSince(since, limit, offset);
  return buildFeedThreadsFromPosts(topLevelPosts);
}
