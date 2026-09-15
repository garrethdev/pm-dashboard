#!/usr/bin/env node
/*
 * D11 · Studio, round two (D6 pt. 2) — slide sizes, layered templates, and a
 * third way to start: from a Figma link.
 *
 * Design step only (docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md, D11). Nothing
 * here is app code. It is D6's approved Studio with the new parts added, so
 * the D6 screen is imported and extended here rather than copied, and D6's
 * own file and canvas stay exactly as approved. Its canvas is
 * "Carousel Generator Designs - (D6 pt. 2 Studio)" (Garreth, 2026-09-15).
 *
 * Decided by Garreth before the design, 2026-09-15:
 *   - Slides are 4:5 or 9:16 only. 3:4 goes.
 *   - D5 and D6 take the type's size after D11 is approved, not in it.
 *   - The celebrity lane uses real celebrities' photos edited by AI. The
 *     designs still show invented content: "Red Carpet Rewind" is the sample
 *     type, "Celebrity A" the sample set, silhouettes the sample people.
 *
 * The layered template is drawn to describe the lane as
 * github.com/garrethdev/celebrity-peptide-renderer builds it today, at its
 * geometry on the 1080×1350 slide: slide 1 is a paper plate, a masthead, a
 * background-removed cut-out above the masthead and the hook in a black pill;
 * slides 2 and 3 are the paper, a photo in a wavy frame, a stroked line and a
 * label filled from the set; slides 4 and 5 are fixed images.
 *
 * Imported, `studioRoundTwoScreen()` is the Studio the prototype opens, in place of D6's (Garreth, 2026-09-15).
 *
 * Run directly, it writes D11's desktop review artboards and canvas.json, each twice (Dark page, Light page):
 *   Start          just opened: three cards, Start from a Figma link added
 *   FigmaPrompt    a Figma link attached to the chat box as a chip, with a prompt
 *   FigmaNoAccess  the attached link failing: No access
 *   FigmaReading   the file's five frames read on the canvas
 *   FigmaDraft     the draft beside the frames; the AI proposes the group and facts the library lacks
 *   Layers         the layers list, the masthead selected behind the cut-out
 *   CutOut         a cut-out placed freely
 *   TextOnBox      the hook on its box
 *   Frame          a photo in a shaped frame with a border
 *   SharedSet      a label filled from the set's facts
 *   Fixed          a fixed image on every deck
 *   SizeTall       Quiet Luxury Picks, a 9:16 type, from Edit template on D7
 *   SizeChange     Before & After switched from 4:5 to 9:16, which saves a new version
 *
 *   node docs/designs/carousel-generator/d11-studio-round-two.build.mjs <out dir>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { I, icon, artboard, isMain } from "./generator-kit.mjs";
import { studioScreen } from "./d6-studio.build.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const D11I = {
  figma: icon("FigmaLogo", 40, "thin"),
  figmaSm: icon("FigmaLogo", 16),
  ai: icon("Sparkle", 12),
  fwd: icon("ArrowLineUp", 16, "bold"),
  back: icon("ArrowLineDown", 16, "bold"),
  text: icon("TextT", 16),
  box: icon("Textbox", 16),
  cut: icon("User", 16),
  frame: icon("Waves", 16),
  fixed: icon("ImageSquare", 16),
  images: icon("Images", 20),
  caretDown: icon("CaretDown", 16, "bold"),
  square: icon("Square", 14, "bold"),
  circle: icon("Circle", 14, "bold"),
  wave: icon("Waves", 14, "bold"),
  upload: icon("UploadSimple", 14, "bold"),
  aiSm: icon("Sparkle", 12),
  x: icon("X", 12, "bold"),
  zoomOut: icon("Minus", 16, "bold"),
  zoomIn: icon("Plus", 16, "bold"),
};

/* ── Sample content ────────────────────────────────────────────────────── */

/* D6's photos, renamed into D11's namespace, plus a product shot for the fixed slide. The people are real photos
   (Garreth, 2026-09-15, first review: not drawn silhouettes): two before and after pairs from the store's glow-up bank,
   downsampled, and the cover's cut-out, one of those photos with its background removed. */
const D6_IMAGES = ["mug", "journal", "yoga", "oats", "shower", "dock", "vanity"];
const D6_COVERS = ["window", "mirror", "outdoor", "kitchen"];
const D11_ASSETS = ["d11-cut.png", "d11-photo-before.jpg", "d11-photo-after.jpg", "d11-photo-before2.jpg", "d11-photo-after2.jpg"];
export function copyStudioRoundTwoImages(OUT) {
  for (const id of D6_IMAGES) fs.copyFileSync(path.join(HERE, "assets", `d6-slide-${id}.jpg`), path.join(OUT, `d11-slide-${id}.jpg`));
  for (const id of D6_COVERS) fs.copyFileSync(path.join(HERE, "assets", `d6-lib-${id}.jpg`), path.join(OUT, `d11-lib-${id}.jpg`));
  fs.copyFileSync(path.join(HERE, "assets", "d5-slide-serum.jpg"), path.join(OUT, "d11-slide-serum.jpg"));
  for (const f of D11_ASSETS) fs.copyFileSync(path.join(HERE, "assets", f), path.join(OUT, f));
}

/* The layered template, at the renderer's geometry as percentages of the 1080×1350 slide. Each slide's layers are
   listed front to back, the way the layers list shows them. `src` says where a layer's content comes from: the AI
   writes it, the set supplies it, or it is fixed to the template. */
const SLIDES11 = [
  {
    n: 1, name: "Slide 1", layers: [
      { id: "s1-hook", kind: "box", name: "Hook", src: "AI", x: 3.7, y: 81.3, w: 92.6, h: 6.44 },
      { id: "s1-cut", kind: "cut", name: "Subject", src: "Set", x: 5, y: 22, w: 90, h: 78 },
      { id: "s1-mast", kind: "mast", name: "Masthead", src: "", x: 5, y: 5.5, w: 90, h: 20.7, text: "Rewind" },
      { id: "s1-paper", kind: "fixed", name: "Paper", src: "Fixed", x: 0, y: 0, w: 100, h: 100, img: "paper", file: "paper-texture.png" },
    ],
  },
  {
    n: 2, name: "Slide 2", layers: [
      { id: "s2-year", kind: "label", name: "Year", src: "Set", x: 70, y: 3, w: 26, h: 5.4, fact: "Before year" },
      { id: "s2-line", kind: "line", name: "Line", src: "AI", x: 6, y: 82.5, w: 88, h: 12 },
      { id: "s2-photo", kind: "frame", name: "Photo", src: "Set", x: 20.1, y: 13.1, w: 59.7, h: 66.9, tint: "bef", group: "Before" },
      { id: "s2-paper", kind: "fixed", name: "Paper", src: "Fixed", x: 0, y: 0, w: 100, h: 100, img: "paper", file: "paper-texture.png" },
    ],
  },
  {
    n: 3, name: "Slide 3", layers: [
      { id: "s3-year", kind: "label", name: "Year", src: "Set", x: 70, y: 3, w: 26, h: 5.4, fact: "After year" },
      { id: "s3-line", kind: "line", name: "Line", src: "AI", x: 6, y: 82.5, w: 88, h: 12 },
      { id: "s3-photo", kind: "frame", name: "Photo", src: "Set", x: 20.1, y: 13.1, w: 59.7, h: 66.9, tint: "aft", group: "After" },
      { id: "s3-paper", kind: "fixed", name: "Paper", src: "Fixed", x: 0, y: 0, w: 100, h: 100, img: "paper", file: "paper-texture.png" },
    ],
  },
  { n: 4, name: "Slide 4", fixed: true, layers: [{ id: "s4-fixed", kind: "fixed", name: "Product slide", src: "Fixed", x: 0, y: 0, w: 100, h: 100, img: "serum", file: "product-slide.png" }] },
  { n: 5, name: "Slide 5", fixed: true, layers: [{ id: "s5-fixed", kind: "fixed", name: "Closing slide", src: "Fixed", x: 0, y: 0, w: 100, h: 100, img: "vanity", file: "closing-slide.png" }] },
];

/* The draft's copy, and the Figma file's own placeholder copy. Nothing names a medication or says "the shot" (the
   lane's caption safety rules). The slide 3 line is the long one. */
const COPY11 = {
  draft: {
    "s1-hook": "Celebrity A's before and after, and the part nobody posts",
    "s2-line": "2019, the year of the red carpet photos",
    "s3-line": "2024, same smile, and a longer line to see how the wrap holds on a narrow frame",
    "s2-year": "2019",
    "s3-year": "2024",
  },
  figma: { "s1-hook": "Hook goes here", "s2-line": "Before line", "s3-line": "After line", "s2-year": "Year", "s3-year": "Year" },
};

/* What the person types beside the attached Figma link. */
const PROMPT11 =
  "Keep the file's layout and the wavy frames. Write it for Character 4's followers, calmer than the file's sample copy, and make the hook a question instead of a statement. Leave slides 4 and 5 exactly as they are in the file.";

