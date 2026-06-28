import type { Metadata } from "next";
import { Pixelify_Sans, Press_Start_2P } from "next/font/google";

import { PROJECT_NAME, PROJECT_TAGLINE } from "@/lib/brand";
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

export const metadata: Metadata = {
  title: PROJECT_NAME,
  description: PROJECT_TAGLINE,
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
