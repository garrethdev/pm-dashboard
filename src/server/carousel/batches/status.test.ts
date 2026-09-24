import { describe, expect, it } from "vitest";
import { projectBatch, permittedActions, type BatchProgress, type DeckProgress, type DeckState } from "./status";
const deck = (id: string, state: DeckState): DeckProgress => ({ id, state, canRender: state === "written", canApprove: state === "rendered" });
const batch = (decks: DeckProgress[], patch: Partial<BatchProgress> = {}): BatchProgress => ({
  id: "batch-1", revision: 1, requested: decks.length || 1, lifecycle: "open", mode: "manual", madeInAuto: false, decks, ...patch,
});
describe("one batch status for all screens", () => {
  it("accounts for all 50 requested decks, even if only five were saved", () => {
    const result = projectBatch(batch(Array.from({ length: 5 }, (_, i) => deck(String(i), "written")), { requested: 50 }));
    expect(result.unaccounted).toBe(45);
    expect(result.label).toBe("Writing 5 of 50");
    expect(result.actions).not.toContain("render");
    expect(result.actions).not.toContain("run_again");
  });
  it("reports ready and blocked counts without hiding either", () => {
    const result = projectBatch(batch([deck("a", "written"), deck("b", "flagged")]));
    expect(result.label).toBe("1 to render");
    expect(result.blocked).toBe(1);
    expect(result.actions).toContain("render");
  });
  it("does not render pending gate results", () => {
    const result = projectBatch(batch([{ ...deck("a", "written"), canRender: false }]));
    expect(result.status).toBe("needs_attention");
    expect(result.actions).not.toContain("render");
  });
  it("keeps dropped and discarded separate from successful renders", () => {
    const result = projectBatch(batch([deck("a", "rendered"), deck("b", "dropped"), deck("c", "discarded")]));
    expect(result.successfulRendered).toBe(1);
    expect(result.toApprove).toBe(1);
    expect(result.label).toBe("1 to approve");
  });
  it("requires explicit finalization before Done", () => {
    const b = batch([deck("a", "approved")]);
    expect(projectBatch(b).status).toBe("awaiting_finish");
    expect(projectBatch({ ...b, lifecycle: "finished" }).actions).toEqual(["run_again"]);
  });
  it("rejects premature terminal state", () => {
    expect(() => projectBatch(batch([deck("a", "rendered")], { lifecycle: "finished" }))).toThrow("outstanding");
  });
  it("holds a stopped batch slot and waits for in-flight work", () => {
    const result = projectBatch(batch([deck("a", "rendering")], { lifecycle: "stopped", mode: "auto" }));
    expect(result.occupiesTypeSlot).toBe(true);
    expect(result.actions).toEqual([]);
  });
  it("allows continue only after stopped work settles", () => {
    expect(projectBatch(batch([deck("a", "written")], { lifecycle: "stopped" })).actions).toEqual(["continue", "finish"]);
  });
  it("Auto waits for a human approval", () => {
    const result = projectBatch(batch([deck("a", "rendered")], { mode: "auto", madeInAuto: true }));
    expect(result.status).toBe("to_approve");
    expect(result.counts.approved).toBe(0);
    expect(result.actions).toContain("approve");
    expect(result.actions).not.toContain("render");
  });
  it("makes second viewers read-only", () => {
    const b = batch([deck("a", "rendered")]);
    expect(permittedActions(b, "other", "owner")).toEqual([]);
    expect(permittedActions(b, "", "")).toEqual([]);
    expect(permittedActions(b, "owner", "owner")).toContain("approve");
  });
  it("rejects duplicate IDs and inconsistent readiness", () => {
    expect(() => projectBatch(batch([deck("a", "written"), deck("a", "written")]))).toThrow("duplicate");
    expect(() => projectBatch(batch([{ ...deck("a", "flagged"), canApprove: true }]))).toThrow("Readiness");
  });
  it.each([0, 51, 1.5, NaN])("rejects invalid requested count %s", requested => {
    expect(() => projectBatch(batch([], { requested }))).toThrow();
  });
});
