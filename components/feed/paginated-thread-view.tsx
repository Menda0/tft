"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ThreadView } from "@/components/feed/thread-view";
import { fetchThread } from "@/lib/feed/client";
import type { FeedThread } from "@/lib/types/post";

type PaginatedThreadViewProps = {
  postId: string;
};

export function PaginatedThreadView({ postId }: PaginatedThreadViewProps) {
  const [thread, setThread] = useState<FeedThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef(thread);

  useEffect(() => {
    threadRef.current = thread;
  }, [thread]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !threadRef.current) {
      return;
    }

    setLoadingMore(true);

    const result = await fetchThread(postId, {
      offset: threadRef.current.replies.length,
    });

    if (!result.ok) {
      console.error("Thread load failed:", result.error);
      setError(result.error);
      setLoadingMore(false);
      return;
    }

    setThread((current) =>
      current
        ? {
            ...result.thread,
            replies: [...current.replies, ...result.thread.replies],
          }
        : result.thread,
    );
    setHasMore(result.hasMore);
    setError(null);
    setLoadingMore(false);
  }, [hasMore, loadingMore, postId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadingMore(false);
      setThread(null);
      setHasMore(false);
      setError(null);

      const result = await fetchThread(postId);

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setThread(result.thread);
      setHasMore(result.hasMore);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [postId]);

  useEffect(() => {
    const element = loadMoreRef.current;

    if (!element || loading || loadingMore || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadMore, loading, loadingMore, thread?.replies.length]);

  if (loading) {
    return <p className="px-4 py-6 text-sm text-[#83769a]">Loading thread...</p>;
  }

  if (error) {
    return <p className="px-4 py-6 text-sm text-[#ff004d]">{error}</p>;
  }

  if (!thread) {
    return null;
  }

  return (
    <ThreadView
      thread={thread}
      hasMore={hasMore}
      loadingMore={loadingMore}
      loadMoreRef={loadMoreRef}
    />
  );
}
