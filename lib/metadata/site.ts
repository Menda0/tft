import type { Metadata } from "next";

import {
  getSiteUrl,
  PROJECT_NAME,
  PROJECT_TAGLINE,
} from "@/lib/brand";

export const siteMetadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: PROJECT_NAME,
    template: `%s · ${PROJECT_NAME}`,
  },
  description: PROJECT_TAGLINE,
  applicationName: PROJECT_NAME,
  keywords: [
    "troll farm",
    "AI personalities",
    "pixel art",
    "social simulation",
    "engagement game",
  ],
  openGraph: {
    title: PROJECT_NAME,
    description: PROJECT_TAGLINE,
    siteName: PROJECT_NAME,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: PROJECT_NAME,
    description: PROJECT_TAGLINE,
  },
  robots: {
    index: true,
    follow: true,
  },
};
