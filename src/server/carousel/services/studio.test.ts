import { describe, expect, it } from "vitest";
import { validateTemplate } from "@/lib/carousel/template/validate";
import { blankTemplate, templateFromSpec, type DraftSpec } from "./studio";

const spec: DraftSpec = {
  name: "Evening habit",
  direction: "Plain and warm.",
  sample: { hook: "the evening habit that flattened my stomach", line_2: "i stopped eating after eight" },
  slides: [
    { layout: "single", set: null, boxes: [{ name: "hook", purpose: "the opener", size: 72, at: 0.5 }] },
    { layout: "single", set: null, boxes: [{ name: "line_2", purpose: "the habit", size: 64, at: 0.5 }] },
  ],
};
const made = (size: "4:5" | "9:16") => ({ ...templateFromSpec(blankTemplate("evening-habit", "Evening habit", "Character 2", size), spec), version: 1 });

describe("what the Studio makes meets the rules for new decks (PR #31 review item 8)", () => {
  it("passes the strict check at both sizes the Studio offers", () => {
    for (const size of ["4:5", "9:16"] as const) expect(() => validateTemplate(made(size), "generation")).not.toThrow();
  });
  it("is refused at a size new decks cannot use", () => {
    expect(() => validateTemplate({ ...made("4:5"), canvas: { width: 1080, height: 1440, background: null } }, "generation")).toThrow(/1080x1350 or 1080x1920/);
  });
});
