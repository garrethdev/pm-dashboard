#!/usr/bin/env node
/*
 * D6 · Studio — where a new carousel type is made, and where an existing one
 * is edited: New carousel type on D1 or Studio in the menu opens it at its
 * start; Edit template on a type's page (D7) opens its active version.
 *
 * Design step only (docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md, D6). Nothing
 * here is app code. The shell comes from generator-kit.mjs, but the Studio
 * hides its menu and top bar (Garreth, 2026-09-15) and puts its own toolbar
 * in their place; this file is the screen. All content is made-up sample
 * data: an invented "Morning Routine" type, D2's invented libraries, and bank
 * photos from the Supabase image store in the image cells (the same shots D5
 * uses, downsampled again and named d6-*).
 *
 * From Garreth's three reviews of 2026-09-15, in order:
 *   - The Studio takes the whole screen. No menu, no top bar; a toolbar in
 *     their place with a back button (the menu's own back-row shape) that
 *     returns to Carousel types, the title in the exact middle, and the
 *     actions on the right. The title is the type's name: press it to
 *     rename.
 *   - It opens on two portrait cards in the middle of the sandbox: Start
 *     from a reference deck (a saved deck from Trends) or Discuss your idea
 *     (the conversation). Either one leads to the image library: an existing
 *     one, or a new one by name. Discuss your idea opens a chat box in the
 *     reviewed shape (a leading icon tile, a placeholder that cycles through
 *     sample ideas, an attach button and a square send button).
 *   - Once the draft exists, the layout is an editor's: a fixed side panel on
 *     the left that folds to a thin rail, holding the adjustments for
 *     whatever is selected and, in the same panel, the library's images (or
 *     Upload images and Generate with AI for a new library); the canvas in
 *     the middle, infinite and pannable like Figma, with every slide laid
 *     out in a row on a dotted grid; a fixed side panel on the right that
 *     folds to a rail, holding the conversation. Nothing floats except the
 *     two small strips over the canvas: the slide count with Render preview
 *     and Regenerate sample at the top centre, and the pointer, text and
 *     image tools at the bottom centre, both always centred on the canvas.
 *   - No separate rendered preview beside the canvas: Render preview marks
 *     the selected slide Rendered (or Render failed, with Retry) in its
 *     caption.
 *   - Discard draft is a plain outlined button, not red; still a hold with a
 *     neutral fill.
 *   - Phone: the slides pan sideways, the adjustments open as a sheet from
 *     the bottom, the conversation floats over the slide behind a round
 *     button carrying the mark, and the bar holds the actions.
 *
 * Run directly, it writes D6's review artboards and canvas.json, each twice
 * (Dark page, Light page):
 *   Start          desktop, just opened: the two cards
 *   Library        desktop, the image library choice
 *   Reference      desktop, saved reference decks to start from
 *   Empty          desktop, Discuss your idea: the chat box, nothing else
 *   Drafting       desktop, the first draft arriving, the conversation open
 *   DraftFailed    desktop, the draft call failed: the error in the conversation, Retry
 *   Main           desktop, the slides on the canvas, the hook selected, the adjustments open
 *   Conversation   desktop, both panels open
 *   Collapsed      desktop, both panels folded to rails
 *   Rename         desktop, renaming the type from its title
 *   ImageCell      desktop, slide 2, an image cell selected: which set it draws from
 *   NoImages       desktop, the library has no images in a set a cell draws from
 *   NewLibrary     desktop, a new library: Upload images and Generate with AI in the panel
 *   Rendered       desktop, slide 1 rendered by the real painter
 *   RenderFailed   desktop, the render failed: the error in the slide's caption, Retry
 *   Save           desktop, the Save as carousel type dialog, the short name taken
 *   Discard        desktop, Discard draft being held
 *   Edit           desktop, editing Before & After: Save version, the versions list open
 *   Phone          phone, the simplified view
 *   PhoneTools     phone, the adjustments sheet open, slide size first
 *   PhoneChat      phone, the conversation sheet open
 *   PhoneFigma     phone, started from a Figma link: the conversation sheet with the file's chip (round two)
 *   PhoneLayers    phone, a layered template: the Layers list in the adjustments sheet (round two)
 *   AddSlot        desktop, the dashed Add slide slot after the last slide (round three)
 *   InsertBetween  desktop, the plus in the gap between two slides (round three)
 *   SlideMenu      desktop, a slide's menu open: Duplicate, Move left, Move right, Delete (round three)
 *   SlideWriting   desktop, a slide added after slide 3, its copy being written (round three)
 *   SlideAdded     desktop, the new slide written, the AI saying what it did (round three)
 *   DeleteFloor    desktop, two slides left: Delete unavailable (round three)
 *   PhoneAddSlide  phone, the slot at the end of the row and a slide's menu (round three)
 *
 * Round three (Garreth, 2026-09-17): slides can be added, duplicated, deleted and moved. A dashed slot the size of
 * a slide sits after the last one; hovering the gap between two slides shows a plus to insert there; each caption
 * carries a menu with Duplicate, Move left, Move right and Delete. A new slide takes the layout of the slide before
 * it and the AI writes its copy to match (its boxes pulse until the line lands); a duplicate copies the text too.
 * A carousel keeps at least two slides, so Delete is unavailable at two. The count in the top strip follows. The
 * phone has the slot and the menu (its dots always show), no hover plus.
 *
 * Round two (D11, approved 2026-09-15 and brought in here the same day) is layered over the first round further
 * down: slides at 4:5 or 9:16, a canvas that pans in every direction and zooms, Start from a Figma link, the chat box
 * that grows with the prompt, and layered templates. Its desktop pictures stay D11's, on D11's canvas.
 * Imported, `studioScreen()` is the Studio with round two; D11's build and the prototype draw it from here.
 *
 *   node docs/designs/carousel-generator/d6-studio.build.mjs <out dir>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { I, icon, artboard, isMain, REPO } from "./generator-kit.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const D6I = {
  retry: icon("ArrowClockwise", 12, "bold"),
  warnSm: icon("Warning", 12),
  alignL: icon("TextAlignLeft", 14, "bold"),
  alignC: icon("TextAlignCenter", 14, "bold"),
  alignR: icon("TextAlignRight", 14, "bold"),
  images: icon("Images", 20),
  imagesSm: icon("Images", 18),
  ai: icon("Sparkle", 14),
  aiSm: icon("Sparkle", 12),
  x: icon("X", 16, "bold"),
  render: icon("Eye", 12, "bold"),
  attach: icon("Paperclip", 15),
  send: icon("ArrowUp", 15, "bold"),
  enter: icon("KeyReturn", 15),
  cursor: icon("Cursor", 18),
  textT: icon("TextT", 18),
  image: icon("Image", 18),
  upload: icon("UploadSimple", 14, "bold"),
  cards: icon("Cards", 40, "thin"),
  chat: icon("ChatCircleDots", 40, "thin"),
  caretDown: icon("CaretDown", 16, "bold"),
  pencil: icon("PencilSimple", 14),
  sliders: icon("SlidersHorizontal", 18),
  foldL: icon("CaretDoubleLeft", 14, "bold"),
  foldR: icon("CaretDoubleRight", 14, "bold"),
  dots: icon("DotsThree", 16, "bold"),
  plusSm: icon("Plus", 14, "bold"),
  plusLg: icon("Plus", 22, "bold"),
  copy: icon("Copy", 14),
  trash: icon("Trash", 14),
  left: icon("ArrowLeft", 14, "bold"),
  right: icon("ArrowRight", 14, "bold"),
};

/* The Peptide Miracles mark, read from the app the way the kit reads it. */
const markRaw = fs.readFileSync(path.join(REPO, "src/components/ui/peptide-mark.tsx"), "utf8");
const markOf = (size) =>
  `<svg viewBox="${markRaw.match(/viewBox="([^"]+)"/)[1]}" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">` +
  [...markRaw.matchAll(/\sd="([^"]+)"/g)].map((m) => `<path d="${m[1]}"></path>`).join("") +
  "</svg>";
const MARK = markOf(24);
/* The dashboard's sidebar toggle (src/components/ui/sidebar-toggle-icon.tsx, verbatim, as the kit carries it): the
   one button that folds and unfolds a side panel here too (Garreth, 2026-09-15). */
const SIDEBAR_TOGGLE =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="4" stroke="currentColor" stroke-width="1.6"></rect><path d="M7 4h1.5a0 0 0 0 1 0 0v16a0 0 0 0 1 0 0H7a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Z" fill="currentColor"></path></svg>';
const toggleButton = (label, onClick, extra = "") =>
  `<button type="button" class="icon-btn ptoggle" aria-label="${label}" title="${label}" onClick="{{${onClick}}}">${SIDEBAR_TOGGLE}${extra}</button>`;

/* ── Sample content ────────────────────────────────────────────────────── */

/* Photos in the cells: bank photos from the Supabase image store, downsampled (the same shots as D5). */
const IMAGES = ["mug", "journal", "yoga", "oats", "shower", "dock", "vanity"];
const COVERS = ["window", "mirror", "outdoor", "kitchen"];
export function copyStudioImages(OUT) {
  for (const id of IMAGES) fs.copyFileSync(path.join(HERE, "assets", `d6-slide-${id}.jpg`), path.join(OUT, `d6-slide-${id}.jpg`));
  for (const id of COVERS) fs.copyFileSync(path.join(HERE, "assets", `d6-lib-${id}.jpg`), path.join(OUT, `d6-lib-${id}.jpg`));
  /* Round two's layered template: a product shot for the fixed slide, and D11's real photos (two before and after
     pairs from the store's glow-up bank, and the cover's cut-out, one of them with its background removed). */
  fs.copyFileSync(path.join(HERE, "assets", "d5-slide-serum.jpg"), path.join(OUT, "d6-slide-serum.jpg"));
  for (const f of ["cut.png", "photo-before.jpg", "photo-after.jpg", "photo-before2.jpg", "photo-after2.jpg"]) fs.copyFileSync(path.join(HERE, "assets", `d11-${f}`), path.join(OUT, `d6-${f}`));
}

/* D2's invented libraries and sets, so the picker reads the same on every screen. */
const GROUPS = ["Cover", "Before", "After", "Portrait"];
const LIBS = [
  { id: "window", name: "Soft Window Light", hue: "#c8a27a", g: [18, 41, 44, 23] },
  { id: "mirror", name: "Bathroom Mirror Mornings, Natural Light Series", hue: "#7aa0c8", g: [96, 402, 511, 275] },
  { id: "outdoor", name: "Outdoor Walks", hue: "#7ac8a0", g: [30, 90, 92, 0] },
  { id: "kitchen", name: "Kitchen Counter Shots", hue: "#b8b07a", g: [12, 46, 0, 0] },
];
/* Which of the seven photos each set shows in the panel. */
const GROUP_PHOTOS = { Cover: ["mug", "dock", "journal"], Before: ["journal", "shower", "oats"], After: ["vanity", "yoga", "mug"], Portrait: ["yoga", "shower", "dock"] };

/* Six slide layouts: cells as percentages of the slide (1080×1350 at 4:5), each drawing from a set; the text box's anchor. */
const LAYOUTS = [
  { cells: [{ x: 0, y: 0, w: 100, h: 100, g: "Cover" }], at: "bottom" },
  { cells: [{ x: 0, y: 0, w: 100, h: 50, g: "Before" }, { x: 0, y: 50, w: 100, h: 50, g: "After" }], at: "centre" },
  { cells: [{ x: 0, y: 0, w: 100, h: 100, g: "Cover" }], at: "top" },
  { cells: [{ x: 0, y: 0, w: 100, h: 100, g: "Portrait" }], at: "centre" },
  { cells: [{ x: 0, y: 0, w: 50, h: 100, g: "Before" }, { x: 50, y: 0, w: 50, h: 100, g: "After" }], at: "bottom" },
  { cells: [{ x: 0, y: 0, w: 100, h: 100, g: "Cover" }], at: "bottomUp" },
];
const PHOTOS = [["mug"], ["journal", "shower"], ["dock"], ["yoga"], ["oats", "vanity"], ["journal"]];

/* Two named text styles, at the template model's fields (§1: fill, stroke, shadow, wrap, alignment). Sizes are
   pixels on the 1080-wide slide. */
const STYLES = {
  hook: { font: "General Sans", weight: "Bold", size: 72, stroke: 4, shadow: "Soft", off: 6, blur: 12, align: "centre", wrap: 880 },
  line: { font: "General Sans", weight: "Semibold", size: 56, stroke: 3, shadow: "Hard", off: 4, blur: 0, align: "centre", wrap: 900 },
  small: { font: "General Sans", weight: "Semibold", size: 36, stroke: 2, shadow: "Hard", off: 3, blur: 0, align: "centre", wrap: 760 },
};

/* D14: a cover carrying three text boxes, so the Studio has a slide where three roles sit side by side — the
   question the ticket came out of (Garreth, 2026-09-21: how does the writer know what goes in three boxes on one
   slide?). Each box's name, who writes it, and a fixed box's own words. The fourth entry is a box added by hand
   from the tool strip: it has no role in the AI's draft, so it takes the default name below. */
const COVER3 = {
  lines: ["SIX WEEKS, ONE HABIT", "The 6am routine I actually kept", "Swipe for all six", "New text"],
  names: ["series", "hook", "swipe", ""],
  styles: ["small", "hook", "small", "small"],
  ats: ["top", "cover", "bottom2", "centre"],
  by: ["fixed", "ai", "batch", "ai"],
  fixed: ["SIX WEEKS, ONE HABIT", "", "", ""],
};

/* D14: where a box's words come from. AI writes it; Fixed paints the same words on every deck of the type; Per
   batch means the Generate form asks for it, the way it already asks for the opening line. A layered template
   drawing from sets adds a fourth, Set, which D11 supplies. */
const SOURCES = [["ai", "AI"], ["fixed", "Fixed"], ["batch", "Per batch"]];

/* Sample copy. A new type's draft ("Morning Routine", first person), and its regenerated sample; and the copy an
   existing type ("Before & After", D3's invented deck) opens with. Slide 4 carries the long line. */
const COPY = {
  morning: [
    ["The 6am routine I actually kept"],
    ["Water before coffee, every single morning"],
    ["Ten minutes of daylight before my phone"],
    ["The one habit that stuck through a whole grey winter, even on the mornings I nearly didn't"],
    ["Breakfast I never had to think about"],
    ["Six weeks in, the mirror agreed", "Save this for tomorrow morning"],
  ],
  morningAlt: [
    ["Six weeks of mornings that started before my phone"],
    ["A glass of water on the nightstand, every night"],
    ["Curtains open before anything else"],
    ["The walk I could do in slippers, which is the only reason it lasted through the whole of February"],
    ["Same breakfast, no decisions"],
    ["Nobody noticed. Then everybody did", "Try one morning, then the next"],
  ],
  before: [
    ["Six months of drinking water before coffee"],
    ["I took the same photo every Sunday"],
    ["Same window, same time, no filter"],
    ["Some weeks I forgot, and started again the next day without making it a big deal"],
    ["Month two is where most people quit"],
    ["The after photo isn't perfect, it's honest", "Pick one habit and give it ninety days"],
  ],
};
const IDEA = "A six-slide morning routine in first person, warm and plain, no products";
/* The chat box's placeholder cycles through these while it is empty. */
const PROMPTS = [
  "A six-slide morning routine in first person",
  "Myth vs fact on sleep, calm and plain, no numbers",
  "A day in the life, told in six photos",
  "Before and after, one habit, honest tone",
];
/* Saved reference decks, as Trends (D10) would keep them. */
const REFS = [
  { img: "vanity", title: "Skincare myths, calm and plain", meta: "7 slides · 24.3k · Sep 12" },
  { img: "dock", title: "Sunrise walk, day in the life", meta: "8 slides · 118k · Sep 11" },
  { img: "oats", title: "Breakfast without thinking", meta: "6 slides · 41.2k · Sep 9" },
  { img: "journal", title: "One habit, ninety days, no filter, told week by week", meta: "10 slides · 9.8k · Sep 8" },
  { img: "yoga", title: "Five minutes before the phone", meta: "6 slides · 2.1m · Sep 6" },
  { img: "mug", title: "Water before coffee", meta: "5 slides · 0 · Sep 2" },
  { img: "shower", title: "Cold shower, warm morning", meta: "7 slides · 66.4k · Aug 30" },
  { img: "journal", title: "The routine I stopped skipping", meta: "6 slides · 31k · Aug 27" },
];
/* A saved reference deck's own slides, as Trends keeps them: shown on the canvas, read-only, while the AI analyses
   them and after. Four of its seven, in the reference's own voice. */
const REF_SLIDES = [
  { img: "vanity", text: "Retinol before 25 is a myth" },
  { img: "shower", text: "You do not need ten steps" },
  { img: "journal", text: "Sunscreen indoors is not optional" },
  { img: "mug", text: "Drink the water, skip the miracle" },
];
const VERSIONS = [
  { v: 4, date: "Sep 12", active: true },
  { v: 3, date: "Sep 2" },
  { v: 2, date: "Aug 21" },
  { v: 1, date: "Aug 9" },
];

/* ── Styles ────────────────────────────────────────────────────────────── */

const SLIDE_W = { desk: 432, phone: 342 };
const SLIDE_GAP = 40;
const PAN_PAD = { desk: 120, phone: 24 };

