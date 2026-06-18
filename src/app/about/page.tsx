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
            Finding out where a series is being updated, what it&apos;s rated, or whether it&apos;s even still ongoing usually means checking three or four sites and comparing what you find. MangaVault was built to remove that step. It&apos;s a search engine purpose-built for manga, manhwa, manhua, anime, donghua, and webtoon titles: type a name once, and it returns a single, deduplicated list pulled from multiple public sources, complete with cover art, ratings, chapter counts, and a synopsis.
          </p>

          <h3 className="text-lg font-semibold text-white pt-4">How it works</h3>
          <p>
            When you search, MangaVault queries every connected source at the same time rather than one after another. The results that come back are matched against each other so the same title from different sources collapses into a single entry, then the combined list is ranked by relevance before it&apos;s shown to you. The practical effect is that one search here does the work of several searches elsewhere.
          </p>

          <h3 className="text-lg font-semibold text-white pt-4">Who it&apos;s for</h3>
          <ul className="list-disc list-inside space-y-2 text-text-secondary">
            <li><strong className="text-white">Readers</strong> who&apos;d rather check one place than several before deciding what to start next.</li>
            <li><strong className="text-white">Developers</strong> who need search, catalog, or recommendation data and would rather call one endpoint than build and maintain integrations with each source separately.</li>
            <li><strong className="text-white">Curators and community builders</strong> who want a single trending feed that already reflects activity across sources, instead of stitching one together by hand.</li>
          </ul>

          <h3 className="text-lg font-semibold text-white pt-4">The API</h3>
          <p>
            Everything the site itself uses — search and trending data — is exposed as a free, public JSON API at{" "}
            <code className="text-white bg-bg-card px-1.5 py-0.5 rounded text-xs">/api/search</code> and{" "}
            <code className="text-white bg-bg-card px-1.5 py-0.5 rounded text-xs">/api/trending</code>.
            There&apos;s no key or signup involved. The only constraint is a shared rate limit of 15 requests per minute per IP address, which exists to keep response times reasonable for everyone using the service at once. Parameters, response shapes, and worked examples are documented on the <a href="/docs" className="text-white underline hover:text-gray-300">API docs</a> page.
          </p>

          <h3 className="text-lg font-semibold text-white pt-4">Status</h3>
          <p>
            MangaVault is currently in public beta (v1.0.0). Because results are pulled live from external sources, an occasional outage or formatting quirk is expected as those sites change their layouts — if something looks off, it&apos;s almost always a sign that a source updated its page structure, not that the underlying data is wrong. Fixes for these typically follow within a few days of being noticed.
          </p>

          <h3 className="text-lg font-semibold text-white pt-4">A note on content</h3>
          <p className="text-text-muted text-sm">
            MangaVault doesn&apos;t host, store, cache, or serve any copyrighted images, chapters, or full text. What it indexes is metadata — titles, descriptions, chapter counts, ratings — gathered for the purpose of discovery, with links back to the original source for the actual content. MangaVault isn&apos;t affiliated with, endorsed by, or otherwise connected to any of the sites it indexes.
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
