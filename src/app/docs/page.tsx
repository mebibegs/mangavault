import { ApiTester, EndpointCard } from "@/components/DocsApiTester";
import VaultShell from "@/components/vault/VaultShell";
import SectionHead from "@/components/vault/SectionHead";

// Force static generation — only the ApiTester component is interactive
export const dynamic = "force-static";

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div className="vpanel-line" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px" }}>
      <span style={{ fontSize: 10, color: "#888", letterSpacing: ".18em", textTransform: "uppercase" }}>{label}:</span>
      <span style={{ fontSize: 11, color: "#fff", fontFamily: "monospace" }}>{value}</span>
    </div>
  );
}

export default function DocsPage() {
  return (
    <VaultShell>
      <section className="wrap">
        <SectionHead idx="SEC.05" as="h1" title={<>API<br />REFERENCE</>} right="PUBLIC · JSON · NO AUTH" />

        <div className="prose-vault" style={{ marginBottom: 28 }}>
          <p>
            The MangaVault API searches manga, manhwa, manhua, anime, donghua, and webtoon content
            across multiple sources in a single request. Source queries run in parallel, and results
            are deduplicated and ranked before being returned.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
          <Badge label="Base URL" value="/api" />
          <Badge label="Format" value="JSON" />
          <Badge label="Auth" value="None" />
          <Badge label="Rate Limit" value="30 req/min" />
        </div>
        <p style={{ color: "#555", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 40 }}>
          Rate limits are enforced per IP at the edge. Limits vary by endpoint: search (10/min), trending (30/min), reader (20/min).
        </p>

        <ApiTester />

        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h3 style={{ margin: "0 0 6px", fontWeight: 900, fontStyle: "italic", fontSize: 22, textTransform: "uppercase", borderBottom: "2px solid #fff", paddingBottom: 10 }}>
            Endpoints
          </h3>

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
      </section>
    </VaultShell>
  );
}
