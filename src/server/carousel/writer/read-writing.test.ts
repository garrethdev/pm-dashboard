import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/data/supabase", () => ({ sbRest: vi.fn() }));
import { sbRest } from "@/lib/data/supabase";
import { readPinnedWriting } from "./read-writing";
const id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const row = { id, content_type: "covered_eye", version: 3, direction: "  Keep @hook concise.\nUse evidence.  ", active: false };
beforeEach(() => vi.resetAllMocks());
it("preserves authored text and inactive pinned versions without selecting latest", async () => {
  vi.mocked(sbRest).mockResolvedValue([row]);
  expect(await readPinnedWriting(id.toUpperCase(), row.content_type)).toEqual({ writingVersionId: id, contentType: row.content_type, direction: { version: 3, text: row.direction } });
  expect(sbRest).toHaveBeenCalledWith(`carousel_lane_directions?id=eq.${id}&select=id,content_type,version,direction&limit=2`);
});
it.each([null, [], [row, row]])("rejects missing or ambiguous Writing", async value => {
  vi.mocked(sbRest).mockResolvedValue(value);
  await expect(readPinnedWriting(id, row.content_type)).rejects.toThrow("Expected exactly one");
});
it.each([{ id: "other" }, { content_type: "other_lane" }, { version: 0 }, { version: "3" }])("rejects mismatched identity %j", async patch => {
  vi.mocked(sbRest).mockResolvedValue([{ ...row, ...patch }]);
  await expect(readPinnedWriting(id, row.content_type)).rejects.toThrow("identity mismatch");
});
it.each([null, "", " \n", {}])("rejects blank or non-text Writing %j", async direction => {
  vi.mocked(sbRest).mockResolvedValue([{ ...row, direction }]);
  await expect(readPinnedWriting(id, row.content_type)).rejects.toThrow("Writing is required");
});
it("rejects an unsafe row ID before a database call", async () => {
  await expect(readPinnedWriting("x&select=*", row.content_type)).rejects.toThrow("Invalid Writing identity");
  expect(sbRest).not.toHaveBeenCalled();
});
it("redacts provider failures", async () => {
  vi.mocked(sbRest).mockRejectedValue(Error("secret"));
  await expect(readPinnedWriting(id, row.content_type)).rejects.toThrow("Writing version could not be read");
});
