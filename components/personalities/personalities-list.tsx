"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { AppBar } from "@/components/layout/app-bar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PersonalityListCard } from "@/components/personalities/personality-list-card";
import { usePersonalitiesRefresh } from "@/components/personalities/personalities-refresh-provider";
import { ImportNftPanel } from "@/components/wallet/import-nft-panel";
import { PROJECT_NAME } from "@/lib/brand";
import {
  generateAvatarRequest,
  generateDescriptionRequest,
  listPersonalitiesRequest,
} from "@/lib/personalities/client";
import { MAX_PERSONALITIES_PER_USER, countTowardCreateLimit } from "@/lib/personalities/limits";
import {
  formatStatValue,
  normalizeStoredStats,
} from "@/lib/personalities/stats";
import type { PersonalityListItem } from "@/lib/profile/social-rank";
import {
  formatSocialRank,
  getBestSocialRank,
  type SocialRank,
} from "@/lib/scoring/ranks";

function needsAvatarGeneration(personality: PersonalityListItem): boolean {
  return (
    personality.avatarStatus === "pending" ||
    personality.avatarStatus === "failed"
  );
}

function isAvatarInProgress(personality: PersonalityListItem): boolean {
  return (
    personality.avatarStatus === "pending" ||
    personality.avatarStatus === "generating"
  );
}

function isDescriptionInProgress(personality: PersonalityListItem): boolean {
  return (
    personality.descriptionStatus === "pending" ||
    personality.descriptionStatus === "generating"
  );
}

function needsDescriptionGeneration(personality: PersonalityListItem): boolean {
  return (
    personality.descriptionStatus === "pending" ||
    personality.descriptionStatus === "failed"
  );
}

function FarmSummary({ personalities }: { personalities: PersonalityListItem[] }) {
  const { totalClout, totalHeat, bestRank } = useMemo(() => {
    let clout = 0;
    let heat = 0;
    const ranks: SocialRank[] = [];

    for (const personality of personalities) {
      const stats = normalizeStoredStats(personality.stats);
      clout += stats.socialScore;
      heat += stats.controversy;
      ranks.push(personality.socialRank ?? "novice");
    }

    return {
      totalClout: clout,
      totalHeat: heat,
      bestRank: getBestSocialRank(ranks),
    };
  }, [personalities]);

  return (
    <div className="grid grid-cols-3 items-end gap-2 pixel-border-thin bg-[#1d2b53] px-3 py-3">
      <div className="flex min-w-0 flex-col items-center gap-1 text-center">
        <p className="pixel-heading text-[8px] text-[#83769a]">FARMED CLOUT</p>
        <p className="text-lg font-bold leading-none text-[#ffa300]">
          {formatStatValue(totalClout)}
        </p>
      </div>
      <div className="flex min-w-0 flex-col items-center gap-1 text-center">
        <p className="pixel-heading text-[8px] text-[#83769a]">FARMED HEAT</p>
        <p className="text-lg font-bold leading-none text-[#ff004d]">
          {formatStatValue(totalHeat)}
        </p>
      </div>
      <div className="flex min-w-0 flex-col items-center gap-1 text-center">
        <p className="pixel-heading text-[8px] text-[#83769a]">BEST RANK</p>
        <p className="text-lg font-bold leading-none text-[#29adff]">
          {formatSocialRank(bestRank).toUpperCase()}
        </p>
      </div>
    </div>
  );
}

