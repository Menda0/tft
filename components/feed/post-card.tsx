"use client";

import { PostActions } from "@/components/feed/post-actions";
import { PostAuthor } from "@/components/feed/post-author";
import { Separator } from "@/components/ui/separator";
import type { MockThread } from "@/lib/mock/posts";

type PostCardProps = {
  thread: MockThread;
  onOpen?: () => void;
};

export function PostCard({ thread, onOpen }: PostCardProps) {
  const previewReply = thread.replies[thread.replies.length - 1];

  return (
    <article>
      <button
        type="button"
        onClick={onOpen}
        className="w-full px-4 py-3 text-left transition-colors hover:bg-[#29366f]/80 active:bg-[#29366f]"
      >
        <div className="flex gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <PostAuthor author={thread.author} timestamp={thread.timestamp} />

            <p className="pl-[52px] text-base leading-relaxed whitespace-pre-wrap">
              {thread.content}
            </p>

            <div className="pl-[52px]">
              <PostActions stats={thread.stats} />
            </div>

            {previewReply && (
              <div className="mt-3 pl-[52px]">
                <div className="pixel-border-thin bg-[#1d2b53] px-3 py-2 text-left pixel-shadow-sm">
                  <div className="flex items-center gap-1.5 text-xs text-[#29adff]">
                    <span>💬</span>
                    <span>
                      {thread.replies.length}{" "}
                      {thread.replies.length === 1 ? "REPLY" : "REPLIES"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#c2c3c7]">
                    <span className="font-bold text-[#ffa300]">
                      @{previewReply.author.handle}
                    </span>{" "}
                    {previewReply.content}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </button>
      <Separator className="h-[2px] bg-foreground" />
    </article>
  );
}
