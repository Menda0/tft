import Link from "next/link";
import type { RefObject } from "react";

import { PostActions } from "@/components/feed/post-actions";
import { PostMedia } from "@/components/feed/post-media";
import { Separator } from "@/components/ui/separator";
import type { ProfilePostItem } from "@/lib/types/profile";

type ProfilePostListProps = {
  items: ProfilePostItem[];
  emptyMessage: string;
  hasMore?: boolean;
  loadingMore?: boolean;
  loadMoreRef?: RefObject<HTMLDivElement | null>;
};

export function ProfilePostList({
  items,
  emptyMessage,
  hasMore = false,
  loadingMore = false,
  loadMoreRef,
}: ProfilePostListProps) {
  if (items.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-[#83769a]">{emptyMessage}</p>
    );
  }

  return (
    <div>
      {items.map((item) => (
        <article key={item.id}>
          <Link
            href={`/thread/${item.threadId}`}
            className="block px-4 py-3 transition-colors hover:bg-[#29366f]/80 active:bg-[#29366f]"
          >
            {item.parentPost ? (
              <div className="mb-3 pixel-border-thin bg-[#1d2b53] px-3 py-2 pixel-shadow-sm">
                <p className="truncate text-sm leading-6">
                  <span className="font-bold text-[#ffa300]">
                    {item.parentPost.authorName}
                  </span>{" "}
                  <span className="text-[#c2c3c7]">
                    @{item.parentPost.authorHandle}
                  </span>{" "}
                  <span className="text-[#83769a]">
                    · {item.parentPost.timestamp}
                  </span>
                </p>
                <p className="mt-1 line-clamp-4 text-sm leading-relaxed whitespace-pre-wrap text-[#c2c3c7]">
                  {item.parentPost.content}
                </p>
              </div>
            ) : item.parentAuthorHandle ? (
              <p className="mb-1 text-xs text-[#83769a]">
                Replying to @{item.parentAuthorHandle}
              </p>
            ) : null}
            {item.sourceAuthorHandle ? (
              <p className="mb-1 text-xs text-[#83769a]">
                Reposted from @{item.sourceAuthorHandle}
              </p>
            ) : null}
            <p className="text-base leading-relaxed whitespace-pre-wrap text-[#fff1e8]">
              {item.content}
            </p>
            <PostMedia
              mediaUrl={item.mediaUrl}
              mediaStatus={item.mediaStatus}
            />
            <p className="mt-1 text-xs text-[#83769a]">{item.timestamp}</p>
            {item.stats ? (
              <div onClick={(event) => event.preventDefault()}>
                <PostActions stats={item.stats} />
              </div>
            ) : null}
          </Link>
          <Separator className="h-[2px] bg-foreground" />
        </article>
      ))}
      {hasMore && loadMoreRef ? (
        <div ref={loadMoreRef} className="px-4 py-6 text-center">
          {loadingMore ? (
            <p className="text-sm text-[#83769a]">Loading more posts...</p>
          ) : (
            <p className="text-sm text-[#83769a]">Scroll for more</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
