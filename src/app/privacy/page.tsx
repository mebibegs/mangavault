import type { Metadata } from "next";
import VaultShell from "@/components/vault/VaultShell";
import SectionHead from "@/components/vault/SectionHead";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Privacy Policy — MangaVault",
  description: "How MangaVault handles your data — minimal collection, no tracking, no data sales.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy — MangaVault",
    description: "How MangaVault handles your data.",
    url: "/privacy",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "MangaVault Privacy Policy" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy — MangaVault",
    description: "How MangaVault handles your data.",
    images: ["/opengraph-image"],
  },
};

export default function PrivacyPage() {
  return (
    <VaultShell>
      <section className="wrap">
        <SectionHead idx="DOC.05" as="h1" title={<>PRIVACY<br />POLICY</>} right="LAST UPDATED: JUNE 24, 2026" />

        <div className="prose-vault">
          <h3>1. What We Collect</h3>
          <p>MangaVault is designed to collect as little personal data as possible. Specifically:</p>
          <ul>
            <li><strong>Search queries:</strong> We do not store or log your raw search queries. For debugging purposes only, a one-way cryptographic hash of the query may be logged temporarily, which cannot be reversed to reveal what you searched.</li>
            <li><strong>IP addresses:</strong> Your IP address is used transiently for rate limiting and is not permanently stored.</li>
            <li><strong>Cookies:</strong> We use only essential cookies (e.g. age-gate verification for the 18+ section). No analytics or tracking cookies are used.</li>
            <li><strong>localStorage:</strong> Cookie consent preference is stored in your browser&apos;s localStorage.</li>
          </ul>

          <h3>2. How We Use Your Data</h3>
          <p>
            The limited data we process is used exclusively to operate the service — serving search results, enforcing rate limits, and ensuring the site functions correctly. We do not sell, share, or transfer your data to third parties.
          </p>

          <h3>3. Third-Party Services</h3>
          <p>
            MangaVault queries external manga/manhwa databases to provide search results. These requests are made server-side; your browser does not connect to these sources directly. Cloudflare is used for DNS, CDN, and basic web analytics — their privacy policy applies to data they process on our behalf.
          </p>

          <h3>4. Your Rights</h3>
          <p>
            Under GDPR (EU), India IT Rules 2011, and similar legislation, you have the right to access, correct, or delete any personal data we hold. Since we store virtually no personal data, exercising these rights is straightforward. Contact us at <a href="mailto:hello@mangavault.in">hello@mangavault.in</a>.
          </p>

          <h3>5. Changes to This Policy</h3>
          <p>We may update this policy from time to time. Changes will be reflected on this page with an updated date.</p>

          <h3>6. Contact</h3>
          <p>For privacy-related inquiries, email <a href="mailto:hello@mangavault.in">hello@mangavault.in</a>.</p>
        </div>
      </section>
    </VaultShell>
  );
}
