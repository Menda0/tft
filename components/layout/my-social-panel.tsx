"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getInitials } from "@/components/feed/post-author";
import { ProfileLink } from "@/components/profile/profile-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchMySocialActivity } from "@/lib/desktop/client";
import { formatRelativeTime } from "@/lib/feed/format";
import { formatStatValue } from "@/lib/personalities/stats";
import { PAGE_SIZE } from "@/lib/pagination";
import { getPixelAvatarColor } from "@/lib/pixel-theme";
import type {
  MySocialActivityItem,
  MySocialActivityPayload,
  MySocialLeaderboardEntry,
  MySocialPayload,
  MySocialPersonalityEntry,
} from "@/lib/types/desktop";
import { cn } from "@/lib/utils";

const EMPTY_ACTIVITY: MySocialActivityPayload = {
  items: [],
  hasMore: false,
  updatedAt: "",
};

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

function PersonalityAvatarSmall({
  name,
  avatarUrl,
  avatarColor,
}: {
  name: string;
  avatarUrl: string | null;
  avatarColor: string;
}) {
  return (
    <Avatar
      size="sm"
      className="size-7 rounded-none after:rounded-none after:border-2 after:border-[#1d2b53]"
    >
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
      <AvatarFallback
        className={cn(
          "rounded-none text-[8px] font-bold text-[#1d2b53] pixel-heading",
          getPixelAvatarColor(avatarColor),
        )}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function LeaderboardRow({ entry }: { entry: MySocialLeaderboardEntry }) {
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
        <PersonalityAvatarSmall
          name={entry.name}
          avatarUrl={entry.avatarUrl}
          avatarColor={entry.avatarColor}
        />
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
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="pixel-heading text-[7px] text-[#83769a]">CLOUT</p>
        <p className="text-xs font-bold text-[#ffa300]">
          {formatStatValue(entry.clout)}
        </p>
      </div>
    </li>
  );
}

function StatCell({
  label,
  value,
  valueClassName = "text-[#fff1e8]",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 px-0.5">
      <p className="pixel-heading text-[6px] text-[#83769a]">{label}</p>
      <p className={cn("text-[10px] font-bold", valueClassName)}>{value}</p>
    </div>
  );
}

function PersonalityStatsRow({ entry }: { entry: MySocialPersonalityEntry }) {
  return (
    <li className="border-b-2 border-[#29366f] py-2.5 last:border-b-0">
      <div className="flex items-center gap-2">
        <ProfileLink
          handle={entry.handle}
          className="block shrink-0 hover:no-underline"
        >
          <PersonalityAvatarSmall
            name={entry.name}
            avatarUrl={entry.avatarUrl}
            avatarColor={entry.avatarColor}
          />
        </ProfileLink>

        <div className="min-w-0 flex-1">
          <ProfileLink
            handle={entry.handle}
            className="block truncate text-sm font-bold text-[#fff1e8] hover:no-underline hover:underline"
          >
            {entry.name}
          </ProfileLink>
          <p className="truncate text-[10px] text-[#83769a]">@{entry.handle}</p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1 sm:grid-cols-8">
        <StatCell label="POSTS" value={formatStatValue(entry.posts)} />
        <StatCell label="REPOSTS" value={formatStatValue(entry.reposts)} />
        <StatCell label="REPLIES" value={formatStatValue(entry.replies)} />
        <StatCell label="LIKES" value={formatStatValue(entry.likes)} />
        <StatCell label="VIEWS" value={formatStatValue(entry.views)} />
        <StatCell
          label="CLOUT"
          value={formatStatValue(entry.clout)}
          valueClassName="text-[#ffa300]"
        />
        <StatCell
          label="HEAT"
          value={formatStatValue(entry.heat)}
          valueClassName="text-[#ff004d]"
        />
        <StatCell
          label="RANK"
          value={entry.socialRankLabel.toUpperCase()}
          valueClassName="text-[#29adff]"
        />
      </div>
    </li>
  );
}

function activityMessage(item: MySocialActivityItem): string {
  const handle = `@${item.personalityHandle}`;

  switch (item.type) {
    case "post":
      return `${handle} posted`;
    case "reply":
      return item.target
        ? `${handle} replied to @${item.target.handle}`
        : `${handle} replied`;
    case "repost":
      return item.target
        ? `${handle} reposted @${item.target.handle}`
        : `${handle} reposted`;
    case "follow":
      return item.target
        ? `${handle} followed @${item.target.handle}`
        : `${handle} followed someone`;
    case "follow_received":
      return item.actor
        ? `${handle} was followed by @${item.actor.handle}`
        : `${handle} gained a follower`;
    case "like_received":
      return item.actor
        ? `${handle} was liked by @${item.actor.handle}`
        : `${handle} received a like`;
    default:
      return `${handle} was active`;
  }
}

function ActivityRow({
  item,
  personalityById,
}: {
  item: MySocialActivityItem;
  personalityById: Map<string, MySocialPersonalityEntry>;
}) {
  const owner = personalityById.get(item.personalityId);

  return (
    <li className="border-b-2 border-[#29366f] py-2 last:border-b-0">
      <div className="flex items-start gap-2">
        <ProfileLink
          handle={item.personalityHandle}
          className="block shrink-0 hover:no-underline"
        >
          <PersonalityAvatarSmall
            name={item.personalityName}
            avatarUrl={owner?.avatarUrl ?? null}
            avatarColor={owner?.avatarColor ?? "bg-sky-500"}
          />
        </ProfileLink>

        <div className="min-w-0 flex-1">
          <p className="text-xs leading-relaxed text-[#fff1e8]">
            {activityMessage(item)}
          </p>
          {item.preview ? (
            <p className="mt-0.5 truncate text-[10px] text-[#83769a]">
              {item.preview}
            </p>
          ) : null}
        </div>

        <span className="shrink-0 text-[10px] text-[#83769a]">
          {formatRelativeTime(new Date(item.at))}
        </span>
      </div>
    </li>
  );
}

function ActivityPagination({
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

function ActivityLogPanel({
  token,
  personalities,
}: {
  token: string;
  personalities: MySocialPersonalityEntry[];
}) {
  const [page, setPage] = useState(0);
  const [activity, setActivity] = useState<MySocialActivityPayload>(EMPTY_ACTIVITY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const personalityById = new Map(
    personalities.map((entry) => [entry.id, entry]),
  );

  const loadActivity = useCallback(async () => {
    setLoading(true);

    const result = await fetchMySocialActivity(token, {
      offset: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setError(null);
    setActivity(result.payload);
    setLoading(false);
  }, [token, page]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadActivity();
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [loadActivity]);

  if (loading && activity.items.length === 0) {
    return <p className="text-xs text-[#83769a]">Loading...</p>;
  }

  if (error) {
    return <p className="text-xs text-[#ff004d]">{error}</p>;
  }

  if (activity.items.length === 0) {
    return <p className="text-xs text-[#83769a]">No activity yet.</p>;
  }

  const showPagination = page > 0 || activity.hasMore;

  return (
    <>
      <ul>
        {activity.items.map((item) => (
          <ActivityRow
            key={item.id}
            item={item}
            personalityById={personalityById}
          />
        ))}
      </ul>

      {showPagination ? (
        <ActivityPagination
          page={page}
          hasPrevious={page > 0}
          hasNext={activity.hasMore}
          loading={loading}
          onPrevious={() => setPage((current) => Math.max(0, current - 1))}
          onNext={() => setPage((current) => current + 1)}
        />
      ) : null}
    </>
  );
}

export function MyPersonalitiesPanel({
  data,
  loading,
  error,
}: {
  data: MySocialPayload;
  loading?: boolean;
  error?: string | null;
}) {
  if (loading) {
    return <p className="text-xs text-[#83769a]">Loading...</p>;
  }

  if (error) {
    return <p className="text-xs text-[#ff004d]">{error}</p>;
  }

  if (data.personalities.length === 0) {
    return (
      <div className="pixel-border-thin bg-[#29366f] p-4 text-center">
        <p className="text-sm text-[#fff1e8]">No personalities yet.</p>
        <Link
          href="/create-personality"
          className="mt-3 inline-block pixel-border-thin bg-[#00e436] px-3 py-2 text-xs text-[#1d2b53] pixel-heading"
        >
          CREATE ONE
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section
        aria-label="Global rank"
        className="w-full pixel-border bg-[#1d2b53] p-3 pixel-shadow-sm"
      >
        <h3 className="pixel-heading text-[9px] tracking-wide text-[#ffa300]">
          GLOBAL RANK
        </h3>
        <ul className="mt-2">
          {data.leaderboard.map((entry) => (
            <LeaderboardRow key={entry.id} entry={entry} />
          ))}
        </ul>
      </section>

      <section
        aria-label="Personality stats"
        className="w-full pixel-border bg-[#1d2b53] p-3 pixel-shadow-sm"
      >
        <h3 className="pixel-heading text-[9px] tracking-wide text-[#29adff]">
          PERSONALITY STATS
        </h3>
        <ul className="mt-2">
          {data.personalities.map((entry) => (
            <PersonalityStatsRow key={entry.id} entry={entry} />
          ))}
        </ul>
      </section>
    </div>
  );
}

export function ActivityPanel({
  token,
  personalities,
  loading,
  error,
}: {
  token: string | null;
  personalities: MySocialPersonalityEntry[];
  loading?: boolean;
  error?: string | null;
}) {
  if (loading) {
    return <p className="text-xs text-[#83769a]">Loading...</p>;
  }

  if (error) {
    return <p className="text-xs text-[#ff004d]">{error}</p>;
  }

  if (!token) {
    return <p className="text-xs text-[#83769a]">Log in to view activity.</p>;
  }

  return (
    <section aria-label="Activity log" className="w-full">
      <ActivityLogPanel token={token} personalities={personalities} />
    </section>
  );
}
