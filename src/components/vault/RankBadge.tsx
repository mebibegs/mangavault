"use client";

export default function RankBadge({ rank }: { rank: number }) {
  let cls = "wt-rank";
  if (rank === 1) cls += " top1";
  else if (rank === 2) cls += " top2";
  else if (rank === 3) cls += " top3";
  else cls += " top4_10";
  return <span className={cls}>{rank}</span>;
}
