import { findPersonalityByHandle } from "@/lib/personalities";
import { toPublicPersonality } from "@/lib/profile/build-profile";
import { normalizeHandle } from "@/lib/personalities/validation";

type RouteContext = {
  params: Promise<{ handle: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { handle: rawHandle } = await context.params;
    const handle = normalizeHandle(rawHandle);
    const personality = await findPersonalityByHandle(handle);

    if (!personality) {
      return Response.json({ error: "Profile not found." }, { status: 404 });
    }

    return Response.json({ personality: toPublicPersonality(personality) });
  } catch (error) {
    console.error("Profile load failed:", error);
    return Response.json({ error: "Could not load profile." }, { status: 500 });
  }
}
