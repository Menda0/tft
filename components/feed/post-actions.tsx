import { BarChart3, Heart, MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type PostActionsProps = {
  stats: {
    replies: number;
    likes: number;
    views: number;
  };
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const ACTIONS = [
  {
    icon: MessageCircle,
    key: "replies" as const,
    hover: "hover:text-sky-500 hover:[&>span:first-child]:bg-sky-500/10",
  },
  {
    icon: Heart,
    key: "likes" as const,
    hover: "hover:text-pink-500 hover:[&>span:first-child]:bg-pink-500/10",
  },
  {
    icon: BarChart3,
    key: "views" as const,
    hover: "hover:text-sky-500 hover:[&>span:first-child]:bg-sky-500/10",
  },
] as const;

export function PostActions({ stats }: PostActionsProps) {
  return (
    <div className="mt-3 flex max-w-xs items-center gap-8 text-muted-foreground">
      {ACTIONS.map(({ icon: Icon, key, hover }) => (
        <button
          key={key}
          type="button"
          className={cn(
            "group flex items-center gap-1.5 transition-colors",
            hover,
          )}
        >
          <span className="rounded-full p-1.5 transition-colors">
            <Icon className="size-[18px]" />
          </span>
          <span className="text-xs tabular-nums">{formatCount(stats[key])}</span>
        </button>
      ))}
    </div>
  );
}
