import { ApiTester, EndpointCard } from "@/components/DocsApiTester";

// Force static generation — only the ApiTester component is interactive
export const dynamic = "force-static";

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 bg-bg-card border border-border-subtle rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2">
      <span className="text-[10px] sm:text-xs text-text-muted">{label}:</span>
      <span className="text-[10px] sm:text-xs text-white font-mono">{value}</span>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b border-border-subtle bg-bg-secondary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <a
            href="/"
            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity min-w-0"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 sm:w-5 sm:h-5 text-black"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-base sm:text-xl font-bold tracking-tight truncate">
              Manga<span className="text-text-muted">Vault</span>{" "}
              <span className="text-text-muted text-xs sm:text-sm font-normal ml-1">API Docs</span>
            </span>
          </a>
          <a
            href="/"
            className="text-xs sm:text-sm text-white bg-bg-card border border-border-bright rounded-lg px-2.5 sm:px-3 py-1.5 hover:bg-bg-hover transition-colors flex-shrink-0"
          >
            ← Home
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
        <section className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-3xl font-bold mb-3 sm:mb-4">API Reference</h2>
          <p className="text-text-secondary text-sm sm:text-base max-w-2xl leading-relaxed">
            The MangaVault API searches manga, manhwa, manhua, anime, donghua, and webtoon content
            across multiple sources in a single request. Source queries run in parallel, and results
            are deduplicated and ranked before being returned.
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Badge label="Base URL" value="/api" />
            <Badge label="Format" value="JSON" />
            <Badge label="Auth" value="None" />
            <Badge label="Rate Limit" value="30 req/min" />
          </div>
          <p className="text-text-muted text-xs mt-3">
            Rate limits are enforced per IP at the edge. Limits vary by endpoint: search (10/min),
            trending (30/min), reader (20/min).
          </p>
        </section>

        {/* Interactive API Tester — Client Component */}
        <ApiTester />

        {/* Endpoints — Client Components for expand/collapse */}
        <section className="mb-8 sm:mb-12 space-y-4">
          <h3 className="text-lg sm:text-xl font-bold mb-4">Endpoints</h3>

          <EndpointCard
            method="GET"
            path="/api/search"
            description="Search for manga/manhwa/manhua/anime/donghua/webtoon across multiple sources in parallel."
            params={[
              { name: "q", type: "string", required: true, desc: "Search query (min 2 chars, max 100 chars)" },
            ]}
            example={`GET /api/search?q=solo+leveling\n\n{\n  "success": true,\n  "results": [...],\n  "count": 4,\n  "query": "solo leveling"\n}`}
          />

          <EndpointCard
            method="GET"
            path="/api/trending"
            description="Returns trending titles aggregated across all connected sources, paginated at 30 results per page."
            params={[
              { name: "page", type: "number", required: false, desc: "Page number (1–17), defaults to 1" },
            ]}
            example={`GET /api/trending?page=1\n\n{\n  "success": true,\n  "results": [...],\n  "count": 30,\n  "page": 1,\n  "hasMore": true\n}`}
          />

          <EndpointCard
            method="GET"
            path="/api/reader"
            description="Fetches a chapter page, extracts manga panel images, and returns them as a JSON array of image URLs."
            params={[
              { name: "url", type: "string", required: true, desc: "Chapter URL from a supported source" },
            ]}
            example={`GET /api/reader?url=https://...\n\n{\n  "images": ["https://..."],\n  "count": 42,\n  "source": "https://..."\n}`}
          />

          <EndpointCard
            method="GET"
            path="/api/genres"
            description="Browse titles by genre. Returns titles matching the specified genre."
            params={[
              { name: "q", type: "string", required: true, desc: "Genre name (e.g., Action, Fantasy, Romance)" },
            ]}
            example={`GET /api/genres?q=Action\n\n{\n  "success": true,\n  "results": [...],\n  "count": 30,\n  "genre": "Action"\n}`}
          />
        </section>
      </main>

      <footer className="border-t border-border-subtle py-6">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>© {new Date().getFullYear()} MangaVault</span>
          <div className="flex flex-wrap gap-4">
            <a href="/" className="hover:text-white transition-colors cursor-pointer">
              Home
            </a>
            <a href="/about" className="hover:text-white transition-colors cursor-pointer">
              About
            </a>
            <a href="/privacy" className="hover:text-white transition-colors cursor-pointer">
              Privacy
            </a>
            <a href="/terms" className="hover:text-white transition-colors cursor-pointer">
              Terms
            </a>
            <a href="/dmca" className="hover:text-white transition-colors cursor-pointer">
              DMCA
            </a>
            <a href="mailto:hello@mangavault.in" className="hover:text-white transition-colors cursor-pointer">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