/* Sets in the library: one per person, each with its photos and facts. */
const SETS = [
  { name: "Celebrity A", facts: "2019 · 2024" },
  { name: "Celebrity B", facts: "2017 · 2023" },
  { name: "Celebrity C", facts: "2020 · 2025" },
  { name: "Celebrity D, whose name runs long enough to wrap", facts: "2016 · 2024" },
];

/* Quiet Luxury Picks, D7's sample 9:16 type, in D6's six-slide layout. */
const QUIET = [
  ["Five quiet luxury picks under $50"],
  ["The linen shirt that looks pressed all day"],
  ["A leather card holder, no logo"],
  ["The cashmere-blend throw that made the whole living room look like it cost three times what it did"],
  ["Unscented candles in plain glass"],
  ["Quiet, not cheap", "Save this for your next order"],
];

/* ── Drawn assets: the paper and the wavy frame ── */

const svgUrl = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
const NOISE = svgUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.32  0 0 0 0 0.27  0 0 0 0 0.2  0 0 0 0.5 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`,
);
/* The wavy frame: a rectangle whose edges ripple, on a 100×140 box stretched to the frame. */
function wavePath(W = 100, H = 140, inset = 4, amp = 1.6, waves = [7, 10]) {
  const pts = [];
  const N = 60;
  const edge = (x0, y0, x1, y1, k, nx, ny) => {
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const o = amp * Math.sin(t * k * Math.PI * 2);
      pts.push(`${(x0 + (x1 - x0) * t + nx * o).toFixed(2)} ${(y0 + (y1 - y0) * t + ny * o).toFixed(2)}`);
    }
  };
  edge(inset, inset, W - inset, inset, waves[0], 0, 1);
  edge(W - inset, inset, W - inset, H - inset, waves[1], -1, 0);
  edge(W - inset, H - inset, inset, H - inset, waves[0], 0, -1);
  edge(inset, H - inset, inset, inset, waves[1], 1, 0);
  return `M${pts.join(" L")} Z`;
}
const WAVE = wavePath();
const WAVE_MASK = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" preserveAspectRatio="none"><path d="${WAVE}" fill="#000"/></svg>`);
const WAVE_BORDER = svgUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" preserveAspectRatio="none"><path d="${WAVE}" fill="none" stroke="#ffffff" stroke-width="10" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`,
);

/* ── Styles ────────────────────────────────────────────────────────────── */

