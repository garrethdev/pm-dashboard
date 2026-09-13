import React from "react";

/* Ported from src/components/ui/tooltip.tsx. CSS-only hover tooltip. Inside a
   horizontally scrolling table use side="left": a tooltip above its trigger is
   clipped by the scroll container. `open` pins it visible for mocks. */

const cx = (...c) => c.filter(Boolean).join(" ");

/** Hover label in the floating-panel material. */
export function Tooltip({ label, side = "top", open = false, className, style, children }) {
  return (
    <span className={cx("pm-tt", className)} style={style}>
      {children}
      <span
        role="tooltip"
        className={cx("pm-tt__tip", "glass-overlay", side === "left" ? "pm-tt__tip--left" : "pm-tt__tip--top", open && "pm-tt__tip--open")}
      >
        {label}
      </span>
    </span>
  );
}
