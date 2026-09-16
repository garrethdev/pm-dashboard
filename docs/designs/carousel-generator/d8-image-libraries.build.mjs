#!/usr/bin/env node
/*
 * D8 · Image libraries — the grid of libraries, the folders inside one, and
 * the ways images get there: upload, generate, tag, prepare, retire.
 *
 * Design step only (docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md, D8). Nothing
 * here is app code. The shell (menu, top bar, glow, both themes, phone drawer,
 * prototype note) comes from generator-kit.mjs; this file is the screen.
 *
 * Decisions from Garreth, 2026-09-16:
 *  - A library holds FOLDERS, shown and opened as folders — not filter pills.
 *    A library starts with none, and images in no folder are ordinary. A
 *    folder belongs to nothing in particular: a Cover folder may hold a
 *    dozen different people, and folders nest one level, which is what the
 *    live banks already do.
 *  - Generate images never picks a folder. It takes a prompt and, when you
 *    want one, a base image — chosen from the library or uploaded.
 *  - A generated image is NEVER read automatically. Only images a person has
 *    kept and decided to use get tagged, by them or by Tag with AI.
 *
 * The detail headings are the live ones, read from the dashboard's own
 * `carousel_images` table on 2026-09-16 rather than invented: content,
 * emotion, subject, setting, framing, color_palette, image_type, arc_roles,
 * pillar, tags, quality_score, has_subject. The values shown are made up in
 * that table's own vocabulary — arc roles really are Hook, Before, After,
 * Stack, Reveal, Payoff, Confession, and quality really does run 6 to 9.
 * The two live banks (glowup_image_bank, covered_eye_image_bank) organise by
 * pool then category — cover → taraji, gabrielle_union — which is why the
 * folders here nest.
 *
 * Sample content only: invented library, folder and person names, invented
 * descriptions, placeholder photos.
 *
 * Run directly, it writes D8's review artboards and canvas.json:
 *   Main.dc.html          desktop 1440×900, the grid of libraries
 *   Library.dc.html       desktop, a library with no folders — the default
 *   Folders.dc.html       desktop, a library whose images are in folders
 *   InFolder.dc.html      desktop, inside a folder that holds folders
 *   Generate.dc.html      desktop, the Generate images form
 *   Generating.dc.html    desktop, the requested images arriving
 *   Review.dc.html        desktop, the review row, all clear
 *   Failed.dc.html        desktop, one image failed, and no credits left
 *   Image.dc.html         desktop, one image and its details, hold armed
 *   ImageNew.dc.html      desktop, an image with nothing read yet
 *   TagAsk.dc.html        desktop, what Tag with AI is about to do
 *   Tagging.dc.html       desktop, AI vision reading the images
 *   NewFolder.dc.html     desktop, naming a new folder
 *   FromD2.dc.html        desktop, opened by D2's Generate with AI
 *   Empty.dc.html         desktop, a library just made, with nothing in it
 *   EmptyFolder.dc.html   desktop, a folder with nothing in it
 *   Phone.dc.html         phone 390×844, the grid
 *   PhoneLibrary.dc.html  phone, one library and its folders
 *   PhoneGenerate.dc.html phone, the Generate images sheet
 *   PhoneImage.dc.html    phone, one image and its details
 * Imported, `librariesScreen()` is the screen prototype.build.mjs opens.
 *
 *   node docs/designs/carousel-generator/d8-image-libraries.build.mjs <out dir>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { I, icon, artboard, isMain } from "./generator-kit.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const S = ".screen-libraries";

const D8I = {
  spark: icon("Sparkle", 12),
  sparkLg: icon("Sparkle", 14),
  upload: icon("UploadSimple", 14),
  uploadLg: icon("UploadSimple", 18),
  star: icon("Star", 12),
  starLg: icon("Star", 14),
  x: icon("X", 18, "regular"),
  retry: icon("ArrowsClockwise", 14, "bold"),
  busy: icon("CircleNotch", 14, "bold"),
  warning: icon("Warning", 14),
  eraser: icon("Eraser", 14),
  circleHalf: icon("CircleHalf", 14),
  eye: icon("Eye", 14),
  plusSm: icon("Plus", 12, "bold"),
  minusSm: icon("Minus", 12, "bold"),
  checkSm: icon("Check", 12, "bold"),
  imagesLg: icon("Images", 24),
  folderLg: icon("FolderSimple", 24),
  slash: icon("CaretRight", 12, "bold"),
};

/* Image tiles: bank photos, downsampled (the same shots as D5's slides). */
const PHOTOS = ["mug", "journal", "yoga", "oats", "shower", "vanity", "bath", "serum", "shoes", "dock"];

/*
 * A library's card shows four of its own images rather than one cover crop
 * (Garreth, 2026-09-16): the single crop was cut for a 48px tile in D2 and
 * looked soft blown up across a card, and four shots say "a library" where one
 * says "a photo". Each library gets its own four, so they stay tellable apart.
 */
const COVER_PEEK = {
  window: ["mug", "vanity", "journal", "oats"],
  mirror: ["shower", "bath", "vanity", "mug"],
  outdoor: ["dock", "shoes", "yoga", "serum"],
  kitchen: ["oats", "mug", "journal", "bath"],
};

export function copyLibraryImages(OUT) {
  for (const id of PHOTOS) fs.copyFileSync(path.join(HERE, "assets", `d8-img-${id}.jpg`), path.join(OUT, `d8-img-${id}.jpg`));
}

/* ── Sample content ────────────────────────────────────────────────────── */

/*
 * `folders` is what a person (or Tag with AI) has made so far — most
 * libraries have none. `loose` is how many images sit in no folder at all,
 * which is ordinary. A folder may hold folders, one level down, the way the
 * live banks hold a pool's categories.
 */
const LIBS = [
  { id: "window", name: "Soft Window Light", folders: [], loose: 127, types: ["Before & After"] },
  {
    id: "mirror",
    name: "Bathroom Mirror Mornings, Natural Light Series",
    folders: [
      { name: "Cover", count: 96, subs: [["Maya R.", 34], ["Dana K.", 28], ["Priya S.", 22], ["Aspirational", 12]] },
      { name: "Before", count: 402, subs: [] },
      { name: "After", count: 511, subs: [] },
      { name: "Evidence", count: 275, subs: [["Water", 96], ["Steps", 88], ["Greens", 91]] },
      { name: "Filler", count: 1, subs: [] },
    ],
    loose: 63,
    types: ["Morning Routine", "Day in the Life"],
  },
  { id: "outdoor", name: "Outdoor Walks", folders: [], loose: 212, types: ["Quiet Luxury Picks"] },
  {
    id: "kitchen",
    name: "Kitchen Counter Shots",
    folders: [{ name: "Cover", count: 12, subs: [] }, { name: "Before", count: 46, subs: [] }, { name: "After", count: 0, subs: [] }],
    loose: 0,
    types: [],
  },
  /* Made by New library on the grid, and still empty. */
  { id: "backdrops", name: "Studio Backdrops", folders: [], loose: 0, types: [], fresh: true },
];

/* Which photo fills which tile, so a row is not the same shot repeated. */
const ROW = {
  Cover: ["mug", "vanity", "journal", "oats", "shower", "yoga", "dock", "serum"],
  Before: ["shower", "bath", "vanity", "mug", "shoes", "journal", "oats", "dock"],
  After: ["yoga", "serum", "oats", "dock", "mug", "bath", "vanity", "shoes"],
  Evidence: ["oats", "mug", "dock", "journal", "serum", "bath", "shower", "yoga"],
  Filler: ["serum"],
  All: ["mug", "shower", "journal", "yoga", "vanity", "oats", "bath", "dock", "serum", "shoes", "mug", "journal", "yoga", "shower", "oats", "vanity"],
};

/*
 * What AI vision reads off a picture, and what the renderer reads back when
 * it is choosing an image for a slide. The headings are `carousel_images`'s
 * own columns; the values are invented in that table's vocabulary.
 */
const DESCRIPTION =
  "A woman at a small basin in a tiled bathroom, seen from the side, a towel over one shoulder. Window light from the left, steam still on the lower half of the mirror. A single glass bottle and a folded flannel on the shelf; nothing branded in shot.";
const DETAILS = [
  ["Emotion", "calm, quietly hopeful"],
  ["Subject", "One woman at the basin, waist up, turned away from the lens"],
  ["Setting", "Small tiled bathroom, window light from the left, mid-morning"],
  ["Framing", "Mid-range, waist up, eye level"],
  ["Colour palette", "warm cream, pale grey tile, soft gold, muted green"],
  ["Image type", "After"],
  ["Pillar", "transformation_simple_character_2"],
  ["Tags", "mirror, morning, skincare, no-text"],
];
/* arc_roles is a list: one image can sit at several points of the arc. */
const ARC_ROLES = ["Stack", "Reveal"];
const QUALITY = "8";

/* The Generate images run: what came back, and what is still coming. */
const RUN = ["vanity", "mug", "shower", "journal", "bath", "serum"];

/* Everything above the page's own content on the desktop, so a tall board can
   be sized from the rows it holds. */
const HEAD_H = 200;
const ROW_H = 212;
const FOLDER_H = 200;

/* ── Styles ────────────────────────────────────────────────────────────── */

