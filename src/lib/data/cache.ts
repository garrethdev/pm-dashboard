import { unstable_cache } from "next/cache";

export type Cached<T> = {
  data: T;
  fetchedAt: string;
  /**
   * This is a remembered copy, served because the live read failed. Never set
   * on a normal read. Anything rendering it MUST say so on screen — a silent
   * stale calendar is the exact failure this whole mechanism exists to stop.
   */
  stale?: boolean;
};

/**
 * The last successful payload per live key.
 *
 * Live keys never populate unstable_cache — the bypass path returns the fetch
 * directly — so without this there is nothing to fall back to precisely when
 * it matters. Per server instance and lost on restart, so it covers an outage
 * that starts mid-session, not a cold one; that is worth having and not worth
 * a round trip to store somewhere durable.
 */
const lastGood = new Map<string, Cached<unknown>>();

/** Only live keys are written and they roll daily, so the ceiling is really a
 *  guard against a key set nobody predicted rather than a tuning knob. */
const LAST_GOOD_MAX = 24;

function remember<T>(key: string, value: Cached<T>): void {
  // Delete first so a refreshed key moves to the end and the oldest genuinely
  // falls out of the front.
  lastGood.delete(key);
  lastGood.set(key, value as Cached<unknown>);
  while (lastGood.size > LAST_GOOD_MAX) {
    const oldest = lastGood.keys().next().value;
    if (oldest === undefined) break;
    lastGood.delete(oldest);
  }
}

/**
 * Server-side cache for upstream reads (plan §1: Supabase/n8n 60s, external
 * APIs 15 min). `fetchedAt` is stamped inside the cached payload so every
 * panel can show when its data was actually pulled.
 */
export function cachedFetcher<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
  opts: {
    /** Extra tags alongside the key, so a family of date-keyed entries can be
     *  expired together. Without one, a per-date key is unreachable from the
     *  Refresh button, which only knows a fixed list. */
    tags?: string[];
    /**
     * Read live instead of from the cache, falling back to the cached copy
     * only if the upstream read fails.
     *
     * unstable_cache is stale-while-revalidate: once the TTL passes, the next
     * request is handed the OLD value and only kicks off a refresh behind it.
     * For data that is still being written to, that means whoever looks first
     * after a change always sees the state before it — which on the calendar
     * rendered today as empty for hours after the 06:30 scheduler run and read
     * as "the scheduler never fired" (2026-09-06).
     */
    bypass?: boolean;
  } = {},
): () => Promise<Cached<T>> {
  const stamp = async () => ({ data: await fn(), fetchedAt: new Date().toISOString() });
  const cached = unstable_cache(stamp, [key], {
    revalidate: ttlSeconds,
    tags: [key, ...(opts.tags ?? [])],
  });

  if (!opts.bypass) return cached;

  return async () => {
    try {
      const fresh = await stamp();
      remember(key, fresh);
      return fresh;
    } catch (err) {
      // Reading live means an upstream failure has nowhere to hide. Supabase's
      // REST layer times out independently of the database — seen 2026-09-06,
      // when PostgREST took >120s on a query Postgres answered instantly — and
      // a day that is twenty minutes old and says so beats an error page.
      const remembered = lastGood.get(key) as Cached<T> | undefined;
      if (remembered) return { ...remembered, stale: true };
      // Nothing remembered. unstable_cache may still hold a copy from before
      // this key went live; failing that, the real error is the honest answer.
      try {
        return { ...(await cached()), stale: true };
      } catch {
        throw err;
      }
    }
  };
}

export const TTL = {
  supabase: 60,
  n8n: 60,
  external: 900, // GeeLark / proxy-cheap / TextVerified — 15 min
} as const;

/**
 * Every static cache key, so the Refresh button can expire them on demand
 * instead of waiting out the TTL. Keep in sync with the cachedFetcher() calls —
 * a key missing here just means that panel stays up to 60s stale on refresh.
 */
