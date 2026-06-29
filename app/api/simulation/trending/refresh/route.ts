import { ensureWorldStateIndexes } from "@/lib/db/world";
import { getAdminUser } from "@/lib/auth/server";
import { refreshTrendingTopics } from "@/lib/simulation/trending-state";

export const maxDuration = 120;

export async function POST(request: Request) {
  const adminUser = await getAdminUser(request);

  if (!adminUser) {
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
    console.error("Trending topics refresh failed:", error);
    return Response.json(
      { error: "Could not refresh trending topics." },
      { status: 500 },
    );
  }
}
