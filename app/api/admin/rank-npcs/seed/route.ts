import { getAdminUser } from "@/lib/auth/server";
import { seedRankNpcsFromConfig } from "@/lib/rank-npcs/seed";

export const maxDuration = 300;

function formatSse(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  const adminUser = await getAdminUser(request);

  if (!adminUser) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();

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
