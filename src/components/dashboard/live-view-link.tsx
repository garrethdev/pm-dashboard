"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "@/components/ui/icons";

/**
 * The way out to the live view on the MacBook Air (PF-14, P9). A link out in
 * a new tab, never embedded: the page lives on the Air and is reachable over
 * Tailscale only.
 *
 * Three states:
 *  - no address set (`base` null): drawn and inert, as P5 placed it;
 *  - the Air did not answer: inert and reads "Air offline", so the link fails
 *    plainly instead of opening a tab that hangs (P9's unreachable state);
 *  - otherwise a live link, `?phone=<id>` opening that one phone enlarged.
 *
 * The check is one small request to the Air's `/api/health` when the page
 * opens and again when the tab comes back into view. It can only be made when
 * the Air's address is https, as Tailscale's own addresses are: a secure page
 * is not allowed to ask a plain-http address anything. With an http address
 * the link is simply offered unchecked.
 */
export function LiveViewLink({
  base,
  phone,
  className,
}: {
  base: string | null;
  /** The dashboard's id for one phone; omitted for the all-phones page. */
  phone?: string;
  className: string;
}) {
  const down = useAirDown(base);

  if (!base || down) {
    return (
      <button type="button" disabled className={className}>
        {base ? "Air offline" : "Live view"} <ExternalLink className="size-3.5" />
      </button>
    );
  }
  const href = phone ? `${base}/?phone=${encodeURIComponent(phone)}` : `${base}/`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      Live view <ExternalLink className="size-3.5" />
    </a>
  );
}

function useAirDown(base: string | null): boolean {
  const [down, setDown] = useState(false);
  useEffect(() => {
    if (!base) return;
    if (window.location.protocol === "https:" && base.startsWith("http:")) return;
    let current = true;
    const check = () =>
      fetch(`${base}/api/health`, { cache: "no-store", signal: AbortSignal.timeout(4000) })
        .then((res) => current && setDown(!res.ok))
        .catch(() => current && setDown(true));
    const onShow = () => {
      if (document.visibilityState === "visible") check();
    };
    check();
    document.addEventListener("visibilitychange", onShow);
    return () => {
      current = false;
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [base]);
  return down;
}