function css(phone, init) {
  const P = phone;
  const cols = P ? 3 : 8;
  return `
/* ── D8 page ── */
:root { --ok: #4ade80; --warn: #fbbf24; }
.app.is-light { --ok: #166534; --warn: #92400e; }
${init.tall ? `.app${S} { height: ${init.tall}px; }` : ""}
${S} .page { gap: ${P ? 20 : 24}px; }
${S} .l8head { display: flex; flex-direction: column; align-items: flex-start; }
/* The breadcrumb above the name, as on D2 and D7, but a chain once you are
   inside a folder: Image libraries › Library › Folder. */
${S} .crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; margin: 0 0 4px -2px; font-size: 13px; line-height: 20px; }
${S} .up8 { position: relative; display: inline-flex; align-items: center; gap: 6px; padding: 2px 4px; border-radius: 8px; font-weight: 500; color: var(--text-muted); transition: color 150ms var(--ease); }
${S} .up8:hover { color: var(--text-primary); }
${S} .crumbs .sep { display: flex; color: var(--text-muted); opacity: 0.6; }
${S} .l8title { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; align-self: stretch; }
${S} .l8name { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 12px; min-width: 0; }
${S} .l8name h1 { overflow-wrap: anywhere; }
${S} .l8sub { font-size: 13px; line-height: 20px; color: var(--text-muted); white-space: nowrap; }
${S} .l8act { display: flex; align-items: center; gap: 12px; }
${S} .pill--warn { color: var(--warn); }
${S} .pill--danger { color: var(--danger); }
${S} .pill--accent { color: var(--accent); }
${S} .pill--quiet { background: none; box-shadow: inset 0 0 0 1px var(--border); }

/* ── The grid of libraries ── */
/*
 * Boards, the way Pinterest shows them (Garreth, 2026-09-16): a mosaic of the
 * library's own images — one large, two stacked beside it — with the name and
 * the count plain underneath. No card around any of it; the pictures are the
 * card. Nothing else is on them: how many folders, how many are unread and
 * which types point at the library all came off.
 *
 * The card is an <article> with one stretched button over it, the way D1's
 * type cards are built — a <button> cannot legally hold the <h2>.
 */
${S} .lg { display: grid; grid-template-columns: repeat(${P ? 2 : 4}, minmax(0, 1fr)); gap: ${P ? 18 : 26}px ${P ? 12 : 16}px; }
${S} .lcard { position: relative; display: flex; flex-direction: column; gap: 10px; text-align: left; transition: transform 160ms var(--ease-out-strong); }
${S} .lcard:has(.lopen:active) { transform: scale(0.99); }
${S} .lopen { position: absolute; inset: 0; z-index: 1; border-radius: 18px; }
/* The mosaic: large left, two stacked right, hairline gaps, one rounded frame. */
${S} .lmos { position: relative; display: grid; grid-template-columns: 2fr 1fr; grid-template-rows: 1fr 1fr; gap: 2px; aspect-ratio: 3 / 2; overflow: hidden; border-radius: 18px; background: var(--card-sunken); }
${S} .lmos i { display: block; background-size: cover; background-position: center; background-color: var(--card-raised); }
${S} .lmos i:first-child { grid-row: 1 / 3; }
/* A slot with no picture in it stays a panel, so a thin library reads as thin. */
${S} .lmos i.is-blank { background-color: var(--card-sunken); box-shadow: inset 0 0 0 1px var(--border); }
${S} .lmos::after { content: ""; position: absolute; inset: 0; background: rgba(0, 0, 0, 0.16); opacity: 0; transition: opacity 150ms var(--ease); pointer-events: none; }
${S} .is-light .lmos::after { background: rgba(255, 255, 255, 0.28); }
${S} .lcard:has(.lopen:hover) .lmos::after { opacity: 1; }
${S} .lmeta { display: flex; flex-direction: column; gap: 1px; padding: 0 2px; }
/* The name at D1's card-name size, so the two grids read as the same family. */
${S} .lcard h2 { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; letter-spacing: -0.01em; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
${S} .lcount { font-size: 13px; line-height: 20px; color: var(--text-muted); }
/* New library sits in the grid as its own tile, the way Pinterest's Create does. */
${S} .lnew { display: flex; align-items: center; justify-content: center; aspect-ratio: 3 / 2; border-radius: 18px; background: var(--card-sunken); box-shadow: inset 0 0 0 1px var(--border);
  transition: background-color 150ms var(--ease); }
${S} .lnew:hover { background: var(--card-raised); }
${S} .lnew span { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; background: var(--card); box-shadow: inset 0 0 0 1px var(--border), var(--sb-shadow); padding: 10px 20px;
  font-size: 14px; line-height: 20px; font-weight: 600; color: var(--text-primary); transition: transform 150ms var(--ease); }
${S} .lnew:active span { transform: scale(0.97); }

/* ── Folders ── */
/* A folder is a folder: a few of its images stacked on its face, its name and
   its count under them, and it opens when you click it (Garreth, 2026-09-16). */
${S} .fgrid { display: grid; grid-template-columns: repeat(${P ? 2 : 5}, minmax(0, 1fr)); gap: ${P ? 10 : 14}px; }
${S} .fcard { display: flex; flex-direction: column; gap: 8px; border-radius: 18px; border: 1px solid var(--border); background: var(--card); box-shadow: var(--sh-card); padding: 10px 10px 12px;
  text-align: left; transition: border-color 150ms var(--ease), transform 160ms var(--ease-out-strong); }
${S} .fcard:hover { border-color: color-mix(in srgb, var(--text-muted) 40%, var(--border)); }
${S} .fcard:active { transform: scale(0.99); }
${S} .fpeek { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: 1fr; gap: 3px; aspect-ratio: 4 / 3; overflow: hidden; border-radius: 12px; background: var(--card-sunken); }
${S} .fpeek span { background-size: cover; background-position: center; background-color: var(--card-raised); }
${S} .fpeek--empty { display: flex; align-items: center; justify-content: center; border: 1px dashed var(--border); color: var(--text-muted); }
${S} .fname { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; padding: 0 2px; }
${S} .fname b { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; line-height: 18px; font-weight: 600; }
${S} .fname .fc { flex-shrink: 0; font-size: 12px; line-height: 16px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
${S} .fsubs { padding: 0 2px; font-size: 11px; line-height: 16px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* New folder, drawn as an opening rather than a thing that already holds images. */
${S} .fnew { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: ${P ? 140 : 160}px; border-radius: 18px; border: 1px dashed var(--border); background: none;
  font-size: 13px; line-height: 18px; font-weight: 500; color: var(--text-muted); transition: border-color 150ms var(--ease), color 150ms var(--ease); }
${S} .fnew:hover { border-color: color-mix(in srgb, var(--text-muted) 50%, var(--border)); color: var(--text-primary); }

/* A run of images, under a heading when there is something to tell apart. */
${S} .gsec { display: flex; flex-direction: column; gap: 10px; }
${S} .gsech { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
${S} .gsech h3 { margin: 0; font-size: 13px; line-height: 20px; font-weight: 600; }
${S} .gsech h3.is-loose { font-weight: 500; color: var(--text-muted); }
${S} .gsech .gc { font-size: 12px; line-height: 16px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
${S} .igrid { display: grid; grid-template-columns: repeat(${cols}, minmax(0, 1fr)); gap: ${P ? 8 : 12}px; }
${S} .itile { position: relative; display: block; aspect-ratio: 4 / 5; overflow: hidden; border-radius: ${P ? 10 : 12}px; background-size: cover; background-position: center; background-color: var(--card-raised);
  transition: transform 160ms var(--ease-out-strong); }
${S} .itile:hover { transform: scale(1.02); }
${S} .itile:active { transform: scale(0.99); }
${PHOTOS.map((id) => `${S} .ph-${id} { background-image: url(./d8-img-${id}.jpg); }`).join("\n")}
${S} .icover { position: absolute; top: 6px; left: 6px; display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 999px;
  background: var(--overlay-veil); box-shadow: var(--overlay-rim); -webkit-backdrop-filter: var(--overlay-blur); backdrop-filter: var(--overlay-blur); color: var(--accent); }
${S} .is-light .icover { border: 1px solid var(--border); }
/* An image nothing has been read off yet: a quiet corner mark, not a badge. */
${S} .iraw { position: absolute; right: 6px; bottom: 6px; width: 6px; height: 6px; border-radius: 999px; background: var(--warn); box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.35); }
${S} .is-light .iraw { box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.7); }

/* Nothing here: a new library, or a folder with nothing in it. It fills the
   rest of the page rather than leaving dead space under it (Garreth,
   2026-09-16), so the page ends where the window does. */
${S} .main:has(> .page.is-fill) { display: flex; flex-direction: column; }
${S} .page.is-fill { flex: 1; min-height: 0; }
${S} .page.is-fill .es8 { flex: 1; }
${S} .es8 { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; min-height: ${P ? 300 : 400}px; border-radius: 24px; border: 1px dashed var(--border);
  background: var(--card-sunken); padding: 32px 24px; text-align: center; }
${S} .es8 .ic { display: flex; color: var(--text-muted); }
${S} .es8 p { max-width: 380px; margin: 0; font-size: 14px; line-height: 20px; color: var(--text-muted); text-wrap: pretty; }
${S} .es8 .acts { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px; margin-top: 4px; }

/* ── The bands: generated images waiting, and AI vision reading ── */
${S} .rrow { display: flex; flex-direction: column; overflow: hidden; border-radius: 24px; border: 1px solid var(--accent-soft); background: var(--card); box-shadow: var(--sh-card); }
${S} .rrow.is-plain { border-color: var(--border); }
${S} .rhead { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; padding: 14px ${P ? 16 : 20}px; }
${S} .rhead h3 { margin: 0; font-size: 14px; line-height: 20px; font-weight: 600; }
${S} .rhead .rc { font-size: 12px; line-height: 16px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
${S} .rhead .ract { display: flex; align-items: center; gap: 8px; margin-left: auto; }
${S} .rgrid { display: grid; grid-template-columns: repeat(${P ? 3 : 6}, minmax(0, 1fr)); gap: ${P ? 8 : 12}px; padding: 0 ${P ? 16 : 20}px ${P ? 16 : 20}px; }
${S} .rcell { display: flex; flex-direction: column; gap: 8px; }
${S} .rimg { position: relative; aspect-ratio: 4 / 5; overflow: hidden; border-radius: ${P ? 10 : 12}px; background-size: cover; background-position: center; background-color: var(--card-raised); }
${S} .rimg--busy { display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); background: var(--card-sunken); color: var(--text-muted); }
${S} .rimg--fail { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; border: 1px solid color-mix(in srgb, var(--danger) 40%, var(--border)); background: var(--card-sunken); color: var(--danger); padding: 8px; }
${S} .rimg--fail span { font-size: 12px; line-height: 16px; text-align: center; }
${S} .rkeep { display: flex; align-items: center; gap: 6px; }
${S} .rkeep .btn2 { flex: 1; justify-content: center; padding: 5px 8px; }
${S} .rkeep .btn2.is-keep { color: var(--text-primary); border-color: color-mix(in srgb, var(--accent) 40%, var(--border)); }
${S} .rnote { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; border-top: 1px solid var(--border); padding: 12px ${P ? 16 : 20}px; font-size: 13px; line-height: 20px; color: var(--warn); }
${S} .rnote .ic { display: flex; }
${S} .rnote .btn2 { margin-left: auto; }
${S} .bar-track { height: 4px; border-radius: 999px; background: var(--card-sunken); overflow: hidden; margin: 0 ${P ? 16 : 20}px ${P ? 16 : 20}px; }
${S} .bar-fill { height: 100%; border-radius: 999px; background: var(--accent); transition: width 300ms var(--ease); }

/* ── Dialogs ── */
${S} .scrim8 { position: absolute; inset: 0; z-index: 80; background: var(--scrim); -webkit-backdrop-filter: var(--scrim-blur); backdrop-filter: var(--scrim-blur); animation: d8-fade 180ms var(--ease-out-strong); }
@keyframes d8-fade { from { opacity: 0; } }
${
  P
    ? `${S} .dlg8 { position: absolute; left: 0; right: 0; bottom: 0; z-index: 81; display: flex; flex-direction: column; max-height: 92%; border-radius: 24px 24px 0 0; border: 1px solid var(--border); border-bottom: 0;
  background: var(--card); box-shadow: var(--overlay-rim); animation: d8-sheet 280ms cubic-bezier(0.32, 0.72, 0, 1); }
@keyframes d8-sheet { from { transform: translateY(100%); } }`
    : `${S} .dlg8 { position: absolute; left: 50%; top: 50%; z-index: 81; display: flex; flex-direction: column; width: 720px; max-height: 830px; transform: translate(-50%, -50%);
  border-radius: 24px; border: 1px solid var(--border); background: var(--card); box-shadow: var(--overlay-rim); animation: d8-in 200ms var(--ease-out-strong); }
@keyframes d8-in { from { opacity: 0; transform: translate(-50%, -50%) scale(0.97); } }`
}
${S} .dlg8--wide { width: ${P ? "auto" : "940px"}; }
${S} .dlg8--narrow { width: ${P ? "auto" : "440px"}; }
${S} .dh8 { display: flex; align-items: center; gap: 12px; padding: 14px ${P ? 16 : 24}px; border-bottom: 1px solid var(--border); }
${S} .dh8 h2 { margin: 0; flex: 1; min-width: 0; font-size: 14px; line-height: 20px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${S} .dbody { flex: 1; min-height: 0; overflow-y: auto; }
${S} .dfoot { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; min-height: 70px; padding: 16px ${P ? 16 : 24}px; border-top: 1px solid var(--border); }
${S} .dfoot .status8 { min-width: 0; margin-right: auto; font-size: 13px; line-height: 20px; color: var(--text-muted); }

/* The form rows, the same banding as D2's form. */
${S} .frow8 { display: grid; grid-template-columns: ${P ? "minmax(0, 1fr)" : "150px minmax(0, 1fr)"}; gap: ${P ? 8 : 24}px; align-items: start; padding: 16px ${P ? 16 : 24}px; border-top: 1px solid var(--border); }
${S} .frow8:first-child { border-top: 0; }
${S} .flabel8 { display: flex; flex-direction: column; padding-top: ${P ? 0 : 6}px; font-size: 14px; line-height: 20px; font-weight: 500; }
${S} .flabel8 .opt { font-size: 12px; line-height: 16px; font-weight: 400; color: var(--text-muted); }
${S} .fctl8 { position: relative; min-width: 0; }
${S} .field8 { display: flex; border-radius: 16px; border: 1px solid var(--border); background: var(--card-sunken); padding: ${P ? 12 : 10}px 14px; transition: box-shadow 150ms var(--ease); }
${S} .field8:focus-within { box-shadow: 0 0 0 2px var(--accent); }
${S} .field8 textarea { width: 100%; min-height: 72px; resize: none; font: inherit; color: inherit; background: none; border: 0; outline: none; font-size: 14px; line-height: 20px; }
${S} .field8 input { width: 100%; font: inherit; color: inherit; background: none; border: 0; outline: none; font-size: 14px; line-height: 20px; font-weight: 500; }
${S} .field8 textarea::placeholder, ${S} .field8 input::placeholder { color: var(--text-muted); font-weight: 400; }
${S} .seg8 { display: ${P ? "flex" : "inline-flex"}; align-items: center; gap: 2px; border-radius: 999px; background: var(--card-raised); padding: 2px; }
${S} .seg8 button { ${P ? "flex: 1; text-align: center;" : ""} border-radius: 999px; padding: ${P ? 8 : 4}px 12px; font-size: 12px; line-height: 16px; font-weight: 500; white-space: nowrap; color: var(--text-muted); transition: color 150ms var(--ease), background-color 150ms var(--ease); }
${S} .seg8 button:hover { color: var(--text-primary); }
${S} .seg8 button[aria-checked="true"] { background: var(--accent); color: var(--bg); }
${S} .is-light .seg8 button[aria-checked="true"] { color: #ffffff; }
${S} .step8 { display: inline-flex; align-items: stretch; width: ${P ? "100%" : "132px"}; overflow: hidden; border-radius: 16px; border: 1px solid var(--border); background: color-mix(in srgb, var(--bg) 60%, transparent); }
${S} .step8 button { display: flex; width: ${P ? 48 : 28}px; flex-shrink: 0; align-items: center; justify-content: center; color: var(--text-muted); transition: color 150ms var(--ease), background-color 150ms var(--ease); }
${S} .step8 button:hover:not(:disabled) { background: var(--card); color: var(--text-primary); }
${S} .step8 button:disabled { cursor: not-allowed; opacity: 0.3; }
${S} .step8 span { display: flex; flex: 1; align-items: center; justify-content: center; padding: ${P ? 12 : 6}px 4px; border-left: 1px solid var(--border); border-right: 1px solid var(--border); font-size: 14px; line-height: 20px; font-variant-numeric: tabular-nums; }
/* Base image: one picked from the library, or one uploaded. */
${S} .bases { display: flex; flex-wrap: wrap; gap: 8px; }
${S} .base { position: relative; width: ${P ? 60 : 56}px; aspect-ratio: 4 / 5; overflow: hidden; border-radius: 10px; background-size: cover; background-position: center; background-color: var(--card-raised); }
${S} .base::after { content: ""; position: absolute; inset: 0; border-radius: 10px; box-shadow: inset 0 0 0 2px transparent; transition: box-shadow 150ms var(--ease); }
${S} .base[aria-pressed="true"]::after { box-shadow: inset 0 0 0 2px var(--accent); }
${S} .base .tick { position: absolute; right: 4px; bottom: 4px; display: none; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 999px; background: var(--accent); color: var(--bg); }
${S} .base[aria-pressed="true"] .tick { display: flex; }
${S} .is-light .base .tick { color: #ffffff; }
${S} .base--up { display: flex; align-items: center; justify-content: center; border: 1px dashed var(--border); background: var(--card-sunken); color: var(--text-muted); transition: border-color 150ms var(--ease), color 150ms var(--ease); }
${S} .base--up:hover { border-color: color-mix(in srgb, var(--text-muted) 50%, var(--border)); color: var(--text-primary); }
${S} .base--up::after { content: none; }

/* ── One image: the picture, what was read off it, and what can be done ── */
${S} .ibody { display: grid; grid-template-columns: ${P ? "minmax(0, 1fr)" : "minmax(0, 360px) minmax(0, 1fr)"}; gap: ${P ? 16 : 24}px; padding: ${P ? 16 : 24}px; }
${S} .ileft { display: flex; flex-direction: column; gap: 12px; }
${S} .ibig { aspect-ratio: 4 / 5; border-radius: 16px; background-size: cover; background-position: center; background-color: var(--card-raised); }
${S} .iacts { display: flex; flex-direction: column; gap: 8px; }
${S} .iact { display: flex; align-items: center; gap: 10px; width: 100%; border-radius: 14px; border: 1px solid var(--border); background: var(--card-sunken); padding: ${P ? 12 : 9}px 14px;
  font-size: 13px; line-height: 20px; font-weight: 500; transition: border-color 150ms var(--ease); }
${S} .iact:hover { border-color: color-mix(in srgb, var(--text-muted) 50%, var(--border)); }
${S} .iact .ic { display: flex; color: var(--text-muted); }
${S} .iact .sub { margin-left: auto; font-size: 12px; font-weight: 400; color: var(--text-muted); }
${S} .iside { display: flex; min-width: 0; flex-direction: column; gap: 14px; }
${S} .imeta { display: flex; flex-wrap: wrap; gap: 6px; }
/* The read itself, as metadata: the description first, then heading and value. */
${S} .dets { display: flex; flex-direction: column; border-radius: 16px; border: 1px solid var(--border); background: var(--card-sunken); overflow: hidden; }
${S} .detdesc { padding: 12px 14px; border-bottom: 1px solid var(--border); font-size: 13px; line-height: 19px; color: var(--text-muted); text-wrap: pretty; }
${S} .det { display: grid; grid-template-columns: ${P ? "92px" : "110px"} minmax(0, 1fr); gap: 12px; align-items: baseline; padding: 8px 14px; border-top: 1px solid var(--border); font-size: 13px; line-height: 19px; }
${S} .det:first-child { border-top: 0; }
${S} .det .dk { color: var(--text-muted); }
${S} .det .dv { min-width: 0; font-weight: 500; overflow-wrap: anywhere; }
${S} .det .dv.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
${S} .roles { display: flex; flex-wrap: wrap; gap: 4px; }
${S} .detfoot { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; border-top: 1px solid var(--border); padding: 9px 14px; font-size: 12px; line-height: 18px; color: var(--text-muted); }
${S} .detfoot .tbtn8 { margin-left: auto; }
/* Nothing read yet: the same box, holding the way to fill it. */
${S} .dets--none { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; padding: 18px 14px; border-style: dashed; }
${S} .dets--none p { margin: 0; font-size: 13px; line-height: 20px; color: var(--text-muted); }

/* Retire: hold-button.tsx in its danger tone. A plain click starts the fill and
   lets it fall back, which is the whole instruction — no warning text above it. */
${S} .hold8 { position: relative; isolation: isolate; display: inline-flex; align-items: center; justify-content: center; gap: 8px; overflow: hidden; border-radius: 999px; padding: ${P ? 10 : 6}px 18px;
  font-size: 14px; line-height: 20px; font-weight: 500; user-select: none; touch-action: none; background: color-mix(in srgb, var(--danger) 25%, transparent); color: var(--danger); transition: opacity 150ms var(--ease); }
${S} .hold8:hover:not(:disabled) { opacity: 0.9; }
${S} .hold8 i { position: absolute; inset: 0; z-index: -1; transform-origin: left; transform: scaleX(0); background: var(--danger); transition: transform 150ms var(--ease); }
${S} .hold8.is-armed i { transform: scaleX(0.62); transition: none; }
${S} .hold8 span { position: relative; display: flex; }
${S} .hold8.is-armed span { color: #ffffff; }

/* A plain switch — theme-toggle.tsx's shape. */
${S} .sw { display: flex; align-items: center; gap: 12px; }
${S} .sw .swt { position: relative; width: 36px; height: 20px; flex-shrink: 0; border-radius: 999px; background: var(--card-raised); transition: background-color 150ms var(--ease); }
${S} .sw .swt[aria-checked="true"] { background: var(--accent); }
${S} .sw .swk { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 999px; background: var(--text-primary); transition: left 150ms var(--ease); }
${S} .sw .swt[aria-checked="true"] .swk { left: 18px; background: var(--bg); }
${S} .is-light .sw .swt[aria-checked="true"] .swk { background: #ffffff; }

${
  P
    ? `/* Phone: the page's actions live in a bottom bar, as on D2, D5 and D7. */
${S} .main { padding-bottom: 92px; }
${S} .note { bottom: 92px; }
${S} .bar8 { position: absolute; left: 0; right: 0; bottom: 0; z-index: 25; display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 70%, transparent); -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px); }
${S} .bar8 .cta { flex: 1; padding: 15px 22px; }
${S} .bar8 .btn2 { padding: 13px 16px; }
${S} .up8::after, ${S} .tbtn8::after { content: ""; position: absolute; inset: -10px -6px; }`
    : ""
}
${S} .tbtn8 { position: relative; display: inline-flex; align-items: center; gap: 4px; border-radius: 8px; padding: 2px 4px; font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-muted); transition: color 150ms var(--ease); }
${S} .tbtn8:hover { color: var(--text-primary); }
@media (prefers-reduced-motion: reduce) {
  ${S} .lcard, ${S} .fcard, ${S} .itile, ${S} .base::after, ${S} .hold8 i, ${S} .bar-fill { transition: none; }
  ${S} .dlg8, ${S} .scrim8 { animation: none; }
}
`;
}

