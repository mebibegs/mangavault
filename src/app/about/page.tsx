import type { Metadata } from "next";

const BASE_URL = "https://www.mangavault.in";

// Force static generation at build time
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "About MangaVault — How It Works",
  description:
    "Learn how MangaVault searches manga, manhwa, and webtoon sources in parallel and returns deduplicated results in a single ranked feed.",
  alternates: {
    canonical: `${BASE_URL}/about`,
  },
  openGraph: {
    title: "About MangaVault",
    description:
      "How parallel manga search works — one query, multiple sources, deduplicated results.",
    url: `${BASE_URL}/about`,
  },
  twitter: {
    title: "About MangaVault",
    description:
      "Learn how MangaVault queries multiple manga databases simultaneously.",
  },
};

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
            Everything the site itself uses — search, trending, and chapter image extraction — is exposed through a public JSON API. If you want to integrate MangaVault into your own tooling or app, the available endpoints are documented in the <a href="/docs" className="text-white underline hover:text-gray-300">API docs</a>.
          </p>

          <h3 className="text-lg font-semibold text-white pt-4">Status</h3>
          <p>
            Because results are pulled live from external sources, an occasional outage or formatting quirk is expected as those sites change their layouts — if something looks off, it&apos;s almost always a sign that a source updated its page structure, not that the underlying data is wrong. Fixes for these typically follow within a few days of being noticed.
          </p>

          <h3 className="text-lg font-semibold text-white pt-4">A note on content</h3>
          <p className="text-text-muted text-sm">
            MangaVault indexes publicly available metadata — titles, descriptions, chapter counts, ratings, and cover thumbnails — for the purpose of discovery. Search metadata (titles, chapter counts, ratings) may be temporarily cached for performance, but copyrighted chapter images are never stored on MangaVault servers. The built-in reader feature proxies chapter images from their original source CDNs in real time; all content remains on and is served from the original source infrastructure.
          </p>
          <p className="text-text-muted text-sm">
            MangaVault is not affiliated with, endorsed by, or otherwise connected to any of the sites it indexes. If you are a rights holder and believe your content is being linked to in error, please use our <a href="/dmca" className="text-white underline hover:text-gray-300">DMCA takedown procedure</a> to request removal.
          </p>
        </div>
      </main>

      <footer className="border-t border-border-subtle py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>© {new Date().getFullYear()} MangaVault</span>
          <div className="flex gap-4">
            <a href="/" className="hover:text-white transition-colors">Home</a>
            <a href="/docs" className="hover:text-white transition-colors">API Docs</a>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
            <a href="/dmca" className="hover:text-white transition-colors">DMCA</a>
            <a href="mailto:hello@mangavault.in" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
