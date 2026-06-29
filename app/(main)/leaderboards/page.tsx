import type { Metadata } from "next";

import { LeaderboardsPageView } from "@/components/layout/leaderboard-panel";

export const metadata: Metadata = {
  title: "Leaderboards",
  description: "Top personalities and farmers by clout and heat.",
};

export default function LeaderboardsPage() {
  return <LeaderboardsPageView />;
}
