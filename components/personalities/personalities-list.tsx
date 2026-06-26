"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { AppBar } from "@/components/layout/app-bar";
import { Button } from "@/components/ui/button";
import { PersonalityAvatar } from "@/components/personalities/personality-avatar";
import { formatArchetypeLabel } from "@/lib/personalities/archetypes";
import {
  generateAvatarRequest,
  listPersonalitiesRequest,
} from "@/lib/personalities/client";
import type { Personality } from "@/lib/types/personality";

function needsAvatarGeneration(personality: Personality): boolean {
  return (
    personality.avatarStatus === "pending" ||
    personality.avatarStatus === "failed"
  );
}

function isAvatarInProgress(personality: Personality): boolean {
  return (
    personality.avatarStatus === "pending" ||
    personality.avatarStatus === "generating"
  );
}

export function PersonalitiesList() {
  const router = useRouter();
  const { user, token, isReady } = useAuth();
  const [personalities, setPersonalities] = useState<Personality[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const generationStarted = useRef(new Set<string>());

  const loadPersonalities = useCallback(async () => {
    if (!token) return;

    const result = await listPersonalitiesRequest(token);

    if (!result.ok) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    setError(null);
    setPersonalities(result.personalities);
    setIsLoading(false);
  }, [token]);

  useEffect(() => {
    if (!isReady || !token) return;
    void loadPersonalities();
  }, [isReady, token, loadPersonalities]);

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

    const hasPending = personalities.some(isAvatarInProgress);
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
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-[#c2c3c7]">
            Your FakeX personalities. Pixel avatars generate in the background.
          </p>
          <Link
            href="/create-personality"
            className="shrink-0 pixel-border-thin bg-[#00e436] px-2 py-1 text-[10px] text-[#1d2b53] pixel-heading"
          >
            NEW
          </Link>
        </div>

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
              onClick={() => router.push("/create-personality")}
              className="mt-4 rounded-none border-2 border-[#fff1e8] bg-[#00e436] text-[#1d2b53] hover:bg-[#29adff]"
            >
              Create one
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {personalities.map((personality) => (
              <li
                key={personality.id}
                className="flex gap-3 pixel-border-thin bg-[#29366f] p-3"
              >
                <PersonalityAvatar personality={personality} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-[#ffa300]">
                    {personality.name}
                  </p>
                  <p className="truncate text-sm text-[#c2c3c7]">
                    @{personality.handle}
                  </p>
                  <p className="mt-1 pixel-heading text-[8px] text-[#29adff]">
                    {formatArchetypeLabel(personality.archetype).toUpperCase()}
                  </p>
                  {isAvatarInProgress(personality) ? (
                    <p className="mt-1 text-xs text-[#83769a]">
                      Generating pixel avatar...
                    </p>
                  ) : null}
                  {personality.avatarStatus === "failed" ? (
                    <button
                      type="button"
                      onClick={() => {
                        generationStarted.current.delete(personality.id);
                        void generateAvatarRequest(token, personality.id).then(
                          () => loadPersonalities(),
                        );
                      }}
                      className="mt-1 text-xs text-[#ff004d] underline"
                    >
                      Retry avatar generation
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
