import { ensureWorldStateIndexes } from "@/lib/db/world";
import { refreshTrendingTopics } from "@/lib/simulation/trending-state";

export const maxDuration = 120;

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
    await ensureWorldStateIndexes();

    const result = await refreshTrendingTopics({ force: true });

    return Response.json({
      topics: result.topics,
      updatedAt: result.updatedAt,
      usedFallback: result.usedFallback,
      fromCache: result.fromCache,
    });
  } catch (error) {
    console.error("Trending refresh cron failed:", error);
    return Response.json(
      { error: "Could not refresh trending topics." },
      { status: 500 },
    );
  }
}
