import type { Metadata } from "next";
import Link from "next/link";
import VaultShell from "@/components/vault/VaultShell";
import SectionHead from "@/components/vault/SectionHead";

// Force static generation at build time
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "About MangaVault — Your Friendly Manga Reader",
  description:
    "Hey! Welcome to MangaVault. Search and read manga, manhwa, and webtoons whenever you want — no complicated stuff, just find what you're in the mood for and start reading.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About MangaVault",
    description: "Hey! Welcome to MangaVault — your simple, friendly place to read manga, manhwa, and webtoons.",
    url: "/about",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "About MangaVault" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "About MangaVault",
    description: "Hey! Welcome to MangaVault — your simple, friendly place to read manga, manhwa, and webtoons.",
    images: ["/opengraph-image"],
  },
};

export default function AboutPage() {
  return (
    <VaultShell>
      <section className="wrap">
        <SectionHead idx="DOC.01" as="h1" title={<>ABOUT<br />THE VAULT</>} right="ONE SEARCH · EVERY SOURCE" />

        <div className="prose-vault">
          <p>
            Hey! Welcome to MangaVault. This is where you come to search and read manga, manhwa, and webtoons whenever you want. No complicated stuff — just find what you&apos;re in the mood for and start reading.
          </p>

          <h3>Who we are</h3>
          <p>
            Hey there! MangaVault is your simple, friendly place to read manga, manhwa, and webtoons. Whether you&apos;re starting something brand new or catching up on a series you love, everything is right here waiting for you. Take a look around, pick what looks good, and enjoy the story.
          </p>

          <h3>How it works</h3>
          <p>
            When you search, MangaVault queries every connected source at the same time rather than one after another. The results that come back are matched against each other so the same title from different sources collapses into a single entry, then the combined list is ranked by relevance before it&apos;s shown to you. The practical effect is that one search here does the work of several searches elsewhere.
          </p>

          <h3>Who it&apos;s for</h3>
          <ul>
            <li><strong>Readers</strong> who&apos;d rather check one place than several before deciding what to start next.</li>
            <li><strong>Developers</strong> who need search, catalog, or recommendation data and would rather call one endpoint than build and maintain integrations with each source separately.</li>
            <li><strong>Curators and community builders</strong> who want a single trending feed that already reflects activity across sources, instead of stitching one together by hand.</li>
          </ul>

          <h3>Status</h3>
          <p>
            Because results are pulled live from external sources, an occasional outage or formatting quirk is expected as those sites change their layouts — if something looks off, it&apos;s almost always a sign that a source updated its page structure, not that the underlying data is wrong. Fixes for these typically follow within a few days of being noticed.
          </p>

          <h3>A note on content</h3>
          <p>
            MangaVault indexes publicly available metadata — titles, descriptions, chapter counts, ratings, and cover thumbnails — for the purpose of discovery. Search metadata (titles, chapter counts, ratings) may be temporarily cached for performance, but copyrighted chapter images are never stored on MangaVault servers. The built-in reader feature proxies chapter images from their original source CDNs in real time; all content remains on and is served from the original source infrastructure.
          </p>
          <p>
            MangaVault is not affiliated with, endorsed by, or otherwise connected to any of the sites it indexes. If you are a rights holder and believe your content is being linked to in error, please use our <Link href="/dmca">DMCA takedown procedure</Link> to request removal.
          </p>
        </div>
      </section>
    </VaultShell>
  );
}
