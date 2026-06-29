import type { RankNpcAdminItem } from "@/lib/rank-npcs/admin";
import type { ReconcileResult } from "@/lib/rank-npcs/reconcile";

export async function listRankNpcsAdminRequest(
  token: string,
): Promise<
  | { ok: true; data: RankNpcAdminItem[] }
  | { ok: false; error: string }
> {
  const response = await fetch("/api/admin/rank-npcs", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as {
    items?: RankNpcAdminItem[];
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Request failed." };
  }

  return { ok: true, data: data.items ?? [] };
}

export async function pruneRankNpcPostsRequest(
  token: string,
): Promise<
  | {
      ok: true;
      data: {
        deletedPosts: number;
        deletedReplies: number;
        resetNpcs: number;
      };
    }
  | { ok: false; error: string }
> {
  const response = await fetch("/api/admin/rank-npcs/prune-posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as {
    deletedPosts?: number;
    deletedReplies?: number;
    resetNpcs?: number;
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Request failed." };
  }

  return {
    ok: true,
    data: {
      deletedPosts: data.deletedPosts ?? 0,
      deletedReplies: data.deletedReplies ?? 0,
      resetNpcs: data.resetNpcs ?? 0,
    },
  };
}

export type StreamSeedNpcEvent =
  | {
      type: "log";
      message: string;
      at: string;
    }
  | {
      type: "done";
      reconcile: ReconcileResult;
      sync: {
        synced: number;
        newPosts: number;
        skipped?: boolean;
        skipReason?: string;
        errors: Array<{ xHandle: string; error: string }>;
        createdPosts: Array<{
          handle: string;
          externalId: string;
          preview: string;
        }>;
      };
      assets: {
        descriptions: number;
        avatarsQueued: number;
        avatarsCompleted: number;
      };
    }
  | {
      type: "cancelled";
      message: string;
    }
  | {
      type: "error";
      message: string;
    };

function parseSseChunk(buffer: string): {
  events: StreamSeedNpcEvent[];
  remainder: string;
} {
  const events: StreamSeedNpcEvent[] = [];
  const parts = buffer.split("\n\n");
  const remainder = parts.pop() ?? "";

  for (const part of parts) {
    const line = part
      .split("\n")
      .find((entry) => entry.startsWith("data: "));

    if (!line) {
      continue;
    }

    try {
      events.push(JSON.parse(line.slice(6)) as StreamSeedNpcEvent);
    } catch {
      // ignore malformed chunks
    }
  }

  return { events, remainder };
}

export async function streamSeedRankNpcsAdminRequest(
  token: string,
  onEvent: (event: StreamSeedNpcEvent) => void,
  signal?: AbortSignal,
): Promise<
  | { ok: true }
  | { ok: false; error: string; cancelled?: boolean }
> {
  try {
    const response = await fetch("/api/admin/rank-npcs/seed", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      return { ok: false, error: data.error ?? "Rank NPC seed failed." };
    }

    const reader = response.body?.getReader();

    if (!reader) {
      return { ok: false, error: "No response stream." };
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        return { ok: false, error: "Seed cancelled.", cancelled: true };
      }

      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseChunk(buffer);
      buffer = parsed.remainder;

      for (const event of parsed.events) {
        onEvent(event);
      }
    }

    if (buffer.trim()) {
      const parsed = parseSseChunk(`${buffer}\n\n`);
      for (const event of parsed.events) {
        onEvent(event);
      }
    }

    if (signal?.aborted) {
      return { ok: false, error: "Seed cancelled.", cancelled: true };
    }

    return { ok: true };
  } catch (error) {
    if (
      signal?.aborted ||
      (error instanceof DOMException && error.name === "AbortError")
    ) {
      return { ok: false, error: "Seed cancelled.", cancelled: true };
    }

    throw error;
  }
}
