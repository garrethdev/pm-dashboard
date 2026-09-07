/**
 * Where the dashboard hands off to a provider's own control panel.
 *
 * The dashboard never extends anything itself. Extending spends money on a card
 * on file, and proxy-cheap has no paid extend endpoint at all — its API exposes
 * only the auto-extend toggle — so the honest button is one that opens the
 * provider's own screen and lets them confirm the charge there.
 *
 * Paths live here rather than inline because both panels are single-page apps
 * that answer any path with the same shell: a wrong path fails silently instead
 * of 404ing, so there is no way to catch one except by clicking it. Correct a
 * path here and every button follows.
 */
export const PROVIDER_LINKS = {
  /**
   * The panel root, which is where the balance is shown.
   *
   * Proven 2026-09-07: proxy-cheap's `?modal=` parameter cannot be opened from
   * outside. Reloading the URL restores the modal, but pasting that same URL
   * into a fresh tab does not — which is per-tab sessionStorage, not the query
   * string. The panel writes modal state into the URL for show and reads it back
   * from storage the reload preserved. No external link can ever open one, so a
   * route is the deepest any of these reach; for Top up that is the page showing
   * the balance. The parameter stays because it is the URL the panel itself
   * produces and costs nothing, not because it does anything.
   */
  proxycheapBilling: "https://app.proxy-cheap.com/?modal=account.billing.topUp",
  /** Their footer's own "Buy Credits" link, `?open=true` and all, so Top up
   *  lands on the card form rather than a page you then have to navigate.
   *  Replaces /app/billing, which was a guess and 404ed (Garreth 2026-09-07). */
  textverifiedBilling: "https://www.textverified.com/app/credits/card?open=true",
  /** The rentals list. Supplied by Garreth 2026-09-07 from the logged-in panel;
   *  it cannot be verified from outside, because TextVerified's Blazor app
   *  redirects every /app path to login before its router runs. */
  textverifiedRentals: "https://www.textverified.com/app/rentals",
} as const;

/**
 * The Extend destination for a proxy row, or null when there is nothing to
 * extend — a proxy GeeLark knows about but proxy-cheap does not was bought
 * elsewhere or already released.
 *
 * Lands on that subscription's own page (URL shape supplied by Garreth
 * 2026-09-07) rather than a list to search through. The `?modal=` parameter is
 * inert from outside the panel — see proxycheapBilling — so the extend modal is
 * opened by hand once there; landing on the right row is the part that carries.
 */
export function proxyExtendHref(row: { subscription: { id: number } | null }): string | null {
  if (!row.subscription) return null;
  return `https://app.proxy-cheap.com/proxies/${row.subscription.id}?modal=proxies.period.extend`;
}

/**
 * The Extend destination for a phone row, or null when no rental matched — a
 * number with no rental behind it has nothing to renew.
 *
 * The rentals list rather than a per-rental modal, which is as deep as this can
 * go: unlike proxy-cheap, TextVerified's panel exposes no URL carrying a rental
 * id, and its Blazor router sits behind a login redirect that makes a guessed
 * path impossible to verify from outside.
 */
export function phoneExtendHref(row: { rental: unknown | null }): string | null {
  return row.rental ? PROVIDER_LINKS.textverifiedRentals : null;
}
