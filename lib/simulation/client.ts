import type { TickLogEntry, TickLogLevel } from "@/lib/simulation/logger";
import type { SimulationTickStats } from "@/lib/simulation/tick-stats";

export type StreamTickEvent =
  | ({ type: "log" } & TickLogEntry)
  | {
      type: "done";
      tickNumber: number;
      lastTickAt: string | Date | null;
      trendingTopics: string[];
      personalityCount: number;
      postCount: number;
      simulatedPersonalityCount: number;
      eligiblePersonalityCount: number;
      stats: SimulationTickStats;
    }
  | {
      type: "cancelled";
      message: string;
    }
  | {
      type: "error";
      message: string;
      status?: number;
    };

function parseSseChunk(buffer: string): {
  events: StreamTickEvent[];
  remainder: string;
} {
  const events: StreamTickEvent[] = [];
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
      events.push(JSON.parse(line.slice(6)) as StreamTickEvent);
    } catch {
      // ignore malformed chunks
    }
  }

  return { events, remainder };
}

export async function streamSimulationTickRequest(
  token: string,
  onEvent: (event: StreamTickEvent) => void,
  signal?: AbortSignal,
): Promise<
  | { ok: true }
  | { ok: false; error: string; cancelled?: boolean }
> {
  try {
    const response = await fetch("/api/simulation/tick/stream", {
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
      return { ok: false, error: data.error ?? "Simulation tick failed." };
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
        return { ok: false, error: "Tick cancelled.", cancelled: true };
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
      return { ok: false, error: "Tick cancelled.", cancelled: true };
    }

    return { ok: true };
  } catch (error) {
    if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
      return { ok: false, error: "Tick cancelled.", cancelled: true };
    }

    throw error;
  }
}

export function logLevelColor(level: TickLogLevel): string {
  switch (level) {
    case "success":
      return "text-[#00e436]";
    case "warn":
      return "text-[#ffa300]";
    case "error":
      return "text-[#ff004d]";
    default:
      return "text-[#c2c3c7]";
  }
}

export type RefreshTrendingTopicsResponse = {
  topics: string[];
  updatedAt: string;
  usedFallback: boolean;
  fromCache: boolean;
};

export async function refreshTrendingTopicsRequest(
  token: string,
): Promise<
  | { ok: true; data: RefreshTrendingTopicsResponse }
  | { ok: false; error: string }
> {
  const response = await fetch("/api/simulation/trending/refresh", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as RefreshTrendingTopicsResponse & {
    error?: string;
  };

  if (!response.ok) {
    return { ok: false, error: data.error ?? "Could not refresh trending topics." };
  }

  return { ok: true, data };
}
