import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/data/supabase", () => ({ sbRestAll: vi.fn() }));
import { sbRestAll } from "@/lib/data/supabase";
import { readImageLibrary, proposeImageManifest } from "./library";
const id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const row = { library_id: id, image_id: 1, public_url: "https://example.com/image.jpg", is_cover: false, set_name: null, subset_name: null, luminance: null, status: "active" };
beforeEach(() => vi.resetAllMocks());
it("reads an explicitly scoped, ordered, bounded library and normalizes bank IDs", async () => {
  vi.mocked(sbRestAll).mockResolvedValue([row]);
  expect(await readImageLibrary(id.toUpperCase())).toEqual([{ ...row, image_id: "1" }]);
  expect(sbRestAll).toHaveBeenCalledWith(expect.stringContaining(`library_id=eq.${id}&status=eq.active&select=`), { maxRows: 20_000 });
});
it("rejects filter injection before any read", async () => {
  await expect(readImageLibrary("x&status=neq.active")).rejects.toThrow("Invalid image library ID");
  expect(sbRestAll).not.toHaveBeenCalled();
});
it.each([{ status: "retired" }, { library_id: "other" }, { image_id: 1.5 }, { luminance: "40" }, { public_url: "javascript:bad" }, { is_cover: null }])("rejects malformed or foreign candidates %j", async patch => {
  vi.mocked(sbRestAll).mockResolvedValue([{ ...row, ...patch }]);
  await expect(readImageLibrary(id)).rejects.toThrow("Invalid image library");
});
it("rejects duplicate identities", async () => {
  vi.mocked(sbRestAll).mockResolvedValue([row, row]);
  await expect(readImageLibrary(id)).rejects.toThrow("Invalid image library row");
});
it("redacts upstream failures instead of treating them as an empty pool", async () => {
  vi.mocked(sbRestAll).mockRejectedValue(Error("private credential"));
  await expect(readImageLibrary(id)).rejects.toThrow("Image library could not be read");
});
it("connects a real-shaped view row to a deterministic proposal, not a saved manifest", async () => {
  vi.mocked(sbRestAll).mockResolvedValue([row]);
  const template = { slug: "test", version: 1, image_rules: { one: {} }, slides: [{ n: 1, cells: [{}], images: { rule: "one" } }] };
  const manifest = await proposeImageManifest(template, id, "deck");
  expect(manifest.slides[0].cells).toEqual([{ cell: 0, image_id: "1", public_url: row.public_url }]);
  expect(manifest).not.toHaveProperty("persisted");
});
