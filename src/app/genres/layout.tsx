import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Browse by Genre — MangaVault",
  description:
    "Browse manga, manhwa, and webtoons by genre on MangaVault. Filter by Action, Fantasy, Romance, Comedy, Drama, Sci-Fi, and dozens more categories.",
};

export default function GenresLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
