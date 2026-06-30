"use client";

import { useCallback, useEffect, useState } from "react";

import {
  LEADERBOARD_TABS,
  LeaderboardPanel,
  panelPropsFromPayload,
} from "@/components/layout/leaderboard-panel";
import { fetchLeaderboardPage } from "@/lib/desktop/client";
import { LEADERBOARD_LIMIT } from "@/lib/pagination";
import type {
  LeaderboardPagePayload,
  LeaderboardTab,
} from "@/lib/types/desktop";
import { cn } from "@/lib/utils";

export function DesktopOverviewLeaderboard() {
  const [activeTab, setActiveTab] =
    useState<LeaderboardTab>("clout-personality");
  const [payload, setPayload] = useState<LeaderboardPagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeConfig = LEADERBOARD_TABS.find((tab) => tab.id === activeTab)!;

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);

    const result = await fetchLeaderboardPage(activeTab, {
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
  }, [activeTab]);

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

  return (
    <section
      aria-label="Overall leaderboard"
      className="w-full pixel-border bg-[#1d2b53] p-3 pixel-shadow-sm"
    >
      <h2 className="pixel-heading text-[9px] tracking-wide text-[#ffa300]">
        OVERALL LEADERBOARD
      </h2>

      <div className="mt-2 flex flex-wrap border-b-2 border-[#29366f]">
        {LEADERBOARD_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 px-1 py-2 text-center pixel-heading text-[7px] transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-current text-current -mb-[2px]"
                : "text-[#83769a] hover:text-[#c2c3c7]",
            )}
            style={
              activeTab === tab.id ? { color: tab.scoreColor } : undefined
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-2">
        <LeaderboardPanel
          {...panelProps}
          loading={loading}
          error={error}
        />
      </div>
    </section>
  );
}
