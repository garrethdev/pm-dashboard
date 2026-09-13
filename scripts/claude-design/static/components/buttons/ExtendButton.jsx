import React from "react";
import { Icon } from "../icon/Icon.jsx";

/* Ported from src/components/ui/extend-button.tsx. Hands off to a provider's own
   panel to extend a proxy or a phone rental. It repeats per row, which is why it
   is a plain link and not a CtaButton. */

const cx = (...c) => c.filter(Boolean).join(" ");

/** "Extend ↗" link out to a provider panel. */
export function ExtendButton({ href = "#", className, style }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Open the provider's panel to extend this"
      className={cx("pm-extend", className)}
      style={style}
    >
      Extend
      <Icon name="ArrowUpRight" size={12} />
    </a>
  );
}