/* ── Markup ────────────────────────────────────────────────────────────── */

function grid() {
  return `
          <div class="l8head">
            <div class="l8title">
              <div class="l8name"><h1>Image libraries</h1><span class="l8sub tnum">{{gCount}}</span></div>
            </div>
          </div>
          <div class="lg">
            <sc-for list="{{cards}}" as="c" hint-placeholder-count="5">
              <article class="lcard">
                <button type="button" class="lopen" aria-label="{{c.name}}" onClick="{{c.open}}"></button>
                <div class="lmos" aria-hidden="true">
                  <sc-for list="{{c.peek}}" as="p" hint-placeholder-count="3"><i class="{{p.cls}}"></i></sc-for>
                </div>
                <div class="lmeta">
                  <h2 title="{{c.name}}">{{c.name}}</h2>
                  <span class="lcount tnum">{{c.count}}</span>
                </div>
              </article>
            </sc-for>
            <button type="button" class="lnew" onClick="{{newLibrary}}"><span>New library</span></button>
          </div>`;
}

/* The folders at this level, then a way to make another. */
const folderGrid = `
            <sc-if value="{{showFolders}}" hint-placeholder-val="{{ false }}">
              <div class="fgrid">
                <sc-for list="{{folders}}" as="f" hint-placeholder-count="5">
                  <button type="button" class="fcard" onClick="{{f.open}}">
                    <span class="fpeek" aria-hidden="true">
                      <sc-for list="{{f.peek}}" as="p" hint-placeholder-count="4"><span class="{{p.cls}}"></span></sc-for>
                    </span>
                    <span class="fname"><b title="{{f.name}}">{{f.name}}</b><span class="fc">{{f.count}}</span></span>
                    <span class="fsubs">{{f.subText}}</span>
                  </button>
                </sc-for>
                <button type="button" class="fnew" onClick="{{openNewFolder}}">${D8I.folderLg}New folder</button>
              </div>
            </sc-if>`;

