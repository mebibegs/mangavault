import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "API Docs — MangaVault",
  description:
    "MangaVault API reference. Search manga, manhwa, and manhua across multiple sources in one JSON request. Rate-limited, deduplicated, ranked results.",
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
