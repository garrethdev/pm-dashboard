#!/usr/bin/env node
/*
 * D11 · Studio, round two (D6 pt. 2) — slide sizes, layered templates, and a
 * third way to start: from a Figma link.
 *
 * Design step only (docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md, D11). Nothing
 * here is app code. Its canvas is "Carousel Generator Designs - (D6 pt. 2
 * Studio)" (Garreth, 2026-09-15).
 *
 * D11 was approved as an extension of D6's Studio, and on 2026-09-15 it was
 * brought into D6's own build (d6-studio.build.mjs, "Round two"), which now
 * holds the screen, its sample content and its styles. This file keeps D11's
 * own review pictures, drawn from that screen, with the images named into
 * D11's namespace so its canvas stays as saved.
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
import { artboard, isMain } from "./generator-kit.mjs";
import { studioScreen, PROMPT11 } from "./d6-studio.build.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

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

/**
 * The Studio with round two, its images named into D11's namespace. `init.d6` is D6's moment; `init.d11` is what
 * round two adds.
 */
export function studioRoundTwoScreen({ init = {} } = {}) {
  const screen = studioScreen({ init });
  return { ...screen, css: (phone) => screen.css(phone).replace(/\.\/d6-(slide-|lib-|cut\.|photo-)/g, "./d11-$1") };
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
