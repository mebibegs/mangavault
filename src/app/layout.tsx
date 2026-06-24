import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.mangavault.in";

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "MangaVault — Search Manga, Manhwa & Webtoons Across Multiple Sources",
  description:
    "Type a title once. MangaVault queries multiple manga, manhwa, and webtoon databases in parallel, deduplicates results, and returns a single ranked list with covers, ratings, and chapter counts.",
  metadataBase: new URL(BASE_URL),
  alternates: { canonical: BASE_URL },
  openGraph: {
    title: "MangaVault — One Search, Every Manga Source",
    description:
      "Stop checking multiple sites. MangaVault runs one query across several manga and manhwa databases simultaneously and merges the results into a clean, ranked feed.",
    siteName: "MangaVault",
    type: "website",
    url: BASE_URL,
    images: [{ url: `${BASE_URL}/opengraph-image`, width: 1200, height: 630, alt: "MangaVault — One Search, Every Manga Source" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MangaVault — One Search, Every Manga Source",
    description: "Search manga, manhwa, manhua across multiple sources simultaneously. Deduplicated, ranked results in a single list.",
    images: [`${BASE_URL}/opengraph-image`],
  },
  icons: { icon: [{ url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }], apple: "/apple-touch-icon.png" },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Issue 4: Preconnect to Cloudflare analytics (fixes chain) */}
        <link rel="preconnect" href="https://static.cloudflareinsights.com" />
        <link rel="dns-prefetch" href="https://static.cloudflareinsights.com" />
        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "MangaVault",
              url: BASE_URL,
              potentialAction: { "@type": "SearchAction", target: `${BASE_URL}/?q={search_term_string}`, "query-input": "required name=search_term_string" },
            }),
          }}
        />
      </head>
      <body className="bg-bg-primary text-text-primary antialiased min-h-screen">
        <noscript>
          <div style={{ position: "fixed", inset: 0, backgroundColor: "#0a0a0a", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px", textAlign: "center" }}>
            <p style={{ fontSize: "24px", marginBottom: "16px", fontWeight: "bold" }}>JavaScript Required</p>
            <p style={{ color: "#888", maxWidth: "400px" }}>MangaVault requires JavaScript to function — please enable it and reload.</p>
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}