function css(phone) {
  const S = ".screen-studio";
  const w = phone ? SLIDE_W.phone : SLIDE_W.desk;
  const dots = `background-image: radial-gradient(circle, color-mix(in srgb, var(--text-muted) 30%, transparent) 1px, transparent 1.2px); background-size: 20px 20px; background-position: 10px 10px;`;
  return `
/* ── D6 page ── */
:root { --ok: #4ade80; --pill-red: #ff4949; }
.app.is-light { --ok: #166534; --pill-red: #a11616; }
/* The Studio takes the whole screen (Garreth, 2026-09-15): the menu and top bar are hidden while it is open, and
   its own toolbar stands in their place. */
${S} .rail, ${S} .top, ${S} .scrim { display: none; }
${S} .col { overflow: hidden; }
${S} .main { padding: 0; display: flex; flex-direction: column; height: 100%; min-height: 0; }
${S} .page { gap: 0; flex: 1; min-height: 0; }
/* The toolbar: three columns, so the title sits in the exact middle whatever the back button and the actions
   measure (Garreth, 2026-09-15). */
${S} .sbar { position: relative; z-index: 20; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; flex-shrink: 0; padding: 10px ${phone ? 12 : 16}px; border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 40%, transparent); -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px); }
/* Back: the menu's own back row, kept as it is there (the outline "<" in its badge). */
${S} .sbar .navrow { width: auto; justify-self: start; flex-shrink: 0; color: var(--text-muted); }
${S} .sbar .navrow:hover { color: var(--text-primary); }
${S} .sbar .navrow .nlabel { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${S} .ttl { display: flex; min-width: 0; max-width: ${phone ? "100%" : "560px"}; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px 12px; }
${S} .ttl h1 { font-size: 16px; line-height: 24px; }
/* The title is the name: press it to change it (Garreth, 2026-09-15). The pencil shows on hover; Enter or leaving
   the field keeps the new name, Escape drops it. */
${S} .tbtn-title { display: inline-flex; align-items: center; gap: 8px; min-width: 0; border-radius: 10px; margin: -4px -8px; padding: 4px 8px; color: var(--text-primary); transition: background-color 150ms var(--ease); }
${S} .tbtn-title h1 { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${S} .tbtn-title svg { color: var(--text-muted); opacity: 0; transition: opacity 150ms var(--ease); }
${S} .tbtn-title:hover { background: var(--card); }
${S} .tbtn-title:hover svg, ${S} .tbtn-title:focus-visible svg { opacity: 1; }
${S} .ttl-field { width: ${phone ? "100%" : "320px"}; padding: 3px 12px; border-radius: 12px; }
${S} .ttl-field input { font-size: 16px; line-height: 24px; font-weight: 600; letter-spacing: -0.02em; }
${S} .cmeta { position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
${S} .pill.muted { color: var(--text-muted); }
${S} .pill--danger { color: var(--pill-red); }
${S} .pill--ok { color: var(--ok); }
${S} .pill--accent { color: var(--accent); }
${S} .tbtn { position: relative; display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; border-radius: 8px; padding: 2px 4px; font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-muted); transition: color 150ms var(--ease); }
${S} .tbtn:hover { color: var(--text-primary); }
${S} .tbtn--danger { color: var(--danger); }
${S} .hact { display: flex; align-items: center; justify-self: end; gap: 12px; flex-shrink: 0; }
${S} .btn2--line { background: transparent; }
${S} .btn2:disabled { opacity: 0.4; cursor: not-allowed; }
/* The version pill in edit mode is a button: its list hangs under it. */
${S} .vbtn { display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; padding: 2px 8px 2px 10px; font-size: 12px; line-height: 16px; font-weight: 500; background: var(--pill-bg); color: var(--text-muted); transition: color 150ms var(--ease); }
${S} .vbtn:hover, ${S} .vbtn[aria-expanded="true"] { color: var(--text-primary); }
/* Solid, not glass (Garreth, 2026-09-15): it hangs over the canvas's strips, and a veil let their text show through. */
${S} .vpop { position: absolute; left: 0; top: calc(100% + 8px); z-index: 40; width: 300px; border-radius: 16px; border: 1px solid var(--border); padding: 8px;
  background: var(--card-raised); box-shadow: var(--overlay-rim); transform-origin: top left; animation: d6-pop 150ms var(--ease-out-strong); }
.is-light ${S} .vpop { background: var(--card); box-shadow: 0 16px 40px rgba(27, 29, 33, 0.18); }
@keyframes d6-pop { from { opacity: 0; transform: scale(0.97) translateY(-4px); } }
${S} .vrow { display: flex; align-items: center; gap: 10px; width: 100%; border-radius: 12px; padding: 8px 10px; font-size: 13px; line-height: 20px; }
${S} .vrow b { font-weight: 500; }
${S} .vrow .vd { color: var(--text-muted); }
${S} .vrow .pill, ${S} .vrow .tbtn { margin-left: auto; }
${S} .vrow.is-active { background: color-mix(in srgb, var(--text-primary) 5%, transparent); }
${S} .catch { position: absolute; inset: 0; z-index: 30; }

/* Discard: a plain outlined button, not red (Garreth, 2026-09-15). Still hold-button.tsx's press and hold: a neutral
   fill sweeps across while it is held, and letting go early always aborts. */
${S} .hold { position: relative; isolation: isolate; display: inline-flex; align-items: center; justify-content: center; gap: 8px; overflow: hidden; border-radius: 999px; border: 1px solid var(--border); padding: 7px 16px;
  font-size: 12px; line-height: 16px; font-weight: 500; user-select: none; touch-action: none; background: transparent; color: var(--text-muted); transition: color 150ms var(--ease); }
${S} .hold:hover { color: var(--text-primary); }
${S} .hold i { position: absolute; inset: 0; z-index: -1; transform-origin: left; background: color-mix(in srgb, var(--text-primary) 14%, transparent); }
${S} .hold i.is-rest { transition: transform 150ms var(--ease); }
${S} .hold span { position: relative; }
${S} .hold.is-over { color: var(--text-primary); }

/* The sandbox: a subtle dotted grid under everything below the toolbar (Garreth, 2026-09-15). Once the draft exists
   the grid moves to the canvas itself, so it pans with the slides. */
${S} .sand { position: relative; display: flex; flex: 1; min-height: 0; flex-direction: column; padding: ${phone ? 16 : 24}px; ${dots} }
${S} .sand.is-studio { padding: 0; background-image: none; }

/* Before a draft exists the sandbox holds one thing at a time, in its middle (Garreth, 2026-09-15): the two cards,
   the library choice, the saved decks, or the chat box. */
${S} .centre { display: flex; flex: 1; align-items: center; justify-content: center; }
/* Start: two portrait cards. */
${S} .starts { display: flex; gap: 24px; }
${S} .start { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; width: ${phone ? "100%" : "260px"}; aspect-ratio: ${phone ? "auto" : "3 / 4"}; ${phone ? "padding: 32px 20px;" : ""} border-radius: 24px; background: var(--card); border: 1px solid var(--border); box-shadow: var(--sh-card);
  text-align: center; transition: border-color 200ms var(--ease), transform 160ms var(--ease-out-strong), background-color 200ms var(--ease); }
${S} .start:hover { border-color: color-mix(in srgb, var(--text-muted) 45%, var(--border)); background: var(--card-raised); }
${S} .start:active { transform: scale(0.98); }
${S} .start .ico { display: flex; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); }
${S} .start b { max-width: 180px; font-size: 16px; line-height: 24px; font-weight: 600; letter-spacing: -0.01em; text-wrap: balance; }
${phone ? `${S} .starts { flex-direction: column; width: 100%; }` : ""}

${S} .choose { width: ${phone ? "100%" : "440px"}; display: flex; flex-direction: column; border-radius: 24px; background: var(--card); border: 1px solid var(--border); box-shadow: var(--sh-card); }
${S} .choose--wide { width: ${phone ? "100%" : "900px"}; }
${S} .chead { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 14px 20px; border-bottom: 1px solid var(--border); font-size: 14px; line-height: 20px; font-weight: 600; }
${S} .chead .n { font-size: 12px; font-weight: 500; color: var(--text-muted); }
${S} .opts { display: flex; flex-direction: column; gap: 2px; padding: 8px; }
${S} .optrow { display: flex; width: 100%; align-items: center; gap: 12px; border-radius: 12px; padding: 8px; transition: background-color 150ms var(--ease); }
${S} .optrow:hover { background: color-mix(in srgb, var(--text-primary) 6%, transparent); }
${S} .optrow.is-on { background: color-mix(in srgb, var(--text-primary) 5%, transparent); }
${S} .tile { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; flex-shrink: 0; border-radius: 10px; color: var(--text-muted); background-size: cover; background-position: center; }
${S} .tile--empty { border: 1px dashed var(--border); background: var(--card-sunken); }
${COVERS.map((id) => `${S} .lib-${id} { background-image: url(./d6-lib-${id}.jpg); }`).join("\n")}
${S} .libtext { display: flex; flex: 1; min-width: 0; flex-direction: column; }
${S} .libname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; line-height: 20px; font-weight: 500; }
${S} .libmeta { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .optcheck { display: flex; width: 16px; justify-content: center; color: var(--text-primary); }
${S} .newlib { display: flex; align-items: center; gap: 12px; margin: 6px 8px 8px; border-top: 1px solid var(--border); padding: 14px 8px 0; }
${S} .field { display: flex; flex: 1; min-width: 0; align-items: center; gap: 8px; border-radius: 16px; border: 1px solid var(--border); background: var(--card-sunken); padding: ${phone ? 12 : 10}px 14px; transition: box-shadow 150ms var(--ease); }
${S} .field:focus-within, ${S} .field.is-focus { box-shadow: 0 0 0 2px var(--accent); }
${S} .field input { width: 100%; min-width: 0; font-size: ${phone ? 16 : 14}px; line-height: 20px; font-weight: 500; outline: none; }
${S} .field input::placeholder { color: var(--text-muted); font-weight: 400; }
${S} .field .taken { flex-shrink: 0; font-size: 12px; line-height: 16px; font-weight: 500; color: var(--danger); }
${S} .field.is-taken { box-shadow: 0 0 0 2px color-mix(in srgb, var(--danger) 60%, transparent); }
/* Saved reference decks, from Trends: a grid of covers. */
${S} .refs { display: grid; grid-template-columns: repeat(${phone ? 2 : 4}, minmax(0, 1fr)); gap: 12px; padding: 16px; }
${S} .ref { display: flex; flex-direction: column; gap: 8px; min-width: 0; border-radius: 16px; padding: 8px; text-align: left; transition: background-color 150ms var(--ease), transform 160ms var(--ease-out-strong); }
${S} .ref:hover { background: color-mix(in srgb, var(--text-primary) 5%, transparent); }
${S} .ref:active { transform: scale(0.98); }
${S} .ref .rimg { width: 100%; aspect-ratio: 4 / 5; border-radius: 10px; background-size: cover; background-position: center; background-color: var(--card-raised); }
${S} .ref b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; line-height: 18px; font-weight: 500; }
${S} .ref span { display: block; font-size: 12px; line-height: 16px; color: var(--text-muted); }

/* The chat box (Garreth, 2026-09-15, from the reviewed component, kept to the parts this Studio needs): a rounded box
   with a leading icon tile, the input, an attach button and a square send button that shows the return glyph until
   there is text. Centred and larger while it is the only thing on the page; compact at the foot of the conversation. */
${S} .ai { display: flex; align-items: center; gap: 10px; width: 100%; border-radius: 16px; border: 1px solid var(--border); background: var(--card); padding: 10px; box-shadow: var(--sh-card);
  transition: border-color 200ms var(--ease), box-shadow 200ms var(--ease); }
${S} .ai:hover { border-color: color-mix(in srgb, var(--text-muted) 45%, var(--border)); }
${S} .ai.is-focus, ${S} .ai:focus-within { border-color: color-mix(in srgb, var(--text-muted) 60%, var(--border)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--text-primary) 10%, transparent), var(--sb-shadow); }
${S} .ai--big { width: ${phone ? "100%" : "640px"}; padding: 12px; border-radius: 20px; }
${S} .aitile { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; flex-shrink: 0; border-radius: 12px; border: 1px solid var(--border); background: var(--card-raised); color: var(--text-muted); }
${S} .ai--big .aitile { width: 36px; height: 36px; }
${S} .aiin { position: relative; display: flex; flex: 1; min-width: 0; align-items: center; min-height: 32px; }
${S} .aiin input { position: relative; z-index: 1; width: 100%; min-width: 0; font-size: 14px; line-height: 20px; outline: none; }
${S} .ai--big .aiin input { font-size: 15px; }
${S} .aiph { position: absolute; inset: 0; display: flex; align-items: center; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; pointer-events: none; font-size: 14px; line-height: 20px; color: var(--text-muted); }
${S} .ai--big .aiph { font-size: 15px; }
${S} .aiph.k0 { animation: d6-ph0 280ms cubic-bezier(0.16, 1, 0.3, 1); }
${S} .aiph.k1 { animation: d6-ph1 280ms cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes d6-ph0 { from { opacity: 0; transform: translateY(6px); filter: blur(2px); } }
@keyframes d6-ph1 { from { opacity: 0; transform: translateY(6px); filter: blur(2px); } }
${S} .aibtn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; flex-shrink: 0; border-radius: 12px; color: var(--text-muted); transition: color 150ms var(--ease), background-color 150ms var(--ease), transform 160ms var(--ease-out-strong); }
${S} .aibtn:hover { background: var(--card-raised); color: var(--text-primary); }
${S} .aibtn:active { transform: scale(0.95); }
${S} .aisend { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; flex-shrink: 0; border-radius: 12px; border: 1px solid var(--border); background: var(--card-raised); color: var(--text-muted); transition: background-color 200ms var(--ease), color 200ms var(--ease), transform 160ms var(--ease-out-strong); }
${S} .aisend.is-ready { border-color: transparent; background: var(--text-primary); color: var(--bg); box-shadow: var(--sb-shadow); }
${S} .aisend.is-ready:active { transform: scale(0.95); }
${S} .aisend:disabled { cursor: not-allowed; }

/* ── The editor, once a draft exists (Garreth, 2026-09-15) ── */
${S} .studio { position: relative; display: flex; flex: 1; min-height: 0; align-items: stretch; }
/* Side panels: fixed, at the sandbox's full height, each folding to a thin rail of icons the way an editor's side
   bars do. Left: the adjustments and the library. Right: the conversation. */
${S} .side { position: relative; display: flex; flex-direction: column; flex-shrink: 0; width: 320px; min-height: 0; background: var(--card); border-right: 1px solid var(--border); transition: width 200ms var(--ease-out-strong); }
${S} .side--r { width: 380px; border-right: 0; border-left: 1px solid var(--border); }
${S} .side.is-c { width: 44px; }
/* Folded, the conversation leaves no rail: the same toggle floats at the canvas's upper right instead (Garreth,
   2026-09-15), with the dot when the AI answered meanwhile. */
${S} .side--r.is-c { display: none; }
${S} .ptoggle { position: relative; flex-shrink: 0; }
${S} .shd .ptoggle { width: 32px; height: 32px; border-radius: 10px; }
${S} .wtoggle { position: absolute; top: 12px; right: 12px; z-index: 6; border: 1px solid var(--border); background: var(--card); box-shadow: var(--sb-shadow); }
${S} .wtoggle:hover { background: var(--card-raised); }
${S} .wtoggle .dot { position: absolute; top: 2px; right: 2px; width: 8px; height: 8px; border-radius: 999px; background: var(--accent); border: 2px solid var(--card); }
${S} .shd { display: flex; align-items: center; gap: 8px; height: 44px; flex-shrink: 0; padding: 0 6px 0 16px; border-bottom: 1px solid var(--border); font-size: 11px; line-height: 16px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-muted); white-space: nowrap; }
${S} .shd span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
${S} .shd .icon-btn { width: 28px; height: 28px; border-radius: 8px; }
${S} .sbody { display: flex; flex: 1; min-height: 0; flex-direction: column; overflow-y: auto; }
${S} .side.is-c .shd, ${S} .side.is-c .sbody, ${S} .side.is-c .cin { display: none; }
/* The folded rail: the panel's sections as icons; pressing one opens the panel on that section. */
${S} .srail { display: none; flex-direction: column; align-items: center; gap: 4px; padding: 8px 0; }
${S} .side.is-c .srail { display: flex; }
${S} .srail .icon-btn { position: relative; width: 32px; height: 32px; border-radius: 10px; }
${S} .srail .icon-btn:hover { background: var(--card-raised); }
${S} .srail .dot { position: absolute; top: 3px; right: 3px; width: 8px; height: 8px; border-radius: 999px; background: var(--accent); border: 2px solid var(--card); }
/* Sections inside the left panel: the selected item's settings, then the library. */
${S} .sec { border-bottom: 1px solid var(--border); }
${S} .sech { display: flex; align-items: center; gap: 8px; padding: 12px 16px 6px; }
${S} .sech b { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; line-height: 20px; font-weight: 600; }
${S} .sech .pill { font-size: 11px; padding: 1px 8px; }
${S} .irow { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 12px; align-items: center; padding: 6px 16px; }
${S} .irow.sub { padding-top: 0; }
${S} .irow.last { padding-bottom: 14px; }
${S} .ilabel { font-size: 13px; line-height: 20px; font-weight: 500; }
${S} .ilabel .opt { display: block; font-size: 11px; line-height: 14px; font-weight: 400; color: var(--text-muted); }
${S} .ictl { display: flex; align-items: center; justify-content: flex-end; gap: 8px; min-width: 0; }
/* A choice from a list: Dropdown's trigger, full width, the value on the left and the caret on the right. */
${S} .dd { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; border-radius: 999px; border: 1px solid var(--border); background: var(--card-raised); padding: 6px 12px 6px 14px; font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-primary); transition: color 150ms var(--ease); }
${S} .dd svg { color: var(--text-muted); }
/* A number: stepper.tsx, narrower here. */
${S} .stepper { display: inline-flex; align-items: stretch; width: 112px; flex-shrink: 0; overflow: hidden; border-radius: 16px; border: 1px solid var(--border); background: color-mix(in srgb, var(--bg) 60%, transparent); }
${S} .stepbtn { display: flex; width: 26px; flex-shrink: 0; align-items: center; justify-content: center; color: var(--text-muted); transition: color 150ms var(--ease), background-color 150ms var(--ease); }
${S} .stepbtn:hover:not(:disabled) { background: var(--card-raised); color: var(--text-primary); }
${S} .stepbtn:disabled { cursor: not-allowed; opacity: 0.3; }
${S} .stepval { display: flex; flex: 1; min-width: 0; align-items: center; justify-content: center; gap: 2px; border-left: 1px solid var(--border); border-right: 1px solid var(--border); padding: 5px 4px; font-size: 13px; line-height: 18px; }
${S} .stepval small { font-size: 11px; color: var(--text-muted); }
${S} .stepper.sm { width: 88px; }
/* A few options: filter-pills.tsx. */
${S} .seg { display: inline-flex; align-items: center; gap: 2px; flex-shrink: 0; border-radius: 999px; background: var(--card-raised); padding: 2px; }
${S} .seg button { position: relative; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; padding: 4px 10px; font-size: 12px; line-height: 16px; font-weight: 500; white-space: nowrap; color: var(--text-muted); transition: color 150ms var(--ease), background-color 150ms var(--ease); }
${S} .seg button:hover { color: var(--text-primary); }
${S} .seg button[aria-checked="true"] { background: var(--accent); color: var(--bg); }
.is-light ${S} .seg button[aria-checked="true"] { color: #ffffff; }
${S} .seg.icons button { padding: 4px 8px; }
/* D14: a choice that needs the panel's whole width, so three or four sources read at a glance. Its label sits on
   the line above rather than in the 84px column. */
${S} .irow.stack { grid-template-columns: minmax(0, 1fr); gap: 6px; }
${S} .seg.wide { display: flex; width: 100%; }
${S} .seg.wide button { flex: 1 1 0; min-width: 0; }
/* D14: the last row of the copy contract, closed off from the style rows under it. */
${S} .irow.cut { border-bottom: 1px solid var(--border); padding-bottom: 12px; margin-bottom: 4px; }
${S} .rback { font-size: 12px; line-height: 16px; color: var(--text-muted); }
/* D14: a typed value in the inspector — the box's name, and a fixed box's words. Sized like .dd so Name reads as
   Font's sibling; Taken is the same word the Save dialog's short name uses. */
${S} .ifield { display: flex; flex: 1; min-width: 0; align-items: center; gap: 8px; border-radius: 999px; border: 1px solid var(--border); background: var(--card-raised); padding: ${phone ? 6 : 5}px 12px; transition: box-shadow 150ms var(--ease); }
${S} .ifield:focus-within, ${S} .ifield.is-focus { box-shadow: 0 0 0 2px var(--accent); }
${S} .ifield input { width: 100%; min-width: 0; font-size: ${phone ? 16 : 12}px; line-height: 16px; font-weight: 500; color: var(--text-primary); outline: none; }
${S} .ifield input::placeholder { color: var(--text-muted); font-weight: 400; }
${S} .ifield .taken { flex-shrink: 0; font-size: 11px; line-height: 16px; font-weight: 500; color: var(--danger); }
${S} .ifield.is-taken { box-shadow: 0 0 0 2px color-mix(in srgb, var(--danger) 60%, transparent); }
/* The stroke's colour: two swatches. */
${S} .sw { display: flex; width: 20px; height: 20px; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 999px; border: 1px solid var(--border); }
${S} .sw i { display: block; width: 12px; height: 12px; border-radius: 999px; }
${S} .sw[aria-checked="true"] { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
/* Which set an image cell draws from: the picker's rows, one ticked. */
${S} .sets { display: flex; flex-direction: column; gap: 2px; padding: 0 8px 10px; }
${S} .grow { display: flex; align-items: center; gap: 10px; width: 100%; border-radius: 12px; padding: 8px 10px; font-size: 13px; line-height: 20px; font-weight: 500; transition: background-color 150ms var(--ease); }
${S} .grow:hover { background: color-mix(in srgb, var(--text-primary) 6%, transparent); }
${S} .grow .gc { margin-left: auto; font-size: 12px; font-weight: 400; color: var(--text-muted); }
${S} .grow .gc.is-none { font-weight: 500; color: var(--danger); }
${S} .grow .optcheck { margin-left: 4px; }
/* The library section: its images by set, each draggable onto a cell; a new library offers Upload images and
   Generate with AI instead. */
${S} .lhead { display: flex; align-items: center; gap: 10px; padding: 12px 16px 8px 14px; }
${S} .lhead .tile { width: 32px; height: 32px; border-radius: 8px; }
${S} .lhead .tbtn { margin-left: auto; }
${S} .gpills { display: flex; gap: 6px; padding: 4px 14px 0; overflow-x: auto; }
${S} .gpills button { position: relative; flex-shrink: 0; border-radius: 999px; padding: 3px 10px; font-size: 12px; line-height: 16px; font-weight: 500; white-space: nowrap; background: var(--pill-bg); color: var(--text-muted); transition: color 150ms var(--ease), background-color 150ms var(--ease); }
${S} .gpills button:hover { color: var(--text-primary); }
${S} .gpills button.is-on { background: var(--text-primary); color: var(--bg); }
${S} .gpills button b { font-weight: 500; color: inherit; opacity: 0.7; }
${S} .limgs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 12px 14px 14px; }
${S} .limg { position: relative; display: block; aspect-ratio: 4 / 5; border-radius: 8px; overflow: hidden; background-size: cover; background-position: center; background-color: var(--card-raised); cursor: grab; transition: transform 160ms var(--ease-out-strong); }
${S} .limg::after { content: ""; position: absolute; inset: 0; border: 2px solid var(--accent); border-radius: inherit; opacity: 0; pointer-events: none; transition: opacity 120ms var(--ease); }
${S} .limg:hover::after { opacity: 1; }
${S} .limg:active { cursor: grabbing; transform: scale(0.97); }
/* Upload images and Generate with AI, for every library (Garreth, 2026-09-15): both open the library's own flows
   (D8), and what they add appears in the grid above once kept. */
${S} .lnew { display: flex; gap: 8px; padding: 6px 14px 14px; }
${S} .lnew .btn2 { flex: 1; justify-content: center; padding: 8px 10px; font-size: 12px; }
${S} .lnew + .lcount { margin-top: -8px; }
${S} .lcount { padding: 0 16px 14px; font-size: 12px; line-height: 16px; color: var(--text-muted); }

/* The conversation, in the right panel. */
${S} .msgs { display: flex; flex: 1; min-height: 120px; flex-direction: column; gap: 12px; padding: 16px 20px; overflow-y: auto; }
${S} .msg { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; line-height: 20px; text-wrap: pretty; }
${S} .msg--me { justify-content: flex-end; }
${S} .msg--me .bub { max-width: 85%; border-radius: 16px 16px 4px 16px; background: var(--card-raised); padding: 8px 12px; }
.is-light ${S} .msg--me .bub { background: var(--pill-bg); }
${S} .aiv { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; flex-shrink: 0; margin-top: -2px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); }
${S} .msg--ai .bub { min-width: 0; }
${S} .bub.is-busy { display: inline-flex; align-items: center; gap: 8px; color: var(--text-muted); }
${S} .bub.is-err { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; color: var(--danger); }
/* The AI never makes an image on its own (Garreth, 2026-09-15): when the library lacks what a slide needs it says
   so and offers the library's own two doors, with the Generate form filled in from the conversation. */
${S} .bub.is-offer { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
${S} .offer { display: flex; flex-wrap: wrap; gap: 8px; }
${S} .cin { flex-shrink: 0; padding: 0 12px 12px; }
${S} .cin .ai { box-shadow: none; background: var(--card-sunken); }

/* The canvas: infinite and pannable, like Figma (Garreth, 2026-09-15). Every slide sits in a row at its true shape
   on the dotted grid, which pans with them. Dragging the empty ground pans; the wheel and trackpad scroll it. */
${S} .work { position: relative; display: flex; flex: 1; min-width: 0; min-height: 0; }
${S} .pan { flex: 1; min-width: 0; overflow: auto; cursor: grab; overscroll-behavior: contain; }
${S} .pan.is-drag { cursor: grabbing; user-select: none; }
${S} .slides { display: flex; align-items: flex-start; gap: ${SLIDE_GAP}px; width: max-content; min-width: 100%; min-height: 100%; padding: ${phone ? "72px 24px 120px" : `112px ${PAN_PAD.desk}px 120px`}; ${dots} }
/* Starting from a reference deck (Garreth, 2026-09-15): its slides sit first on the canvas inside a dark grey dashed
   frame, read-only and a little muted, so they read as the thing being copied and never as part of the draft. While
   the AI analyses them a light sweeps down each one; the draft's slides appear beside the frame once it is done. */
${S} .refgroup { display: flex; flex-direction: column; gap: 12px; flex-shrink: 0; align-self: flex-start; margin-top: 30px; padding: 20px; border: 2px dashed color-mix(in srgb, var(--text-muted) 55%, transparent); border-radius: 24px; }
${S} .refgroup.is-scan { border-color: color-mix(in srgb, var(--accent) 55%, transparent); }
${S} .reflabel { display: flex; align-items: center; gap: 8px; min-height: 20px; font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .reflabel b { font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 320px; }
${S} .reflabel .busy { display: inline-flex; align-items: center; gap: 6px; color: var(--accent); }
${S} .refrow { display: flex; gap: 20px; }
${S} .rslide { position: relative; width: ${Math.round(w * 0.62)}px; aspect-ratio: 4 / 5; flex-shrink: 0; overflow: hidden; border-radius: 12px; background: #101012; container-type: inline-size; pointer-events: none; filter: saturate(0.8); opacity: 0.9; }
${S} .rslide::after { content: ""; position: absolute; left: 0; right: 0; top: -20%; height: 20%; z-index: 5; opacity: 0; background: linear-gradient(to bottom, transparent, color-mix(in srgb, var(--accent) 45%, transparent), transparent); }
${S} .rslide.is-scan::after { opacity: 1; animation: d6-scan 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
@keyframes d6-scan { to { top: 100%; } }
${S} .rslide .tb.at-top { left: 8%; top: 8%; transform: none; text-align: left; }
${S} .sframe { display: flex; flex-direction: column; gap: 10px; flex-shrink: 0; }
/* Regenerate sample while it works: the text boxes become pulsing bars until the new copy lands. */
${S} .tbsk { display: flex; flex-direction: column; align-items: center; gap: 1.4cqw; padding: 0.6cqw 0; }
${S} .al-left .tbsk { align-items: flex-start; }
${S} .tbsk i { display: block; width: 72%; height: 4.6cqw; border-radius: 999px; background: rgba(255, 255, 255, 0.35); animation: d6-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
${S} .tbsk i + i { width: 48%; }
${S} .tb--line .tbsk i { height: 3.6cqw; }
${S} .fcap { display: flex; align-items: center; gap: 8px; min-height: 20px; padding: 0 2px; font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .fcap b { font-weight: 500; color: var(--text-primary); }
${S} .fcap .busy { display: inline-flex; align-items: center; gap: 6px; }
/* Slides can be added, duplicated, deleted and moved (Garreth, 2026-09-17, round three). The caption's dots open a
   slide's menu (they show on hover and on the selected slide); a solid menu, like the versions list, hangs under
   the caption. A plus appears in the gap between two slides on hover, to insert one there. */
${S} .sframe { position: relative; }
${S} .capmenu { display: flex; align-items: center; justify-content: center; width: 24px; height: 20px; margin-left: auto; border-radius: 6px; color: var(--text-muted); opacity: 0; transition: opacity 150ms var(--ease), color 150ms var(--ease), background-color 150ms var(--ease); }
${S} .sframe:hover .capmenu, ${S} .capmenu.is-vis, ${S} .capmenu.is-on, ${S} .capmenu:focus-visible { opacity: 1; }
${S} .capmenu:hover, ${S} .capmenu.is-on { background: var(--card-raised); color: var(--text-primary); }
${S} .smenu { position: absolute; right: 0; top: 30px; z-index: 40; width: 204px; border-radius: 16px; border: 1px solid var(--border); padding: 8px; background: var(--card); box-shadow: var(--sb-shadow); animation: d6-in 160ms var(--ease-out-strong); }
.is-light ${S} .smenu { box-shadow: 0 16px 40px rgba(27, 29, 33, 0.18); }
${S} .mrow { display: flex; align-items: center; gap: 10px; width: 100%; border-radius: 10px; padding: 8px 10px; font-size: 13px; line-height: 20px; color: var(--text-primary); text-align: left; transition: background-color 150ms var(--ease); }
${S} .mrow:hover:not(:disabled) { background: var(--card-raised); }
${S} .mrow:disabled { color: var(--text-muted); opacity: 0.55; cursor: default; }
${S} .mrow svg { flex-shrink: 0; color: var(--text-muted); }
${S} .mrow.is-danger:not(:disabled) { color: var(--danger); } ${S} .mrow.is-danger:not(:disabled) svg { color: var(--danger); }
${S} .msep { height: 1px; margin: 6px 4px; background: var(--border); }
${S} .mhint { padding: 2px 10px 6px; font-size: 11px; line-height: 14px; color: var(--text-muted); }
${S} .mcatch { inset: -20000px; z-index: 30; }
${S} .gapadd { position: absolute; left: 100%; top: 30px; bottom: 0; z-index: 6; display: flex; align-items: center; justify-content: center; width: ${SLIDE_GAP}px; margin: 0; border: 0; padding: 0; background: none; opacity: 0; transition: opacity 150ms var(--ease); }
${S} .gapadd:hover, ${S} .gapadd.is-show, ${S} .gapadd:focus-visible { opacity: 1; }
${S} .gapadd i { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 999px; border: 1px solid var(--border); background: var(--card); color: var(--text-primary); box-shadow: var(--sb-shadow); }
/* The slot after the last slide: a dashed frame the size of a slide, whatever the type's size. */
${S} .slides .slide.slide--add { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; border: 2px dashed color-mix(in srgb, var(--text-muted) 55%, transparent); background: none; box-shadow: none; color: var(--text-muted); font-size: 14px; line-height: 20px; font-weight: 500; cursor: pointer; transition: border-color 150ms var(--ease), color 150ms var(--ease); }
${S} .slides .slide.slide--add:hover { border-color: var(--text-primary); color: var(--text-primary); }
${S} .slide--add i { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 999px; border: 1px solid var(--border); background: var(--card); }
/* The slide. Its ground is the template's canvas colour, so it looks the same in both themes. */
${S} .slide { position: relative; width: ${w}px; aspect-ratio: 4 / 5; flex-shrink: 0; overflow: hidden; border-radius: 16px; background: #101012; container-type: inline-size; box-shadow: var(--sb-shadow); cursor: default; }
${S} .slide.is-on { outline: 2px solid var(--accent); outline-offset: 6px; }
${S} .slide.is-sk { border: 1px solid var(--border); background: var(--card-raised); box-shadow: none; animation: d6-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
.is-light ${S} .slide.is-sk { background: var(--border); }
@keyframes d6-pulse { 50% { opacity: 0.5; } }
${S} .cell { position: absolute; display: flex; align-items: center; justify-content: center; margin: 0; border: 0; padding: 0; background-size: cover; background-position: center; cursor: default; }
${S} .cell.can-pick { cursor: pointer; }
${IMAGES.map((id) => `${S} .img-${id} { background-image: url(./d6-slide-${id}.jpg); }`).join("\n")}
/* A cell whose set has no images: the empty tile, on the slide. */
${S} .cell.is-empty { flex-direction: column; gap: 1.5cqw; background: #1a1a1c; color: rgba(255, 255, 255, 0.72); font-size: 3.6cqw; line-height: 1.2; font-weight: 500; }
${S} .cell.is-empty::before { content: ""; position: absolute; inset: 2cqw; border: 1px dashed rgba(255, 255, 255, 0.3); border-radius: 2cqw; }
${S} .cell.is-empty svg { width: 6cqw; height: 6cqw; }
${S} .cell.is-sel::after { content: ""; position: absolute; inset: 0; z-index: 2; border: 2px solid var(--accent); pointer-events: none; }
/* A soft darkening over every photo keeps white copy readable, the way the painter's renders do. */
${S} .veil { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.1) 45%, rgba(0, 0, 0, 0.45)); pointer-events: none; }
/* Text boxes: General Sans in the template's two styles, sized to the slide. Stroke and shadow at the style's
   values (4 px and 6 px on 1080). */
${S} .tb { position: absolute; left: 50%; z-index: 3; margin: 0; border: 0; padding: 0; background: none; color: #ffffff; text-align: center; text-wrap: balance; overflow-wrap: anywhere; cursor: default; }
${S} .tb.can-pick { cursor: move; }
${S} .tb .tbt { display: block; }
${S} .tb--hook { font-size: 6.67cqw; line-height: 1.08; font-weight: 700; letter-spacing: -0.015em; }
${S} .tb--line { font-size: 5.2cqw; line-height: 1.12; font-weight: 600; letter-spacing: -0.01em; }
/* D14: the cover's small lines — the series marker over the hook, the swipe line under it. */
${S} .tb--small { font-size: 3.3cqw; line-height: 1.2; font-weight: 600; letter-spacing: 0.04em; }
${S} .tb.st-4 { -webkit-text-stroke: 0.37cqw #000000; paint-order: stroke fill; }
${S} .tb.st-3 { -webkit-text-stroke: 0.28cqw #000000; paint-order: stroke fill; }
${S} .tb.st-2 { -webkit-text-stroke: 0.19cqw #000000; paint-order: stroke fill; }
${S} .tb.st-1 { -webkit-text-stroke: 0.09cqw #000000; paint-order: stroke fill; }
${S} .tb.sw-white.st-4 { -webkit-text-stroke-color: #ffffff; } ${S} .tb.sw-white.st-3 { -webkit-text-stroke-color: #ffffff; } ${S} .tb.sw-white.st-2 { -webkit-text-stroke-color: #ffffff; } ${S} .tb.sw-white.st-1 { -webkit-text-stroke-color: #ffffff; }
${S} .tb.sh-soft { text-shadow: 0 0.56cqw 1.1cqw rgba(0, 0, 0, 0.6); }
${S} .tb.sh-hard { text-shadow: 0 0.37cqw 0 rgba(0, 0, 0, 0.85); }
${S} .tb.al-left { text-align: left; } ${S} .tb.al-right { text-align: right; }
${S} .tb.at-top { top: 8%; transform: translateX(-50%); }
${S} .tb.at-centre { top: 50%; transform: translate(-50%, -50%); }
${S} .tb.at-bottom { bottom: 8%; transform: translateX(-50%); }
/* The closing slide carries two boxes: the closing line sits a little higher so the small line fits under it. */
${S} .tb.at-bottomUp { bottom: 12%; transform: translateX(-50%); }
${S} .tb.at-bottom2 { bottom: 3%; transform: translateX(-50%); }
/* D14: the three-role cover stacks the hook between two small lines, so the hook sits high enough that the name
   riding above the swipe line clears it. */
${S} .tb.at-cover { bottom: 22%; transform: translateX(-50%); }
/* Selected: a dashed outline just outside the box, the name as a tag above it, eight handles. Since D14 every box
   on the slide being worked on carries its name, so three boxes read as three roles; the selected one's tag is in
   the accent and the rest sit in a dark chip, which reads over a photo in either theme. */
${S} .tb.is-sel { outline: 1px dashed var(--accent); outline-offset: 6px; }
${S} .tag { position: absolute; left: -6px; bottom: calc(100% + 10px); z-index: 4; border-radius: 6px; padding: 1px 6px; font-size: 10px; line-height: 16px; font-weight: 600; letter-spacing: 0.02em; white-space: nowrap; color: var(--bg); background: var(--accent); -webkit-text-stroke: 0; text-shadow: none; }
.is-light ${S} .tag { color: #ffffff; }
${S} .tag.is-off { color: #ffffff; background: rgba(0, 0, 0, 0.62); }
.is-light ${S} .tag.is-off { color: #ffffff; }
${S} .h { position: absolute; z-index: 4; width: 8px; height: 8px; border-radius: 2px; background: var(--accent); border: 1px solid var(--bg); }
${S} .h-tl { left: -10px; top: -10px; } ${S} .h-t { left: calc(50% - 4px); top: -10px; } ${S} .h-tr { right: -10px; top: -10px; }
${S} .h-l { left: -10px; top: calc(50% - 4px); } ${S} .h-r { right: -10px; top: calc(50% - 4px); }
${S} .h-bl { left: -10px; bottom: -10px; } ${S} .h-b { left: calc(50% - 4px); bottom: -10px; } ${S} .h-br { right: -10px; bottom: -10px; }

/* Two strips float over the canvas at the screen's centre, whatever the panels do (Garreth, 2026-09-15): the slide
   count with Render preview and Regenerate sample at the top, the pointer, text and image tools at the bottom. They
   are anchored to the whole sandbox, not to the canvas area between the panels, so a panel opening never moves them. */
${S} .fstrip { position: absolute; left: 50%; z-index: 5; display: flex; align-items: center; gap: 2px; border-radius: 999px; border: 1px solid var(--border); padding: 4px; transform: translateX(-50%); white-space: nowrap;
  background: var(--overlay-veil); box-shadow: var(--overlay-rim); -webkit-backdrop-filter: var(--overlay-blur); backdrop-filter: var(--overlay-blur); }
${S} .ftop { top: 16px; gap: 8px; padding: 4px 4px 4px 14px; }
${S} .ftop .scount { font-size: 13px; line-height: 20px; font-weight: 500; color: var(--text-muted); }
${S} .ftop .scount.busy { display: inline-flex; align-items: center; gap: 8px; color: var(--accent); }
${S} .ftop .fpill { display: flex; align-items: center; gap: 4px; }
${S} .strip { bottom: 16px; }
${S} .tool { position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 999px; color: var(--text-muted); transition: color 150ms var(--ease), background-color 150ms var(--ease); }
${S} .tool:hover { background: var(--card-raised); color: var(--text-primary); }
${S} .tool.is-on { background: var(--text-primary); color: var(--bg); }

/* Save as carousel type: a centred dialog over the whole app. A modal, so it grows from its own middle. */
${S} .dlg { position: absolute; inset: 0; z-index: 80; display: flex; align-items: center; justify-content: center; padding: 16px; }
${S} .dscrim { position: absolute; inset: 0; background: var(--scrim); -webkit-backdrop-filter: var(--scrim-blur); backdrop-filter: var(--scrim-blur); animation: d6-fade 150ms linear; }
@keyframes d6-fade { from { opacity: 0; } }
${S} .dbox { position: relative; z-index: 1; display: flex; flex-direction: column; width: ${phone ? "100%" : "440px"}; border-radius: 24px; border: 1px solid var(--border);
  background: var(--overlay-veil); box-shadow: var(--overlay-rim); -webkit-backdrop-filter: var(--overlay-blur); backdrop-filter: var(--overlay-blur); animation: d6-in 200ms var(--ease-out-strong); outline: none; }
@keyframes d6-in { from { opacity: 0; transform: translateY(4px); } }
.is-light ${S} .dbox { box-shadow: 0 16px 40px rgba(27, 29, 33, 0.18); }
${S} .dhead { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 14px; border-bottom: 1px solid var(--border); font-size: 16px; line-height: 24px; font-weight: 600; }
${S} .dclose { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; margin: -6px -8px -6px 0; border-radius: 999px; color: var(--text-muted); transition: color 150ms var(--ease), background-color 150ms var(--ease); }
${S} .dclose:hover { background: var(--card-raised); color: var(--text-primary); }
${S} .drow { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 12px; align-items: center; padding: 12px 20px; }
${S} .drow + .drow { padding-top: 0; }
${S} .drow:first-of-type { padding-top: 16px; }
${S} .dfoot { display: flex; align-items: center; justify-content: flex-end; gap: 16px; padding: 12px 20px 16px; border-top: 1px solid var(--border); margin-top: 4px; }
${
  phone
    ? `
/* Phone: the slides pan sideways under the finger; the adjustments open as a sheet from the bottom; the
   conversation floats over the slide behind a round button carrying the mark; the bar holds the actions. */
${S} .sbar .hact { display: none; }
${S} .sbar { grid-template-columns: auto minmax(0, 1fr); gap: 8px; }
/* The back button is its badge alone, so the name and the library pill share one line (Garreth, 2026-09-15). */
${S} .sbar .navrow { padding: 6px 4px; }
${S} .sbar .navrow .nlabel { display: none; }
${S} .ttl { flex-wrap: nowrap; justify-content: flex-start; gap: 8px; }
${S} .ttl .cmeta { flex-wrap: nowrap; min-width: 0; }
${S} .ttl .cmeta .pill { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
${S} .tbtn-title { flex-shrink: 0; max-width: 60%; }
${S} .side { display: none; }
${S} .pan { padding-bottom: 76px; }
${S} .capmenu { opacity: 1; }
${S} .gapadd { display: none; }
/* The slide count sits above the pill of buttons, as plain text (Garreth, 2026-09-15). */
${S} .ftop { top: 12px; flex-direction: column; gap: 6px; padding: 0; border: 0; background: none; box-shadow: none; -webkit-backdrop-filter: none; backdrop-filter: none; }
${S} .ftop .fpill { display: flex; align-items: center; gap: 4px; border-radius: 999px; border: 1px solid var(--border); padding: 4px; background: var(--overlay-veil); box-shadow: var(--overlay-rim); -webkit-backdrop-filter: var(--overlay-blur); backdrop-filter: var(--overlay-blur); }
${S} .strip { bottom: 88px; }
${S} .fab { position: absolute; right: 16px; bottom: 96px; z-index: 46; display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 999px; border: 1px solid var(--border);
  background: var(--card); color: var(--text-primary); box-shadow: var(--sb-shadow); transition: transform 160ms var(--ease-out-strong), background-color 150ms var(--ease); }
${S} .fab:hover { background: var(--card-raised); }
${S} .fab:active { transform: scale(0.94); }
${S} .fab .dot { position: absolute; top: 2px; right: 2px; width: 10px; height: 10px; border-radius: 999px; background: var(--accent); border: 2px solid var(--bg); }
/* Both panels open as sheets from the bottom on the phone: the adjustments from the sliders button (or by selecting
   something on the slide), the conversation from the round button (Garreth, 2026-09-15). */
${S} .fold { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 999px; color: var(--text-muted); transition: color 150ms var(--ease), background-color 150ms var(--ease); }
${S} .fold:hover { background: var(--card-raised); color: var(--text-primary); }
${S} .sheetscrim { position: absolute; inset: 0; z-index: 48; background: var(--scrim); -webkit-backdrop-filter: var(--scrim-blur); backdrop-filter: var(--scrim-blur); animation: d6-fade 180ms var(--ease-out-strong); }
${S} .sheet { position: absolute; left: 0; right: 0; bottom: 0; z-index: 49; display: flex; flex-direction: column; max-height: 78%; border-radius: 24px 24px 0 0; border: 1px solid var(--border); border-bottom: 0;
  background: var(--overlay-veil); box-shadow: var(--overlay-rim); -webkit-backdrop-filter: var(--overlay-blur); backdrop-filter: var(--overlay-blur); animation: d6-sheet 280ms cubic-bezier(0.32, 0.72, 0, 1); }
@keyframes d6-sheet { from { transform: translateY(100%); } }
${S} .shead { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-shrink: 0; padding: 18px 12px 10px 20px; border-bottom: 1px solid var(--border); font-size: 14px; line-height: 20px; font-weight: 600; }
${S} .shead::before { content: ""; position: absolute; top: 6px; left: 50%; width: 36px; height: 4px; margin-left: -18px; border-radius: 999px; background: color-mix(in srgb, var(--text-muted) 40%, transparent); }
/* Inside the adjustments sheet each section is its own card, inset from the edges (Garreth, 2026-09-15). */
${S} .sheet .sbody { gap: 12px; overflow-y: auto; padding: 12px 16px 24px; }
${S} .sheet .sec { border: 1px solid var(--border); border-radius: 16px; background: var(--card); }
${S} .sheet--chat { height: 78%; }
${S} .sheet--chat .msgs { padding: 16px; }
${S} .sheet--chat .cin { padding: 0 16px 16px; }
${S} .bar { position: absolute; left: 0; right: 0; bottom: 0; z-index: 25; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 70%, transparent); -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px); }
${S} .bar .tools { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; flex-shrink: 0; border-radius: 999px; border: 1px solid var(--border); color: var(--text-muted); }
${S} .bar .hold { padding: 13px 18px; }
${S} .bar .cta { margin-left: auto; padding: 15px 26px; }
${S} .tbtn::after, ${S} .btn2::after { content: ""; position: absolute; inset: -8px -4px; }
${S} .optrow, ${S} .grow { padding-block: 10px; }
${S} .aibtn, ${S} .aisend { width: 40px; height: 40px; }
`
    : ""
}
@media (prefers-reduced-motion: reduce) {
  ${S} .slide.is-sk, ${S} .tbsk i { animation: none; opacity: 0.7; }
  ${S} .rslide.is-scan::after { animation: none; top: 0; height: 100%; opacity: 0.5; }
  ${S} .vpop, ${S} .dbox, ${S} .sheet, ${S} .sheetscrim { animation: d6-fade 150ms linear; }
  ${S} .aiph.k0, ${S} .aiph.k1 { animation: d6-fade 200ms linear; }
  ${S} .side, ${S} .fab, ${S} .hold i.is-rest, ${S} .start, ${S} .ref, ${S} .limg, ${S} .aibtn, ${S} .aisend { transition: none; }
}
`;
}

