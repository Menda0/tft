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
    try {
      const result = await seedRankNpcsFromConfig({
        log: (message) => {
          if (request.signal.aborted) {
            return;
          }

          void writer.write(
            formatSse({
              type: "log",
              message,
              at: new Date().toISOString(),
            }),
          );
        },
      });

      if (request.signal.aborted) {
        await writer.write(
          formatSse({
            type: "cancelled",
            message: "Seed cancelled.",
          }),
        );
        return;
      }

      await writer.write(
        formatSse({
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
        }),
      );
    } catch (error) {
      if (request.signal.aborted) {
        await writer.write(
          formatSse({
            type: "cancelled",
            message: "Seed cancelled.",
          }),
        );
        return;
      }

      console.error("Rank NPC seed stream failed:", error);
      await writer.write(
        formatSse({
          type: "error",
          message: "Rank NPC seed failed.",
        }),
      );
    } finally {
      await writer.close();
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
