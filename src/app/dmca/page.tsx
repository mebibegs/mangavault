import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "DMCA Takedown — MangaVault",
  description:
    "DMCA takedown procedure for MangaVault. Report copyright infringement and request content removal.",
};

export default function DmcaPage() {
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
        <h2 className="text-2xl sm:text-3xl font-bold mb-8">DMCA Takedown Policy</h2>
        <p className="text-text-muted text-xs mb-6">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>

        <div className="space-y-6 text-text-secondary text-sm sm:text-base leading-relaxed">
          <section>
            <h3 className="text-lg font-semibold text-white mb-2">About MangaVault&apos;s Role</h3>
            <p>
              MangaVault is a search aggregator that indexes publicly available metadata (titles, descriptions, ratings, chapter counts) and provides a reader feature that proxies chapter images from their original source CDNs in real time. MangaVault does not permanently host, store, or cache copyrighted content on its own servers.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-2">Filing a Takedown Request</h3>
            <p>If you are a copyright holder or authorized agent and believe that content linked to or proxied through MangaVault infringes your rights, please send a takedown request to:</p>
            <div className="bg-bg-card border border-border-subtle rounded-xl p-4 mt-3">
              <p className="text-white font-mono text-sm">hello@mangavault.in</p>
            </div>
            <p className="mt-3">Your notice should include:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Your name and contact information</li>
              <li>Identification of the copyrighted work(s) you claim are being infringed</li>
              <li>The specific URL(s) on MangaVault where the infringing material is accessible</li>
              <li>A statement that you have a good-faith belief that the use is not authorized</li>
              <li>A statement, under penalty of perjury, that the information in your notice is accurate and that you are authorized to act on behalf of the rights holder</li>
              <li>Your electronic or physical signature</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-2">Response Timeline</h3>
            <p>
              We will review valid takedown requests and respond within 48 hours. Upon receiving a valid notice, we will promptly remove or disable access to the material identified in the notice.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-2">Counter-Notice</h3>
            <p>
              If you believe content was removed in error, you may file a counter-notice with your contact information, identification of the removed material, and a statement under penalty of perjury that the removal was a mistake. Send counter-notices to the same email address above.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border-subtle py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>© {new Date().getFullYear()} MangaVault</span>
          <div className="flex flex-wrap gap-4">
            <a href="/" className="hover:text-white transition-colors">Home</a>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
