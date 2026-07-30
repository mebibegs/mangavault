"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_LINKS = [
  { label: "CATEGORIES", href: "/genres" },
  { label: "18+", href: "/adult" },
];

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMenuOpen(false); setSearchOpen(false); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = inputRef.current?.value.trim();
    if (!v || v.length < 2) return;
    router.push(`/genres?q=${encodeURIComponent(v)}`);
    setSearchOpen(false);
  };

  return (
    <>
      <header id="topbar">
        <Link href="/" className="logo" aria-label="MangaVault Home">
          <Image
            src="/mangavault-web-logo.png"
            alt="MangaVault"
            width={110}
            height={24}
            priority
            className="logo-img"
          />
        </Link>

        <nav id="nav" aria-label="Primary">
          {NAV_LINKS.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className={`glink${pathname === n.href ? " on" : ""}${n.label === "18+" ? " adult" : ""}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="search-trigger"
          aria-label="Search"
          onClick={() => setSearchOpen(true)}
          style={{ marginLeft: "auto" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
        </button>

        <button type="button" className="menubtn" aria-label="Menu" onClick={() => setMenuOpen(true)}>
          <span /><span /><span />
        </button>
      </header>

      <div id="menu" className={menuOpen ? "open" : ""}>
        {NAV_LINKS.map((n) => (
          <Link key={n.label} href={n.href} onClick={() => setMenuOpen(false)}>
            {n.label}
          </Link>
        ))}
        <button onClick={() => setMenuOpen(false)}>CLOSE ✕</button>
      </div>

      {searchOpen && (
        <div className="search-overlay" role="search" onClick={() => setSearchOpen(false)}>
          <form onSubmit={submit} className="search-overlay-form" onClick={(e) => e.stopPropagation()}>
            <input ref={inputRef} type="text" placeholder="Search titles…" autoComplete="off" aria-label="Search manga" />
            <button type="submit">GO</button>
            <button type="button" aria-label="Close" onClick={() => setSearchOpen(false)}>✕</button>
          </form>
        </div>
      )}
    </>
  );
}
