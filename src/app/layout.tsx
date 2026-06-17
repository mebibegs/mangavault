import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import AntiInspect from "@/components/AntiInspect";

export const metadata: Metadata = {
  title: "MangaVault — Search Manga, Manhwa & Webtoons Across Multiple Sources",
  description:
    "Type a title once. MangaVault queries multiple manga, manhwa, and webtoon databases in parallel, deduplicates results, and returns a single ranked list with covers, ratings, and chapter counts.",
  openGraph: {
    title: "MangaVault — One Search, Every Manga Source",
    description: "Stop checking multiple sites. MangaVault runs one query across several manga and manhwa databases simultaneously and merges the results into a clean, ranked feed.",
    siteName: "MangaVault",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "MangaVault",
    description: "Parallel manga search engine. One query, multiple sources, deduplicated results. Free public JSON API at /api/search.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#0a0a0a" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📚</text></svg>" />
      </head>
      <body className="bg-bg-primary text-text-primary antialiased min-h-screen">
        <noscript>
          <div style={{ position: "fixed", inset: 0, backgroundColor: "#0a0a0a", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px", textAlign: "center" }}>
            <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>JavaScript Required</h1>
            <p style={{ color: "#888", maxWidth: "400px" }}>MangaVault is a search engine for manga, manhwa, manhua, anime, donghua, and webtoon content. It searches multiple public sources in parallel and returns a single ranked list. This app requires JavaScript to function — please enable it and reload.</p>
          </div>
        </noscript>
        <AntiInspect />
        {children}
      </body>
    </html>
  );
}
