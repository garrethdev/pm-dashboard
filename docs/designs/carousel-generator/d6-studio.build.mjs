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
 *   ImageCell      desktop, slide 2, an image cell selected: which group it draws from
 *   NoImages       desktop, the library has no images in a group a cell draws from
 *   NewLibrary     desktop, a new library: Upload images and Generate with AI in the panel
 *   Rendered       desktop, slide 1 rendered by the real painter
 *   RenderFailed   desktop, the render failed: the error in the slide's caption, Retry
 *   Save           desktop, the Save as carousel type dialog, the short name taken
 *   Discard        desktop, Discard draft being held
 *   Edit           desktop, editing Before & After: Save version, the versions list open
 *   Phone          phone, the simplified view
 *   PhoneTools     phone, the adjustments sheet open
 * Imported, `studioScreen()` is the screen the prototype opens.
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
}

/* D2's invented libraries and groups, so the picker reads the same on every screen. */
const GROUPS = ["Cover", "Before", "After", "Portrait"];
const LIBS = [
  { id: "window", name: "Soft Window Light", hue: "#c8a27a", g: [18, 41, 44, 23] },
  { id: "mirror", name: "Bathroom Mirror Mornings, Natural Light Series", hue: "#7aa0c8", g: [96, 402, 511, 275] },
  { id: "outdoor", name: "Outdoor Walks", hue: "#7ac8a0", g: [30, 90, 92, 0] },
  { id: "kitchen", name: "Kitchen Counter Shots", hue: "#b8b07a", g: [12, 46, 0, 0] },
];
/* Which of the seven photos each group shows in the panel. */
const GROUP_PHOTOS = { Cover: ["mug", "dock", "journal"], Before: ["journal", "shower", "oats"], After: ["vanity", "yoga", "mug"], Portrait: ["yoga", "shower", "dock"] };

