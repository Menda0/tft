import { ensureFollowIndexes } from "@/lib/db/follows";
import { findPublicPersonalityByHandle } from "@/lib/personalities";
import { buildProfileFollowers } from "@/lib/profile/build-followers";
import { normalizeHandle } from "@/lib/personalities/validation";

type RouteContext = {
  params: Promise<{ handle: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await ensureFollowIndexes();

    const { handle: rawHandle } = await context.params;
    const handle = normalizeHandle(rawHandle);
    const personality = await findPublicPersonalityByHandle(handle);

    if (!personality) {
      return Response.json({ error: "Profile not found." }, { status: 404 });
    }

    const followers = await buildProfileFollowers(personality.id);

    return Response.json({ followers });
  } catch (error) {
    console.error("Profile followers load failed:", error);
    return Response.json(
      { error: "Could not load followers." },
      { status: 500 },
    );
  }
}