function css11(phone) {
  const S = ".screen-studio";
  return `
/* ── D11 ── */
/* Slide sizes: 4:5 or 9:16 (Garreth, 2026-09-15). A 9:16 slide is narrower so it still fits the canvas's height. */
${S} .sz-45 .slide, ${S} .sz-45 .rslide { aspect-ratio: 4 / 5; }
${S} .sz-916 .slide, ${S} .sz-916 .rslide { aspect-ratio: 9 / 16; }
${S} .sz-916 .slide { width: ${phone ? 300 : 342}px; }
${S} .sz-916 .slides { padding-top: ${phone ? 72 : 96}px; }
/* The size choice, first in the adjustments on the left (Garreth, 2026-09-15, first review): two options, each with
   its shape drawn to scale and its pixels. */
${S} .sizes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 4px 16px 14px; }
${S} .szopt { display: flex; align-items: center; gap: 10px; min-width: 0; border-radius: 12px; border: 1px solid var(--border); background: var(--card-sunken); padding: 8px 10px; color: var(--text-muted); transition: border-color 150ms var(--ease), color 150ms var(--ease); }
${S} .szopt:hover { color: var(--text-primary); }
${S} .szopt[aria-checked="true"] { border-color: var(--text-primary); color: var(--text-primary); }
${S} .szglyph { display: block; flex-shrink: 0; border: 1.5px solid currentColor; border-radius: 3px; }
${S} .szg45 { width: 16px; height: 20px; }
${S} .szg916 { width: 12px; height: 21px; }
${S} .sztext { display: flex; min-width: 0; flex-direction: column; }
${S} .sztext b { font-size: 13px; line-height: 18px; font-weight: 600; }
${S} .sztext span { font-size: 11px; line-height: 14px; color: var(--text-muted); }

/* A Figma link attached to the chat box: a chip above the prompt, the way AI tools show attachments (Garreth,
   2026-09-15, first review). Once sent it stays as a small chip above the conversation's chat box. */
${S} .fchips { display: flex; flex-wrap: wrap; gap: 6px; flex-basis: 100%; order: -1; padding: 2px 2px 8px; }
${S} .ai--big:has(.fchips) { flex-wrap: wrap; }
${S} .cin .fchips { padding: 0 2px 8px; }
${S} .fchip { display: inline-flex; align-items: center; gap: 8px; min-width: 0; max-width: 100%; border-radius: 10px; border: 1px solid var(--border); background: var(--card-raised); padding: 5px 8px; font-size: 12px; line-height: 16px; }
${S} .fchip.is-err { border-color: color-mix(in srgb, var(--danger) 55%, var(--border)); }
${S} .fchip-ic { display: flex; color: var(--text-primary); }
${S} .fchip-t { display: flex; min-width: 0; align-items: baseline; gap: 6px; }
${S} .fchip-t b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
${S} .fchip-t span { white-space: nowrap; color: var(--text-muted); }
${S} .fchip-err { flex-shrink: 0; font-weight: 500; color: var(--danger); }
${S} .fchip-x { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; margin-right: -3px; border-radius: 6px; color: var(--text-muted); transition: color 150ms var(--ease), background-color 150ms var(--ease); }
${S} .fchip-x:hover { background: var(--card); color: var(--text-primary); }
/* The prompt grows with what is typed, up to eight lines, then scrolls (Garreth, 2026-09-15, second review). The
   icon tile and the buttons stay on the last line. */
${S} .ai { align-items: flex-end; }
${S} .aiin { align-items: flex-start; }
${S} .aiin textarea { position: relative; z-index: 1; display: block; width: 100%; min-width: 0; min-height: 32px; max-height: 172px; margin: 0; border: 0; padding: 6px 0; resize: none; overflow-y: auto; field-sizing: content;
  background: none; color: inherit; font: inherit; font-size: 14px; line-height: 20px; outline: none; }
${S} .ai--big .aiin textarea { font-size: 15px; }
${S} .aiin .aiph { align-items: flex-start; padding-top: 6px; }

${phone ? `/* The phone keeps D6's sideways scroll under the finger: no zoom buttons there. */
${S} .strip .zsep, ${S} .strip .zgrp { display: none; }` : `
/* The canvas pans in every direction and zooms (Garreth, 2026-09-15, third review), like Figma: the slides move as
   one layer, and the dotted ground moves and scales with them so it always reads as the same surface. */
${S} .pan { position: relative; overflow: hidden; touch-action: none;
  background-image: radial-gradient(circle, color-mix(in srgb, var(--text-muted) 30%, transparent) 1px, transparent 1.2px); }
${S} .slides { position: absolute; left: 0; top: 0; min-width: 0; min-height: 0; transform-origin: 0 0; background-image: none; will-change: transform; }
/* Zoom, at the end of the tool strip: out, the zoom level (press it to fit every slide), in. */
${S} .strip .tool { order: 0; }
${S} .strip .zsep { order: 1; width: 1px; height: 20px; margin: 0 4px; background: var(--border); }
${S} .strip .zgrp { order: 2; display: flex; align-items: center; gap: 2px; }
${S} .zpct { min-width: 52px; height: 40px; border-radius: 999px; padding: 0 8px; font-size: 13px; line-height: 20px; font-weight: 500; text-align: center; color: var(--text-muted); transition: color 150ms var(--ease), background-color 150ms var(--ease); }
${S} .zpct:hover { background: var(--card-raised); color: var(--text-primary); }
`}

/* The Figma file's frames sit in the reference's dashed frame, smaller, all five of them. */
${S} .d11-fig .rslide { width: ${phone ? 150 : 194}px; background: #d9d0bf; }

/* Layered slides: each layer is placed on the slide by percentage, in the order the layers list gives. */
${S} .d11-lay .slide { background: #d9d0bf; }
${S} .ly { position: absolute; display: block; margin: 0; border: 0; padding: 0; background: none; color: inherit; text-align: inherit; cursor: default; }
${S} .ly.can-pick { cursor: pointer; }
${S} .ly .lyph { position: absolute; inset: 0; display: block; background-repeat: no-repeat; }
${S} .fx-paper { background-color: #d9d0bf; background-image: radial-gradient(60% 40% at 18% 14%, rgba(120, 96, 64, 0.2), transparent 70%), radial-gradient(50% 35% at 86% 82%, rgba(90, 70, 50, 0.22), transparent 70%), ${NOISE}; background-size: 100% 100%, 100% 100%, 180px 180px; background-repeat: no-repeat, no-repeat, repeat; }
${S} .fx-serum { background-image: url(./d11-slide-serum.jpg); background-size: cover; background-position: center; }
${S} .fx-vanity { background-image: url(./d11-slide-vanity.jpg); background-size: cover; background-position: center; }
/* The cut-out: a photo with its background removed, bottom-anchored the way the renderer normalises its covers. */
${S} .ly--cut .lyph.cutimg { background-image: url(./d11-cut.png); background-size: contain; background-position: 50% 100%; }
/* A shaped frame: the photo cover-cropped and clipped to the wave, the border drawn on the same wave above it. */
${S} .ly--frame .lyph { background-size: cover; background-position: 50% 30%; background-color: #2a2521; -webkit-mask-image: ${WAVE_MASK}; mask-image: ${WAVE_MASK}; -webkit-mask-size: 100% 100%; mask-size: 100% 100%; }
${S} .ph-bef { background-image: url(./d11-photo-before.jpg); }
${S} .ph-aft { background-image: url(./d11-photo-after.jpg); }
${S} .ly--frame .lybd { position: absolute; inset: 0; background-image: ${WAVE_BORDER}; background-size: 100% 100%; background-repeat: no-repeat; pointer-events: none; }
/* Text layers. Sizes are the renderer's pixels on the 1080-wide slide: hook 48, line and label 42 with a 4 px stroke. */
${S} .ly .lyt { display: block; width: 100%; overflow-wrap: anywhere; text-wrap: balance; }
${S} .ly--mast { display: flex; align-items: center; justify-content: center; }
${S} .ly--mast .lyt { font-size: 18cqw; line-height: 0.9; font-weight: 700; font-style: italic; letter-spacing: -0.04em; text-align: center; color: #1d1a16; }
/* Text on a box: the solid container behind the hook, its colour and padding (Garreth, 2026-09-15). */
${S} .ly--box { display: flex; align-items: center; justify-content: center; border-radius: 1.3cqw; padding: 0 2.6cqw; background: #000000; }
${S} .ly--box.box-off { background: none; }
${S} .ly--box .lyt { font-size: 4.44cqw; line-height: 1.15; font-weight: 700; text-align: center; color: #ffffff; }
${S} .ly--line, ${S} .ly--label { display: flex; align-items: center; }
${S} .ly--line .lyt, ${S} .ly--label .lyt { font-size: 3.89cqw; line-height: 1.18; font-weight: 700; color: #ffffff; -webkit-text-stroke: 0.37cqw #000000; paint-order: stroke fill; }
${S} .ly--line .lyt { text-align: center; }
${S} .ly--label .lyt { text-align: right; }
/* A layer whose group has no images yet: D6's empty cell, on the layer. */
${S} .ly.is-empty .lyno { position: absolute; inset: 6% 6% 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5cqw; border-radius: 2cqw 2cqw 0 0; border: 1px dashed rgba(255, 255, 255, 0.35); border-bottom: 0;
  background: rgba(26, 26, 28, 0.86); color: rgba(255, 255, 255, 0.72); font-size: 3.6cqw; line-height: 1.2; font-weight: 500; }
${S} .ly.is-empty .lyno svg { width: 6cqw; height: 6cqw; }
/* Selected: D6's dashed outline, tag and handles. A full-slide layer keeps them inside the slide; a label at the top
   hangs its tag below. */
${S} .ly.is-sel { outline: 1px dashed var(--accent); outline-offset: 4px; }
${S} .ly--fixed.is-sel { outline-offset: -4px; }
${S} .ly--fixed .tag { top: 12px; left: 12px; bottom: auto; }
${S} .ly--label .tag { top: calc(100% + 10px); bottom: auto; left: auto; right: -6px; }

/* The layers list, at the top of the adjustments (new, for review). Front first; Bring forward and Send back move
   the selected layer one place. */
${S} .sech .lycnt { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .sech .lybtn { width: 28px; height: 28px; border-radius: 8px; }
${S} .sech .lybtn:hover:not(:disabled) { background: var(--card-raised); }
${S} .sech .lybtn:disabled { opacity: 0.3; cursor: not-allowed; }
${S} .lylist { display: flex; flex-direction: column; gap: 2px; padding: 2px 8px 10px; }
${S} .lyrow { display: flex; align-items: center; gap: 10px; width: 100%; border-radius: 12px; padding: 6px 10px; font-size: 13px; line-height: 20px; font-weight: 500; transition: background-color 150ms var(--ease); }
${S} .lyrow:hover { background: color-mix(in srgb, var(--text-primary) 6%, transparent); }
${S} .lyrow.is-on { background: color-mix(in srgb, var(--text-primary) 9%, transparent); }
${S} .lyrow .lyic { display: flex; color: var(--text-muted); }
${S} .lyrow.is-on .lyic { color: var(--text-primary); }
${S} .lyrow .lyn { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${S} .lyrow .pill { font-size: 11px; padding: 0 8px; }
/* A fixed image's file. */
${S} .fxfile { display: flex; flex: 1; min-width: 0; align-items: center; gap: 8px; }
${S} .fxfile .tile { width: 28px; height: 28px; border-radius: 6px; background-size: cover; background-position: center; }
${S} .fxfile .libname { font-size: 12px; }

/* The library as sets: one row per person, the cut-out, before and after as three tiles, the facts under the name. */
${S} .d11-lay #sec-library { display: none; }
${S} .sets { display: flex; flex-direction: column; gap: 2px; padding: 8px 8px 4px; }
${S} .setrow { display: flex; align-items: center; gap: 12px; width: 100%; border-radius: 12px; padding: 8px; transition: background-color 150ms var(--ease); }
${S} .setrow:hover { background: color-mix(in srgb, var(--text-primary) 6%, transparent); }
${S} .setrow.is-on { background: color-mix(in srgb, var(--text-primary) 5%, transparent); }
${S} .trio { display: flex; gap: 3px; flex-shrink: 0; }
${S} .trio i { display: block; width: 22px; height: 28px; border-radius: 5px; background-repeat: no-repeat; background-position: 50% 30%; background-size: cover; background-color: var(--card-raised); }
${S} .trio .t-cut { background-image: url(./d11-cut.png); background-color: #d9d0bf; background-size: 90% auto; background-position: 50% 100%; }
${S} .trio .t-bef.p1 { background-image: url(./d11-photo-before.jpg); }
${S} .trio .t-aft.p1 { background-image: url(./d11-photo-after.jpg); }
${S} .trio .t-bef.p2 { background-image: url(./d11-photo-before2.jpg); }
${S} .trio .t-aft.p2 { background-image: url(./d11-photo-after2.jpg); }
${S} .trio .is-none { background-image: none; background-color: var(--card-sunken); border: 1px dashed var(--border); }
${S} .d11tile { background-image: url(./d11-cut.png); background-color: #d9d0bf; background-size: 80% auto; background-position: 50% 100%; background-repeat: no-repeat; }

/* The AI proposing what the library lacks (new, for review): what it needs, as a short list, and one button. */
${S} .gprop { display: flex; flex-direction: column; gap: 6px; width: 100%; border-radius: 12px; border: 1px solid var(--border); background: var(--card-sunken); padding: 8px 10px; }
${S} .gprow { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; line-height: 18px; }
${S} .gprow b { font-weight: 500; }
${S} .gprow .pill { font-size: 11px; padding: 0 8px; }
${S} .fcap .pill { font-size: 11px; padding: 0 8px; }
`;
}

/* ── Markup ────────────────────────────────────────────────────────────── */

/* A layered slide's face. `p` is the slide item; `pick` makes its layers selectable. */
const layerFace = (p, pick) => {
  const open = pick
    ? `<button type="button" class="ly {{ly.cls}}" style="left: {{ly.x}}%; top: {{ly.y}}%; width: {{ly.w}}%; height: {{ly.h}}%; z-index: {{ly.z}}" aria-label="{{ly.label}}" aria-pressed="{{ly.pressed}}" onClick="{{ly.pick}}">`
    : `<span class="ly {{ly.cls}}" style="left: {{ly.x}}%; top: {{ly.y}}%; width: {{ly.w}}%; height: {{ly.h}}%; z-index: {{ly.z}}" aria-hidden="true">`;
  return `
                <sc-for list="{{${p}.layers}}" as="ly" hint-placeholder-count="3">
                  ${open}
                    <sc-if value="{{ly.photo}}" hint-placeholder-val="{{ true }}"><span class="lyph {{ly.photoCls}}"></span></sc-if>
                    <sc-if value="{{ly.frame}}" hint-placeholder-val="{{ false }}"><span class="lybd"></span></sc-if>
                    <sc-if value="{{ly.hasText}}" hint-placeholder-val="{{ false }}"><span class="lyt">{{ly.text}}</span></sc-if>
                    <sc-if value="{{ly.empty}}" hint-placeholder-val="{{ false }}"><span class="lyno">${D11I.images}<span>No images</span></span></sc-if>
                    ${
                      pick
                        ? `<sc-if value="{{ly.sel}}" hint-placeholder-val="{{ false }}"><span class="tag">{{ly.tag}}</span></sc-if><sc-if value="{{ly.handles}}" hint-placeholder-val="{{ false }}"><i class="h h-tl"></i><i class="h h-t"></i><i class="h h-tr"></i><i class="h h-l"></i><i class="h h-r"></i><i class="h h-bl"></i><i class="h h-b"></i><i class="h h-br"></i></sc-if>`
                        : ""
                    }
                  ${pick ? "</button>" : "</span>"}
                </sc-for>`;
};