/* ── Markup ────────────────────────────────────────────────────────────── */

/* A slide's face: its cells and text boxes. `p` is the slide item; `pick` makes cells and boxes selectable. */
const slideFace = (p, pick) => `
                <sc-for list="{{${p}.cells}}" as="c" hint-placeholder-count="1">
                  ${
                    pick
                      ? `<button type="button" class="cell {{c.cls}}" style="left: {{c.x}}%; top: {{c.y}}%; width: {{c.w}}%; height: {{c.h}}%" aria-label="{{c.label}}" aria-pressed="{{c.pressed}}" onClick="{{c.pick}}">`
                      : `<span class="cell {{c.cls}}" style="left: {{c.x}}%; top: {{c.y}}%; width: {{c.w}}%; height: {{c.h}}%" aria-hidden="true">`
                  }
                    <sc-if value="{{c.empty}}" hint-placeholder-val="{{ false }}">${D6I.images}<span>No images</span></sc-if>
                    <sc-if value="{{c.full}}" hint-placeholder-val="{{ true }}"><span class="veil"></span></sc-if>
                  ${pick ? "</button>" : "</span>"}
                </sc-for>
                <sc-for list="{{${p}.boxes}}" as="b" hint-placeholder-count="1">
                  ${
                    pick
                      ? `<button type="button" class="tb {{b.cls}}" style="width: {{b.w}}%" aria-label="{{b.label}}" aria-pressed="{{b.pressed}}" onClick="{{b.pick}}">`
                      : `<span class="tb {{b.cls}}" style="width: {{b.w}}%" aria-hidden="true">`
                  }
                    <sc-if value="{{b.sk}}" hint-placeholder-val="{{ false }}"><span class="tbsk" aria-label="Rewriting"><i></i><i></i></span></sc-if>
                    <sc-if value="{{b.txt}}" hint-placeholder-val="{{ true }}"><span class="tbt">{{b.text}}</span></sc-if>
                    ${
                      pick
                        ? `<sc-if value="{{b.tagOn}}" hint-placeholder-val="{{ true }}"><span class="tag {{b.tagCls}}">{{b.role}}</span></sc-if>
                    <sc-if value="{{b.sel}}" hint-placeholder-val="{{ false }}"><i class="h h-tl"></i><i class="h h-t"></i><i class="h h-tr"></i><i class="h h-l"></i><i class="h h-r"></i><i class="h h-bl"></i><i class="h h-b"></i><i class="h h-br"></i></sc-if>`
                        : ""
                    }
                  ${pick ? "</button>" : "</span>"}
                </sc-for>`;