/* The images at this level. */
const imageRun = `
            <sc-if value="{{showImages}}" hint-placeholder-val="{{ true }}">
              <section class="gsec">
                <sc-if value="{{imagesTitled}}" hint-placeholder-val="{{ false }}">
                  <div class="gsech"><h3 class="{{imagesHeadCls}}">{{imagesTitle}}</h3><span class="gc">{{imagesCount}}</span></div>
                </sc-if>
                <div class="igrid">
                  <sc-for list="{{tiles}}" as="im" hint-placeholder-count="16">
                    <button type="button" class="itile {{im.cls}}" aria-label="{{im.label}}" onClick="{{im.open}}">
                      <sc-if value="{{im.isCover}}" hint-placeholder-val="{{ false }}"><span class="icover" title="Library cover">${D8I.star}</span></sc-if>
                      <sc-if value="{{im.raw}}" hint-placeholder-val="{{ false }}"><span class="iraw" title="Nothing read off this one yet"></span></sc-if>
                    </button>
                  </sc-for>
                </div>
              </section>
            </sc-if>`;

const reviewRow = `
            <sc-if value="{{showRun}}" hint-placeholder-val="{{ false }}">
              <div class="rrow {{runPlainCls}}">
                <div class="rhead">
                  <h3>{{runTitle}}</h3>
                  <span class="rc">{{runMeta}}</span>
                  <span class="ract">
                    <sc-if value="{{runDone}}" hint-placeholder-val="{{ false }}">
                      <button type="button" class="btn2" onClick="{{discardAll}}">Discard all</button>
                      <button type="button" class="btn2 is-keep" onClick="{{keepAll}}">Keep all</button>
                    </sc-if>
                  </span>
                </div>
                <div class="rgrid">
                  <sc-for list="{{runCells}}" as="r" hint-placeholder-count="6">
                    <div class="rcell">
                      <sc-if value="{{r.isDone}}" hint-placeholder-val="{{ true }}"><span class="rimg {{r.cls}}" aria-hidden="true"></span></sc-if>
                      <sc-if value="{{r.isBusy}}" hint-placeholder-val="{{ false }}"><span class="rimg rimg--busy" aria-hidden="true"><span class="spin on">${D8I.busy}</span></span></sc-if>
                      <sc-if value="{{r.isFail}}" hint-placeholder-val="{{ false }}"><span class="rimg rimg--fail">${D8I.warning}<span>Did not come back</span></span></sc-if>
                      <div class="rkeep">
                        <sc-if value="{{r.isDone}}" hint-placeholder-val="{{ true }}">
                          <button type="button" class="btn2" onClick="{{r.discard}}">Discard</button>
                          <button type="button" class="btn2 is-keep" onClick="{{r.keep}}">Keep</button>
                        </sc-if>
                        <sc-if value="{{r.isFail}}" hint-placeholder-val="{{ false }}">
                          <button type="button" class="btn2" onClick="{{r.retry}}">${D8I.retry}Retry</button>
                        </sc-if>
                      </div>
                    </div>
                  </sc-for>
                </div>
                <sc-if value="{{showCredits}}" hint-placeholder-val="{{ false }}">
                  <div class="rnote"><span class="ic">${D8I.warning}</span>No image credits left at Higgsfield<button type="button" class="btn2" onClick="{{openCredits}}">Open Higgsfield${I.caretRightSm}</button></div>
                </sc-if>
              </div>
            </sc-if>`;

