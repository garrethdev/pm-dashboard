import React from "react";

/* Ported from src/components/ui/barcode-bar.tsx. The inventory bar: a dark
   rounded track with a fill that only takes on its colour at the leading edge.
   The coloured cap is measured in pixels from the tip, so a short bar, the one
   that most needs to be seen, reads as solid colour instead of shrinking away. */

const cx = (...c) => c.filter(Boolean).join(" ");

/** Progress/inventory bar. `tone` is a semantic state, never decoration. */
export function BarcodeBar({ pct = 0, tone = "accent", className, style }) {
  return (
    <div className={cx("pm-barcode", className)} style={style}>
      <div
        className={cx("pm-barcode__fill", `pm-barcode__fill--${tone}`)}
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
      />
    </div>
  );
}
