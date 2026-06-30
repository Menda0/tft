"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { PostCard } from "@/components/feed/post-card";
import { PaginatedThreadView } from "@/components/feed/paginated-thread-view";
import { AppBar } from "@/components/layout/app-bar";
import { ActivityPanel } from "@/components/layout/my-social-panel";
import { PROJECT_NAME } from "@/lib/brand";
import { FEED_PAGE_SIZE, fetchFeed, type FeedTab } from "@/lib/feed/client";
import type { FeedThread } from "@/lib/types/post";
import { cn } from "@/lib/utils";

type MainTab = FeedTab | "activity";

const FEED_TABS: { id: FeedTab; label: string }[] = [
  { id: "threading", label: "Threading" },
  { id: "all", label: "All" },
];

const ACTIVITY_TAB = { id: "activity" as const, label: "Activity" };

const EMPTY_MESSAGES: Record<FeedTab, string> = {
  threading: "No threads in the last 6 hours.",
  all: "No posts yet. Create personalities and run a simulation tick.",
};

const REFRESH_INTERVAL_MS = 60_000;

export function Feed() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<MainTab>("threading");
  const [threads, setThreads] = useState<FeedThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const threadsRef = useRef(threads);

  const visibleTabs: { id: MainTab; label: string }[] = user
    ? [...FEED_TABS, ACTIVITY_TAB]
    : FEED_TABS;

  const displayTab: MainTab =
    !user && activeTab === "activity" ? "threading" : activeTab;

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  const refreshFeed = useCallback(async (tab: FeedTab) => {
    const currentCount = threadsRef.current.length;
    const limit = Math.max(currentCount, FEED_PAGE_SIZE);
    const result = await fetchFeed(tab, { offset: 0, limit: limit + 1 });

    if (!result.ok) {
      console.error("Feed load failed:", result.error);
      setError(result.error);
      return;
    }

    const nextHasMore = result.threads.length > limit;

    setThreads(result.threads.slice(0, limit));
    setHasMore(nextHasMore);
    setError(null);
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || displayTab === "activity") {
      return;
    }

    setLoadingMore(true);

    const result = await fetchFeed(displayTab, {
      offset: threadsRef.current.length,
    });

    if (!result.ok) {
      console.error("Feed load failed:", result.error);
      setError(result.error);
      setLoadingMore(false);
      return;
    }

    setThreads((current) => [...current, ...result.threads]);
    setHasMore(result.hasMore);
    setError(null);
    setLoadingMore(false);
  }, [displayTab, hasMore, loadingMore]);

  useEffect(() => {
    if (displayTab === "activity") {
      return;
    }

    const feedTab = displayTab;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadingMore(false);
      setThreads([]);
      setHasMore(false);
      setError(null);

      const result = await fetchFeed(feedTab);

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        console.error("Feed load failed:", result.error);
        setError(result.error);
        setLoading(false);
        return;
      }

      setThreads(result.threads);
      setHasMore(result.hasMore);
      setLoading(false);
    }

    void load();

    const intervalId = window.setInterval(() => {
      void refreshFeed(feedTab);
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [displayTab, refreshFeed]);

  useEffect(() => {
    if (displayTab === "activity") {
      return;
    }

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
  }, [displayTab, hasMore, loadMore, loading, loadingMore, threads.length]);

  const selectedThread = selectedThreadId;

  if (selectedThread) {
    return (
      <>
        <AppBar title="Thread" onBack={() => setSelectedThreadId(null)} />
        <PaginatedThreadView postId={selectedThread} />
      </>
    );
  }

  return (
    <>
      <AppBar title={PROJECT_NAME} />

      <div className="flex border-b-[2px] border-foreground">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 px-1 py-3 text-center pixel-heading transition-colors",
              visibleTabs.length > 2 ? "text-[8px]" : "text-[9px]",
              displayTab === tab.id
                ? tab.id === "activity"
                  ? "border-b-2 border-[#c2c3c7] text-[#c2c3c7]"
                  : "border-b-2 border-[#ffa300] text-[#ffa300]"
                : "text-[#83769a] hover:text-[#c2c3c7]",
            )}
          >
            {tab.label.toUpperCase()}
          </button>
        ))}
      </div>

      {displayTab === "activity" ? (
        <section aria-label="Activity log" className="px-4 py-4">
          <ActivityPanel token={token} />
        </section>
      ) : (
        <section
          aria-label={displayTab === "threading" ? "Threading" : "All posts"}
        >
          {loading && (
            <p className="px-4 py-6 text-sm text-[#83769a]">Loading feed...</p>
          )}
          {!loading && error && (
            <p className="px-4 py-6 text-sm text-[#ff004d]">{error}</p>
          )}
          {!loading && !error && threads.length === 0 && (
            <p className="px-4 py-6 text-sm text-[#83769a]">
              {EMPTY_MESSAGES[displayTab]}
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
          {!loading && !error && hasMore && (
            <div ref={loadMoreRef} className="px-4 py-6 text-center">
              {loadingMore ? (
                <p className="text-sm text-[#83769a]">Loading more posts...</p>
              ) : (
                <p className="text-sm text-[#83769a]">Scroll for more</p>
              )}
            </div>
          )}
        </section>
      )}
    </>
  );
}