/* A number in the adjustments, drawn as D6's stepper. */
const stepper = (val, label, unit = "", cls = "") =>
  `<div class="stepper ${cls}"><button type="button" class="stepbtn" aria-label="Decrease ${label}">${I.minus}</button><span class="stepval tnum">${val}${unit ? `<small>${unit}</small>` : ""}</span><button type="button" class="stepbtn" aria-label="Increase ${label}">${I.plus}</button></div>`;
const seg = (label, opts, extra = "") =>
  `<div class="seg ${extra}" role="radiogroup" aria-label="${label}">${opts.map(([text, on, aria]) => `<button type="button" role="radio" aria-checked="${on}"${aria ? ` aria-label="${aria}"` : ""}>${text}</button>`).join("")}</div>`;
const swatches = (label, white) =>
  `<span class="seg" role="radiogroup" aria-label="${label}" style="gap: 6px; padding: 2px 6px"><button type="button" class="sw" role="radio" aria-label="Black" aria-checked="${!white}"><i style="background: #000000"></i></button><button type="button" class="sw" role="radio" aria-label="White" aria-checked="${white}"><i style="background: #ffffff"></i></button></span>`;
const row = (label, ctl, cls = "") => `<div class="irow ${cls}"><span class="ilabel">${label}</span><div class="ictl">${ctl}</div></div>`;
const dd = (value) => `<button type="button" class="dd" aria-haspopup="listbox">${value}${D11I.caretDown}</button>`;

/* The layers list, then the settings for a selected cut-out, frame or fixed image. (A selected text layer uses D6's
   text box settings, with D11's rows added at their top.) */
const layerSections = () => `
              <sc-if value="{{d11ready}}" hint-placeholder-val="{{ true }}">
                <div class="sec" aria-label="Slide size">
                  <div class="sech"><b>Slide size</b></div>
                  <div class="sizes" role="radiogroup" aria-label="Slide size">
                    <button type="button" class="szopt" role="radio" aria-checked="{{d11is45}}" onClick="{{d11to45}}"><span class="szglyph szg45" aria-hidden="true"></span><span class="sztext"><b class="tnum">4:5</b><span class="tnum">1080×1350</span></span></button>
                    <button type="button" class="szopt" role="radio" aria-checked="{{d11is916}}" onClick="{{d11to916}}"><span class="szglyph szg916" aria-hidden="true"></span><span class="sztext"><b class="tnum">9:16</b><span class="tnum">1080×1920</span></span></button>
                  </div>
                </div>
              </sc-if>
              <sc-if value="{{d11lay}}" hint-placeholder-val="{{ false }}">
                <div class="sec" aria-label="Layers">
                  <div class="sech">
                    <b>Layers</b><span class="lycnt tnum">{{d11slideName}}</span>
                    <button type="button" class="icon-btn lybtn" aria-label="Bring forward" title="Bring forward" disabled="{{d11fwdOff}}" onClick="{{d11fwd}}">${D11I.fwd}</button>
                    <button type="button" class="icon-btn lybtn" aria-label="Send back" title="Send back" disabled="{{d11backOff}}" onClick="{{d11back}}">${D11I.back}</button>
                  </div>
                  <div class="lylist" role="listbox" aria-label="Layers, front to back">
                    <sc-for list="{{d11rows}}" as="r" hint-placeholder-count="4">
                      <button type="button" class="lyrow {{r.cls}}" role="option" aria-selected="{{r.selected}}" onClick="{{r.pick}}">
                        <span class="lyic">
                          <sc-if value="{{r.isText}}" hint-placeholder-val="{{ true }}">${D11I.text}</sc-if>
                          <sc-if value="{{r.isBox}}" hint-placeholder-val="{{ false }}">${D11I.box}</sc-if>
                          <sc-if value="{{r.isCut}}" hint-placeholder-val="{{ false }}">${D11I.cut}</sc-if>
                          <sc-if value="{{r.isFrame}}" hint-placeholder-val="{{ false }}">${D11I.frame}</sc-if>
                          <sc-if value="{{r.isFixed}}" hint-placeholder-val="{{ false }}">${D11I.fixed}</sc-if>
                        </span>
                        <span class="lyn">{{r.name}}</span>
                        <sc-if value="{{r.hasSrc}}" hint-placeholder-val="{{ true }}"><span class="pill {{r.srcCls}}">{{r.src}}</span></sc-if>
                      </button>
                    </sc-for>
                  </div>
                </div>
                <sc-if value="{{d11selCut}}" hint-placeholder-val="{{ false }}">
                  <div class="sec" aria-label="Settings for the selected cut-out">
                    <div class="sech"><b>{{d11selTitle}}</b><span class="pill">Cut-out</span></div>
                    ${row("Draws from", dd("Set · Cover cut-out"))}
                    ${row("Background", seg("Background", [["Keep", false], ["Removed", true]]))}
                    ${row("Height", stepper(1020, "height", "px"))}
                    ${row(`Position`, `<span class="ilabel"><span class="opt">X</span></span>${stepper(0, "left", "px", "sm")}<span class="ilabel"><span class="opt">Y</span></span>${stepper(330, "top", "px", "sm")}`, "last")}
                  </div>
                </sc-if>
                <sc-if value="{{d11selFrame}}" hint-placeholder-val="{{ false }}">
                  <div class="sec" aria-label="Settings for the selected frame">
                    <div class="sech"><b>{{d11selTitle}}</b><span class="pill">Shaped frame</span></div>
                    ${row("Draws from", dd("{{d11drawsFrom}}"))}
                    ${row("Shape", seg("Shape", [[D11I.square, false, "Rectangle"], [D11I.circle, false, "Oval"], [D11I.wave, true, "Wave"]], "icons"))}
                    ${row("Border", `${swatches("Border colour", true)}${stepper(12, "border width", "px", "sm")}`)}
                    ${row("Fit", seg("Fit", [["Fill", true], ["Fit", false]]))}
                    ${row("Crop", seg("Crop", [["Top", false], ["Centre", true], ["Bottom", false]]), "last")}
                  </div>
                </sc-if>
                <sc-if value="{{d11selFixed}}" hint-placeholder-val="{{ false }}">
                  <div class="sec" aria-label="Settings for the selected fixed image">
                    <div class="sech"><b>{{d11selTitle}}</b><span class="pill">Fixed image</span></div>
                    ${row("Image", `<span class="fxfile"><span class="tile {{d11fileCls}}" aria-hidden="true"></span><span class="libname" title="{{d11file}}">{{d11file}}</span></span><button type="button" class="tbtn" onClick="{{d11replace}}">Replace</button>`)}
                    ${row("Fit", seg("Fit", [["Fill", true], ["Fit", false]]), "last")}
                  </div>
                </sc-if>
              </sc-if>`;

/* Rows D11 adds to the top of D6's text box settings: who writes it, the set's fact, and the box behind it. */
const textRows = () => `
                <sc-if value="{{d11tx}}" hint-placeholder-val="{{ false }}">
                  <div class="irow">
                    <span class="ilabel">Written by</span>
                    <div class="ictl"><div class="seg" role="radiogroup" aria-label="Written by"><button type="button" role="radio" aria-checked="{{d11byAi}}" onClick="{{d11toAi}}">AI</button><button type="button" role="radio" aria-checked="{{d11bySet}}" onClick="{{d11toSet}}">Set</button></div></div>
                  </div>
                  <sc-if value="{{d11bySetOn}}" hint-placeholder-val="{{ false }}">${row("Fact", dd("{{d11fact}}"), "sub")}</sc-if>
                  <div class="irow">
                    <span class="ilabel">Box</span>
                    <div class="ictl">
                      <sc-if value="{{d11boxOn}}" hint-placeholder-val="{{ false }}">${swatches("Box colour", false)}</sc-if>
                      <div class="seg" role="radiogroup" aria-label="Box"><button type="button" role="radio" aria-checked="{{d11boxOffC}}" onClick="{{d11boxOff}}">Off</button><button type="button" role="radio" aria-checked="{{d11boxOnC}}" onClick="{{d11boxOnFn}}">On</button></div>
                    </div>
                  </div>
                  <sc-if value="{{d11boxOn}}" hint-placeholder-val="{{ false }}">
                    <div class="irow sub"><span class="ilabel"><span class="opt">Padding</span></span><div class="ictl">${stepper(28, "box padding", "px", "sm")}<span class="ilabel"><span class="opt">Corners</span></span>${stepper(14, "box corners", "px", "sm")}</div></div>
                  </sc-if>
                </sc-if>`;

