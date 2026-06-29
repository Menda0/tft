import { buildMyLeaderboardEntries } from "@/lib/desktop/build-leaderboards";
import { getAuthUser } from "@/lib/auth/server";
import { authError } from "@/lib/auth/responses";
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
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return authError("You must be logged in to view your leaderboard ranks.", 401);
    }

    const { searchParams } = new URL(request.url);
    const tab = parseLeaderboardTab(searchParams.get("tab"));
    const payload = await buildMyLeaderboardEntries(authUser.id, tab);

    return Response.json(payload);
  } catch (error) {
    console.error("My leaderboard entries load failed:", error);
    return Response.json(
      { error: "Could not load your leaderboard ranks." },
      { status: 500 },
    );
  }
}