/** The accounts payload tag. Exported because the pause / post-ban routes must
 *  expire the same key getAccounts() writes — bumping the version in one place
 *  and not the others silently breaks revalidation after a write. */
export const ACCOUNTS_TAG = "accounts-data-v14";

/**
 * The cadence payload tag. Exported for the reason ACCOUNTS_TAG is: the cadence
 * route and the content-type lifecycle route both have to expire the same key
 * `getCadence()` writes, and all three used to spell it out as a literal — so
 * renaming it in one place would have left the cadence editor showing the old
 * lane mix after a save that had already gone through.
 *
 * **v2 (2026-09-12):** `CadenceLane` gained `displayName`. A cache entry written
 * by v1 has no such field, and the lane steppers would have rendered with blank
 * labels until the TTL rolled. Bump this whenever `CadenceData` changes shape.
 */
export const CADENCE_TAG = "cadence-data-v2";

/** The two live-API keys the Replace proxy route must expire, for the same
 *  reason ACCOUNTS_TAG is exported: a write route that hard-codes the string
 *  drifts silently the day the key is renamed, and the table then shows the
 *  old proxy after a successful swap. */
export const GEELARK_PHONES_TAG = "geelark-phones";
export const PROXYCHEAP_PROXIES_TAG = "proxycheap-proxies";

/** The physical-phone family (PF-02): the Devices list, each phone's page, the
 *  accounts that can still be put on a phone, and the phone card on an account
 *  page all carry it, so one expiry after a write reaches every one of them. */
export const DEVICES_TAG = "devices";

/**
 * Shared tags for the caches whose keys carry a date or a range, so Refresh
 * can expire the whole family without enumerating every key it might hold.
 *
 * **A per-range or per-date cache needs one of these or Refresh cannot reach
 * it at all.** The key alone is no use: the Refresh button knows a fixed list
 * of tags and cannot guess which ranges someone has looked at. Four families
 * were missing one until 2026-09-11 — analytics, top content, the inventory
 * rollup and incident history — which is the first half of the review's #5.
 */
export const CALENDAR_TAG = "calendar";
export const CONTENT_TYPES_TAG = "content-types";
export const ANALYTICS_TAG = "analytics";
export const INVENTORY_TAG = "inventory";
export const INCIDENTS_TAG = "incidents";
/** The whole account-analytics family. Sits alongside the per-handle tag from
 *  `accountAnalyticsTag()`: a write about one account expires that handle, and
 *  Refresh expires the lot without having to know which handles exist. */
export const ACCOUNT_ANALYTICS_TAG = "account-analytics";

/**
 * Every tag the Refresh button expires.
 *
 * Keep in sync with the `cachedFetcher()` calls. A key missing from here is not
 * "up to 60s stale" if its family has no tag — it is unreachable, and Refresh
 * silently does nothing for that panel however many times it is pressed.
 */
export const DATA_TAGS = [
  ACCOUNTS_TAG,
  ACCOUNT_ANALYTICS_TAG,
  ANALYTICS_TAG,
  CALENDAR_TAG,
  CONTENT_TYPES_TAG,
  INCIDENTS_TAG,
  INVENTORY_TAG,
  CADENCE_TAG,
  DEVICES_TAG,
  GEELARK_PHONES_TAG,
  "geelark-wallet",
  "inventory-data-v4",
  "n8n-executions",
  "proxycheap-balance",
  PROXYCHEAP_PROXIES_TAG,
  "pulse-stats",
  "scheduler-buckets",
  "scheduler-config",
  "scheduler-content-types",
  "scheduler-effective-config",
  "textverified-balance",
  "textverified-rentals",
] as const;

/** Per-profile detail cache, e.g. accountDetailTag("Profile 20"). */
export function accountDetailTag(profile: string): string {
  return `account-detail-v8:${profile}`;
}

/** Per-profile forensics report cache, e.g. forensicsTag("Profile 45"). */
export function forensicsTag(profile: string): string {
  return `forensics:${profile}`;
}
