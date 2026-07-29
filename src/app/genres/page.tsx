import { Suspense } from "react";
import { getMongoDb } from "@/lib/mongodb";
import { toSafeResult } from "@/lib/safeResult";
import GenresClient from "./GenresClient";
import { Loader } from "@/components/vault/Loader";

export default async function GenresPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; q?: string }>;
}) {
  const params = await searchParams;
  const genre = params.genre || "";
  const query = params.q || "";
  let initialResults: ReturnType<typeof toSafeResult>[] = [];

  if (genre) {
    try {
      const db = await getMongoDb();
      if (db) {
        const docs = await db.collection("titles")
          .find({ genres: { $regex: new RegExp(`^${genre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } })
          .sort({ rating: -1, updatedAt: -1 })
          .limit(30)
          .toArray();
        initialResults = docs.map((doc) => toSafeResult(doc as Record<string, unknown>));
      }
    } catch {
      // Client will fetch on its own
    }
  }

  return (
    <Suspense
      fallback={<div className="empty wrap" style={{ marginTop: 140, display: "flex", alignItems: "center", justifyContent: "center" }}><Loader size={48} /></div>}
    >
      <GenresClient
        initialGenre={genre}
        initialQuery={query}
        initialResults={initialResults as Parameters<typeof GenresClient>[0]["initialResults"]}
      />
    </Suspense>
  );
}