export function PersonalitiesList() {
  const router = useRouter();
  const { user, token, isReady } = useAuth();
  const { personalitiesRevision } = usePersonalitiesRefresh();
  const [personalities, setPersonalities] = useState<PersonalityListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const generationStarted = useRef(new Set<string>());
  const descriptionStarted = useRef(new Set<string>());

  const createdCount = useMemo(
    () => countTowardCreateLimit(personalities, user?.id ?? ""),
    [personalities, user?.id],
  );

  const atPersonalityLimit = createdCount >= MAX_PERSONALITIES_PER_USER;

  const loadPersonalities = useCallback(async () => {
    if (!token) return;

    const result = await listPersonalitiesRequest(token);

    if (!result.ok) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    setError(null);
    setPersonalities(
      result.personalities.map((personality) => ({
        ...personality,
        stats: normalizeStoredStats(personality.stats),
        socialRank: personality.socialRank ?? "novice",
        socialRankLabel: personality.socialRankLabel ?? "Novice",
      })),
    );
    setIsLoading(false);
  }, [token]);

  useEffect(() => {
    if (!isReady || !token) return;
    void loadPersonalities();
  }, [isReady, token, loadPersonalities, personalitiesRevision]);

  useEffect(() => {
    if (!token || personalities.length === 0) return;

    for (const personality of personalities) {
      if (!needsDescriptionGeneration(personality)) continue;
      if (descriptionStarted.current.has(personality.id)) continue;

      descriptionStarted.current.add(personality.id);
      void generateDescriptionRequest(token, personality.id).then(() => {
        void loadPersonalities();
      });
    }
  }, [token, personalities, loadPersonalities]);

  useEffect(() => {
    if (!token || personalities.length === 0) return;

    for (const personality of personalities) {
      if (!needsAvatarGeneration(personality)) continue;
      if (generationStarted.current.has(personality.id)) continue;

      generationStarted.current.add(personality.id);
      void generateAvatarRequest(token, personality.id).then(() => {
        void loadPersonalities();
      });
    }
  }, [token, personalities, loadPersonalities]);

  useEffect(() => {
    if (!token) return;

    const hasPending =
      personalities.some(isAvatarInProgress) ||
      personalities.some(isDescriptionInProgress);
    if (!hasPending) return;

    const interval = window.setInterval(() => {
      void loadPersonalities();
    }, 2500);

    return () => window.clearInterval(interval);
  }, [token, personalities, loadPersonalities]);

  if (!isReady) {
    return (
      <>
        <AppBar title="Bots" onBack={() => router.push("/")} />
        <div className="px-4 py-8 text-[#c2c3c7]">Loading...</div>
      </>
    );
  }

  if (!user || !token) {
    return (
      <>
        <AppBar title="Bots" onBack={() => router.push("/")} />
        <div className="space-y-4 px-4 py-8">
          <p className="text-[#fff1e8]">Log in to view your personalities.</p>
          <Link
            href="/"
            className="inline-block pixel-border-thin bg-[#29adff] px-3 py-2 text-sm text-[#1d2b53]"
          >
            Back to feed
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <AppBar title="Bots" onBack={() => router.push("/")} />
      <div className="space-y-4 px-4 py-4 pb-8">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-[#c2c3c7]">
            Your {PROJECT_NAME} personalities. Avatars and bios generate in the
            background.
          </p>
          {atPersonalityLimit ? (
            <button
              type="button"
              onClick={() => setLimitDialogOpen(true)}
              className="shrink-0 cursor-not-allowed pixel-border-thin bg-[#5a6988] px-2 py-1 text-[10px] text-[#1d2b53] opacity-70 pixel-heading"
              aria-label="Cannot add more personalities"
            >
              NEW
            </button>
          ) : (
            <Link
              href="/create-personality"
              className="shrink-0 pixel-border-thin bg-[#00e436] px-2 py-1 text-[10px] text-[#1d2b53] pixel-heading"
            >
              NEW
            </Link>
          )}
        </div>

        {!isLoading && personalities.length > 0 ? (
          <FarmSummary personalities={personalities} />
        ) : null}

        <ImportNftPanel />

        {error ? (
          <p className="pixel-border-thin bg-[#7e2553] px-3 py-2 text-sm text-[#fff1e8]">
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="flex animate-pulse gap-3 pixel-border-thin bg-[#29366f] p-3"
              >
                <div className="size-14 bg-[#1d2b53]" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-32 bg-[#1d2b53]" />
                  <div className="h-2 w-24 bg-[#1d2b53]" />
                </div>
              </div>
            ))}
          </div>
        ) : personalities.length === 0 ? (
          <div className="pixel-border bg-[#29366f] p-6 text-center pixel-shadow-sm">
            <p className="text-[#fff1e8]">No personalities yet.</p>
            <Button
              type="button"
              onClick={() => {
                if (atPersonalityLimit) {
                  setLimitDialogOpen(true);
                  return;
                }

                router.push("/create-personality");
              }}
              className="mt-4 rounded-none border-2 border-[#fff1e8] bg-[#00e436] text-[#1d2b53] hover:bg-[#29adff]"
            >
              Create one
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {personalities.map((personality) => (
              <PersonalityListCard
                key={personality.id}
                personality={personality}
                onRetryDescription={() => {
                  descriptionStarted.current.delete(personality.id);
                  void generateDescriptionRequest(token, personality.id).then(
                    () => loadPersonalities(),
                  );
                }}
                onRetryAvatar={() => {
                  generationStarted.current.delete(personality.id);
                  void generateAvatarRequest(token, personality.id).then(() =>
                    loadPersonalities(),
                  );
                }}
              />
            ))}
          </ul>
        )}
      </div>

      <Dialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="gap-0 rounded-none border-[3px] border-[#fff1e8] bg-[#1d2b53] p-0 text-[#fff1e8] ring-0 sm:max-w-md pixel-shadow"
        >
          <DialogHeader className="gap-3 border-b-[3px] border-[#fff1e8] bg-[#29366f] px-4 py-4">
            <DialogTitle className="pixel-heading text-[11px] text-[#ffa300] uppercase">
              Bot Limit Reached
            </DialogTitle>
            <DialogDescription className="text-sm text-[#c2c3c7]">
              It is not possible to add more personalities. Each player can have
              up to {MAX_PERSONALITIES_PER_USER} bots.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 rounded-none border-0 border-t-[3px] border-[#fff1e8] bg-[#29366f] px-4 py-4 sm:justify-end">
            <Button
              type="button"
              onClick={() => setLimitDialogOpen(false)}
              className="rounded-none border-2 border-[#fff1e8] bg-[#29adff] text-[#1d2b53] hover:bg-[#00e436]"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
