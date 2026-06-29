import {
  getOriginalPostsByPersonality,
  getPostsByIds,
  getRepliesByPersonality,
  getRepostsByPersonality,
} from "@/lib/db/posts";
import { formatRelativeTime } from "@/lib/feed/format";
import { normalizePersonality } from "@/lib/personalities";
import type { Personality } from "@/lib/types/personality";
import type { Post } from "@/lib/types/post";
import type {
  ProfilePostItem,
  ProfilePostType,
  PublicPersonality,
} from "@/lib/types/profile";

export function toPublicPersonality(personality: Personality): PublicPersonality {
  const normalized = normalizePersonality(personality);

  return {
    id: normalized.id,
    name: normalized.name,
    handle: normalized.handle,
    avatarUrl: normalized.avatarUrl,
    description: normalized.description,
    archetype: normalized.archetype,
    kind: normalized.kind,
    gender: normalized.gender,
    pronouns: normalized.pronouns,
    stats: normalized.stats,
    politicalSwing: normalized.politicalSwing,
  };
}

function toProfilePostItem(
  post: Post,
  type: ProfilePostType,
  parentPostsById: Map<string, Post>,
  now: number,
): ProfilePostItem {
  const item: ProfilePostItem = {
    id: post.id,
    content: post.content,
    timestamp: formatRelativeTime(post.createdAt, now),
    threadId: post.id,
  };

  if (type === "posts") {
    item.stats = post.stats;
    return item;
  }

  if (type === "replies" && post.replyToPostId) {
    const parent = parentPostsById.get(post.replyToPostId);
    item.threadId = post.replyToPostId;
    item.replyToPostId = post.replyToPostId;
    item.parentAuthorHandle = parent?.author.handle;

    if (parent) {
      item.parentPost = {
        id: parent.id,
        authorName: parent.author.name,
        authorHandle: parent.author.handle,
        content: parent.content,
        timestamp: formatRelativeTime(parent.createdAt, now),
      };
    }

    return item;
  }

  if (type === "reposts" && post.repostOfPostId) {
    const source = parentPostsById.get(post.repostOfPostId);
    item.threadId = post.id;
    item.repostOfPostId = post.repostOfPostId;
    item.sourceAuthorHandle = source?.author.handle;
    item.stats = post.stats;
    return item;
  }

  return item;
}

async function buildParentPostsMap(
  posts: Post[],
  type: ProfilePostType,
): Promise<Map<string, Post>> {
  const parentIds = new Set<string>();

  for (const post of posts) {
    if (type === "replies" && post.replyToPostId) {
      parentIds.add(post.replyToPostId);
    }

    if (type === "reposts" && post.repostOfPostId) {
      parentIds.add(post.repostOfPostId);
    }
  }

  const parentPosts = await getPostsByIds([...parentIds]);
  return new Map(parentPosts.map((post) => [post.id, post]));
}

export async function buildProfilePosts(
  personalityId: string,
  type: ProfilePostType,
  limit = 50,
): Promise<ProfilePostItem[]> {
  let posts: Post[];

  switch (type) {
    case "posts":
      posts = await getOriginalPostsByPersonality(personalityId, limit);
      break;
    case "replies":
      posts = await getRepliesByPersonality(personalityId, limit);
      break;
    case "reposts":
      posts = await getRepostsByPersonality(personalityId, limit);
      break;
  }

  const parentPostsById = await buildParentPostsMap(posts, type);
  const now = Date.now();

  return posts.map((post) =>
    toProfilePostItem(post, type, parentPostsById, now),
  );
}
