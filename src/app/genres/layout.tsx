import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Browse by Genre — MangaVault",
  description:
    "Browse manga, manhwa, and webtoons by genre on MangaVault. Filter by Action, Fantasy, Romance, Comedy, Drama, Sci-Fi, and dozens more categories.",
  alternates: { canonical: "/genres" },
  openGraph: {
    title: "Browse Manga by Genre — MangaVault",
    description:
      "Explore manga, manhwa, and webtoon titles by genre: Action, Fantasy, Romance, Comedy, Drama, Sci-Fi, and 80+ more.",
    url: "/genres",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "MangaVault — Browse by Genre" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse Manga by Genre — MangaVault",
    description: "Filter manga, manhwa, and webtoon titles by genre.",
    images: ["/opengraph-image"],
  },
};

export default function GenresLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
