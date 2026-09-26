import { expect, it } from "vitest";
import { layoutText, type TextLayoutInput } from "./text-layout";
const base: TextLayoutInput = { text: "one two three", canvas: { width: 100, height: 200 }, wrap: { rule: "greedy_whitespace", width: 70 }, size: 20, lineHeight: { ratio: 1.2 }, anchor: { kind: "top", y: 10 }, font: { ascender: 800, unitsPerEm: 1000 } };
const measure = (text: string) => text.length * 10;
it("wraps by measured width, accepting exact fits", () => {
  const out = layoutText(base, measure);
  expect(out.lines.map(l => l.text)).toEqual(["one two", "three"]);
  expect(out.lines[0]).toEqual({ text: "one two", width: 70, x: 15, top: 10, baseline: 26 });
});
it("collapses tabs, newlines and repeated whitespace", () => {
  expect(layoutText({ ...base, text: " one\n\t two   three " }, measure)).toEqual(layoutText(base, measure));
});
it("does not emit a blank first line or shrink an over-wide word", () => {
  const out = layoutText({ ...base, text: "abcdefghijk two" }, measure);
  expect(out.lines.map(l => l.text)).toEqual(["abcdefghijk", "two"]);
  expect(out.lines[0].x).toBe(-5);
  expect(out.lineHeight).toBe(24);
});
it("preserves explicit datestamp breaks without wrapping", () => {
  const out = layoutText({ ...base, text: "abcdefghijk\r\n2026", wrap: { rule: "explicit_lines" }, anchor: { kind: "stack_right", top: 40, right: 46 }, lineHeight: { px: 66 } }, measure);
  expect(out.lines.map(l => [l.text, l.x, l.top])).toEqual([["abcdefghijk", -56, 40], ["2026", 14, 106]]);
});
it.each([
  [{ kind: "block_centre_y", at: 0.5 }, 76],
  [{ kind: "bottom", margin: 10 }, 142],
] as const)("places block anchor %j", (anchor, expected) => {
  expect(layoutText({ ...base, anchor }, measure).lines[0].top).toBe(expected);
});
it("retains fractional line heights", () => {
  expect(layoutText({ ...base, size: 21, lineHeight: { ratio: 1.2 } }, measure).lineHeight).toBe(25.2);
});
it("does not invent a line for empty text", () => {
  expect(layoutText({ ...base, text: " \n " }, measure).lines).toEqual([]);
});
it.each([NaN, Infinity, -1])("rejects invalid font measurement %s", n => {
  expect(() => layoutText(base, () => n)).toThrow("Invalid measured text width");
});
it("rejects invalid font metrics and wrap width", () => {
  expect(() => layoutText({ ...base, font: { ascender: 800, unitsPerEm: 0 } }, measure)).toThrow("metrics");
  expect(() => layoutText({ ...base, wrap: { rule: "greedy_whitespace", width: 0 } }, measure)).toThrow("wrap");
});
