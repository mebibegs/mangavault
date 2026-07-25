import type { Metadata } from "next";
import Link from "next/link";
import VaultShell from "@/components/vault/VaultShell";
import SectionHead from "@/components/vault/SectionHead";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Terms of Service — MangaVault",
  description: "Terms of service for using MangaVault's search aggregator.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service — MangaVault",
    description: "Terms of service for using MangaVault.",
    url: "/terms",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "MangaVault Terms of Service" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service — MangaVault",
    description: "Terms of service for using MangaVault.",
    images: ["/opengraph-image"],
  },
};

export default function TermsPage() {
  return (
    <VaultShell>
      <section className="wrap">
        <SectionHead idx="DOC.04" as="h1" title={<>TERMS OF<br />SERVICE</>} right="LAST UPDATED: JUNE 24, 2026" />

        <div className="prose-vault">
          <h3>1. Acceptance</h3>
          <p>By using MangaVault, you agree to these terms. If you do not agree, please stop using the service.</p>

          <h3>2. Service Description</h3>
          <p>MangaVault is a search aggregator for manga, manhwa, manhua, and webtoon metadata. It queries publicly available sources in parallel and returns merged, deduplicated results. MangaVault does not host copyrighted content.</p>

          <h3>3. Age Restriction</h3>
          <p>The adult section (/adult) contains content intended for users aged 18 and above. By accessing that section, you confirm you are of legal age in your jurisdiction.</p>

          <h3>4. Disclaimer</h3>
          <p>MangaVault is provided &ldquo;as is&rdquo; without warranties of any kind. We are not responsible for the accuracy, availability, or legality of content found on external sources. All content is served from and remains on the original source infrastructure.</p>

          <h3>5. Intellectual Property</h3>
          <p>All manga, manhwa, and webtoon titles, cover art, and chapter images are the property of their respective creators and publishers. MangaVault claims no ownership over third-party content. If you believe your rights are being infringed, see our <Link href="/dmca">DMCA page</Link>.</p>

          <h3>7. Changes</h3>
          <p>We reserve the right to modify these terms at any time. Continued use of MangaVault after changes constitutes acceptance.</p>

          <h3>8. Contact</h3>
          <p>Questions about these terms? Email <a href="mailto:hello@mangavault.in">hello@mangavault.in</a>.</p>
        </div>
      </section>
    </VaultShell>
  );
}
