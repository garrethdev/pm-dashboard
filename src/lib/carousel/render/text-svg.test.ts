import { expect, it } from "vitest";
import { paintTextLayers, type TextPaint } from "./text-svg";
import type { TextLayoutInput } from "./text-layout";
const input: TextLayoutInput = { text: "Caption", canvas: { width: 1080, height: 1920 }, size: 72, lineHeight: { px: 80 }, wrap: { rule: "greedy_whitespace", width: 952 }, anchor: { kind: "top", y: 105 }, font: { ascender: 800, unitsPerEm: 1000 } };
const paint: TextPaint = { fontFamily: "Inter Bold", fill: "#FFFFFF", stroke: { color: "#000000", width: 7 } };
const measure = () => 200;
it("emits centered baseline-positioned crisp text with stroke before fill", () => {
  const result = paintTextLayers(input, paint, measure);
  expect(result.foreground).toContain('x="440" y="162.6"');
  expect(result.foreground).toContain('stroke-width="7" stroke-linejoin="round" paint-order="stroke fill"');
  expect(result.shadow).toBeNull();
});
it.each(["hard", "soft"] as const)("keeps %s shadow separate and unstroked", kind => {
  const result = paintTextLayers(input, { ...paint, shadow: { kind, color: "#000000", opacity: 0.6667, dx: 5, dy: 5, blur: 19 } }, measure);
  expect(result.shadow?.svg).toContain('x="445" y="167.6"');
  expect(result.shadow?.svg).toContain('stroke="none"');
  expect(result.shadow?.svg).not.toContain("stroke-width");
  expect(result.shadow?.blurSigma).toBe(kind === "soft" ? 19 : 0);
});
it("escapes author text instead of emitting markup", () => {
  const result = paintTextLayers({ ...input, text: '<script a="b">&</script>' }, paint, measure);
  expect(result.foreground).not.toContain("<script");
  expect(result.foreground).toContain("&lt;script a=&quot;b&quot;&gt;&amp;&lt;/script&gt;");
});
it.each(["😀", "🇺🇸", "1️⃣"])("refuses unsupported emoji %s instead of guessing glyphs", text => {
  expect(() => paintTextLayers({ ...input, text }, paint, measure)).toThrow("Emoji bitmap");
});
it.each(["\u0000", "\ud800"])("rejects invalid XML text", text => {
  expect(() => paintTextLayers({ ...input, text }, paint, measure)).toThrow("Invalid SVG text");
});
it("rejects unsafe style attributes", () => {
  expect(() => paintTextLayers(input, { ...paint, fill: 'url(https://example.com)' }, measure)).toThrow("paint settings");
  expect(() => paintTextLayers(input, { ...paint, fontFamily: 'x" onload="bad' }, measure)).toThrow("paint settings");
});
