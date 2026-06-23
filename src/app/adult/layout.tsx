import type { Metadata } from "next";
import type { ReactNode } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.mangavault.in";

export const metadata: Metadata = {
  title: "Adult Content — MangaVault (18+)",
  description:
    "Age-restricted adult manga and manhwa section. 18+ only. Age verification required before access.",
  robots: { index: false, follow: false },
  alternates: {
    canonical: `${BASE_URL}/adult`,
  },
  openGraph: {
    title: "MangaVault Adult Section (18+)",
    description: "Age-restricted content. Must be 18+ to access.",
    url: `${BASE_URL}/adult`,
  },
};

export default function AdultLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
