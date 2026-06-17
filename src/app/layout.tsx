import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import AntiInspect from "@/components/AntiInspect";

export const metadata: Metadata = {
  title: "MangaVault — Search Manga, Manhwa & Webtoons Across Multiple Sources",
  description:
    "Search manga, manhwa, manhua, anime, donghua, and webtoons across multiple databases simultaneously. A unified discovery engine for fans and a fast public API for developers.",
  openGraph: {
    title: "MangaVault — Universal Manga & Manhwa Search",
    description: "Search across multiple sources in one place. Free public API included.",
    siteName: "MangaVault",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MangaVault — Universal Search Engine",
    description: "Search manga, manhwa & webtoons across multiple sources.",
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
            <p style={{ color: "#888", maxWidth: "400px" }}>This application requires JavaScript to function. Please enable JavaScript in your browser settings and reload the page.</p>
          </div>
        </noscript>
        <AntiInspect />
        {children}
      </body>
    </html>
  );
}
