import { expect, it } from "vitest";
import { writingMentions, insertWritingMention, writingMentionSuggestions, deleteWritingMention } from "./mentions";
import type { CopyRole } from "../template/validate";
const roles: CopyRole[] = [{ role: "hook", writer: "ai", columns: ["hook"], max_chars: 80 }, { role: "closing", writer: "ai", columns: ["closing"] }];
it("filters suggestions as an identifier is typed and carries length limits", () => {
  expect(writingMentionSuggestions("Use @", 5, roles)?.candidates).toEqual(roles);
  const result = writingMentionSuggestions("Use @ho", 7, roles);
  expect(result).toMatchObject({ start: 4, end: 7, query: "ho" });
  expect(result?.candidates.map(role => role.role)).toEqual(["hook"]);
  expect(result?.candidates[0].max_chars).toBe(80);
});
it.each(["never @ anyone", "contact@example", "@@ho", "@unknown", "@ ho"])("leaves unmatched prose alone: %s", text => {
  expect(writingMentionSuggestions(text, text.length, roles)).toBeNull();
});
it("suppresses an escaped trigger without changing text and rejects an interior caret", () => {
  const text = "Use @ho";
  expect(writingMentionSuggestions(text, text.length, roles, 4)).toBeNull();
  expect(text).toBe("Use @ho");
  expect(writingMentionSuggestions("Use @hook", 7, roles)).toBeNull();
});
it("deletes active and stale mentions as whole units", () => {
  expect(deleteWritingMention("Use @hook!", 9, 9, "backward", roles)).toEqual({ text: "Use !", caret: 4 });
  expect(deleteWritingMention("Use @old!", 4, 4, "forward", roles)).toEqual({ text: "Use !", caret: 4 });
  expect(deleteWritingMention("Use @hook!", 6, 8, "backward", roles)).toEqual({ text: "Use !", caret: 4 });
  expect(deleteWritingMention("Use @hook and @closing!", 6, 17, "forward", roles)).toEqual({ text: "Use !", caret: 4 });
});
it("returns native deletion control for prose, spacing and email", () => {
  expect(deleteWritingMention("Use @hook here", 10, 10, "backward", roles)).toBeNull();
  expect(deleteWritingMention("a@example", 9, 9, "backward", roles)).toBeNull();
});
it("keeps an adjacent existing mention distinct on insertion", () => {
  const result = insertWritingMention("@closing", 0, 0, "hook", roles);
  expect(result.text).toBe("@hook @closing");
  expect(writingMentions(result.text, roles)).toHaveLength(2);
});
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
