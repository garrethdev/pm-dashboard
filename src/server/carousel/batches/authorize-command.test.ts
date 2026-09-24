import { expect, it } from "vitest";
import { authorizeBatchCommand } from "./authorize-command";
import type { BatchProgress } from "./status";
const batch: BatchProgress = { id: "b", revision: 3, requested: 1, lifecycle: "open", mode: "auto", madeInAuto: true,
  decks: [{ id: "d", state: "rendered", canApprove: true, canRender: false }] };
const input = { batch, actorId: "owner", ownerId: "owner", expectedRevision: 3, action: "approve" as const, caller: "human" as const };
it("permits a current human final approval", () => expect(authorizeBatchCommand(input).toApprove).toBe(1));
it("refuses workers even if they carry the owner identity", () => {
  expect(() => authorizeBatchCommand({ ...input, caller: "worker" })).toThrow("requires a person");
});
it("refuses stale commands", () => expect(() => authorizeBatchCommand({ ...input, expectedRevision: 2 })).toThrow("Refresh"));
it("refuses a second viewer", () => expect(() => authorizeBatchCommand({ ...input, actorId: "other" })).toThrow("owner"));
it("refuses premature approval", () => expect(() => authorizeBatchCommand({ ...input,
  batch: { ...batch, decks: [{ id: "d", state: "flagged", canApprove: false, canRender: false }] },
})).toThrow("not ready"));
