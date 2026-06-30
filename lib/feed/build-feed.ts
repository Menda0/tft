import {
  getPostById,
  getRepliesForPost,
  getTopLevelPosts,
  getTopPreviewRepliesForPosts,
  getTrendingTopLevelPostsSince,
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

  const postIds = topLevelPosts.map((post) => post.id);
  const previewReplies = await getTopPreviewRepliesForPosts(postIds);
  const now = Date.now();

  return topLevelPosts.map((post) => {
    const preview = previewReplies.get(post.id);

    return toFeedThread(post, preview ? [preview] : [], now, post.stats);
  });
}

export async function buildFeedThreads(
  limit = 50,
  offset = 0,
): Promise<FeedThread[]> {
  const topLevelPosts = await getTopLevelPosts(limit, offset);
  return buildFeedThreadsFromPosts(topLevelPosts);
}

export async function buildThreadingFeedThreads(
  limit = 50,
  offset = 0,
): Promise<FeedThread[]> {
  const since = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);
  const topLevelPosts = await getTrendingTopLevelPostsSince(since, limit, offset);
  return buildFeedThreadsFromPosts(topLevelPosts);
}
