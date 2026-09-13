import React from "react";
import { DashCard } from "../surfaces/Card.jsx";

/* Ported from src/components/ui/skeleton.tsx, card-skeleton.tsx and
   table-skeleton.tsx. Table placeholder rows are 36px plus a 4px gap, the same
   40px pitch as a real row, so swapping in the data moves nothing below. */

const cx = (...c) => c.filter(Boolean).join(" ");

/** A pulsing placeholder block. */
export function Skeleton({ width = "100%", height = 16, className, style }) {
  return <div className={cx("pm-skeleton", className)} style={{ width, height, ...style }} />;
}

/** Loading state for a live card: the header renders, the body pulses. */
export function CardSkeleton({ title, lines = 5, className, style }) {
  return (
    <DashCard title={title} className={className} style={style}>
      <div className="pm-skel-lines">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} height={28} />
        ))}
      </div>
    </DashCard>
  );
}

/** Placeholder rows at the real table's pitch. */
export function TableSkeleton({ rows = 8, header = true, className, style }) {
  return (
    <div className={cx("pm-skel-table", className)} style={style}>
      {header && <Skeleton width="66.667%" height={36} />}
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={36} />
      ))}
    </div>
  );
}
