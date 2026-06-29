import { buildThreadByPostId } from "@/lib/feed/build-feed";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const thread = await buildThreadByPostId(id);

    if (!thread) {
      return Response.json({ error: "Thread not found." }, { status: 404 });
    }

    return Response.json({ thread });
  } catch (error) {
    console.error("Thread load failed:", error);
    return Response.json({ error: "Could not load thread." }, { status: 500 });
  }
}
