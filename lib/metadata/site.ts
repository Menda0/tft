import type { Metadata } from "next";

import {
  getSiteUrl,
  PROJECT_NAME,
  PROJECT_TAGLINE,
} from "@/lib/brand";

export const SITE_FAVICON_PATH = "/favicon.png";
export const SITE_OG_IMAGE_PATH = "/media.png";

export const siteOgImage = {
  url: SITE_OG_IMAGE_PATH,
  width: 1774,
  height: 887,
  alt: `${PROJECT_NAME} — ${PROJECT_TAGLINE}`,
} as const;

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
  icons: {
    icon: SITE_FAVICON_PATH,
    apple: SITE_FAVICON_PATH,
  },
  openGraph: {
    title: PROJECT_NAME,
    description: PROJECT_TAGLINE,
    siteName: PROJECT_NAME,
    type: "website",
    locale: "en_US",
    images: [siteOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: PROJECT_NAME,
    description: PROJECT_TAGLINE,
    images: [SITE_OG_IMAGE_PATH],
  },
  robots: {
    index: true,
    follow: true,
  },
};
