import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Terms of Service — MangaVault",
  description:
    "MangaVault terms of service. Rules for using the MangaVault search engine and API.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b border-border-subtle bg-bg-secondary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight">Manga<span className="text-text-muted">Vault</span></span>
          </a>
          <a href="/" className="text-xs sm:text-sm text-white bg-bg-card border border-border-bright rounded-lg px-3 py-1.5 hover:bg-bg-hover transition-colors">← Home</a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold mb-8">Terms of Service</h2>
        <p className="text-text-muted text-xs mb-6">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>

        <div className="space-y-6 text-text-secondary text-sm sm:text-base leading-relaxed">
          <section>
            <h3 className="text-lg font-semibold text-white mb-2">1. Acceptance</h3>
            <p>By using MangaVault, you agree to these terms. If you do not agree, please stop using the service.</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-2">2. Service Description</h3>
            <p>MangaVault is a search aggregator for manga, manhwa, manhua, and webtoon metadata. It queries publicly available sources in parallel and returns merged, deduplicated results. MangaVault does not host copyrighted content.</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-2">3. Age Restriction</h3>
            <p>The adult section (/adult) contains content intended for users aged 18 and above. By accessing that section, you confirm you are of legal age in your jurisdiction.</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-2">4. API Usage</h3>
            <p>The public API is provided as-is with rate limits enforced. Excessive automated usage, scraping of the API itself, or attempting to circumvent rate limits may result in your access being blocked.</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-2">5. Disclaimer</h3>
            <p>MangaVault is provided &ldquo;as is&rdquo; without warranties of any kind. We are not responsible for the accuracy, availability, or legality of content found on external sources. All content is served from and remains on the original source infrastructure.</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-2">6. Intellectual Property</h3>
            <p>All manga, manhwa, and webtoon titles, cover art, and chapter images are the property of their respective creators and publishers. MangaVault claims no ownership over third-party content. If you believe your rights are being infringed, see our <a href="/dmca" className="text-white underline hover:text-gray-300">DMCA page</a>.</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-2">7. Changes</h3>
            <p>We reserve the right to modify these terms at any time. Continued use of MangaVault after changes constitutes acceptance.</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-2">8. Contact</h3>
            <p>Questions about these terms? Email <a href="mailto:hello@mangavault.in" className="text-white underline">hello@mangavault.in</a>.</p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border-subtle py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>© {new Date().getFullYear()} MangaVault</span>
          <div className="flex flex-wrap gap-4">
            <a href="/" className="hover:text-white transition-colors">Home</a>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/dmca" className="hover:text-white transition-colors">DMCA</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
