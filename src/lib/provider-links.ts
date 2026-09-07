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
  proxycheapBilling: "https://app.proxy-cheap.com/billing",
  textverifiedBilling: "https://www.textverified.com/app/billing",
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
 * Deep-links straight to that subscription's extend modal (URL shape supplied
 * by Garreth 2026-09-07), so the button lands on the decision rather than on a
 * list the user then has to search.
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