/* The library as sets, in place of D6's groups of loose images. */
const setsSection = () => `
              <sc-if value="{{d11lay}}" hint-placeholder-val="{{ false }}">
                <div class="sec" aria-label="Image library">
                  <div class="lhead">
                    <span class="tile d11tile" aria-hidden="true"></span>
                    <span class="libtext"><span class="libname">Red Carpet Sets</span><span class="libmeta tnum">24 sets</span></span>
                  </div>
                  <div class="gpills" role="radiogroup" aria-label="Group">
                    <sc-for list="{{d11gp}}" as="g" hint-placeholder-count="4">
                      <button type="button" class="{{g.cls}}" role="radio" aria-checked="{{g.checked}}">{{g.name}} <b class="tnum">{{g.count}}</b></button>
                    </sc-for>
                  </div>
                  <div class="sets" role="radiogroup" aria-label="Sample set">
                    <sc-for list="{{d11sets}}" as="st" hint-placeholder-count="4">
                      <button type="button" class="setrow {{st.cls}}" role="radio" aria-checked="{{st.checked}}" onClick="{{st.pick}}">
                        <span class="trio" aria-hidden="true"><i class="t-cut {{st.cutCls}}"></i><i class="t-bef {{st.pair}}"></i><i class="t-aft {{st.pair}}"></i></span>
                        <span class="libtext"><span class="libname" title="{{st.name}}">{{st.name}}</span><span class="libmeta tnum">{{st.facts}}</span></span>
                        <span class="optcheck"><sc-if value="{{st.on}}" hint-placeholder-val="{{ false }}">${I.check}</sc-if></span>
                      </button>
                    </sc-for>
                  </div>
                  <div class="lnew">
                    <button type="button" class="btn2" onClick="{{d11upload}}">${D11I.upload}Upload images</button>
                    <button type="button" class="btn2" onClick="{{d11generate}}">${D11I.aiSm}Generate with AI</button>
                  </div>
                </div>
              </sc-if>`;

/* Swap one exact piece of D6's markup, and fail the build if D6 no longer has it. */
function swap(html, find, replace, { optional = false, all = false } = {}) {
  if (!html.includes(find)) {
    if (optional) return html;
    throw new Error(`D11: D6's markup no longer contains ${JSON.stringify(find.slice(0, 80))}`);
  }
  return all ? html.split(find).join(replace) : html.replace(find, () => replace);
}

/* Shared by the conversation on the desktop and the phone: the AI's proposal of what the library lacks. */
const proposal = `<sc-if value="{{m.groups}}" hint-placeholder-val="{{ false }}"><div class="msg msg--ai"><span class="aiv" aria-hidden="true">${D11I.ai}</span><span class="bub is-offer"><span>{{m.text}}</span><span class="gprop"><sc-for list="{{m.items}}" as="gi" hint-placeholder-count="4"><span class="gprow"><b>{{gi.name}}</b><span class="pill {{gi.cls}}">{{gi.kind}}</span></span></sc-for></span><span class="offer"><button type="button" class="btn2" onClick="{{m.create}}">{{m.button}}</button></span></span></div></sc-if>`;

/* The attached Figma link: in the chat box before sending, with its remove button; above the conversation's chat box
   after, as an indicator. */
const bigChip = `<sc-if value="{{d11chipBig}}" hint-placeholder-val="{{ false }}"><div class="fchips"><span class="fchip {{d11chipCls}}"><span class="fchip-ic" aria-hidden="true">${D11I.figmaSm}</span><span class="fchip-t"><b title="{{d11chipName}}">{{d11chipName}}</b><span class="tnum">{{d11chipMeta}}</span></span><sc-if value="{{d11chipErr}}" hint-placeholder-val="{{ false }}"><span class="fchip-err" role="alert">No access</span></sc-if><button type="button" class="fchip-x" aria-label="Remove the Figma link" onClick="{{d11chipRemove}}">${D11I.x}</button></span></div></sc-if>`;
const smallChip = `<sc-if value="{{d11chipSmall}}" hint-placeholder-val="{{ false }}"><div class="fchips"><span class="fchip" aria-label="Figma link attached, {{d11chipName}}"><span class="fchip-ic" aria-hidden="true">${D11I.figmaSm}</span><span class="fchip-t"><b>{{d11chipName}}</b><span class="tnum">{{d11chipMeta}}</span></span></span></div></sc-if>`;

function patchMarkup(html, phone) {
  let out = html;
  /* The third card. */
  out = swap(
    out,
    "<b>Discuss your idea</b></button>",
    `<b>Discuss your idea</b></button>
              <button type="button" class="start" onClick="{{startFigma}}"><span class="ico">${D11I.figma}</span><b>Start from a Figma link</b></button>`,
  );
  /* The Figma link rides in D6's chat box, above the prompt. */
  out = swap(out, `<div class="ai ai--big {{cinCls}}">`, `<div class="ai ai--big {{cinCls}}">${bigChip}`);
  out = swap(out, `<div class="studio">`, `<div class="studio {{d11studioCls}}">`);
  /* Pan and zoom: the view moves the slides layer and the dotted ground together. */
  out = swap(out, `class="pan {{panCls}}" id="d6-pan"`, `class="pan {{panCls}}" id="d6-pan" style="background-position: {{d11bgPos}}; background-size: {{d11bgSize}}"`);
  out = swap(out, `<div class="slides">`, `<div class="slides" style="transform: translate({{d11vx}}px, {{d11vy}}px) scale({{d11vz}})">`);
  out = swap(
    out,
    `<div class="fstrip strip" role="toolbar" aria-label="Tools">`,
    `<div class="fstrip strip" role="toolbar" aria-label="Tools">
                  <span class="zsep" aria-hidden="true"></span>
                  <span class="zgrp">
                    <button type="button" class="tool" aria-label="Zoom out" title="Zoom out" onClick="{{d11zoomOut}}">${D11I.zoomOut}</button>
                    <button type="button" class="zpct tnum" aria-label="Zoom to fit, now {{d11zoomPct}}" title="Zoom to fit" onClick="{{d11fit}}">{{d11zoomPct}}</button>
                    <button type="button" class="tool" aria-label="Zoom in" title="Zoom in" onClick="{{d11zoomIn}}">${D11I.zoomIn}</button>
                  </span>`,
  );
  /* The reference's frame names what it holds: a saved deck, or a Figma file. */
  out = swap(out, `<span>Reference</span><b title="{{refName}}">`, `<span>{{refKind}}</span><b title="{{refName}}">`);
  out = swap(out, `</span>Analysing</span>`, `</span>{{refBusyText}}</span>`);
  out = swap(out, `Analysing the reference</span>`, `{{analysingText}}</span>`);
  out = swap(out, `<div class="rslide {{rs.cls}}" aria-hidden="true">`, `<div class="rslide {{rs.cls}}" aria-hidden="true"><sc-if value="{{rs.layered}}" hint-placeholder-val="{{ false }}">${layerFace("rs", false)}</sc-if>`);
  out = swap(out, `onClick="{{sl.pick}}">`, `onClick="{{sl.pick}}"><sc-if value="{{sl.layered}}" hint-placeholder-val="{{ false }}">${layerFace("sl", !phone)}</sc-if>`);
  out = swap(out, `<b class="tnum">{{sl.name}}</b>`, `<b class="tnum">{{sl.name}}</b><sc-if value="{{sl.fixed}}" hint-placeholder-val="{{ false }}"><span class="pill">Fixed</span></sc-if>`);
  /* The adjustments panel and the conversation exist only on the desktop's page. */
  return patchPanels(out, phone);
}

/* The adjustments and the conversation: on the desktop's page, or in the phone's sheets. */
function patchPanels(html, optional) {
  let out = html;
  /* The chat box's one-line input becomes a text area that grows with the prompt. */
  out = swap(
    out,
    `<input type="text" aria-label="Message" value="{{cinVal}}" onChange="{{cinType}}" onKeyDown="{{cinKey}}" />`,
    `<textarea aria-label="Message" rows="1" value="{{cinVal}}" onChange="{{cinType}}" onKeyDown="{{cinKey}}"></textarea>`,
    { optional, all: true },
  );
  out = swap(out, `<div class="cin">`, `<div class="cin">${smallChip}`, { optional, all: true });
  out = swap(out, `<div class="sbody">`, `<div class="sbody">${layerSections()}`, { optional });
  out = swap(out, `<div class="sec" id="sec-library"`, `${setsSection()}\n              <div class="sec" id="sec-library"`, { optional });
  out = swap(out, `<span class="pill">Text box</span></div>`, `<span class="pill">Text box</span></div>${textRows()}`, { optional });
  out = swap(out, `Upload images</button></span></span></div></sc-if>`, `Upload images</button></span></span></div></sc-if>${proposal}`, { optional, all: true });
  return out;
}

/* ── Behaviour ─────────────────────────────────────────────────────────── */

/* After D6's own update step: a request to bring a slide into view becomes a move of the view rather than a scroll,
   and the canvas takes a wheel listener that can stop the page zooming (a pinch arrives as Ctrl with the wheel). */
const didUpdate11 = `
    var pan11 = document.getElementById("d6-pan");
    if (st.d6panTo && pan11) {
      pan11.scrollLeft = 0; pan11.scrollTop = 0;
      var v11 = st.d11view || { x: 0, y: 0, z: 1 };
      this.setState({ d11view: { x: -st.d6panTo.x, y: v11.y, z: v11.z } });
    }
    if (pan11 && !pan11.d11wheel) {
      pan11.d11wheel = true;
      var comp11 = this;
      pan11.addEventListener("wheel", function (e) { if (!comp11.d11wheel) return; e.preventDefault(); comp11.d11wheel(e); }, { passive: false });
    }`;

