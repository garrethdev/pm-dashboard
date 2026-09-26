import { expect, it } from "vitest";
import sharp from "sharp";
import { Font, Glyph, Path } from "opentype.js";
import eye from "../../../../docs/carousel-templates/covered-eye.v1.json";
import { renderCaptionedDeck } from "./render-deck";
async function fixture() {
  const template = structuredClone(eye);
  Reflect.deleteProperty(template.lane.set_on_materialise, "gatekeep_status");
  Object.assign(template.output, { format: "png" });
  const path = new Path(); path.moveTo(0, 0); path.lineTo(500, 0); path.lineTo(500, 700); path.lineTo(0, 700); path.close();
  const font = new Font({ familyName: "Deck Fixture", styleName: "Regular", unitsPerEm: 1000, ascender: 800, descender: -200,
    glyphs: [new Glyph({ name: ".notdef", advanceWidth: 500, path: new Path() }), new Glyph({ name: "A", unicode: 65, advanceWidth: 600, path })] });
  const bytes = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#ff0000" } }).png().toBuffer();
  const url = "https://example.com/image.png";
  return { template, libraryId: "library", deckId: "deck", images: new Map([[url, bytes]]),
    fonts: new Map([["caption", new Uint8Array(font.toArrayBuffer())]]),
    roles: { ...Object.fromEntries([1, 2, 3, 4, 5, 6].map(n => [`slide_${n}`, "A"])), hook_type: "Question" },
    manifest: { deck_id: "deck", library_id: "library", template: { slug: template.slug, version: 1 },
      slides: [1, 2, 3, 4, 5, 6].map(n => ({ n, cells: [{ cell: 0, image_id: "asset", public_url: url }] })) } };
}
it("renders six captioned PNG slides with original numbering and slide-5 bottom positioning", async () => {
  const result = await renderCaptionedDeck(await fixture());
  expect(result).toMatchObject({ stage: "captioned_deck", persisted: false, approved: false });
  expect(result.slides.map(s => s.n)).toEqual([1, 2, 3, 4, 5, 6]);
  for (const slide of result.slides) {
    expect(await sharp(slide.bytes).metadata()).toMatchObject({ width: 1080, height: 1920, format: "png" });
    const top = slide.n === 5 ? 1760 : 130;
    const pixel = await sharp(slide.bytes).extract({ left: 535, top, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
    expect([...pixel]).toEqual([255, 255, 255]);
    const background = await sharp(slide.bytes).extract({ left: 535, top: 900, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
    expect([...background]).toEqual([255, 0, 0]);
  }
});
it("preserves text-box paint order and encodes the requested JPEG output", async () => {
  const input = await fixture();
  input.template.slides = input.template.slides.slice(0, 1); input.manifest.slides = input.manifest.slides.slice(0, 1);
  const box = structuredClone(input.template.slides[0].text[0]); Object.assign(box, { fill: "#0000ff" });
  Object.assign(input.template.slides[0], { text: [...input.template.slides[0].text, box] }); input.template.output.format = "jpeg";
  const result = await renderCaptionedDeck(input);
  expect(result.slides[0].format).toBe("jpeg");
  expect(await sharp(result.slides[0].bytes).metadata()).toMatchObject({ format: "jpeg", width: 1080, height: 1920 });
  const pixel = await sharp(result.slides[0].bytes).extract({ left: 535, top: 130, width: 1, height: 1 }).raw().toBuffer();
  expect(pixel[2]).toBeGreaterThan(240); expect(pixel[0]).toBeLessThan(15);
});
it("preflights fonts and unsupported glyphs rather than returning raw image slides", async () => {
  const input = await fixture(); input.fonts.clear(); input.images.clear();
  await expect(renderCaptionedDeck(input)).rejects.toThrow("caption font");
  const invalid = await fixture(); Object.assign(invalid.roles, { slide_6: "B" }); invalid.images.clear();
  await expect(renderCaptionedDeck(invalid)).rejects.toThrow("required glyph");
});
