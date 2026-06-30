import { runSimulationTick } from "@/lib/simulation/run-tick";
import { getAdminUser } from "@/lib/auth/server";

export const maxDuration = 300;

function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  const cronAuthorized = isCronAuthorized(request);
  const adminUser = await getAdminUser(request);
  const isDev = process.env.NODE_ENV !== "production";
  const authorized = cronAuthorized || Boolean(adminUser) || isDev;

  if (!authorized) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await runSimulationTick(true);

    if (!result.ok) {
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
      simulatedPersonalityCount: result.simulatedPersonalityCount,
      eligiblePersonalityCount: result.eligiblePersonalityCount,
      stats: result.stats,
    });
  } catch (error) {
    console.error("Simulation dev tick failed:", error);
    return Response.json({ error: "Simulation tick failed." }, { status: 500 });
  }
}