const stepper = (v, label, unit = "", cls = "") => `
                  <div class="stepper ${cls}">
                    <button type="button" class="stepbtn" aria-label="Decrease ${label}" onClick="{{${v}Dec}}">${I.minus}</button>
                    <span class="stepval tnum">{{${v}}}${unit ? `<small>${unit}</small>` : ""}</span>
                    <button type="button" class="stepbtn" aria-label="Increase ${label}" onClick="{{${v}Inc}}">${I.plus}</button>
                  </div>`;

/* D14: the box's copy contract, above its style — the name the writer reads, where the words come from, and how
   many characters the box holds. The limit is worked out from the wrap width and the size rather than typed, so it
   follows the steppers under it. A name already on the slide is refused with the Save dialog's own word, Taken. */
const contractRows = () => `
                <div class="irow">
                  <span class="ilabel">Name</span>
                  <div class="ictl">
                    <div class="ifield {{bx.nameCls}}">
                      <input type="text" aria-label="The box's name" placeholder="name this box" value="{{bx.name}}" onChange="{{bx.rename}}" />
                      <sc-if value="{{bx.taken}}" hint-placeholder-val="{{ false }}"><span class="taken" role="alert">Taken</span></sc-if>
                    </div>
                  </div>
                </div>
                <div class="irow stack">
                  <span class="ilabel">Written by</span>
                  <div class="seg wide" role="radiogroup" aria-label="Written by">
                    <sc-for list="{{bx.sources}}" as="w" hint-placeholder-count="3">
                      <button type="button" role="radio" aria-checked="{{w.checked}}" onClick="{{w.pick}}">{{w.name}}</button>
                    </sc-for>
                  </div>
                </div>
                <sc-if value="{{bx.srcMore}}" hint-placeholder-val="{{ false }}">
                  <div class="irow sub">
                    <span class="ilabel"><span class="opt">{{bx.srcLabel}}</span></span>
                    <div class="ictl">
                      <sc-if value="{{bx.srcText}}" hint-placeholder-val="{{ true }}"><div class="ifield"><input type="text" aria-label="{{bx.srcLabel}}" placeholder="the words on every deck" value="{{bx.fixed}}" onChange="{{bx.setFixed}}" /></div></sc-if>
                      <sc-if value="{{bx.srcPick}}" hint-placeholder-val="{{ false }}"><button type="button" class="dd" aria-haspopup="listbox" onClick="{{bx.pickFact}}">{{bx.fact}}${I.caretDown}</button></sc-if>
                    </div>
                  </div>
                </sc-if>
                <div class="irow cut">
                  <span class="ilabel">Fits</span>
                  <span class="ictl rback tnum">{{bx.fits}}</span>
                </div>`;

/* The settings for a text box: its name and source (D14), then font, weight, size, stroke, shadow, alignment, wrap width. */
const boxSettings = () => `
              <div class="sec" aria-label="{{bx.label}}">
                <div class="sech"><b>{{bx.title}}</b><span class="pill">Text box</span></div>
                ${contractRows()}
                <div class="irow">
                  <span class="ilabel">Font</span>
                  <div class="ictl"><button type="button" class="dd" aria-haspopup="listbox" onClick="{{bx.pickFont}}">{{bx.font}}${I.caretDown}</button></div>
                </div>
                <div class="irow">
                  <span class="ilabel">Weight</span>
                  <div class="ictl"><button type="button" class="dd" aria-haspopup="listbox" onClick="{{bx.pickWeight}}">{{bx.weight}}${I.caretDown}</button></div>
                </div>
                <div class="irow">
                  <span class="ilabel">Size</span>
                  <div class="ictl">${stepper("bx.size", "size", "px")}</div>
                </div>
                <div class="irow">
                  <span class="ilabel">Stroke</span>
                  <div class="ictl">
                    <span class="seg" role="radiogroup" aria-label="Stroke colour" style="gap: 6px; padding: 2px 6px">
                      <button type="button" class="sw" role="radio" aria-label="Black" aria-checked="{{bx.strokeBlack}}" onClick="{{bx.strokeToBlack}}"><i style="background: #000000"></i></button>
                      <button type="button" class="sw" role="radio" aria-label="White" aria-checked="{{bx.strokeWhite}}" onClick="{{bx.strokeToWhite}}"><i style="background: #ffffff"></i></button>
                    </span>
                    ${stepper("bx.stroke", "stroke", "px", "sm")}
                  </div>
                </div>
                <div class="irow">
                  <span class="ilabel">Shadow</span>
                  <div class="ictl">
                    <div class="seg" role="radiogroup" aria-label="Shadow">
                      <button type="button" role="radio" aria-checked="{{bx.shOff}}" onClick="{{bx.shadowOff}}">Off</button>
                      <button type="button" role="radio" aria-checked="{{bx.shHard}}" onClick="{{bx.shadowHard}}">Hard</button>
                      <button type="button" role="radio" aria-checked="{{bx.shSoft}}" onClick="{{bx.shadowSoft}}">Soft</button>
                    </div>
                  </div>
                </div>
                <sc-if value="{{bx.shOn}}" hint-placeholder-val="{{ true }}">
                  <div class="irow sub">
                    <span class="ilabel"><span class="opt">Offset</span></span>
                    <div class="ictl">
                      ${stepper("bx.off", "shadow offset", "px", "sm")}
                      <sc-if value="{{bx.shSoftOn}}" hint-placeholder-val="{{ true }}"><span class="ilabel"><span class="opt">Blur</span></span>${stepper("bx.blur", "shadow blur", "px", "sm")}</sc-if>
                    </div>
                  </div>
                </sc-if>
                <div class="irow">
                  <span class="ilabel">Alignment</span>
                  <div class="ictl">
                    <div class="seg icons" role="radiogroup" aria-label="Alignment">
                      <button type="button" role="radio" aria-label="Left" aria-checked="{{bx.alLeft}}" onClick="{{bx.alignLeft}}">${D6I.alignL}</button>
                      <button type="button" role="radio" aria-label="Centre" aria-checked="{{bx.alCentre}}" onClick="{{bx.alignCentre}}">${D6I.alignC}</button>
                      <button type="button" role="radio" aria-label="Right" aria-checked="{{bx.alRight}}" onClick="{{bx.alignRight}}">${D6I.alignR}</button>
                    </div>
                  </div>
                </div>
                <div class="irow last">
                  <span class="ilabel">Wrap width</span>
                  <div class="ictl">${stepper("bx.wrap", "wrap width", "px")}</div>
                </div>
              </div>`;

/* The settings for an image cell: which set of the library it draws from. */
const cellSettings = () => `
              <div class="sec" aria-label="{{cl.label}}">
                <div class="sech"><b>{{cl.title}}</b><span class="pill">Image cell</span></div>
                <div class="irow" style="padding-bottom: 2px"><span class="ilabel">Draws from</span><span class="ictl libmeta">{{cl.libName}}</span></div>
                <div class="sets" role="radiogroup" aria-label="Library set">
                  <sc-for list="{{cl.sets}}" as="g" hint-placeholder-count="4">
                    <button type="button" class="grow" role="radio" aria-checked="{{g.checked}}" onClick="{{g.pick}}">
                      <span>{{g.name}}</span>
                      <span class="gc tnum {{g.gcCls}}">{{g.count}}</span>
                      <span class="optcheck"><sc-if value="{{g.on}}" hint-placeholder-val="{{ false }}">${I.check}</sc-if></span>
                    </button>
                  </sc-for>
                </div>
              </div>`;

/* The library section: its images by set, or Upload images and Generate with AI for a new one. */
const librarySection = () => `
              <div class="sec" id="sec-library" aria-label="Image library">
                <div class="lhead">
                  <sc-if value="{{lp.hasCover}}" hint-placeholder-val="{{ true }}"><span class="tile lib-{{lp.id}}" style="background-color: {{lp.tint}}" aria-hidden="true"></span></sc-if>
                  <sc-if value="{{lp.isNew}}" hint-placeholder-val="{{ false }}"><span class="tile tile--empty" aria-hidden="true">${I.tileImages}</span></sc-if>
                  <span class="libtext"><span class="libname" title="{{lp.name}}">{{lp.name}}</span><span class="libmeta tnum">{{lp.meta}}</span></span>
                  <sc-if value="{{canChangeLib}}" hint-placeholder-val="{{ true }}"><button type="button" class="tbtn" onClick="{{changeLib}}">Change</button></sc-if>
                </div>
                <sc-if value="{{lp.hasImages}}" hint-placeholder-val="{{ true }}">
                  <div class="gpills" role="radiogroup" aria-label="Set">
                    <sc-for list="{{lp.sets}}" as="g" hint-placeholder-count="5">
                      <button type="button" class="{{g.cls}}" role="radio" aria-checked="{{g.checked}}" onClick="{{g.pick}}">{{g.name}} <b class="tnum">{{g.count}}</b></button>
                    </sc-for>
                  </div>
                  <div class="limgs" aria-label="{{lp.imagesLabel}}">
                    <sc-for list="{{lp.images}}" as="im" hint-placeholder-count="9">
                      <span class="limg img-{{im.id}}" role="img" aria-label="{{im.label}}" draggable="true" onDragStart="{{im.drag}}" onClick="{{im.pick}}"></span>
                    </sc-for>
                  </div>
                </sc-if>
                <div class="lnew">
                  <button type="button" class="btn2" onClick="{{lp.upload}}">${D6I.upload}Upload images</button>
                  <button type="button" class="btn2" onClick="{{lp.generate}}">${D6I.aiSm}Generate with AI</button>
                </div>
                <sc-if value="{{lp.isNew}}" hint-placeholder-val="{{ false }}"><div class="lcount tnum">0 images</div></sc-if>
              </div>`;

/* The adjustments: the selected item's settings, then the library, in one panel. */
const adjustments = () => `
                  <sc-if value="{{selBox}}" hint-placeholder-val="{{ true }}">${boxSettings()}</sc-if>
                  <sc-if value="{{selCell}}" hint-placeholder-val="{{ false }}">${cellSettings()}</sc-if>
                  ${librarySection()}`;

/* The left panel, fixed, folding to a rail. */
const leftPanel = () => `
              <aside class="side {{leftCls}}" aria-label="Adjustments">
                <div class="shd"><span>Adjustments</span>${toggleButton("Fold the adjustments", "leftToggle")}</div>
                <div class="sbody">${adjustments()}</div>
                <div class="srail">
                  ${toggleButton("Unfold the adjustments", "leftOpen")}
                  <button type="button" class="icon-btn" aria-label="Adjustments" title="Adjustments" onClick="{{leftOpen}}">${D6I.sliders}</button>
                  <button type="button" class="icon-btn" aria-label="Image library" title="Image library" onClick="{{leftOpenLibrary}}">${D6I.imagesSm}</button>
                </div>
              </aside>`;

/* The chat box, in the reviewed shape. `big` is the centred one. */
const chatBox = (big) => `
                <div class="ai ${big ? "ai--big" : ""} {{cinCls}}">
                  <span class="aitile" aria-hidden="true">${D6I.ai}</span>
                  <div class="aiin">
                    <input type="text" aria-label="Message" value="{{cinVal}}" onChange="{{cinType}}" onKeyDown="{{cinKey}}" />
                    <sc-if value="{{cinEmpty}}" hint-placeholder-val="{{ true }}"><span class="aiph {{aiPhCls}}" aria-hidden="true">{{aiPh}}</span></sc-if>
                  </div>
                  <button type="button" class="aibtn" aria-label="Attach a reference" title="Attach a reference" onClick="{{attach}}">${D6I.attach}</button>
                  <button type="button" class="aisend {{sendCls}}" aria-label="Send" disabled="{{sendOff}}" onClick="{{send}}">
                    <sc-if value="{{cinEmpty}}" hint-placeholder-val="{{ true }}">${D6I.enter}</sc-if>
                    <sc-if value="{{cinHas}}" hint-placeholder-val="{{ false }}">${D6I.send}</sc-if>
                  </button>
                </div>`;

/* The conversation's messages and its chat box. */
const chatBody = () => `
                <div class="msgs" aria-live="polite">
                  <sc-for list="{{msgs}}" as="m" hint-placeholder-count="2">
                    <sc-if value="{{m.me}}" hint-placeholder-val="{{ true }}"><div class="msg msg--me"><span class="bub">{{m.text}}</span></div></sc-if>
                    <sc-if value="{{m.ai}}" hint-placeholder-val="{{ false }}"><div class="msg msg--ai"><span class="aiv" aria-hidden="true">${D6I.aiSm}</span><span class="bub">{{m.text}}</span></div></sc-if>
                    <sc-if value="{{m.busy}}" hint-placeholder-val="{{ false }}"><div class="msg msg--ai"><span class="aiv" aria-hidden="true">${D6I.aiSm}</span><span class="bub is-busy" role="status"><span class="spin on">${I.busy}</span>{{m.text}}</span></div></sc-if>
                    <sc-if value="{{m.err}}" hint-placeholder-val="{{ false }}"><div class="msg msg--ai"><span class="aiv" aria-hidden="true">${D6I.aiSm}</span><span class="bub is-err" role="alert"><span>{{m.text}}</span><button type="button" class="btn2 btn2--line" onClick="{{retryDraft}}">${D6I.retry}Retry</button></span></div></sc-if>
                    <sc-if value="{{m.offer}}" hint-placeholder-val="{{ false }}"><div class="msg msg--ai"><span class="aiv" aria-hidden="true">${D6I.aiSm}</span><span class="bub is-offer"><span>{{m.text}}</span><span class="offer"><button type="button" class="btn2" onClick="{{offerGenerate}}">${D6I.aiSm}Generate with AI</button><button type="button" class="btn2 btn2--line" onClick="{{offerUpload}}">${D6I.upload}Upload images</button></span></span></div></sc-if>
                  </sc-for>
                </div>
                <div class="cin">${chatBox(false)}</div>`;

/* The right panel, fixed, folding to a rail that carries the mark. */
const rightPanel = () => `
              <aside class="side side--r {{chatCls}}" aria-label="Conversation">
                <div class="shd"><span>Conversation</span>${toggleButton("Fold the conversation", "chatToggle")}</div>
                ${chatBody()}
              </aside>`;

/* Folded: the same toggle, floating at the canvas's upper right. */
const chatReveal = () => `
                <sc-if value="{{chatClosed}}" hint-placeholder-val="{{ false }}">${toggleButton("Show the conversation", "chatToggle", `<sc-if value="{{chatUnread}}" hint-placeholder-val="{{ false }}"><span class="dot" aria-hidden="true"></span></sc-if>`).replace('class="icon-btn ptoggle"', 'class="icon-btn ptoggle wtoggle"')}</sc-if>`;

/* The phone's conversation, a sheet from the bottom, and the round button that opens it. */
const phoneChat = () => `
    <sc-if value="{{chatOpen}}" hint-placeholder-val="{{ false }}">
      <div class="sheetscrim" aria-hidden="true" onClick="{{chatToggle}}"></div>
      <div class="sheet sheet--chat" role="dialog" aria-modal="true" aria-label="Conversation">
        <div class="shead"><span>Conversation</span><button type="button" class="fold" aria-label="Hide the conversation" onClick="{{chatToggle}}">${D6I.caretDown}</button></div>
        ${chatBody()}
      </div>
    </sc-if>
    <sc-if value="{{showFab}}" hint-placeholder-val="{{ true }}">
      <button type="button" class="fab" aria-label="{{fabLabel}}" aria-expanded="{{chatExpanded}}" onClick="{{chatToggle}}">${MARK}<sc-if value="{{chatUnread}}" hint-placeholder-val="{{ false }}"><span class="dot" aria-hidden="true"></span></sc-if></button>
    </sc-if>`;

/* The tool strip: Select, Text box, Image cell, at the bottom centre of the canvas. */
const toolStrip = () => `
                <div class="fstrip strip" role="toolbar" aria-label="Tools">
                  <button type="button" class="tool is-on" aria-label="Select" title="Select" aria-pressed="true" onClick="{{toolSelect}}">${D6I.cursor}</button>
                  <button type="button" class="tool" aria-label="Text box" title="Text box" onClick="{{toolText}}">${D6I.textT}</button>
                  <button type="button" class="tool" aria-label="Image cell" title="Image cell" onClick="{{toolImage}}">${D6I.image}</button>
                </div>`;

/* The strip at the top centre of the canvas: the slide count, Render preview, Regenerate sample. */
const topStrip = () => `
                <div class="fstrip ftop">
                  <sc-if value="{{isAnalysing}}" hint-placeholder-val="{{ false }}"><span class="scount busy" role="status"><span class="spin on">${I.busy}</span>Analysing the reference</span></sc-if>
                  <sc-if value="{{isDrafting}}" hint-placeholder-val="{{ false }}"><span class="scount" role="status">Drafting</span></sc-if>
                  <sc-if value="{{isReady}}" hint-placeholder-val="{{ true }}">
                    <span class="scount tnum">{{slideCount}}</span>
                    <span class="fpill">
                      <sc-if value="{{sampling}}" hint-placeholder-val="{{ false }}"><span class="scount busy" role="status" style="padding: 0 10px"><span class="spin on">${I.busy}</span>{{busyText}}</span></sc-if>
                      <sc-if value="{{notSampling}}" hint-placeholder-val="{{ true }}">
                        <button type="button" class="btn2" onClick="{{render}}">${D6I.render}Render preview</button>
                        <button type="button" class="btn2" onClick="{{regenSample}}">${D6I.retry}Regenerate sample</button>
                      </sc-if>
                    </span>
                  </sc-if>
                </div>`;

/* Just opened: the two cards. */
const startCards = () => `
          <div class="centre">
            <div class="starts">
              <button type="button" class="start" onClick="{{startReference}}"><span class="ico">${D6I.cards}</span><b>Start from a reference deck</b></button>
              <button type="button" class="start" onClick="{{startDiscuss}}"><span class="ico">${D6I.chat}</span><b>Discuss your idea</b></button>
            </div>
          </div>`;

/* The image library, and nothing else. */
const libraryChoice = () => `
          <div class="centre">
            <div class="choose" role="listbox" aria-label="Image library">
              <div class="chead"><span>Image library</span></div>
              <div class="opts">
                <sc-for list="{{libs}}" as="l" hint-placeholder-count="4">
                  <button type="button" class="optrow" role="option" aria-selected="{{l.selected}}" onClick="{{l.pick}}">
                    <span class="tile lib-{{l.id}}" style="background-color: {{l.tint}}" aria-hidden="true"></span>
                    <span class="libtext"><span class="libname" title="{{l.name}}">{{l.name}}</span><span class="libmeta tnum">{{l.count}}</span></span>
                    <span class="optcheck"><sc-if value="{{l.isSelected}}" hint-placeholder-val="{{ false }}">${I.check}</sc-if></span>
                  </button>
                </sc-for>
              </div>
              <div class="newlib">
                <span class="tile tile--empty" aria-hidden="true">${I.tileImages}</span>
                <div class="field"><input type="text" aria-label="New library" placeholder="New library" value="{{newLibVal}}" onChange="{{newLibType}}" /></div>
                <button type="button" class="btn2" disabled="{{newLibOff}}" onClick="{{newLib}}">Create</button>
              </div>
            </div>
          </div>`;

/* Saved reference decks, from Trends. */
const referenceChoice = () => `
          <div class="centre">
            <div class="choose choose--wide" aria-label="Saved reference decks">
              <div class="chead"><span>Saved reference decks</span><span class="n tnum">{{refCount}}</span></div>
              <div class="refs">
                <sc-for list="{{refs}}" as="r" hint-placeholder-count="8">
                  <button type="button" class="ref" onClick="{{r.pick}}"><span class="rimg img-{{r.img}}" aria-hidden="true"></span><b title="{{r.title}}">{{r.title}}</b><span class="tnum">{{r.meta}}</span></button>
                </sc-for>
              </div>
            </div>
          </div>`;

const holdButton = () =>
  `<button type="button" class="hold {{holdCls}}" aria-label="{{holdLabel}}, press and hold" onPointerDown="{{holdStart}}" onPointerUp="{{holdStop}}" onPointerLeave="{{holdStop}}" onKeyDown="{{holdKey}}" onKeyUp="{{holdStop}}" onBlur="{{holdStop}}"><i class="{{holdRest}}" style="transform: scaleX({{holdScale}})" aria-hidden="true"></i><span>{{holdText}}</span></button>`;
const saveButton = () => `<button type="button" class="cta" disabled="{{saveOff}}" onClick="{{openSave}}">{{saveText}}</button>`;

