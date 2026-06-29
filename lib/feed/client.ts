import type { FeedThread } from "@/lib/types/post";

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
