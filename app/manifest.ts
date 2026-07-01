import type { MetadataRoute } from "next";

import {
  BRAND_BG,
  PROJECT_NAME,
  PROJECT_NAME_BADGE,
  PROJECT_TAGLINE,
} from "@/lib/brand";
import { SITE_FAVICON_PATH } from "@/lib/metadata/site";

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
        src: SITE_FAVICON_PATH,
        sizes: "1254x1254",
        type: "image/png",
      },
    ],
  };
}
