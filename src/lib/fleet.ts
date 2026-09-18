import type { DeliveryMode } from "@/lib/data/accounts";

/**
 * Which fleet a person is looking at (Garreth, 2026-09-18).
 *
 * Cloud is the Geelark fleet and the screens exactly as they were before the
 * move to real iPhones began. Physical is the same screens limited to accounts
 * on real phones, plus the pages that only make sense there (Devices, and later
 * the Posting To-Do page and the warmup log).
 *
 * It is a VIEW, held per person in a cookie. It never changes what the
 * scheduler or the Posting Agent does: that is decided per account by
 * `accounts.delivery_mode`, flipped in Settings.
 *
 * No server imports here, so client components can use it.
 */
export type Fleet = "cloud" | "physical";

export const FLEET_COOKIE = "pm_fleet";

export const FLEET_LABEL: Record<Fleet, string> = { cloud: "Cloud", physical: "Physical" };

/** Anything unknown, including no cookie at all, reads as Cloud: the app as it always was. */
export function parseFleet(raw: string | null | undefined): Fleet {
  return raw === "physical" ? "physical" : "cloud";
}

/** The database says geelark / manual; people say Cloud / Physical. */
export function fleetOfDeliveryMode(mode: DeliveryMode): Fleet {
  return mode === "manual" ? "physical" : "cloud";
}

export function deliveryModeOfFleet(fleet: Fleet): DeliveryMode {
  return fleet === "physical" ? "manual" : "geelark";
}

/** Keep only the rows that belong to the fleet being looked at. */
export function inFleet<T extends { deliveryMode: DeliveryMode }>(rows: T[], fleet: Fleet): T[] {
  return rows.filter((r) => fleetOfDeliveryMode(r.deliveryMode) === fleet);
}
