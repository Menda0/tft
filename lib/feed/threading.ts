import { getTrendingTopLevelPostsSince } from "@/lib/db/posts";
import { startOfThreadingWindow } from "@/lib/simulation/limits";
import type { Post } from "@/lib/types/post";

const DEFAULT_THREADING_POST_LIMIT = 20;

export async function getThreadingPosts(
  limit = DEFAULT_THREADING_POST_LIMIT,
  offset = 0,
): Promise<Post[]> {
  return getTrendingTopLevelPostsSince(startOfThreadingWindow(), limit, offset);
}
