import { PostActions } from "@/components/feed/post-actions";
import { PostAuthor } from "@/components/feed/post-author";
import { ReplyCard } from "@/components/feed/reply-card";
import { Separator } from "@/components/ui/separator";
import type { MockThread } from "@/lib/mock/posts";

type ThreadViewProps = {
  thread: MockThread;
};

export function ThreadView({ thread }: ThreadViewProps) {
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
          {thread.replies.length}{" "}
          {thread.replies.length === 1 ? "REPLY" : "REPLIES"}
        </p>
      </div>

      {thread.replies.map((reply, index) => (
        <ReplyCard
          key={reply.id}
          reply={reply}
          isLast={index === thread.replies.length - 1}
        />
      ))}
    </section>
  );
}
