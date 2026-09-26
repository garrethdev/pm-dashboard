import { describe, expect, it } from "vitest";
import type { BatchSummary } from "@/server/carousel/repo/types";
import { batchWords } from "./status-words";

const base = (patch: Partial<BatchSummary> & { counts?: Partial<BatchSummary["counts"]> }): BatchSummary => ({
  id: "b1",
  typeId: "glowup",
  typeName: "Glow Up",
  character: "Character 2",
  slides: 7,
  size: "3:4",
  batchName: "glowup-2026-09-25-a",
  requested: 20,
  lifecycle: "open",
  phase: "generating",
  mode: "manual",
  madeInAuto: false,
  revision: 1,
  rerunOf: null,
  note: null,
  createdBy: null,
  createdAt: "2026-09-25T10:00:00Z",
  updatedAt: "2026-09-25T10:00:00Z",
  lastMovementAt: new Date().toISOString(),
  renderRequestedAt: null,
  approvedAt: null,
  finishedAt: null,
  ...patch,
  counts: { requested: 20, decks: 20, pending: 0, writing: 0, written: 0, rendering: 0, rendered: 0, approved: 0, flagged: 0, dropped: 0, failed: 0, discarded: 0, ...(patch.counts ?? {}) },
});

describe("DEV-61: what a batch is waiting for", () => {
  it("reads Writing n of N while decks are still to be written", () => {
    const w = batchWords(base({ counts: { pending: 13, written: 7 } }));
    expect(w.label).toBe("Writing 7 of 20");
    expect(w.running).toBe(true);
    expect(w.needsPerson).toBe(false);
  });
  it("counts unaccounted decks as still to write", () => {
    expect(batchWords(base({ counts: { decks: 5, written: 5 } })).label).toBe("Writing 5 of 20");
  });
  it("reads (n) to render once written and nothing rendered, in manual", () => {
    const w = batchWords(base({ counts: { written: 18, flagged: 2 } }));
    expect(w.label).toBe("18 to render");
    expect(w.needsPerson).toBe(true);
    expect(w.running).toBe(false);
    expect(w.aside).toBe("2 flagged");
  });
  it("never asks for Render in Auto", () => {
    const w = batchWords(base({ mode: "auto", madeInAuto: true, counts: { written: 18, flagged: 2 } }));
    expect(w.label).not.toContain("to render");
    expect(w.running).toBe(true);
  });
  it("reads Rendering n of M while the painter owes decks", () => {
    const w = batchWords(base({ counts: { written: 18, rendering: 6, rendered: 12 }, renderRequestedAt: "2026-09-25T11:00:00Z" }));
    expect(w.label).toBe("Rendering 12 of 18");
  });
  it("reads (n) to approve when rendered and nothing approved; a blank and a nought mean the same", () => {
    const w = batchWords(base({ counts: { written: 18, rendered: 18, dropped: 2 }, renderRequestedAt: "2026-09-25T11:00:00Z" }));
    expect(w.label).toBe("18 to approve");
    expect(w.aside).toBe("2 dropped");
  });
  it("reads Done once anything is approved and the batch is finished", () => {
    const w = batchWords(base({ lifecycle: "finished", phase: "finished", counts: { written: 18, rendered: 18, approved: 16, flagged: 2 } }));
    expect(w.label).toBe("Done");
    expect(w.aside).toBe("2 flagged");
  });
  it("reads Stopped when a working batch has not moved for a minute", () => {
    const w = batchWords(base({ counts: { pending: 13, written: 7 }, lastMovementAt: new Date(Date.now() - 61_000).toISOString() }));
    expect(w.label).toBe("Stopped");
    expect(w.stalled).toBe(true);
    expect(w.tone).toBe("danger");
  });
  it("does not call a waiting batch stopped however long it waits", () => {
    const w = batchWords(base({ counts: { written: 18 }, lastMovementAt: "2026-09-01T00:00:00Z" }));
    expect(w.label).toBe("18 to render");
  });
});
