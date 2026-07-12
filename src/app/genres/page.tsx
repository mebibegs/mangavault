import { Suspense } from "react";
import { getMongoDb } from "@/lib/mongodb";
import { toSafeResult } from "@/lib/safeResult";
import GenresClient from "./GenresClient";

const DEFAULT_GENRE = "Action";

export default async function GenresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const genre = params.q || DEFAULT_GENRE;
  let initialResults: ReturnType<typeof toSafeResult>[] = [];

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

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-primary flex items-center justify-center">
          <p className="text-text-muted text-sm">Loading genres…</p>
        </div>
      }
    >
      <GenresClient initialGenre={genre} initialResults={initialResults} />
    </Suspense>
  );
}
