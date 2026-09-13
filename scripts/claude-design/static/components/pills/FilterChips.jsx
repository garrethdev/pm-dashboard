import React from "react";
import { Icon } from "../icon/Icon.jsx";

/* Ported from src/components/ui/filter-chips.tsx. The filters currently applied,
   shown outside the dropdown that set them, because a count badge says how many
   are on but not which. Renders nothing when no filter is on. */

const cx = (...c) => c.filter(Boolean).join(" ");

/** Active-filter chips, each clearing itself, plus "Clear filters". */
export function FilterChips({ chips = [], onClearAll, className, style }) {
  if (chips.length === 0) return null;
  return (
    <div className={cx("pm-chips", className)} style={style}>
      {chips.map((c) => (
        <span key={c.key} className="pm-chip">
          {c.label}
          <button type="button" onClick={c.onClear} aria-label={`Remove ${c.label} filter`} className="pm-chip__x">
            <Icon name="X" size={12} />
          </button>
        </span>
      ))}
      <button type="button" onClick={onClearAll} className="pm-chips__clear">
        Clear filters
      </button>
    </div>
  );
}