const taggingRow = `
            <sc-if value="{{showTagging}}" hint-placeholder-val="{{ false }}">
              <div class="rrow is-plain">
                <div class="rhead">
                  <h3>Reading the images</h3>
                  <span class="rc">{{tagMeta}}</span>
                  <span class="ract"><button type="button" class="btn2" onClick="{{stopTagging}}">Stop</button></span>
                </div>
                <div class="bar-track"><span class="bar-fill" style="width: {{tagPct}}"></span></div>
              </div>
            </sc-if>`;

/* One library, or one folder inside it — the same page at a different depth. */
function library(phone) {
  return `
          <div class="l8head">
            <div class="crumbs">
              <button type="button" class="up8" onClick="{{backToGrid}}">${I.backSm}Image libraries</button>
              <sc-if value="{{inFolder}}" hint-placeholder-val="{{ false }}">
                <span class="sep">${D8I.slash}</span>
                <button type="button" class="up8" onClick="{{backToLibrary}}">{{libShort}}</button>
              </sc-if>
              <sc-if value="{{inSub}}" hint-placeholder-val="{{ false }}">
                <span class="sep">${D8I.slash}</span>
                <button type="button" class="up8" onClick="{{backToFolder}}">{{folderName}}</button>
              </sc-if>
            </div>
            <div class="l8title">
              <div class="l8name"><h1>{{hereName}}</h1><span class="l8sub tnum">{{hereCount}}</span></div>
              ${
                phone
                  ? ""
                  : `<div class="l8act">
                <sc-if value="{{showTagBtn}}" hint-placeholder-val="{{ true }}"><button type="button" class="btn2" onClick="{{openTag}}">${D8I.spark}Tag with AI</button></sc-if>
                <button type="button" class="btn2" onClick="{{openGenerate}}">Generate images</button>
                <sc-if value="{{uploadAccent}}" hint-placeholder-val="{{ true }}"><button type="button" class="cta" onClick="{{upload}}">Upload</button></sc-if>
                <sc-if value="{{generateAccent}}" hint-placeholder-val="{{ false }}"><button type="button" class="cta" onClick="{{openGenerate}}">Generate images</button></sc-if>
              </div>`
              }
            </div>
          </div>

          ${reviewRow}
          ${taggingRow}
          ${folderGrid}
          ${imageRun}

          <sc-if value="{{showEmpty}}" hint-placeholder-val="{{ false }}">
            <div class="es8">
              <span class="ic">${D8I.imagesLg}</span>
              <p>{{emptyText}}</p>
              <div class="acts">
                <sc-if value="{{emptyCanFolder}}" hint-placeholder-val="{{ false }}"><button type="button" class="btn2" onClick="{{openNewFolder}}">${D8I.plusSm}New folder</button></sc-if>
                <button type="button" class="btn2" onClick="{{upload}}">${D8I.upload}Upload</button>
                <button type="button" class="cta" onClick="{{openGenerate}}">Generate images</button>
              </div>
            </div>
          </sc-if>`;
}

function page(phone, init) {
  return `
      <main class="main">
        <div class="page {{pageCls}}">
          <sc-if value="{{isGrid}}" hint-placeholder-val="{{ ${init.view === "grid"} }}">${grid()}</sc-if>
          <sc-if value="{{isLibrary}}" hint-placeholder-val="{{ ${init.view === "library"} }}">${library(phone)}</sc-if>
        </div>
      </main>`;
}

/* Generate images: a prompt, and when you want one a base image. It never
   picks a folder — what it makes lands in the library (Garreth, 2026-09-16). */
function generateDialog() {
  return `
    <div class="dlg8" role="dialog" aria-modal="true" aria-labelledby="d8-gen-title" onKeyDown="{{dialogKey}}">
      <div class="dh8"><h2 id="d8-gen-title">Generate images</h2><button type="button" class="icon-btn" aria-label="Close" onClick="{{closeDialog}}">${D8I.x}</button></div>
      <div class="dbody">
        <div class="frow8">
          <label class="flabel8" for="d8-prompt">Prompt</label>
          <div class="fctl8"><div class="field8"><textarea id="d8-prompt" placeholder="A woman at a bathroom mirror in morning light, shot from the side, no text">{{promptVal}}</textarea></div></div>
        </div>
        <div class="frow8">
          <span class="flabel8" id="d8-base">Base image<span class="opt">{{baseCount}}</span></span>
          <div class="fctl8">
            <div class="bases" role="group" aria-labelledby="d8-base">
              <button type="button" class="base base--up" aria-label="Upload a base image" onClick="{{uploadBase}}">${D8I.uploadLg}</button>
              <sc-for list="{{bases}}" as="b" hint-placeholder-count="6">
                <button type="button" class="base {{b.cls}}" aria-pressed="{{b.on}}" aria-label="{{b.label}}" onClick="{{b.toggle}}"><span class="tick">${D8I.checkSm}</span></button>
              </sc-for>
            </div>
          </div>
        </div>
        <div class="frow8">
          <label class="flabel8" for="d8-many">How many</label>
          <div class="fctl8">
            <div class="step8">
              <button type="button" aria-label="Fewer images" disabled="{{manyDecOff}}" onClick="{{manyDec}}">${D8I.minusSm}</button>
              <span id="d8-many">{{manyVal}}</span>
              <button type="button" aria-label="More images" disabled="{{manyIncOff}}" onClick="{{manyInc}}">${D8I.plusSm}</button>
            </div>
          </div>
        </div>
        <div class="frow8">
          <span class="flabel8" id="d8-shape">Shape</span>
          <div class="fctl8">
            <div class="seg8" role="radiogroup" aria-labelledby="d8-shape">
              <button type="button" role="radio" aria-checked="{{shapePortrait}}" onClick="{{pickPortrait}}">Portrait</button>
              <button type="button" role="radio" aria-checked="{{shapeTall}}" onClick="{{pickTall}}">Tall</button>
              <button type="button" role="radio" aria-checked="{{shapeSquare}}" onClick="{{pickSquare}}">Square</button>
            </div>
          </div>
        </div>
      </div>
      <div class="dfoot">
        <span class="status8" role="status" aria-live="polite">{{genStatus}}</span>
        <button type="button" class="cta" onClick="{{runGenerate}}">Generate</button>
      </div>
    </div>`;
}

/*
 * One image. The details are `carousel_images`'s own columns, because this is
 * what the renderer reads back when it picks an image for a slide.
 */
