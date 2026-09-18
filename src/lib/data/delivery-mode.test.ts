import { describe, expect, it } from "vitest";
import { validDeliveryMode } from "./writes";

describe("validDeliveryMode", () => {
  it("accepts the two modes the database allows", () => {
    expect(validDeliveryMode("geelark")).toBe(true);
    expect(validDeliveryMode("manual")).toBe(true);
  });

  it("refuses anything else, so a bad request never reaches the check constraint", () => {
    for (const bad of ["Manual", "real phone", "", " manual", null, undefined, true, 1, {}]) {
      expect(validDeliveryMode(bad)).toBe(false);
    }
  });
});
