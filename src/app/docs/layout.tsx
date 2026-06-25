import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "API Reference — MangaVault",
  description:
    "Free public JSON API for manga, manhwa, and webtoon search. One endpoint to query multiple sources in parallel. No auth required, 30 req/min rate limit.",
  alternates: {
    canonical: "/docs",
  },
  openGraph: {
    title: "MangaVault API Docs",
    description:
      "Search manga across multiple sources with a single API call. Free JSON API, no authentication required.",
    url: "/docs",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "MangaVault API Docs" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MangaVault API Docs",
    description:
      "Free manga search API. Query multiple sources in parallel, get deduplicated JSON results.",
    images: ["/opengraph-image"],
  },
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
