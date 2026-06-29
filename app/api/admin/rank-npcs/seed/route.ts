import { getAdminUser } from "@/lib/auth/server";
import {
  abortRankNpcSeed,
  completeRankNpcSeed,
  getRankNpcSeedStatus,
  tryBeginRankNpcSeed,
} from "@/lib/rank-npcs/seed-cooldown";
import { seedRankNpcsFromConfig } from "@/lib/rank-npcs/seed";

export const maxDuration = 300;

function formatSse(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function GET(request: Request) {
  const adminUser = await getAdminUser(request);

  if (!adminUser) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const status = await getRankNpcSeedStatus();

  return Response.json({
    canRun: status.canRun,
    inProgress: status.inProgress,
    lastSeedAt: status.lastSeedAt?.toISOString() ?? null,
    nextAvailableAt: status.nextAvailableAt?.toISOString() ?? null,
  });
}

export async function POST(request: Request) {
  const adminUser = await getAdminUser(request);

  if (!adminUser) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const begin = await tryBeginRankNpcSeed();

  if (!begin.canRun) {
    return Response.json(
      {
        error: begin.inProgress
          ? "Rank NPC seed is already running."
          : "Rank NPC seed already ran recently.",
        nextAvailableAt: begin.nextAvailableAt?.toISOString() ?? null,
      },
      { status: 429 },
    );
  }

  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  let seedSucceeded = false;

  void (async () => {
    let streamClosed = false;

    const writeEvent = async (data: unknown): Promise<void> => {
      if (request.signal.aborted || streamClosed) {
        return;
      }

      try {
        await writer.write(formatSse(data));
      } catch (error) {
        streamClosed = true;

        if (
          !(error instanceof TypeError) ||
          !/closed/i.test(error.message)
        ) {
          console.error("Rank NPC seed stream write failed:", error);
        }
      }
    };

    try {
      const result = await seedRankNpcsFromConfig({
        log: (message) => {
          void writeEvent({
            type: "log",
            message,
            at: new Date().toISOString(),
          });
        },
      });

      if (request.signal.aborted) {
        await writeEvent({
          type: "cancelled",
          message: "Seed cancelled.",
        });
        return;
      }

      seedSucceeded = true;

      await writeEvent({
        type: "done",
        reconcile: result.reconcile,
        sync: {
          synced: result.sync.synced,
          newPosts: result.sync.newPosts,
          skipped: result.sync.skipped,
          skipReason: result.sync.skipReason,
          errors: result.sync.errors,
          createdPosts: result.sync.results.flatMap((entry) =>
            entry.createdPosts.map((post) => ({
              handle: entry.knockOffHandle,
              ...post,
            })),
          ),
        },
        assets: result.assets,
      });
    } catch (error) {
      if (request.signal.aborted) {
        await writeEvent({
          type: "cancelled",
          message: "Seed cancelled.",
        });
        return;
      }

      console.error("Rank NPC seed stream failed:", error);
      await writeEvent({
        type: "error",
        message: "Rank NPC seed failed.",
      });
    } finally {
      if (seedSucceeded) {
        await completeRankNpcSeed();
      } else {
        await abortRankNpcSeed();
      }

      streamClosed = true;

      try {
        await writer.close();
      } catch {
        // Stream may already be closed if the client disconnected.
      }
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
