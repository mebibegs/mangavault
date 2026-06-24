import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Privacy Policy — MangaVault",
  description:
    "MangaVault privacy policy. Learn how we handle your data, what we collect, and your rights under GDPR and Indian IT Rules.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b border-border-subtle bg-bg-secondary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-black"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight">
              Manga<span className="text-text-muted">Vault</span>
            </span>
          </a>
          <a
            href="/"
            className="text-xs sm:text-sm text-white bg-bg-card border border-border-bright rounded-lg px-3 py-1.5 hover:bg-bg-hover transition-colors"
          >
            ← Home
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold mb-8">Privacy Policy</h2>
        <p className="text-text-muted text-xs mb-6">
          Last updated: June 23, 2026
        </p>

        <div className="space-y-6 text-text-secondary text-sm sm:text-base leading-relaxed">
          <section>
            <h3 className="text-lg font-semibold text-white mb-2">
              1. What We Collect
            </h3>
            <p>
              MangaVault is designed to collect as little personal data as
              possible. Specifically:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-text-secondary">
              <li>
                <strong className="text-white">Search queries:</strong> We do
                not store or log your raw search queries. For debugging purposes
                only, a one-way cryptographic hash of the query may be logged
                temporarily, which cannot be reversed to reveal what you
                searched.
              </li>
              <li>
                <strong className="text-white">IP addresses:</strong> Your IP
                address is used transiently for rate limiting and is not
                permanently stored.
              </li>
              <li>
                <strong className="text-white">Cookies:</strong> We use only
                essential cookies (e.g. age-gate verification for the 18+
                section). No analytics or tracking cookies are used.
              </li>
              <li>
                <strong className="text-white">localStorage:</strong> Cookie
                consent preference is stored in your browser&apos;s localStorage.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-2">
              2. How We Use Your Data
            </h3>
            <p>
              The limited data we process is used exclusively to operate the
              service — serving search results, enforcing rate limits, and
              ensuring the site functions correctly. We do not sell, share, or
              transfer your data to third parties.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-2">
              3. Third-Party Services
            </h3>
            <p>
              MangaVault queries external manga/manhwa databases to provide
              search results. These requests are made server-side; your browser
              does not connect to these sources directly. Cloudflare is used
              for DNS, CDN, and basic web analytics — their privacy policy
              applies to data they process on our behalf.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-2">
              4. Your Rights
            </h3>
            <p>
              Under GDPR (EU), India IT Rules 2011, and similar legislation, you
              have the right to access, correct, or delete any personal data we
              hold. Since we store virtually no personal data, exercising these
              rights is straightforward. Contact us at{" "}
              <a
                href="mailto:hello@mangavault.in"
                className="text-white underline"
              >
                hello@mangavault.in
              </a>
              .
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-2">
              5. Changes to This Policy
            </h3>
            <p>
              We may update this policy from time to time. Changes will be
              reflected on this page with an updated date.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-2">
              6. Contact
            </h3>
            <p>
              For privacy-related inquiries, email{" "}
              <a
                href="mailto:hello@mangavault.in"
                className="text-white underline"
              >
                hello@mangavault.in
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border-subtle py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>© {new Date().getFullYear()} MangaVault</span>
          <div className="flex flex-wrap gap-4">
            <a href="/" className="hover:text-white transition-colors">
              Home
            </a>
            <a href="/terms" className="hover:text-white transition-colors">
              Terms
            </a>
            <a href="/dmca" className="hover:text-white transition-colors">
              DMCA
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
