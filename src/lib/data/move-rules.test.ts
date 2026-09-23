import { describe, expect, it } from "vitest";
import {
  batchMoves,
  batchSummary,
  canTake,
  parseBatchMoves,
  roomBeforeNext,
  planBatch,
  roomLabel,
  tallyPlan,
  targetRefusal,
  type MoveCandidate,
  type MoveTarget,
} from "@/lib/data/move-rules";

const phone = (id: number, held: number, isActive = true): MoveTarget => ({
  id,
  name: `iPhone ${id}`,
  model: "iPhone 12",
  isActive,
  held,
});

const account = (id: number, character = "Character 3"): MoveCandidate => ({
  profile: `Profile ${id}`,
  username: `handle${id}`,
  character,
});

describe("targetRefusal", () => {
  it("lets an account onto a phone with room", () => {
    expect(targetRefusal(phone(1, 2))).toBeNull();
    expect(canTake(phone(1, 2))).toBe(true);
  });

  it("refuses only a phone that is switched off — nothing is ever full", () => {
    // Garreth, 2026-09-22: a phone has no maximum.
    expect(targetRefusal(phone(1, 3))).toBeNull();
    expect(targetRefusal(phone(1, 9))).toBeNull();
    expect(targetRefusal(phone(2, 0, false))).toBe("iPhone 2 is switched off");
  });

  it("offers no room on a phone that is switched off, however empty", () => {
    expect(roomBeforeNext(phone(2, 0, false))).toBe(0);
    expect(roomBeforeNext(phone(2, 0))).toBe(3);
  });

  it("says how many a phone holds, as a count and not a fraction", () => {
    expect(roomLabel(phone(1, 2))).toBe("2 accounts");
    expect(roomLabel(phone(1, 1))).toBe("1 account");
    expect(roomLabel(phone(1, 5))).toBe("5 accounts");
  });
});

describe("planBatch", () => {
  it("fills one phone before starting the next, so a character stays together", () => {
    const plan = planBatch([account(1), account(2), account(3), account(4)], [phone(1, 0), phone(2, 0)]);
    expect(plan.rows.map((r) => r.targetId)).toEqual([1, 1, 1, 2]);
    expect(plan.moving).toBe(4);
    expect(plan.stranded).toBe(0);
    expect(plan.phonesUsed).toBe(2);
  });

  it("tops up a part-full phone before starting the next", () => {
    const plan = planBatch([account(1), account(2)], [phone(1, 2), phone(2, 0)]);
    expect(plan.rows.map((r) => r.targetId)).toEqual([1, 2]);
  });

  it("skips a switched-off phone entirely", () => {
    const plan = planBatch([account(1)], [phone(1, 0, false), phone(2, 0)]);
    expect(plan.rows[0]!.targetId).toBe(2);
  });

  it("keeps going past three a phone rather than stranding anyone", () => {
    // No phone has a maximum, so a batch bigger than the box still lands.
    const plan = planBatch([1, 2, 3, 4].map((n) => account(n)), [phone(1, 2)]);
    expect(plan.rows.map((r) => r.targetId)).toEqual([1, 1, 1, 1]);
    expect(plan.moving).toBe(4);
    expect(plan.stranded).toBe(0);
  });

  it("goes round again once every phone has its usual three", () => {
    const plan = planBatch([1, 2, 3, 4, 5, 6, 7].map((n) => account(n)), [phone(1, 0), phone(2, 0)]);
    expect(plan.rows.map((r) => r.targetId)).toEqual([1, 1, 1, 2, 2, 2, 1]);
  });

  it("strands everything only when no phone is switched on", () => {
    const plan = planBatch([account(1)], [phone(1, 0, false)]);
    expect(plan.moving).toBe(0);
    expect(plan.stranded).toBe(1);
    expect(plan.phonesUsed).toBe(0);
    // The row survives, so the screen shows what is not moving.
    expect(plan.rows).toHaveLength(1);
  });
});

