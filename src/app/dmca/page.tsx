import type { Metadata } from "next";
import VaultShell from "@/components/vault/VaultShell";
import SectionHead from "@/components/vault/SectionHead";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "DMCA Takedown — MangaVault",
  description:
    "DMCA takedown procedure for MangaVault. Report copyright infringement and request content removal.",
  alternates: { canonical: "/dmca" },
  openGraph: {
    title: "DMCA Takedown — MangaVault",
    description: "Copyright takedown procedure. Report infringing content for removal.",
    url: "/dmca",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "MangaVault DMCA Policy" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DMCA Takedown — MangaVault",
    description: "Copyright takedown procedure. Report infringing content for removal.",
    images: ["/opengraph-image"],
  },
};

export default function DmcaPage() {
  return (
    <VaultShell>
      <section className="wrap">
        <SectionHead idx="DOC.03" as="h1" title={<>DMCA<br />TAKEDOWN</>} right="LAST UPDATED: JUNE 24, 2026" />

        <div className="prose-vault">
          <h3>About MangaVault&apos;s Role</h3>
          <p>
            MangaVault is a search aggregator that indexes publicly available metadata (titles, descriptions, ratings, chapter counts) and provides a reader feature that proxies chapter images from their original source CDNs in real time. MangaVault does not permanently host, store, or cache copyrighted content on its own servers.
          </p>

          <h3>Filing a Takedown Request</h3>
          <p>If you are a copyright holder or authorized agent and believe that content linked to or proxied through MangaVault infringes your rights, please send a takedown request to:</p>
          <p><code>hello@mangavault.in</code></p>
          <p>Your notice should include:</p>
          <ul>
            <li>Your name and contact information</li>
            <li>Identification of the copyrighted work(s) you claim are being infringed</li>
            <li>The specific URL(s) on MangaVault where the infringing material is accessible</li>
            <li>A statement that you have a good-faith belief that the use is not authorized</li>
            <li>A statement, under penalty of perjury, that the information in your notice is accurate and that you are authorized to act on behalf of the rights holder</li>
            <li>Your electronic or physical signature</li>
          </ul>

          <h3>Response Timeline</h3>
          <p>
            We will review valid takedown requests and respond within 48 hours. Upon receiving a valid notice, we will promptly remove or disable access to the material identified in the notice.
          </p>

          <h3>Counter-Notice</h3>
          <p>
            If you believe content was removed in error, you may file a counter-notice with your contact information, identification of the removed material, and a statement under penalty of perjury that the removal was a mistake. Send counter-notices to the same email address above.
          </p>
        </div>
      </section>
    </VaultShell>
  );
}
