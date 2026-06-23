import type { Metadata } from "next";
import type { ReactNode } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.mangavault.in";

export const metadata: Metadata = {
  title: "API Reference — MangaVault",
  description:
    "Free public JSON API for manga, manhwa, and webtoon search. One endpoint to query multiple sources in parallel. No auth required, 30 req/min rate limit.",
  alternates: {
    canonical: `${BASE_URL}/docs`,
  },
  openGraph: {
    title: "MangaVault API Docs",
    description:
      "Search manga across multiple sources with a single API call. Free JSON API, no authentication required.",
    url: `${BASE_URL}/docs`,
  },
  twitter: {
    title: "MangaVault API Docs",
    description:
      "Free manga search API. Query multiple sources in parallel, get deduplicated JSON results.",
  },
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
