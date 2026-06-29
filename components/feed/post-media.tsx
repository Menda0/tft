import type { PostMediaStatus } from "@/lib/types/post";
import { cn } from "@/lib/utils";

type PostMediaProps = {
  mediaUrl?: string | null;
  mediaStatus?: PostMediaStatus;
  className?: string;
};

export function PostMedia({
  mediaUrl,
  mediaStatus = "none",
  className,
}: PostMediaProps) {
  if (mediaUrl && mediaStatus === "ready") {
    return (
      <div className={cn("mt-3 overflow-hidden pixel-border-thin bg-[#1d2b53]", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt="Post pixel art media"
          className="aspect-[16/10] w-full object-cover [image-rendering:pixelated]"
        />
      </div>
    );
  }

  if (mediaStatus === "pending" || mediaStatus === "generating") {
    return (
      <div
        className={cn(
          "mt-3 flex aspect-[16/10] items-center justify-center pixel-border-thin bg-[#1d2b53] px-3 text-center",
          className,
        )}
      >
        <p className="pixel-heading text-[8px] text-[#29adff]">
          GENERATING PIXEL ART...
        </p>
      </div>
    );
  }

  return null;
}
