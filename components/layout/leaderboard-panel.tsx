"use client";

import { useCallback, useEffect, useState } from "react";

import { getInitials } from "@/components/feed/post-author";
import { ProfileLink } from "@/components/profile/profile-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchLeaderboardPage } from "@/lib/desktop/client";
import { LEADERBOARD_LIMIT } from "@/lib/pagination";
import { formatStatValue } from "@/lib/personalities/stats";
import { getPixelAvatarColor } from "@/lib/pixel-theme";
import type {
  FarmerLeaderboardEntry,
  LeaderboardPagePayload,
  LeaderboardTab,
  PersonalityLeaderboardEntry,
} from "@/lib/types/desktop";
import { cn } from "@/lib/utils";

const TABS: {
  id: LeaderboardTab;
  label: string;
  scoreLabel: string;
  scoreColor: string;
  title: string;
}[] = [
  {
    id: "clout-personality",
    label: "CLOUT",
    scoreLabel: "CLOUT",
    scoreColor: "#ffa300",
    title: "TOP CLOUT",
  },
  {
    id: "clout-farmers",
    label: "FARMERS",
    scoreLabel: "CLOUT",
    scoreColor: "#29adff",
    title: "TOP FARMERS",
  },
  {
    id: "heat-personality",
    label: "HEAT",
    scoreLabel: "HEAT",
    scoreColor: "#ff004d",
    title: "TOP HEAT",
  },
  {
    id: "heat-farmers",
    label: "CONTROVERSIAL",
    scoreLabel: "HEAT",
    scoreColor: "#ff004d",
    title: "TOP CONTROVERSIAL",
  },
];

type LeaderboardPanelBaseProps = {
  title: string;
  scoreLabel: string;
  scoreColor: string;
  loading?: boolean;
  error?: string | null;
};

type PersonalityLeaderboardPanelProps = LeaderboardPanelBaseProps & {
  kind: "personality";
  entries: PersonalityLeaderboardEntry[];
};

type FarmerLeaderboardPanelProps = LeaderboardPanelBaseProps & {
  kind: "farmer";
  entries: FarmerLeaderboardEntry[];
};

export type LeaderboardPanelProps =
  | PersonalityLeaderboardPanelProps
  | FarmerLeaderboardPanelProps;

function positionRankColor(rank: number): string {
  if (rank === 1) {
    return "#ffa300";
  }

  if (rank === 2) {
    return "#c2c3c7";
  }

  if (rank === 3) {
    return "#b86f50";
  }

  return "#83769a";
}

function PersonalityRow({
  entry,
  scoreColor,
  scoreLabel,
}: {
  entry: PersonalityLeaderboardEntry;
  scoreColor: string;
  scoreLabel: string;
}) {
  return (
    <li className="flex items-center gap-2 border-b-2 border-[#29366f] py-2 last:border-b-0">
      <span
        className="w-6 shrink-0 text-center pixel-heading text-[9px]"
        style={{ color: positionRankColor(entry.rank) }}
      >
        #{entry.rank}
      </span>

      <ProfileLink
        handle={entry.handle}
        className="block shrink-0 hover:no-underline"
      >
        <Avatar
          size="sm"
          className="size-7 rounded-none after:rounded-none after:border-2 after:border-[#1d2b53]"
        >
          {entry.avatarUrl ? (
            <AvatarImage src={entry.avatarUrl} alt={entry.name} />
          ) : null}
          <AvatarFallback
            className={cn(
              "rounded-none text-[8px] font-bold text-[#1d2b53] pixel-heading",
              getPixelAvatarColor(entry.avatarColor),
            )}
          >
            {getInitials(entry.name)}
          </AvatarFallback>
        </Avatar>
      </ProfileLink>

      <div className="min-w-0 flex-1">
        <ProfileLink
          handle={entry.handle}
          className="block truncate text-sm text-[#fff1e8] hover:no-underline hover:underline"
        >
          {entry.name}
        </ProfileLink>
        <p className="truncate text-[10px]">
          <span className="font-bold text-[#29adff]">
            {entry.socialRankLabel.toUpperCase()}
          </span>
          <span className="text-[#83769a]"> · @{entry.handle}</span>
          <span className="text-[#c2c3c7]"> · {entry.ownerUsername}</span>
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="pixel-heading text-[7px] text-[#83769a]">{scoreLabel}</p>
        <p className="text-xs font-bold" style={{ color: scoreColor }}>
          {formatStatValue(entry.score)}
        </p>
      </div>
    </li>
  );
}

