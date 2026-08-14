import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Josefin_Slab } from "next/font/google";
import { NavBar } from "@/components/layout/NavBar";
import "./globals.css";

/*
 * Three faces, each with one job. Josefin Slab is display only -- demoting it
 * off body copy is the readability fix the redesign is built around, since
 * light uppercase slab at 12px was the main complaint.
 *
 * Loaded through next/font/google rather than the <link> tags the brand guide
 * lists: it self-hosts at build time, so there's no render-blocking request to
 * fonts.googleapis.com and no flash of fallback. See components/brand/Logo.tsx
 * for why that matters to the wordmark SVG specifically.
 */
const josefinSlab = Josefin_Slab({
  variable: "--font-josefin-slab",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
      className={`dark ${josefinSlab.variable} ${archivo.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
