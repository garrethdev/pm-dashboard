import { expect, it } from "vitest";
import { writingMentions, insertWritingMention } from "./mentions";
import type { CopyRole } from "../template/validate";
const roles: CopyRole[] = [{ role: "hook", writer: "ai", columns: ["hook"], max_chars: 80 }, { role: "closing", writer: "ai", columns: ["closing"] }];
it("finds active and stale mentions without treating emails or spaced @ as mentions", () => {
  const text = "Focus @hook, not @old. never @ anyone; a@example.com";
  const tokens = writingMentions(text, roles);
  expect(tokens.map(t => [t.name, !!t.role])).toEqual([["hook", true], ["old", false]]);
  for (const token of tokens) expect(text.slice(token.start, token.end)).toBe(token.text);
  expect(tokens[0].role?.max_chars).toBe(80);
});
it("keeps browser offsets correct after astral characters and preserves prose", () => {
  const text = "🙂 Use @hook\nthen @closing.";
  const tokens = writingMentions(text, roles);
  expect(tokens[0].start).toBe(7);
  let result = "", cursor = 0;
  for (const token of tokens) { result += text.slice(cursor, token.start) + token.text; cursor = token.end; }
  expect(result + text.slice(cursor)).toBe(text);
});
it("inserts at a mid-sentence caret rather than appending", () => {
  expect(insertWritingMention("Use  here", 4, 4, "hook", roles)).toEqual({ text: "Use @hook here", caret: 9 });
});
it("replaces an intersected mention atomically", () => {
  for (const [start, end] of [[7, 7], [5, 8]]) {
    expect(insertWritingMention("Use @hook here", start, end, "closing", roles).text).toBe("Use @closing here");
  }
});
it("separates adjacent identifiers so inserted mentions remain recognizable", () => {
  const result = insertWritingMention("ab", 1, 1, "hook", roles);
  expect(result.text).toBe("a @hook b");
  expect(writingMentions(result.text, roles)).toHaveLength(1);
});
it("rejects stale insertion names and invalid selection ranges", () => {
  expect(() => insertWritingMention("", 0, 0, "old", roles)).toThrow("Unknown");
  for (const [start, end] of [[-1, 0], [1, 0], [0, 9], [0.5, 1]]) {
    expect(() => insertWritingMention("abc", start, end, "hook", roles)).toThrow("selection");
  }
});
