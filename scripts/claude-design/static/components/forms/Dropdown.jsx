import React from "react";
import { Icon } from "../icon/Icon.jsx";

/* Ported from src/components/ui/dropdown.tsx. Click-to-open panel with
   click-outside close. Below 640px the panel centres on the viewport rather than
   hanging off the trigger, so `align` only describes the desktop layout. */

const cx = (...c) => c.filter(Boolean).join(" ");

/** Pill trigger with an optional count badge, opening a floating glass panel. */
export function Dropdown({ label, icon, badge, align = "left", defaultOpen = false, className, panelClassName, children }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [top, setTop] = React.useState(0);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const place = () => {
      if (ref.current) setTop(ref.current.getBoundingClientRect().bottom + 8);
    };
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    place();
    document.addEventListener("mousedown", close);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="pm-dd" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cx("pm-dd__trigger", open && "pm-dd__trigger--open", className)}
      >
        {icon}
        {label}
        {badge != null && badge > 0 && <span className="pm-dd__badge">{badge}</span>}
        <Icon name="ChevronDown" size={14} className="pm-dd__chev" />
      </button>
      {open && (
        <div
          style={{ "--dd-top": top + "px" }}
          className={cx("pm-dd__panel", "glass-overlay", align === "right" ? "pm-dd__panel--right" : "pm-dd__panel--left", panelClassName)}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}
