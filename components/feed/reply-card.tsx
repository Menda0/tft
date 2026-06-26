import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/components/feed/post-author";
import { getPixelAvatarColor } from "@/lib/pixel-theme";
import type { MockReply } from "@/lib/mock/posts";
import { cn } from "@/lib/utils";

type ReplyCardProps = {
  reply: MockReply;
  isLast?: boolean;
};

export function ReplyCard({ reply, isLast = false }: ReplyCardProps) {
  return (
    <article className="relative flex gap-3 px-4 py-3">
      <div className="relative flex w-10 shrink-0 flex-col items-center">
        {!isLast && (
          <div className="absolute top-10 bottom-0 w-[2px] bg-[#fff1e8]/40" />
        )}
        <Avatar
          size="default"
          className="size-10 rounded-none after:rounded-none after:border-2 after:border-[#fff1e8]"
        >
          <AvatarFallback
            className={cn(
              "rounded-none text-[10px] font-bold text-[#1d2b53] pixel-heading",
              getPixelAvatarColor(reply.author.avatarColor),
            )}
          >
            {getInitials(reply.author.name)}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-base leading-6">
          <span className="font-bold text-[#ffa300]">{reply.author.name}</span>{" "}
          <span className="text-[#c2c3c7]">@{reply.author.handle}</span>{" "}
          <span className="text-[#83769a]">· {reply.timestamp}</span>
        </div>
        <p className="mt-0.5 text-base leading-relaxed whitespace-pre-wrap">
          {reply.content}
        </p>
      </div>
    </article>
  );
}
