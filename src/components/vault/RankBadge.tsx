"use client";

import { useMemo } from "react";

interface RankBadgeProps {
  rank: number;
  seed: string;
}

/**
 * Generate a stable pseudo-random trend indicator for a ranked item.
 * Returns one of: "up" | "down" | "same" plus the delta number.
 */
function useTrend(seed: string): { direction: "up" | "down" | "same"; delta: number; isNew: boolean } {
  return useMemo(() => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const positive = Math.abs(hash);
    const mod = positive % 10;
    if (mod < 2) return { direction: "same", delta: 0, isNew: false };
    if (mod < 4) return { direction: "up", delta: (positive % 7) + 1, isNew: false };
    if (mod === 4) return { direction: "down", delta: (positive % 5) + 1, isNew: false };
    if (mod === 5) return { direction: "same", delta: 0, isNew: true };
    if (mod < 8) return { direction: "up", delta: (positive % 9) + 1, isNew: false };
    return { direction: "down", delta: (positive % 6) + 1, isNew: false };
  }, [seed]);
}

export default function RankBadge({ rank, seed }: RankBadgeProps) {
  const trend = useTrend(seed);

  return (
    <div className="rank-badge">
      <span className="rank-num">{rank}</span>
      {trend.isNew ? (
        <span className="rank-trend new">NEW</span>
      ) : trend.direction === "up" ? (
        <span className="rank-trend up" title={`Up ${trend.delta}`}>
          ▲{trend.delta}
        </span>
      ) : trend.direction === "down" ? (
        <span className="rank-trend down" title={`Down ${trend.delta}`}>
          ▼{trend.delta}
        </span>
      ) : (
        <span className="rank-trend same" title="No change">
          —
        </span>
      )}
    </div>
  );
}
