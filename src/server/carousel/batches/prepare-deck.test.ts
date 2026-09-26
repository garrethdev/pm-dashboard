import { beforeEach, expect, it, vi } from "vitest";
vi.mock("../templates/read-version", () => ({ readPinnedTemplate: vi.fn() }));
vi.mock("../writer/read-writing", () => ({ readPinnedWriting: vi.fn() }));
vi.mock("../images/library", () => ({ readImageLibrary: vi.fn() }));
import { readPinnedTemplate } from "../templates/read-version";
import { readPinnedWriting } from "../writer/read-writing";
import { readImageLibrary } from "../images/library";
import { prepareDeck } from "./prepare-deck";
import { validateTemplate } from "@/lib/carousel/template/validate";
import eye from "../../../../docs/carousel-templates/covered-eye.v1.json";
const id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const input = { deckId: id, templateId: id, templateVersion: 1, writingVersionId: id, libraryId: id, contentType: eye.content_type, note: "A note", perBatchText: {} };
beforeEach(() => {
  vi.resetAllMocks();
  const t = structuredClone(eye); Reflect.deleteProperty(t.lane.set_on_materialise, "gatekeep_status");
  vi.mocked(readPinnedTemplate).mockResolvedValue({ versionId: id, templateId: id, version: 1, template: validateTemplate(t) });
  vi.mocked(readPinnedWriting).mockResolvedValue({ writingVersionId: id, contentType: eye.content_type, direction: { version: 2, text: "Keep @hook specific." } });
  vi.mocked(readImageLibrary).mockResolvedValue(["slide1_selfie", "food", "product", "body"].map((set_name, n) => ({ library_id: id, image_id: String(n), public_url: `https://example.com/${n}.jpg`, is_cover: false, set_name, subset_name: null, luminance: 50, status: "active" })));
});
it("assembles a pinned prompt and six-slide proposal without claiming persistence", async () => {
  const result = await prepareDeck(input);
  expect(result).toMatchObject({ state: "prepared", persisted: false, templateVersionId: id, writingVersionId: id });
  expect(result.manifest.slides).toHaveLength(6);
  expect(result.contract.metadata.direction_version).toBe(2);
  expect(result.contract.prompt).toContain("A note");
});
it("rejects invalid identity without database reads", async () => {
  await expect(prepareDeck({ ...input, deckId: "invalid" })).rejects.toThrow("Invalid pinned deck input");
  expect(readPinnedTemplate).not.toHaveBeenCalled();
});
it("rejects cross-type templates before Writing or image reads", async () => {
  await expect(prepareDeck({ ...input, contentType: "other" })).rejects.toThrow("Template does not belong");
  expect(readPinnedWriting).not.toHaveBeenCalled(); expect(readImageLibrary).not.toHaveBeenCalled();
});
it("rejects overrides of AI or fixed roles", async () => {
  await expect(prepareDeck({ ...input, perBatchText: { hook: "replace" } })).rejects.toThrow("Unexpected per-batch text role");
  expect(readImageLibrary).not.toHaveBeenCalled();
});
it("fails before image selection when Writing is unavailable", async () => {
  vi.mocked(readPinnedWriting).mockRejectedValue(Error("Writing unavailable"));
  await expect(prepareDeck(input)).rejects.toThrow("Writing unavailable");
  expect(readImageLibrary).not.toHaveBeenCalled();
});
it("fails an empty image pool instead of returning a ready deck", async () => {
  vi.mocked(readImageLibrary).mockResolvedValue([]);
  await expect(prepareDeck(input)).rejects.toThrow("empty set");
});
