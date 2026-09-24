import { describe, expect, it } from "vitest";
import glow from "../../../../docs/carousel-templates/glowup.v1.json";
import eye from "../../../../docs/carousel-templates/covered-eye.v1.json";
import { validateTemplate, templateFromRow } from "./validate";

describe("DEV-03 template validation", () => {
  it.each([glow, eye])("reads historical fixture $slug without changing it", template => {
    expect(validateTemplate(template, "historical")).toEqual(template);
  });
  it("refuses old Glow Up dimensions for new generation", () => {
    expect(() => validateTemplate(glow)).toThrow("canvas:");
  });
  it("refuses the obsolete pending risk value", () => {
    expect(() => validateTemplate(eye)).toThrow("gatekeep_status");
  });
  it("accepts a generation-safe copy without mutating the import", () => {
    const t = structuredClone(eye);
    Reflect.deleteProperty(t.lane.set_on_materialise, "gatekeep_status");
    expect(validateTemplate(t).slides).toHaveLength(6);
    expect(eye.lane.set_on_materialise.gatekeep_status).toBe("pending");
  });
  it.each([
    ["layout", (t: typeof eye) => { t.slides[0].layout = "mystery"; }],
    ["style", (t: typeof eye) => { t.slides[0].text[0].style = "missing"; }],
    ["columns", (t: typeof eye) => { t.copy_contract[0].columns = []; }],
    ["images", (t: typeof eye) => { Reflect.deleteProperty(t.slides[0], "images"); }],
    [".n", (t: typeof eye) => { t.slides[1].n = 1; }],
    ["cells", (t: typeof eye) => { t.slides[0].cells[0].w = 9000; }],
    ["anchor", (t: typeof eye) => { t.slides[0].text[0].anchor.kind = "baseline"; }],
  ] as const)("names broken field %s", (field, breakIt) => {
    const t = structuredClone(eye); breakIt(t);
    expect(() => validateTemplate(t, "historical")).toThrow(field);
  });
  it("reassembles the documented database row mapping", () => {
    const row = { ...eye, canvas: { canvas: eye.canvas, output: eye.output, fit: eye.fit, text_origin: eye.text_origin, fonts: eye.fonts, text_styles: eye.text_styles }, slides: { slides: eye.slides, image_sources: eye.image_sources, image_rules: eye.image_rules }, copy_contract: { copy_contract: eye.copy_contract, music: eye.music }, generation_metadata: eye.provenance };
    expect(templateFromRow(row, "historical").slides).toEqual(eye.slides);
  });
});