function vals11(d6vals) {
  return `
    var D6V = (function () {${d6vals}
    })();
    var PHONE = ctx.PHONE;
    var SLIDES11 = ${JSON.stringify(SLIDES11)};
    var COPY11 = ${JSON.stringify(COPY11)};
    var SETS = ${JSON.stringify(SETS)};
    var QUIET = ${JSON.stringify(QUIET)};
    var PROMPT11 = ${JSON.stringify(PROMPT11)};
    var stage = s.d6stage;
    var ready = stage === "ready";
    var analysing = stage === "analysing";
    var edit = s.d6mode === "edit";
    var FIG = !edit && s.d6entry === "figma";
    var LAY = !!s.d11lay;
    var size = s.d11size || "45";
    var slide = Math.max(1, Math.min(LAY ? SLIDES11.length : 6, s.d6slide || 1));
    var selId = LAY && ready ? (s.d11sel || null) : null;
    var order = s.d11order || {};
    var byId = {};
    SLIDES11.forEach(function (sd) { sd.layers.forEach(function (l) { byId[l.id] = Object.assign({ slide: sd.n }, l); }); });
    var orderOf = function (sd) { return order[sd.n] || sd.layers.map(function (l) { return l.id; }); };
    var pickLayer = function (n, id) { return function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.setState({ d6slide: n, d11sel: id, d6vers: false }); }; };

    /* A layered slide's layers, back to front by the order the list keeps. */
    var faceOf = function (sd, live, fromFigma) {
      var ids = orderOf(sd);
      return ids.map(function (id, i) {
        var l = byId[id];
        var sel = live && id === selId;
        var empty = !fromFigma && !!s.d11cutEmpty && l.kind === "cut";
        var copy = fromFigma ? COPY11.figma : COPY11.draft;
        return {
          x: l.x, y: l.y, w: l.w, h: l.h, z: ids.length - i,
          cls: ["ly--" + l.kind, sel ? "is-sel" : "", live ? "can-pick" : "", empty ? "is-empty" : "", l.kind === "box" && s.d11box === false ? "box-off" : ""].join(" "),
          label: l.name + (l.src ? ", " + l.src : ""),
          pressed: sel ? "true" : "false",
          pick: live ? pickLayer(sd.n, id) : function () {},
          photo: !empty && (l.kind === "cut" || l.kind === "frame" || l.kind === "fixed"),
          photoCls: l.kind === "fixed" ? "fx-" + l.img : l.kind === "frame" ? "ph-" + l.tint : "cutimg",
          frame: l.kind === "frame",
          hasText: l.kind === "box" || l.kind === "mast" || l.kind === "line" || l.kind === "label",
          text: l.text || copy[id] || "",
          empty: empty,
          sel: sel,
          handles: sel && l.kind !== "fixed",
          tag: l.name
        };
      });
    };

    var slidesAll = D6V.slidesAll.map(function (sl, i) {
      var out = Object.assign({}, sl, { layered: false, fixed: false });
      if (edit && s.d11flat === "quiet") out.boxes = sl.boxes.map(function (b, j) { return Object.assign({}, b, { text: (QUIET[i] || [])[j] || b.text }); });
      return out;
    });
    if (LAY) {
      slidesAll = analysing ? [] : SLIDES11.map(function (sd) {
        return {
          n: sd.n, name: sd.name, label: sd.name + (sd.n === slide ? ", selected" : ""),
          sk: !ready, real: ready, cls: sd.n === slide ? "is-on" : "",
          rBusy: false, rDone: false, rFail: false, retry: function () {},
          drop: function (e) { e.preventDefault(); },
          pick: (function (k) { return function () { if (ready) self.setState({ d6slide: k, d11sel: null }); }; })(sd.n),
          cells: [], boxes: [], fixed: !!sd.fixed, layered: ready, layers: ready ? faceOf(sd, true, false) : []
        };
      });
    }

    /* Opening on a Figma draft: the canvas scrolls past the file's frames to the slide in view, leaving the last
       frames beside the draft when the conversation is open. */
    if (LAY && ready && FIG && !self.d11panned) {
      self.d11panned = true;
      var chatWas = !!s.d6chatOpen;
      setTimeout(function () {
        var pan = document.getElementById("d6-pan");
        var fr = document.querySelectorAll(".sframe")[slide - 1];
        if (!pan || !fr) return;
        var v0 = (self.state || {}).d11view || { x: 0, y: 0, z: 1 };
        var x = v0.x - (fr.getBoundingClientRect().left - pan.getBoundingClientRect().left) + (chatWas ? 470 : 64);
        self.setState({ d11view: { x: Math.round(x), y: v0.y, z: v0.z } });
      }, 90);
    }

    /* The view: where the slides layer sits and how far it is zoomed. Dragging the ground or scrolling pans it in
       any direction; Ctrl or Cmd with the wheel (a trackpad pinch sends the same) zooms around the pointer; the strip's
       buttons zoom around the middle, and the zoom level fits every slide. */
    var view = s.d11view || { x: 0, y: 0, z: 1 };
    var ZMIN = 0.25, ZMAX = 2;
    var clampZ = function (z) { return Math.max(ZMIN, Math.min(ZMAX, z)); };
    var viewNow = function () { return (self.state || {}).d11view || { x: 0, y: 0, z: 1 }; };
    var zoomAt = function (px, py, nz) {
      var v = viewNow(); nz = clampZ(nz);
      self.setState({ d11view: { x: px - (px - v.x) * (nz / v.z), y: py - (py - v.y) * (nz / v.z), z: nz } });
    };
    var zoomMiddle = function (factor) {
      var pan = document.getElementById("d6-pan");
      if (!pan) return;
      zoomAt(pan.clientWidth / 2, pan.clientHeight / 2, viewNow().z * factor);
    };
    var fitAll = function () {
      var pan = document.getElementById("d6-pan");
      var layer = pan && pan.querySelector(".slides");
      if (!layer) return;
      var W = pan.clientWidth, H = pan.clientHeight, w = layer.offsetWidth, h = layer.offsetHeight;
      var z = clampZ(Math.min(1, W / w, H / h));
      self.setState({ d11view: { x: Math.round((W - w * z) / 2), y: Math.round((H - h * z) / 2), z: z } });
    };
    self.d11wheel = PHONE ? null : function (e) {
      var v = viewNow();
      if (e.ctrlKey || e.metaKey) {
        var pan = document.getElementById("d6-pan");
        var r = pan.getBoundingClientRect();
        zoomAt(e.clientX - r.left, e.clientY - r.top, v.z * Math.exp(-e.deltaY * 0.01));
      } else {
        self.setState({ d11view: { x: v.x - e.deltaX, y: v.y - e.deltaY, z: v.z } });
      }
    };
    /* The wheel listener must be able to stop the page itself zooming, so it is attached once the canvas exists. */
    if (!self.d11mounted) { self.d11mounted = true; setTimeout(function () { self.setState({ d11tick: 1 }); }, 30); }
    var panDown11 = function (e) {
      if (e.button !== 0) return;
      if (e.target && e.target.closest && e.target.closest(".slide")) return;
      var v = viewNow();
      self.d11drag = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y };
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
      self.setState({ d6panning: true });
    };
    var panMove11 = function (e) {
      var g = self.d11drag; if (!g) return;
      self.setState({ d11view: { x: g.vx + e.clientX - g.x, y: g.vy + e.clientY - g.y, z: viewNow().z } });
    };
    var panUp11 = function () { if (self.d11drag) { self.d11drag = null; self.setState({ d6panning: false }); } };

    /* The selected layer, and the list it sits in. */
    var sdOn = SLIDES11[slide - 1] || SLIDES11[0];
    var ids = orderOf(sdOn);
    var selL = selId ? byId[selId] : null;
    var si = selL ? ids.indexOf(selId) : -1;
    var move = function (by) {
      return function () {
        if (si < 0) return;
        var j = si + by;
        if (j < 0 || j >= ids.length) return;
        var next = ids.slice(); var t = next[si]; next[si] = next[j]; next[j] = t;
        var o = Object.assign({}, order); o[sdOn.n] = next;
        self.setState({ d11order: o });
      };
    };
    var rows = ids.map(function (id) {
      var l = byId[id]; var on = id === selId;
      return {
        name: l.name, src: l.src, hasSrc: !!l.src, srcCls: l.src === "Set" ? "pill--accent" : "",
        cls: on ? "is-on" : "", selected: on ? "true" : "false",
        isText: l.kind === "mast" || l.kind === "line" || l.kind === "label", isBox: l.kind === "box", isCut: l.kind === "cut", isFrame: l.kind === "frame", isFixed: l.kind === "fixed",
        pick: pickLayer(sdOn.n, id)
      };
    });
    var isText = !!selL && (selL.kind === "box" || selL.kind === "line" || selL.kind === "label");
    var bySet = !!selL && (s.d11by ? s.d11by[selL.id] === "set" : false) || (!!selL && selL.src === "Set" && !(s.d11by && s.d11by[selL.id] === "ai"));
    var setBy = function (v) { return function () { if (!selL) return; var b = Object.assign({}, s.d11by || {}); b[selL.id] = v; self.setState({ d11by: b }); }; };
    var boxOn = !!selL && selL.kind === "box" && s.d11box !== false;
    var styleFor = function (l) {
      if (!l) return {};
      var big = l.kind === "box";
      var align = l.kind === "label" ? "right" : "centre";
      return {
        title: "Slide " + l.slide + " · " + l.name,
        font: "General Sans", weight: "Bold", size: big ? 48 : 42, stroke: big ? 0 : 4,
        strokeBlack: "true", strokeWhite: "false",
        shOff: "true", shHard: "false", shSoft: "false", shOn: false, shSoftOn: false,
        alLeft: "false", alCentre: align === "centre" ? "true" : "false", alRight: align === "right" ? "true" : "false",
        wrap: l.kind === "label" ? 300 : big ? 944 : 940
      };
    };

    /* The conversation, for the moments D11 adds. */
    var msgs = null;
    var ME_FIG = { me: true, text: s.d11prompt || PROMPT11 };
    if (LAY && FIG && analysing) msgs = [ME_FIG, { busy: true, text: "Reading five frames and their layers" }];
    if (LAY && FIG && ready) {
      msgs = [ME_FIG, { ai: true, text: "Five slides from the file's five frames, at 4:5 like the file. Slides 4 and 5 are single images, so they are fixed: the same on every deck." }];
      if (s.d11cutEmpty) msgs.push({
        groups: true,
        text: "Slides 1 to 3 follow one person, so they draw from one set in Red Carpet Sets. Its sets have Before and After photos, but no cut-out for the cover, and the labels need two facts.",
        items: [
          { name: "Cover cut-out", kind: "Group", cls: "" },
          { name: "Name", kind: "Fact", cls: "" },
          { name: "Before year", kind: "Fact", cls: "" },
          { name: "After year", kind: "Fact", cls: "" }
        ],
        button: "Add to Red Carpet Sets",
        create: function () { self.note("Adds the group and the facts to Red Carpet Sets; its sets fill them in from D8"); }
      });
    }
    if (s.d11moment === "sizeChange") msgs = [
      { me: true, text: "Make it 9:16" },
      { ai: true, text: "Now 9:16. Each text box kept its margins and the image cells grew to the new height. Save version makes this version 5; version 4 stays 4:5." }
    ];
    if (msgs) msgs = msgs.map(function (m) { return Object.assign({ me: false, ai: false, busy: false, err: false, offer: false, groups: false, items: [], button: "", create: function () {} }, m); });
    else msgs = D6V.msgs.map(function (m) { return Object.assign({ groups: false, items: [], button: "", create: function () {} }, m); });

    var over = {
      d11studioCls: "sz-" + size + (LAY ? " d11-lay" : "") + (FIG ? " d11-fig" : ""),
      d11is45: size === "45" ? "true" : "false",
      d11is916: size === "916" ? "true" : "false",
      d11to45: function () { self.setState({ d11size: "45" }); },
      d11to916: function () { self.setState({ d11size: "916" }); },

      d11ready: ready,
      d11vx: Math.round(view.x), d11vy: Math.round(view.y), d11vz: view.z,
      d11bgPos: Math.round(view.x) + "px " + Math.round(view.y) + "px",
      d11bgSize: (20 * view.z).toFixed(2) + "px " + (20 * view.z).toFixed(2) + "px",
      d11zoomPct: Math.round(view.z * 100) + "%",
      d11zoomIn: function () { zoomMiddle(1.25); },
      d11zoomOut: function () { zoomMiddle(0.8); },
      d11fit: fitAll,
      panDown: panDown11, panMove: panMove11, panUp: panUp11,
      startFigma: function () { self.setState({ d6entry: "figma", d6stage: "library" }); },
      d11chipBig: FIG && stage === "empty" && !!s.d11chip,
      d11chipSmall: FIG && (analysing || ready) && s.d11chip === "ok",
      d11chipErr: s.d11chip === "err",
      d11chipCls: s.d11chip === "err" ? "is-err" : "",
      d11chipName: s.d11chip === "err" ? "Rewind-Drafts" : "Red Carpet Master",
      d11chipMeta: s.d11chip === "err" ? "figma.com/design/p9Tz1" : "5 frames · 1080×1350",
      d11chipRemove: function () { self.setState({ d11chip: "" }); },

      showRef: D6V.showRef || (FIG && LAY && (analysing || ready)),
      refKind: FIG ? "Figma" : "Reference",
      refName: FIG ? "Red Carpet Master" : D6V.refName,
      refMeta: FIG ? "5 frames · 1080×1350" : D6V.refMeta,
      refLabel: FIG ? "Figma file, Red Carpet Master, read-only" : D6V.refLabel,
      refNotAnalysed: FIG ? false : D6V.refNotAnalysed,
      refBusyText: FIG ? "Reading" : "Analysing",
      analysingText: FIG ? "Reading the Figma file" : "Analysing the reference",
      refSlides: FIG && LAY ? SLIDES11.map(function (sd) { return { cls: analysing ? "is-scan" : "", cells: [], boxes: [], layered: true, layers: faceOf(sd, false, true) }; }) : D6V.refSlides.map(function (r) { return Object.assign({ layered: false, layers: [] }, r); }),

      slidesAll: slidesAll,
      slideCount: LAY ? "Slide " + slide + " of " + SLIDES11.length : D6V.slideCount,
      msgs: msgs,
      libName: FIG ? "Red Carpet Sets" : D6V.libName,

      d11lay: LAY && ready,
      d11slideName: sdOn.name,
      d11rows: rows,
      d11fwdOff: si <= 0,
      d11backOff: si < 0 || si >= ids.length - 1,
      d11fwd: move(-1),
      d11back: move(1),
      d11selTitle: selL ? "Slide " + selL.slide + " · " + selL.name : "",
      d11selCut: !!selL && selL.kind === "cut",
      d11selFrame: !!selL && selL.kind === "frame",
      d11selFixed: !!selL && selL.kind === "fixed",
      d11drawsFrom: selL && selL.group ? "Set · " + selL.group : "",
      d11file: selL && selL.file ? selL.file : "",
      d11fileCls: selL && selL.img ? "fx-" + selL.img : "",
      d11replace: function () { self.note("Uploads a new image for every deck of this type; it saves with the next version"); },
      selBox: LAY ? isText : D6V.selBox,
      selCell: LAY ? false : D6V.selCell,
      bx: LAY && isText ? Object.assign({}, D6V.bx, styleFor(selL)) : D6V.bx,
      d11tx: LAY && isText,
      d11byAi: bySet ? "false" : "true",
      d11bySet: bySet ? "true" : "false",
      d11bySetOn: bySet,
      d11toAi: setBy("ai"),
      d11toSet: setBy("set"),
      d11fact: selL && selL.fact ? selL.fact : "Name",
      d11boxOn: boxOn,
      d11boxOnC: boxOn ? "true" : "false",
      d11boxOffC: boxOn ? "false" : "true",
      d11boxOnFn: function () { self.setState({ d11box: true }); },
      d11boxOff: function () { self.setState({ d11box: false }); },
      d11gp: [["All", "24"], ["Cover cut-out", s.d11cutEmpty ? "0" : "24"], ["Before", "24"], ["After", "24"]].map(function (g, i) {
        return { name: g[0], count: g[1], cls: i === 0 ? "is-on" : "", checked: i === 0 ? "true" : "false" };
      }),
      d11sets: SETS.map(function (st, i) {
        var on = i === (s.d11set || 0);
        return { name: st.name, facts: st.facts, pair: i % 2 ? "p2" : "p1", on: on, cls: on ? "is-on" : "", checked: on ? "true" : "false", cutCls: s.d11cutEmpty ? "is-none" : "", pick: function () { self.setState({ d11set: i }); self.note("The sample deck draws from " + st.name); } };
      }),
      d11upload: function () { self.note("Uploads images into Red Carpet Sets, by set and group · D8"); },
      d11generate: function () { self.note("Generates images with Higgsfield into Red Carpet Sets · D8"); }
    };
    /* Composing from a Figma link: the paperclip attaches the link as a chip, and Send takes the link and the prompt
       together, opening the conversation while the AI reads the file. A link with no access holds Send. */
    if (FIG && stage === "empty") {
      var cin11 = (s.d6cin || "").trim();
      var canSend11 = s.d11chip !== "err" && (!!cin11 || s.d11chip === "ok");
      var send11 = function () {
        if (!canSend11) return;
        self.setState({ d6stage: "analysing", d6cin: "", d11prompt: cin11, d6chatOpen: true, d6left: false, d11lay: true, d6unread: false });
        clearTimeout(self.d11t);
        self.d11t = setTimeout(function () { self.setState({ d6stage: "ready", d6slide: 1, d11cutEmpty: true, d11sel: null, d6title: "Red Carpet Rewind" }); }, 2400);
      };
      over.send = send11;
      over.cinKey = function (e) { if (e.key === "Enter") { e.preventDefault(); send11(); } };
      over.sendOff = !canSend11;
      over.sendCls = canSend11 ? "is-ready" : "";
      over.attach = function () { self.setState({ d11chip: "ok" }); self.note("Attaches the Figma link and reads the file's name and frames"); };
      over.aiPh = s.d11chip ? "What should change from the file" : "Attach a Figma link, then describe the carousel";
    }
    /* Shift+Enter starts a new line in the growing chat box; Enter alone still sends. */
    var keyBase = over.cinKey || D6V.cinKey;
    over.cinKey = function (e) { if (e.key === "Enter" && e.shiftKey) return; keyBase(e); };
    if (edit && s.d11name) {
      over.sdTitle = s.d11name;
      over.sdCrumb = s.d11name;
      over.sdCharacter = s.d11char || D6V.sdCharacter;
      over.sdVersion = s.d11ver || D6V.sdVersion;
      over.renameLabel = "Rename " + s.d11name;
    }
    return Object.assign(D6V, over);`;
}