function imageDialog() {
  return `
    <div class="dlg8 dlg8--wide" role="dialog" aria-modal="true" aria-labelledby="d8-img-title" onKeyDown="{{dialogKey}}">
      <div class="dh8"><h2 id="d8-img-title">{{imgTitle}}</h2><button type="button" class="icon-btn" aria-label="Close" onClick="{{closeDialog}}">${D8I.x}</button></div>
      <div class="dbody">
        <div class="ibody">
          <div class="ileft">
            <span class="ibig {{imgCls}}" aria-hidden="true"></span>
            <div class="iacts">
              <button type="button" class="iact" onClick="{{cutOut}}"><span class="ic">${D8I.eraser}</span>Remove the background<span class="sub">Automatic</span></button>
              <button type="button" class="iact" onClick="{{blackWhite}}"><span class="ic">${D8I.circleHalf}</span>Black and white<span class="sub">Automatic</span></button>
              <button type="button" class="iact" onClick="{{aiEdit}}"><span class="ic">${D8I.sparkLg}</span>Edit with AI<span class="sub">Waits for Keep</span></button>
              <sc-if value="{{canMakeCover}}" hint-placeholder-val="{{ false }}">
                <button type="button" class="iact" onClick="{{makeCover}}"><span class="ic">${D8I.starLg}</span>Make this the cover</button>
              </sc-if>
            </div>
          </div>
          <div class="iside">
            <div class="imeta">
              <span class="pill">{{imgWhere}}</span>
              <span class="pill tnum">{{imgSize}}</span>
              <span class="pill pill--quiet tnum">{{imgAdded}}</span>
              <sc-if value="{{imgIsCover}}" hint-placeholder-val="{{ true }}"><span class="pill pill--accent">${D8I.star}Library cover</span></sc-if>
            </div>
            <sc-if value="{{hasDetails}}" hint-placeholder-val="{{ true }}">
              <div class="dets">
                <p class="detdesc">{{description}}</p>
                <sc-for list="{{details}}" as="d" hint-placeholder-count="8">
                  <div class="det"><span class="dk">{{d.key}}</span><span class="dv {{d.cls}}">{{d.value}}</span></div>
                </sc-for>
                <div class="det"><span class="dk">Arc roles</span><span class="dv"><span class="roles"><sc-for list="{{roles}}" as="r" hint-placeholder-count="2"><span class="pill">{{r.name}}</span></sc-for></span></span></div>
                <div class="det"><span class="dk">Quality</span><span class="dv tnum">{{quality}}</span></div>
                <div class="detfoot">{{detailsRead}}<button type="button" class="tbtn8" onClick="{{rescan}}">Read again</button></div>
              </div>
            </sc-if>
            <sc-if value="{{noDetails}}" hint-placeholder-val="{{ false }}">
              <div class="dets dets--none">
                <p>Nothing read off this image yet</p>
                <button type="button" class="btn2" onClick="{{scan}}">${D8I.eye}Read it with AI</button>
              </div>
            </sc-if>
          </div>
        </div>
      </div>
      <div class="dfoot">
        <span class="status8"><button type="button" class="tbtn8" onClick="{{moveFolder}}">{{moveLabel}}${I.caretRightSm}</button></span>
        <button type="button" class="hold8 {{holdCls}}"><i aria-hidden="true"></i><span>Retire image</span></button>
      </div>
    </div>`;
}

/* What Tag with AI is about to do: read the images, and optionally file them. */
function tagDialog() {
  return `
    <div class="dlg8 dlg8--narrow" role="dialog" aria-modal="true" aria-labelledby="d8-tag-title" onKeyDown="{{dialogKey}}">
      <div class="dh8"><h2 id="d8-tag-title">Tag with AI</h2><button type="button" class="icon-btn" aria-label="Close" onClick="{{closeDialog}}">${D8I.x}</button></div>
      <div class="dbody">
        <div class="frow8">
          <span class="flabel8" id="d8-which">Images</span>
          <div class="fctl8">
            <div class="seg8" role="radiogroup" aria-labelledby="d8-which">
              <button type="button" role="radio" aria-checked="{{tagUnread}}" onClick="{{pickUnread}}">Not read yet</button>
              <button type="button" role="radio" aria-checked="{{tagAll}}" onClick="{{pickAllImages}}">All</button>
            </div>
          </div>
        </div>
        <div class="frow8">
          <span class="flabel8">Folders</span>
          <div class="fctl8">
            <div class="sw">
              <button type="button" class="swt" role="switch" aria-checked="{{sortOn}}" aria-label="Sort them into folders too" onClick="{{toggleSort}}"><span class="swk"></span></button>
              <span>Sort them into folders too</span>
            </div>
          </div>
        </div>
      </div>
      <div class="dfoot">
        <span class="status8" role="status" aria-live="polite">{{tagStatus}}</span>
        <button type="button" class="cta" onClick="{{startTagging}}">Start</button>
      </div>
    </div>`;
}

/* Naming a new folder. Nothing else is asked. */
function newFolderDialog() {
  return `
    <div class="dlg8 dlg8--narrow" role="dialog" aria-modal="true" aria-labelledby="d8-fold-title" onKeyDown="{{dialogKey}}">
      <div class="dh8"><h2 id="d8-fold-title">{{newFolderTitle}}</h2><button type="button" class="icon-btn" aria-label="Close" onClick="{{closeDialog}}">${D8I.x}</button></div>
      <div class="dbody">
        <div class="frow8">
          <div class="fctl8"><div class="field8"><input id="d8-foldname" type="text" maxlength="40" placeholder="Covers, celebrities" value="{{newFolderName}}" onChange="{{typeFolderName}}" /></div></div>
        </div>
      </div>
      <div class="dfoot">
        <span class="status8" role="status" aria-live="polite">{{newFolderStatus}}</span>
        <button type="button" class="cta" onClick="{{createFolder}}">Create</button>
      </div>
    </div>`;
}

function appOverlay() {
  return `
  <sc-if value="{{anyDialog}}" hint-placeholder-val="{{ false }}"><div class="scrim8" aria-hidden="true" onClick="{{closeDialog}}"></div></sc-if>
  <sc-if value="{{genOpen}}" hint-placeholder-val="{{ false }}">${generateDialog()}</sc-if>
  <sc-if value="{{imgOpen}}" hint-placeholder-val="{{ false }}">${imageDialog()}</sc-if>
  <sc-if value="{{tagOpen}}" hint-placeholder-val="{{ false }}">${tagDialog()}</sc-if>
  <sc-if value="{{foldOpen}}" hint-placeholder-val="{{ false }}">${newFolderDialog()}</sc-if>`;
}

function colOverlay(phone) {
  if (!phone) return "";
  return `
    <sc-if value="{{showBar}}" hint-placeholder-val="{{ false }}">
      <div class="bar8">
        <button type="button" class="btn2" onClick="{{openTag}}">${D8I.spark}Tag</button>
        <button type="button" class="btn2" onClick="{{openGenerate}}">Generate</button>
        <button type="button" class="cta" onClick="{{upload}}">Upload</button>
      </div>
    </sc-if>`;
}

/* ── Behaviour ─────────────────────────────────────────────────────────── */

