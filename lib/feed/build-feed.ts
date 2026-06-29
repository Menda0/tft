import {
  ensurePostIndexes,
  getPostById,
  getRepliesForPosts,
  getTopLevelPosts,
} from "@/lib/db/posts";
import { avatarColorForHandle, formatRelativeTime } from "@/lib/feed/format";
import type {
  FeedAuthor,
  FeedReply,
  FeedThread,
  Post,
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
  };
}

function toFeedThread(
  post: Post,
  replies: Post[],
  now: number,
): FeedThread {
  return {
    id: post.id,
    author: toFeedAuthor(post.author),
    content: post.content,
    timestamp: formatRelativeTime(post.createdAt, now),
    stats: post.stats,
    replies: replies.map((reply) => toFeedReply(reply, now)),
  };
}

export async function buildThreadByPostId(
  postId: string,
): Promise<FeedThread | null> {
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

  const replies = await getRepliesForPosts([rootPost.id]);
  const now = Date.now();

  return toFeedThread(rootPost, replies, now);
}

export async function buildFeedThreads(limit = 50): Promise<FeedThread[]> {
  await ensurePostIndexes();

  const topLevelPosts = await getTopLevelPosts(limit);

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

  const now = Date.now();
  return topLevelPosts.map((post) =>
    toFeedThread(post, repliesByPostId.get(post.id) ?? [], now),
  );
}
