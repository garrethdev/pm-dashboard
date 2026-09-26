import { beforeEach, expect, it, vi } from "vitest";
import eye from "../../../../docs/carousel-templates/covered-eye.v1.json";
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("./fetch-image", () => ({ fetchImageBytes: mocks.fetch }));
import { fetchDeckImages } from "./fetch-deck-images";
function fixture() {
  const template = structuredClone(eye); Reflect.deleteProperty(template.lane.set_on_materialise, "gatekeep_status");
  return { template, deckId: "deck", libraryId: "library", allowedOrigins: ["https://images.example.com"],
    manifest: { deck_id: "deck", library_id: "library", template: { slug: template.slug, version: 1 },
      slides: [1, 2, 3, 4, 5, 6].map(n => ({ n, cells: [{ cell: 0, image_id: "saved", public_url: "https://images.example.com/a.png" }] })) } };
}
beforeEach(() => { vi.clearAllMocks(); mocks.fetch.mockResolvedValue(Buffer.from("image")); });
it("fetches repeated saved URLs once and passes server policy", async () => {
  const result = await fetchDeckImages(fixture());
  expect(result.size).toBe(1); expect(mocks.fetch).toHaveBeenCalledTimes(1);
  expect(mocks.fetch).toHaveBeenCalledWith("https://images.example.com/a.png", { allowedOrigins: ["https://images.example.com"], maxBytes: 20_000_000 });
});
it("rejects a foreign manifest before any network request", async () => {
  const input = fixture(); input.manifest.deck_id = "other";
  await expect(fetchDeckImages(input)).rejects.toThrow("does not match"); expect(mocks.fetch).not.toHaveBeenCalled();
});
it("fails the deck when a saved asset fails instead of repicking", async () => {
  const input = fixture(); input.manifest.slides[1].cells[0].public_url = "https://images.example.com/missing.png";
  mocks.fetch.mockResolvedValueOnce(Buffer.from("first")).mockRejectedValueOnce(new Error("Image could not be downloaded safely"));
  await expect(fetchDeckImages(input)).rejects.toThrow("safely"); expect(mocks.fetch).toHaveBeenCalledTimes(2);
});