function vals(init) {
  return `
    var PHONE = ctx.PHONE;
    var LIBS = ${JSON.stringify(LIBS)};
    var ROW = ${JSON.stringify(ROW)};
    var COVER_PEEK = ${JSON.stringify(COVER_PEEK)};
    var DETAILS = ${JSON.stringify(DETAILS)};
    var ARC_ROLES = ${JSON.stringify(ARC_ROLES)};
    var DESCRIPTION = ${JSON.stringify(DESCRIPTION)};
    var QUALITY = ${JSON.stringify(QUALITY)};
    var RUN = ${JSON.stringify(RUN)};
    var INIT = ${JSON.stringify(init)};
    var PER_ROW = ${init.phone ? 3 : 8};

    var fmt = function (n) { return n.toLocaleString("en-US"); };
    var images = function (n) { return n === 1 ? "1 image" : fmt(n) + " images"; };
    var inFolders = function (l) { return l.folders.reduce(function (sum, f) { return sum + f.count; }, 0); };
    var total = function (l) { return inFolders(l) + l.loose; };
    var list = function (names) { return names.length < 2 ? names.join("") : names.slice(0, -1).join(", ") + " and " + names[names.length - 1]; };

    var lib = LIBS.filter(function (l) { return l.id === s.libId; })[0] || LIBS[0];
    var libTotal = total(lib);
    var folder = s.folder ? lib.folders.filter(function (f) { return f.name === s.folder; })[0] : null;
    var subs = folder ? folder.subs || [] : [];
    var sub = s.sub ? subs.filter(function (x) { return x[0] === s.sub; })[0] : null;
    var coverPhoto = ROW.All[0];

    var openImage = function (photo, where, raw) {
      self.setState({ dialog: "image", imgPhoto: photo, imgWhere: where, imgRaw: !!raw });
    };

    /* Where we are, and what sits here. */
    var hereName, hereCount, hereFolders, hereImages, herePool, hereTitled, hereTitle, hereHeadCls;
    if (sub) {
      hereName = sub[0]; hereCount = images(sub[1]); hereFolders = [];
      hereImages = sub[1]; herePool = folder.name; hereTitled = false; hereTitle = ""; hereHeadCls = "";
    } else if (folder) {
      hereName = folder.name;
      hereCount = images(folder.count);
      hereFolders = subs.map(function (x) { return { name: x[0], count: x[1], subs: [] }; });
      /* A folder that holds folders also holds whatever was not filed into them. */
      var inSubs = subs.reduce(function (sum, x) { return sum + x[1]; }, 0);
      hereImages = folder.count - inSubs;
      herePool = folder.name;
      hereTitled = subs.length > 0;
      hereTitle = "Not in a folder";
      hereHeadCls = "is-loose";
    } else {
      hereName = lib.name;
      hereCount = libTotal === 0 ? "Nothing in it yet" : images(libTotal);
      hereFolders = lib.folders;
      hereImages = lib.loose;
      herePool = "All";
      hereTitled = lib.folders.length > 0;
      hereTitle = "Not in a folder";
      hereHeadCls = "is-loose";
    }

    var folders = hereFolders.map(function (f) {
      var pool = ROW[f.name] || ROW.All;
      var peek = [];
      for (var i = 0; i < 4; i++) peek.push({ cls: "ph-" + pool[i % pool.length] });
      var subNames = (f.subs || []).map(function (x) { return x[0]; });
      return {
        name: f.name,
        count: fmt(f.count),
        subText: subNames.length ? subNames.length + " folders · " + list(subNames) : "",
        peek: f.count > 0 ? peek : [],
        open: (function (n) {
          return function () { self.setState(folder ? { sub: n } : { folder: n, sub: null }); };
        })(f.name)
      };
    });

    /* Tiles. A raw tile is one nothing has been read off yet. */
    var pool = ROW[herePool] || ROW.All;
    var cap = PER_ROW * (${init.phone ? 4 : 3});
    var tiles = [];
    for (var i = 0; i < Math.min(hereImages, cap); i++) {
      var photo = pool[i % pool.length];
      var raw = !INIT.tagged && i % 3 === 2;
      tiles.push({
        cls: "ph-" + photo,
        label: hereName + " image " + (i + 1),
        isCover: !folder && i === 0 && photo === coverPhoto,
        raw: raw,
        open: (function (p, r) { return function () { openImage(p, hereName, r); }; })(photo, raw)
      });
    }

    /* The run: generating, then waiting for Keep, or one that did not come back. */
    var runState = s.run;
    var runCells = RUN.map(function (photo, i) {
      var st = "done";
      if (runState === "generating") st = i < 3 ? "done" : "busy";
      if (runState === "failed" && i === 4) st = "fail";
      return {
        cls: "ph-" + photo,
        isDone: st === "done", isBusy: st === "busy", isFail: st === "fail",
        keep: function () { self.note("Keeps this image into " + lib.name + ", untagged until someone reads it"); },
        discard: function () { self.note("Drops this image; nothing uses it yet"); },
        retry: function () { self.note("Asks Higgsfield for this image again"); }
      };
    });
    var runTitles = { generating: "Generating", review: "Waiting for you", failed: "Waiting for you" };
    var runMetas = { generating: "3 of 6 back", review: "6 images, none kept yet", failed: "5 of 6 back" };

    var bases = ROW.All.slice(0, 6).map(function (p, i) {
      return {
        cls: "ph-" + p,
        on: s.bases.indexOf(i) >= 0 ? "true" : "false",
        label: "Base image " + (i + 1),
        toggle: (function (n) {
          return function () {
            var next = s.bases.slice();
            var at = next.indexOf(n);
            if (at >= 0) next.splice(at, 1); else next.push(n);
            self.setState({ bases: next });
          };
        })(i)
      };
    });

    var untagged = Math.round(libTotal * 0.42);

    /* The board's three slots: the library's first images, and a plain panel
       wherever it has none. Nothing but the name and the count goes under it. */
    var cards = LIBS.map(function (l) {
      var t = total(l);
      var pool = COVER_PEEK[l.id] || ROW.All;
      var peek = [];
      for (var k = 0; k < 3; k++) peek.push({ cls: k < t && pool[k] ? "ph-" + pool[k] : "is-blank" });
      return {
        name: l.name,
        count: t === 0 ? "Nothing in it yet" : images(t),
        peek: peek,
        open: (function (id) { return function () { self.setState({ view: "library", libId: id, folder: null, sub: null }); }; })(l.id)
      };
    });

    var closeDialog = function () { self.setState({ dialog: null }); };
    var nothingHere = hereImages === 0 && folders.length === 0;

    return {
      isGrid: s.view === "grid",
      isLibrary: s.view === "library",
      gCount: LIBS.length + " libraries",
      cards: cards,
      newLibrary: function () { self.note("Names a new library and opens it empty"); },

      /* Where we are */
      hereName: hereName,
      hereCount: hereCount,
      libShort: lib.name,
      folderName: folder ? folder.name : "",
      inFolder: !!folder,
      inSub: !!sub,
      backToGrid: function () { self.setState({ view: "grid", folder: null, sub: null, dialog: null }); },
      backToLibrary: function () { self.setState({ folder: null, sub: null }); },
      backToFolder: function () { self.setState({ sub: null }); },

      /* The header's actions */
      showTagBtn: libTotal > 0,
      uploadAccent: libTotal > 0,
      generateAccent: libTotal === 0,
      upload: function () { self.note("Opens the file picker; the images land here"); },
      openGenerate: function () { self.setState({ dialog: "generate" }); },
      openTag: function () { self.setState({ dialog: "tag" }); },

      /* Folders, then images. With nothing here at all the empty state carries
         the actions instead, so the lone New folder card does not sit above it. */
      showFolders: folders.length > 0 || hereImages > 0,
      folders: folders,
      openNewFolder: function () { self.setState({ dialog: "newfolder" }); },
      showImages: hereImages > 0,
      tiles: tiles,
      imagesTitled: hereTitled && hereImages > 0,
      imagesTitle: hereTitle,
      imagesHeadCls: hereHeadCls,
      imagesCount: images(hereImages),

      showEmpty: nothingHere,
      emptyText: folder ? "Nothing in " + hereName + " yet" : "Nothing in " + lib.name + " yet",
      emptyCanFolder: true,
      /* The empty state is the whole page, so it stretches to the bottom. */
      pageCls: s.view === "library" && nothingHere && !runState && !s.tagging ? "is-fill" : "",

      /* The review row */
      showRun: !!runState,
      runPlainCls: runState === "generating" ? "is-plain" : "",
      runTitle: runTitles[runState] || "",
      runMeta: runMetas[runState] || "",
      runDone: runState === "review" || runState === "failed",
      runCells: runCells,
      keepAll: function () { self.note("Keeps all six into " + lib.name + ", untagged until someone reads them"); },
      discardAll: function () { self.note("Drops all six; nothing uses them yet"); },
      showCredits: runState === "failed",
      openCredits: function () { self.note("Opens Higgsfield's billing page"); },

      /* AI vision reading the library */
      showTagging: !!s.tagging,
      tagMeta: "31 of " + fmt(untagged) + " read",
      tagPct: "31%",
      stopTagging: function () { self.setState({ tagging: false }); },

      /* The dialogs */
      anyDialog: !!s.dialog,
      genOpen: s.dialog === "generate",
      imgOpen: s.dialog === "image",
      tagOpen: s.dialog === "tag",
      foldOpen: s.dialog === "newfolder",
      closeDialog: closeDialog,
      dialogKey: function (e) { if (e.key === "Escape") { e.stopPropagation(); closeDialog(); } },

      /* Tag with AI */
      tagUnread: s.tagWhich === "unread" ? "true" : "false",
      tagAll: s.tagWhich === "all" ? "true" : "false",
      pickUnread: function () { self.setState({ tagWhich: "unread" }); },
      pickAllImages: function () { self.setState({ tagWhich: "all" }); },
      sortOn: s.sortToo ? "true" : "false",
      toggleSort: function () { self.setState({ sortToo: !s.sortToo }); },
      tagStatus: s.tagWhich === "all" ? images(libTotal) : fmt(untagged) + " not read yet",
      startTagging: function () { self.setState({ dialog: null, tagging: true }); },

      /* New folder */
      newFolderTitle: folder ? "New folder in " + folder.name : "New folder",
      newFolderName: s.newFolderName,
      typeFolderName: function (e) { self.setState({ newFolderName: e.target.value }); },
      newFolderStatus: folders.length ? folders.length + " folders here" : "The first folder here",
      createFolder: function () { closeDialog(); self.note("Makes the folder, empty, ready for images"); },

      /* Generate images */
      promptVal: s.prompt,
      bases: bases,
      baseCount: s.bases.length ? s.bases.length + " picked" : "Optional",
      uploadBase: function () { self.note("Uploads a photo to work from"); },
      manyVal: String(s.many),
      manyDecOff: s.many <= 1,
      manyIncOff: s.many >= 8,
      manyDec: function () { self.setState({ many: Math.max(1, s.many - 1) }); },
      manyInc: function () { self.setState({ many: Math.min(8, s.many + 1) }); },
      shapePortrait: s.shape === "portrait" ? "true" : "false",
      shapeTall: s.shape === "tall" ? "true" : "false",
      shapeSquare: s.shape === "square" ? "true" : "false",
      pickPortrait: function () { self.setState({ shape: "portrait" }); },
      pickTall: function () { self.setState({ shape: "tall" }); },
      pickSquare: function () { self.setState({ shape: "square" }); },
      genStatus: s.fromD2 ? "Back to " + INIT.fromName + " once these are kept" : "",
      runGenerate: function () { self.setState({ dialog: null, run: "generating" }); },

      /* One image, and what was read off it */
      imgTitle: (s.imgWhere || lib.name) + " image",
      imgCls: "ph-" + (s.imgPhoto || "mug"),
      imgWhere: s.imgWhere && s.imgWhere !== lib.name ? s.imgWhere : "Not in a folder",
      imgSize: "1024 × 1280",
      imgAdded: "Added Sep 12",
      imgIsCover: s.imgPhoto === coverPhoto && !folder,
      canMakeCover: !(s.imgPhoto === coverPhoto && !folder),
      hasDetails: !s.imgRaw,
      noDetails: !!s.imgRaw,
      description: DESCRIPTION,
      details: DETAILS.map(function (d) { return { key: d[0], value: d[1], cls: d[0] === "Pillar" ? "mono" : "" }; }),
      roles: ARC_ROLES.map(function (r) { return { name: r }; }),
      quality: QUALITY + " of 10",
      detailsRead: "Read by AI on Sep 14",
      scan: function () { self.note("AI vision reads this image and fills the details in"); },
      rescan: function () { self.note("AI vision reads this image again"); },
      cutOut: function () { self.note("Removes the background and keeps the cut-out"); },
      blackWhite: function () { self.note("Makes a black and white copy"); },
      aiEdit: function () { self.note("Describes a change; the edit waits for Keep"); },
      makeCover: function () { self.note("This image becomes the library's cover"); },
      moveLabel: s.imgWhere && s.imgWhere !== lib.name ? "Move to another folder" : "Put it in a folder",
      moveFolder: function () { self.note("Moves this image into a folder"); },
      holdCls: s.armed ? "is-armed" : "",

      showBar: PHONE && s.view === "library"
    };`;
}