/* Six slide layouts: cells as percentages of the 1080×1440 slide, each drawing from a group; the text box's anchor. */
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
};

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
${S} .ref .rimg { width: 100%; aspect-ratio: 3 / 4; border-radius: 10px; background-size: cover; background-position: center; background-color: var(--card-raised); }
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
/* The stroke's colour: two swatches. */
${S} .sw { display: flex; width: 20px; height: 20px; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 999px; border: 1px solid var(--border); }
${S} .sw i { display: block; width: 12px; height: 12px; border-radius: 999px; }
${S} .sw[aria-checked="true"] { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
/* Which group an image cell draws from: the picker's rows, one ticked. */
${S} .groups { display: flex; flex-direction: column; gap: 2px; padding: 0 8px 10px; }
${S} .grow { display: flex; align-items: center; gap: 10px; width: 100%; border-radius: 12px; padding: 8px 10px; font-size: 13px; line-height: 20px; font-weight: 500; transition: background-color 150ms var(--ease); }
${S} .grow:hover { background: color-mix(in srgb, var(--text-primary) 6%, transparent); }
${S} .grow .gc { margin-left: auto; font-size: 12px; font-weight: 400; color: var(--text-muted); }
${S} .grow .gc.is-none { font-weight: 500; color: var(--danger); }
${S} .grow .optcheck { margin-left: 4px; }
/* The library section: its images by group, each draggable onto a cell; a new library offers Upload images and
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
${S} .limg { position: relative; display: block; aspect-ratio: 3 / 4; border-radius: 8px; overflow: hidden; background-size: cover; background-position: center; background-color: var(--card-raised); cursor: grab; transition: transform 160ms var(--ease-out-strong); }
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

/* The canvas: infinite and pannable, like Figma (Garreth, 2026-09-15). Every slide sits in a row at true 3:4 shape
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
${S} .rslide { position: relative; width: ${Math.round(w * 0.62)}px; aspect-ratio: 3 / 4; flex-shrink: 0; overflow: hidden; border-radius: 12px; background: #101012; container-type: inline-size; pointer-events: none; filter: saturate(0.8); opacity: 0.9; }
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
/* The slide. Its ground is the template's canvas colour, so it looks the same in both themes. */
${S} .slide { position: relative; width: ${w}px; aspect-ratio: 3 / 4; flex-shrink: 0; overflow: hidden; border-radius: 16px; background: #101012; container-type: inline-size; box-shadow: var(--sb-shadow); cursor: default; }
${S} .slide.is-on { outline: 2px solid var(--accent); outline-offset: 6px; }
${S} .slide.is-sk { border: 1px solid var(--border); background: var(--card-raised); box-shadow: none; animation: d6-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
.is-light ${S} .slide.is-sk { background: var(--border); }
@keyframes d6-pulse { 50% { opacity: 0.5; } }
${S} .cell { position: absolute; display: flex; align-items: center; justify-content: center; margin: 0; border: 0; padding: 0; background-size: cover; background-position: center; cursor: default; }
${S} .cell.can-pick { cursor: pointer; }
${IMAGES.map((id) => `${S} .img-${id} { background-image: url(./d6-slide-${id}.jpg); }`).join("\n")}
/* A cell whose group has no images: the empty tile, on the slide. */
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
/* Selected: a dashed outline just outside the box, the role as a tag above it, eight handles. */
${S} .tb.is-sel { outline: 1px dashed var(--accent); outline-offset: 6px; }
${S} .tag { position: absolute; left: -6px; bottom: calc(100% + 10px); z-index: 4; border-radius: 6px; padding: 1px 6px; font-size: 10px; line-height: 16px; font-weight: 600; letter-spacing: 0.02em; white-space: nowrap; color: var(--bg); background: var(--accent); -webkit-text-stroke: 0; text-shadow: none; }
.is-light ${S} .tag { color: #ffffff; }
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
                        ? `<sc-if value="{{b.sel}}" hint-placeholder-val="{{ false }}"><span class="tag">{{b.role}}</span><i class="h h-tl"></i><i class="h h-t"></i><i class="h h-tr"></i><i class="h h-l"></i><i class="h h-r"></i><i class="h h-bl"></i><i class="h h-b"></i><i class="h h-br"></i></sc-if>`
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

/* The settings for a text box: font, weight, size, stroke, shadow, alignment, wrap width. */
const boxSettings = () => `
              <div class="sec" aria-label="{{bx.label}}">
                <div class="sech"><b>{{bx.title}}</b><span class="pill">Text box</span></div>
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

/* The settings for an image cell: which group of the library it draws from. */
const cellSettings = () => `
              <div class="sec" aria-label="{{cl.label}}">
                <div class="sech"><b>{{cl.title}}</b><span class="pill">Image cell</span></div>
                <div class="irow" style="padding-bottom: 2px"><span class="ilabel">Draws from</span><span class="ictl libmeta">{{cl.libName}}</span></div>
                <div class="groups" role="radiogroup" aria-label="Library group">
                  <sc-for list="{{cl.groups}}" as="g" hint-placeholder-count="4">
                    <button type="button" class="grow" role="radio" aria-checked="{{g.checked}}" onClick="{{g.pick}}">
                      <span>{{g.name}}</span>
                      <span class="gc tnum {{g.gcCls}}">{{g.count}}</span>
                      <span class="optcheck"><sc-if value="{{g.on}}" hint-placeholder-val="{{ false }}">${I.check}</sc-if></span>
                    </button>
                  </sc-for>
                </div>
              </div>`;

/* The library section: its images by group, or Upload images and Generate with AI for a new one. */
const librarySection = () => `
              <div class="sec" id="sec-library" aria-label="Image library">
                <div class="lhead">
                  <sc-if value="{{lp.hasCover}}" hint-placeholder-val="{{ true }}"><span class="tile lib-{{lp.id}}" style="background-color: {{lp.tint}}" aria-hidden="true"></span></sc-if>
                  <sc-if value="{{lp.isNew}}" hint-placeholder-val="{{ false }}"><span class="tile tile--empty" aria-hidden="true">${I.tileImages}</span></sc-if>
                  <span class="libtext"><span class="libname" title="{{lp.name}}">{{lp.name}}</span><span class="libmeta tnum">{{lp.meta}}</span></span>
                  <sc-if value="{{canChangeLib}}" hint-placeholder-val="{{ true }}"><button type="button" class="tbtn" onClick="{{changeLib}}">Change</button></sc-if>
                </div>
                <sc-if value="{{lp.hasImages}}" hint-placeholder-val="{{ true }}">
                  <div class="gpills" role="radiogroup" aria-label="Group">
                    <sc-for list="{{lp.groups}}" as="g" hint-placeholder-count="5">
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
                      <sc-if value="{{sampling}}" hint-placeholder-val="{{ false }}"><span class="scount busy" role="status" style="padding: 0 10px"><span class="spin on">${I.busy}</span>Rewriting sample</span></sc-if>
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
                        </div>
                        <sc-if value="{{sl.sk}}" hint-placeholder-val="{{ false }}"><div class="slide is-sk" aria-label="Drafting"></div></sc-if>
                        <sc-if value="{{sl.real}}" hint-placeholder-val="{{ true }}"><div class="slide {{sl.cls}}" aria-label="{{sl.label}}" onDragOver="{{dragOver}}" onDrop="{{sl.drop}}" onClick="{{sl.pick}}">${slideFace("sl", !phone)}</div></sc-if>
                      </div>
                    </sc-for>
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
    var groupCount = function (g) { return lib ? lib.g[GROUPS.indexOf(g)] : 0; };
    var copySet = COPY[s.d6copy] || COPY.morning;
    var NAME = edit ? (P.name || "Before & After") : "Morning Routine";
    /* The title is the type's name; a new type is "New carousel type" until it is renamed here or in the Save dialog. */
    var TITLE = edit ? NAME : (s.d6title || "New carousel type");
    var SLIDES = LAYOUTS.length;

    /* The slides, from the layouts and the sample copy. Each cell's group can be changed in the adjustments (or a
       library image dropped on it); each text box's style can be changed there too; both are kept as overrides
       keyed by slide and index. */
    var cellGroups = s.d6cellGroups || {};
    var cellImages = s.d6cellImages || {};
    var boxStyles = s.d6boxStyles || {};
    var rendered = s.d6rendered || {};
    var sel = s.d6sel || { kind: "box", i: 0 };
    var slide = Math.max(1, Math.min(SLIDES, s.d6slide || 1));
    var keyOf = function (n, i) { return n + ":" + i; };
    var styleOf = function (n, i) {
      var role = n === 1 ? "hook" : (n === SLIDES && i === 0 ? "hook" : "line");
      return Object.assign({ name: role }, STYLES[role], boxStyles[keyOf(n, i)] || {});
    };
    var select = function (n, kind, i) { self.setState({ d6slide: n, d6sel: { kind: kind, i: i }, d6vers: false, d6sheet: PHONE }); };
    var faceOf = function (n, live) {
      var L = LAYOUTS[n - 1];
      var lines = copySet[n - 1];
      var onThis = n === slide;
      var cells = L.cells.map(function (c, i) {
        var g = cellGroups[keyOf(n, i)] || c.g;
        var count = groupCount(g);
        var img = cellImages[keyOf(n, i)] || PHOTOS[n - 1][i];
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
        var at = i === 1 ? "bottom2" : L.at;
        var selected = onThis && sel.kind === "box" && sel.i === i;
        return {
          text: text,
          sk: !!s.d6sampling,
          txt: !s.d6sampling,
          role: i === 0 ? (n === 1 ? "Hook" : n === SLIDES ? "Closing" : "Line") : "Line",
          w: Math.round((st.wrap / 1080) * 1000) / 10,
          cls: ["tb--" + st.name, "st-" + Math.max(0, Math.min(4, st.stroke)), "sw-" + (st.strokeColour || "black"), "sh-" + st.shadow.toLowerCase(), "al-" + st.align, "at-" + at, selected ? "is-sel" : "", live ? "can-pick" : ""].join(" "),
          sel: selected,
          label: (i === 0 ? "Text box" : "Second text box") + ", " + text,
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
        boxes: [{ text: r.text, sk: false, txt: true, role: "", w: 84, cls: (i === 0 ? "tb--hook" : "tb--line") + " st-3 sw-black sh-hard al-left at-top", sel: false, label: "", pressed: "false", pick: function () {} }]
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
        var L = LAYOUTS[n - 1];
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
        pick: (function (k) { return function () { if (ready && k !== slide) self.setState({ d6slide: k, d6sel: { kind: "box", i: 0 }, d6vers: false }); }; })(n),
        cells: face.cells, boxes: face.boxes
      });
    }

    /* Panning: dragging the empty ground moves the canvas; a slide's parts still take the click. The pictures open
       with the selected slide in view. */
    var panDown = function (e) {
      if (e.button !== 0) return;
      if (e.target && e.target.closest && e.target.closest(".slide")) return;
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
      var x0 = Math.max(0, (slide - 1) * (slideW + SLIDE_GAP) - (PHONE ? 0 : 24));
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
    var boxRole = ready && sel.kind === "box" && cur.boxes[sel.i] ? cur.boxes[sel.i].role : "Hook";
    var bx = {
      label: "Settings for the selected text box",
      title: "Slide " + slide + " · " + boxRole,
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
    var cellGroup = ready && sel.kind === "cell" ? (cellGroups[keyOf(slide, sel.i)] || LAYOUTS[slide - 1].cells[sel.i].g) : "";
    var cl = {
      label: "Settings for the selected image cell",
      title: "Slide " + slide + " · Image " + ((sel.i || 0) + 1),
      libName: lib ? lib.name : "",
      groups: GROUPS.map(function (g) {
        var count = groupCount(g), on = g === cellGroup;
        return {
          name: g, count: count === 0 ? "No images" : images(count), gcCls: count === 0 ? "is-none" : "",
          on: on, checked: on ? "true" : "false",
          pick: function () { var next = Object.assign({}, cellGroups); next[keyOf(slide, sel.i)] = g; self.setState({ d6cellGroups: next }); }
        };
      })
    };

    /* The library section. Its images can be dragged onto a cell of any slide; a click puts one in the selected cell. */
    var isNewLib = !!lib && lib.id === "new";
    var lgroup = s.d6lgroup || "All";
    var libImages = [];
    if (lib && !isNewLib) {
      GROUPS.forEach(function (g) {
        if (lgroup !== "All" && lgroup !== g) return;
        if (groupCount(g) === 0) return;
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
      groups: [{ name: "All", count: lib ? fmt(sum(lib.g)) : "0" }].concat(GROUPS.map(function (g) { return { name: g, count: fmt(groupCount(g)) }; })).map(function (g) {
        var on = g.name === lgroup;
        return { name: g.name, count: g.count, cls: on ? "is-on" : "", checked: on ? "true" : "false", pick: function () { self.setState({ d6lgroup: g.name }); } };
      }),
      images: libImages.slice(0, 9).map(function (im) {
        return {
          id: im.id,
          label: im.g + " image " + (im.i + 1) + ", drag onto a cell",
          drag: function (e) { try { e.dataTransfer.setData("text/plain", im.id); e.dataTransfer.effectAllowed = "copy"; } catch (err) {} self.d6dragId = im.id; },
          pick: function () { placeImage(im.id); }
        };
      }),
      upload: function () { self.note("Uploads images into " + (lib ? lib.name : "the library") + ", by group · D8"); },
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
      else { self.setState({ d6cin: "" }); self.note("Sends the message; the draft changes to match"); }
    };
    /* From a reference: the vision pass first, then the draft. */
    var startAnalyse = function (title) {
      self.setState({ d6stage: "analysing", d6ref: title, d6chatOpen: true, d6unread: false });
      clearTimeout(self.d6draft);
      self.d6draft = setTimeout(function () { startDraft({ d6ref: title }); }, 2400);
    };
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
      sampling: !!s.d6sampling,
      notSampling: !s.d6sampling,

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
 * D6 as a screen. `init` is the moment a review picture shows; the prototype
 * opens it at its start.
 */
export function studioScreen({ init = {} } = {}) {
  const m = {
    mode: "new", stage: "start", entry: "discuss", lib: null, libName: "", slide: 1, sel: { kind: "box", i: 0 }, rendered: null,
    save: false, hold: 0, vers: false, copy: "morning", cin: "", chatOpen: false, unread: false, left: true, title: "", rename: false, renameVal: undefined, sheet: false, ask: false,
    ref: "", refNew: false, sampling: false,
    ...init,
  };
  const fresh = {
    d6mode: m.mode, d6stage: m.stage, d6entry: m.entry, d6lib: m.lib, d6newLibName: m.libName, d6slide: m.slide, d6sel: m.sel, d6rendered: m.rendered, d6ask: m.ask,
    d6ref: m.ref, d6refNew: m.refNew, d6sampling: m.sampling,
    d6save: m.save, d6hold: m.hold, d6vers: m.vers, d6copy: m.copy, d6cin: m.cin, d6cinFocus: !!m.cinFocus, d6chatOpen: m.chatOpen, d6unread: m.unread, d6left: m.left,
    d6title: m.title, d6rename: m.rename, d6renameVal: m.renameVal, d6sheet: m.sheet,
    d6cellGroups: null, d6cellImages: null, d6boxStyles: null, d6lgroup: "All", d6newLib: "", d6ph: 0, d6panning: false, d6panTo: null, d6toLibrary: false,
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
    enter: { d6save: false, d6hold: 0, d6vers: false, d6rename: false, d6sheet: false, d6panning: false },
    vals: vals(init),
    didUpdate,
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
};

function build(OUT) {
  fs.mkdirSync(OUT, { recursive: true });
  copyStudioImages(OUT);
  const ROW = 1040;
  const BOARDS = [
    { name: "Start", phone: false, m: "start", title: "D6 · Just opened: reference deck, or discuss an idea · Desktop", x: 0, y: 0 },
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
    { name: "NoImages", phone: false, m: "noImages", title: "D6 · A group with no images · Desktop", x: 1540, y: ROW * 5 },
    { name: "NewLibrary", phone: false, m: "newLibrary", title: "D6 · A new library: upload or generate · Desktop", x: 0, y: ROW * 6 },
    { name: "Rendered", phone: false, m: "renderedSlide", title: "D6 · Slide 1 rendered by the painter · Desktop", x: 1540, y: ROW * 6 },
    { name: "RenderFailed", phone: false, m: "renderFailed", title: "D6 · The render failed · Desktop", x: 0, y: ROW * 7 },
    { name: "Save", phone: false, m: "save", title: "D6 · Save as carousel type, short name taken · Desktop", x: 1540, y: ROW * 7 },
    { name: "Discard", phone: false, m: "discard", title: "D6 · Discard draft, being held · Desktop", x: 0, y: ROW * 8 },
    { name: "Edit", phone: false, m: "edit", title: "D6 · Editing an existing type, versions open · Desktop", x: 1540, y: ROW * 8 },
    { name: "Phone", phone: true, m: "main", title: "D6 · Simplified view · Phone", x: 3080, y: ROW * 3 },
    { name: "PhoneTools", phone: true, m: "phoneTools", title: "D6 · The adjustments sheet open · Phone", x: 3550, y: ROW * 3 },
    { name: "PhoneChat", phone: true, m: "phoneChat", title: "D6 · The conversation open · Phone", x: 4020, y: ROW * 3 },
  ];
  const artboards = [];
  for (const light of [false, true]) {
    for (const b of BOARDS) {
      const file = `${b.name}${light ? "Light" : ""}.dc.html`;
      const screen = studioScreen({ init: MOMENTS[b.m] });
      fs.writeFileSync(path.join(OUT, file), artboard({ phone: b.phone, light, screens: [screen], navMode: "note" }));
      artboards.push({ file, title: light ? `${b.title} · Light` : b.title, page: light ? "light" : "dark", x: b.x, y: b.y, w: b.phone ? 390 : 1440, h: b.phone ? 844 : 900 });
    }
  }
  const note =
    "Pictures, one screen per state; the controls that do work are a bonus. From the two cards you can walk the whole path: a card, a library (or New library), a saved deck or the chat box, then the draft. On the canvas boards, try dragging the dotted ground to pan, the title (press it to rename), a text box or an image cell on any slide, the adjustments on the left (the canvas follows), a library image (click it into the selected cell, or drag it onto a cell), the fold buttons on both panels and the rails they leave, Render preview, Regenerate sample, Save as carousel type, and Discard draft (press and hold).\n\nThe phone boards: the slides pan sideways, the adjustments open as a sheet from the bottom, the conversation floats behind the round button.";
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
