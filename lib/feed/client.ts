import type { FeedThread } from "@/lib/types/post";

export type FeedTab = "threading" | "all";

export async function fetchFeed(
  tab: FeedTab,
): Promise<
  { ok: true; threads: FeedThread[] } | { ok: false; error: string }
> {
  const response = await fetch(
    `/api/feed?tab=${encodeURIComponent(tab)}`,
  );
  const data = (await response.json()) as {
    threads?: FeedThread[];
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not load feed." };
  }

  if (!data.threads) {
    return { ok: false, error: "Invalid server response." };
  }

  return { ok: true, threads: data.threads };
}

export async function fetchThread(
  postId: string,
): Promise<{ ok: true; thread: FeedThread } | { ok: false; error: string }> {
  const response = await fetch(`/api/posts/${encodeURIComponent(postId)}/thread`);
  const data = (await response.json()) as {
    thread?: FeedThread;
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not load thread." };
  }

  if (!data.thread) {
    return { ok: false, error: "Invalid server response." };
  }

  return { ok: true, thread: data.thread };
}
