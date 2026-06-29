import type {
  LeaderboardsPayload,
  ThreadingTopicsPayload,
} from "@/lib/types/desktop";

export async function fetchThreadingTopics(): Promise<
  | { ok: true; payload: ThreadingTopicsPayload }
  | { ok: false; error: string }
> {
  const response = await fetch("/api/desktop/threading-topics");
  const data = (await response.json()) as ThreadingTopicsPayload & {
    error?: string;
  };

  if (!response.ok) {
    return {
      ok: false,
      error: data.error ?? "Could not load threading topics.",
    };
  }

  if (!Array.isArray(data.topics)) {
    return { ok: false, error: "Invalid server response." };
  }

  return {
    ok: true,
    payload: {
      topics: data.topics,
      updatedAt: data.updatedAt ?? null,
    },
  };
}

export async function fetchLeaderboards(): Promise<
  | { ok: true; payload: LeaderboardsPayload }
  | { ok: false; error: string }
> {
  const response = await fetch("/api/desktop/leaderboards");
  const data = (await response.json()) as LeaderboardsPayload & {
    error?: string;
  };

  if (!response.ok) {
    return {
      ok: false,
      error: data.error ?? "Could not load leaderboards.",
    };
  }

  if (
    !Array.isArray(data.personalitiesByClout) ||
    !Array.isArray(data.farmersByClout) ||
    !Array.isArray(data.personalitiesByHeat) ||
    !Array.isArray(data.farmersByHeat)
  ) {
    return { ok: false, error: "Invalid server response." };
  }

  return {
    ok: true,
    payload: {
      personalitiesByClout: data.personalitiesByClout,
      farmersByClout: data.farmersByClout,
      personalitiesByHeat: data.personalitiesByHeat,
      farmersByHeat: data.farmersByHeat,
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    },
  };
}
