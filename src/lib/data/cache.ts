import { unstable_cache } from "next/cache";

export type Cached<T> = { data: T; fetchedAt: string };

/**
 * Server-side cache for upstream reads (plan §1: Supabase/n8n 60s, external
 * APIs 15 min). `fetchedAt` is stamped inside the cached payload so every
 * panel can show when its data was actually pulled.
 */
export function cachedFetcher<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): () => Promise<Cached<T>> {
  return unstable_cache(
    async () => ({ data: await fn(), fetchedAt: new Date().toISOString() }),
    [key],
    { revalidate: ttlSeconds, tags: [key] },
  );
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

export const DATA_TAGS = [
  ACCOUNTS_TAG,
  "cadence-data",
  "geelark-phones",
  "geelark-wallet",
  "incidents",
  "inventory-data-v3",
  "n8n-executions",
  "proxycheap-proxies",
  "pulse-stats",
  "scheduler-config",
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
