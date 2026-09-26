import { describe, expect, it } from "vitest";
import glow from "../../../../docs/carousel-templates/glowup.v1.json";
import eye from "../../../../docs/carousel-templates/covered-eye.v1.json";
import { validateTemplate } from "./validate";

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
  it("rejects diagonal rules without both pools", () => {
    const template = structuredClone(glow);
    Reflect.deleteProperty(template.slides[2].images, "body_pools");
    expect(() => validateTemplate(template, "historical")).toThrow("slides[2].images.body_pools");
  });
  it.each(["one", "distinct"])("allows absent or empty pools for whole-library %s selection", rule => {
    const template = structuredClone(glow);
    template.slides[0].images.rule = rule;
    template.slides[0].images.pools = [];
    expect(validateTemplate(template, "historical")).toEqual(template);
    Reflect.deleteProperty(template.slides[0].images, "pools");
    expect(validateTemplate(template, "historical")).toEqual(template);
  });
  it("allows negative shadow offsets and fractional positive line heights", () => {
    const template = structuredClone(eye);
    template.text_styles.caption.shadow.dx = -5;
    template.text_styles.caption.line_height.px = 72.5;
    expect(validateTemplate(template, "historical")).toEqual(template);
  });
  it("returns a detached copy of nested template fields", () => {
    const result = validateTemplate(eye, "historical");
    result.slides[0].text[0].size = 100;
    expect(eye.slides[0].text[0].size).toBe(72);
  });
});
