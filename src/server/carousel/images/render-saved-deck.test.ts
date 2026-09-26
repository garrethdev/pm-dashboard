import { beforeEach, expect, it, vi } from "vitest";
import sharp from "sharp";
import eye from "../../../../docs/carousel-templates/covered-eye.v1.json";
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("./fetch-image", () => ({ fetchImageBytes: mocks.fetch }));
import { renderSavedDeck } from "./render-saved-deck";

function fixture() {
  const template = structuredClone(eye);
  Reflect.deleteProperty(template.lane.set_on_materialise, "gatekeep_status");
  // One slide keeps lifecycle regression tests small; the separate two-lane
  // render/storage integration suite covers complete six/seven-slide decks.
  template.slides = template.slides.slice(0, 1);
  return { template, deckId: "deck", libraryId: "library", allowedOrigins: ["https://images.example.com"],
    roles: { slide_1: "A calm morning", hook_type: "Question" },
    manifest: { deck_id: "deck", library_id: "library", template: { slug: template.slug, version: 1 },
      slides: [{ n: 1, cells: [{ cell: 0, image_id: "saved", public_url: "https://images.example.com/a.png" }] }] } };
}
beforeEach(async () => {
  vi.clearAllMocks();
  mocks.fetch.mockResolvedValue(await sharp({ create: { width: 20, height: 20, channels: 3, background: "#64748b" } }).png().toBuffer());
});
it("connects saved selections, bundled font loading and actual image rendering", async () => {
  const result = await renderSavedDeck(fixture());
  expect(result).toMatchObject({ stage: "captioned_deck", persisted: false, approved: false,
    template: { slug: eye.slug, version: 1 } });
  expect(result.slides).toHaveLength(1);
  expect(await sharp(result.slides[0].bytes).metadata()).toMatchObject({ width: 1080, height: 1920, format: "jpeg" });
  expect(mocks.fetch).toHaveBeenCalledWith("https://images.example.com/a.png", {
    allowedOrigins: ["https://images.example.com"], maxBytes: 20_000_000 });
});
it("rejects foreign saved selections before downloading", async () => {
  const input = fixture(); input.manifest.deck_id = "other";
  await expect(renderSavedDeck(input)).rejects.toThrow("does not match");
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("preflights missing copy, unsupported emoji and unbundled fonts before downloading", async () => {
  const missing = fixture(); missing.roles.slide_1 = "";
  await expect(renderSavedDeck(missing)).rejects.toThrow();
  const emoji = fixture(); emoji.roles.slide_1 = "Hello 🙂";
  await expect(renderSavedDeck(emoji)).rejects.toThrow();
  const font = fixture(); font.template.fonts.caption.file = "untrusted.ttf";
  await expect(renderSavedDeck(font)).rejects.toThrow("not bundled");
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("keeps the captured revision stable across caller edits during awaits", async () => {
  const original = fixture();
  const baseline = await renderSavedDeck(original);
  const input = fixture();
  const pending = renderSavedDeck(input);
  input.roles.slide_1 = "Changed copy";
  input.template.slides[0].text[0].role = "missing";
  input.manifest.slides[0].cells[0].public_url = "https://other.example.com/changed.png";
  input.allowedOrigins[0] = "https://other.example.com";
  const result = await pending;
  expect(result.slides[0].bytes.equals(baseline.slides[0].bytes)).toBe(true);
  expect(mocks.fetch).toHaveBeenLastCalledWith("https://images.example.com/a.png", {
    allowedOrigins: ["https://images.example.com"], maxBytes: 20_000_000 });
});
it("fails unavailable or invalid saved assets without repicking or returning a partial render", async () => {
  mocks.fetch.mockRejectedValueOnce(new Error("Image could not be downloaded safely"));
  await expect(renderSavedDeck(fixture())).rejects.toThrow("safely");
  mocks.fetch.mockResolvedValueOnce(Buffer.from("not an image"));
  await expect(renderSavedDeck(fixture())).rejects.toThrow();
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
});
