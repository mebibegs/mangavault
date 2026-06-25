import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Adult Content — MangaVault (18+)",
  description:
    "Age-restricted adult manga and manhwa section. 18+ only. Age verification required before access.",
  robots: { index: false, follow: false },
  alternates: {
    canonical: "/adult",
  },
  openGraph: {
    title: "MangaVault Adult Section (18+)",
    description: "Age-restricted content. Must be 18+ to access.",
    url: "/adult",
  },
};

export default function AdultLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Preload the chibi girl so it's ready before React renders the age gate */}
      <link rel="preload" href="/images/anime-girl-chibi.png" as="image" />
      {children}
    </>
  );
}
