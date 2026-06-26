"use client";

import { MessageCircle } from "lucide-react";

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
        className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/30 active:bg-muted/40"
      >
        <div className="flex gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <PostAuthor author={thread.author} timestamp={thread.timestamp} />

            <p className="pl-[52px] text-[15px] leading-snug whitespace-pre-wrap">
              {thread.content}
            </p>

            <div className="pl-[52px]">
              <PostActions stats={thread.stats} />
            </div>

            {previewReply && (
              <div className="mt-2 pl-[52px]">
                <div className="rounded-2xl border border-border/60 bg-muted/20 px-3 py-2 text-left">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MessageCircle className="size-3.5" />
                    <span>
                      {thread.replies.length}{" "}
                      {thread.replies.length === 1 ? "reply" : "replies"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[14px] leading-snug text-muted-foreground">
                    <span className="font-semibold text-foreground/80">
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
      <Separator className="bg-border/60" />
    </article>
  );
}
