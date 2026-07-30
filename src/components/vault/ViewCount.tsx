"use client";

import { useMemo } from "react";

/**
 * Generate a random view count that is always >= 2M and formatted in decimal.
 * Uses a determin ed seed per title so the count stays stable across renders.
 *
 * Output examples:
 *   2.4M Views
 *   14.8M Views
 *   642.0M Views
 */
function formatViews(raw: number): string {
  if (raw >= 1_000_000_000) {
    return `${(raw / 1_000_000_000).toFixed(1)}B`;
  }
  return `${(raw / 1_000_000).toFixed(1)}M`;
}

export default function ViewCount({ seed }: { seed: string }) {
  const views = useMemo(() => {
    // Simple hash from seed string → stable pseudo-random number
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const positive = Math.abs(hash);
    // Range: 2.0M to ~900M ( random)
    const min = 2_000_000;
    const max = 900_000_000;
    const value = min + (positive % (max - min));
    return formatViews(value);
  }, [seed]);

  return <span className="view-count">{views} Views</span>;
}
