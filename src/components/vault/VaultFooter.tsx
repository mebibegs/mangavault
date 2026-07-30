import Link from "next/link";

export default function VaultFooter() {
  return (
    <footer className="wfooter">
      <div className="wfooter-inner">
        <div className="wfooter-brand">MangaVault</div>
        <div className="wfooter-grid">
          <div>
            <h4>Explore</h4>
            <Link href="/genres">Categories</Link>
            <Link href="/adult">18+</Link>
          </div>
          <div>
            <h4>Company</h4>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/dmca">DMCA</Link>
          </div>
          <div>
            <h4>Legal</h4>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </div>
      <p className="wfooter-note">
        © {new Date().getFullYear()} MangaVault — One search across every source.
        All titles & artwork belong to their respective creators.
      </p>
    </footer>
  );
}
