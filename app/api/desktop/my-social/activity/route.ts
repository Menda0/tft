import { buildMySocialActivity } from "@/lib/desktop/build-my-social-activity";
import { ensurePersonalityActivityIndexes } from "@/lib/db/personality-activity";
import { getAuthUser } from "@/lib/auth/server";
import { authError } from "@/lib/auth/responses";
import { PAGE_SIZE, parsePositiveInt } from "@/lib/pagination";

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return authError("You must be logged in to view activity.", 401);
    }

    const { searchParams } = new URL(request.url);
    const limit = parsePositiveInt(searchParams.get("limit"), PAGE_SIZE);
    const offset = parsePositiveInt(searchParams.get("offset"), 0);
    await ensurePersonalityActivityIndexes();
    const payload = await buildMySocialActivity(authUser.id, offset, limit);

    return Response.json(payload);
  } catch (error) {
    console.error("My Social activity load failed:", error);
    return Response.json(
      { error: "Could not load activity." },
      { status: 500 },
    );
  }
}
