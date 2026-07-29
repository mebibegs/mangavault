import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

/**
 * Hardcoded production URL — never derived from env vars at build time.
 * This prevents Vercel from injecting its deployment URL into canonical,
 * og:url, og:image, and twitter:image meta tags.
 */
const PROD_URL = "https://www.mangavault.in";

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "MangaVault — Ready to read some manga?",
  description:
    "Pick a series and jump straight into the story.",
  metadataBase: new URL(PROD_URL),
  alternates: { canonical: "/" },
  openGraph: {
    title: "MangaVault — Ready to read some manga?",
    description: "Pick a series and jump straight into the story.",
    siteName: "MangaVault",
    type: "website",
    url: PROD_URL,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "MangaVault — Ready to read some manga?" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MangaVault — Ready to read some manga?",
    description: "Pick a series and jump straight into the story.",
    images: ["/opengraph-image"],
  },
  icons: { icon: [{ url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }], apple: "/apple-touch-icon.png" },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-H4E2QSJZQF" />
        <script dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-H4E2QSJZQF');
        ` }} />
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
              url: PROD_URL,
              potentialAction: { "@type": "SearchAction", target: `${PROD_URL}/genres?q={search_term_string}`, "query-input": "required name=search_term_string" },
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
