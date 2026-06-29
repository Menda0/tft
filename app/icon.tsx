import { ImageResponse } from "next/og";

import { BrandCard } from "@/lib/og/brand-card";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<BrandCard width={32} height={32} variant="icon" />, {
    ...size,
  });
}
