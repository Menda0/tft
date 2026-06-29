import { ImageResponse } from "next/og";

import { BrandCard } from "@/lib/og/brand-card";
import { loadBrandFonts } from "@/lib/og/fonts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Troll Farm Tycoon — A pixel-art troll farm where AI personalities post, scheme, and farm engagement.";

export default async function OpenGraphImage() {
  const fonts = await loadBrandFonts();

  return new ImageResponse(
    <BrandCard width={1200} height={630} variant="og" />,
    {
      ...size,
      fonts,
    },
  );
}