/* The canvas: every slide in a row, each with its caption; pannable. */
const canvas = (phone) => `
              <div class="work">
                <div class="pan {{panCls}}" id="d6-pan"${phone ? "" : ` onPointerDown="{{panDown}}" onPointerMove="{{panMove}}" onPointerUp="{{panUp}}" onPointerCancel="{{panUp}}"`}>
                  <div class="slides">
                    <sc-if value="{{showRef}}" hint-placeholder-val="{{ false }}">
                      <div class="refgroup {{refCls}}" aria-label="{{refLabel}}">
                        <div class="reflabel">
                          <span>Reference</span><b title="{{refName}}">{{refName}}</b><span class="tnum">{{refMeta}}</span>
                          <sc-if value="{{refNotAnalysed}}" hint-placeholder-val="{{ false }}"><span class="pill muted">Not analysed in Trends</span></sc-if>
                          <sc-if value="{{isAnalysing}}" hint-placeholder-val="{{ false }}"><span class="busy" role="status"><span class="spin on">${I.busy}</span>Analysing</span></sc-if>
                        </div>
                        <div class="refrow">
                          <sc-for list="{{refSlides}}" as="rs" hint-placeholder-count="4">
                            <div class="rslide {{rs.cls}}" aria-hidden="true">${slideFace("rs", false)}</div>
                          </sc-for>
                        </div>
                      </div>
                    </sc-if>
                    <sc-for list="{{slidesAll}}" as="sl" hint-placeholder-count="6">
                      <div class="sframe">
                        <div class="fcap">
                          <b class="tnum">{{sl.name}}</b>
                          <sc-if value="{{sl.rBusy}}" hint-placeholder-val="{{ false }}"><span class="busy" role="status"><span class="spin on">${I.busy}</span>Rendering</span></sc-if>
                          <sc-if value="{{sl.rDone}}" hint-placeholder-val="{{ false }}"><span class="pill pill--ok">Rendered</span></sc-if>
                          <sc-if value="{{sl.rFail}}" hint-placeholder-val="{{ false }}"><span class="pill pill--danger">${D6I.warnSm}Render failed</span><button type="button" class="tbtn" onClick="{{sl.retry}}">${D6I.retry}Retry</button></sc-if>
                          <sc-if value="{{sl.canMenu}}" hint-placeholder-val="{{ false }}"><button type="button" class="capmenu {{sl.menuCls}}" aria-label="{{sl.menuLabel}}" aria-haspopup="menu" aria-expanded="{{sl.menuExpanded}}" onClick="{{sl.menuToggle}}">${D6I.dots}</button></sc-if>
                        </div>
                        <sc-if value="{{sl.menuOpen}}" hint-placeholder-val="{{ false }}">
                          <div class="smenu" role="menu" aria-label="{{sl.name}}">
                            <button type="button" class="mrow" role="menuitem" onClick="{{sl.duplicate}}">${D6I.copy}Duplicate</button>
                            <button type="button" class="mrow" role="menuitem" disabled="{{sl.leftOff}}" onClick="{{sl.moveLeft}}">${D6I.left}Move left</button>
                            <button type="button" class="mrow" role="menuitem" disabled="{{sl.rightOff}}" onClick="{{sl.moveRight}}">${D6I.right}Move right</button>
                            <div class="msep" aria-hidden="true"></div>
                            <button type="button" class="mrow is-danger" role="menuitem" disabled="{{sl.delOff}}" onClick="{{sl.remove}}">${D6I.trash}Delete</button>
                            <sc-if value="{{sl.delOff}}" hint-placeholder-val="{{ false }}"><div class="mhint">Keep at least two slides</div></sc-if>
                          </div>
                        </sc-if>
                        <sc-if value="{{sl.sk}}" hint-placeholder-val="{{ false }}"><div class="slide is-sk" aria-label="Drafting"></div></sc-if>
                        <sc-if value="{{sl.real}}" hint-placeholder-val="{{ true }}"><div class="slide {{sl.cls}}" aria-label="{{sl.label}}" onDragOver="{{dragOver}}" onDrop="{{sl.drop}}" onClick="{{sl.pick}}">${slideFace("sl", !phone)}</div></sc-if>
                        ${phone ? "" : `<sc-if value="{{sl.gap}}" hint-placeholder-val="{{ false }}"><button type="button" class="gapadd {{sl.gapCls}}" aria-label="{{sl.gapLabel}}" title="Add a slide here" onClick="{{sl.addAfter}}"><i>${D6I.plusSm}</i></button></sc-if>`}
                      </div>
                    </sc-for>
                    <sc-if value="{{canAdd}}" hint-placeholder-val="{{ false }}">
                      <div class="sframe">
                        <div class="fcap" aria-hidden="true"></div>
                        <button type="button" class="slide slide--add" aria-label="{{addLabel}}" onClick="{{addEnd}}"><i>${D6I.plusLg}</i><span>Add slide</span></button>
                      </div>
                    </sc-if>
                    <sc-if value="{{menuOpen}}" hint-placeholder-val="{{ false }}"><div class="catch mcatch" aria-hidden="true" onClick="{{menuClose}}"></div></sc-if>
                  </div>
                </div>
                ${phone ? "" : chatReveal()}
              </div>`;

function page(phone) {
  return `
      <main class="main">
        <div class="page">
          <div class="sbar">
            <button type="button" class="navrow" onClick="{{sdBack}}"><span class="nbadge">${I.arrowLeft}</span><span class="nlabel">{{sdCrumb}}</span></button>
            <div class="ttl">
              <sc-if value="{{renaming}}" hint-placeholder-val="{{ false }}"><div class="field ttl-field is-focus"><input type="text" aria-label="Name" value="{{renameVal}}" onChange="{{renameType}}" onKeyDown="{{renameKey}}" onBlur="{{renameDone}}" /></div></sc-if>
              <sc-if value="{{notRenaming}}" hint-placeholder-val="{{ true }}"><button type="button" class="tbtn-title" aria-label="{{renameLabel}}" onClick="{{renameStart}}"><h1>{{sdTitle}}</h1>${D6I.pencil}</button></sc-if>
              <div class="cmeta">
                <sc-if value="{{isEdit}}" hint-placeholder-val="{{ false }}">
                  <span class="pill">{{sdCharacter}}</span>
                  <button type="button" class="vbtn tnum" aria-haspopup="listbox" aria-expanded="{{versExpanded}}" onClick="{{versToggle}}">{{sdVersion}}${I.caretDown}</button>
                  <sc-if value="{{versOpen}}" hint-placeholder-val="{{ false }}">
                    <div class="vpop" role="listbox" aria-label="Versions">
                      <sc-for list="{{versions}}" as="v" hint-placeholder-count="4">
                        <div class="vrow {{v.cls}}" role="option" aria-selected="{{v.selected}}">
                          <b class="tnum">{{v.name}}</b><span class="vd tnum">{{v.date}}</span>
                          <sc-if value="{{v.active}}" hint-placeholder-val="{{ false }}"><span class="pill pill--ok">Active</span></sc-if>
                          <sc-if value="{{v.canMake}}" hint-placeholder-val="{{ true }}"><button type="button" class="tbtn" onClick="{{v.make}}">Make active</button></sc-if>
                        </div>
                      </sc-for>
                    </div>
                  </sc-if>
                </sc-if>
                <sc-if value="{{hasLib}}" hint-placeholder-val="{{ true }}"><span class="pill" title="{{libName}}">{{libName}}</span></sc-if>
              </div>
            </div>
            <div class="hact">
              ${holdButton()}
              ${saveButton()}
            </div>
          </div>

          <div class="sand {{sandCls}}">
            <sc-if value="{{isStart}}" hint-placeholder-val="{{ false }}">${startCards()}</sc-if>
            <sc-if value="{{isLibrary}}" hint-placeholder-val="{{ false }}">${libraryChoice()}</sc-if>
            <sc-if value="{{isReference}}" hint-placeholder-val="{{ false }}">${referenceChoice()}</sc-if>
            <sc-if value="{{isEmpty}}" hint-placeholder-val="{{ false }}"><div class="centre">${chatBox(true)}</div></sc-if>
            <sc-if value="{{isStudio}}" hint-placeholder-val="{{ true }}">
              <div class="studio">
                ${phone ? "" : leftPanel()}
                ${canvas(phone)}
                ${phone ? "" : rightPanel()}
                ${topStrip()}
                ${toolStrip()}
              </div>
            </sc-if>
          </div>
        </div>
      </main>`;
}

/* The Save as carousel type dialog, over the whole app, and the click-away layer for the versions list. */
const appOverlay = () => `
    <sc-if value="{{versOpen}}" hint-placeholder-val="{{ false }}"><div class="catch" aria-hidden="true" onClick="{{versClose}}"></div></sc-if>
    <sc-if value="{{saveOpen}}" hint-placeholder-val="{{ false }}">
      <div class="dlg">
        <div class="dscrim" aria-hidden="true" onClick="{{closeSave}}"></div>
        <div class="dbox" id="save-dialog" role="dialog" aria-modal="true" aria-label="{{saveText}}" tabindex="-1" onKeyDown="{{saveKey}}">
          <div class="dhead"><span>{{saveText}}</span><button type="button" class="dclose" aria-label="Close" onClick="{{closeSave}}">${D6I.x}</button></div>
          <div class="drow">
            <label class="ilabel" for="sv-name">Name</label>
            <div class="field"><input id="sv-name" type="text" placeholder="Morning Routine" value="{{svName}}" onChange="{{svTypeName}}" /></div>
          </div>
          <div class="drow">
            <span class="ilabel">Character</span>
            <button type="button" class="dd" aria-haspopup="listbox" onClick="{{svPickCharacter}}">{{svCharacter}}${I.caretDown}</button>
          </div>
          <div class="drow">
            <label class="ilabel" for="sv-slug">Short name</label>
            <div class="field {{svSlugCls}}"><input id="sv-slug" type="text" placeholder="morning-routine" value="{{svSlug}}" onChange="{{svTypeSlug}}" /><sc-if value="{{svTaken}}" hint-placeholder-val="{{ true }}"><span class="taken" role="alert">Taken</span></sc-if></div>
          </div>
          <div class="dfoot">
            <button type="button" class="tbtn" onClick="{{closeSave}}">Cancel</button>
            <button type="button" class="cta" disabled="{{svOff}}" onClick="{{svSave}}">Save</button>
          </div>
        </div>
      </div>
    </sc-if>`;

/* On the phone: the floating conversation and its button, the adjustments sheet, and the bottom bar. */
const colOverlay = (phone) =>
  phone
    ? `${phoneChat()}
    <sc-if value="{{sheetOpen}}" hint-placeholder-val="{{ false }}">
      <div class="sheetscrim" aria-hidden="true" onClick="{{sheetClose}}"></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Adjustments">
        <div class="shead"><span>Adjustments</span><button type="button" class="fold" aria-label="Close" onClick="{{sheetClose}}">${D6I.x}</button></div>
        <div class="sbody">${adjustments()}</div>
      </div>
    </sc-if>
    <sc-if value="{{isStudio}}" hint-placeholder-val="{{ true }}"><div class="bar">
      <button type="button" class="tools" aria-label="Adjustments" aria-expanded="{{sheetExpanded}}" onClick="{{sheetOpenFn}}">${D6I.sliders}</button>
      ${holdButton()}
      ${saveButton()}
    </div></sc-if>`
    : "";

/* ── Behaviour ─────────────────────────────────────────────────────────── */

/* Focus moves into the dialog as it opens; the canvas pans to a slide when asked; the left panel scrolls to its
   library section when opened from the rail's library icon. */
const didUpdate = `
    /* Handed a deck by Trends (Copy to Studio, D10, prototype 2026-09-17 at Garreth's request): start from it the
       way picking it from the saved decks does, once per hand-off. The landing is D10's approved Studio board: the
       deck under analysis, the chat open, the left panel folded, the Window library, and the "Not analysed in
       Trends" pill when nothing has been run on it. Opened from the menu, with no deck, the Studio still keeps
       whatever draft was in progress. */
    var P6 = st.params || {};
    if (st.screen === "studio" && P6.ref && !P6.refTaken && this.d6startAnalyse) {
      this.setState({ params: Object.assign({}, P6, { refTaken: true }), d6mode: "new", d6entry: "reference", d6lib: "window", d6refNew: !!P6.refNew, d6left: false, d6rendered: null, d6vers: false, d6rename: false, d6sheet: false });
      this.d6startAnalyse(P6.ref);
    }
    if (st.d6focusSave) {
      var dlg6 = document.getElementById("save-dialog");
      if (dlg6) dlg6.focus({ preventScroll: true });
      this.setState({ d6focusSave: false });
    }
    if (st.d6panTo) {
      var pan6 = document.getElementById("d6-pan");
      if (pan6) pan6.scrollTo({ left: st.d6panTo.x, top: 0, behavior: st.d6panTo.smooth ? "smooth" : "auto" });
      this.setState({ d6panTo: null });
    }
    if (st.d6toLibrary) {
      var lib6 = document.getElementById("sec-library");
      if (lib6) lib6.scrollIntoView({ block: "start" });
      this.setState({ d6toLibrary: false });
    }`;

