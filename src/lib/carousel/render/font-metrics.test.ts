import { expect, it } from "vitest";
import { Font, Glyph, Path } from "opentype.js";
import { loadFontMetrics } from "./font-metrics";
import { layoutText } from "./text-layout";
function bytes() {
  const font = new Font({ familyName: "Test Fixture", styleName: "Regular", unitsPerEm: 1000, ascender: 800, descender: -200,
    glyphs: [new Glyph({ name: ".notdef", advanceWidth: 500, path: new Path() }),
      new Glyph({ name: "space", unicode: 32, advanceWidth: 250, path: new Path() }),
      new Glyph({ name: "A", unicode: 65, advanceWidth: 600, path: new Path() }),
      new Glyph({ name: "B", unicode: 66, advanceWidth: 700, path: new Path() })] });
  return new Uint8Array(font.toArrayBuffer());
}
it("parses actual font bytes and uses advances at the requested size", () => {
  const metrics = loadFontMetrics(bytes());
  expect(metrics.ascender).toBe(800); expect(metrics.unitsPerEm).toBe(1000);
  expect(metrics.measure("A B", 100)).toBe(155);
  expect(metrics.measure("A B", 50)).toBe(77.5);
});
it("connects parsed metrics to measured wrapping and baseline placement", () => {
  const font = loadFontMetrics(bytes());
  const result = layoutText({ text: "A B A", size: 100, font, canvas: { width: 400, height: 500 }, wrap: { rule: "greedy_whitespace", width: 155 }, lineHeight: { px: 120 }, anchor: { kind: "top", y: 10 } }, text => font.measure(text, 100));
  expect(result.lines.map(line => line.text)).toEqual(["A B", "A"]);
  expect(result.lines[0].baseline).toBe(90);
});
it("refuses missing glyphs rather than measuring a silent fallback", () => {
  expect(() => loadFontMetrics(bytes()).measure("C", 20)).toThrow("required glyph");
});
it.each([0, -1, NaN, Infinity, 5000])("rejects invalid size %s", size => {
  expect(() => loadFontMetrics(bytes()).measure("A", size)).toThrow("measurement input");
});
it("sanitizes malformed font errors and enforces input bounds", () => {
  expect(() => loadFontMetrics(new Uint8Array(20))).toThrow("could not be parsed");
  expect(() => loadFontMetrics(new Uint8Array(1))).toThrow("data size");
});
