import { runSimulationTick } from "@/lib/simulation/run-tick";
import { getSimulationTickIntervalMs, shouldRunTick } from "@/lib/simulation/tick";

export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await runSimulationTick(false);

    if (!result.ok) {
      if ("skipped" in result && result.skipped) {
        return Response.json({
          skipped: true,
          message: result.error,
          lastTickAt: result.lastTickAt,
          intervalMs: result.intervalMs,
        });
      }

      return Response.json(
        { error: result.error },
        { status: "status" in result ? result.status : 409 },
      );
    }

    return Response.json({
      tickNumber: result.tickNumber,
      lastTickAt: result.lastTickAt,
      trendingTopics: result.trendingTopics,
      personalityCount: result.personalityCount,
      postCount: result.postCount,
    });
  } catch (error) {
    console.error("Simulation cron failed:", error);
    return Response.json({ error: "Simulation tick failed." }, { status: 500 });
  }
}

export { getSimulationTickIntervalMs, shouldRunTick, runSimulationTick };
