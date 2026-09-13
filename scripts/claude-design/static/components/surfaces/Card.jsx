import React from "react";
import { Icon } from "../icon/Icon.jsx";

/* Ported from src/components/ui/card.tsx. Styles live in components/components.css. */

const cx = (...c) => c.filter(Boolean).join(" ");

/** Bare card surface. `glass` borrows the page glow and needs a glow layer
 *  behind it; `hero` is the one-per-page accent gradient; `sunken` recedes
 *  toward the page ground for a card whose content carries the weight. */
export function Card({ hero = false, sunken = false, glass = false, className, style, children }) {
  const surface = hero ? "pm-card--hero" : glass ? "glass" : sunken ? "pm-card--sunken" : "pm-card--default";
  return (
    <div className={cx("pm-card", surface, className)} style={style}>
      {children}
    </div>
  );
}

/** Dashboard section card: a title row carrying the toolbar, actions and the
 *  card's one way out, with the body below. On a phone the title and its exit
 *  share the first line and the controls stack beneath. */
export function DashCard({
  title,
  toolbar,
  actions,
  headerAction,
  viewAllHref,
  sunken = false,
  glass = false,
  className,
  style,
  children,
}) {
  return (
    <Card sunken={sunken} glass={glass} className={cx("pm-dashcard", className)} style={style}>
      <div className="pm-dashcard__head">
        <div className="pm-dashcard__pair">
          <h2 className="pm-dashcard__title">{title}</h2>
          {headerAction && (
            <div className={cx("pm-dashcard__headaction", !actions && "pm-push")}>{headerAction}</div>
          )}
          {viewAllHref && (
            <a href={viewAllHref} className={cx("pm-viewall", !actions && !headerAction && "pm-push")}>
              View all <Icon name="ChevronRight" size={12} />
            </a>
          )}
        </div>
        {toolbar}
        {actions && <div className="pm-dashcard__actions">{actions}</div>}
      </div>
      <div className="pm-dashcard__body">{children}</div>
    </Card>
  );
}
