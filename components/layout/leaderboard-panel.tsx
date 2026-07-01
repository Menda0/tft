"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { getInitials } from "@/components/feed/post-author";
import { AppBar } from "@/components/layout/app-bar";
import { FarmerLink } from "@/components/farmers/farmer-link";
import { ProfileLink } from "@/components/profile/profile-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  fetchLeaderboardPage,
  fetchMyLeaderboardEntries,
} from "@/lib/desktop/client";
import { LEADERBOARD_LIMIT } from "@/lib/pagination";
import { formatStatValue } from "@/lib/personalities/stats";
import { getPixelAvatarColor } from "@/lib/pixel-theme";
import type {
  FarmerLeaderboardEntry,
  LeaderboardPagePayload,
  LeaderboardTab,
  MyLeaderboardEntriesPayload,
  PersonalityLeaderboardEntry,
} from "@/lib/types/desktop";
import { cn } from "@/lib/utils";

export const LEADERBOARD_TABS: {
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
  highlighted = false,
}: {
  entry: PersonalityLeaderboardEntry;
  scoreColor: string;
  scoreLabel: string;
  highlighted?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 border-b-2 border-[#29366f] py-2 last:border-b-0",
        highlighted && "bg-[#29366f]/50",
      )}
    >
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
          <span className="text-[#c2c3c7]"> · </span>
          <FarmerLink
            username={entry.ownerUsername}
            className="text-[#c2c3c7] hover:underline"
          >
            {entry.ownerUsername}
          </FarmerLink>
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
  highlighted = false,
}: {
  entry: FarmerLeaderboardEntry;
  scoreColor: string;
  scoreLabel: string;
  highlighted?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 border-b-2 border-[#29366f] py-2 last:border-b-0",
        highlighted && "bg-[#29366f]/50",
      )}
    >
      <span className="w-5 shrink-0 text-center text-xs font-bold text-[#83769a]">
        {entry.rank}
      </span>

      <FarmerLink
        username={entry.username}
        className="block shrink-0 hover:no-underline"
      >
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
      </FarmerLink>

      <div className="min-w-0 flex-1">
        <FarmerLink
          username={entry.username}
          className="block truncate text-sm text-[#fff1e8] hover:underline"
        >
          {entry.username}
        </FarmerLink>
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

