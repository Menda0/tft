"use client";

import { useCallback, useEffect, useState } from "react";

import { PostCard } from "@/components/feed/post-card";
import { ThreadView } from "@/components/feed/thread-view";
import { AppBar } from "@/components/layout/app-bar";
import { PROJECT_NAME } from "@/lib/brand";
import { fetchFeed, type FeedTab } from "@/lib/feed/client";
import type { FeedThread } from "@/lib/types/post";
import { cn } from "@/lib/utils";

const TABS: { id: FeedTab; label: string }[] = [
  { id: "threading", label: "Threading" },
  { id: "all", label: "All" },
];

const EMPTY_MESSAGES: Record<FeedTab, string> = {
  threading: "No threads in the last 24 hours.",
  all: "No posts yet. Create personalities and run a simulation tick.",
};

export function Feed() {
  const [activeTab, setActiveTab] = useState<FeedTab>("threading");
  const [threads, setThreads] = useState<FeedThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async (tab: FeedTab) => {
    const result = await fetchFeed(tab);

    if (!result.ok) {
      console.error("Feed load failed:", result.error);
      setError(result.error);
      setLoading(false);
      return;
    }

    setThreads(result.threads);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const result = await fetchFeed(activeTab);

      if (cancelled) return;

      if (!result.ok) {
        console.error("Feed load failed:", result.error);
        setError(result.error);
        setLoading(false);
        return;
      }

      setThreads(result.threads);
      setError(null);
      setLoading(false);
    }

    void load();

    const intervalId = window.setInterval(() => {
      void loadFeed(activeTab);
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeTab, loadFeed]);

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

      <div className="flex border-b-[2px] border-foreground">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 px-2 py-3 text-center pixel-heading text-[9px] transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-[#ffa300] text-[#ffa300]"
                : "text-[#83769a] hover:text-[#c2c3c7]",
            )}
          >
            {tab.label.toUpperCase()}
          </button>
        ))}
      </div>

      <section aria-label={activeTab === "threading" ? "Threading" : "All posts"}>
        {loading && (
          <p className="px-4 py-6 text-sm text-[#83769a]">Loading feed...</p>
        )}
        {!loading && error && (
          <p className="px-4 py-6 text-sm text-[#ff004d]">{error}</p>
        )}
        {!loading && !error && threads.length === 0 && (
          <p className="px-4 py-6 text-sm text-[#83769a]">
            {EMPTY_MESSAGES[activeTab]}
          </p>
        )}
        {!loading &&
          !error &&
          threads.map((thread) => (
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
