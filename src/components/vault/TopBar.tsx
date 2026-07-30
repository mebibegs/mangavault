"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
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
      if (e.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
        inputRef.current?.blur();
      }
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
    inputRef.current?.blur();
  };

  return (
    <>
      <header id="topbar">
        <Link href="/" className="logo" aria-label="MangaVault Home">
          <Image
            src="/mangavault-web-logo.png"
            alt="MangaVault"
            width={130}
            height={28}
            priority
            className="logo-img"
          />
        </Link>

        <nav id="nav" aria-label="Primary">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              data-t={n.label}
              className={`glink${n.label === "18+" ? " adult" : ""}${
                pathname === n.href ? " on" : ""
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="search-trigger"
          aria-label="Search MangaVault"
          onClick={() => setSearchOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
        </button>

        <button
          type="button"
          className="menubtn"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <div id="menu" className={menuOpen ? "open" : ""}>
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setMenuOpen(false)}
          >
            {n.label}
          </Link>
        ))}
        <button onClick={() => setMenuOpen(false)}>CLOSE ✕</button>
      </div>

      {searchOpen && (
        <div className="search-overlay" role="search" aria-label="Search MangaVault">
          <form onSubmit={submit} className="search-overlay-form">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search titles…"
              autoComplete="off"
              aria-label="Search manga"
            />
            <button type="submit" aria-label="Submit search">GO</button>
            <button
              type="button"
              aria-label="Close search"
              onClick={() => setSearchOpen(false)}
            >
              ✕
            </button>
          </form>
        </div>
      )}
    </>
  );
}
