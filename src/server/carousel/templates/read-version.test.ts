import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/data/supabase", () => ({ sbRest: vi.fn() }));
import { sbRest } from "@/lib/data/supabase";
import { readPinnedTemplate } from "./read-version";
import eye from "../../../../docs/carousel-templates/covered-eye.v1.json";
const id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
function row() {
  const template = structuredClone(eye);
  Reflect.deleteProperty(template.lane.set_on_materialise, "gatekeep_status");
  return { id: "saved-version", template_id: id, version: 1, template, active: false };
}
beforeEach(() => vi.resetAllMocks());
it("reads the pinned version even if a newer active version exists", async () => {
  vi.mocked(sbRest).mockResolvedValue([row()]);
  const result = await readPinnedTemplate(id.toUpperCase(), 1);
  expect(result).toMatchObject({ templateId: id, version: 1, versionId: "saved-version" });
  expect(sbRest).toHaveBeenCalledWith(expect.stringContaining(`template_id=eq.${id}&version=eq.1&select=`));
  expect(sbRest).toHaveBeenCalledWith(expect.not.stringContaining("active=eq.true"));
});
it.each([0, -1, 1.5, Infinity])("rejects invalid version %s before reading", async version => {
  await expect(readPinnedTemplate(id, version)).rejects.toThrow("Invalid template version identity");
  expect(sbRest).not.toHaveBeenCalled();
});
it("rejects filter injection before reading", async () => {
  await expect(readPinnedTemplate("x&version=eq.2", 1)).rejects.toThrow("Invalid template version identity");
  expect(sbRest).not.toHaveBeenCalled();
});
it.each([[], [row(), row()], null])("rejects missing/ambiguous responses", async response => {
  vi.mocked(sbRest).mockResolvedValue(response);
  await expect(readPinnedTemplate(id, 1)).rejects.toThrow("Expected exactly one");
});
it("rejects a JSON version different from the selected row", async () => {
  const saved = row(); saved.template.version = 2;
  vi.mocked(sbRest).mockResolvedValue([saved]);
  await expect(readPinnedTemplate(id, 1)).rejects.toThrow("JSON version");
});
it("does not silently repair unsafe legacy generation settings", async () => {
  vi.mocked(sbRest).mockResolvedValue([{ ...row(), template: eye }]);
  await expect(readPinnedTemplate(id, 1)).rejects.toThrow("gatekeep_status");
});
it("redacts read failures", async () => {
  vi.mocked(sbRest).mockRejectedValue(Error("private provider details"));
  await expect(readPinnedTemplate(id, 1)).rejects.toThrow("Template version could not be read");
});
