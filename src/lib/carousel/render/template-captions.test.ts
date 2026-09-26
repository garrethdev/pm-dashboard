import { expect, it } from "vitest";
import eye from "../../../../docs/carousel-templates/covered-eye.v1.json";
import { planTemplateCaptions } from "./template-captions";
function fixture() {
  const template = structuredClone(eye);
  Reflect.deleteProperty(template.lane.set_on_materialise, "gatekeep_status");
  return { template, roles: { ...Object.fromEntries([1, 2, 3, 4, 5, 6].map(n => [`slide_${n}`, "A"])), hook_type: "Question" } as Record<string, string> };
}
it("resolves all slide numbers, named fonts and shallow box overrides", () => {
  const { template, roles } = fixture();
  const plan = planTemplateCaptions(template, roles);
  expect(plan.map(p => p.n)).toEqual([1, 2, 3, 4, 5, 6]);
  expect(plan[0].boxes[0]).toMatchObject({ font: "caption", input: { text: "A", size: 72, lineHeight: { px: 80 }, anchor: { kind: "top", y: 105 } }, paint: { stroke: { width: 7 }, shadow: { kind: "soft", blur: 19 } } });
  expect(plan[4].boxes[0]).toMatchObject({ input: { size: 65, lineHeight: { px: 72 }, anchor: { kind: "bottom", margin: 105 } }, paint: { stroke: { width: 6 } } });
  expect(template).toEqual(fixture().template);
});
it("quotes only the configured hook type and box, without mutating copy", () => {
  const { template, roles } = fixture(); roles.hook_type = "Jealous Friend";
  const plan = planTemplateCaptions(template, roles);
  expect(plan[0].boxes[0].input.text).toBe("“A”");
  expect(plan[1].boxes[0].input.text).toBe("A");
  expect(roles.slide_1).toBe("A");
  delete roles.hook_type;
  expect(() => planTemplateCaptions(template, roles)).toThrow("Hook type required");
});
it("maps explicit newline datestamps and preserves right alignment", () => {
  const { template, roles } = fixture(); roles.slide_6 = "A\nA";
  Object.assign(template.slides[5].text[0], { wrap: { rule: "explicit_newlines" }, align: "right", anchor: { kind: "stack_right", top: 40, right: 46 } });
  expect(planTemplateCaptions(template, roles)[5].boxes[0].input).toMatchObject({ text: "A\nA", wrap: { rule: "explicit_lines" }, anchor: { kind: "stack_right", top: 40, right: 46 } });
});
it("uses fixed copy and rejects attempts to replace it", () => {
  const { template, roles } = fixture();
  Object.assign(template.copy_contract[1], { writer: "fixed", fixed: "Fixed" }); delete roles.slide_2;
  expect(planTemplateCaptions(template, roles)[1].boxes[0].input.text).toBe("Fixed");
  roles.slide_2 = "Changed";
  expect(() => planTemplateCaptions(template, roles)).toThrow("Fixed caption role changed");
});
it("rejects missing and overlong captions instead of omitting or truncating", () => {
  const { template, roles } = fixture(); delete roles.slide_5;
  expect(() => planTemplateCaptions(template, roles)).toThrow("slide_5");
  roles.slide_5 = "A".repeat(227);
  expect(() => planTemplateCaptions(template, roles)).toThrow("exceeds limit");
});
it("rejects contradictory alignment and malformed quote rules", () => {
  const { template, roles } = fixture(); Object.assign(template.slides[0].text[0], { align: "right" });
  expect(() => planTemplateCaptions(template, roles)).toThrow("alignment");
  Object.assign(template.slides[0].text[0], { align: "center", quote: { when_hook_type: "Question" } });
  expect(() => planTemplateCaptions(template, roles)).toThrow("quote rule");
});