/**
 * D8 as a screen. `init` says which view it opens on, which library, how deep
 * into its folders, and whether a dialog or a run is showing.
 */
export function librariesScreen({ init = {} } = {}) {
  const full = {
    view: "grid",
    libId: "window",
    folder: null,
    sub: null,
    dialog: null,
    run: null,
    tagging: false,
    /* Whether AI vision has been over this library already. */
    tagged: false,
    fromD2: false,
    fromName: "Before & After",
    armed: false,
    phone: false,
    tall: 0,
    ...init,
  };
  return {
    id: "libraries",
    nav: "libraries",
    css: (phone) => css(phone, full),
    markup: (phone) => page(phone, full),
    appOverlay,
    colOverlay,
    state: {
      view: full.view,
      libId: full.libId,
      folder: full.folder,
      sub: full.sub,
      dialog: full.dialog,
      run: full.run,
      tagging: full.tagging,
      fromD2: full.fromD2,
      armed: full.armed,
      imgPhoto: full.imgPhoto || "mug",
      imgWhere: full.imgWhere || null,
      imgRaw: !!full.imgRaw,
      newFolderName: "",
      prompt: "",
      bases: full.bases || [],
      many: 6,
      shape: "portrait",
      tagWhich: "unread",
      sortToo: full.sortToo === undefined ? true : full.sortToo,
    },
    enter: { view: "grid", folder: null, sub: null, dialog: null, run: null, tagging: false, armed: false },
    vals: vals(full),
  };
}

/* ── Review artboards ──────────────────────────────────────────────────── */

function build(OUT) {
  fs.mkdirSync(OUT, { recursive: true });
  copyLibraryImages(OUT);

  const BOARDS = [
    { file: "Main.dc.html", title: "D8 · Image libraries · Desktop", init: { view: "grid" }, x: 0, y: 0 },
    {
      file: "Library.dc.html",
      title: "D8 · A library with no folders, the default · Desktop",
      init: { view: "library", libId: "window", tall: HEAD_H + FOLDER_H + 3 * ROW_H + 60 },
      x: 1540,
      y: 0,
    },
    {
      file: "Folders.dc.html",
      title: "D8 · A library whose images are in folders · Desktop",
      init: { view: "library", libId: "mirror", tall: HEAD_H + FOLDER_H + 3 * ROW_H + 60 },
      x: 3080,
      y: 0,
    },
    {
      file: "InFolder.dc.html",
      title: "D8 · Inside a folder that holds folders · Desktop",
      init: { view: "library", libId: "mirror", folder: "Cover", tall: HEAD_H + FOLDER_H + 3 * ROW_H + 60 },
      x: 0,
      y: 1300,
    },
    {
      file: "Generate.dc.html",
      title: "D8 · Generate images · Desktop",
      init: { view: "library", libId: "window", dialog: "generate", bases: [1], tall: 900 },
      x: 1540,
      y: 1300,
    },
    {
      file: "Generating.dc.html",
      title: "D8 · The images arriving · Desktop",
      init: { view: "library", libId: "window", run: "generating", tall: HEAD_H + FOLDER_H + 3 * ROW_H + 400 },
      x: 3080,
      y: 1300,
    },
    {
      file: "Review.dc.html",
      title: "D8 · Waiting for Keep, all clear · Desktop",
      init: { view: "library", libId: "window", run: "review", tall: HEAD_H + FOLDER_H + 3 * ROW_H + 440 },
      x: 0,
      y: 2600,
    },
    {
      file: "Failed.dc.html",
      title: "D8 · One image failed, and no credits left · Desktop",
      init: { view: "library", libId: "window", run: "failed", tall: HEAD_H + FOLDER_H + 3 * ROW_H + 500 },
      x: 1540,
      y: 2600,
    },
    {
      file: "Image.dc.html",
      title: "D8 · One image and what was read off it · Desktop",
      init: { view: "library", libId: "mirror", folder: "Before", dialog: "image", imgPhoto: "vanity", imgWhere: "Before", tagged: true, armed: true, tall: 940 },
      x: 3080,
      y: 2600,
    },
    {
      file: "ImageNew.dc.html",
      title: "D8 · An image with nothing read off it yet · Desktop",
      init: { view: "library", libId: "window", dialog: "image", imgPhoto: "shower", imgRaw: true, tall: 940 },
      x: 0,
      y: 3900,
    },
    {
      file: "TagAsk.dc.html",
      title: "D8 · What Tag with AI will do · Desktop",
      init: { view: "library", libId: "window", dialog: "tag", tall: 900 },
      x: 1540,
      y: 3900,
    },
    {
      file: "Tagging.dc.html",
      title: "D8 · AI vision reading the images · Desktop",
      init: { view: "library", libId: "window", tagging: true, tall: HEAD_H + FOLDER_H + 3 * ROW_H + 220 },
      x: 3080,
      y: 3900,
    },
    {
      file: "NewFolder.dc.html",
      title: "D8 · Naming a new folder · Desktop",
      init: { view: "library", libId: "mirror", dialog: "newfolder", tall: 900 },
      x: 0,
      y: 5200,
    },
    {
      file: "FromD2.dc.html",
      title: "D8 · Opened by D2's Generate with AI · Desktop",
      init: { view: "library", libId: "kitchen", dialog: "generate", fromD2: true, tall: 900 },
      x: 1540,
      y: 5200,
    },
    {
      file: "Empty.dc.html",
      title: "D8 · A library with nothing in it · Desktop",
      init: { view: "library", libId: "backdrops", tall: 900 },
      x: 3080,
      y: 5200,
    },
    {
      file: "EmptyFolder.dc.html",
      title: "D8 · A folder with nothing in it · Desktop",
      init: { view: "library", libId: "kitchen", folder: "After", tall: 900 },
      x: 0,
      y: 6300,
    },
    { file: "Phone.dc.html", title: "D8 · Image libraries · Phone", phone: true, init: { view: "grid", phone: true }, x: 4620, y: 0 },
    {
      file: "PhoneLibrary.dc.html",
      title: "D8 · One library and its folders · Phone",
      phone: true,
      init: { view: "library", libId: "mirror", phone: true, tall: 1500 },
      x: 5090,
      y: 0,
    },
    {
      file: "PhoneGenerate.dc.html",
      title: "D8 · Generate images · Phone",
      phone: true,
      init: { view: "library", libId: "window", dialog: "generate", phone: true, bases: [1] },
      x: 5560,
      y: 0,
    },
    {
      file: "PhoneImage.dc.html",
      title: "D8 · One image and what was read off it · Phone",
      phone: true,
      init: { view: "library", libId: "mirror", folder: "Before", dialog: "image", imgPhoto: "vanity", imgWhere: "Before", tagged: true, phone: true },
      x: 6030,
      y: 0,
    },
  ];

  /* Each board twice: the Dark page, then the Light page (Garreth approved
     dark on 2026-09-16). The light values are globals.css's own, carried by
     the kit's tokens, so nothing here is retyped per theme. */
  const artboards = [];
  for (const light of [false, true]) {
    for (const b of BOARDS) {
      const phone = !!b.phone;
      const file = light ? b.file.replace(".dc.html", "Light.dc.html") : b.file;
      fs.writeFileSync(
        path.join(OUT, file),
        artboard({ phone, light, screens: [librariesScreen({ init: { ...b.init, phone } })], navMode: "note" }),
      );
      artboards.push({
        file,
        title: light ? `${b.title} · Light` : b.title,
        page: light ? "light" : "dark",
        x: b.x,
        y: b.y,
        w: phone ? 390 : 1440,
        h: b.init.tall || (phone ? 844 : 900),
        is_interactive: true,
      });
    }
  }

  const tryNote =
    "Clickable. Open a library, then open a folder — Cover holds folders of its own, so the breadcrumb goes three deep.\n\nClick any image to see what AI vision read off it. The headings are the live carousel_images columns.\n\nA small amber dot means nothing has been read off that image yet. Generated images always arrive that way.";
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
          { id: "d8-try", page: "dark", x: 6500, y: 0, w: 390, text: tryNote },
          { id: "d8-try-light", page: "light", x: 6500, y: 0, w: 390, text: tryNote },
        ],
        launch: { view: "canvas", page: "light" },
      },
      null,
      2,
    ),
  );
  console.log(`Wrote D8 artboards to ${OUT}`);
}

if (isMain(import.meta.url)) build(path.resolve(process.argv[2] ?? path.join(HERE, "out")));
