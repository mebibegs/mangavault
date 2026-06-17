export default function AboutPage() {
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
        <h2 className="text-2xl sm:text-3xl font-bold mb-8">About MangaVault</h2>

        <div className="space-y-6 text-text-secondary text-sm sm:text-base leading-relaxed">
          <p>
            MangaVault is a search engine for manga, manhwa, manhua, anime, donghua, and webtoon content. Instead of checking several sites to find one title, you search once — MangaVault queries multiple public sources in parallel, removes duplicate entries, and returns a single ranked list with cover art, ratings, chapter counts, and synopses.
          </p>

          <h3 className="text-lg font-semibold text-white pt-4">How it works</h3>
          <p>
            A search fans out to every connected source at the same time. Results come back, get deduplicated by title, and are ranked by relevance before reaching you — so a query that would normally take several separate searches takes one.
          </p>

          <h3 className="text-lg font-semibold text-white pt-4">Who it&apos;s for</h3>
          <ul className="list-disc list-inside space-y-2 text-text-secondary">
            <li><strong className="text-white">Readers</strong> who want one place to check instead of several before starting something new.</li>
            <li><strong className="text-white">Developers</strong> building search, catalog, or recommendation features who want a single endpoint instead of integrating with each source individually.</li>
            <li><strong className="text-white">Curators</strong> who want one trending feed pulled from multiple sources at once.</li>
          </ul>

          <h3 className="text-lg font-semibold text-white pt-4">The API</h3>
          <p>
            Search and trending data are available through a free, public JSON API at{" "}
            <code className="text-white bg-bg-card px-1.5 py-0.5 rounded text-xs">/api/search</code> and{" "}
            <code className="text-white bg-bg-card px-1.5 py-0.5 rounded text-xs">/api/trending</code>.
            No API key or signup required — just a rate limit of 15 requests per minute per IP to keep the service usable for everyone. Full parameters and live examples are in the <a href="/docs" className="text-white underline hover:text-gray-300">API docs</a>.
          </p>

          <h3 className="text-lg font-semibold text-white pt-4">Status</h3>
          <p>
            MangaVault is in public beta (v1.0.0). Expect occasional source outages or formatting differences as new sources are added — if a result looks off, it usually means a source changed its layout, not that the data is wrong.
          </p>

          <h3 className="text-lg font-semibold text-white pt-4">A note on content</h3>
          <p className="text-text-muted text-sm">
            MangaVault doesn&apos;t host, store, or serve copyrighted images, chapters, or text. It indexes publicly available metadata only, for discovery purposes, and isn&apos;t affiliated with, endorsed by, or connected to any of the sites it searches.
          </p>
        </div>
      </main>

      <footer className="border-t border-border-subtle py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>© {new Date().getFullYear()} MangaVault · v1.0.0</span>
          <div className="flex gap-4">
            <a href="/docs" className="hover:text-white transition-colors">API Docs</a>
            <a href="/" className="hover:text-white transition-colors">Home</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
