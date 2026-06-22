import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Adult — MangaVault (18+)",
  description:
    "Browse adult manga and manhwa titles on MangaVault. Age verification required. 18+ content only.",
  robots: { index: false, follow: false },
};

export default function AdultLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
