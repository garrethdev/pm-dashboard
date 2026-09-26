import { expect, it } from "vitest";
import { readSavedManifest } from "./manifest";
const template = { slug: "test", version: 2, image_rules: { one: {} }, slides: [{ n: 3, cells: [{}], images: { rule: "one" } }] };
const saved = () => ({ deck_id: "deck", library_id: "library", template: { slug: "test", version: 2 }, slides: [{ n: 3, cells: [{ cell: 0, image_id: "old-image", public_url: "https://example.com/old.jpg" }] }] });
it("preserves exact saved selections and original slide numbers without sharing mutable objects", () => {
  const input = saved(); const out = readSavedManifest(input, template, "library", "deck");
  expect(out).toEqual(input); expect(out.slides[0]).not.toBe(input.slides[0]);
});
it.each([{ deck_id: "other" }, { library_id: "other" }, { template: { slug: "test", version: 3 } }, { slides: [] }])("rejects changed pin %j", patch => {
  expect(() => readSavedManifest({ ...saved(), ...patch }, template, "library", "deck")).toThrow("does not match");
});
it.each(["javascript:bad", "https://user:password@example.com/image", "not-a-url"])("rejects unsafe URL %s", public_url => {
  const s = saved(); s.slides[0].cells[0].public_url = public_url;
  expect(() => readSavedManifest(s, template, "library", "deck")).toThrow("Invalid saved image URL");
});
it("rejects renumbered slides and cells", () => {
  const s = saved(); s.slides[0].n = 1;
  expect(() => readSavedManifest(s, template, "library", "deck")).toThrow("slide mismatch");
  s.slides[0].n = 3; s.slides[0].cells[0].cell = 1;
  expect(() => readSavedManifest(s, template, "library", "deck")).toThrow("Invalid saved image cell");
});
