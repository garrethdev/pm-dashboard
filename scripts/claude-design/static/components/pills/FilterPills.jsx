import React from "react";

/* Ported from src/components/ui/filter-pills.tsx: the segmented control. Full
   width on a phone, hugging its content from 640px up, and scrolling sideways
   once the labels stop fitting. Works uncontrolled when no `value` is passed. */

const cx = (...c) => c.filter(Boolean).join(" ");

/** Segmented pill switch. The selected segment is the accent fill. */
export function FilterPills({ options = [], value, defaultValue, onChange, inline = false, className, style }) {
  const [own, setOwn] = React.useState(defaultValue !== undefined ? defaultValue : options[0] && options[0].value);
  const current = value !== undefined ? value : own;
  const pick = (v) => {
    if (value === undefined) setOwn(v);
    if (onChange) onChange(v);
  };
  return (
    <div className={cx("pm-seg", inline ? "pm-seg--inline" : "pm-seg--block", className)} style={style}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => pick(o.value)}
          className={cx("pm-seg__opt", current === o.value && "pm-seg__opt--on")}
        >
          {o.label}
          {o.marked && <span className="pm-seg__mark">•</span>}
        </button>
      ))}
    </div>
  );
}
