import type { Metadata, Viewport } from "next";
import { Pixelify_Sans, Press_Start_2P } from "next/font/google";

import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import {
  GoogleTagManagerBody,
  GoogleTagManagerHead,
} from "@/components/analytics/google-tag-manager";
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
      className={`${pixelBody.variable} ${pixelHeading.variable} dark h-dvh overflow-hidden md:h-auto md:overflow-visible`}
    >
      <head>
        <GoogleTagManagerHead />
      </head>
      <body className="pixel-app flex h-dvh flex-col overflow-hidden overscroll-none md:h-auto md:min-h-dvh md:overflow-visible md:bg-[#0f0f1a]">
        <GoogleTagManagerBody />
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
