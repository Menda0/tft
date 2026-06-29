import { findPersonalityByHandle } from "@/lib/personalities";
import { buildProfilePosts } from "@/lib/profile/build-profile";
import { normalizeHandle } from "@/lib/personalities/validation";
import type { ProfilePostType } from "@/lib/types/profile";

type RouteContext = {
  params: Promise<{ handle: string }>;
};

const VALID_TYPES = new Set<ProfilePostType>(["posts", "replies", "reposts"]);

export async function GET(request: Request, context: RouteContext) {
  try {
    const { handle: rawHandle } = await context.params;
    const handle = normalizeHandle(rawHandle);
    const personality = await findPersonalityByHandle(handle);

    if (!personality) {
      return Response.json({ error: "Profile not found." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const rawType = searchParams.get("type") ?? "posts";
    const type: ProfilePostType = VALID_TYPES.has(rawType as ProfilePostType)
      ? (rawType as ProfilePostType)
      : "posts";

    const items = await buildProfilePosts(personality.id, type);

    return Response.json({ items });
  } catch (error) {
    console.error("Profile posts load failed:", error);
    return Response.json({ error: "Could not load posts." }, { status: 500 });
  }
}
