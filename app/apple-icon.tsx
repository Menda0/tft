import { ImageResponse } from "next/og";

import { BrandCard } from "@/lib/og/brand-card";
import { loadBrandFonts } from "@/lib/og/fonts";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const fonts = await loadBrandFonts();

  return new ImageResponse(
    <BrandCard width={180} height={180} variant="apple" />,
    {
      ...size,
      fonts,
    },
  );
}
