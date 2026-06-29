import { findPublicPersonalityByHandle } from "@/lib/personalities";
import { buildProfilePosts } from "@/lib/profile/build-profile";
import { normalizeHandle } from "@/lib/personalities/validation";
import { PAGE_SIZE, parsePositiveInt } from "@/lib/pagination";
import type { ProfilePostType } from "@/lib/types/profile";

type RouteContext = {
  params: Promise<{ handle: string }>;
};

const VALID_TYPES = new Set<ProfilePostType>(["posts", "replies", "reposts"]);

export async function GET(request: Request, context: RouteContext) {
  try {
    const { handle: rawHandle } = await context.params;
    const handle = normalizeHandle(rawHandle);
    const personality = await findPublicPersonalityByHandle(handle);

    if (!personality) {
      return Response.json({ error: "Profile not found." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const rawType = searchParams.get("type") ?? "posts";
    const type: ProfilePostType = VALID_TYPES.has(rawType as ProfilePostType)
      ? (rawType as ProfilePostType)
      : "posts";
    const limit = parsePositiveInt(searchParams.get("limit"), PAGE_SIZE);
    const offset = parsePositiveInt(searchParams.get("offset"), 0);
    const items = await buildProfilePosts(
      personality.id,
      type,
      limit + 1,
      offset,
    );
    const hasMore = items.length > limit;

    return Response.json({
      items: hasMore ? items.slice(0, limit) : items,
      hasMore,
    });
  } catch (error) {
    console.error("Profile posts load failed:", error);
    return Response.json({ error: "Could not load posts." }, { status: 500 });
  }
}
