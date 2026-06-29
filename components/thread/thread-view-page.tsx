"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ThreadView } from "@/components/feed/thread-view";
import { AppBar } from "@/components/layout/app-bar";
import { fetchThread } from "@/lib/feed/client";
import type { FeedThread } from "@/lib/types/post";

type ThreadViewPageProps = {
  postId: string;
};

export function ThreadViewPage({ postId }: ThreadViewPageProps) {
  const router = useRouter();
  const [thread, setThread] = useState<FeedThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadThread() {
      setLoading(true);
      const result = await fetchThread(postId);

      if (cancelled) return;

      if (!result.ok) {
        setError(result.error);
        setThread(null);
        setLoading(false);
        return;
      }

      setThread(result.thread);
      setError(null);
      setLoading(false);
    }

    void loadThread();

    return () => {
      cancelled = true;
    };
  }, [postId]);

  return (
    <>
      <AppBar title="Thread" onBack={handleBack} />
      {loading && (
        <p className="px-4 py-6 text-sm text-[#83769a]">Loading thread...</p>
      )}
      {!loading && error && (
        <p className="px-4 py-6 text-sm text-[#ff004d]">{error}</p>
      )}
      {!loading && thread ? <ThreadView thread={thread} /> : null}
    </>
  );
}
