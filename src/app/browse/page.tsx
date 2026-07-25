import { Suspense } from "react";
import type { Metadata } from "next";
import BrowseClient from "./BrowseClient";
import { Loader } from "@/components/vault/Loader";

export const metadata: Metadata = {
  title: "Browse the Vault — MangaVault",
  description: "Browse the full MangaVault catalog — manga, manhwa, manhua, and webtoons from every connected source, filterable by genre.",
  alternates: { canonical: "/browse" },
};

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="empty wrap" style={{ marginTop: 140, display: "flex", alignItems: "center", justifyContent: "center" }}><Loader size={48} /></div>}>
      <BrowseClient />
    </Suspense>
  );
}
