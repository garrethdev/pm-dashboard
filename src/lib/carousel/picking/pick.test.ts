import { describe, expect, it } from "vitest";
import glow from "../../../../docs/carousel-templates/glowup.v1.json";
import eye from "../../../../docs/carousel-templates/covered-eye.v1.json";
import { pickImages, type ImageAsset, type PickingTemplate } from "./pick";

const asset = (id: string, set: string | null, subset: string | null = null, luminance = 50): ImageAsset => ({
  image_id: id, library_id: "library", public_url: `https://images.example/${id}`, is_cover: false,
  set_name: set, subset_name: subset, luminance, status: "active",
});
const simple = (images: PickingTemplate["slides"][number]["images"], cells = 1): PickingTemplate => ({
  slug: "test", version: 1, image_rules: glow.image_rules, slides: [{ n: 7, cells: Array(cells).fill({}), images }],
});
const run = (template: PickingTemplate, assets: ImageAsset[], seed = "deck-1") => pickImages(template, assets, "library", seed);
const eyeAssets = [asset("cover", "slide1_selfie"), ...[1, 2, 3].map(n => asset(`food${n}`, "food")), asset("product", "product"), asset("body", "body")];

describe("DEV-06 pure image picker", () => {
  it("runs the Covered Eye fixture deterministically independent of database order", () => {
    const expected = run(eye, eyeAssets);
    expect(run(eye, [...eyeAssets].reverse())).toEqual(expected);
    expect(expected.slides.map(s => s.n)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(new Set(expected.slides.slice(1, 4).map(s => s.cells[0].public_url)).size).toBe(3);
  });
  it("runs all Glow Up pool rules and returns every original cell", () => {
    const names = new Set(glow.slides.flatMap(s => [...s.images.pools ?? [], ...s.images.body_pools ?? [], ...s.images.evidence_pools ?? []]));
    const assets = [...names].flatMap((name, i) => {
      const [set, subset] = name.split(":");
      return [asset(`${i}a`, set, subset ?? null), asset(`${i}b`, set, subset ?? null)];
    });
    const result = run(glow, assets);
    expect(result).toEqual(run(glow, assets));
    expect(result.slides.map(s => s.cells.length)).toEqual([4, 1, 4, 4, 1, 4, 1]);
  });
  it("prefers a cover but falls back to the whole named set", () => {
    const template = simple({ rule: "one", pools: ["cover"], prefer_cover: true });
    const items = [asset("a", "cover"), { ...asset("b", "cover"), is_cover: true }];
    expect(run(template, items).slides[0].cells[0].image_id).toBe("b");
    expect(run(template, [items[0]]).slides[0].cells[0].image_id).toBe("a");
  });
  it("repeats a one-image set without silently dropping or renumbering slides", () => {
    const items = eyeAssets.filter(a => !["food2", "food3"].includes(a.image_id));
    expect(run(eye, items).slides.slice(1, 4).map(s => s.cells[0].image_id)).toEqual(["food1", "food1", "food1"]);
    expect(run(simple({ rule: "distinct", pools: ["cover"] }, 4), [asset("a", "cover")]).slides[0]).toEqual({ n: 7, cells: [0, 1, 2, 3].map(cell => ({ cell, image_id: "a", public_url: "https://images.example/a" })) });
  });
  it("takes four distinct covers when available, deduplicating URLs", () => {
    const items = [1, 2, 3, 4].map(n => asset(String(n), "cover"));
    items.push({ ...items[0], image_id: "alias" });
    expect(new Set(run(simple({ rule: "distinct", pools: ["cover"] }, 4), items).slides[0].cells.map(c => c.public_url)).size).toBe(4);
  });
  it("reports an empty named set even if other requested sets have images", () => {
    expect(() => run(simple({ rule: "one", pools: ["full", "empty"] }), [asset("a", "full")])).toThrow('empty set "empty"');
  });
  it("no set binding draws from the whole active library only", () => {
    const items = [asset("a", null), { ...asset("foreign", null), library_id: "other" }, { ...asset("inactive", null), status: "archived" }];
    expect(run(simple({ rule: "one" }), items).slides[0].cells[0].image_id).toBe("a");
    expect(() => run(simple({ rule: "one", pools: [] }), [])).toThrow('empty library "library"');
  });
  it("matches nested pool names and excludes unrelated sets", () => {
    expect(run(simple({ rule: "one", pools: ["feature:face"] }), [asset("face", "feature", "face"), asset("body", "feature", "body")]).slides[0].cells[0].image_id).toBe("face");
  });
  const diagonal = simple({ rule: "diagonal_pairs", body_pools: ["body"], evidence_pools: ["evidence"] }, 4);
  it("never places either matching pair together in a row across 100 seeds", () => {
    const items = [asset("b1", "body"), asset("b2", "body"), asset("e1", "evidence", "one"), asset("e2", "evidence", "two")];
    for (let seed = 0; seed < 100; seed++) {
      const cells = run(diagonal, items, String(seed)).slides[0].cells;
      expect(cells[0].image_id[0]).toBe(cells[3].image_id[0]);
      expect(cells[1].image_id[0]).toBe(cells[2].image_id[0]);
      expect(cells[0].image_id[0]).not.toBe(cells[1].image_id[0]);
    }
  });
  it("prefers a different evidence category within luminance tolerance", () => {
    const items = [asset("body", "body"), asset("e1", "evidence", "a", 50), asset("e2", "evidence", "a", 50), asset("e3", "evidence", "b", 80)];
    for (let seed = 0; seed < 40; seed++) {
      const evidence = run(diagonal, items, String(seed)).slides[0].cells.filter(c => c.image_id.startsWith("e"));
      expect(evidence.some(c => c.image_id === "e3")).toBe(true);
    }
  });
  it("uses nearest luminance when no candidate is within 40", () => {
    const items = [asset("body", "body"), asset("e1", "evidence", "a", 0), asset("e2", "evidence", "b", 80), asset("e3", "evidence", "c", 200)];
    for (let seed = 0; seed < 40; seed++) {
      const evidence = run(diagonal, items, String(seed)).slides[0].cells.filter(c => c.image_id.startsWith("e"));
      expect(evidence.some(c => c.image_id === "e2")).toBe(true);
    }
  });
  it("keeps brightness ahead of category variety", () => {
    const items = [asset("body", "body"), asset("e1", "evidence", "a", 10), asset("e2", "evidence", "a", 20), asset("e3", "evidence", "b", 200)];
    for (let seed = 0; seed < 40; seed++) {
      const evidence = run(diagonal, items, String(seed)).slides[0].cells.filter(c => c.image_id.startsWith("e"));
      // The first evidence selection is the anchor in either diagonal order.
      if (evidence[0].image_id !== "e3") expect(evidence.some(c => c.image_id === "e3")).toBe(false);
    }
  });
  it("duplicates singleton body and evidence candidates", () => {
    const cells = run(diagonal, [asset("b", "body"), asset("e", "evidence")]).slides[0].cells;
    expect(cells.filter(c => c.image_id === "b")).toHaveLength(2);
    expect(cells.filter(c => c.image_id === "e")).toHaveLength(2);
  });
  it("does not assume zero brightness when luminance is missing", () => {
    expect(() => run(diagonal, [asset("body", "body"), { ...asset("e", "evidence"), luminance: null }])).toThrow("missing numeric luminance");
  });
  it("rejects unsupported rules and duplicate slide numbers", () => {
    expect(() => run(simple({ rule: "unknown" }), [])).toThrow("unknown image rule");
    const template = simple({ rule: "one" }); template.slides.push(template.slides[0]);
    expect(() => run(template, [asset("a", null)])).toThrow("duplicate original slide");
  });
  it("does not mutate source assets or template", () => {
    const before = structuredClone({ eye, eyeAssets }); run(eye, eyeAssets);
    expect({ eye, eyeAssets }).toEqual(before);
  });
  it.each(["file:///etc/passwd", "javascript:alert(1)", "data:image/png;base64,AA", "not-a-url", "https://user:secret@images.example/a"])("rejects unsafe or invalid URL %s", public_url => {
    expect(() => run(simple({ rule: "one" }), [{ ...asset("a", null), public_url }])).toThrow("URL");
  });
  it("rejects ambiguous duplicate IDs regardless of input order", () => {
    const items = [asset("a", null), { ...asset("a", null), public_url: "https://images.example/different" }];
    expect(() => run(simple({ rule: "one" }), items)).toThrow("duplicate id");
    expect(() => run(simple({ rule: "one" }), items.reverse())).toThrow("duplicate id");
  });
  it("does not let unrelated libraries poison selected-library ID checks", () => {
    const items = [asset("a", null), { ...asset("a", null), library_id: "other", public_url: "file:///bad" }];
    expect(run(simple({ rule: "one" }), items).slides[0].cells[0].public_url).toBe("https://images.example/a");
  });
  it("reports malformed runtime pool bindings", () => {
    const template = simple({ rule: "one" });
    Reflect.set(template.slides[0].images, "pools", "food");
    expect(() => run(template, [asset("a", null)])).toThrow("invalid set binding");
  });
});
