import { describe, expect, it } from "vitest";
import { parseFigmaLink, readLayout, templateFromFigma, type FigmaNode } from "./figma";
import { blankTemplate } from "./studio";
import { validateTemplate } from "@/lib/carousel/template/validate";

/**
 * Shaped like Garreth's sample "3-Slide Journey Carousel" (2026-10-08): a
 * page with two sections, three 1080×1920 frames each. Slide 1 and 3 are a
 * photo with a caption; slide 2 is one flattened picture, the same in both
 * samples, with no text.
 */
const white = { r: 1, g: 1, b: 1, a: 1 };
function text(id: string, name: string, characters: string, x: number, y: number, w: number, h: number, extra: Partial<FigmaNode> = {}): FigmaNode {
  return { id, name, type: "TEXT", characters, absoluteBoundingBox: { x, y, width: w, height: h }, fills: [{ type: "SOLID", color: white }], style: { fontFamily: "Gotham", fontWeight: 700, fontSize: 50, textAlignHorizontal: "CENTER" }, ...extra };
}
function frame(id: string, name: string, x: number, y: number, ref: string, children: FigmaNode[]): FigmaNode {
  return { id, name, type: "FRAME", absoluteBoundingBox: { x, y, width: 1080, height: 1920 }, fills: [{ type: "IMAGE", imageRef: ref }], children };
}
const page: FigmaNode = {
  id: "0:1", name: "Template", type: "CANVAS",
  children: [
    { id: "1:7", name: "Sample 1", type: "SECTION", children: [
      frame("1:2", "Slide 2", 1243, 100, "directed", []),
      frame("1:4", "Slide 1", 100, 100, "photo-a", [text("1:6", '"Ok I\'m officially gonna lose some weight"', '"Ok I\'m officially gonna\nlose some weight"', 100 + 454.5 - 250, 100 + 1023, 500, 120)]),
      frame("1:5", "Slide 3", 2386, 100, "photo-b", []),
    ] },
    { id: "1:8", name: "Sample 2", type: "SECTION", children: [
      frame("1:9", "Slide 4", 1243, 2354, "directed", []),
      frame("1:10", "Slide 5", 100, 2354, "photo-c", [text("1:11", "It's time", '"It’s time to lose\nsome weight"', 100 + 739.5 - 250, 2354 + 900, 500, 120, { strokes: [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }], strokeWeight: 4, effects: [{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.5 }, offset: { x: 4, y: 4 }, radius: 10 }] })]),
      frame("1:12", "Slide 6", 2386, 2354, "photo-d", []),
    ] },
  ],
};

describe("parseFigmaLink", () => {
  it("reads the key and node from a design link", () => {
    expect(parseFigmaLink("https://www.figma.com/design/ZqDGTufoZyJX3EnRvdJyVi/3-Slide-Journey-Carousel?node-id=0-1&t=abc")).toEqual({ fileKey: "ZqDGTufoZyJX3EnRvdJyVi", nodeId: "0:1" });
    expect(parseFigmaLink("https://figma.com/file/ZqDGTufoZyJX3EnRvdJyVi/x").nodeId).toBeNull();
  });
  it("refuses other links", () => {
    expect(() => parseFigmaLink("https://example.com/design/ZqDGTufoZyJX3EnRvdJyVi")).toThrow(/Figma/);
    expect(() => parseFigmaLink("not a link")).toThrow(/link/);
  });
});

describe("readLayout", () => {
  it("finds two samples of three slides, in reading order", () => {
    const layout = readLayout(page);
    expect(layout.samples).toHaveLength(2);
    expect(layout.samples[0].map((f) => f.name)).toEqual(["Slide 1", "Slide 2", "Slide 3"]);
    // Sample 2 is numbered 4, 5, 6 but sits 5, 4, 6 from left to right; where a frame sits wins.
    expect(layout.samples[1].map((f) => f.name)).toEqual(["Slide 5", "Slide 4", "Slide 6"]);
    expect(layout.samples[0][0].image?.ref).toBe("photo-a");
    expect(layout.samples[0][0].texts[0].x).toBeCloseTo(454.5 / 1080, 3);
    expect(layout.samples[0][0].texts[0].y).toBeCloseTo((1023 + 60) / 1920, 3);
    expect(layout.samples[1][0].texts[0].stroke).toEqual({ width: 4, color: "#000000" });
    expect(layout.samples[1][0].texts[0].shadow?.opacity).toBe(0.5);
  });
  it("reads a single section or frame too", () => {
    expect(readLayout(page.children![0]).samples).toHaveLength(1);
    expect(readLayout(page.children![0].children![1]).samples[0]).toHaveLength(1);
  });
  it("complains when there is nothing", () => {
    expect(() => readLayout({ id: "x", name: "Empty", type: "CANVAS", children: [] })).toThrow(/No frames/);
  });
});

describe("templateFromFigma", () => {
  it("makes a valid 9:16 template: the hook for the writer, the repeated picture pinned, Gotham stood in for", () => {
    const layout = readLayout(page);
    const made = templateFromFigma(blankTemplate("draft", "Journey", "Character 6", "9:16"), layout, { directed: "https://x/directed.png" });
    expect(() => validateTemplate(made.template)).not.toThrow();
    expect(made.size).toBe("9:16");
    const slides = made.template.slides as { images: { pinned?: unknown[] }; text: { role: string; font: string; weight: number; anchor: { kind: string; x: number }; size: number; fill: string }[] }[];
    expect(slides).toHaveLength(3);
    expect(slides[0].text[0].role).toBe("hook");
    expect(slides[0].text[0].anchor).toEqual({ kind: "free", x: 0.421, y: 0.564 });
    expect(slides[0].text[0].font).toBe("inter");
    expect(slides[0].text[0].weight).toBe(700);
    expect(slides[0].text[0].size).toBe(50);
    expect(slides[0].text[0].fill).toBe("#FFFFFF");
    expect(slides[1].images.pinned).toEqual([{ cell: 0, url: "https://x/directed.png" }]);
    expect(slides[2].images.pinned).toBeUndefined();
    const contract = made.template.copy_contract as { role: string; writer: string }[];
    expect(contract.find((c) => c.role === "hook")?.writer).toBe("ai");
    expect(made.sample.hook).toContain("officially");
    expect(made.notes.join(" ")).toMatch(/Gotham/);
    expect(made.notes.join(" ")).toMatch(/Slide 2 is the same picture/);
  });
  it("with one sample nothing is fixed or pinned", () => {
    const layout = readLayout(page.children![0]);
    const made = templateFromFigma(blankTemplate("draft", "Journey", "Character 6", "9:16"), layout, { directed: "https://x/directed.png" });
    const slides = made.template.slides as { images: { pinned?: unknown[] } }[];
    expect(slides[1].images.pinned).toBeUndefined();
    expect(made.notes.join(" ")).toMatch(/One sample only/);
  });
});
