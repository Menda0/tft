import { buildThreadByPostId } from "@/lib/feed/build-feed";
import { PAGE_SIZE, parsePositiveInt } from "@/lib/pagination";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const limit = parsePositiveInt(searchParams.get("limit"), PAGE_SIZE);
    const offset = parsePositiveInt(searchParams.get("offset"), 0);
    const result = await buildThreadByPostId(id, limit, offset);

    if (!result) {
      return Response.json({ error: "Thread not found." }, { status: 404 });
    }

    return Response.json({
      thread: result.thread,
      hasMore: result.hasMore,
    });
  } catch (error) {
    console.error("Thread load failed:", error);
    return Response.json({ error: "Could not load thread." }, { status: 500 });
  }
}
