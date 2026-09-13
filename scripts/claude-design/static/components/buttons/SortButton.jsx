import React from "react";
import { Icon } from "../icon/Icon.jsx";

/* Ported from src/components/ui/sort-button.tsx. Sorters cycle highest first,
   then lowest, then off. */

const cx = (...c) => c.filter(Boolean).join(" ");

/** Column sort toggle. Active sorts wear the accent tint. */
export function SortButton({ label, active = false, dir = "desc", onClick, className, style }) {
  const icon = active ? (dir === "desc" ? "ArrowDown" : "ArrowUp") : "ArrowUpDown";
  const title = active
    ? dir === "desc"
      ? "Highest first, click for lowest"
      : "Lowest first, click to reset"
    : "sort by this column";
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cx("pm-sort", active && "pm-sort--active", className)}
      style={style}
    >
      {label} <Icon name={icon} size={12} className={cx(!active && "pm-sort__icon--idle")} />
    </button>
  );
}
