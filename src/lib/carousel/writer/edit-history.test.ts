import { expect, it } from "vitest";
import { createWritingHistory, recordWritingEdit, moveWritingHistory } from "./edit-history";
it("restores text and caret across mention insertion, undo and redo", () => {
  const original = createWritingHistory({ text: "Use ", caret: 4 });
  const inserted = recordWritingEdit(original, { text: "Use @hook", caret: 9 });
  const undone = moveWritingHistory(inserted, "undo");
  expect(undone.present).toEqual(original.present);
  expect(moveWritingHistory(undone, "redo").present).toEqual(inserted.present);
  expect(original.past).toEqual([]);
});
it("clears redo on new text but not caret-only changes", () => {
  const initial = createWritingHistory({ text: "a", caret: 1 });
  const undo = moveWritingHistory(recordWritingEdit(initial, { text: "ab", caret: 2 }), "undo");
  expect(recordWritingEdit(undo, { text: "a", caret: 0 }).future).toHaveLength(1);
  expect(recordWritingEdit(undo, { text: "c", caret: 1 }).future).toEqual([]);
});
it("bounds history and leaves boundary navigation unchanged", () => {
  let history = createWritingHistory({ text: "", caret: 0 });
  expect(moveWritingHistory(history, "undo")).toBe(history);
  expect(moveWritingHistory(history, "redo")).toBe(history);
  for (let i = 0; i < 120; i++) history = recordWritingEdit(history, { text: String(i), caret: 0 });
  expect(history.past).toHaveLength(100);
  expect(history.present.text).toBe("119");
});
it("bounds retained character volume and snapshots caller input", () => {
  const edit = { text: "x".repeat(600_000), caret: 0 };
  let history = createWritingHistory(edit); edit.text = "changed";
  expect(history.present.text.length).toBe(600_000);
  history = recordWritingEdit(history, { text: "y".repeat(600_000), caret: 0 });
  history = recordWritingEdit(history, { text: "z", caret: 1 });
  expect(history.past).toHaveLength(1);
});
it.each([-1, 4, 0.5, NaN])("rejects an invalid caret %s", caret => {
  expect(() => createWritingHistory({ text: "abc", caret })).toThrow("history entry");
});
