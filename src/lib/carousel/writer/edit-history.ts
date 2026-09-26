export interface WritingEdit { text: string; caret: number }
export interface WritingHistory { past: WritingEdit[]; present: WritingEdit; future: WritingEdit[] }
function snapshot(edit: WritingEdit): WritingEdit {
  if (typeof edit.text !== "string" || !Number.isSafeInteger(edit.caret) || edit.caret < 0 || edit.caret > edit.text.length) throw new Error("Invalid Writing history entry");
  return { text: edit.text, caret: edit.caret };
}
/** Keep history local to one editor/version, never persist it as a draft version.
 * Cap retained older text to 1M UTF-16 units and 100 edits; current text is retained. */
function trim(edits: WritingEdit[]) {
  let size = 0;
  return edits.slice(-100).reverse().filter(edit => { size += edit.text.length; return size <= 1_000_000; }).reverse();
}
export function createWritingHistory(edit: WritingEdit): WritingHistory {
  return { past: [], present: snapshot(edit), future: [] };
}
export function recordWritingEdit(history: WritingHistory, edit: WritingEdit): WritingHistory {
  const next = snapshot(edit);
  if (next.text === history.present.text) return { ...history, present: next };
  return { past: trim([...history.past, snapshot(history.present)]), present: next, future: [] };
}
export function moveWritingHistory(history: WritingHistory, direction: "undo" | "redo"): WritingHistory {
  if (direction === "undo") {
    const previous = history.past.at(-1);
    return previous ? { past: history.past.slice(0, -1), present: snapshot(previous), future: trim([...history.future, snapshot(history.present)]) } : history;
  }
  const next = history.future.at(-1);
  return next ? { past: trim([...history.past, snapshot(history.present)]), present: snapshot(next), future: history.future.slice(0, -1) } : history;
}
