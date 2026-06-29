import type { MetadataRoute } from "next";

import {
  BRAND_BG,
  PROJECT_NAME,
  PROJECT_NAME_BADGE,
  PROJECT_TAGLINE,
} from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PROJECT_NAME,
    short_name: PROJECT_NAME_BADGE,
    description: PROJECT_TAGLINE,
    start_url: "/",
    display: "standalone",
    background_color: BRAND_BG,
    theme_color: BRAND_BG,
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
