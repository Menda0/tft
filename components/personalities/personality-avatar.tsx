"use client";

import { getInitials } from "@/components/feed/post-author";
import { getPixelAvatarColor } from "@/lib/pixel-theme";
import type { Personality } from "@/lib/types/personality";
import { cn } from "@/lib/utils";

type PersonalityAvatarProps = {
  personality: Personality;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const FALLBACK_COLORS = [
  "bg-amber-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-red-600",
  "bg-emerald-500",
] as const;

function getFallbackAvatarColor(seed: string): string {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash + seed.charCodeAt(index) * (index + 1)) % FALLBACK_COLORS.length;
  }

  return getPixelAvatarColor(FALLBACK_COLORS[hash] ?? "bg-violet-500");
}

const SIZE_CLASSES = {
  sm: "size-10 text-[9px]",
  md: "size-14 text-[10px]",
  lg: "size-24 text-[11px]",
} as const;

export function PersonalityAvatar({
  personality,
  size = "md",
  className,
}: PersonalityAvatarProps) {
  const sizeClass = SIZE_CLASSES[size];
  const isLoading =
    personality.avatarStatus === "pending" ||
    personality.avatarStatus === "generating";

  if (personality.avatarStatus === "ready" && personality.avatarUrl) {
    return (
      <div
        className={cn(
          "overflow-hidden pixel-border-thin bg-[#1d2b53]",
          sizeClass,
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={personality.avatarUrl}
          alt={`${personality.name} pixel art avatar`}
          className="size-full object-cover [image-rendering:pixelated]"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden pixel-border-thin bg-[#1d2b53]",
        sizeClass,
        className,
      )}
    >
      <div
        className={cn(
          "flex size-full items-center justify-center font-bold text-[#1d2b53] pixel-heading",
          getFallbackAvatarColor(personality.handle),
        )}
      >
        {getInitials(personality.name)}
      </div>

      {isLoading ? (
        <div className="absolute inset-0 flex items-end justify-center bg-[#1d2b53]/70 pb-1">
          <span className="animate-pulse pixel-heading text-[7px] text-[#29adff]">
            ...
          </span>
        </div>
      ) : null}

      {personality.avatarStatus === "failed" ? (
        <div className="absolute inset-x-0 bottom-0 bg-[#7e2553] px-1 py-0.5 text-center pixel-heading text-[6px] text-[#fff1e8]">
          RETRY
        </div>
      ) : null}
    </div>
  );
}
