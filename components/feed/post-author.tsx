import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileLink } from "@/components/profile/profile-link";
import { getPixelAvatarColor } from "@/lib/pixel-theme";
import type { FeedAuthor } from "@/lib/types/post";
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
  author: FeedAuthor;
  timestamp: string;
  size?: "default" | "sm";
};

export function PostAuthor({
  author,
  timestamp,
  size = "default",
}: PostAuthorProps) {
  const avatarSize = size === "sm" ? "size-8" : "size-10";

  return (
    <div className="flex items-start gap-3">
      <ProfileLink handle={author.handle} className="shrink-0 hover:no-underline">
        <Avatar
          size={size === "sm" ? "default" : "lg"}
          className={cn(
            avatarSize,
            "rounded-none after:rounded-none after:border-2 after:border-[#fff1e8]",
          )}
        >
          {author.avatarUrl ? (
            <AvatarImage src={author.avatarUrl} alt={author.name} />
          ) : null}
          <AvatarFallback
            className={cn(
              "rounded-none text-[10px] font-bold text-[#1d2b53] pixel-heading",
              getPixelAvatarColor(author.avatarColor),
            )}
          >
            {getInitials(author.name)}
          </AvatarFallback>
        </Avatar>
      </ProfileLink>

      <div className="min-w-0 truncate text-base leading-6">
        <ProfileLink handle={author.handle} className="font-bold text-[#ffa300]">
          {author.name}
        </ProfileLink>{" "}
        <ProfileLink handle={author.handle} className="text-[#c2c3c7]">
          @{author.handle}
        </ProfileLink>{" "}
        <span className="text-[#83769a]">· {timestamp}</span>
      </div>
    </div>
  );
}
