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
  { icon: "💬", key: "replies" as const, color: "hover:bg-[#29adff]" },
  { icon: "♥", key: "likes" as const, color: "hover:bg-[#ff004d]" },
  { icon: "👁", key: "views" as const, color: "hover:bg-[#00e436]" },
] as const;

export function PostActions({ stats }: PostActionsProps) {
  return (
    <div className="mt-3 flex max-w-xs items-center gap-4 text-[#c2c3c7]">
      {ACTIONS.map(({ icon, key, color }) => (
        <button
          key={key}
          type="button"
          className={`flex items-center gap-1.5 pixel-border-thin bg-[#29366f] px-2 py-1 text-xs transition-colors hover:text-[#1d2b53] ${color}`}
        >
          <span>{icon}</span>
          <span className="tabular-nums">{formatCount(stats[key])}</span>
        </button>
      ))}
    </div>
  );
}
