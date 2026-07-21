import type { ReactNode } from "react";

/** Brutalist section header: index tag, giant italic title, rule line, right tag. */
export default function SectionHead({
  idx,
  title,
  right,
  as: Tag = "h2",
}: {
  idx?: string;
  title: ReactNode;
  right?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className="shead">
      {idx && <span className="idx">{idx}</span>}
      <Tag>{title}</Tag>
      <span className="line" />
      {right && <span className="idx">{right}</span>}
    </div>
  );
}
