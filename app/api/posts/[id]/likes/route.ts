import { ensurePersonalityActivityIndexes } from "@/lib/db/personality-activity";
import { getPostById } from "@/lib/db/posts";
import { buildPostLikers } from "@/lib/feed/build-likes";
import { PAGE_SIZE, parsePositiveInt } from "@/lib/pagination";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await ensurePersonalityActivityIndexes();

    const { id } = await context.params;
    const post = await getPostById(id);

    if (!post) {
      return Response.json({ error: "Post not found." }, { status: 404 });
    }

    const searchParams = new URL(request.url).searchParams;
    const limit = parsePositiveInt(searchParams.get("limit"), PAGE_SIZE);
    const offset = parsePositiveInt(searchParams.get("offset"), 0);
    const { likers, hasMore } = await buildPostLikers(id, limit, offset);

    return Response.json({ likers, hasMore });
  } catch (error) {
    console.error("Post likes load failed:", error);
    return Response.json({ error: "Could not load likes." }, { status: 500 });
  }
}
