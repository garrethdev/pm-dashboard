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
  it.each([
    ["slug", "   "],
    ["text_origin", "baseline"],
    ["canvas.background", 12],
    ["output.format", "gif"],
    ["output.quality", 101],
    ["output.bucket", ""],
    ["fit.exif_transpose", "true"],
    ["fit.resample", "unknown"],
    ["fonts.caption.file", null],
    ["text_styles.caption.line_height", { px: 80, ratio: 1.2 }],
    ["text_styles.caption.line_height", { px: 0 }],
    ["text_styles.caption.wrap.width", Infinity],
    ["text_styles.caption.wrap.rule", "auto_fit"],
    ["text_styles.caption.shadow.opacity", 2],
    ["text_styles.caption.shadow.dx", NaN],
    ["text_styles.caption.shadow.stroked", true],
    ["text_styles.caption.emoji.font", "missing"],
    ["slides.0.images.pools", null],
    ["slides.0.images.pools", [null]],
    ["slides.0.images.pools", [" "]],
    ["slides.0.images.pools", "food"],
    ["slides.0.text.0.stroke", { width: -1, color: "#000000" }],
    ["slides.0.text.0.line_height", { ratio: 0 }],
    ["slides.0.text.0.font", "missing"],
  ])("rejects invalid painter field %s", (path, value) => {
    const template = structuredClone(eye);
    const keys = String(path).split(".");
    let target: unknown = template;
    for (const key of keys.slice(0, -1)) target = (target as Record<string, unknown>)[key];
    (target as Record<string, unknown>)[keys.at(-1)!] = value;
    const errorPath = String(path).replace(/\.(\d+)/g, "[$1]");
    expect(() => validateTemplate(template, "historical")).toThrow(errorPath);
  });
  it.each([true, "true", "false", 1, null])("rejects non-false materialisation approval %s", value => {
    const template = structuredClone(eye);
    Reflect.deleteProperty(template.lane.set_on_materialise, "gatekeep_status");
    Reflect.set(template.lane.set_on_materialise, "approved", value);
    expect(() => validateTemplate(template)).toThrow("lane.set_on_materialise.approved");
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
