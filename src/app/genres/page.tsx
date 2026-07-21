import { Suspense } from "react";
import { getMongoDb } from "@/lib/mongodb";
import { toSafeResult } from "@/lib/safeResult";
import GenresClient from "./GenresClient";

export default async function GenresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const genre = params.q || "";
  let initialResults: ReturnType<typeof toSafeResult>[] = [];

  // Only pre-fetch when a shelf is selected; the bare /genres page is the tile index.
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
      fallback={<div className="empty wrap" style={{ marginTop: 140 }}>OPENING THE SHELVES…</div>}
    >
      <GenresClient
        initialGenre={genre}
        initialResults={initialResults as Parameters<typeof GenresClient>[0]["initialResults"]}
      />
    </Suspense>
  );
}
