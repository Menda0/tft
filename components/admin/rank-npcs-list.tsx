"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  DESKTOP_BAR_BUTTON_CLASS,
  DESKTOP_BAR_BUTTON_LABEL_CLASS,
} from "@/components/layout/app-bar-styles";
import { PersonalityAvatar } from "@/components/personalities/personality-avatar";
import { ProfileLink } from "@/components/profile/profile-link";
import { listRankNpcsAdminRequest, pruneRankNpcPostsRequest } from "@/lib/rank-npcs/client";
import type { RankNpcAdminItem } from "@/lib/rank-npcs/admin";
import type { SocialRank } from "@/lib/scoring/ranks";
import { formatSocialRank } from "@/lib/scoring/ranks";

function formatSyncTime(value: string | null): string {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString();
}

function statusColor(status: string): string {
  if (status === "ready") {
    return "text-[#00e436]";
  }

  if (status === "failed") {
    return "text-[#ff004d]";
  }

  return "text-[#ffa300]";
}

function RankNpcRow({ item }: { item: RankNpcAdminItem }) {
  return (
    <article className="pixel-border bg-[#1d2b53] p-3">
      <div className="flex items-start gap-3">
        <ProfileLink handle={item.handle} className="shrink-0">
          <PersonalityAvatar
            personality={{
              name: item.name,
              handle: item.handle,
              avatarUrl: item.avatarUrl,
              avatarStatus: item.avatarStatus as "pending",
            }}
            size="md"
          />
        </ProfileLink>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ProfileLink
              handle={item.handle}
              className="truncate text-sm font-bold text-[#fff1e8] hover:text-[#ffa300]"
            >
              {item.name}
            </ProfileLink>
            {!item.rankNpcActive ? (
              <span className="pixel-border-thin bg-[#7e2553] px-1.5 py-0.5 text-[8px] text-[#fff1e8] pixel-heading">
                INACTIVE
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-xs text-[#29adff]">
            @{item.handle} · parody of {item.realName}
          </p>
          <p className="mt-1 text-xs text-[#83769a]">
            X source: @{item.xHandle}
          </p>

          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
            <div>
              <p className="pixel-heading text-[7px] text-[#83769a]">RANK</p>
              <p className="font-bold text-[#ffa300]">
                {item.fixedSocialRank
                  ? formatSocialRank(item.fixedSocialRank as SocialRank)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="pixel-heading text-[7px] text-[#83769a]">POSTS</p>
              <p className="font-bold text-[#fff1e8]">{item.mirroredPostCount}</p>
            </div>
            <div>
              <p className="pixel-heading text-[7px] text-[#83769a]">AVATAR</p>
              <p className={`font-bold ${statusColor(item.avatarStatus)}`}>
                {item.avatarStatus.toUpperCase()}
              </p>
            </div>
            <div>
              <p className="pixel-heading text-[7px] text-[#83769a]">BIO</p>
              <p className={`font-bold ${statusColor(item.descriptionStatus)}`}>
                {item.descriptionStatus.toUpperCase()}
              </p>
            </div>
          </div>

          <p className="mt-2 text-[10px] text-[#83769a]">
            Last X sync: {formatSyncTime(item.lastSyncedAt)}
            {item.lastSyncedTweetId
              ? ` · tweet ${item.lastSyncedTweetId}`
              : ""}
          </p>
        </div>
      </div>
    </article>
  );
}

export function RankNpcsAdminList() {
  const router = useRouter();
  const { user, token, isReady } = useAuth();
  const [items, setItems] = useState<RankNpcAdminItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pruning, setPruning] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    const result = await listRankNpcsAdminRequest(token);

    if (!result.ok) {
      setError(result.error);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems(result.data);
    setLoading(false);
  }, [token]);

  const handlePrunePosts = useCallback(async () => {
    if (!token || pruning) {
      return;
    }

    const confirmed = window.confirm(
      "Delete all mirrored parody NPC posts and reset X sync cursors? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setPruning(true);
    setActionMessage(null);
    setError(null);

    const result = await pruneRankNpcPostsRequest(token);

    if (!result.ok) {
      setError(result.error);
      setPruning(false);
      return;
    }

    setActionMessage(
      `Pruned ${result.data.deletedPosts} post(s), ${result.data.deletedReplies} repl(ies), reset ${result.data.resetNpcs} NPC sync state.`,
    );
    setPruning(false);
    await loadItems();
  }, [loadItems, pruning, token]);

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

    void loadItems();
  }, [isReady, loadItems, router, user]);

  if (!isReady || !user || user.role !== "admin") {
    return null;
  }

  const activeCount = items.filter((item) => item.rankNpcActive).length;

  return (
    <div>
      <main>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="pixel-heading text-[10px] text-[#29adff]">ADMIN</p>
            <p className="mt-1 text-sm text-[#fff1e8]">
              {activeCount} active · {items.length} total parody NPCs
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadItems()}
              disabled={loading || pruning}
              className={`${DESKTOP_BAR_BUTTON_CLASS} bg-[#1d2b53] disabled:opacity-60`}
            >
              <span className={`${DESKTOP_BAR_BUTTON_LABEL_CLASS} text-[#fff1e8]`}>
                REFRESH
              </span>
            </button>
            <button
              type="button"
              onClick={() => void handlePrunePosts()}
              disabled={loading || pruning}
              className={`${DESKTOP_BAR_BUTTON_CLASS} bg-[#7e2553] disabled:opacity-60`}
            >
              <span className={`${DESKTOP_BAR_BUTTON_LABEL_CLASS} text-[#fff1e8]`}>
                {pruning ? "PRUNING..." : "PRUNE ALL POSTS"}
              </span>
            </button>
          </div>
        </div>

        <p className="mb-4 text-xs text-[#83769a]">
          Configured in{" "}
          <code className="text-[#ffa300]">config/rank-npcs.json</code>. X
          mirroring uses{" "}
          <code className="text-[#ffa300]">X_API_BEARER_TOKEN</code> from your
          environment.
        </p>

        {actionMessage ? (
          <p className="mb-4 pixel-border bg-[#1d2b53] px-3 py-2 text-sm text-[#00e436]">
            {actionMessage}
          </p>
        ) : null}

        {error ? (
          <p className="pixel-border bg-[#7e2553] px-3 py-2 text-sm text-[#fff1e8]">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[#83769a]">Loading parody NPCs...</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <RankNpcRow key={item.id} item={item} />
            ))}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-[#83769a]">
          <Link href="/" className="text-[#29adff] hover:text-[#ffa300]">
            Back to feed
          </Link>
        </p>
      </main>
    </div>
  );
}
