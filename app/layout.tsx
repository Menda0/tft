import type { Metadata, Viewport } from "next";
import { Pixelify_Sans, Press_Start_2P } from "next/font/google";

import { BRAND_BG } from "@/lib/brand";
import { siteMetadata } from "@/lib/metadata/site";
import "./globals.css";

const pixelBody = Pixelify_Sans({
  variable: "--font-pixel-body",
  subsets: ["latin"],
  display: "swap",
});

const pixelHeading = Press_Start_2P({
  variable: "--font-pixel-heading",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = siteMetadata;

export const viewport: Viewport = {
  themeColor: BRAND_BG,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${pixelBody.variable} ${pixelHeading.variable} dark h-full`}
    >
      <body className="pixel-app min-h-dvh flex flex-col overscroll-none md:bg-[#0f0f1a]">
        {children}
      </body>
    </html>
  );
}