/**
 * D11 as a screen: D6's Studio, extended. `init.d6` is D6's moment; `init.d11` is what D11 adds.
 */
export function studioRoundTwoScreen({ init = {} } = {}) {
  const base = studioScreen({ init: init.d6 || {} });
  const d = { lay: false, size: "45", sel: null, chip: "", prompt: "", cutEmpty: false, moment: "", flat: "", name: "", char: "", ver: "", ...(init.d11 || {}) };
  return {
    ...base,
    css: (phone) => base.css(phone).replace(/\.\/d6-(slide|lib)-/g, "./d11-$1-") + css11(phone),
    markup: (phone) => patchMarkup(base.markup(phone), phone),
    colOverlay: (phone) => (base.colOverlay ? patchPanels(base.colOverlay(phone), true) : ""),
    state: {
      ...base.state,
      d11lay: d.lay, d11size: d.size, d11sel: d.sel, d11chip: d.chip, d11prompt: d.prompt, d11cutEmpty: d.cutEmpty, d11moment: d.moment,
      d11flat: d.flat, d11name: d.name, d11char: d.char, d11ver: d.ver, d11order: null, d11box: true, d11by: null, d11set: 0, d11view: null, d11tick: 0,
    },
    vals: vals11(base.vals),
    didUpdate: (base.didUpdate || "") + didUpdate11,
  };
}

