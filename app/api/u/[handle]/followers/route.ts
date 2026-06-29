import { ensureFollowIndexes } from "@/lib/db/follows";
import { findPublicPersonalityByHandle } from "@/lib/personalities";
import { buildProfileFollowers } from "@/lib/profile/build-followers";
import { normalizeHandle } from "@/lib/personalities/validation";
import { PAGE_SIZE, parsePositiveInt } from "@/lib/pagination";

type RouteContext = {
  params: Promise<{ handle: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await ensureFollowIndexes();

    const { handle: rawHandle } = await context.params;
    const handle = normalizeHandle(rawHandle);
    const personality = await findPublicPersonalityByHandle(handle);

    if (!personality) {
      return Response.json({ error: "Profile not found." }, { status: 404 });
    }

    const searchParams = new URL(request.url).searchParams;
    const limit = parsePositiveInt(searchParams.get("limit"), PAGE_SIZE);
    const offset = parsePositiveInt(searchParams.get("offset"), 0);
    const { followers, hasMore } = await buildProfileFollowers(
      personality.id,
      limit,
      offset,
    );

    return Response.json({ followers, hasMore });
  } catch (error) {
    console.error("Profile followers load failed:", error);
    return Response.json(
      { error: "Could not load followers." },
      { status: 500 },
    );
  }
}
