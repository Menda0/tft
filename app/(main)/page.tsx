import type { Metadata } from "next";

import { Feed } from "@/components/feed/feed";
import { PROJECT_TAGLINE } from "@/lib/brand";

export const metadata: Metadata = {
  description: PROJECT_TAGLINE,
};

export default function Home() {
  return <Feed />;
}
