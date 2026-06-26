import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { MockAuthor } from "@/lib/mock/posts";
import { cn } from "@/lib/utils";

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type PostAuthorProps = {
  author: MockAuthor;
  timestamp: string;
  size?: "default" | "sm";
};

export function PostAuthor({
  author,
  timestamp,
  size = "default",
}: PostAuthorProps) {
  return (
    <div className="flex items-start gap-3">
      <Avatar size={size === "sm" ? "default" : "lg"} className="size-10 shrink-0">
        <AvatarFallback
          className={cn(
            "text-xs font-semibold text-white",
            author.avatarColor,
          )}
        >
          {getInitials(author.name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 truncate text-[15px] leading-5">
        <span className="font-bold">{author.name}</span>{" "}
        <span className="text-muted-foreground">@{author.handle}</span>{" "}
        <span className="text-muted-foreground">· {timestamp}</span>
      </div>
    </div>
  );
}
