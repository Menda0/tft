"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { AppBar } from "@/components/layout/app-bar";
import {
  fetchAdminDashboard,
  type AdminDashboardData,
  type DashboardRange,
} from "@/lib/admin/client";
import type { AiOperation } from "@/lib/types/ai-usage";

const RANGE_OPTIONS: Array<{ days: DashboardRange; label: string }> = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
];

const OPERATION_LABELS: Record<AiOperation, string> = {
  bio: "Bios",
  avatar: "Avatars",
  rank_npc_avatar: "NPC avatars",
  post: "Posts",
  post_research: "Post research",
  reply: "Replies",
  rank_npc_reply: "NPC replies",
  trending: "Trending topics",
  post_media_describe: "Post media describe",
  post_media_image: "Post media images",
  moderation_text: "Text moderation",
  moderation_image: "Image moderation",
};

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="pixel-border bg-[#1d2b53] p-3">
      <p className="pixel-heading text-[8px] text-[#83769a]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#ffa300]">{value}</p>
      {hint ? <p className="mt-1 text-[10px] text-[#83769a]">{hint}</p> : null}
    </article>
  );
}

function BreakdownTable({
  title,
  rows,
  nameHeader,
  getName,
}: {
  title: string;
  rows: Array<{
    requestCount: number;
    totalTokens: number;
    costUsd: number;
  }>;
  nameHeader: string;
  getName: (index: number) => string;
}) {
  if (rows.length === 0) {
    return (
      <section className="pixel-border bg-[#1d2b53] p-3">
        <p className="pixel-heading text-[10px] text-[#29adff]">{title}</p>
        <p className="mt-2 text-sm text-[#83769a]">No AI usage recorded yet.</p>
      </section>
    );
  }

  return (
    <section className="pixel-border bg-[#1d2b53] p-3">
      <p className="pixel-heading text-[10px] text-[#29adff]">{title}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-xs">
          <thead>
            <tr className="border-b-2 border-[#29366f] text-[#83769a]">
              <th className="pb-2 pr-3 pixel-heading text-[8px]">{nameHeader}</th>
              <th className="pb-2 pr-3 pixel-heading text-[8px]">REQUESTS</th>
              <th className="pb-2 pr-3 pixel-heading text-[8px]">TOKENS</th>
              <th className="pb-2 pixel-heading text-[8px]">COST</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${getName(index)}-${index}`} className="border-b border-[#29366f]/60">
                <td className="py-2 pr-3 font-bold text-[#fff1e8]">{getName(index)}</td>
                <td className="py-2 pr-3 text-[#29adff]">{formatNumber(row.requestCount)}</td>
                <td className="py-2 pr-3 text-[#29adff]">{formatNumber(row.totalTokens)}</td>
                <td className="py-2 text-[#00e436]">{formatUsd(row.costUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AdminDashboard() {
  const router = useRouter();
  const { user, token, isReady } = useAuth();
  const [range, setRange] = useState<DashboardRange>(7);
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    const result = await fetchAdminDashboard(token, range);

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setData(result.data);
    setLoading(false);
  }, [range, token]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!user) {
      router.replace("/");
      return;
    }

    if (user.role !== "admin") {
      router.replace("/");
      return;
    }

    void loadDashboard();
  }, [isReady, loadDashboard, router, user]);

  if (!isReady || !user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-dvh">
      <AppBar title="Analytics" onBack={() => router.push("/")} />

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="pixel-heading text-[10px] text-[#29adff]">ADMIN</p>
            <p className="mt-1 text-sm text-[#fff1e8]">
              Platform metrics and AI usage
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
            className="pixel-border-thin bg-[#1d2b53] px-3 py-2 text-[10px] text-[#fff1e8] pixel-heading disabled:opacity-60"
          >
            REFRESH
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.days}
              type="button"
              onClick={() => setRange(option.days)}
              className={`pixel-border-thin px-3 py-2 text-[10px] pixel-heading ${
                range === option.days
                  ? "bg-[#ffa300] text-[#1d2b53]"
                  : "bg-[#1d2b53] text-[#fff1e8]"
              }`}
            >
              {option.label.toUpperCase()}
            </button>
          ))}
        </div>

        {error ? (
          <p className="mb-4 pixel-border bg-[#7e2553] px-3 py-2 text-sm text-[#fff1e8]">
            {error}
          </p>
        ) : null}

        {loading && !data ? (
          <p className="text-sm text-[#83769a]">Loading analytics...</p>
        ) : data ? (
          <div className="space-y-6">
            <section>
              <p className="mb-3 pixel-heading text-[10px] text-[#29adff]">
                PLATFORM ACTIVITY
              </p>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="POSTS" value={formatNumber(data.platform.totalPosts)} />
                <StatCard label="REPLIES" value={formatNumber(data.platform.totalReplies)} />
                <StatCard label="REPOSTS" value={formatNumber(data.platform.totalReposts)} />
                <StatCard label="VIEWS" value={formatNumber(data.platform.totalViews)} />
                <StatCard
                  label="LIKES"
                  value={formatNumber(data.platform.totalLikes)}
                  hint="On posts created in range"
                />
              </div>
            </section>

            <section>
              <p className="mb-3 pixel-heading text-[10px] text-[#29adff]">
                PLATFORM TOTALS (ALL TIME)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="PLAYERS" value={formatNumber(data.platform.totalPlayers)} />
                <StatCard
                  label="PERSONALITIES"
                  value={formatNumber(data.platform.totalPersonalities)}
                />
                <StatCard label="TICKS" value={formatNumber(data.platform.totalTicks)} />
              </div>
            </section>

            <section>
              <p className="mb-3 pixel-heading text-[10px] text-[#29adff]">
                AI USAGE
              </p>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <StatCard
                  label="EST. COST"
                  value={formatUsd(data.aiUsage.totalCostUsd)}
                />
                <StatCard
                  label="TOTAL TOKENS"
                  value={formatNumber(data.aiUsage.totalTokens)}
                />
                <StatCard
                  label="API REQUESTS"
                  value={formatNumber(data.aiUsage.requestCount)}
                />
              </div>

              <div className="space-y-4">
                <BreakdownTable
                  title="BY OPERATION"
                  rows={data.aiUsage.byOperation}
                  nameHeader="OPERATION"
                  getName={(index) => {
                    const operation = data.aiUsage.byOperation[index]?.operation;
                    return operation ? OPERATION_LABELS[operation] : "Unknown";
                  }}
                />
                <BreakdownTable
                  title="BY MODEL"
                  rows={data.aiUsage.byModel}
                  nameHeader="MODEL"
                  getName={(index) => data.aiUsage.byModel[index]?.model ?? "Unknown"}
                />
              </div>
            </section>

            <p className="text-xs text-[#83769a]">
              AI usage tracking starts from deployment. Likes reflect current counts on
              posts created within the selected window, not when likes occurred.
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