function vals(init) {
  return `
    var PHONE = ctx.PHONE;
    var P = s.params || {};
    var LIBS = ${JSON.stringify(LIBS)};
    var GROUPS = ${JSON.stringify(GROUPS)};
    var GROUP_PHOTOS = ${JSON.stringify(GROUP_PHOTOS)};
    var LAYOUTS = ${JSON.stringify(LAYOUTS)};
    var PHOTOS = ${JSON.stringify(PHOTOS)};
    var STYLES = ${JSON.stringify(STYLES)};
    var COPY = ${JSON.stringify(COPY)};
    var COVER3 = ${JSON.stringify(COVER3)};
    var SOURCES = ${JSON.stringify(SOURCES)};
    var IDEA = ${JSON.stringify(IDEA)};
    var PROMPTS = ${JSON.stringify(PROMPTS)};
    var REFS = ${JSON.stringify(REFS)};
    var REF_SLIDES = ${JSON.stringify(REF_SLIDES.slice(0, 3))};
    var VERSIONS = ${JSON.stringify(VERSIONS)};
    var SLIDE_W = ${JSON.stringify(SLIDE_W)};
    var SLIDE_GAP = ${SLIDE_GAP};
    var PAN_PAD = ${JSON.stringify(PAN_PAD)};

    var mode = s.d6mode;
    var edit = mode === "edit";
    var stage = s.d6stage;
    var newLibName = s.d6newLibName || "";
    var lib = s.d6lib === "new" ? { id: "new", name: newLibName || "New library", hue: "", g: [0, 0, 0, 0] } : (LIBS.filter(function (l) { return l.id === s.d6lib; })[0] || null);
    var fmt = function (n) { return n.toLocaleString("en-US"); };
    var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
    var tint = function (hex) { return hex ? "color-mix(in srgb, var(--card-raised) 78%, " + hex + ")" : "var(--card-sunken)"; };
    var images = function (n) { return n === 1 ? "1 image" : fmt(n) + " images"; };
    var setCount = function (g) { return lib ? lib.g[GROUPS.indexOf(g)] : 0; };
    var copySet = COPY[s.d6copy] || COPY.morning;
    var NAME = edit ? (P.name || "Before & After") : "Morning Routine";
    /* The title is the type's name; a new type is "New carousel type" until it is renamed here or in the Save dialog. */
    var TITLE = edit ? NAME : (s.d6title || "New carousel type");
    /* The deck: which layout and which copy each slide carries. Slides can be added, duplicated, deleted and moved
       (Garreth, 2026-09-17), so the draft is a list of slides rather than the six layouts in order. A slide the
       person added takes the other sample copy set, so its line differs from its neighbour's. */
    var deck = s.d6deck || LAYOUTS.map(function (_, i) { return { src: i, alt: false }; });
    var SLIDES = deck.length;
    var altCopy = s.d6copy === "morningAlt" ? COPY.morning : s.d6copy === "before" ? COPY.before : COPY.morningAlt;

    /* The slides, from the layouts and the sample copy. Each cell's set can be changed in the adjustments (or a
       library image dropped on it); each text box's style can be changed there too; both are kept as overrides
       keyed by slide and index. */
    var cellSets = s.d6cellSets || {};
    var cellImages = s.d6cellImages || {};
    var boxStyles = s.d6boxStyles || {};
    var rendered = s.d6rendered || {};
    var sel = s.d6sel || { kind: "box", i: 0 };
    var slide = Math.max(1, Math.min(SLIDES, s.d6slide || 1));
    var keyOf = function (n, i) { return n + ":" + i; };
    /* D14's three-role cover: which slide carries it, and how many of its boxes are there (the fourth is the one
       added by hand, which only the unnamed board shows). */
    var cover3 = s.d6cover3 ? Math.max(3, Math.min(COVER3.lines.length, s.d6cover3)) : 0;
    var on3 = function (n) { return !!cover3 && n === 1; };
    var styleOf = function (n, i) {
      var role = on3(n) ? COVER3.styles[i] || "small" : n === 1 ? "hook" : (n === SLIDES && i === 0 ? "hook" : "line");
      return Object.assign({ name: role }, STYLES[role], boxStyles[keyOf(n, i)] || {});
    };
    /* D14: the box's place in the copy contract — the name the writer reads, and who writes it. Both start from the
       AI's draft and are kept as overrides, the way a box's style is. */
    var boxMeta = s.d6boxMeta || {};
    /* D14, decided by Garreth 2026-09-22: a box no longer arrives unnamed. A box the AI drafted carries its role;
       a box added by hand takes "Text Box n", where n counts the boxes added to that slide in the order they were
       made. So there is never a hole in the copy contract, and nothing to hold Generate for. */
    var draftName = function (n, i) {
      if (on3(n)) {
        if (COVER3.names[i]) return COVER3.names[i];
        var k = 1;
        for (var j = 0; j < i; j++) if (!COVER3.names[j]) k++;
        return "Text Box " + k;
      }
      if (i > 0) return "save";
      return n === 1 ? "hook" : n === SLIDES ? "closing" : "line";
    };
    var draftBy = function (n, i) { return on3(n) ? COVER3.by[i] || "ai" : i > 0 ? "fixed" : "ai"; };
    var draftFixed = function (n, i) {
      if (on3(n)) return COVER3.fixed[i] || "";
      return i > 0 ? "Save this for tomorrow morning" : "";
    };
    var metaOf = function (n, i) {
      var m = boxMeta[keyOf(n, i)] || {};
      return {
        name: m.name !== undefined ? m.name : draftName(n, i),
        by: m.by || draftBy(n, i),
        fixed: m.fixed !== undefined ? m.fixed : draftFixed(n, i),
      };
    };
    /* D14: how many characters the box holds, worked out from its wrap width and size against the bundled fonts
       rather than typed in — a new box has no painted history to take a limit from. It follows the steppers. */
    var fitsOf = function (st) { return Math.max(1, Math.round(st.wrap / (st.size * 0.5))) * (st.name === "small" ? 1 : 3); };
    /* Selecting another box drops whatever was half-typed in the Name field. */
    var select = function (n, kind, i) { self.setState({ d6slide: n, d6sel: { kind: kind, i: i }, d6vers: false, d6sheet: PHONE, d6nameVal: null }); };
    var writing = s.d6writing || 0;
    var faceOf = function (n, live) {
      var d = deck[n - 1];
      var L = LAYOUTS[d.src];
      var lines = on3(n) ? COVER3.lines.slice(0, cover3) : (d.alt ? altCopy : copySet)[d.src];
      var onThis = n === slide;
      var cells = L.cells.map(function (c, i) {
        var g = cellSets[keyOf(n, i)] || c.g;
        var count = setCount(g);
        var img = cellImages[keyOf(n, i)] || PHOTOS[d.src][i];
        var selected = onThis && sel.kind === "cell" && sel.i === i;
        return {
          x: c.x, y: c.y, w: c.w, h: c.h,
          empty: count === 0,
          full: count > 0,
          cls: [count > 0 ? "img-" + img : "is-empty", selected ? "is-sel" : "", live ? "can-pick" : ""].join(" "),
          label: "Image cell " + (i + 1) + ", draws from " + g + (count === 0 ? ", no images" : ""),
          pressed: selected ? "true" : "false",
          pick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); select(n, "cell", i); }
        };
      });
      var boxes = lines.map(function (text, i) {
        var st = styleOf(n, i);
        var at = on3(n) ? COVER3.ats[i] || "centre" : i === 1 ? "bottom2" : L.at;
        var selected = onThis && sel.kind === "box" && sel.i === i;
        /* D14: the name rides above the box on the slide being worked on, so three boxes read as three roles. */
        var nm = metaOf(n, i).name;
        return {
          text: text,
          sk: !!s.d6sampling || writing === n,
          txt: !s.d6sampling && writing !== n,
          name: nm,
          role: nm,
          tagOn: onThis && live && !!nm,
          tagCls: selected ? "" : "is-off",
          w: Math.round((st.wrap / 1080) * 1000) / 10,
          cls: ["tb--" + st.name, "st-" + Math.max(0, Math.min(4, st.stroke)), "sw-" + (st.strokeColour || "black"), "sh-" + st.shadow.toLowerCase(), "al-" + st.align, "at-" + at, selected ? "is-sel" : "", live ? "can-pick" : ""].join(" "),
          sel: selected,
          label: (nm ? "Text box " + nm : "Text box with no name") + ", " + text,
          pressed: selected ? "true" : "false",
          pick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); select(n, "box", i); }
        };
      });
      return { cells: cells, boxes: boxes };
    };

    var analysing = stage === "analysing";
    var drafting = stage === "drafting" || stage === "draftFailed";
    var ready = stage === "ready";
    var cur = ready ? faceOf(slide, true) : { cells: [], boxes: [] };

    /* The reference deck's own slides, read-only, first on the canvas; a light sweeps down each while the AI
       analyses them. */
    var entry = s.d6entry || "discuss";
    var refTitle = s.d6ref || REFS[0].title;
    var refRow = REFS.filter(function (r) { return r.title === refTitle; })[0] || REFS[0];
    var showRef = !edit && entry === "reference" && (analysing || drafting || ready);
    var refSlides = REF_SLIDES.map(function (r, i) {
      return {
        cls: analysing ? "is-scan" : "",
        cells: [{ x: 0, y: 0, w: 100, h: 100, empty: false, full: true, cls: "img-" + r.img, label: "", pressed: "false", pick: function () {} }],
        boxes: [{ text: r.text, sk: false, txt: true, name: "", role: "", tagOn: false, tagCls: "", w: 84, cls: (i === 0 ? "tb--hook" : "tb--line") + " st-3 sw-black sh-hard al-left at-top", sel: false, label: "", pressed: "false", pick: function () {} }]
      };
    });

    /* Dropping a library image on a slide: which cell it landed in, from where it landed. */
    var dropOn = function (n) {
      return function (e) {
        e.preventDefault();
        var id = self.d6dragId; self.d6dragId = null;
        if (!id || !ready) return;
        var r = e.currentTarget.getBoundingClientRect();
        var px = ((e.clientX - r.left) / r.width) * 100, py = ((e.clientY - r.top) / r.height) * 100;
        var L = LAYOUTS[deck[n - 1].src];
        var hit = 0;
        L.cells.forEach(function (c, i) { if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) hit = i; });
        var next = Object.assign({}, cellImages); next[keyOf(n, hit)] = id;
        self.setState({ d6cellImages: next, d6slide: n, d6sel: { kind: "cell", i: hit } });
      };
    };
    var renderSlide = function (n) {
      var next = Object.assign({}, rendered); next[n] = "busy";
      self.setState({ d6rendered: next });
      clearTimeout(self.d6render);
      self.d6render = setTimeout(function () {
        var cur6 = Object.assign({}, (self.state || {}).d6rendered || {}); cur6[n] = "done";
        self.setState({ d6rendered: cur6 });
      }, 1400);
    };
    /* Adding, duplicating, deleting and moving slides (Garreth, 2026-09-17). The per-slide overrides (sets, images,
       styles) and the Rendered marks are keyed by slide number, so they travel with their slide. */
    var menu = s.d6menu || 0;
    var shiftKeys = function (map, fn) { var out = {}; Object.keys(map).forEach(function (k) { var p = k.split(":"); var m = fn(+p[0]); if (m > 0) out[m + ":" + p[1]] = map[k]; }); return out; };
    var shiftRendered = function (fn) { var out = {}; Object.keys(rendered).forEach(function (k) { var m = fn(+k); if (m > 0) out[m] = rendered[k]; }); return out; };
    var applyDeck = function (next, fn, extra) {
      self.setState(Object.assign({
        d6deck: next, d6cellSets: shiftKeys(cellSets, fn), d6cellImages: shiftKeys(cellImages, fn), d6boxStyles: shiftKeys(boxStyles, fn),
        d6boxMeta: shiftKeys(boxMeta, fn),
        d6rendered: shiftRendered(fn), d6menu: 0, d6vers: false, d6added: 0, d6removed: 0
      }, extra || {}));
    };
    /* A new slide takes the layout of the slide before it. Added, the AI writes its line (the boxes pulse until it
       lands); duplicated, the text comes along. */
    var insertAfter = function (n, fresh) {
      var d = deck[n - 1], k = n + 1;
      var next = deck.slice(); next.splice(k - 1, 0, { src: d.src, alt: fresh ? !d.alt : d.alt });
      var fn = function (m) { return m >= k ? m + 1 : m; };
      applyDeck(next, fn, Object.assign({ d6slide: k, d6sel: { kind: "box", i: 0 } }, fresh ? { d6writing: k } : { d6added: k, d6addedHow: "dup" }));
      if (fresh) {
        clearTimeout(self.d6writeT);
        self.d6writeT = setTimeout(function () { self.setState({ d6writing: 0, d6added: k, d6addedHow: "new" }); }, 1500);
      }
    };
    var removeSlide = function (n) {
      if (SLIDES <= 2) return;
      var next = deck.slice(); next.splice(n - 1, 1);
      var fn = function (m) { return m === n ? 0 : m > n ? m - 1 : m; };
      applyDeck(next, fn, { d6slide: Math.min(n, next.length), d6sel: { kind: "box", i: 0 }, d6removed: n });
    };
    var moveSlide = function (n, by) {
      var j = n + by; if (j < 1 || j > SLIDES) return;
      var next = deck.slice(); var t = next[n - 1]; next[n - 1] = next[j - 1]; next[j - 1] = t;
      var fn = function (m) { return m === n ? j : m === j ? n : m; };
      applyDeck(next, fn, { d6slide: j });
    };
    var slidesAll = [];
    for (var n = 1; n <= (analysing ? 0 : SLIDES); n++) {
      var face = ready ? faceOf(n, true) : { cells: [], boxes: [] };
      var r = rendered[n] || "";
      slidesAll.push({
        n: n, name: "Slide " + n, label: "Slide " + n + (n === slide ? ", selected" : ""),
        sk: !ready, real: ready,
        cls: n === slide ? "is-on" : "",
        rBusy: r === "busy", rDone: r === "done", rFail: r === "failed",
        retry: (function (k) { return function () { renderSlide(k); }; })(n),
        drop: dropOn(n),
        pick: (function (k) { return function () { if (ready && k !== slide) self.setState({ d6slide: k, d6sel: { kind: "box", i: 0 }, d6vers: false, d6menu: 0 }); }; })(n),
        cells: face.cells, boxes: face.boxes,
        canMenu: ready,
        menuOpen: ready && menu === n,
        menuCls: (menu === n ? "is-on " : "") + (n === slide ? "is-vis" : ""),
        menuLabel: "Slide " + n + " options",
        menuExpanded: menu === n ? "true" : "false",
        menuToggle: (function (k) { return function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.setState({ d6menu: menu === k ? 0 : k, d6vers: false }); }; })(n),
        duplicate: (function (k) { return function () { insertAfter(k, false); }; })(n),
        moveLeft: (function (k) { return function () { moveSlide(k, -1); }; })(n),
        moveRight: (function (k) { return function () { moveSlide(k, 1); }; })(n),
        remove: (function (k) { return function () { removeSlide(k); }; })(n),
        leftOff: n === 1, rightOff: n === SLIDES, delOff: SLIDES <= 2,
        gap: ready && n < SLIDES,
        gapCls: s.d6gapShow === n ? "is-show" : "",
        gapLabel: "Add a slide between " + n + " and " + (n + 1),
        addAfter: (function (k) { return function () { insertAfter(k, true); }; })(n)
      });
    }

    /* Panning: dragging the empty ground moves the canvas; a slide's parts still take the click. The pictures open
       with the selected slide in view. */
    var panDown = function (e) {
      if (e.button !== 0) return;
      if (e.target && e.target.closest && e.target.closest(".slide, .fcap, .smenu, .gapadd")) return;
      var el = e.currentTarget;
      self.d6pan = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      self.setState({ d6panning: true });
    };
    var panMove = function (e) {
      var g = self.d6pan; if (!g) return;
      var el = e.currentTarget;
      el.scrollLeft = g.sl - (e.clientX - g.x);
      el.scrollTop = g.st - (e.clientY - g.y);
    };
    var panUp = function () { if (self.d6pan) { self.d6pan = null; self.setState({ d6panning: false }); } };
    var slideW = PHONE ? SLIDE_W.phone : SLIDE_W.desk;
    if (ready && !self.d6panned) {
      self.d6panned = true;
      var x0 = s.d6panAt !== undefined && s.d6panAt !== null ? s.d6panAt : Math.max(0, (slide - 1) * (slideW + SLIDE_GAP) - (PHONE ? 0 : 24));
      if (x0 > 0) setTimeout(function () { self.setState({ d6panTo: { x: x0, smooth: false } }); }, 40);
    }

    /* The adjustments for the selected text box. */
    var curStyle = ready && sel.kind === "box" ? styleOf(slide, sel.i) : Object.assign({ name: "hook" }, STYLES.hook);
    var setStyle = function (patch) {
      var next = Object.assign({}, boxStyles);
      next[keyOf(slide, sel.i)] = Object.assign({}, boxStyles[keyOf(slide, sel.i)] || {}, patch);
      self.setState({ d6boxStyles: next });
    };
    var step = function (field, by, lo, hi) { return function () { setStyle(Object.fromEntries([[field, Math.max(lo, Math.min(hi, curStyle[field] + by))]])); }; };
    var boxRole = ready && sel.kind === "box" && cur.boxes[sel.i] ? cur.boxes[sel.i].role : "hook";
    /* D14: the selected box's line of the copy contract. The Name field carries what is typed until it is a name
       the slide can take; a name already on the slide is refused rather than saved. */
    var curMeta = ready && sel.kind === "box" ? metaOf(slide, sel.i) : { name: "hook", by: "ai", fixed: "" };
    var setMeta = function (patch) {
      var next = Object.assign({}, boxMeta);
      next[keyOf(slide, sel.i)] = Object.assign({}, boxMeta[keyOf(slide, sel.i)] || {}, patch);
      self.setState({ d6boxMeta: next });
    };
    var siblingNames = (ready && sel.kind === "box" ? cur.boxes : []).map(function (b, i) { return i === sel.i ? "" : b.name; });
    var typedName = s.d6nameVal === undefined || s.d6nameVal === null ? curMeta.name : s.d6nameVal;
    var nameTaken = !!typedName && siblingNames.indexOf(typedName) >= 0;
    var bx = {
      label: "Settings for the selected text box",
      title: "Slide " + slide + " · " + boxRole,
      name: typedName,
      taken: nameTaken,
      nameCls: nameTaken ? "is-taken" : "",
      rename: function (e) {
        var v = ((e && e.target ? e.target.value : "") || "").trim();
        self.setState({ d6nameVal: v });
        if (siblingNames.indexOf(v) < 0) setMeta({ name: v });
      },
      sources: SOURCES.map(function (p) {
        return { key: p[0], name: p[1], checked: curMeta.by === p[0] ? "true" : "false", pick: function () { self.setState({ d6nameVal: null }); setMeta({ by: p[0] }); } };
      }),
      srcMore: curMeta.by === "fixed",
      srcLabel: curMeta.by === "fixed" ? "The words" : "",
      srcText: curMeta.by === "fixed",
      srcPick: false,
      fixed: curMeta.fixed,
      fact: "",
      pickFact: function () {},
      setFixed: function (e) { setMeta({ fixed: ((e && e.target ? e.target.value : "") || "") }); },
      fits: fitsOf(curStyle) + " characters",
      font: curStyle.font, weight: curStyle.weight,
      pickFont: function () { self.note("Lists the template's fonts"); },
      pickWeight: function () { self.note("Lists the font's weights"); },
      size: curStyle.size, sizeDec: step("size", -4, 24, 160), sizeInc: step("size", 4, 24, 160),
      stroke: curStyle.stroke, strokeDec: step("stroke", -1, 0, 4), strokeInc: step("stroke", 1, 0, 4),
      strokeBlack: (curStyle.strokeColour || "black") === "black" ? "true" : "false",
      strokeWhite: curStyle.strokeColour === "white" ? "true" : "false",
      strokeToBlack: function () { setStyle({ strokeColour: "black" }); },
      strokeToWhite: function () { setStyle({ strokeColour: "white" }); },
      shOff: curStyle.shadow === "Off" ? "true" : "false",
      shHard: curStyle.shadow === "Hard" ? "true" : "false",
      shSoft: curStyle.shadow === "Soft" ? "true" : "false",
      shOn: curStyle.shadow !== "Off",
      shSoftOn: curStyle.shadow === "Soft",
      shadowOff: function () { setStyle({ shadow: "Off" }); },
      shadowHard: function () { setStyle({ shadow: "Hard" }); },
      shadowSoft: function () { setStyle({ shadow: "Soft" }); },
      off: curStyle.off, offDec: step("off", -2, 0, 24), offInc: step("off", 2, 0, 24),
      blur: curStyle.blur, blurDec: step("blur", -2, 0, 40), blurInc: step("blur", 2, 0, 40),
      alLeft: curStyle.align === "left" ? "true" : "false",
      alCentre: curStyle.align === "centre" ? "true" : "false",
      alRight: curStyle.align === "right" ? "true" : "false",
      alignLeft: function () { setStyle({ align: "left" }); },
      alignCentre: function () { setStyle({ align: "centre" }); },
      alignRight: function () { setStyle({ align: "right" }); },
      wrap: curStyle.wrap, wrapDec: step("wrap", -40, 400, 1000), wrapInc: step("wrap", 40, 400, 1000)
    };

    /* The adjustments for the selected image cell. */
    var cellSet = ready && sel.kind === "cell" ? (cellSets[keyOf(slide, sel.i)] || LAYOUTS[deck[slide - 1].src].cells[sel.i].g) : "";
    var cl = {
      label: "Settings for the selected image cell",
      title: "Slide " + slide + " · Image " + ((sel.i || 0) + 1),
      libName: lib ? lib.name : "",
      sets: GROUPS.map(function (g) {
        var count = setCount(g), on = g === cellSet;
        return {
          name: g, count: count === 0 ? "No images" : images(count), gcCls: count === 0 ? "is-none" : "",
          on: on, checked: on ? "true" : "false",
          pick: function () { var next = Object.assign({}, cellSets); next[keyOf(slide, sel.i)] = g; self.setState({ d6cellSets: next }); }
        };
      })
    };

    /* The library section. Its images can be dragged onto a cell of any slide; a click puts one in the selected cell. */
    var isNewLib = !!lib && lib.id === "new";
    var lset = s.d6lset || "All";
    var libImages = [];
    if (lib && !isNewLib) {
      GROUPS.forEach(function (g) {
        if (lset !== "All" && lset !== g) return;
        if (setCount(g) === 0) return;
        GROUP_PHOTOS[g].forEach(function (id, i) { libImages.push({ id: id, g: g, i: i }); });
      });
    }
    var placeImage = function (id) {
      if (!ready || sel.kind !== "cell") { self.note("Drag it onto a cell, or select a cell first"); return; }
      var next = Object.assign({}, cellImages); next[keyOf(slide, sel.i)] = id;
      self.setState({ d6cellImages: next });
    };
    var lp = {
      id: lib ? lib.id : "",
      name: lib ? lib.name : "",
      meta: lib ? (isNewLib ? "New" : images(sum(lib.g))) : "",
      tint: lib ? tint(lib.hue) : "",
      hasCover: !!lib && !isNewLib,
      isNew: isNewLib,
      hasImages: !!lib && !isNewLib,
      imagesLabel: lib ? "Images in " + lib.name : "",
      sets: [{ name: "All", count: lib ? fmt(sum(lib.g)) : "0" }].concat(GROUPS.map(function (g) { return { name: g, count: fmt(setCount(g)) }; })).map(function (g) {
        var on = g.name === lset;
        return { name: g.name, count: g.count, cls: on ? "is-on" : "", checked: on ? "true" : "false", pick: function () { self.setState({ d6lset: g.name }); } };
      }),
      images: libImages.slice(0, 9).map(function (im) {
        return {
          id: im.id,
          label: im.g + " image " + (im.i + 1) + ", drag onto a cell",
          drag: function (e) { try { e.dataTransfer.setData("text/plain", im.id); e.dataTransfer.effectAllowed = "copy"; } catch (err) {} self.d6dragId = im.id; },
          pick: function () { placeImage(im.id); }
        };
      }),
      upload: function () { self.note("Uploads images into " + (lib ? lib.name : "the library") + ", by set · D8"); },
      generate: function () { self.note("Generates images with Higgsfield into " + (lib ? lib.name : "the library") + " · D8"); }
    };
    var dragOver = function (e) { if (self.d6dragId) { e.preventDefault(); try { e.dataTransfer.dropEffect = "copy"; } catch (err) {} } };

    /* The conversation, by stage. */
    var msgs = [];
    if (!edit && (analysing || drafting || ready)) msgs.push(entry === "reference" ? { me: true, text: "Start from the saved deck \\u201c" + refTitle + "\\u201d" } : { me: true, text: IDEA });
    if (analysing) msgs.push({ busy: true, text: "Reading the reference's slides: layouts, text placement, pacing" });
    if (stage === "drafting") msgs.push({ busy: true, text: "Drafting six slides" });
    if (stage === "draftFailed") msgs.push({ err: true, text: "Couldn't draft: the model call failed." });
    if (ready && !edit) msgs.push({ ai: true, text: entry === "reference" ? "Six slides, built the way the reference is: the same slide count, layouts and text placement, with your library's images. One question: keep its first-person voice, or make it the character's?" : "Six slides drafted, first person, warm and plain. One question: is this your morning, or a character's? I've written it as yours for now." });
    if (ready && !edit && s.d6copy === "morningAlt") msgs.push({ ai: true, text: "New sample copy, same direction." });
    if (ready && writing) msgs.push({ busy: true, text: "Writing slide " + writing + " to sit between its neighbours" });
    if (ready && s.d6added) msgs.push({ ai: true, text: s.d6addedHow === "dup" ? "Slide " + s.d6added + " is a copy of slide " + (s.d6added - 1) + ", line and all. Change what you like; Regenerate sample rewrites the whole deck." : "Slide " + s.d6added + " added with slide " + (s.d6added - 1) + "'s layout and a new line to match. Regenerate sample rewrites the whole deck." });
    if (ready && s.d6removed) msgs.push({ ai: true, text: "Slide " + s.d6removed + " removed; the rest moved up. Ctrl or Cmd+Z brings it back." });
    if (ready && s.d6ask) {
      msgs.push({ me: true, text: "Put a kitchen at dawn on slide 3" });
      msgs.push({ offer: true, text: "Nothing in " + (lib ? lib.name : "the library") + " shows a kitchen at dawn. I can make four into Cover with the prompt ready, or you can upload your own. Either way they wait for Keep before I put one on slide 3." });
    }
    msgs = msgs.map(function (m) { return Object.assign({ me: false, ai: false, busy: false, err: false, offer: false }, m); });
    var cinVal = s.d6cin || "";
    var startDraft = function (extra) {
      self.setState(Object.assign({ d6stage: "drafting", d6cin: "", d6chatOpen: true, d6unread: false }, extra || {}));
      clearTimeout(self.d6draft);
      self.d6draft = setTimeout(function () {
        var open = !!(self.state || {}).d6chatOpen;
        self.setState({ d6stage: "ready", d6slide: 1, d6sel: { kind: "box", i: 0 }, d6unread: !open });
      }, 1800);
    };
    var send = function () {
      if (!cinVal.trim()) return;
      if (stage === "empty") startDraft();
      else { self.setState({ d6cin: "" }); self.note("Sends the message; the draft changes to match, slide count included"); }
    };
    /* From a reference: the vision pass first, then the draft. */
    var startAnalyse = function (title) {
      self.setState({ d6stage: "analysing", d6ref: title, d6chatOpen: true, d6unread: false });
      clearTimeout(self.d6draft);
      self.d6draft = setTimeout(function () { startDraft({ d6ref: title }); }, 2400);
    };
    /* Kept on the component so the update hook can start from a deck Trends hands over (Copy to Studio, D10). */
    self.d6startAnalyse = startAnalyse;
    /* Regenerate sample: the boxes pulse until the new copy lands. */
    var resample = function () {
      if (s.d6sampling) return;
      self.setState({ d6sampling: true, d6rendered: {} });
      clearTimeout(self.d6sampleT);
      self.d6sampleT = setTimeout(function () {
        var st = self.state || {};
        self.setState({ d6sampling: false, d6copy: st.d6copy === "morningAlt" ? "morning" : "morningAlt" });
      }, 1600);
    };
    /* The chat box's placeholder cycles through sample ideas while it is empty. */
    var ph = s.d6ph || 0;
    if ((stage === "empty" || s.d6chatOpen) && !cinVal && !self.d6phT) {
      self.d6phT = setInterval(function () {
        var st = self.state || {};
        if (st.screen !== "studio" || st.d6cin) { clearInterval(self.d6phT); self.d6phT = null; return; }
        self.setState({ d6ph: ((st.d6ph || 0) + 1) % PROMPTS.length });
      }, 4000);
    }

    /* Discard: hold-button.tsx's timing, 1.1 seconds; letting go early always aborts. */
    var hold = s.d6hold || 0;
    var holdStop = function () {
      clearInterval(self.d6holdT); self.d6holdT = null;
      if ((self.state || {}).d6hold > 0) self.setState({ d6hold: 0 });
    };
    var holdStart = function (e) {
      if (e && typeof e.button === "number" && e.button !== 0) return;
      if (self.d6holdT) return;
      var t0 = Date.now();
      self.d6holdT = setInterval(function () {
        var p = Math.min(1, (Date.now() - t0) / 1100);
        if (p >= 1) {
          clearInterval(self.d6holdT); self.d6holdT = null;
          self.setState({ d6hold: 0 });
          if (edit) ctx.open("type", { name: NAME }, "Discards the changes and goes back to " + NAME + " · D7");
          else ctx.open("types", null, "Discards the draft and goes back to Carousel types · D1");
        } else self.setState({ d6hold: p });
      }, 16);
    };

    var hasDraft = ready;
    var slug = s.d6slug === undefined ? "morning-routine" : s.d6slug;
    var taken = !edit && slug === "morning-routine";
    var afterLibrary = function () { return hasDraft ? "ready" : entry === "reference" ? "reference" : "empty"; };
    /* Renaming: the title becomes a field; Enter or leaving it keeps the name, Escape drops the change. */
    var renameDone = function () {
      var v = ((self.state || {}).d6renameVal || "").trim();
      self.setState(Object.assign({ d6rename: false }, v ? { d6title: v, d6name: v } : {}));
    };
    var chatOpen = (analysing || drafting || ready) && !!s.d6chatOpen;
    var leftOpen = s.d6left !== false;

    return {
      sdCrumb: edit ? NAME : "Carousel types",
      sdBack: function () { if (edit) ctx.open("type", { name: NAME }, "Back to " + NAME + " · D7"); else ctx.open("types", null, "Back to Carousel types · D1"); },
      sdTitle: TITLE,
      renaming: !!s.d6rename,
      notRenaming: !s.d6rename,
      renameLabel: "Rename " + TITLE,
      renameVal: s.d6renameVal === undefined ? TITLE : s.d6renameVal,
      renameStart: function () { if (edit) { self.note("Renames the type; its short name stays"); } self.setState({ d6rename: true, d6renameVal: TITLE === "New carousel type" ? "" : TITLE, d6vers: false }); },
      renameType: function (e) { self.setState({ d6renameVal: e.target.value }); },
      renameKey: function (e) { if (e.key === "Enter") { e.preventDefault(); renameDone(); } else if (e.key === "Escape") { e.preventDefault(); self.setState({ d6rename: false }); } },
      renameDone: renameDone,
      isEdit: edit,
      sdCharacter: P.character || "Character 2",
      sdVersion: "Version " + (s.d6active || 4),
      versOpen: !!s.d6vers,
      versExpanded: s.d6vers ? "true" : "false",
      versToggle: function () { self.setState({ d6vers: !s.d6vers }); },
      versClose: function () { self.setState({ d6vers: false }); },
      versions: VERSIONS.map(function (v) {
        var active = v.v === (s.d6active || 4);
        return {
          name: "Version " + v.v, date: v.date, active: active, canMake: !active,
          cls: active ? "is-active" : "", selected: active ? "true" : "false",
          make: function () { self.setState({ d6active: v.v, d6vers: false }); self.note("Makes version " + v.v + " the active template; new batches use it"); }
        };
      }),
      hasLib: !!lib,
      libName: lib ? lib.name : "",
      canChangeLib: !edit,
      changeLib: function () { self.setState({ d6stage: "library", d6vers: false, d6sheet: false }); },
      libs: LIBS.map(function (l) {
        var on = l.id === s.d6lib;
        return {
          id: l.id, name: l.name, tint: tint(l.hue), count: images(sum(l.g)),
          selected: on ? "true" : "false", isSelected: on,
          pick: function () { self.setState({ d6lib: l.id, d6stage: afterLibrary() }); }
        };
      }),
      newLibVal: s.d6newLib || "",
      newLibType: function (e) { self.setState({ d6newLib: e.target.value }); },
      newLibOff: !(s.d6newLib || "").trim(),
      newLib: function () { self.setState({ d6lib: "new", d6newLibName: (s.d6newLib || "").trim(), d6stage: afterLibrary() }); },

      startReference: function () { self.setState({ d6entry: "reference", d6stage: "library" }); },
      startDiscuss: function () { self.setState({ d6entry: "discuss", d6stage: "library" }); },
      refCount: REFS.length + " saved",
      refs: REFS.map(function (r) { return { img: r.img, title: r.title, meta: r.meta, pick: function () { startAnalyse(r.title); } }; }),
      showRef: showRef,
      refCls: analysing ? "is-scan" : "",
      refLabel: "Reference deck, " + refTitle + ", read-only",
      refName: refTitle,
      refMeta: refRow.meta.split(" · ")[0],
      refNotAnalysed: showRef && !!s.d6refNew,
      refSlides: refSlides,
      isAnalysing: analysing,
      sampling: !!s.d6sampling || !!writing,
      notSampling: !s.d6sampling && !writing,
      busyText: writing ? "Writing slide " + writing : "Rewriting sample",

      /* The phone's bar is short on room: Discard alone (Garreth, 2026-09-15). */
      holdText: PHONE ? "Discard" : edit ? "Discard changes" : "Discard draft",
      holdLabel: edit ? "Discard changes" : "Discard draft",
      holdCls: hold > 0.5 ? "is-over" : "",
      holdRest: hold > 0 ? "" : "is-rest",
      holdScale: hold,
      holdStart: holdStart,
      holdStop: holdStop,
      holdKey: function (e) { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); holdStart(); } },
      saveText: edit ? "Save version" : "Save as carousel type",
      saveOff: !hasDraft || !lib,
      openSave: function () {
        if (edit) { self.note("Saves version " + ((s.d6active || 4) + 1) + " and makes it active"); return; }
        self.setState({ d6save: true, d6focusSave: true, d6vers: false });
      },

      sandCls: analysing || drafting || ready ? "is-studio" : "",
      isStart: stage === "start",
      isLibrary: stage === "library",
      isReference: stage === "reference",
      isEmpty: stage === "empty",
      isStudio: analysing || drafting || ready,
      isDrafting: drafting,
      isReady: ready,
      toolSelect: function () {},
      toolText: function () { self.note("Adds a text box to the slide"); },
      toolImage: function () { self.note("Adds an image cell to the slide"); },
      slidesAll: slidesAll,
      slideCount: "Slide " + slide + " of " + SLIDES,
      canAdd: ready,
      addLabel: "Add a slide after slide " + SLIDES,
      addEnd: function () { insertAfter(SLIDES, true); },
      menuOpen: ready && menu > 0,
      menuClose: function () { self.setState({ d6menu: 0 }); },
      panCls: s.d6panning ? "is-drag" : "",
      panDown: panDown, panMove: panMove, panUp: panUp,
      dragOver: dragOver,
      regenSample: resample,
      render: function () { if (ready) renderSlide(slide); },
      selBox: ready && sel.kind === "box",
      selCell: ready && sel.kind === "cell",
      bx: bx,
      cl: cl,
      lp: lp,

      leftCls: leftOpen ? "" : "is-c",
      leftToggle: function () { self.setState({ d6left: !leftOpen }); },
      leftOpen: function () { self.setState({ d6left: true }); },
      leftOpenLibrary: function () { self.setState({ d6left: true, d6toLibrary: true }); },
      chatCls: chatOpen ? "" : "is-c",
      chatClosed: (analysing || drafting || ready) && !chatOpen,
      showFab: PHONE && (analysing || drafting || ready) && !s.d6sheet && !chatOpen,
      fabLabel: s.d6chatOpen ? "Hide the conversation" : "Open the conversation",
      chatOpen: chatOpen,
      chatExpanded: s.d6chatOpen ? "true" : "false",
      chatUnread: !!s.d6unread && !s.d6chatOpen,
      chatToggle: function () { self.setState({ d6chatOpen: !s.d6chatOpen, d6unread: false }); },
      sheetOpen: PHONE && ready && !!s.d6sheet,
      sheetExpanded: s.d6sheet ? "true" : "false",
      sheetOpenFn: function () { self.setState({ d6sheet: true, d6chatOpen: false }); },
      sheetClose: function () { self.setState({ d6sheet: false }); },
      msgs: msgs,
      aiPh: stage === "empty" ? PROMPTS[ph % PROMPTS.length] : (edit ? "Change the hook's style" : "Warmer hook, no numbers"),
      aiPhCls: "k" + (ph % 2),
      cinVal: cinVal,
      cinEmpty: !cinVal,
      cinHas: !!cinVal,
      cinCls: s.d6cinFocus ? "is-focus" : "",
      cinType: function (e) { self.setState({ d6cin: e.target.value }); },
      cinKey: function (e) { if (e.key === "Enter") { e.preventDefault(); send(); } },
      attach: function () { self.note("Attaches a reference image to the conversation"); },
      offerGenerate: function () { self.note("Opens Generate with AI for " + (lib ? lib.name : "the library") + ", filled in: kitchen at dawn, Place, Cover, 4, portrait · D8"); },
      offerUpload: function () { self.note("Opens Upload images for " + (lib ? lib.name : "the library") + ", into Cover · D8"); },
      sendCls: cinVal.trim() ? "is-ready" : "",
      sendOff: !cinVal.trim(),
      send: send,
      retryDraft: function () { startDraft(); },

      saveOpen: !!s.d6save,
      closeSave: function () { self.setState({ d6save: false }); },
      saveKey: function (e) { if (e.key === "Escape") { e.preventDefault(); self.setState({ d6save: false }); } },
      svName: s.d6name === undefined ? (TITLE === "New carousel type" ? "Morning Routine" : TITLE) : s.d6name,
      svTypeName: function (e) { self.setState({ d6name: e.target.value }); },
      svCharacter: s.d6char || "Character 3",
      svPickCharacter: function () { self.note("Lists the characters"); },
      svSlug: slug,
      svTypeSlug: function (e) { self.setState({ d6slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }); },
      svSlugCls: taken ? "is-taken" : "",
      svTaken: taken,
      svOff: taken || !slug || !(s.d6name === undefined ? "Morning Routine" : s.d6name).trim(),
      svSave: function () {
        self.setState({ d6save: false });
        ctx.open("type", { name: s.d6name || "Morning Routine", fresh: true }, "Saves version 1 and opens the new type, Not wired · D7");
      }
    };`;
}

