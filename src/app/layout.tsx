import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import AntiInspect from "@/components/AntiInspect";

export const metadata: Metadata = {
  title: "MangaVault — Universal Search Engine",
  description:
    "Search manga, manhwa, and manhua across multiple sources instantly.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body className="bg-bg-primary text-text-primary antialiased min-h-screen">
        {/* Show warning if JavaScript is disabled */}
        <noscript>
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#0a0a0a",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "20px",
            textAlign: "center"
          }}>
            <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>JavaScript Required</h1>
            <p style={{ color: "#888", maxWidth: "400px" }}>
              This application requires JavaScript to function. 
              Please enable JavaScript in your browser settings and reload the page.
            </p>
          </div>
        </noscript>
        <AntiInspect />
        {children}
      </body>
    </html>
  );
}
