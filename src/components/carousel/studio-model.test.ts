import { describe, expect, it } from "vitest";
import { centreOf, cssOf, fitZoom, fontOf, lookOf, movedTo, patchBox, pinOf, pinned, resized, sizeOf, withFont, type Box, type Template } from "./studio-model";

function template(): Template {
  return {
    canvas: { width: 1080, height: 1350, background: "#000" },
    name: "Test",
    character: "Character 6",
    fonts: { caption: { family: "Inter", weight: 700, file: "Inter-Bold.ttf" } },
    text_styles: { caption: { font: "caption", fill: "#FFFFFF", align: "center", wrap: { rule: "greedy_whitespace", width: 950 }, stroke: { width: 6, color: "#000000" }, shadow: { kind: "soft", dx: 4, dy: 4, blur: 16, color: "#000000", opacity: 0.6, stroked: false } } },
    copy_contract: [{ role: "hook", writer: "ai" }],
    slides: [
      { n: 1, layout: "single", cells: [{ x: 0, y: 0, w: 1080, h: 1350 }], images: { rule: "one" }, text: [{ role: "hook", style: "caption", size: 64, anchor: { kind: "block_centre_y", at: 0.5 } }] },
      { n: 2, layout: "quad", cells: [{ x: 0, y: 0, w: 540, h: 675 }, { x: 540, y: 0, w: 540, h: 675 }, { x: 0, y: 675, w: 540, h: 675 }, { x: 540, y: 675, w: 540, h: 675 }], images: { rule: "distinct" }, text: [{ role: "line_2", style: "caption", size: 54, anchor: { kind: "block_centre_y", at: 0.5 } }] },
    ],
  };
}

describe("fonts", () => {
  it("falls back to the style's font and the template's weight", () => {
    const t = template();
    const f = fontOf(t.slides[0].text[0], t);
    expect(f.key).toBe("caption");
    expect(f.family).toBe("Inter");
    expect(f.weight).toBe(700);
  });
  it("adds a font entry when a box names a new font", () => {
    const t = patchBox(template(), 0, "hook", { font: "bebas_neue" });
    expect(t.fonts.bebas_neue.family).toBe("Bebas Neue");
    const f = fontOf(t.slides[0].text[0], t);
    expect(f.family).toBe("Bebas Neue");
    expect(f.font.weights).toEqual([400]);
  });
  it("leaves a known font alone", () => {
    const t = template();
    expect(withFont(t, "caption")).toBe(t);
  });
});

describe("look", () => {
  it("a box's own stroke of null switches the style's stroke off", () => {
    const t = patchBox(template(), 0, "hook", { stroke: null, align: "left", fill: "#FFF949" });
    const look = lookOf(t.slides[0].text[0], t);
    expect(look.stroke).toBeNull();
    expect(look.shadow?.kind).toBe("soft");
    expect(look.align).toBe("left");
    expect(look.fill).toBe("#FFF949");
  });
  it("css carries the font, weight, stroke under the fill and a hard shadow with no blur", () => {
    const t = patchBox(template(), 0, "hook", { weight: 800, shadow: { kind: "hard", dx: 6, dy: 6, blur: 12, color: "#000", opacity: 0.6, stroked: false } });
    const css = cssOf(t.slides[0].text[0], t, 0.5);
    expect(css.fontWeight).toBe(800);
    expect(css.paintOrder).toBe("stroke fill");
    expect(css.WebkitTextStroke).toBe("3px #000000");
    expect(css.textShadow).toBe("3px 3px 0px rgba(0,0,0,0.6)");
    expect(css.fontSize).toBe(32);
  });
});

describe("placement", () => {
  it("a drag lands as a free anchor, clamped and rounded", () => {
    expect(movedTo(0.33333, 1.4)).toEqual({ kind: "free", x: 0.333, y: 1 });
    expect(movedTo(-1, 0.5)).toEqual({ kind: "free", x: 0, y: 0.5 });
  });
  it("centre comes from the anchor kind", () => {
    const t = template();
    const box: Box = { role: "a", style: "caption", size: 40, anchor: { kind: "free", x: 0.2, y: 0.8 } };
    expect(centreOf(box, t)).toEqual({ x: 0.2, y: 0.8 });
    expect(centreOf({ ...box, anchor: { kind: "block_centre_y", at: 0.3 } }, t)).toEqual({ x: 0.5, y: 0.3 });
    expect(centreOf({ ...box, anchor: { kind: "bottom", margin: 135 } }, t).y).toBeCloseTo(0.84);
  });
});

describe("pinned pictures", () => {
  it("pins one picture to one slide's cell and nothing else", () => {
    const t = pinned(template(), 1, 2, { url: "https://x/y.jpg", image_id: "linked:b/y.jpg" });
    expect(t.slides[1].images.pinned).toEqual([{ cell: 2, url: "https://x/y.jpg", image_id: "linked:b/y.jpg" }]);
    expect(t.slides[0].images.pinned).toBeUndefined();
    expect(pinOf(t.slides[1], 2)?.url).toBe("https://x/y.jpg");
    expect(pinOf(t.slides[1], 0)).toBeNull();
  });
  it("replaces a pin on the same cell and unpins cleanly", () => {
    let t = pinned(template(), 0, 0, { url: "https://x/a.jpg" });
    t = pinned(t, 0, 0, { url: "https://x/b.jpg" });
    expect(t.slides[0].images.pinned).toEqual([{ cell: 0, url: "https://x/b.jpg" }]);
    t = pinned(t, 0, 0, null);
    expect(t.slides[0].images.pinned).toBeUndefined();
  });
});

describe("slide size", () => {
  it("stretches the cells to 9:16 and back", () => {
    const t = template();
    expect(sizeOf(t)).toBe("4:5");
    const tall = resized(t, "9:16");
    expect(tall.canvas.height).toBe(1920);
    expect(sizeOf(tall)).toBe("9:16");
    expect(tall.slides[1].cells[3]).toEqual({ x: 540, y: 960, w: 540, h: 960 });
    expect(resized(tall, "4:5").slides[1].cells[3]).toEqual({ x: 540, y: 675, w: 540, h: 675 });
    expect(resized(t, "4:5")).toBe(t);
  });
  it("fits a whole slide into the stage", () => {
    expect(fitZoom(1350, 778)).toBe(0.45);
    expect(fitZoom(1920, 300)).toBe(0.1);
    expect(fitZoom(1350, 5000)).toBe(1);
  });
});
