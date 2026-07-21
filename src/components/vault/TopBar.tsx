"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { vaultFlash } from "./VaultFX";

const NAV = [
  { label: "HOME", href: "/" },
  { label: "BROWSE", href: "/browse" },
  { label: "GENRES", href: "/genres" },
  { label: "API", href: "/docs" },
  { label: "18+", href: "/adult" },
];

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !/INPUT|TEXTAREA/.test((document.activeElement as HTMLElement)?.tagName || "")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") { setMenuOpen(false); inputRef.current?.blur(); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = inputRef.current?.value.trim();
    if (!v || v.length < 2) return;
    vaultFlash();
    router.push(`/browse?q=${encodeURIComponent(v)}`);
    inputRef.current?.blur();
  };

  return (
    <>
      <header id="topbar">
        <Link className="logo" href="/">MANGAVAULT<span className="logo-dot">®</span></Link>
        <nav id="nav" aria-label="Primary">
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              data-t={n.label}
              className={`glink${n.label === "18+" ? " adult" : ""}${pathname === n.href ? " on" : ""}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <form id="search" role="search" style={{ marginLeft: "auto" }} onSubmit={submit}>
          <div className={`searchbox${locked ? " lock" : ""}`}>
            <span className="s-ic" aria-hidden="true">⌖</span>
            <input
              id="q"
              ref={inputRef}
              type="text"
              placeholder="SEARCH THE VAULT…  [ / ]"
              autoComplete="off"
              aria-label="Search manga"
              onFocus={() => setLocked(true)}
              onBlur={() => setLocked(false)}
            />
            <button type="submit" className="s-go">GO</button>
          </div>
        </form>
        <button className="menubtn" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
          <span /><span /><span />
        </button>
      </header>

      <div id="menu" className={menuOpen ? "open" : ""}>
        {NAV.map(n => (
          <Link key={n.href} href={n.href} onClick={() => setMenuOpen(false)}>{n.label}</Link>
        ))}
        <button onClick={() => setMenuOpen(false)}>CLOSE ✕</button>
      </div>
    </>
  );
}
