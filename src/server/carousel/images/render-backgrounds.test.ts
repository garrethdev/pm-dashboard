import { expect, it } from "vitest";
import sharp from "sharp";
import eye from "../../../../docs/carousel-templates/covered-eye.v1.json";
import { renderDeckBackgrounds } from "./render-backgrounds";
async function fixture() {
  const template = structuredClone(eye);
  Reflect.deleteProperty(template.lane.set_on_materialise, "gatekeep_status");
  const bytes = await sharp({ create: { width: 12, height: 20, channels: 3, background: "#ff0000" } }).png().toBuffer();
  const url = "https://example.com/saved.png";
  return { template, deckId: "deck", libraryId: "library", images: new Map([[url, bytes]]),
    manifest: { deck_id: "deck", library_id: "library", template: { slug: template.slug, version: 1 },
      slides: [1, 2, 3, 4, 5, 6].map(n => ({ n, cells: [{ cell: 0, image_id: "saved-image", public_url: url }] })) } };
}
it("renders actual lossless backgrounds under original slide numbers", async () => {
  const result = await renderDeckBackgrounds(await fixture());
  expect(result.stage).toBe("image_backgrounds"); expect(result.finalSlides).toBe(false);
  expect(result.slides.map(slide => slide.n)).toEqual([1, 2, 3, 4, 5, 6]);
  for (const slide of result.slides) {
    expect(await sharp(slide.bytes).metadata()).toMatchObject({ format: "png", width: 1080, height: 1920 });
    const pixel = await sharp(slide.bytes).extract({ left: 500, top: 900, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
    expect([...pixel]).toEqual([255, 0, 0]);
  }
});
it("rejects missing assets rather than emitting a partial renumbered deck", async () => {
  const input = await fixture(); input.manifest.slides[5].cells[0].public_url = "https://example.com/missing.png";
  await expect(renderDeckBackgrounds(input)).rejects.toThrow("slide 6");
});
it("rejects a manifest from another deck before painting", async () => {
  const input = await fixture(); input.manifest.deck_id = "other";
  await expect(renderDeckBackgrounds(input)).rejects.toThrow("does not match");
});
it("does not silently repair an unsafe historical template", async () => {
  const input = await fixture(); input.template.lane.set_on_materialise.gatekeep_status = "pending";
  await expect(renderDeckBackgrounds(input)).rejects.toThrow("gatekeep_status");
});
