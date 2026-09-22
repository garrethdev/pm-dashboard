import { describe, expect, it } from "vitest";
import {
  DELIVERY_STATUSES,
  isDeliveryStatus,
  isFinished,
} from "@/lib/data/post-deliveries";

/**
 * The two rules in PF-05 that can be checked without a database.
 *
 * Both of them exist twice — once as a check constraint on `post_deliveries`
 * and once here — so the app builds a write the database will accept instead
 * of discovering the rule from a 400. If these ever disagree with the
 * migration, the app is the copy that is wrong.
 */
describe("delivery statuses", () => {
  it("accepts exactly the four the table allows", () => {
    expect([...DELIVERY_STATUSES]).toEqual(["queued", "posted", "failed", "skipped"]);
    for (const s of DELIVERY_STATUSES) expect(isDeliveryStatus(s)).toBe(true);
  });

  it("rejects anything else, including near misses from other screens", () => {
    // `postedNoLink` is a to-do-list display state (a posted row with no link),
    // never a stored status. Storing it would fail the check constraint.
    for (const s of ["postedNoLink", "done", "Posted", "", null, 3]) {
      expect(isDeliveryStatus(s)).toBe(false);
    }
  });
});

describe("finished means it carries a done_at", () => {
  it("is false only for queued", () => {
    expect(isFinished("queued")).toBe(false);
    expect(isFinished("posted")).toBe(true);
    expect(isFinished("failed")).toBe(true);
    expect(isFinished("skipped")).toBe(true);
  });
});