/**
 * The Studio as first approved. `init` is the moment a review picture shows.
 * studioScreen() below adds round two to it.
 */
function studioBaseScreen({ init = {} } = {}) {
  const m = {
    mode: "new", stage: "start", entry: "discuss", lib: null, libName: "", slide: 1, sel: { kind: "box", i: 0 }, rendered: null,
    save: false, hold: 0, vers: false, copy: "morning", cin: "", chatOpen: false, unread: false, left: true, title: "", rename: false, renameVal: undefined, sheet: false, ask: false,
    ref: "", refNew: false, sampling: false,
    deck: null, menu: 0, gapShow: 0, writing: 0, added: 0, addedHow: "", removed: 0, panAt: null,
    /* D14: how many text boxes the cover carries (3, or 4 with one added by hand), what is half-typed in the Name
       field, and any change to a box's name, source or fixed words. */
    cover3: 0, nameVal: null, boxMeta: null,
    ...init,
  };
  const fresh = {
    d6mode: m.mode, d6stage: m.stage, d6entry: m.entry, d6lib: m.lib, d6newLibName: m.libName, d6slide: m.slide, d6sel: m.sel, d6rendered: m.rendered, d6ask: m.ask,
    d6ref: m.ref, d6refNew: m.refNew, d6sampling: m.sampling,
    d6deck: m.deck, d6menu: m.menu, d6gapShow: m.gapShow, d6writing: m.writing, d6added: m.added, d6addedHow: m.addedHow, d6removed: m.removed, d6panAt: m.panAt,
    d6save: m.save, d6hold: m.hold, d6vers: m.vers, d6copy: m.copy, d6cin: m.cin, d6cinFocus: !!m.cinFocus, d6chatOpen: m.chatOpen, d6unread: m.unread, d6left: m.left,
    d6title: m.title, d6rename: m.rename, d6renameVal: m.renameVal, d6sheet: m.sheet,
    d6cellSets: null, d6cellImages: null, d6boxStyles: null, d6lset: "All", d6newLib: "", d6ph: 0, d6panning: false, d6panTo: null, d6toLibrary: false,
    d6cover3: m.cover3, d6nameVal: m.nameVal, d6boxMeta: m.boxMeta,
  };
  return {
    id: "studio",
    nav: "studio",
    css,
    markup: page,
    appOverlay,
    colOverlay,
    state: { ...fresh, d6active: 4, d6focusSave: false },
    /* Opened from another screen: a draft in progress is kept and the Studio reopens on it (Garreth, 2026-09-15);
       only what was mid-press is dropped. With no draft, New carousel type and the Studio menu item land on the two
       cards. */
    enter: { d6save: false, d6hold: 0, d6vers: false, d6rename: false, d6sheet: false, d6panning: false, d6menu: 0 },
    vals: vals(init),
    didUpdate,
  };
}

/* ══ Round two ═══════════════════════════════════════════════════════════
   D11 (the Studio's second round, approved 2026-09-15) brought into D6's own build: slide sizes (4:5 or 9:16), the
   canvas that pans in every direction and zooms, Start from a Figma link with its chip, the chat box that grows with
   the prompt, and layered templates. D11 was designed as a layer over the first round, so it stays one here:
   studioBaseScreen() is the Studio as first approved, and studioScreen() adds round two. The state keys keep D11's
   d11 prefix. */

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

