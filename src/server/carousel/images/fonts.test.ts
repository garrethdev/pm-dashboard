import { expect, it } from "vitest";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import eye from "../../../../docs/carousel-templates/covered-eye.v1.json";
import { loadBundledCaptionFont, loadTemplateCaptionFonts } from "./fonts";
import { loadFontMetrics } from "@/lib/carousel/render/font-metrics";
import { renderCaption } from "./render-caption";

it.each(["Inter-Bold.ttf", "LiberationSans-Bold.ttf"])("loads, measures and paints the real bundled %s", async file => {
  const bytes = await loadBundledCaptionFont(file);
  const font = loadFontMetrics(bytes);
  const text = "“A different perspective”\nBefore & after — September 2026";
  expect(font.measure("Before & after", 60)).toBeGreaterThan(200);
  const png = await renderCaption({ text, canvas: { width: 1080, height: 500 }, size: 60,
    wrap: { rule: "explicit_lines" }, anchor: { kind: "top", y: 80 }, lineHeight: { px: 80 } },
  { fill: "#ffffff", stroke: { color: "#000000", width: 3 }, shadow: { kind: "soft", color: "#000000", opacity: 0.67, dx: 5, dy: 5, blur: 8 } }, bytes);
  const stats = await sharp(png).stats();
  expect(stats.channels[3].max).toBe(255); expect(stats.channels[3].min).toBe(0);
  expect(stats.channels[3].mean).toBeGreaterThan(1);
  // Optional local QA artifact, never a production write or test requirement.
  if (process.env.CAROUSEL_FONT_QA_DIR) {
    await sharp({ create: { width: 1080, height: 500, channels: 3, background: "#64748b" } })
      .composite([{ input: png }]).png().toBuffer().then(image => writeFile(join(process.env.CAROUSEL_FONT_QA_DIR!, `${file}.png`), image));
  }
});
it.each(["../Inter-Bold.ttf", "/etc/passwd", "https://example.com/font.ttf", "NotoColorEmoji.ttf"])("rejects unbundled paths and faces: %s", async name => {
  await expect(loadBundledCaptionFont(name)).rejects.toThrow("not bundled");
});
it("loads only referenced static caption fonts and enforces family/weight binding", async () => {
  const template = structuredClone(eye); Reflect.deleteProperty(template.lane.set_on_materialise, "gatekeep_status");
  const fonts = await loadTemplateCaptionFonts(template);
  expect([...fonts.keys()]).toEqual(["caption"]);
  template.fonts.caption.weight = 400;
  await expect(loadTemplateCaptionFonts(template)).rejects.toThrow("face does not match");
});
it("returns independent bytes rather than a caller-mutable shared cache", async () => {
  const first = await loadBundledCaptionFont("Inter-Bold.ttf"); first.fill(0);
  const second = await loadBundledCaptionFont("Inter-Bold.ttf");
  expect(second.some(byte => byte !== 0)).toBe(true);
});