function FarmerRow({
  entry,
  scoreColor,
  scoreLabel,
}: {
  entry: FarmerLeaderboardEntry;
  scoreColor: string;
  scoreLabel: string;
}) {
  return (
    <li className="flex items-center gap-2 border-b-2 border-[#29366f] py-2 last:border-b-0">
      <span className="w-5 shrink-0 text-center text-xs font-bold text-[#83769a]">
        {entry.rank}
      </span>

      <Avatar
        size="sm"
        className="size-7 shrink-0 rounded-none after:rounded-none after:border-2 after:border-[#1d2b53]"
      >
        <AvatarFallback
          className={cn(
            "rounded-none bg-[#29366f] text-[8px] font-bold text-[#fff1e8] pixel-heading",
          )}
        >
          {getInitials(entry.username)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[#fff1e8]">{entry.username}</p>
        <p className="text-[10px] text-[#83769a]">
          {entry.botCount} bot{entry.botCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="pixel-heading text-[7px] text-[#83769a]">{scoreLabel}</p>
        <p className="text-xs font-bold" style={{ color: scoreColor }}>
          {formatStatValue(entry.score)}
        </p>
      </div>
    </li>
  );
}

function LeaderboardList(props: LeaderboardPanelProps) {
  const { scoreLabel, scoreColor, loading, error } = props;

  if (loading) {
    return <p className="text-xs text-[#83769a]">Loading...</p>;
  }

  if (error) {
    return <p className="text-xs text-[#ff004d]">{error}</p>;
  }

  if (props.entries.length === 0) {
    return <p className="text-xs text-[#83769a]">No rankings yet.</p>;
  }

  return (
    <ul>
      {props.kind === "personality"
        ? props.entries.map((entry) => (
            <PersonalityRow
              key={entry.id}
              entry={entry}
              scoreColor={scoreColor}
              scoreLabel={scoreLabel}
            />
          ))
        : props.entries.map((entry) => (
            <FarmerRow
              key={entry.userId}
              entry={entry}
              scoreColor={scoreColor}
              scoreLabel={scoreLabel}
            />
          ))}
    </ul>
  );
}

export function LeaderboardPanel(props: LeaderboardPanelProps) {
  const { title, scoreColor } = props;

  return (
    <section
      aria-label={title}
      className="w-full pixel-border bg-[#1d2b53] p-3 pixel-shadow-sm"
    >
      <h2
        className="pixel-heading text-[9px] tracking-wide"
        style={{ color: scoreColor }}
      >
        {title}
      </h2>

      <div className="mt-2">
        <LeaderboardList {...props} />
      </div>
    </section>
  );
}

function LeaderboardPagination({
  page,
  hasPrevious,
  hasNext,
  loading,
  onPrevious,
  onNext,
}: {
  page: number;
  hasPrevious: boolean;
  hasNext: boolean;
  loading: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!hasPrevious || loading}
        className={cn(
          "pixel-heading border-2 border-foreground px-3 py-2 text-[8px] transition-colors",
          hasPrevious && !loading
            ? "bg-[#1d2b53] text-[#ffa300] hover:bg-[#29366f]"
            : "cursor-not-allowed bg-[#1d2b53]/50 text-[#83769a]",
        )}
      >
        PREVIOUS
      </button>
      <span className="pixel-heading text-[8px] text-[#83769a]">
        PAGE {page + 1}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!hasNext || loading}
        className={cn(
          "pixel-heading border-2 border-foreground px-3 py-2 text-[8px] transition-colors",
          hasNext && !loading
            ? "bg-[#1d2b53] text-[#ffa300] hover:bg-[#29366f]"
            : "cursor-not-allowed bg-[#1d2b53]/50 text-[#83769a]",
        )}
      >
        NEXT
      </button>
    </div>
  );
}

function panelPropsFromPayload(
  payload: LeaderboardPagePayload,
  config: (typeof TABS)[number],
): LeaderboardPanelProps {
  if (payload.kind === "personality") {
    return {
      kind: "personality",
      title: config.title,
      scoreLabel: config.scoreLabel,
      scoreColor: config.scoreColor,
      entries: payload.entries,
    };
  }

  return {
    kind: "farmer",
    title: config.title,
    scoreLabel: config.scoreLabel,
    scoreColor: config.scoreColor,
    entries: payload.entries,
  };
}

export function LeaderboardsSection() {
  const [activeTab, setActiveTab] =
    useState<LeaderboardTab>("clout-personality");
  const [page, setPage] = useState(0);
  const [payload, setPayload] = useState<LeaderboardPagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeConfig = TABS.find((tab) => tab.id === activeTab)!;

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);

    const result = await fetchLeaderboardPage(activeTab, {
      offset: page * LEADERBOARD_LIMIT,
      limit: LEADERBOARD_LIMIT,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setError(null);
    setPayload(result.payload);
    setLoading(false);
  }, [activeTab, page]);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadLeaderboard();
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [loadLeaderboard]);

  const panelProps = payload
    ? panelPropsFromPayload(payload, activeConfig)
    : {
        kind:
          activeTab === "clout-personality" || activeTab === "heat-personality"
            ? ("personality" as const)
            : ("farmer" as const),
        title: activeConfig.title,
        scoreLabel: activeConfig.scoreLabel,
        scoreColor: activeConfig.scoreColor,
        entries: [],
      };

  const showPagination = page > 0 || (payload?.hasMore ?? false);

  return (
    <section
      aria-label="Leaderboards"
      className="w-full pixel-border bg-[#1d2b53] p-3 pixel-shadow-sm"
    >
      <h2 className="pixel-heading text-[9px] tracking-wide text-[#ffa300]">
        LEADERBOARDS
      </h2>

      <div className="mt-2 flex flex-wrap border-b-2 border-[#29366f]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              setPage(0);
            }}
            className={cn(
              "flex-1 px-1 py-2 text-center pixel-heading text-[7px] transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-current text-current -mb-[2px]"
                : "text-[#83769a] hover:text-[#c2c3c7]",
            )}
            style={
              activeTab === tab.id
                ? { color: tab.scoreColor }
                : undefined
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-2">
        <LeaderboardList
          {...panelProps}
          loading={loading}
          error={error}
        />
      </div>

      {showPagination ? (
        <LeaderboardPagination
          page={page}
          hasPrevious={page > 0}
          hasNext={payload?.hasMore ?? false}
          loading={loading}
          onPrevious={() => setPage((current) => Math.max(0, current - 1))}
          onNext={() => setPage((current) => current + 1)}
        />
      ) : null}

      <p className="mt-2 text-[9px] text-[#83769a]">
        Top {LEADERBOARD_LIMIT} · {activeConfig.label}
      </p>
    </section>
  );
}
