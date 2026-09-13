import React from "react";
import { Icon } from "../icon/Icon.jsx";

/* Ported from src/components/ui/search-input.tsx. Works uncontrolled when no
   `value` is passed. */

const cx = (...c) => c.filter(Boolean).join(" ");

/** Inline pill search field with a clear button once there is text. */
export function SearchInput({ value, defaultValue = "", onChange, placeholder = "Search", className, style }) {
  const [own, setOwn] = React.useState(defaultValue);
  const current = value !== undefined ? value : own;
  const set = (v) => {
    if (value === undefined) setOwn(v);
    if (onChange) onChange(v);
  };
  return (
    <div className={cx("pm-search", className)} style={style}>
      <Icon name="Search" size={14} className="pm-search__icon" />
      <input
        value={current}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        className="pm-search__input"
      />
      {current && (
        <button type="button" onClick={() => set("")} title="Clear" className="pm-search__clear">
          <Icon name="X" size={14} />
        </button>
      )}
    </div>
  );
}
