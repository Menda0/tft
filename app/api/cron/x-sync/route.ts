import { syncAllRankNpcs } from "@/lib/x/sync";

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
    const result = await syncAllRankNpcs();

    return Response.json({
      reconcile: result.reconcile,
      synced: result.synced,
      newPosts: result.newPosts,
      errors: result.errors,
      queryIdCacheAgeMs: result.queryIdCacheAgeMs,
    });
  } catch (error) {
    console.error("X sync cron failed:", error);
    return Response.json({ error: "X sync failed." }, { status: 500 });
  }
}
