"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { ImportNftPanel } from "@/components/wallet/import-nft-panel";
import {
  MAX_PERSONALITIES_PER_USER,
  countTowardCreateLimit,
} from "@/lib/personalities/limits";
import { listPersonalitiesRequest } from "@/lib/personalities/client";

type DesktopPersonalityActionsProps = {
  onImported?: () => void | Promise<void>;
};

export function DesktopPersonalityActions({
  onImported,
}: DesktopPersonalityActionsProps) {
  const { user, token } = useAuth();
  const [atPersonalityLimit, setAtPersonalityLimit] = useState(false);
  const [checkingLimit, setCheckingLimit] = useState(true);

  useEffect(() => {
    if (!token || !user) {
      setCheckingLimit(false);
      return;
    }

    const authToken = token;
    const userId = user.id;
    let cancelled = false;

    async function checkLimit() {
      const result = await listPersonalitiesRequest(authToken);

      if (cancelled) {
        return;
      }

      if (result.ok) {
        setAtPersonalityLimit(
          countTowardCreateLimit(result.personalities, userId) >=
            MAX_PERSONALITIES_PER_USER,
        );
      }

      setCheckingLimit(false);
    }

    void checkLimit();

    return () => {
      cancelled = true;
    };
  }, [token, user]);

  if (!user || !token) {
    return null;
  }

  async function handleImported() {
    if (token && user) {
      const result = await listPersonalitiesRequest(token);

      if (result.ok) {
        setAtPersonalityLimit(
          countTowardCreateLimit(result.personalities, user.id) >=
            MAX_PERSONALITIES_PER_USER,
        );
      }
    }

    await onImported?.();
  }

  return (
    <div className="space-y-4">
      <ImportNftPanel onImported={() => void handleImported()} />

      {atPersonalityLimit || checkingLimit ? (
        <div
          className="block w-full cursor-not-allowed pixel-border-thin bg-[#5a6988] px-3 py-3 text-center text-xs text-[#1d2b53] opacity-70 pixel-heading"
          aria-label="Cannot add more personalities"
        >
          {checkingLimit ? "CHECKING LIMIT..." : "CREATE PERSONALITY"}
        </div>
      ) : (
        <Link
          href="/create-personality"
          className="block w-full pixel-border-thin bg-[#00e436] px-3 py-3 text-center text-xs text-[#1d2b53] pixel-heading transition-colors hover:bg-[#29adff]"
        >
          CREATE PERSONALITY
        </Link>
      )}
    </div>
  );
}
