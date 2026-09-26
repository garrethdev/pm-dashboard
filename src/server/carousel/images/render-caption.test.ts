import { expect, it } from "vitest";
import { Font, Glyph, Path } from "opentype.js";
import sharp from "sharp";
import { renderCaption } from "./render-caption";
import { paintOutlinedTextLayers } from "@/lib/carousel/render/text-svg";
import type { TextLayoutInput } from "@/lib/carousel/render/text-layout";
import type { TextPaint } from "@/lib/carousel/render/text-svg";

// Deliberately synthetic rectangle glyph: proves real font decode, coordinates,
// raster pixels and layering without claiming typography or Python parity.
function fixtureFont() {
  const path = new Path();
  path.moveTo(0, 0); path.lineTo(500, 0); path.lineTo(500, 700); path.lineTo(0, 700); path.close();
  return new Uint8Array(new Font({ familyName: "Caption Fixture", styleName: "Regular", unitsPerEm: 1000,
    ascender: 800, descender: -200, glyphs: [new Glyph({ name: ".notdef", advanceWidth: 500, path: new Path() }),
      new Glyph({ name: "space", unicode: 32, advanceWidth: 250, path: new Path() }),
      new Glyph({ name: "A", unicode: 65, advanceWidth: 600, path })] }).toArrayBuffer());
}
const input: Omit<TextLayoutInput, "font"> = { text: "A", size: 100, canvas: { width: 200, height: 200 },
  wrap: { rule: "explicit_lines" }, lineHeight: { px: 110 }, anchor: { kind: "top", y: 20 } };
const paint: Omit<TextPaint, "fontFamily"> = { fill: "#ffffff", stroke: { color: "#000000", width: 4 } };
async function pixels(bytes: Buffer) {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  expect(info).toMatchObject({ width: 200, height: 200, channels: 4 });
  return (x: number, y: number) => [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)];
}
it("emits outlines instead of system-font-dependent SVG text", () => {
  const layers = paintOutlinedTextLayers(input, paint, fixtureFont());
  expect(layers.foreground).toContain("<path");
  expect(layers.foreground).not.toMatch(/<text|font-family/);
  expect(layers.layout.lines[0]).toMatchObject({ x: 70, baseline: 100, width: 60 });
});
it("renders measured outlines with crisp fill, stroke and transparent surroundings", async () => {
  const pixel = await pixels(await renderCaption(input, paint, fixtureFont()));
  expect(pixel(90, 50)).toEqual([255, 255, 255, 255]);
  expect(pixel(69, 50)).toEqual([0, 0, 0, 255]);
  expect(pixel(90, 25)[3]).toBe(0);
  expect(pixel(90, 105)[3]).toBe(0);
  expect(pixel(10, 10)[3]).toBe(0);
});
it("composites an unstroked hard shadow behind the crisp glyph", async () => {
  const pixel = await pixels(await renderCaption(input, { ...paint,
    shadow: { kind: "hard", color: "#000000", opacity: 1, dx: 20, dy: 20 } }, fixtureFont()));
  expect(pixel(130, 110)).toEqual([0, 0, 0, 255]);
  expect(pixel(100, 60)).toEqual([255, 255, 255, 255]);
  expect(pixel(145, 110)[3]).toBe(0);
});
it("blurs only the shadow, preserving crisp foreground pixels", async () => {
  const pixel = await pixels(await renderCaption(input, { ...paint,
    shadow: { kind: "soft", color: "#000000", opacity: 0.7, dx: 0, dy: 0, blur: 5 } }, fixtureFont()));
  expect(pixel(90, 50)).toEqual([255, 255, 255, 255]);
  expect(pixel(125, 60)[3]).toBeGreaterThan(0);
  expect(pixel(125, 60)[3]).toBeLessThan(179);
  expect(pixel(10, 10)[3]).toBe(0);
});
it("returns a transparent layer for deliberately empty text", async () => {
  const pixel = await pixels(await renderCaption({ ...input, text: "" }, paint, fixtureFont()));
  expect(pixel(90, 50)[3]).toBe(0);
});
it("rejects missing glyphs, emoji and invalid canvases without font fallback", async () => {
  await expect(renderCaption({ ...input, text: "B" }, paint, fixtureFont())).rejects.toThrow("required glyph");
  await expect(renderCaption({ ...input, text: "😀" }, paint, fixtureFont())).rejects.toThrow("Emoji");
  await expect(renderCaption({ ...input, canvas: { width: 5000, height: 5000 } }, paint, fixtureFont())).rejects.toThrow("canvas");
});
