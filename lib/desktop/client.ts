import type {
  LeaderboardsPayload,
  MySocialActivityPayload,
  MySocialPayload,
  ThreadingTopicsPayload,
} from "@/lib/types/desktop";
import { PAGE_SIZE } from "@/lib/pagination";

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

export async function fetchMySocial(
  token: string,
): Promise<
  | { ok: true; payload: MySocialPayload }
  | { ok: false; error: string }
> {
  const response = await fetch("/api/desktop/my-social", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as MySocialPayload & { error?: string };

  if (!response.ok) {
    return {
      ok: false,
      error: data.error ?? "Could not load My Social.",
    };
  }

  if (
    !Array.isArray(data.leaderboard) ||
    !Array.isArray(data.personalities)
  ) {
    return { ok: false, error: "Invalid server response." };
  }

  return {
    ok: true,
    payload: {
      leaderboard: data.leaderboard,
      personalities: data.personalities,
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    },
  };
}

export async function fetchMySocialActivity(
  token: string,
  options?: { offset?: number; limit?: number },
): Promise<
  | { ok: true; payload: MySocialActivityPayload }
  | { ok: false; error: string }
> {
  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? PAGE_SIZE;
  const response = await fetch(
    `/api/desktop/my-social/activity?offset=${offset}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const data = (await response.json()) as MySocialActivityPayload & {
    error?: string;
  };

  if (!response.ok) {
    return {
      ok: false,
      error: data.error ?? "Could not load activity.",
    };
  }

  if (!Array.isArray(data.items) || typeof data.hasMore !== "boolean") {
    return { ok: false, error: "Invalid server response." };
  }

  return {
    ok: true,
    payload: {
      items: data.items,
      hasMore: data.hasMore,
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    },
  };
}
