import { describe, expect, it } from "vitest";
import { projectBatch, permittedActions, type BatchProgress, type DeckProgress, type DeckState } from "./status";
const deck = (id: string, state: DeckState): DeckProgress => ({ id, state, canRender: state === "written", canApprove: state === "rendered" });
const batch = (decks: DeckProgress[], patch: Partial<BatchProgress> = {}): BatchProgress => ({
  id: "batch-1", revision: 1, requested: decks.length || 1, lifecycle: "open", mode: "manual", madeInAuto: false, decks, ...patch,
});
describe("one batch status for all screens", () => {
  it("preserves blank and zero columns without changing waiting status", () => {
    const input = batch([deck("a", "written")]);
    const blank = projectBatch(input, { written: 1, rendered: null, approved: null });
    const zero = projectBatch(input, { written: 1, rendered: 0, approved: 0 });
    expect(blank.label).toBe("1 to render");
    expect(zero.label).toBe(blank.label);
    expect(blank.columns).toEqual({ written: 1, rendered: null, approved: null });
    expect(zero.columns).toEqual({ written: 1, rendered: 0, approved: 0 });
    expect(zero.actions).toEqual(blank.actions);
  });
  it("does not invent measured counts from current deck state", () => {
    expect(projectBatch(batch([deck("a", "rendered")])).columns)
      .toEqual({ written: null, rendered: null, approved: null });
  });
  it("retains measured render counts after a vision flag without granting approval", () => {
    const result = projectBatch(batch([deck("a", "flagged")]), { written: 1, rendered: 1, approved: 0 });
    expect(result.columns.rendered).toBe(1);
    expect(result.label).toBe("1 flagged");
    expect(result.actions).not.toContain("approve");
  });
  it.each([-1, 2, 0.5, NaN, Infinity, "0", undefined])("rejects invalid measured counts %s", value => {
    const columns = { written: 1, rendered: 0, approved: 0 };
    Reflect.set(columns, "rendered", value);
    expect(() => projectBatch(batch([deck("a", "written")]), columns)).toThrow("column count");
  });
  it("returns a separate count snapshot", () => {
    const columns = { written: 1, rendered: 0, approved: 0 };
    const result = projectBatch(batch([deck("a", "written")]), columns);
    columns.rendered = 1;
    expect(result.columns.rendered).toBe(0);
  });
  it.each(["false", "true", 1, 0, null, undefined])("rejects non-boolean readiness %s before exposing commands", value => {
    for (const field of ["canRender", "canApprove"] as const) {
      const input = batch([deck("a", field === "canRender" ? "written" : "rendered")]);
      Reflect.set(input.decks[0], field, value);
      expect(() => projectBatch(input)).toThrow("readiness flags");
      expect(() => permittedActions(input, "owner", "owner")).toThrow("readiness flags");
    }
  });
  it("rejects malformed provenance, collections and deck identities", () => {
    const input = batch([deck("a", "written")]);
    Reflect.set(input, "madeInAuto", "false");
    expect(() => projectBatch(input)).toThrow("provenance");
    input.madeInAuto = false;
    Reflect.set(input, "decks", {});
    expect(() => projectBatch(input)).toThrow("collection");
    for (const id of [123, "   ", null]) {
      const malformed = batch([deck("a", "written")]);
      Reflect.set(malformed.decks[0], "id", id);
      expect(() => projectBatch(malformed)).toThrow("Invalid or duplicate deck");
    }
  });
  it.each([
    ["writing", "Writing 0 of 1", "batch"],
    ["rendering", "Rendering 0 of 1", "batch"],
    ["written", "1 to render", "review"],
    ["rendered", "1 to approve", "finished"],
    ["flagged", "1 flagged", "batch"],
    ["approved", "Done", "finished"],
  ] as const)("projects %s into the shared presentation contract", (state, label, destination) => {
    expect(projectBatch(batch([deck("a", state)]))).toMatchObject({ label, destination, tone: "neutral" });
  });
  it("uses danger tone only for stopped batches", () => {
    expect(projectBatch(batch([deck("a", "written")], { lifecycle: "stopped" })))
      .toMatchObject({ label: "Stopped", tone: "danger", destination: "batch" });
  });
  it("removes dropped decks from the writing target without counting them as success", () => {
    const result = projectBatch(batch([deck("a", "written"), deck("b", "writing"), deck("c", "dropped")], { mode: "auto" }));
    expect(result).toMatchObject({ label: "Writing 1 of 2", target: 2, droppedLabel: "1 dropped", successfulWritten: 1 });
  });
  it("keeps drops beside rendering progress and mixed approval progress", () => {
    const result = projectBatch(batch([deck("a", "approved"), deck("b", "rendering"), deck("c", "dropped")]));
    expect(result).toMatchObject({ label: "Rendering 1 of 2", target: 2, droppedLabel: "1 dropped" });
    expect(projectBatch(batch([deck("a", "approved"), deck("b", "rendered")]))).toMatchObject({ label: "1 to approve", destination: "finished", droppedLabel: null });
  });
  it("permits another batch while waiting for review or human approval", () => {
    for (const state of ["written", "rendered", "approved"] as const) {
      expect(projectBatch(batch([deck("a", state)])).occupiesTypeSlot).toBe(false);
    }
  });
  it("retains the lane while there is active or unaccounted work", () => {
    for (const state of ["pending", "writing", "render_queued", "rendering"] as const) {
      expect(projectBatch(batch([deck("a", state)])).occupiesTypeSlot).toBe(true);
    }
    expect(projectBatch(batch([], { requested: 2 })).occupiesTypeSlot).toBe(true);
  });
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
