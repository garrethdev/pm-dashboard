import { ACCOUNTS_TAG, TTL, cachedFetcher } from "@/lib/data/cache";
import type { Incident } from "@/lib/data/incidents";
import type { ProxyPhoneData } from "@/lib/data/proxies";
import { sbRest } from "@/lib/data/supabase";
import type { Fleet } from "@/lib/fleet";

/**
 * Things that belong to an account show in the fleet that account lives in
 * (Garreth, 2026-09-18): its proxy, its number, its incidents. This is the one
 * list that decides it: the profiles that are Physical today. Every other
 * profile, including one with no accounts row at all, is Cloud.
 *
 * Tagged with the accounts family, so moving an account in Settings takes
 * effect here straight away.
 */
export const getPhysicalProfiles = cachedFetcher(
  "physical-profiles-v1",
  TTL.supabase,
  async () => {
    const rows = await sbRest<{ geelark_profile: string | null }[]>(
      "accounts?select=geelark_profile&delivery_mode=eq.manual&geelark_profile=not.is.null",
    );
    return rows.map((r) => r.geelark_profile).filter((p): p is string => Boolean(p));
  },
  { tags: [ACCOUNTS_TAG] },
);

const PROFILE_RE = /^Profile \d+$/;

/** The fleet a profile's things belong to. Anything not on a real phone today,
 *  including a profile with no accounts row at all, is Cloud. */
export function fleetOfProfile(profile: string, physical: ReadonlySet<string>): Fleet {
  return physical.has(profile) ? "physical" : "cloud";
}

export function profileInFleet(
  profile: string,
  fleet: Fleet,
  physical: ReadonlySet<string>,
): boolean {
  return fleetOfProfile(profile, physical) === fleet;
}

/**
 * The fleet something is about, or `undefined` when it is about no single
 * account — an n8n workflow, a data feed, a scheduled job, a character running
 * dry. The bell uses this to decide whether an item can name a fleet at all
 * (PF-20); the incident feed uses the same split to decide what to hide.
 */
export function fleetOfEntity(
  entity: string | null | undefined,
  physical: ReadonlySet<string>,
): Fleet | undefined {
  if (!entity || !PROFILE_RE.test(entity)) return undefined;
  return fleetOfProfile(entity, physical);
}

/**
 * Proxies & numbers for one fleet. A row is a Geelark phone with its proxy and
 * number, and it follows the account on that phone. Proxies and numbers tied to
 * no phone (spare proxies, unmatched rentals) stay with Cloud, where the
 * Replace proxy action that draws on them lives.
 *
 * Cloud only since P6 (2026-09-23): the Physical page lists real phones from
 * `proxies-phones.ts` instead, because a real phone's proxy and numbers are
 * recorded on the device, not on a Geelark phone.
 */
export function limitProxyData(
  data: ProxyPhoneData,
  fleet: Fleet,
  physical: ReadonlySet<string>,
): ProxyPhoneData {
  return {
    ...data,
    rows: data.rows.filter((r) => profileInFleet(r.profile, fleet, physical)),
    orphanSubscriptions: fleet === "cloud" ? data.orphanSubscriptions : [],
    unmatchedRentals: fleet === "cloud" ? data.unmatchedRentals : [],
  };
}

/**
 * Incidents for one fleet. An incident about an account ("Profile 31") follows
 * that account. Everything else is about the machinery (an n8n workflow, a data
 * feed, a scheduled job, a character running dry), and today all of that
 * machinery serves the Cloud pipeline, so it stays with Cloud. When Physical
 * gets automations of its own (the morning reminder, the warmup script), their
 * failures belong in Physical.
 */
export function limitIncidents(
  incidents: Incident[],
  fleet: Fleet,
  physical: ReadonlySet<string>,
): Incident[] {
  return incidents.filter((i) =>
    PROFILE_RE.test(i.entity) ? profileInFleet(i.entity, fleet, physical) : fleet === "cloud",
  );
}
