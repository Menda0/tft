import {
  buildFeedThreads,
  buildThreadingFeedThreads,
} from "@/lib/feed/build-feed";
import type { FeedTab } from "@/lib/feed/client";

function parseFeedTab(value: string | null): FeedTab {
  return value === "all" ? "all" : "threading";
}

export async function GET(request: Request) {
  try {
    const tab = parseFeedTab(new URL(request.url).searchParams.get("tab"));
    const threads =
      tab === "all" ? await buildFeedThreads() : await buildThreadingFeedThreads();

    return Response.json({ threads, tab });
  } catch (error) {
    console.error("Feed load failed:", error);
    return Response.json({ error: "Could not load feed." }, { status: 500 });
  }
}
