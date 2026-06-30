import { runHeatDecayTick } from "@/lib/simulation/run-heat-decay";
import {
  getHeatDecayTickIntervalMs,
  shouldRunHeatDecayTick,
} from "@/lib/simulation/heat-decay";

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
    const result = await runHeatDecayTick(false);

    if (!result.ok) {
      if ("skipped" in result && result.skipped) {
        return Response.json({
          skipped: true,
          message: result.error,
          lastHeatDecayAt: result.lastHeatDecayAt,
          intervalMs: result.intervalMs,
        });
      }

      return Response.json(
        { error: result.error },
        { status: "status" in result ? result.status : 409 },
      );
    }

    return Response.json({
      lastHeatDecayAt: result.lastHeatDecayAt,
      personalityCount: result.personalityCount,
    });
  } catch (error) {
    console.error("Heat decay cron failed:", error);
    return Response.json({ error: "Heat decay tick failed." }, { status: 500 });
  }
}

export { getHeatDecayTickIntervalMs, shouldRunHeatDecayTick, runHeatDecayTick };
