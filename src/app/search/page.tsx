import { Suspense } from "react";
import type { Metadata } from "next";
import SearchClient from "./SearchClient";
import { Loader } from "@/components/vault/Loader";

export const metadata: Metadata = {
  title: "Search — MangaVault",
  description: "Search MangaVault across every connected manga, manhwa, manhua, and webtoon source.",
  alternates: { canonical: "/search" },
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="empty wrap" style={{ marginTop: 140, display: "flex", alignItems: "center", justifyContent: "center" }}><Loader size={48} /></div>}>
      <SearchClient />
    </Suspense>
  );
}
