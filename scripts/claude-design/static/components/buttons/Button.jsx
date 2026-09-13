import React from "react";

/* The secondary and ghost button recipes from docs/DESIGN-TOKENS.md §5. The app
   writes these as class strings inline rather than as one component; this gives
   them a name. */

const cx = (...c) => c.filter(Boolean).join(" ");

/** Everything that is not the screen's one primary action. */
export function Button({ variant = "secondary", href, type = "button", disabled = false, title, onClick, className, style, children }) {
  const cls = cx("pm-button", `pm-button--${variant}`, className);
  if (href) {
    return (
      <a href={href} title={title} onClick={onClick} className={cls} style={style}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} disabled={disabled} title={title} onClick={onClick} className={cls} style={style}>
      {children}
    </button>
  );
}
