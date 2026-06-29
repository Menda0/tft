import { runSimulationTick } from "@/lib/simulation/run-tick";
import { createSimulationLogger } from "@/lib/simulation/tick";
import { getAdminUser } from "@/lib/auth/server";

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
      const log = createSimulationLogger((entry) => {
        if (request.signal.aborted) {
          return;
        }

        void writer.write(formatSse({ type: "log", ...entry }));
      });

      const result = await runSimulationTick(true, log, request.signal);

      if (
        request.signal.aborted ||
        (!result.ok && "cancelled" in result && result.cancelled)
      ) {
        await writer.write(
          formatSse({
            type: "cancelled",
            message: "Tick cancelled.",
          }),
        );
        return;
      }

      if (!result.ok) {
        await writer.write(
          formatSse({
            type: "error",
            message: result.error,
            status: result.status,
          }),
        );
        return;
      }

      await writer.write(
        formatSse({
          type: "done",
          tickNumber: result.tickNumber,
          lastTickAt: result.lastTickAt,
          trendingTopics: result.trendingTopics,
          personalityCount: result.personalityCount,
          postCount: result.postCount,
          simulatedPersonalityCount: result.simulatedPersonalityCount,
          eligiblePersonalityCount: result.eligiblePersonalityCount,
        }),
      );
    } catch (error) {
      if (request.signal.aborted) {
        await writer.write(
          formatSse({
            type: "cancelled",
            message: "Tick cancelled.",
          }),
        );
        return;
      }

      console.error("Simulation stream tick failed:", error);
      await writer.write(
        formatSse({
          type: "error",
          message: "Simulation tick failed.",
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
