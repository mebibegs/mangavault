"use client";

import { useMemo } from "react";

function formatViews(raw: number): string {
  if (raw >= 1_000_000_000) return `${(raw / 1_000_000_000).toFixed(1)}B`;
  if (raw >= 1_000_000) return `${(raw / 1_000_000).toFixed(1)}M`;
  if (raw >= 1_000) return `${(raw / 1_000).toFixed(1)}K`;
  return `${raw}`;
}

export default function ViewCount({ seed }: { seed: string }) {
  const views = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const positive = Math.abs(hash);
    const min = 150_000;
    const max = 900_000_000;
    const value = min + (positive % (max - min));
    return formatViews(value);
  }, [seed]);

  return <span className="wt-views">{views} Views</span>;
}
