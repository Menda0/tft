import { findPublicPersonalityByHandle } from "@/lib/personalities";
import { buildProfileRelationshipsPage } from "@/lib/profile/build-character";
import { normalizeHandle } from "@/lib/personalities/validation";
import {
  CHARACTER_SECTION_PAGE_SIZE,
  parsePositiveInt,
} from "@/lib/pagination";

type RouteContext = {
  params: Promise<{ handle: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { handle: rawHandle } = await context.params;
    const handle = normalizeHandle(rawHandle);
    const personality = await findPublicPersonalityByHandle(handle);

    if (!personality) {
      return Response.json({ error: "Profile not found." }, { status: 404 });
    }

    const searchParams = new URL(request.url).searchParams;
    const limit = parsePositiveInt(
      searchParams.get("limit"),
      CHARACTER_SECTION_PAGE_SIZE,
    );
    const offset = parsePositiveInt(searchParams.get("offset"), 0);
    const page = await buildProfileRelationshipsPage(personality, limit, offset);

    return Response.json(page);
  } catch (error) {
    console.error("Profile relationships load failed:", error);
    return Response.json(
      { error: "Could not load relationships." },
      { status: 500 },
    );
  }
}
