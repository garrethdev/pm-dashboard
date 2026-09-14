#!/usr/bin/env node
// Checks the two imported carousel templates against the Python painters they
// replace. Every expected value below is either a formula copied from the
// Python source (cited by line) or a count read from the live database on
// 2026-09-14. If a template is edited and drifts from the painter it imports,
// this fails.
//
// Run: node scripts/carousel-templates/verify.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = (file) =>
  JSON.parse(readFileSync(join(root, "docs", "carousel-templates", file), "utf8"));

let checks = 0;
const failures = [];
const eq = (label, actual, expected) => {
  checks++;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures.push(`${label}: template ${JSON.stringify(actual)}, source ${JSON.stringify(expected)}`);
  }
};
const near = (label, actual, expected) => {
  checks++;
  if (Math.abs(actual - expected) > 1e-6) failures.push(`${label}: template ${actual}, source ${expected}`);
};
// A text box may override any field of its named style.
const resolved = (tpl, box) => ({ ...tpl.text_styles[box.style], ...box });

// ---------------------------------------------------------------- Glow Up
{
  const t = load("glowup.v1.json");
  const W = 1080, H = 1440; // paint_manifest.py:22
  eq("glowup canvas", [t.canvas.width, t.canvas.height], [W, H]);
  eq("glowup quad background", t.canvas.background, "#0C0A09"); // :92 RGB(12,10,9)
  eq("glowup output", t.output.format, "png"); // :103

  const cap = t.text_styles.caption;
  near("glowup wrap width", cap.wrap.width, W * 0.86); // :73
  eq("glowup line height ratio", cap.line_height.ratio, 1.2); // :73
  eq("glowup stroke", cap.stroke.width, 3); // :77
  eq("glowup shadow offset", [cap.shadow.dx, cap.shadow.dy], [2, 3]); // :76
  eq("glowup shadow is a plain copy", [cap.shadow.blur, cap.shadow.opacity, cap.shadow.stroked], [0, 1, false]);

  const ds = t.text_styles.datestamp;
  eq("glowup datestamp line step", ds.line_height.px, 66); // :85

  // Every one of the 102 manifest_v2 decks, 2026-09-14: [n, layout, font, cells].
  const live = [
    [1, "quad", 56, 4], [2, "single", 48, 1], [3, "quad", 50, 4], [4, "quad", 48, 4],
    [5, "quiz", 44, 1], [6, "quad", 50, 4], [7, "single", 42, 1],
  ];
  eq("glowup slide count", t.slides.length, live.length);
  // deck_rules.json text_field per slide
  const fields = ["hook", "before_line", "tip_face", "tip_stomach", "quiz_line", "tip_waist", "after_line"];
  const half = [
    { x: 0, y: 0, w: W / 2, h: H / 2 }, { x: W / 2, y: 0, w: W / 2, h: H / 2 },
    { x: 0, y: H / 2, w: W / 2, h: H / 2 }, { x: W / 2, y: H / 2, w: W / 2, h: H / 2 },
  ]; // :93
  for (const [n, layout, font, cells] of live) {
    const s = t.slides[n - 1];
    eq(`glowup slide ${n} n`, s.n, n);
    eq(`glowup slide ${n} layout`, s.layout, layout);
    eq(`glowup slide ${n} cells`, s.cells.length, cells);
    eq(`glowup slide ${n} main text`, [s.text[0].role, s.text[0].size], [fields[n - 1], font]);
    const at = layout === "quiz" ? 0.13 : 0.5; // :118
    eq(`glowup slide ${n} anchor`, s.text[0].anchor, { kind: "block_centre_y", at });
    if (layout === "quad") eq(`glowup slide ${n} grid`, s.cells, half);
    else eq(`glowup slide ${n} full bleed`, s.cells, [{ x: 0, y: 0, w: W, h: H }]);
  }
  const quiz = t.slides[4].text[1];
  eq("glowup quiz CTA", [quiz.role, quiz.size, quiz.anchor.at], ["quiz_cta", 40, 0.9]); // :118
  const stamp = t.slides[6].text[1];
  eq("glowup datestamp", [stamp.size, stamp.anchor], [60, { kind: "stack_right", right: 46, top: 40 }]); // :83-85
  eq("glowup datestamp only on slide 7",
    t.slides.map((s) => s.text.some((b) => b.role === "datestamp")),
    [false, false, false, false, false, false, true]);

  // deck_rules.json slides[].pools / body_pools / evidence_pools
  const pools = [
    { rule: "distinct", pools: ["cover"] },
    { rule: "one", pools: ["cover"] },
    { rule: "diagonal_pairs", body_pools: ["feature:face"], evidence_pools: ["evidence:water"] },
    { rule: "diagonal_pairs", body_pools: ["feature:stomach", "feature:waist", "body:abs"],
      evidence_pools: ["evidence:protein", "evidence:eggs", "evidence:greens", "evidence:meal_prep"] },
    { rule: "one", pools: ["quiz"] },
    { rule: "diagonal_pairs", body_pools: ["feature:waist", "body:abs", "body:gym"],
      evidence_pools: ["evidence:steps", "evidence:measure"] },
    { rule: "one", pools: ["after", "body:gym"] },
  ];
  pools.forEach((p, i) => eq(`glowup slide ${i + 1} images`, t.slides[i].images, p));
  eq("glowup luminance tolerance", t.image_rules.diagonal_pairs.luminance_tolerance, 40);

  // deck_rules.json fixed_copy
  const fixed = Object.fromEntries(t.copy_contract.filter((c) => c.fixed).map((c) => [c.role, c.fixed]));
  eq("glowup fixed copy", fixed, {
    before_line: "4 years stuck. i didn't give up a single thing.",
    after_line: "honestly the peptide was the cheat code. it helped me keep the weight off. But I wouldn't change a thing..",
    quiz_cta: "comment the word QUIZ and I will send you the link",
  });

  // Garreth, 2026-09-14: the closing line is always the fixed one.
  eq("glowup closing line is fixed",
    t.copy_contract.find((c) => c.role === "after_line").writer, "fixed");

  // Port spec §C.3: never write the value the Mac painter selects.
  eq("glowup materialises as queued", t.lane.set_on_materialise.render_status, "queued");
}

