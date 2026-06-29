import { findPublicPersonalityByHandle } from "@/lib/personalities";
import { loadProfileCharacterSheet } from "@/lib/profile/build-character";
import { normalizeHandle } from "@/lib/personalities/validation";

type RouteContext = {
  params: Promise<{ handle: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { handle: rawHandle } = await context.params;
    const handle = normalizeHandle(rawHandle);
    const personality = await findPublicPersonalityByHandle(handle);

    if (!personality) {
      return Response.json({ error: "Profile not found." }, { status: 404 });
    }

    const character = await loadProfileCharacterSheet(personality);

    return Response.json({ character });
  } catch (error) {
    console.error("Profile character load failed:", error);
    return Response.json(
      { error: "Could not load character sheet." },
      { status: 500 },
    );
  }
}
