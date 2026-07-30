"use client";

/**
 * Stub for the removed WebGL background engine.
 *
 * The vaultFlash/vaultWipe/vaultShatter helpers used to fire animated
 * transitions driven by the old VaultFX WebGL canvas — that's been removed
 * in the Webtoons-inspired redesign. Keeping these as no-ops so existing
 * imports don't break; callers can be cleaned up incrementally.
 */
export function vaultFlash(): void {
  /* no-op */
}

export function vaultWipe(): void {
  /* no-op */
}

export function vaultShatter(_rect: DOMRect, _src: string): void {
  /* no-op */
}

export default function VaultFX() {
  return null;
}
