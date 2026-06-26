import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/components/feed/post-author";
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
          <div className="absolute top-10 bottom-0 w-0.5 bg-border/60" />
        )}
        <Avatar size="default" className="size-10">
          <AvatarFallback
            className={cn(
              "text-xs font-semibold text-white",
              reply.author.avatarColor,
            )}
          >
            {getInitials(reply.author.name)}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] leading-5">
          <span className="font-bold">{reply.author.name}</span>{" "}
          <span className="text-muted-foreground">@{reply.author.handle}</span>{" "}
          <span className="text-muted-foreground">· {reply.timestamp}</span>
        </div>
        <p className="mt-0.5 text-[15px] leading-snug whitespace-pre-wrap">
          {reply.content}
        </p>
      </div>
    </article>
  );
}
