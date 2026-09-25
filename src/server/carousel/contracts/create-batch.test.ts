import { expect, it } from "vitest";
import { parseCreateBatch } from "./create-batch";
const id = "11111111-1111-4111-8111-111111111111";
const valid = { typeId: id, templateVersionId: id, writingVersionId: id, libraryId: id, requested: 50, auto: false };
it("parses a bounded explicit batch snapshot", () => {
  expect(parseCreateBatch(valid)).toEqual({ ...valid, note: "", perBatchText: {} });
});
it("accepts the existing text registry key, not just proposed UUID types", () => {
  expect(parseCreateBatch({ ...valid, typeId: "glowup" }).typeId).toBe("glowup");
});
it.each(["", " ", "bad\nkey", "x".repeat(201), 42])("rejects invalid registry key %s", typeId => {
  expect(() => parseCreateBatch({ ...valid, typeId })).toThrow("typeId");
});
it.each([0, 51, "50", 1.1, null])("rejects invalid counts %s", requested => {
  expect(() => parseCreateBatch({ ...valid, requested })).toThrow();
});
it("rejects client approval and identity injection", () => {
  for (const field of ["approved", "ownerId", "actorEmail", "source_table"]) {
    expect(() => parseCreateBatch({ ...valid, [field]: true })).toThrow("Unexpected");
  }
});
it("requires a saved Writing version", () => {
  expect(() => parseCreateBatch({ ...valid, writingVersionId: null })).toThrow("writingVersionId");
});
it("bounds notes and template text inputs", () => {
  expect(() => parseCreateBatch({ ...valid, note: "x".repeat(2001) })).toThrow();
  expect(() => parseCreateBatch({ ...valid, perBatchText: { constructor: "bad" } })).toThrow();
  expect(parseCreateBatch({ ...valid, perBatchText: { hook: "Keep this fixed" } }).perBatchText.hook).toBe("Keep this fixed");
});