/* ── Review artboards ──────────────────────────────────────────────────── */

const FIGMA_READY = { stage: "ready", entry: "figma", lib: "window", slide: 1, title: "Red Carpet Rewind" };
const COMPOSE = { stage: "empty", entry: "figma", lib: "window", cin: PROMPT11, cinFocus: true };
const MOMENTS = {
  start: { d6: { stage: "start" } },
  prompt: { d6: COMPOSE, d11: { chip: "ok" } },
  noAccess: { d6: COMPOSE, d11: { chip: "err" } },
  reading: { d6: { stage: "analysing", entry: "figma", lib: "window", chatOpen: true, left: false }, d11: { lay: true, chip: "ok" } },
  draft: { d6: { ...FIGMA_READY, chatOpen: true, left: false }, d11: { lay: true, cutEmpty: true, chip: "ok" } },
  layers: { d6: FIGMA_READY, d11: { lay: true, sel: "s1-mast" } },
  cut: { d6: FIGMA_READY, d11: { lay: true, sel: "s1-cut" } },
  box: { d6: FIGMA_READY, d11: { lay: true, sel: "s1-hook" } },
  frame: { d6: { ...FIGMA_READY, slide: 2 }, d11: { lay: true, sel: "s2-photo" } },
  set: { d6: { ...FIGMA_READY, slide: 2 }, d11: { lay: true, sel: "s2-year" } },
  fixed: { d6: { ...FIGMA_READY, slide: 4 }, d11: { lay: true, sel: "s4-fixed" } },
  sizeTall: { d6: { stage: "ready", mode: "edit", lib: "window", slide: 1 }, d11: { size: "916", flat: "quiet", name: "Quiet Luxury Picks", char: "Character 4", ver: "Version 1" } },
  sizeChange: { d6: { stage: "ready", mode: "edit", lib: "window", slide: 1, copy: "before", chatOpen: true }, d11: { size: "916", moment: "sizeChange" } },
};

function build(OUT) {
  fs.mkdirSync(OUT, { recursive: true });
  copyStudioRoundTwoImages(OUT);
  const ROW = 1040;
  const D = 1540;
  const BOARDS = [
    { name: "Start", m: "start", title: "Just opened: a third card, Start from a Figma link", x: 0, y: 0 },
    { name: "FigmaPrompt", m: "prompt", title: "A Figma link attached to the chat box, with a prompt", x: D, y: 0 },
    { name: "FigmaNoAccess", m: "noAccess", title: "The attached Figma link failing: no access", x: 0, y: ROW },
    { name: "FigmaReading", m: "reading", title: "Reading the Figma file's five frames", x: D, y: ROW },
    { name: "FigmaDraft", m: "draft", title: "The draft beside the frames, the AI proposing what the library lacks", x: 0, y: ROW * 2 },
    { name: "Layers", m: "layers", title: "Layers: the masthead behind the cut-out", x: D, y: ROW * 2 },
    { name: "CutOut", m: "cut", title: "A cut-out placed freely over the paper", x: 0, y: ROW * 3 },
    { name: "TextOnBox", m: "box", title: "Text on a box: the hook's pill", x: D, y: ROW * 3 },
    { name: "Frame", m: "frame", title: "A shaped frame: the wave, with a border", x: 0, y: ROW * 4 },
    { name: "SharedSet", m: "set", title: "Slides sharing a subject: a label filled from the set", x: D, y: ROW * 4 },
    { name: "Fixed", m: "fixed", title: "A fixed image, the same on every deck", x: 0, y: ROW * 5 },
    { name: "SizeTall", m: "sizeTall", title: "A 9:16 type opened from its page: Quiet Luxury Picks", x: D, y: ROW * 5 },
    { name: "SizeChange", m: "sizeChange", title: "An existing type switched to 9:16, saving a new version", x: 0, y: ROW * 6 },
  ];
  const artboards = [];
  for (const light of [false, true]) {
    for (const b of BOARDS) {
      const file = `${b.name}${light ? "Light" : ""}.dc.html`;
      fs.writeFileSync(path.join(OUT, file), artboard({ phone: false, light, screens: [studioRoundTwoScreen({ init: MOMENTS[b.m] })], navMode: "note" }));
      artboards.push({ file, title: `D11 · ${b.title} · Desktop${light ? " · Light" : ""}`, page: light ? "light" : "dark", x: b.x, y: b.y, w: 1440, h: 900, is_interactive: true });
    }
  }
  const note =
    "D11, the Studio's second round. Pictures, one per state; the start cards, the Figma chip's remove button, the layers list, Bring forward and Send back, and the slide size work.\n\nThe content is invented. \"Red Carpet Rewind\" and \"Celebrity A\" stand in for the celebrity lane, drawn the way github.com/garrethdev/celebrity-peptide-renderer builds it: a paper background, a masthead behind a cut-out, the hook on a black box, photos in a wavy frame with a label from the set, and two fixed slides. The photos are bank shots from the image store; the cut-out is one of them with its background removed.\n\nFrom the first review: real photos in the template; the Figma link attaches to the chat box as a chip above the prompt, and stays as a chip above the conversation's chat box once sent; the slide size moved to the top of the adjustments on the left.\n\nFrom the second review: the chat box grows with the prompt, up to eight lines before it scrolls; Shift+Enter starts a new line.\n\nFrom the third review: the canvas pans in every direction (drag the dotted ground, or scroll) and zooms (Ctrl or Cmd with the wheel, a trackpad pinch, or the zoom buttons at the end of the tool strip; the zoom level fits every slide).\n\nNew pieces, for review:\n· Slide size, 4:5 or 9:16, first in the adjustments.\n· Start from a Figma link: a third card, then the chat box with the link attached, then the file's frames in the dashed frame while the AI reads them.\n· The layers list at the top of the adjustments, front first, each with where it comes from: AI, Set or Fixed.\n· Written by AI or Set, and Box, at the top of a text layer's settings.\n· A cut-out's Background, Height and Position; a frame's Shape, Border, Fit and Crop; a fixed image's file with Replace.\n· The library as sets, one row per person with its facts.\n· The AI's proposal of the group and facts a template needs, with one button.\n\nDark was approved after three review rounds; light mode is on its own page. The phone boards are not designed yet.";
  fs.writeFileSync(
    path.join(OUT, "canvas.json"),
    JSON.stringify(
      {
        pages: [
          { id: "dark", name: "Dark" },
          { id: "light", name: "Light" },
        ],
        artboards,
        annotations: [
          { id: "d11-note", page: "dark", x: D * 2, y: 0, w: 420, text: note },
          { id: "d11-note-light", page: "light", x: D * 2, y: 0, w: 420, text: note },
        ],
        launch: { view: "canvas", page: "light" },
      },
      null,
      2,
    ),
  );
  console.log(`Wrote D11 artboards to ${OUT}`);
}

if (isMain(import.meta.url)) build(path.resolve(process.argv[2] ?? path.join(HERE, "out")));
