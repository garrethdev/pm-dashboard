import { describe, expect, it } from "vitest";
import { fleetHandleFilter } from "@/lib/data/top-posts";
import { deliveryModeOfFleet, fleetOfDeliveryMode, inFleet, parseFleet } from "@/lib/fleet";

describe("parseFleet", () => {
  it("reads Physical only when the cookie says so", () => {
    expect(parseFleet("physical")).toBe("physical");
  });

  it("falls back to Cloud, the app as it always was", () => {
    for (const raw of [undefined, null, "", "cloud", "Physical", "manual", "x"]) {
      expect(parseFleet(raw)).toBe("cloud");
    }
  });
});

describe("fleet and delivery mode", () => {
  it("maps both ways without losing anything", () => {
    expect(fleetOfDeliveryMode("geelark")).toBe("cloud");
    expect(fleetOfDeliveryMode("manual")).toBe("physical");
    expect(deliveryModeOfFleet("cloud")).toBe("geelark");
    expect(deliveryModeOfFleet("physical")).toBe("manual");
  });

  it("shows an account in exactly one fleet", () => {
    const rows = [
      { profile: "Profile 1", deliveryMode: "geelark" as const },
      { profile: "Profile 2", deliveryMode: "manual" as const },
    ];
    expect(inFleet(rows, "cloud").map((r) => r.profile)).toEqual(["Profile 1"]);
    expect(inFleet(rows, "physical").map((r) => r.profile)).toEqual(["Profile 2"]);
  });
});

describe("fleetHandleFilter", () => {
  it("reads nothing for Physical while no account is on a phone", () => {
    expect(fleetHandleFilter("physical", [])).toBeNull();
  });

  it("leaves Cloud unfiltered while no account is on a phone", () => {
    expect(fleetHandleFilter("cloud", [])).toBe("");
  });

  it("splits the same handles both ways, so the fleets add up to the whole", () => {
    expect(fleetHandleFilter("physical", ["maya_journey8", "a.b"])).toBe(
      '&account=in.("maya_journey8","a.b")',
    );
    expect(fleetHandleFilter("cloud", ["maya_journey8", "a.b"])).toBe(
      '&account=not.in.("maya_journey8","a.b")',
    );
  });
});
