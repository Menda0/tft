import type { Metadata } from "next";

import { RankNpcsAdminList } from "@/components/admin/rank-npcs-list";

export const metadata: Metadata = {
  title: "Admin · Rank NPCs",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminRankNpcsPage() {
  return <RankNpcsAdminList />;
}
