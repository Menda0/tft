import { buildFeedThreads } from "@/lib/feed/build-feed";

export async function GET() {
  try {
    const threads = await buildFeedThreads();

    return Response.json({ threads });
  } catch (error) {
    console.error("Feed load failed:", error);
    return Response.json({ error: "Could not load feed." }, { status: 500 });
  }
}
