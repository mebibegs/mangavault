import Link from "next/link";

export default function VaultFooter() {
  return (
    <footer className="vfooter wrap">
      <span className="f-word outline">MANGAVAULT</span>
      <div className="f-grid">
        <div>ONE SEARCH.<br />EVERY SOURCE.<br />MANGA · MANHWA · MANHUA · WEBTOON</div>
        <div>
          <Link href="/about">ABOUT</Link><br />
          <Link href="/docs">API</Link><br />
          <Link href="/genres">GENRES</Link><br />
          <Link href="/adult">18+ VAULT</Link>
        </div>
        <div>
          <Link href="/dmca">DMCA</Link><br />
          <Link href="/privacy">PRIVACY</Link><br />
          <Link href="/terms">TERMS</Link><br />
          <Link href="/contact">CONTACT</Link>
        </div>
      </div>
      <p className="f-note">
        © {new Date().getFullYear()} MANGAVAULT — ONE SEARCH ACROSS EVERY SOURCE.
        ALL TITLES &amp; ARTWORK BELONG TO THEIR RESPECTIVE CREATORS.
        PRESS &ldquo;/&rdquo; TO TARGET THE SEARCH BAR.
      </p>
    </footer>
  );
}
