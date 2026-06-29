import type { FeedThread } from "@/lib/types/post";
import { PAGE_SIZE } from "@/lib/pagination";

export type FeedTab = "threading" | "all";

export const FEED_PAGE_SIZE = PAGE_SIZE;

type FetchFeedOptions = {
  limit?: number;
  offset?: number;
};

export async function fetchFeed(
  tab: FeedTab,
  options: FetchFeedOptions = {},
): Promise<
  | { ok: true; threads: FeedThread[]; hasMore: boolean }
  | { ok: false; error: string }
> {
  const limit = options.limit ?? FEED_PAGE_SIZE;
  const offset = options.offset ?? 0;
  const response = await fetch(
    `/api/feed?tab=${encodeURIComponent(tab)}&limit=${limit}&offset=${offset}`,
  );
  const data = (await response.json()) as {
    threads?: FeedThread[];
    hasMore?: boolean;
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not load feed." };
  }

  if (!data.threads || typeof data.hasMore !== "boolean") {
    return { ok: false, error: "Invalid server response." };
  }

  return { ok: true, threads: data.threads, hasMore: data.hasMore };
}

export async function fetchThread(
  postId: string,
  options: FetchFeedOptions = {},
): Promise<
  | { ok: true; thread: FeedThread; hasMore: boolean }
  | { ok: false; error: string }
> {
  const limit = options.limit ?? FEED_PAGE_SIZE;
  const offset = options.offset ?? 0;
  const response = await fetch(
    `/api/posts/${encodeURIComponent(postId)}/thread?limit=${limit}&offset=${offset}`,
  );
  const data = (await response.json()) as {
    thread?: FeedThread;
    hasMore?: boolean;
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not load thread." };
  }

  if (!data.thread || typeof data.hasMore !== "boolean") {
    return { ok: false, error: "Invalid server response." };
  }

  return { ok: true, thread: data.thread, hasMore: data.hasMore };
}
