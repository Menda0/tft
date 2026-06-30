"use client";

import { useCallback, useEffect, useState } from "react";

import { LeaderboardPanel } from "@/components/layout/leaderboard-panel";
import { fetchLeaderboardPage } from "@/lib/desktop/client";
import { LEADERBOARD_LIMIT } from "@/lib/pagination";
import type {
  LeaderboardPagePayload,
  PersonalityLeaderboardEntry,
} from "@/lib/types/desktop";

const OVERVIEW_TAB = "clout-personality" as const;

export function DesktopOverviewLeaderboard() {
  const [payload, setPayload] = useState<LeaderboardPagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);

    const result = await fetchLeaderboardPage(OVERVIEW_TAB, {
      offset: 0,
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
  }, []);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadLeaderboard();
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [loadLeaderboard]);

  const entries: PersonalityLeaderboardEntry[] =
    payload?.kind === "personality" ? payload.entries : [];

  return (
    <section
      aria-label="Overall leaderboard"
      className="w-full pixel-border bg-[#1d2b53] p-3 pixel-shadow-sm"
    >
      <h2 className="pixel-heading text-[9px] tracking-wide text-[#ffa300]">
        OVERALL LEADERBOARD
      </h2>

      <div className="mt-2">
        <LeaderboardPanel
          kind="personality"
          title="Overall leaderboard"
          scoreLabel="CLOUT"
          scoreColor="#ffa300"
          entries={entries}
          loading={loading}
          error={error}
        />
      </div>
    </section>
  );
}
