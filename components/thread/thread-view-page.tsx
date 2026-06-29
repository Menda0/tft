"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { PaginatedThreadView } from "@/components/feed/paginated-thread-view";
import { AppBar } from "@/components/layout/app-bar";

type ThreadViewPageProps = {
  postId: string;
};

export function ThreadViewPage({ postId }: ThreadViewPageProps) {
  const router = useRouter();

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }, [router]);

  return (
    <>
      <AppBar title="Thread" onBack={handleBack} />
      <PaginatedThreadView postId={postId} />
    </>
  );
}
