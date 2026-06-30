"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { getInitials } from "@/components/feed/post-author";
import { ProfileLink } from "@/components/profile/profile-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchMySocialActivity } from "@/lib/desktop/client";
import { formatRelativeTime } from "@/lib/feed/format";
import { PAGE_SIZE } from "@/lib/pagination";
import { getPixelAvatarColor } from "@/lib/pixel-theme";
import type {
  MySocialActivityItem,
  MySocialActivityPayload,
} from "@/lib/types/desktop";
import { cn } from "@/lib/utils";

const REFRESH_INTERVAL_MS = 60_000;

const EMPTY_ACTIVITY: MySocialActivityPayload = {
  items: [],
  hasMore: false,
  updatedAt: "",
};

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

function DesktopActivityRow({ item }: { item: MySocialActivityItem }) {
  return (
    <li className="border-b-2 border-[#29366f] py-2 last:border-b-0">
      <div className="flex items-start gap-2">
        <ProfileLink
          handle={item.personalityHandle}
          className="block shrink-0 hover:no-underline"
        >
          <Avatar
            size="sm"
            className="size-7 rounded-none after:rounded-none after:border-2 after:border-[#1d2b53]"
          >
            {item.personalityAvatarUrl ? (
              <AvatarImage src={item.personalityAvatarUrl} alt={item.personalityName} />
            ) : null}
            <AvatarFallback
              className={cn(
                "rounded-none text-[8px] font-bold text-[#1d2b53] pixel-heading",
                getPixelAvatarColor(item.personalityAvatarColor),
              )}
            >
              {getInitials(item.personalityName)}
            </AvatarFallback>
          </Avatar>
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

function DesktopActivityPagination({
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

export function DesktopActivityLog() {
  const { token } = useAuth();
  const [page, setPage] = useState(0);
  const [activity, setActivity] = useState<MySocialActivityPayload>(EMPTY_ACTIVITY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = useCallback(async () => {
    if (!token) {
      setActivity(EMPTY_ACTIVITY);
      setError(null);
      setLoading(false);
      return;
    }

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

    setActivity(result.payload);
    setError(null);
    setLoading(false);
  }, [token, page]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadActivity();
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [loadActivity, token]);

  return (
    <section
      aria-label="Activity log"
      className="w-full pixel-border bg-[#1d2b53] p-3 pixel-shadow-sm"
    >
      <h2 className="pixel-heading text-[9px] tracking-wide text-[#c2c3c7]">
        ACTIVITY LOG
      </h2>

      <div className="mt-2">
        {!token ? (
          <p className="text-xs text-[#83769a]">Log in to view activity.</p>
        ) : loading && activity.items.length === 0 ? (
          <p className="text-xs text-[#83769a]">Loading...</p>
        ) : error ? (
          <p className="text-xs text-[#ff004d]">{error}</p>
        ) : activity.items.length === 0 ? (
          <p className="text-xs text-[#83769a]">No activity yet.</p>
        ) : (
          <>
            <ul>
              {activity.items.map((item) => (
                <DesktopActivityRow key={item.id} item={item} />
              ))}
            </ul>

            {page > 0 || activity.hasMore ? (
              <DesktopActivityPagination
                page={page}
                hasPrevious={page > 0}
                hasNext={activity.hasMore}
                loading={loading}
                onPrevious={() => setPage((current) => Math.max(0, current - 1))}
                onNext={() => setPage((current) => current + 1)}
              />
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