// ---------------------------------------------------------------- Covered Eye
{
  const t = load("covered-eye.v1.json");
  const W = 1080, H = 1920; // covered_eye_carousel.py DEFAULT_CANVAS
  eq("covered eye canvas", [t.canvas.width, t.canvas.height], [W, H]);
  eq("covered eye output", [t.output.format, t.output.quality], ["jpeg", 92]); // JPEG_QUALITY
  eq("covered eye fit", [t.fit.resample, t.fit.exif_transpose], ["lanczos", true]); // cover_fit
  eq("covered eye slide count", t.slides.length, 6);

  const trunc = Math.trunc; // Python int() on positive floats
  const pos = { 5: "bottom" }; // SLIDE_POS
  const scale = { 5: 0.9 }; // SLIDE_SCALE
  const expectedPools = { 1: "slide1_selfie", 2: "food", 3: "food", 4: "food", 5: "product", 6: "body" }; // SLIDE_POOLS

  for (const s of t.slides) {
    const n = s.n;
    const box = resolved(t, s.text[0]);
    const size = Math.max(12, trunc(H * 0.038 * (scale[n] ?? 1))); // draw_caption: font_px
    const lineH = trunc(size * 1.12); // CAP_LINE_SPACING
    const stroke = Math.max(2, trunc(size * 0.1)); // stroke_w, second assignment wins
    const top = trunc(H * 0.055); // CAP_TOP_FRAC
    eq(`covered eye slide ${n} role`, box.role, `slide_${n}`);
    eq(`covered eye slide ${n} size`, box.size, size);
    eq(`covered eye slide ${n} line height`, box.line_height.px, lineH);
    eq(`covered eye slide ${n} stroke`, box.stroke.width, stroke);
    eq(`covered eye slide ${n} anchor`, box.anchor,
      (pos[n] ?? "top") === "top" ? { kind: "top", y: top } : { kind: "bottom", margin: top });
    eq(`covered eye slide ${n} wrap`, box.wrap.width, W - 2 * trunc(W * 0.06)); // margin_x
    eq(`covered eye slide ${n} shadow`, [box.shadow.dx, box.shadow.dy, box.shadow.blur],
      [trunc(H * 0.003), trunc(H * 0.003), Math.max(1, trunc(H * 0.01))]);
    near(`covered eye slide ${n} shadow alpha`, box.shadow.opacity, Number((170 / 255).toFixed(4)));
    eq(`covered eye slide ${n} pool`, s.images.pools, [expectedPools[n]]);
    eq(`covered eye slide ${n} food group`, s.images.distinct_group ?? null, [2, 3, 4].includes(n) ? "food" : null);
  }
  eq("covered eye slide 1 prefers covers", t.slides[0].images.prefer_cover, true);
  eq("covered eye quote rule", t.slides[0].text[0].quote.when_hook_type, ["Jealous Friend"]); // QUOTED_HOOK_TYPES
  eq("covered eye quotes only slide 1", t.slides.slice(1).every((s) => !s.text[0].quote), true);

  const emoji = t.text_styles.caption.emoji;
  eq("covered eye emoji placement", [emoji.height_ratio, emoji.advance_extra, emoji.x_offset, emoji.y_offset_ratio],
    [1.0, 6, 3, 0.3]); // line_width, draw_caption

  // Port spec §C.3: the claim must require rendered_at to be empty.
  eq("covered eye claim", t.lane.claim.where, { status: "scripted", rendered_at: null });
}

if (failures.length) {
  console.error(`${failures.length} of ${checks} checks failed:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`All ${checks} checks pass: both templates reproduce their Python painters.`);