function LeaderboardGap() {
  return (
    <li
      aria-hidden
      className="border-b-2 border-[#29366f] py-2 text-center text-sm tracking-[0.4em] text-[#83769a]"
    >
      ···
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
  const { title } = props;

  return (
    <section aria-label={title} className="w-full">
      <LeaderboardList {...props} />
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

export function panelPropsFromPayload(
  payload: LeaderboardPagePayload,
  config: (typeof LEADERBOARD_TABS)[number],
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

function getPinnedPersonalityEntries(
  pageEntries: PersonalityLeaderboardEntry[],
  myEntries: PersonalityLeaderboardEntry[],
): {
  showGap: boolean;
  pinned: PersonalityLeaderboardEntry[];
} {
  const pageIds = new Set(pageEntries.map((entry) => entry.id));
  const pinned = myEntries.filter((entry) => !pageIds.has(entry.id));

  if (pinned.length === 0) {
    return { showGap: false, pinned: [] };
  }

  const pageEnd =
    pageEntries.length > 0
      ? pageEntries[pageEntries.length - 1]!.rank
      : 0;
  const showGap = pinned.some((entry) => entry.rank > pageEnd);

  return { showGap, pinned };
}

function getPinnedFarmerEntry(
  pageEntries: FarmerLeaderboardEntry[],
  myEntry: FarmerLeaderboardEntry | null,
): {
  showGap: boolean;
  pinned: FarmerLeaderboardEntry | null;
} {
  if (!myEntry) {
    return { showGap: false, pinned: null };
  }

  if (pageEntries.some((entry) => entry.userId === myEntry.userId)) {
    return { showGap: false, pinned: null };
  }

  const pageEnd =
    pageEntries.length > 0
      ? pageEntries[pageEntries.length - 1]!.rank
      : 0;

  return {
    showGap: myEntry.rank > pageEnd,
    pinned: myEntry,
  };
}

function MyLeaderboardEntries({
  activeTab,
  activeConfig,
  payload,
  myEntries,
  loading,
  error,
}: {
  activeTab: LeaderboardTab;
  activeConfig: (typeof LEADERBOARD_TABS)[number];
  payload: LeaderboardPagePayload | null;
  myEntries: MyLeaderboardEntriesPayload | null;
  loading?: boolean;
  error?: string | null;
}) {
  if (loading) {
    return <p className="mt-3 text-xs text-[#83769a]">Loading your ranks...</p>;
  }

  if (error) {
    return <p className="mt-3 text-xs text-[#ff004d]">{error}</p>;
  }

  if (!myEntries || !payload) {
    return null;
  }

  if (
    activeTab === "clout-personality" ||
    activeTab === "heat-personality"
  ) {
    if (myEntries.kind !== "personality" || myEntries.entries.length === 0) {
      return null;
    }

    const { showGap, pinned } = getPinnedPersonalityEntries(
      payload.kind === "personality" ? payload.entries : [],
      myEntries.entries,
    );

    if (pinned.length === 0) {
      return null;
    }

    return (
      <div className="mt-3 border-t-2 border-[#29366f] pt-3">
        <h3 className="pixel-heading text-[8px] tracking-wide text-[#29adff]">
          YOUR PERSONALITIES
        </h3>
        <ul className="mt-2">
          {showGap ? <LeaderboardGap /> : null}
          {pinned.map((entry) => (
            <PersonalityRow
              key={entry.id}
              entry={entry}
              scoreColor={activeConfig.scoreColor}
              scoreLabel={activeConfig.scoreLabel}
              highlighted
            />
          ))}
        </ul>
      </div>
    );
  }

  if (myEntries.kind !== "farmer" || !myEntries.entry) {
    return null;
  }

  const { showGap, pinned } = getPinnedFarmerEntry(
    payload.kind === "farmer" ? payload.entries : [],
    myEntries.entry,
  );

  if (!pinned) {
    return null;
  }

  return (
    <div className="mt-3 border-t-2 border-[#29366f] pt-3">
      <h3 className="pixel-heading text-[8px] tracking-wide text-[#29adff]">
        YOUR FARM
      </h3>
      <ul className="mt-2">
        {showGap ? <LeaderboardGap /> : null}
        <FarmerRow
          entry={pinned}
          scoreColor={activeConfig.scoreColor}
          scoreLabel={activeConfig.scoreLabel}
          highlighted
        />
      </ul>
    </div>
  );
}

export function LeaderboardsSection() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] =
    useState<LeaderboardTab>("clout-personality");
  const [page, setPage] = useState(0);
  const [payload, setPayload] = useState<LeaderboardPagePayload | null>(null);
  const [myEntries, setMyEntries] =
    useState<MyLeaderboardEntriesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [myLoading, setMyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myError, setMyError] = useState<string | null>(null);
  const activeConfig = LEADERBOARD_TABS.find((tab) => tab.id === activeTab)!;

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

  const loadMyEntries = useCallback(async () => {
    if (!token) {
      setMyEntries(null);
      setMyError(null);
      setMyLoading(false);
      return;
    }

    setMyLoading(true);

    const result = await fetchMyLeaderboardEntries(token, activeTab);

    if (!result.ok) {
      setMyError(result.error);
      setMyLoading(false);
      return;
    }

    setMyError(null);
    setMyEntries(result.payload);
    setMyLoading(false);
  }, [activeTab, token]);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  useEffect(() => {
    void loadMyEntries();
  }, [loadMyEntries]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadLeaderboard();
      void loadMyEntries();
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [loadLeaderboard, loadMyEntries]);

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
    <section aria-label="Leaderboards" className="w-full">
      <div className="flex flex-wrap border-b-2 border-[#29366f]">
        {LEADERBOARD_TABS.map((tab) => (
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

      {token ? (
        <MyLeaderboardEntries
          activeTab={activeTab}
          activeConfig={activeConfig}
          payload={payload}
          myEntries={myEntries}
          loading={myLoading}
          error={myError}
        />
      ) : null}

      <p className="mt-2 text-[9px] text-[#83769a]">
        Top {LEADERBOARD_LIMIT} · {activeConfig.label}
      </p>
    </section>
  );
}

export function LeaderboardsPageView() {
  const router = useRouter();

  return (
    <>
      <AppBar title="Leaderboards" onBack={() => router.push("/")} />
      <div className="px-4 py-4 pb-8">
        <LeaderboardsSection />
      </div>
    </>
  );
}
