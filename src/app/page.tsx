import { Suspense } from "react";
import { browseCatalog } from "@/lib/scraper";
import { toSafeResult } from "@/lib/safeResult";
import HomeClient from "@/components/HomeClient";

/**
 * Server Component — fetches trending data at request time so the first
 * card images are present in the initial HTML.  The browser's preload
 * scanner can discover them immediately instead of waiting for JS hydration.
 *
 * This fixes Issue 3 (LCP image not discoverable in initial document).
 */
export default async function HomePage() {
  let initialTrending: ReturnType<typeof toSafeResult>[] = [];

  try {
    const { results } = await browseCatalog(1);
    initialTrending = results
      .slice(0, 20)
      .map((r) => toSafeResult(r as unknown as Record<string, unknown>));
  } catch {
    // Graceful fallback — client will fetch via /api/trending
  }

  return (
    <Suspense>
      <HomeClient initialTrending={initialTrending} />
    </Suspense>
  );
}
