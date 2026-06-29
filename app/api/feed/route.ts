import {
  buildFeedThreads,
  buildThreadingFeedThreads,
} from "@/lib/feed/build-feed";
import type { FeedTab } from "@/lib/feed/client";
import { PAGE_SIZE, parsePositiveInt } from "@/lib/pagination";

function parseFeedTab(value: string | null): FeedTab {
  return value === "all" ? "all" : "threading";
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const tab = parseFeedTab(searchParams.get("tab"));
    const limit = parsePositiveInt(searchParams.get("limit"), PAGE_SIZE);
    const offset = parsePositiveInt(searchParams.get("offset"), 0);
    const threads =
      tab === "all"
        ? await buildFeedThreads(limit + 1, offset)
        : await buildThreadingFeedThreads(limit + 1, offset);
    const hasMore = threads.length > limit;

    return Response.json({
      threads: hasMore ? threads.slice(0, limit) : threads,
      tab,
      hasMore,
    });
  } catch (error) {
    console.error("Feed load failed:", error);
    return Response.json({ error: "Could not load feed." }, { status: 500 });
  }
}
