import type { Metadata } from "next";

import {
  getSiteUrl,
  PROJECT_NAME,
  PROJECT_TAGLINE,
} from "@/lib/brand";

export const FAVICON_DIR = "/favicon";

export const SITE_FAVICON_PATH = `${FAVICON_DIR}/favicon-96x96.png`;

export const siteIcons: Metadata["icons"] = {
  icon: [
    { url: `${FAVICON_DIR}/favicon.ico`, sizes: "any" },
    { url: `${FAVICON_DIR}/favicon.svg`, type: "image/svg+xml" },
    {
      url: SITE_FAVICON_PATH,
      sizes: "96x96",
      type: "image/png",
    },
  ],
  apple: [
    {
      url: `${FAVICON_DIR}/apple-touch-icon.png`,
      sizes: "180x180",
      type: "image/png",
    },
  ],
  shortcut: `${FAVICON_DIR}/favicon.ico`,
};

export const SITE_OG_IMAGE_PATH = "/media.png";

export const siteOgImage = {
  url: SITE_OG_IMAGE_PATH,
  width: 1774,
  height: 887,
  alt: `${PROJECT_NAME} — ${PROJECT_TAGLINE}`,
} as const;

export function buildShareImages(input?: {
  imageUrl?: string | null;
  alt?: string;
}) {
  if (input?.imageUrl) {
    const alt = input.alt ?? PROJECT_NAME;

    return {
      openGraph: [{ url: input.imageUrl, alt }],
      twitter: [input.imageUrl],
    };
  }

  return {
    openGraph: [siteOgImage],
    twitter: [SITE_OG_IMAGE_PATH],
  };
}

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
  icons: siteIcons,
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
