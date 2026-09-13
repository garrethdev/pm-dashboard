import React from "react";
import { Icon } from "../icon/Icon.jsx";

/* Ported from src/components/ui/stale-notice.tsx. Says out loud that what is on
   screen is a remembered copy. A stale calendar is indistinguishable from a
   current one, so serving stale data is only acceptable when it announces
   itself: the age of what is shown and what is therefore missing. */

const cx = (...c) => c.filter(Boolean).join(" ");

/** Warn-toned notice for a panel showing its last good copy. */
export function StaleNotice({ fetchedAt, className, style }) {
  const at = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(fetchedAt ? new Date(fetchedAt) : new Date());
  return (
    <p role="status" className={cx("pm-stale", className)} style={style}>
      <Icon name="CloudOff" size={14} className="pm-stale__icon" />
      <span>
        Supabase is not responding. Showing the last copy from <span className="pm-stale__at">{at} ET</span>. Anything
        posted or scheduled since then is missing. Refresh to try again.
      </span>
    </p>
  );
}