describe("tallyPlan", () => {
  const targets = [phone(1, 2), phone(2, 0), phone(3, 0, false)];

  it("follows a row someone changed by hand", () => {
    const t = tallyPlan([{ account: account(1), targetId: 2 }], targets);
    expect(t.moving).toBe(1);
    expect(t.phonesUsed).toBe(1);
    expect(t.unusable).toEqual([]);
  });

  it("does not complain about piling several onto one phone", () => {
    // iPhone 1 already holds 2; three more is fine now.
    const t = tallyPlan(
      [1, 2, 3].map((n) => ({ account: account(n), targetId: 1 })),
      targets,
    );
    expect(t.unusable).toEqual([]);
    expect(t.moving).toBe(3);
  });

  it("names a switched-off phone somebody chose by hand", () => {
    const t = tallyPlan([{ account: account(1), targetId: 3 }], targets);
    expect(t.unusable.map((p: { name: string }) => p.name)).toEqual(["iPhone 3"]);
  });

  it("counts a row set back to no phone as stranded", () => {
    const t = tallyPlan(
      [
        { account: account(1), targetId: 1 },
        { account: account(2), targetId: null },
      ],
      targets,
    );
    expect(t.moving).toBe(1);
    expect(t.stranded).toBe(1);
  });
});

describe("batchSummary", () => {
  it("says what is moving", () => {
    expect(batchSummary({ moving: 4, stranded: 0, phonesUsed: 2 })).toBe("4 accounts onto 2 phones.");
    expect(batchSummary({ moving: 1, stranded: 0, phonesUsed: 1 })).toBe("1 account onto 1 phone.");
  });

  it("says plainly what is NOT moving", () => {
    // Only a row somebody set to "Not moving" reaches this now.
    expect(batchSummary({ moving: 4, stranded: 2, phonesUsed: 2 })).toBe(
      "4 accounts onto 2 phones. 2 accounts are set to not move.",
    );
    expect(batchSummary({ moving: 3, stranded: 1, phonesUsed: 1 })).toBe(
      "3 accounts onto 1 phone. 1 account is set to not move.",
    );
  });

  it("leads with the problem when no phone is switched on", () => {
    expect(batchSummary({ moving: 0, stranded: 3, phonesUsed: 0 })).toBe(
      "No phone is switched on, so 3 accounts cannot move.",
    );
  });
});

describe("batchMoves", () => {
  it("sends only the rows that are moving, in order", () => {
    const rows = [
      { account: account(1), targetId: 7 },
      { account: account(2), targetId: null },
      { account: account(3), targetId: 8 },
    ];
    expect(batchMoves(rows)).toEqual([
      { profile: "Profile 1", deviceId: 7 },
      { profile: "Profile 3", deviceId: 8 },
    ]);
  });

  it("sends as many as the button counts", () => {
    const plan = planBatch([account(1), account(2), account(3), account(4)], [phone(1, 0)]);
    expect(batchMoves(plan.rows)).toHaveLength(plan.moving);
  });

  it("puts no limit on one phone", () => {
    const rows = [1, 2, 3, 4, 5, 6].map((n) => ({ account: account(n), targetId: 9 }));
    expect(batchMoves(rows)).toHaveLength(6);
  });
});

describe("parseBatchMoves", () => {
  it("accepts a well-formed batch", () => {
    expect(
      parseBatchMoves([
        { profile: "Profile 1", deviceId: 7 },
        { profile: "Profile 2", deviceId: "8" },
      ]),
    ).toEqual({
      moves: [
        { profile: "Profile 1", deviceId: 7 },
        { profile: "Profile 2", deviceId: 8 },
      ],
    });
  });

  it("refuses an empty or missing batch", () => {
    expect(parseBatchMoves([])).toEqual({ error: "No accounts to move." });
    expect(parseBatchMoves(undefined)).toEqual({ error: "No accounts to move." });
  });

  it("refuses something that is not a profile", () => {
    expect(parseBatchMoves([{ profile: "Profile 1; drop", deviceId: 7 }])).toEqual({
      error: "invalid profile",
    });
  });

  it("refuses a row with no phone, naming it", () => {
    expect(parseBatchMoves([{ profile: "Profile 4", deviceId: null }])).toEqual({
      error: "Choose a phone for Profile 4 first.",
    });
  });

  it("refuses the same account twice", () => {
    expect(
      parseBatchMoves([
        { profile: "Profile 4", deviceId: 1 },
        { profile: "Profile 4", deviceId: 2 },
      ]),
    ).toEqual({ error: "Profile 4 is listed more than once." });
  });
});
