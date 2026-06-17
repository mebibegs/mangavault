export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b border-border-subtle bg-bg-secondary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">Manga<span className="text-text-muted">Vault</span></h1>
          </a>
          <a href="/" className="text-xs sm:text-sm text-white bg-bg-card border border-border-bright rounded-lg px-3 py-1.5 hover:bg-bg-hover transition-colors">← Home</a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6">About MangaVault</h2>

        <div className="space-y-6 text-text-secondary text-sm sm:text-base leading-relaxed">
          <p>
            <strong className="text-white">MangaVault</strong> is a unified search engine that lets you discover manga, manhwa, manhua, anime, donghua, and webtoon content across multiple public databases — all in a single query.
          </p>

          <h3 className="text-lg font-semibold text-white mt-8">What It Does</h3>
          <p>
            When you search, MangaVault queries multiple sources simultaneously and aggregates the results. Duplicates are removed, results are ranked by relevance, and you get a clean, consolidated view with cover art, ratings, chapter counts, and descriptions.
          </p>

          <h3 className="text-lg font-semibold text-white mt-8">Who It&apos;s For</h3>
          <ul className="list-disc list-inside space-y-2 text-text-secondary">
            <li><strong className="text-white">Readers</strong> — Find titles quickly without checking multiple sites.</li>
            <li><strong className="text-white">Developers</strong> — Use the free public API to build search, catalog, or recommendation features.</li>
            <li><strong className="text-white">Curators</strong> — Browse trending content aggregated from several sources in one feed.</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-8">Supported Content Types</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            {["Manga", "Manhwa", "Manhua", "Anime", "Donghua", "Webtoon"].map(t => (
              <span key={t} className="text-xs px-3 py-1.5 rounded-full bg-bg-card border border-border-subtle text-text-secondary">{t}</span>
            ))}
          </div>

          <h3 className="text-lg font-semibold text-white mt-8">API</h3>
          <p>
            MangaVault exposes a free, public JSON API at <code className="text-white bg-bg-card px-1.5 py-0.5 rounded text-xs">/api/search</code> and <code className="text-white bg-bg-card px-1.5 py-0.5 rounded text-xs">/api/trending</code>. No authentication required. Rate limited to 15 requests per minute per IP. See <a href="/docs" className="text-white underline hover:text-gray-300">API Docs</a> for details.
          </p>

          <h3 className="text-lg font-semibold text-white mt-8">Current Status</h3>
          <p>
            MangaVault is currently in <strong className="text-white">public beta</strong> (v1.0.0). The service is actively maintained and monitored. Data is aggregated from publicly available sources for discovery purposes only.
          </p>

          <h3 className="text-lg font-semibold text-white mt-8">Disclaimer</h3>
          <p className="text-text-muted text-xs leading-relaxed">
            MangaVault is an independent project and is not affiliated with, endorsed by, or connected to any of the content sources it aggregates. All content metadata (titles, descriptions, cover images, ratings) is publicly available and aggregated solely for search and discovery purposes. MangaVault does not host, store, or distribute any copyrighted content.
          </p>
        </div>
      </main>

      <footer className="border-t border-border-subtle py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>© {new Date().getFullYear()} MangaVault</span>
          <div className="flex gap-4">
            <a href="/docs" className="hover:text-white transition-colors">API Docs</a>
            <a href="/" className="hover:text-white transition-colors">Home</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
