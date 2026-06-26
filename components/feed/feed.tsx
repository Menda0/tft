"use client";

import { useState } from "react";

import { PostCard } from "@/components/feed/post-card";
import { ThreadView } from "@/components/feed/thread-view";
import { AppBar } from "@/components/layout/app-bar";
import { getThreadById, MOCK_THREADS } from "@/lib/mock/posts";

export function Feed() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const selectedThread = selectedThreadId
    ? getThreadById(selectedThreadId)
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
      <AppBar title="FakeX" />
      <section aria-label="Threads">
      {MOCK_THREADS.map((thread) => (
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
