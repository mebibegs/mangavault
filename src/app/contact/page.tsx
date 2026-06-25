import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Contact — MangaVault",
  description:
    "Get in touch with the MangaVault team. Report bugs, copyright issues, or ask general questions.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact MangaVault",
    description: "Reach out for bug reports, DMCA, or general inquiries.",
    url: "/contact",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Contact MangaVault" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact MangaVault",
    description: "Reach out for bug reports, DMCA, or general inquiries.",
    images: ["/opengraph-image"],
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b border-border-subtle bg-bg-secondary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight">
              Manga<span className="text-text-muted">Vault</span>
            </span>
          </a>
          <a href="/" className="text-xs sm:text-sm text-white bg-bg-card border border-border-bright rounded-lg px-3 py-1.5 hover:bg-bg-hover transition-colors">
            ← Home
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">Contact</h1>
        <p className="text-text-muted text-sm mb-10">
          The best way to reach us is by email. We typically respond within 48 hours.
        </p>

        <div className="space-y-6">
          <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
            <h2 className="text-base font-semibold text-white mb-1">General inquiries</h2>
            <p className="text-text-secondary text-sm mb-3">
              Questions about MangaVault, the API, or suggestions for improvement.
            </p>
            <a
              href="mailto:hello@mangavault.in"
              className="inline-flex items-center gap-2 text-white font-mono text-sm hover:underline"
            >
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              hello@mangavault.in
            </a>
          </div>

          <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
            <h2 className="text-base font-semibold text-white mb-1">Copyright / DMCA</h2>
            <p className="text-text-secondary text-sm mb-3">
              If you are a rights holder and believe your content is being linked to in error, please
              review our takedown procedure before emailing.
            </p>
            <a href="/dmca" className="inline-flex items-center gap-1 text-sm text-white hover:underline">
              DMCA takedown procedure →
            </a>
          </div>

          <div className="bg-bg-card border border-border-subtle rounded-xl p-6">
            <h2 className="text-base font-semibold text-white mb-1">Bug reports</h2>
            <p className="text-text-secondary text-sm">
              Found something broken? Email us with the page URL, a description of what went wrong, and
              (if relevant) a screenshot. We squash bugs fast.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border-subtle py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>© {new Date().getFullYear()} MangaVault</span>
          <div className="flex flex-wrap gap-4">
            <a href="/" className="hover:text-white transition-colors">Home</a>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
            <a href="/dmca" className="hover:text-white transition-colors">DMCA</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
