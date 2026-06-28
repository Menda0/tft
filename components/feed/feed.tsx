"use client";

import { useCallback, useEffect, useState } from "react";

import { PostCard } from "@/components/feed/post-card";
import { ThreadView } from "@/components/feed/thread-view";
import { AppBar } from "@/components/layout/app-bar";
import { PROJECT_NAME } from "@/lib/brand";
import type { FeedThread } from "@/lib/types/post";

export function Feed() {
  const [threads, setThreads] = useState<FeedThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    try {
      const response = await fetch("/api/feed");

      if (!response.ok) {
        throw new Error("Could not load feed.");
      }

      const data = (await response.json()) as { threads: FeedThread[] };
      setThreads(data.threads);
      setError(null);
    } catch (loadError) {
      console.error("Feed load failed:", loadError);
      setError("Could not load feed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed();

    const intervalId = window.setInterval(() => {
      void loadFeed();
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [loadFeed]);

  const selectedThread = selectedThreadId
    ? threads.find((thread) => thread.id === selectedThreadId) ?? null
    : null;

  if (selectedThread) {
    return (
      <>
        <AppBar title="Thread" onBack={() => setSelectedThreadId(null)} />
        <ThreadView thread={selectedThread} />
      </>
    );
  }

  return (
    <>
      <AppBar title={PROJECT_NAME} />
      <section aria-label="Threads">
        {loading && (
          <p className="px-4 py-6 text-sm text-[#83769a]">Loading feed...</p>
        )}
        {!loading && error && (
          <p className="px-4 py-6 text-sm text-[#ff004d]">{error}</p>
        )}
        {!loading && !error && threads.length === 0 && (
          <p className="px-4 py-6 text-sm text-[#83769a]">
            No posts yet. Create personalities and run a simulation tick.
          </p>
        )}
        {threads.map((thread) => (
          <PostCard
            key={thread.id}
            thread={thread}
            onOpen={() => setSelectedThreadId(thread.id)}
          />
        ))}
      </section>
    </>
  );
}
