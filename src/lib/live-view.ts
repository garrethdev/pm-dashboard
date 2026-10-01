/**
 * Where the live view lives (PF-14): a page served from the MacBook Air,
 * reached over Tailscale only, that shows every phone's screen and takes taps.
 * The dashboard links to it and never embeds it. The page itself is in the
 * warmup-runner repository, `live-view/`; the build is tracked in
 * docs/LIVE-VIEW-TRACKER.md.
 *
 * Read on the server from LIVE_VIEW_URL and handed to the page as a prop, like
 * every other setting here (nothing is NEXT_PUBLIC). Unset means the Live view
 * buttons stay drawn but inert, which is the state until the Air serves it.
 */
export function liveViewUrl(): string | null {
  const raw = process.env.LIVE_VIEW_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}
