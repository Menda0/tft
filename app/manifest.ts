import type { MetadataRoute } from "next";

import { PROJECT_NAME, PROJECT_TAGLINE } from "@/lib/brand";
import { FAVICON_DIR } from "@/lib/metadata/site";

const MANIFEST_THEME_COLOR = "#283570";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PROJECT_NAME,
    short_name: "TFT",
    description: PROJECT_TAGLINE,
    start_url: "/",
    display: "standalone",
    background_color: MANIFEST_THEME_COLOR,
    theme_color: MANIFEST_THEME_COLOR,
    icons: [
      {
        src: `${FAVICON_DIR}/web-app-manifest-192x192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: `${FAVICON_DIR}/web-app-manifest-512x512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
