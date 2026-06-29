"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  logLevelColor,
  refreshTrendingTopicsRequest,
  streamSimulationTickRequest,
  type StreamTickEvent,
} from "@/lib/simulation/client";
import { prunePlayerPersonalitiesRequest } from "@/lib/personalities/admin-client";
import { pruneRankNpcPostsRequest, streamSeedRankNpcsAdminRequest } from "@/lib/rank-npcs/client";
import type { TickLogLevel } from "@/lib/simulation/logger";

type ConsoleLine = {
  id: string;
  level: TickLogLevel | "system";
  text: string;
};

const HELP_TEXT = [
  "Available commands:",
  "  tick    — run a simulation tick (15 random personalities)",
  "  trends  — refresh trending topics",
  "  seed npc — reconcile, sync, and seed parody NPCs (once per day)",
  "  prune npc — delete all mirrored parody NPC posts",
  "  prune personalities — soft-delete all player personalities and their posts",
  "  clear   — clear the console",
  "  help    — show this message",
  "",
  "Press Ctrl+C to stop a running tick.",
].join("\n");

function formatTime(date = new Date()): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

type AdminConsoleProps = {
  open: boolean;
  onClose: () => void;
};

export function AdminConsole({ open, onClose }: AdminConsoleProps) {
  const { token } = useAuth();
  const [lines, setLines] = useState<ConsoleLine[]>([
    {
      id: "welcome",
      level: "system",
      text: "Admin console ready. Type `help` for commands.",
    },
  ]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lineCounter = useRef(0);
  const tickAbortRef = useRef<AbortController | null>(null);

  const appendLine = useCallback(
    (level: ConsoleLine["level"], text: string) => {
      lineCounter.current += 1;
      setLines((current) => [
        ...current,
        { id: `${Date.now()}-${lineCounter.current}`, level, text },
      ]);
    },
    [],
  );

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (
        running &&
        event.key.toLowerCase() === "c" &&
        (event.ctrlKey || event.metaKey)
      ) {
        event.preventDefault();
        tickAbortRef.current?.abort();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, running]);

  const runTick = useCallback(async () => {
    if (!token || running) {
      return;
    }

    const controller = new AbortController();
    tickAbortRef.current = controller;

    setRunning(true);
    appendLine("system", `[${formatTime()}] Executing tick...`);

    try {
      let sawCancelledEvent = false;

      const result = await streamSimulationTickRequest(
        token,
        (event: StreamTickEvent) => {
          if (event.type === "log") {
            appendLine(
              event.level,
              `[${formatTime(new Date(event.at))}] ${event.message}`,
            );
            return;
          }

          if (event.type === "cancelled") {
            sawCancelledEvent = true;
            appendLine("warn", event.message);
            return;
          }

          if (event.type === "error") {
            appendLine("error", event.message);
            return;
          }

          if (event.type === "done") {
            appendLine(
              "success",
              `Tick #${event.tickNumber} finished (simulated ${event.simulatedPersonalityCount}/${event.eligiblePersonalityCount} personalities, ${event.postCount} posts tracked).`,
            );
          }
        },
        controller.signal,
      );

      if (!result.ok && result.cancelled && !sawCancelledEvent) {
        appendLine("warn", "Tick cancelled.");
      } else if (!result.ok && !result.cancelled) {
        appendLine("error", result.error);
      }
    } finally {
      tickAbortRef.current = null;
      setRunning(false);
    }
  }, [appendLine, running, token]);

  const refreshTrends = useCallback(async () => {
    if (!token || running) {
      return;
    }

    setRunning(true);
    appendLine("system", `[${formatTime()}] Refreshing trending topics...`);

    try {
      const result = await refreshTrendingTopicsRequest(token);

      if (!result.ok) {
        appendLine("error", result.error);
        return;
      }

      const { topics, usedFallback, updatedAt } = result.data;

      if (usedFallback) {
        appendLine("warn", "Used fallback/cached topics.");
      } else {
        appendLine("success", `Trending topics refreshed (${topics.length}).`);
      }

      appendLine("system", `Updated at ${formatTime(new Date(updatedAt))}`);

      for (const topic of topics) {
        appendLine("info", topic);
      }
    } finally {
      setRunning(false);
    }
  }, [appendLine, running, token]);

  const seedNpcs = useCallback(async () => {
    if (!token || running) {
      return;
    }

    const controller = new AbortController();
    tickAbortRef.current = controller;

    setRunning(true);
    appendLine(
      "system",
      `[${formatTime()}] Seeding parody NPCs (same as npm run seed:rank-npcs)...`,
    );

    try {
      let sawDone = false;

      const result = await streamSeedRankNpcsAdminRequest(
        token,
        (event) => {
          if (event.type === "log") {
            appendLine(
              "info",
              `[${formatTime(new Date(event.at))}] ${event.message}`,
            );
            return;
          }

          if (event.type === "cancelled") {
            appendLine("warn", event.message);
            return;
          }

          if (event.type === "error") {
            appendLine("error", event.message);
            return;
          }

          if (event.type === "done") {
            sawDone = true;
            const { reconcile, sync, assets } = event;

            appendLine(
              "success",
              `Seed complete: ${reconcile.created.length} created, ${reconcile.updated.length} updated, ${sync.newPosts} new post(s), ${assets.descriptions} bio(s), ${assets.avatarsQueued} avatar(s).`,
            );

            if (sync.errors.length > 0) {
              appendLine("warn", `${sync.errors.length} X sync error(s).`);
            }
          }
        },
        controller.signal,
      );

      if (!result.ok && result.cancelled) {
        appendLine("warn", "Seed cancelled.");
      } else if (!result.ok && !sawDone) {
        appendLine("error", result.error);
      }
    } finally {
      tickAbortRef.current = null;
      setRunning(false);
    }
  }, [appendLine, running, token]);

  const pruneNpcPosts = useCallback(async () => {
    if (!token || running) {
      return;
    }

    setRunning(true);
    appendLine("system", `[${formatTime()}] Pruning mirrored parody NPC posts...`);

    try {
      const result = await pruneRankNpcPostsRequest(token);

      if (!result.ok) {
        appendLine("error", result.error);
        return;
      }

      appendLine(
        "success",
        `Pruned ${result.data.deletedPosts} post(s), ${result.data.deletedReplies} repl(ies), reset ${result.data.resetNpcs} NPC sync state.`,
      );
    } finally {
      setRunning(false);
    }
  }, [appendLine, running, token]);

  const prunePersonalities = useCallback(async () => {
    if (!token || running) {
      return;
    }

    setRunning(true);
    appendLine(
      "system",
      `[${formatTime()}] Soft-deleting all player personalities and related content...`,
    );

    try {
      const result = await prunePlayerPersonalitiesRequest(token);

      if (!result.ok) {
        appendLine("error", result.error);
        return;
      }

      appendLine(
        "success",
        `Pruned ${result.data.personalities} personalit(ies), ${result.data.posts} post(s), ${result.data.follows} follow(s), ${result.data.postReads} read(s).`,
      );
    } finally {
      setRunning(false);
    }
  }, [appendLine, running, token]);

  const handleCommand = useCallback(
    async (raw: string) => {
      const command = raw.trim().toLowerCase();

      if (!command) {
        return;
      }

      appendLine("system", `> ${raw.trim()}`);

      if (command === "help") {
        appendLine("system", HELP_TEXT);
        return;
      }

      if (command === "clear") {
        setLines([]);
        return;
      }

      if (command === "tick") {
        await runTick();
        return;
      }

      if (command === "trends" || command === "trending" || command === "topics") {
        await refreshTrends();
        return;
      }

      if (command === "seed npc") {
        await seedNpcs();
        return;
      }

      if (command === "prune npc") {
        await pruneNpcPosts();
        return;
      }

      if (command === "prune personalities") {
        await prunePersonalities();
        return;
      }

      appendLine("error", `Unknown command: ${raw.trim()}. Type \`help\` for options.`);
    },
    [appendLine, pruneNpcPosts, prunePersonalities, refreshTrends, runTick, seedNpcs],
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (running) {
      return;
    }

    const value = input;
    setInput("");
    void handleCommand(value);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] hidden md:flex md:items-end md:justify-center md:p-8 md:pt-24">
      <button
        type="button"
        aria-label="Close admin console"
        className="absolute inset-0 bg-[#0a0a2a]/70"
        onClick={onClose}
      />

      <div className="relative flex h-[min(70dvh,560px)] w-[min(720px,100%)] flex-col pixel-border bg-[#0a0a2a] pixel-shadow-sm">
        <div className="flex items-center justify-between border-b-2 border-[#fff1e8] px-4 py-2">
          <p className="pixel-heading text-[10px] text-[#29adff]">ADMIN CONSOLE</p>
          <button
            type="button"
            onClick={onClose}
            className="pixel-border-thin bg-[#7e2553] px-2 py-1 text-[10px] text-[#fff1e8] pixel-heading"
          >
            CLOSE
          </button>
        </div>

        <div
          ref={outputRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed"
        >
          {lines.map((line) => (
            <p
              key={line.id}
              className={
                line.level === "system"
                  ? "whitespace-pre-wrap text-[#83769a]"
                  : `whitespace-pre-wrap ${logLevelColor(line.level as TickLogLevel)}`
              }
            >
              {line.text}
            </p>
          ))}
          {running ? (
            <p className="animate-pulse text-[#29adff]">
              _ running... (Ctrl+C to stop)
            </p>
          ) : null}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t-2 border-[#fff1e8] px-4 py-3"
        >
          <span className="font-mono text-sm text-[#ffa300]">{">"}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={running}
            placeholder="Type a command..."
            className="min-w-0 flex-1 bg-transparent font-mono text-sm text-[#fff1e8] outline-none placeholder:text-[#83769a] disabled:opacity-60"
            autoComplete="off"
            spellCheck={false}
          />
        </form>
      </div>
    </div>
  );
}
