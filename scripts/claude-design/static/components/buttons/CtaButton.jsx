import React from "react";

/* Ported from src/components/ui/cta-button.tsx. In the app a specular streak
   follows the pointer, drawn in WebGL; here the solid pill's rim brightens on
   hover instead. Tone colours live in components.css (.pm-cta--accent, --danger). */

const cx = (...c) => c.filter(Boolean).join(" ");

/** The screen's one primary action. Renders a link when `href` is set. */
export function CtaButton({
  tone = "accent",
  href,
  target,
  rel,
  type = "button",
  disabled = false,
  title,
  onClick,
  className,
  style,
  children,
}) {
  const cls = cx("pm-cta", `pm-cta--${tone}`, className);
  const label = <span className="pm-cta__label">{children}</span>;
  if (href) {
    return (
      <a href={href} target={target} rel={rel} title={title} onClick={onClick} className={cls} style={style}>
        {label}
      </a>
    );
  }
  return (
    <button type={type} disabled={disabled} title={title} onClick={onClick} className={cls} style={style}>
      {label}
    </button>
  );
}