/* ── Round two: sample content ─────────────────────────────────────────── */

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
      { id: "s2-photo", kind: "frame", name: "Photo", src: "Set", x: 20.1, y: 13.1, w: 59.7, h: 66.9, tint: "bef", set: "Before" },
      { id: "s2-paper", kind: "fixed", name: "Paper", src: "Fixed", x: 0, y: 0, w: 100, h: 100, img: "paper", file: "paper-texture.png" },
    ],
  },
  {
    n: 3, name: "Slide 3", layers: [
      { id: "s3-year", kind: "label", name: "Year", src: "Set", x: 70, y: 3, w: 26, h: 5.4, fact: "After year" },
      { id: "s3-line", kind: "line", name: "Line", src: "AI", x: 6, y: 82.5, w: 88, h: 12 },
      { id: "s3-photo", kind: "frame", name: "Photo", src: "Set", x: 20.1, y: 13.1, w: 59.7, h: 66.9, tint: "aft", set: "After" },
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
export const PROMPT11 =
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

/* ── Round two: styles ────────────────────────────────────────────────────────────── */

function css11(phone) {
  const S = ".screen-studio";
  return `
/* ── D11 ── */
/* Slide sizes: 4:5 or 9:16 (Garreth, 2026-09-15). A 9:16 slide is narrower so it still fits the canvas's height. */
${S} .sz-45 .slide, ${S} .sz-45 .rslide { aspect-ratio: 4 / 5; }
${S} .sz-916 .slide, ${S} .sz-916 .rslide { aspect-ratio: 9 / 16; }
/* The library's tiles take the type's size too. The phone's sheet sits outside the canvas, so this asks the whole screen. */
${S}:has(.sz-916) .limg { aspect-ratio: 9 / 16; }
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
${S} .strip .zsep, ${S} .strip .zgrp { display: none; }
/* Rows in the phone's sheets are pressed with a finger, so they are at least 44 px tall. */
${S} .lyrow, ${S} .setrow { padding-block: 12px; }
${S} .szopt { padding: 12px; }
${S} .sech .lybtn { width: 40px; height: 40px; border-radius: 12px; }` : `
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
${S} .fx-serum { background-image: url(./d6-slide-serum.jpg); background-size: cover; background-position: center; }
${S} .fx-vanity { background-image: url(./d6-slide-vanity.jpg); background-size: cover; background-position: center; }
/* The cut-out: a photo with its background removed, bottom-anchored the way the renderer normalises its covers. */
${S} .ly--cut .lyph.cutimg { background-image: url(./d6-cut.png); background-size: contain; background-position: 50% 100%; }
/* A shaped frame: the photo cover-cropped and clipped to the wave, the border drawn on the same wave above it. */
${S} .ly--frame .lyph { background-size: cover; background-position: 50% 30%; background-color: #2a2521; -webkit-mask-image: ${WAVE_MASK}; mask-image: ${WAVE_MASK}; -webkit-mask-size: 100% 100%; mask-size: 100% 100%; }
${S} .ph-bef { background-image: url(./d6-photo-before.jpg); }
${S} .ph-aft { background-image: url(./d6-photo-after.jpg); }
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
/* A layer whose set has no images yet: D6's empty cell, on the layer. */
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
${S}:has(.d11-lay) #sec-library { display: none; }
${S} .sets { display: flex; flex-direction: column; gap: 2px; padding: 8px 8px 4px; }
${S} .setrow { display: flex; align-items: center; gap: 12px; width: 100%; border-radius: 12px; padding: 8px; transition: background-color 150ms var(--ease); }
${S} .setrow:hover { background: color-mix(in srgb, var(--text-primary) 6%, transparent); }
${S} .setrow.is-on { background: color-mix(in srgb, var(--text-primary) 5%, transparent); }
${S} .trio { display: flex; gap: 3px; flex-shrink: 0; }
${S} .trio i { display: block; width: 22px; height: 28px; border-radius: 5px; background-repeat: no-repeat; background-position: 50% 30%; background-size: cover; background-color: var(--card-raised); }
${S} .trio .t-cut { background-image: url(./d6-cut.png); background-color: #d9d0bf; background-size: 90% auto; background-position: 50% 100%; }
${S} .trio .t-bef.p1 { background-image: url(./d6-photo-before.jpg); }
${S} .trio .t-aft.p1 { background-image: url(./d6-photo-after.jpg); }
${S} .trio .t-bef.p2 { background-image: url(./d6-photo-before2.jpg); }
${S} .trio .t-aft.p2 { background-image: url(./d6-photo-after2.jpg); }
${S} .trio .is-none { background-image: none; background-color: var(--card-sunken); border: 1px dashed var(--border); }
${S} .d11tile { background-image: url(./d6-cut.png); background-color: #d9d0bf; background-size: 80% auto; background-position: 50% 100%; background-repeat: no-repeat; }

/* The AI proposing what the library lacks (new, for review): what it needs, as a short list, and one button. */
${S} .gprop { display: flex; flex-direction: column; gap: 6px; width: 100%; border-radius: 12px; border: 1px solid var(--border); background: var(--card-sunken); padding: 8px 10px; }
${S} .gprow { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; line-height: 18px; }
${S} .gprow b { font-weight: 500; }
${S} .gprow .pill { font-size: 11px; padding: 0 8px; }
${S} .fcap .pill { font-size: 11px; padding: 0 8px; }
`;
}

/* ── Round two: markup ────────────────────────────────────────────────────────────── */

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
const stepperStatic = (val, label, unit = "", cls = "") =>
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
                    ${row("Height", stepperStatic(1020, "height", "px"))}
                    ${row(`Position`, `<span class="ilabel"><span class="opt">X</span></span>${stepperStatic(0, "left", "px", "sm")}<span class="ilabel"><span class="opt">Y</span></span>${stepperStatic(330, "top", "px", "sm")}`, "last")}
                  </div>
                </sc-if>
                <sc-if value="{{d11selFrame}}" hint-placeholder-val="{{ false }}">
                  <div class="sec" aria-label="Settings for the selected frame">
                    <div class="sech"><b>{{d11selTitle}}</b><span class="pill">Shaped frame</span></div>
                    ${row("Draws from", dd("{{d11drawsFrom}}"))}
                    ${row("Shape", seg("Shape", [[D11I.square, false, "Rectangle"], [D11I.circle, false, "Oval"], [D11I.wave, true, "Wave"]], "icons"))}
                    ${row("Border", `${swatches("Border colour", true)}${stepperStatic(12, "border width", "px", "sm")}`)}
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

/* The box behind a text layer. Who writes it and which fact of the set it takes were rows of their own until D14
   (2026-09-22) gave every text box a Name and a Written by of its own, above Font; a layered layer now reads off
   that one section, with Set as its fourth source, so there is one place in the inspector that says where the
   words come from. */
const textRows = () => `
                <sc-if value="{{d11tx}}" hint-placeholder-val="{{ false }}">
                  <div class="irow">
                    <span class="ilabel">Box</span>
                    <div class="ictl">
                      <sc-if value="{{d11boxOn}}" hint-placeholder-val="{{ false }}">${swatches("Box colour", false)}</sc-if>
                      <div class="seg" role="radiogroup" aria-label="Box"><button type="button" role="radio" aria-checked="{{d11boxOffC}}" onClick="{{d11boxOff}}">Off</button><button type="button" role="radio" aria-checked="{{d11boxOnC}}" onClick="{{d11boxOnFn}}">On</button></div>
                    </div>
                  </div>
                  <sc-if value="{{d11boxOn}}" hint-placeholder-val="{{ false }}">
                    <div class="irow sub"><span class="ilabel"><span class="opt">Padding</span></span><div class="ictl">${stepperStatic(28, "box padding", "px", "sm")}<span class="ilabel"><span class="opt">Corners</span></span>${stepperStatic(14, "box corners", "px", "sm")}</div></div>
                  </sc-if>
                </sc-if>`;

/* The library as sets, in place of D6's sets of loose images. */
const setsSection = () => `
              <sc-if value="{{d11lay}}" hint-placeholder-val="{{ false }}">
                <div class="sec" aria-label="Image library">
                  <div class="lhead">
                    <span class="tile d11tile" aria-hidden="true"></span>
                    <span class="libtext"><span class="libname">Red Carpet Sets</span><span class="libmeta tnum">24 sets</span></span>
                  </div>
                  <div class="gpills" role="radiogroup" aria-label="Set">
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
const proposal = `<sc-if value="{{m.sets}}" hint-placeholder-val="{{ false }}"><div class="msg msg--ai"><span class="aiv" aria-hidden="true">${D11I.ai}</span><span class="bub is-offer"><span>{{m.text}}</span><span class="gprop"><sc-for list="{{m.items}}" as="gi" hint-placeholder-count="4"><span class="gprow"><b>{{gi.name}}</b><span class="pill {{gi.cls}}">{{gi.kind}}</span></span></sc-for></span><span class="offer"><button type="button" class="btn2" onClick="{{m.create}}">{{m.button}}</button></span></span></div></sc-if>`;

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
  /* Pan and zoom: the view moves the slides layer and the dotted ground together. The phone keeps its sideways
     scroll, so its slides are never moved this way. */
  if (!phone) {
    out = swap(out, `class="pan {{panCls}}" id="d6-pan"`, `class="pan {{panCls}}" id="d6-pan" style="background-position: {{d11bgPos}}; background-size: {{d11bgSize}}"`);
    out = swap(out, `<div class="slides">`, `<div class="slides" style="transform: translate({{d11vx}}px, {{d11vy}}px) scale({{d11vz}})">`);
  }
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
  /* After D14's copy-contract rows, not before them: the box is a style, and the name and source above it are the
     contract. The anchor is the last row of that group. */
  out = swap(
    out,
    `<span class="ictl rback tnum">{{bx.fits}}</span>
                </div>`,
    `<span class="ictl rback tnum">{{bx.fits}}</span>
                </div>${textRows()}`,
    { optional },
  );
  out = swap(out, `Upload images</button></span></span></div></sc-if>`, `Upload images</button></span></span></div></sc-if>${proposal}`, { optional, all: true });
  return out;
}

/* ── Round two: behaviour ─────────────────────────────────────────────────────────── */

/* After D6's own update step: a request to bring a slide into view becomes a move of the view rather than a scroll,
   and the canvas takes a wheel listener that can stop the page zooming (a pinch arrives as Ctrl with the wheel). */
const didUpdate11 = `
    var pan11 = document.getElementById("d6-pan");
    if (st.d6panTo && pan11 && !this.d11phone) {
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
    self.d11phone = PHONE;
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
    var slide = Math.max(1, Math.min(LAY ? SLIDES11.length : (s.d6deck ? s.d6deck.length : 6), s.d6slide || 1));
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
      /* Round three's slide controls on a layered deck (Garreth, 2026-09-17): the dots, the menu, the plus in the gap
         and the slot. The sample deck is fixed, so the actions are notes. */
      var menu11 = s.d6menu || 0;
      var note11 = function (t) { return function () { self.setState({ d6menu: 0 }); self.note(t); }; };
      slidesAll = analysing ? [] : SLIDES11.map(function (sd) {
        return {
          n: sd.n, name: sd.name, label: sd.name + (sd.n === slide ? ", selected" : ""),
          sk: !ready, real: ready, cls: sd.n === slide ? "is-on" : "",
          rBusy: false, rDone: false, rFail: false, retry: function () {},
          drop: function (e) { e.preventDefault(); },
          pick: (function (k) { return function () { if (ready) self.setState({ d6slide: k, d11sel: null }); }; })(sd.n),
          cells: [], boxes: [], fixed: !!sd.fixed, layered: ready, layers: ready ? faceOf(sd, true, false) : [],
          canMenu: ready,
          menuOpen: ready && menu11 === sd.n,
          menuCls: (menu11 === sd.n ? "is-on " : "") + (sd.n === slide ? "is-vis" : ""),
          menuLabel: sd.name + " options",
          menuExpanded: menu11 === sd.n ? "true" : "false",
          menuToggle: (function (k) { return function (e) { if (e && e.stopPropagation) e.stopPropagation(); self.setState({ d6menu: menu11 === k ? 0 : k, d6vers: false }); }; })(sd.n),
          duplicate: note11("Duplicates slide " + sd.n + ", layers and copy"),
          moveLeft: note11("Moves slide " + sd.n + " left"),
          moveRight: note11("Moves slide " + sd.n + " right"),
          remove: note11("Removes slide " + sd.n + "; Ctrl or Cmd+Z brings it back"),
          leftOff: sd.n === 1, rightOff: sd.n === SLIDES11.length, delOff: SLIDES11.length <= 2,
          gap: ready && sd.n < SLIDES11.length, gapCls: "",
          gapLabel: "Add a slide between " + sd.n + " and " + (sd.n + 1),
          addAfter: note11("Adds a slide after slide " + sd.n + " with its layers, then writes it")
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
        /* The phone scrolls to the slide instead of moving the view. */
        if (PHONE) { pan.scrollLeft += Math.round(fr.getBoundingClientRect().left - pan.getBoundingClientRect().left) - 16; return; }
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
      if (e.target && e.target.closest && e.target.closest(".slide, .fcap, .smenu, .gapadd")) return;
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
    /* D14 (2026-09-22): a layered text layer reads off the same copy-contract rows as a flat text box — the name it
       carries, where its words come from and how many characters it holds. A template drawing from sets has a
       fourth source, Set, and picking it asks which fact of the set fills the layer. */
    var lyName = function (l) { return (s.d14names && s.d14names[l.id]) || l.name.toLowerCase().split(" ").join("-"); };
    var SOURCES11 = [["ai", "AI"], ["set", "Set"], ["fixed", "Fixed"], ["batch", "Per batch"]];
    var styleFor = function (l) {
      if (!l) return {};
      var big = l.kind === "box";
      var align = l.kind === "label" ? "right" : "centre";
      var wrap = l.kind === "label" ? 300 : big ? 944 : 940;
      var size = big ? 48 : 42;
      var nm = lyName(l);
      var by = bySet ? "set" : (s.d11by && s.d11by[l.id]) || "ai";
      var sibs = SLIDES11.filter(function (sd) { return sd.n === l.slide; })
        .reduce(function (acc, sd) { return acc.concat(sd.layers); }, [])
        .filter(function (o) { return o.id !== l.id && (o.kind === "box" || o.kind === "line" || o.kind === "label"); })
        .map(lyName);
      var typed = s.d14typed === undefined || s.d14typed === null ? nm : s.d14typed;
      var tk = !!typed && sibs.indexOf(typed) >= 0;
      return {
        title: "Slide " + l.slide + " · " + nm,
        name: typed, taken: tk, nameCls: tk ? "is-taken" : "",
        rename: function (e) { self.setState({ d14typed: ((e && e.target ? e.target.value : "") || "").trim() }); },
        sources: SOURCES11.map(function (p) {
          return { key: p[0], name: p[1], checked: by === p[0] ? "true" : "false", pick: function () { self.setState({ d14typed: null }); setBy(p[0])(); } };
        }),
        srcMore: by === "set" || by === "fixed",
        srcLabel: by === "set" ? "Fact" : "The words",
        srcText: by === "fixed",
        srcPick: by === "set",
        fact: l.fact || "Name",
        pickFact: function () { self.note("Lists the set's facts: Name, Year, Before weight, After weight"); },
        fixed: "",
        fits: Math.max(1, Math.round(wrap / (size * 0.5))) * (l.kind === "label" ? 1 : 2) + " characters",
        font: "General Sans", weight: "Bold", size: size, stroke: big ? 0 : 4,
        strokeBlack: "true", strokeWhite: "false",
        shOff: "true", shHard: "false", shSoft: "false", shOn: false, shSoftOn: false,
        alLeft: "false", alCentre: align === "centre" ? "true" : "false", alRight: align === "right" ? "true" : "false",
        wrap: wrap
      };
    };

    /* The conversation, for the moments D11 adds. */
    var msgs = null;
    var ME_FIG = { me: true, text: s.d11prompt || PROMPT11 };
    if (LAY && FIG && analysing) msgs = [ME_FIG, { busy: true, text: "Reading five frames and their layers" }];
    if (LAY && FIG && ready) {
      msgs = [ME_FIG, { ai: true, text: "Five slides from the file's five frames, at 4:5 like the file. Slides 4 and 5 are single images, so they are fixed: the same on every deck." }];
      if (s.d11cutEmpty) msgs.push({
        sets: true,
        text: "Slides 1 to 3 follow one person, so they draw from one set in Red Carpet Sets — a set per person. Each has Before and After photos, but no cut-out for the cover, and the labels need two facts.",
        items: [
          { name: "Cover cut-out", kind: "Set", cls: "" },
          { name: "Name", kind: "Fact", cls: "" },
          { name: "Before year", kind: "Fact", cls: "" },
          { name: "After year", kind: "Fact", cls: "" }
        ],
        button: "Add to Red Carpet Sets",
        create: function () { self.note("Adds the set and the facts to Red Carpet Sets; each person's set fills them in from D8"); }
      });
    }
    if (s.d11moment === "sizeChange") msgs = [
      { me: true, text: "Make it 9:16" },
      { ai: true, text: "Now 9:16. Each text box kept its margins and the image cells grew to the new height. Save version makes this version 5; version 4 stays 4:5." }
    ];
    if (msgs) msgs = msgs.map(function (m) { return Object.assign({ me: false, ai: false, busy: false, err: false, offer: false, sets: false, items: [], button: "", create: function () {} }, m); });
    else msgs = D6V.msgs.map(function (m) { return Object.assign({ sets: false, items: [], button: "", create: function () {} }, m); });

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
      d11drawsFrom: selL && selL.set ? "Set · " + selL.set : "",
      d11file: selL && selL.file ? selL.file : "",
      d11fileCls: selL && selL.img ? "fx-" + selL.img : "",
      d11replace: function () { self.note("Uploads a new image for every deck of this type; it saves with the next version"); },
      selBox: LAY ? isText : D6V.selBox,
      selCell: LAY ? false : D6V.selCell,
      bx: LAY && isText ? Object.assign({}, D6V.bx, styleFor(selL)) : D6V.bx,
      d11tx: LAY && isText,
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
      d11upload: function () { self.note("Uploads images into Red Carpet Sets, into the right person's set · D8"); },
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
    /* A layered deck is a fixed sample here: adding after its last slide is a note. */
    if (LAY) {
      over.addLabel = "Add a slide after slide " + SLIDES11.length;
      over.addEnd = function () { self.note("Adds a slide after slide " + SLIDES11.length + " with its layers, then writes it"); };
    }
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
 * The Studio as a screen, round two included. `init.d6` is the first round's moment; `init.d11` is what round two adds.
 */
export function studioScreen({ init = {} } = {}) {
  const base = studioBaseScreen({ init: init.d6 || {} });
  const d = { lay: false, size: "45", sel: null, chip: "", prompt: "", cutEmpty: false, moment: "", flat: "", name: "", char: "", ver: "", names: null, typed: null, ...(init.d11 || {}) };
  return {
    ...base,
    css: (phone) => base.css(phone) + css11(phone),
    markup: (phone) => patchMarkup(base.markup(phone), phone),
    colOverlay: (phone) => (base.colOverlay ? patchPanels(base.colOverlay(phone), true) : ""),
    state: {
      ...base.state,
      d11lay: d.lay, d11size: d.size, d11sel: d.sel, d11chip: d.chip, d11prompt: d.prompt, d11cutEmpty: d.cutEmpty, d11moment: d.moment,
      d11flat: d.flat, d11name: d.name, d11char: d.char, d11ver: d.ver, d11order: null, d11box: true, d11by: null, d11set: 0, d11view: null, d11tick: 0,
      /* D14: a layer renamed in the inspector, and what is half-typed in the Name field. */
      d14names: d.names, d14typed: d.typed,
    },
    vals: vals11(base.vals),
    didUpdate: (base.didUpdate || "") + didUpdate11,
  };
}

/* ── Review artboards ──────────────────────────────────────────────────── */

const READY = { stage: "ready", lib: "window", slide: 1, sel: { kind: "box", i: 0 } };
const MOMENTS = {
  start: { stage: "start", lib: null },
  library: { stage: "library", lib: null, entry: "discuss" },
  reference: { stage: "reference", lib: "window", entry: "reference" },
  empty: { stage: "empty", lib: "window", cinFocus: true },
  drafting: { stage: "drafting", lib: "window", chatOpen: true },
  draftFailed: { stage: "draftFailed", lib: "window", chatOpen: true },
  main: { ...READY },
  conversation: { ...READY, chatOpen: true },
  collapsed: { ...READY, left: false, chatOpen: false, unread: true },
  leftFolded: { ...READY, left: false, chatOpen: true },
  askImage: { ...READY, slide: 3, chatOpen: true, ask: true },
  rename: { ...READY, rename: true, renameVal: "Morning Routine" },
  cell: { ...READY, slide: 2, sel: { kind: "cell", i: 1 } },
  noImages: { ...READY, lib: "kitchen", slide: 2, sel: { kind: "cell", i: 1 } },
  newLibrary: { ...READY, lib: "new", libName: "Morning Light" },
  renderedSlide: { ...READY, rendered: { 1: "done" } },
  renderFailed: { ...READY, rendered: { 1: "failed" } },
  save: { ...READY, save: true },
  discard: { ...READY, hold: 0.58 },
  edit: { ...READY, mode: "edit", vers: true, copy: "before" },
  phoneTools: { ...READY, sheet: true },
  phoneChat: { ...READY, chatOpen: true },
  referenceAnalysing: { stage: "analysing", entry: "reference", lib: "window", ref: REFS[0].title, refNew: true, chatOpen: true, left: false },
  referenceDraft: { ...READY, entry: "reference", ref: REFS[0].title, left: false },
  resample: { ...READY, sampling: true },
  rendering: { ...READY, rendered: { 1: "busy" } },
  /* Round three (Garreth, 2026-09-17): slides added, duplicated, deleted and moved. */
  addSlot: { ...READY, slide: 6 },
  insertBetween: { ...READY, slide: 2, gapShow: 2 },
  slideMenu: { ...READY, slide: 3, menu: 3 },
  slideWriting: { ...READY, slide: 4, chatOpen: true, deck: [0, 1, 2, [2, true], 3, 4, 5].map((d) => (Array.isArray(d) ? { src: d[0], alt: d[1] } : { src: d, alt: false })), writing: 4 },
  slideAdded: { ...READY, slide: 4, chatOpen: true, deck: [0, 1, 2, [2, true], 3, 4, 5].map((d) => (Array.isArray(d) ? { src: d[0], alt: d[1] } : { src: d, alt: false })), added: 4, addedHow: "new" },
  deleteFloor: { ...READY, slide: 2, menu: 2, deck: [{ src: 0, alt: false }, { src: 5, alt: false }] },
  phoneAddSlide: { ...READY, slide: 6, menu: 6, panAt: 2030 },
  /* D14 (Garreth, 2026-09-21): a text box carries a name, and that name is its role in the copy contract. The
     cover holds three of them, so the three roles can be read off one slide. */
  nameHook: { ...READY, cover3: 3, slide: 1, sel: { kind: "box", i: 1 } },
  nameFixed: { ...READY, cover3: 3, slide: 1, sel: { kind: "box", i: 0 } },
  nameAdded: { ...READY, cover3: 4, slide: 1, sel: { kind: "box", i: 3 } },
  nameTaken: { ...READY, cover3: 3, slide: 1, sel: { kind: "box", i: 2 }, nameVal: "hook" },
  phoneName: { ...READY, cover3: 3, slide: 1, sel: { kind: "box", i: 2 }, sheet: true },
};
/* Round two's phone boards (D11 has none): a draft started from a Figma link, drawn as a layered template. */
const FIGMA_READY = { stage: "ready", entry: "figma", lib: "window", slide: 1, title: "Red Carpet Rewind" };
const ROUND_TWO = {
  phoneFigma: { d6: { ...FIGMA_READY, chatOpen: true }, d11: { lay: true, cutEmpty: true, chip: "ok" } },
  phoneLayers: { d6: { ...FIGMA_READY, sheet: true }, d11: { lay: true, sel: "s1-cut" } },
};

function build(OUT) {
  fs.mkdirSync(OUT, { recursive: true });
  copyStudioImages(OUT);
  const ROW = 1040;
  const BOARDS = [
    { name: "Start", phone: false, m: "start", title: "D6 · Just opened: a reference deck, your idea, or a Figma link · Desktop", x: 0, y: 0 },
    { name: "Library", phone: false, m: "library", title: "D6 · The image library · Desktop", x: 1540, y: 0 },
    { name: "Reference", phone: false, m: "reference", title: "D6 · Saved reference decks · Desktop", x: 0, y: ROW },
    { name: "Empty", phone: false, m: "empty", title: "D6 · Discuss your idea: the chat box · Desktop", x: 1540, y: ROW },
    { name: "Drafting", phone: false, m: "drafting", title: "D6 · The first draft arriving · Desktop", x: 0, y: ROW * 2 },
    { name: "DraftFailed", phone: false, m: "draftFailed", title: "D6 · The draft call failed · Desktop", x: 1540, y: ROW * 2 },
    { name: "Main", phone: false, m: "main", title: "D6 · The slides on the canvas, the hook selected · Desktop", x: 0, y: ROW * 3 },
    { name: "Conversation", phone: false, m: "conversation", title: "D6 · Both panels open · Desktop", x: 1540, y: ROW * 3 },
    { name: "Collapsed", phone: false, m: "collapsed", title: "D6 · Both panels folded · Desktop", x: 0, y: ROW * 4 },
    { name: "LeftFolded", phone: false, m: "leftFolded", title: "D6 · The adjustments folded, the conversation open · Desktop", x: 1540, y: ROW * 4 },
    { name: "Rename", phone: false, m: "rename", title: "D6 · Renaming the type from its title · Desktop", x: 3080, y: ROW * 4 },
    { name: "AskImage", phone: false, m: "askImage", title: "D6 · Asking the AI for an image the library lacks · Desktop", x: 0, y: ROW * 9 },
    { name: "Resample", phone: false, m: "resample", title: "D6 · Regenerate sample, the new copy arriving · Desktop", x: 1540, y: ROW * 9 },
    { name: "ReferenceAnalysing", phone: false, m: "referenceAnalysing", title: "D6 · From a reference deck: analysing its slides · Desktop", x: 0, y: ROW * 10 },
    { name: "ReferenceDraft", phone: false, m: "referenceDraft", title: "D6 · From a reference deck: the draft beside the reference · Desktop", x: 1540, y: ROW * 10 },
    { name: "Rendering", phone: false, m: "rendering", title: "D6 · A slide while it renders · Desktop", x: 0, y: ROW * 11 },
    { name: "ImageCell", phone: false, m: "cell", title: "D6 · An image cell selected · Desktop", x: 0, y: ROW * 5 },
    { name: "NoImages", phone: false, m: "noImages", title: "D6 · A set with no images · Desktop", x: 1540, y: ROW * 5 },
    { name: "NewLibrary", phone: false, m: "newLibrary", title: "D6 · A new library: upload or generate · Desktop", x: 0, y: ROW * 6 },
    { name: "Rendered", phone: false, m: "renderedSlide", title: "D6 · Slide 1 rendered by the painter · Desktop", x: 1540, y: ROW * 6 },
    { name: "RenderFailed", phone: false, m: "renderFailed", title: "D6 · The render failed · Desktop", x: 0, y: ROW * 7 },
    { name: "Save", phone: false, m: "save", title: "D6 · Save as carousel type, short name taken · Desktop", x: 1540, y: ROW * 7 },
    { name: "Discard", phone: false, m: "discard", title: "D6 · Discard draft, being held · Desktop", x: 0, y: ROW * 8 },
    { name: "Edit", phone: false, m: "edit", title: "D6 · Editing an existing type, versions open · Desktop", x: 1540, y: ROW * 8 },
    { name: "Phone", phone: true, m: "main", title: "D6 · Simplified view · Phone", x: 3080, y: ROW * 3 },
    { name: "PhoneTools", phone: true, m: "phoneTools", title: "D6 · The adjustments sheet open, slide size first · Phone", x: 3550, y: ROW * 3 },
    { name: "PhoneChat", phone: true, m: "phoneChat", title: "D6 · The conversation open · Phone", x: 4020, y: ROW * 3 },
    { name: "PhoneFigma", phone: true, m: "phoneFigma", title: "D6 · From a Figma link: the conversation sheet, the file's chip above the chat box · Phone", x: 3080, y: ROW * 5 },
    { name: "PhoneLayers", phone: true, m: "phoneLayers", title: "D6 · A layered template: the Layers list in the adjustments sheet · Phone", x: 3550, y: ROW * 5 },
    { name: "AddSlot", phone: false, m: "addSlot", title: "D6 · Add a slide: the dashed slot after the last slide · Desktop", x: 0, y: ROW * 12 },
    { name: "InsertBetween", phone: false, m: "insertBetween", title: "D6 · Add a slide between two: the plus in the gap · Desktop", x: 1540, y: ROW * 12 },
    { name: "SlideMenu", phone: false, m: "slideMenu", title: "D6 · A slide's menu: Duplicate, Move left, Move right, Delete · Desktop", x: 0, y: ROW * 13 },
    { name: "SlideWriting", phone: false, m: "slideWriting", title: "D6 · A slide added after slide 3, its line being written · Desktop", x: 1540, y: ROW * 13 },
    { name: "SlideAdded", phone: false, m: "slideAdded", title: "D6 · The new slide written, the AI says what it did · Desktop", x: 0, y: ROW * 14 },
    { name: "DeleteFloor", phone: false, m: "deleteFloor", title: "D6 · Two slides left: Delete unavailable · Desktop", x: 1540, y: ROW * 14 },
    { name: "PhoneAddSlide", phone: true, m: "phoneAddSlide", title: "D6 · The Add slide slot at the end of the row, a slide's menu open · Phone", x: 3080, y: ROW * 12 },
    /* D14 (Garreth, 2026-09-21): naming a text box. The cover carries three named boxes on every board of the row,
       so the three roles and the three sources can be compared; the fourth board adds one by hand. */
    { name: "BoxName", phone: false, m: "nameHook", title: "D6 · A text box's name, and where its words come from · Desktop", x: 0, y: ROW * 15 },
    { name: "BoxFixed", phone: false, m: "nameFixed", title: "D6 · A fixed box: the same words on every deck · Desktop", x: 1540, y: ROW * 15 },
    { name: "BoxAdded", phone: false, m: "nameAdded", title: "D6 · A box added by hand: it arrives named Text Box 1 · Desktop", x: 0, y: ROW * 16 },
    { name: "BoxTaken", phone: false, m: "nameTaken", title: "D6 · A name already on the slide, refused · Desktop", x: 1540, y: ROW * 16 },
    { name: "PhoneBoxName", phone: true, m: "phoneName", title: "D6 · The name in the adjustments sheet, written per batch · Phone", x: 3080, y: ROW * 15 },
  ];
  const artboards = [];
  for (const light of [false, true]) {
    for (const b of BOARDS) {
      const file = `${b.name}${light ? "Light" : ""}.dc.html`;
      const screen = studioScreen({ init: ROUND_TWO[b.m] || { d6: MOMENTS[b.m] } });
      fs.writeFileSync(path.join(OUT, file), artboard({ phone: b.phone, light, screens: [screen], navMode: "note" }));
      artboards.push({ file, title: light ? `${b.title} · Light` : b.title, page: light ? "light" : "dark", x: b.x, y: b.y, w: b.phone ? 390 : 1440, h: b.phone ? 844 : 900 });
    }
  }
  const note =
    "Pictures, one screen per state; the controls that do work are a bonus. From the two cards you can walk the whole path: a card, a library (or New library), a saved deck or the chat box, then the draft. On the canvas boards, try dragging the dotted ground to pan, the title (press it to rename), a text box or an image cell on any slide, the adjustments on the left (the canvas follows), a library image (click it into the selected cell, or drag it onto a cell), the fold buttons on both panels and the rails they leave, Render preview, Regenerate sample, Save as carousel type, and Discard draft (press and hold).\n\nThe phone boards: the slides pan sideways, the adjustments open as a sheet from the bottom, the conversation floats behind the round button.\n\nRound two (D11, approved and brought in on 2026-09-15): slides are 4:5 or 9:16, and so are the reference's slides, the saved decks' covers and the library's tiles; Slide size comes first in the adjustments; a third card, Start from a Figma link; the chat box grows with the prompt (Shift+Enter starts a new line); the canvas pans in every direction and zooms (Ctrl or Cmd with the wheel, a pinch, or the buttons at the end of the tool strip; the zoom level fits every slide). Layered templates and the Figma link's desktop screens are on D11's canvas, Carousel Generator Designs - (D6 pt. 2 Studio).\n\nNew for review, the phone in round two: the Figma file's chip above the chat box in the conversation sheet, and the Layers list in the adjustments sheet. The phone keeps its sideways scroll, with no zoom.\n\nRound three, for review (2026-09-17): slides can be added, duplicated, deleted and moved. Press the dashed slot after the last slide, or the plus that appears between two slides on hover; the dots on a slide's caption open Duplicate, Move left, Move right and Delete. A new slide takes the layout of the slide before it and the AI writes its line; a duplicate keeps the text. Delete is unavailable at two slides. On the phone the dots always show and the slot ends the row.\n\nNew in D14, for review (Garreth, 2026-09-21), the last two rows: a text box carries a name, and that name is its role in the copy contract — what the writer reads to know what goes in it.\n· A text box's settings open on three rows above Font: Name, Written by, and Fits n characters. Nothing else in the inspector moved.\n· Name comes pre-filled from the AI's draft, and can be typed in on any board. A name already on the same slide is refused with Taken, the word the Save dialog's short name uses, and is not saved.\n· Written by is AI, Fixed or Per batch. Fixed opens a box for the words themselves, painted on every deck of the type — Glow Up's closing line and its QUIZ line are exactly this. Per batch means the Generate form asks for it, the way it already asks for the opening line.\n· Fits n characters is worked out from the box's wrap width and size, not typed. Press the Wrap width or the Size stepper and watch it change: a new box has no painted history to take a limit from, so measuring it is the only honest source. It is shown, never edited.\n· The cover on these boards carries three text boxes — series, hook and swipe — so three roles sit on one slide. Every box on the slide being worked on now shows its name above it, the selected one in the accent and the rest in a dark chip. Before D14 a box's role came from its position, so three boxes on one slide all came out the same.\n· A box added from the tool strip never arrives unnamed (Garreth, 2026-09-22): it takes the default name Text Box 1, counting up in the order boxes are added to that slide. So the copy contract is never left with a hole, and nothing has to hold Generate.\n· There is no per-box description. What a box is for is said in the type's Writing, so there is one place to read rather than two, with the box names listed beside that editor (D13).";
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
          { id: "d6-try", page: "dark", x: 3080, y: 0, w: 390, text: note },
          { id: "d6-try-light", page: "light", x: 3080, y: 0, w: 390, text: note },
        ],
        launch: { view: "canvas", page: "dark" },
      },
      null,
      2,
    ),
  );
  console.log(`Wrote D6 artboards to ${OUT}`);
}

if (isMain(import.meta.url)) build(path.resolve(process.argv[2] ?? path.join(HERE, "out")));
