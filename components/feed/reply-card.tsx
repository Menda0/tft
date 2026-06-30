"use client";

import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/components/feed/post-author";
import { PostLikesDialog } from "@/components/feed/post-likes-dialog";
import { ProfileLink } from "@/components/profile/profile-link";
import { getPixelAvatarColor } from "@/lib/pixel-theme";
import type { FeedReply } from "@/lib/types/post";
import { cn } from "@/lib/utils";

type ReplyCardProps = {
  reply: FeedReply;
  isLast?: boolean;
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function ReplyCard({ reply, isLast = false }: ReplyCardProps) {
  const [likesOpen, setLikesOpen] = useState(false);

  return (
    <article className="relative flex gap-3 px-4 py-3">
      <div className="relative flex w-10 shrink-0 flex-col items-center">
        {!isLast && (
          <div className="absolute top-10 bottom-0 w-[2px] bg-[#fff1e8]/40" />
        )}
        <ProfileLink handle={reply.author.handle} className="hover:no-underline">
          <Avatar
            size="default"
            className="size-10 rounded-none after:rounded-none after:border-2 after:border-[#fff1e8]"
          >
            {reply.author.avatarUrl ? (
              <AvatarImage src={reply.author.avatarUrl} alt={reply.author.name} />
            ) : null}
            <AvatarFallback
              className={cn(
                "rounded-none text-[10px] font-bold text-[#1d2b53] pixel-heading",
                getPixelAvatarColor(reply.author.avatarColor),
              )}
            >
              {getInitials(reply.author.name)}
            </AvatarFallback>
          </Avatar>
        </ProfileLink>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-base leading-6">
              <ProfileLink
                handle={reply.author.handle}
                className="font-bold text-[#ffa300]"
              >
                {reply.author.name}
              </ProfileLink>
            </div>
            <div className="truncate text-sm leading-5">
              <ProfileLink handle={reply.author.handle} className="text-[#c2c3c7]">
                @{reply.author.handle}
              </ProfileLink>
            </div>
          </div>
          <span className="shrink-0 text-sm text-[#83769a]">{reply.timestamp}</span>
        </div>
        <p className="mt-0.5 text-base leading-relaxed whitespace-pre-wrap">
          {reply.content}
        </p>
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setLikesOpen(true)}
            className="inline-flex items-center gap-1.5 pixel-border-thin bg-[#29366f] px-2 py-1 text-xs text-[#c2c3c7] transition-colors hover:bg-[#ff004d] hover:text-[#1d2b53]"
          >
            <span>♥</span>
            <span className="tabular-nums">{formatCount(reply.likes)}</span>
          </button>
        </div>
      </div>

      <PostLikesDialog
        postId={reply.id}
        likeCount={reply.likes}
        open={likesOpen}
        onOpenChange={setLikesOpen}
      />
    </article>
  );
}
