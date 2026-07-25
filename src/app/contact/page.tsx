import type { Metadata } from "next";
import Link from "next/link";
import VaultShell from "@/components/vault/VaultShell";
import SectionHead from "@/components/vault/SectionHead";

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
    <VaultShell>
      <section className="wrap">
        <SectionHead idx="DOC.02" as="h1" title={<>CONTACT<br />THE VAULT</>} right="RESPONSE WITHIN 48H" />

        <p className="prose-vault" style={{ marginBottom: 30 }}>
          The best way to reach us is by email. We typically respond within 48 hours.
        </p>

        <div style={{ display: "grid", gap: 16, maxWidth: 720 }}>
          <div className="vpanel">
            <h2 style={{ margin: "0 0 6px", fontWeight: 900, fontStyle: "italic", fontSize: 18, textTransform: "uppercase" }}>General inquiries</h2>
            <p style={{ margin: "0 0 12px", color: "#aaa", fontSize: 13, lineHeight: 1.7 }}>
              Questions about MangaVault, or suggestions for improvement.
            </p>
            <a href="mailto:hello@mangavault.in" className="btn ghost sm">✉ HELLO@MANGAVAULT.IN</a>
          </div>

          <div className="vpanel">
            <h2 style={{ margin: "0 0 6px", fontWeight: 900, fontStyle: "italic", fontSize: 18, textTransform: "uppercase" }}>Copyright / DMCA</h2>
            <p style={{ margin: "0 0 12px", color: "#aaa", fontSize: 13, lineHeight: 1.7 }}>
              If you are a rights holder and believe your content is being linked to in error, please
              review our takedown procedure before emailing.
            </p>
            <Link href="/dmca" className="btn ghost sm">DMCA TAKEDOWN PROCEDURE →</Link>
          </div>

          <div className="vpanel">
            <h2 style={{ margin: "0 0 6px", fontWeight: 900, fontStyle: "italic", fontSize: 18, textTransform: "uppercase" }}>Bug reports</h2>
            <p style={{ margin: 0, color: "#aaa", fontSize: 13, lineHeight: 1.7 }}>
              Found something broken? Email us with the page URL, a description of what went wrong, and
              (if relevant) a screenshot. We squash bugs fast.
            </p>
          </div>
        </div>
      </section>
    </VaultShell>
  );
}
