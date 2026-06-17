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
        <AntiInspect />
        {children}
      </body>
    </html>
  );
}
