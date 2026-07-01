"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AppBar } from "@/components/layout/app-bar";
import { PersonalityListCard } from "@/components/personalities/personality-list-card";
import { fetchFarmerProfile } from "@/lib/farmers/client";
import { formatStatValue } from "@/lib/personalities/stats";
import type { FarmerProfile } from "@/lib/types/farmer";

type FarmerViewProps = {
  username: string;
};

function FarmerSummary({ farmer }: { farmer: FarmerProfile }) {
  return (
    <div className="grid grid-cols-2 items-end gap-2 pixel-border-thin bg-[#1d2b53] px-3 py-3">
      <div className="flex min-w-0 flex-col items-center gap-1 text-center">
        <p className="pixel-heading text-[8px] text-[#83769a]">TOTAL CLOUT</p>
        <p className="text-lg font-bold leading-none text-[#ffa300]">
          {formatStatValue(farmer.totalClout)}
        </p>
      </div>
      <div className="flex min-w-0 flex-col items-center gap-1 text-center">
        <p className="pixel-heading text-[8px] text-[#83769a]">TOTAL HEAT</p>
        <p className="text-lg font-bold leading-none text-[#ff004d]">
          {formatStatValue(farmer.totalHeat)}
        </p>
      </div>
    </div>
  );
}

export function FarmerView({ username }: FarmerViewProps) {
  const router = useRouter();
  const [farmer, setFarmer] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const result = await fetchFarmerProfile(username);

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setError(result.error);
        setFarmer(null);
      } else {
        setError(null);
        setFarmer(result.farmer);
      }

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [username]);

  return (
    <>
      <AppBar title={username} onBack={handleBack} />
      <div className="space-y-4 px-4 py-4 pb-8">
        {loading ? (
          <p className="text-sm text-[#83769a]">Loading farmer profile...</p>
        ) : error ? (
          <p className="pixel-border-thin bg-[#7e2553] px-3 py-2 text-sm text-[#fff1e8]">
            {error}
          </p>
        ) : farmer ? (
          <>
            <FarmerSummary farmer={farmer} />

            {farmer.personalities.length === 0 ? (
              <div className="pixel-border bg-[#29366f] p-6 text-center pixel-shadow-sm">
                <p className="text-[#fff1e8]">No personalities yet.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {farmer.personalities.map((personality) => (
                  <PersonalityListCard
                    key={personality.id}
                    personality={personality}
                  />
                ))}
              </ul>
            )}
          </>
        ) : null}
      </div>
    </>
  );
}
