import { Suspense } from "react";
import { searchAllSources } from "@/lib/scraper";
import { toSafeResult } from "@/lib/safeResult";
import GenresClient from "./GenresClient";

// Default genre to pre-render
const DEFAULT_GENRE = "Action";

/**
 * Server Component — SSR-fetches initial genre data so the page is never blank.
 * The client component takes over after hydration for interactive genre switching.
 */
export default async function GenresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const genre = params.q || DEFAULT_GENRE;
  let initialResults: ReturnType<typeof toSafeResult>[] = [];

  try {
    const results = await searchAllSources(genre);
    initialResults = results
      .filter((r) => r.genres.some((g) => g.toLowerCase().includes(genre.toLowerCase())))
      .slice(0, 30)
      .map((r) => toSafeResult(r as unknown as Record<string, unknown>));

    // If genre filter yields too little, fall back to all results
    if (initialResults.length < 5) {
      initialResults = results
        .slice(0, 30)
        .map((r) => toSafeResult(r as unknown as Record<string, unknown>));
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
