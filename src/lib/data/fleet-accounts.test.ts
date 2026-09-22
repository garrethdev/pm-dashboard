import { describe, expect, it } from "vitest";
import {
  fleetOfEntity,
  limitIncidents,
  limitProxyData,
  profileInFleet,
} from "@/lib/data/fleet-accounts";
import type { Incident } from "@/lib/data/incidents";
import type { ProxyPhoneData } from "@/lib/data/proxies";

const physical = new Set(["Profile 31"]);

describe("profileInFleet", () => {
  it("puts a profile in exactly one fleet, and unknown profiles in Cloud", () => {
    expect(profileInFleet("Profile 31", "physical", physical)).toBe(true);
    expect(profileInFleet("Profile 31", "cloud", physical)).toBe(false);
    expect(profileInFleet("Profile 999", "cloud", physical)).toBe(true);
    expect(profileInFleet("Profile 999", "physical", physical)).toBe(false);
  });
});

describe("limitIncidents", () => {
  const inc = (entity: string): Incident => ({
    id: entity,
    at: "2026-09-18T00:00:00Z",
    tone: "warn",
    type: "x",
    entity,
    detail: "",
    href: "/",
  });
  const all = [inc("Profile 31"), inc("Profile 20"), inc("Smart Scheduler"), inc("Character 3")];

  it("shows an account's incidents only where the account lives", () => {
    expect(limitIncidents(all, "physical", physical).map((i) => i.entity)).toEqual(["Profile 31"]);
  });

  it("keeps the machinery's incidents with Cloud", () => {
    expect(limitIncidents(all, "cloud", physical).map((i) => i.entity)).toEqual([
      "Profile 20",
      "Smart Scheduler",
      "Character 3",
    ]);
  });
});

describe("limitProxyData", () => {
  const row = (profile: string) => ({ profile }) as ProxyPhoneData["rows"][number];
  const data = {
    rows: [row("Profile 31"), row("Profile 20")],
    orphanSubscriptions: [{ id: 1 }],
    unmatchedRentals: [{ id: "r" }],
    charactersAvailable: true,
    fetchedAt: "x",
  } as unknown as ProxyPhoneData;

  it("moves a phone's proxy and number with its account", () => {
    const p = limitProxyData(data, "physical", physical);
    expect(p.rows.map((r) => r.profile)).toEqual(["Profile 31"]);
    expect(p.orphanSubscriptions).toEqual([]);
    expect(p.unmatchedRentals).toEqual([]);
  });

  it("leaves spare proxies and unmatched numbers with Cloud", () => {
    const c = limitProxyData(data, "cloud", physical);
    expect(c.rows.map((r) => r.profile)).toEqual(["Profile 20"]);
    expect(c.orphanSubscriptions).toHaveLength(1);
    expect(c.unmatchedRentals).toHaveLength(1);
  });
});

describe("fleetOfEntity", () => {
  it("names the fleet an account's things belong to", () => {
    expect(fleetOfEntity("Profile 31", physical)).toBe("physical");
    expect(fleetOfEntity("Profile 20", physical)).toBe("cloud");
  });

  it("names no fleet for anything that is not one account", () => {
    // The bell hangs a pill off this, so a guess here would label an n8n
    // failure as somebody's fleet (PF-20).
    expect(fleetOfEntity("Smart Scheduler", physical)).toBeUndefined();
    expect(fleetOfEntity("Character 3", physical)).toBeUndefined();
    expect(fleetOfEntity("29997", physical)).toBeUndefined();
    expect(fleetOfEntity(null, physical)).toBeUndefined();
    expect(fleetOfEntity(undefined, physical)).toBeUndefined();
  });
});
