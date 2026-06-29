import { buildLeaderboardPage } from "@/lib/desktop/build-leaderboards";
import { LEADERBOARD_LIMIT, parsePositiveInt } from "@/lib/pagination";
import type { LeaderboardTab } from "@/lib/types/desktop";

const VALID_TABS: LeaderboardTab[] = [
  "clout-personality",
  "clout-farmers",
  "heat-personality",
  "heat-farmers",
];

function parseLeaderboardTab(value: string | null): LeaderboardTab {
  if (value && VALID_TABS.includes(value as LeaderboardTab)) {
    return value as LeaderboardTab;
  }

  return "clout-personality";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tab = parseLeaderboardTab(searchParams.get("tab"));
  const offset = parsePositiveInt(searchParams.get("offset"), 0);
  const limit = Math.max(
    1,
    parsePositiveInt(searchParams.get("limit"), LEADERBOARD_LIMIT),
  );

  try {
    const payload = await buildLeaderboardPage(tab, offset, limit);
    return Response.json(payload);
  } catch (error) {
    console.error("Leaderboards load failed:", error);
    return Response.json(
      { error: "Could not load leaderboards." },
      { status: 500 },
    );
  }
}
