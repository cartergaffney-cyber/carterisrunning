import type { Metadata } from "next";
import { Geist_Mono, Josefin_Slab } from "next/font/google";
import { NavBar } from "@/components/layout/NavBar";
import "./globals.css";

/*
 * The style guide specifies Google Fonts <link> tags. next/font/google is used
 * instead: it self-hosts the files at build time, so there's no render-blocking
 * request to fonts.googleapis.com and no flash of fallback serif. The tradeoff
 * is that the family name is hashed rather than literally "Josefin Slab" --
 * which matters for the logo SVG, whose <text> elements would otherwise fall
 * back to serif. See components/brand/Logo.tsx for how that's handled.
 */
const josefinSlab = Josefin_Slab({
  variable: "--font-josefin-slab",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Carter Is Running",
  description: "Training plans, run club matching, and Strava-synced tracking.",
  icons: { icon: "/branding/icon-03-topo-badge.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${josefinSlab.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
