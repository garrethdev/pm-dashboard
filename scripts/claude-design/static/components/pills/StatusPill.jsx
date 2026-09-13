import React from "react";

/* Ported from src/components/ui/pill.tsx. One flat ground for every tone; the
   label carries the state. No leading dot: the tone already says it. */

const cx = (...c) => c.filter(Boolean).join(" ");

/** Status label. `critical` is the only solid pill. */
export function StatusPill({ tone = "neutral", className, style, children }) {
  return (
    <span className={cx("pm-pill", `pm-pill--${tone}`, className)} style={style}>
      {children}
    </span>
  );
}
