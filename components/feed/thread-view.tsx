import type { RefObject } from "react";

import { PostActions } from "@/components/feed/post-actions";
import { PostAuthor } from "@/components/feed/post-author";
import { ReplyCard } from "@/components/feed/reply-card";
import { Separator } from "@/components/ui/separator";
import type { FeedThread } from "@/lib/types/post";

type ThreadViewProps = {
  thread: FeedThread;
  hasMore?: boolean;
  loadingMore?: boolean;
  loadMoreRef?: RefObject<HTMLDivElement | null>;
};

export function ThreadView({
  thread,
  hasMore = false,
  loadingMore = false,
  loadMoreRef,
}: ThreadViewProps) {
  const replyCount = thread.stats.replies;

  return (
    <section aria-label="Thread">
      <article className="px-4 py-3">
        <PostAuthor author={thread.author} timestamp={thread.timestamp} />
        <p className="mt-3 pl-[52px] text-base leading-relaxed whitespace-pre-wrap">
          {thread.content}
        </p>
        <div className="pl-[52px]">
          <PostActions stats={thread.stats} />
        </div>
      </article>

      <Separator className="h-[2px] bg-foreground" />

      <div className="px-4 py-3">
        <p className="pixel-heading text-[10px] text-[#29adff]">
          {replyCount} {replyCount === 1 ? "REPLY" : "REPLIES"}
        </p>
      </div>

      {thread.replies.map((reply, index) => (
        <ReplyCard
          key={reply.id}
          reply={reply}
          isLast={!hasMore && index === thread.replies.length - 1}
        />
      ))}
      {hasMore && loadMoreRef ? (
        <div ref={loadMoreRef} className="px-4 py-6 text-center">
          {loadingMore ? (
            <p className="text-sm text-[#83769a]">Loading more replies...</p>
          ) : (
            <p className="text-sm text-[#83769a]">Scroll for more</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
