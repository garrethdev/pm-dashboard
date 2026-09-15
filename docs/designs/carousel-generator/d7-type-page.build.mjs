#!/usr/bin/env node
/*
 * D7 · A carousel type's own page — opened from a card's name on D1, or after
 * Save as carousel type in D6.
 *
 * Design step only (docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md, D7). Nothing
 * here is app code. The shell comes from generator-kit.mjs; this file is the
 * screen. All content is made-up sample data: D1's invented types ("Before &
 * After", wired; "Quiet Luxury Picks", the one not wired yet), D2's invented
 * library and direction, and bank photos from the Supabase image store as the
 * template's slides (the same shots D6 uses, named d7-*).
 *
 * Three tabs under the title, in the app's own underline-tab shape
 * (src/components/dashboard/account-detail-tabs.tsx):
 *   Overview   the template's slides across the full width, with a version
 *              dropdown, Make active and Edit template; four stat tiles beside
 *              the details; then the batches, each row opening that batch
 *   Direction  the direction, its version picked from a dropdown with Make
 *              active beside it, and Save version; the conversation beside it, its
 *              suggested change shown against the current text
 *   Wiring     the cadence and its rebalance across the character's other
 *              types (the cadence editor's rules and running total), Preview,
 *              Wire (a hold), and the checklist with the n8n media line to copy
 *
 * From Garreth's first review (2026-09-15):
 *   - The template's slides are the main thing on Overview, across the whole
 *     width. One version shows at a time, picked from a dropdown, with Make
 *     active beside it.
 *   - Posts left, days of cover, median views and weekly cap are four tiles
 *     under the template, the details to their right; the batches below.
 *   - The batch table is left-aligned, without Ran by, and a row opens that
 *     batch's decks.
 *   - Sections side by side are the same height, filling the screen.
 *
 * From his second review (2026-09-15):
 *   - The four tiles are narrower and the details wider. Each tile is the
 *     analytics page's stat tile: the dotted corner, no sparkline.
 *   - In the version dropdown the version showing sits in a soft accent
 *     tint; there is no tick.
 *   - Preview on the phone opens as a sheet from the bottom, like D6's.
 *   - A type's slides are 4:5 or 9:16, chosen when it is made; Details names
 *     the size and the template's slides take that shape.
 *
 * From his third review (2026-09-15): the direction's versions are the same
 * dropdown as the template's; the Versions card is gone.
 *
 * Pictures, one screen per state (Garreth's rule from D3 on); only the tabs,
 * the version dropdowns, the direction text and Preview's dialog respond.
 * Dark approved by Garreth on 2026-09-15 after five review rounds; light mode
 * designed the same day, so every board is written twice (Dark page, Light
 * page). In the prototype the page takes the type's name from the link that
 * opened it, and a link can open a tab (the Generate form's Edit opens
 * Direction).
 *
 * Run directly, it writes D7's review artboards and canvas.json:
 *   Overview         desktop (tall), Before & After
 *   OverviewVersions desktop (tall), the version dropdown open, Version 3 picked
 *   OverviewPhone    phone (tall), Before & After
 *   Direction        desktop, a suggested change shown against Version 4
 *   DirectionFailed  desktop, the conversation's reply failed, Retry
 *   DirectionPhone   phone, the suggested change, the conversation folded
 *   DirectionVersions desktop, the direction's version dropdown open, Version 3 picked
 *   Wiring           desktop, Quiet Luxury Picks just saved, arriving on Wiring
 *   WiringPhone      phone, the same
 *   Mismatch         desktop, the cadence does not add up: Wire unavailable
 *   Running          desktop, Wire held and running, the checklist ticking
 *   CheckFailed      desktop, a verification failed: rolled back, the item named
 *   MediaMissing     desktop, wired, but the media entry is not in the published workflow
 *   AllTicked        desktop, wired, every item ticked
 *   Preview          desktop, Preview open: what Wire will run
 *   PreviewPhone     phone, Preview open as a sheet from the bottom
 * Imported, `typeScreen()` is the screen the prototype will open once D7 is approved.
 *
 *   node docs/designs/carousel-generator/d7-type-page.build.mjs <out dir>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { I, icon, artboard, isMain, REPO } from "./generator-kit.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const S = ".screen-type";

const D7I = {
  todo: icon("Circle", 16, "regular"),
  ok: icon("CheckCircle", 16),
  fail: icon("XCircle", 16),
  warn: icon("WarningCircle", 16),
  copy: icon("Copy", 13),
  eye: icon("Eye", 13, "bold"),
  pencil: icon("PencilSimple", 13),
  retry: icon("ArrowClockwise", 12, "bold"),
  send: icon("ArrowUp", 15, "bold"),
  spark: icon("Sparkle", 15),
  book: icon("BookOpen", 12),
  x: icon("X", 16, "bold"),
};

/* The Peptide Miracles mark, read from the app the way the kit and D6 read it. */
const markRaw = fs.readFileSync(path.join(REPO, "src/components/ui/peptide-mark.tsx"), "utf8");
const MARK =
  `<svg viewBox="${markRaw.match(/viewBox="([^"]+)"/)[1]}" width="22" height="22" fill="currentColor" aria-hidden="true">` +
  [...markRaw.matchAll(/\sd="([^"]+)"/g)].map((m) => `<path d="${m[1]}"></path>`).join("") +
  "</svg>";

/* The template's slides and the library cover: bank photos, downsampled (the same shots as D6). */
const PHOTOS = ["mug", "journal", "yoga", "oats", "shower", "dock", "vanity"];
export function copyTypeImages(OUT) {
  for (const id of PHOTOS) fs.copyFileSync(path.join(HERE, "assets", `d7-slide-${id}.jpg`), path.join(OUT, `d7-slide-${id}.jpg`));
  fs.copyFileSync(path.join(HERE, "assets", "d7-lib-window.jpg"), path.join(OUT, "d7-lib-window.jpg"));
}

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rotate = (a, n) => a.slice(n).concat(a.slice(0, n));

/* ── Sample content ────────────────────────────────────────────────────── */

const TYPES = {
  /* Wired and posting. */
  before: {
    name: "Before & After", character: "Character 2", slides: 7, size: "4:5", short: "before_after",
    stats: [["Posts left", "14"], ["Days of cover", "6 days"], ["Median views", "31.7k"], ["Weekly cap", "3"]],
    batches: [
      { date: "Sep 14", req: 20, written: 7, rendered: null, approved: null, state: "running" },
      { date: "Sep 11", req: 20, written: 20, rendered: 18, approved: 16 },
      { date: "Sep 6", req: 50, written: 12, rendered: null, approved: null, state: "stopped" },
      { date: "Aug 29", req: 12, written: 12, rendered: 12, approved: 12 },
      { date: "Aug 22", req: 8, written: 8, rendered: 7, approved: 7 },
      { date: "Aug 9", req: 50, written: 50, rendered: 47, approved: 44 },
    ],
    /* Template versions, newest first: each with its own hook and photo order. */
    templates: [
      { name: "Version 4", date: "Sep 12", active: true, hook: "Six months, one habit, no filters", imgs: PHOTOS },
      { name: "Version 3", date: "Aug 30", hook: "Six months without filters", imgs: rotate(PHOTOS, 2) },
      { name: "Version 2", date: "Aug 14", hook: "What six months of one habit did", imgs: rotate(PHOTOS, 4) },
      { name: "Version 1", date: "Aug 2", hook: "Before and after: six months", imgs: rotate(PHOTOS, 5) },
    ],
    lines: [
      "Month one: nothing looked different",
      "Water before coffee, every single day",
      "Month three: people started asking",
      "No new products, just sleep and water",
      "Month six: the same mirror",
      "Which habit would you start with?",
    ],
    details: [["Slide size", "4:5"], ["Short name", "before-after"], ["Created", "Aug 2 · Alex"], ["Wired", "Aug 9 · Sam"]],
    /* Direction versions, newest first: the text each one gave the writer. */
    directions: [
      { name: "Version 4", date: "Sep 12", by: "Alex", active: true, text: "Open on a before-and-after people can picture in their own mirror. Keep every line under twelve words, warm and plain, never clinical. The after slide names one habit, never a product, and the caption ends on a question the viewer wants to answer." },
      { name: "Version 3", date: "Aug 30", by: "Sam", text: "Open on a before-and-after people can picture in their own mirror. Keep every line under twelve words, warm and plain. The after slide names one habit, and the caption asks what the viewer would try first." },
      { name: "Version 2", date: "Aug 14", by: "Alex", text: "Lead with the after photo, then walk back to the start. Short lines, no clinical words, one habit per deck. End the caption on a question." },
      { name: "Version 1", date: "Aug 2", by: "Alex", text: "Before and after, six months apart. Plain, warm lines. Name the habit, never a product." },
    ],
    budget: 11,
    lanes: [
      { name: "Before & After", was: 3, now: 3, ready: "14 ready" },
      { name: "Morning Routine", was: 4, now: 4, ready: "2 ready" },
      { name: "Skin Diary", was: 4, now: 4, ready: "9 ready" },
    ],
    wiredOn: "Aug 9 · Sam",
  },
  /* Just saved from the Studio: not wired yet, one first batch made. */
  quiet: {
    name: "Quiet Luxury Picks", character: "Character 4", slides: 5, size: "9:16", short: "quiet_luxury",
    stats: [["Posts left", "0"], ["Days of cover", "—"], ["Median views", "—"], ["Weekly cap", "—"]],
    batches: [{ date: "Sep 13", req: 14, written: 14, rendered: 14, approved: 12 }],
    templates: [{ name: "Version 1", date: "Sep 13", active: true, hook: "Five pieces I've worn for ten years", imgs: ["dock", "vanity", "journal", "mug", "yoga"] }],
    lines: ["The coat: wool, no logo", "The bag only gets better", "The watch, wound every morning", "Worn in Lisbon, Paris and at home"],
    details: [["Slide size", "9:16"], ["Short name", "quiet-luxury"], ["Created", "Sep 13 · Alex"]],
    directions: [
      { name: "Version 1", date: "Sep 13", by: "Alex", active: true, text: "Show one piece at a time, photographed plainly, and say why it lasts. No prices, no brand names. Every line under ten words; the caption closes on where it was worn." },
    ],
    budget: 11,
    lanes: [
      { name: "Quiet Luxury Picks", was: 0, now: 3, ready: "New" },
      { name: "Day in the Life", was: 7, now: 5, ready: "22 ready" },
      { name: "Capsule Wardrobe", was: 4, now: 3, ready: "9 ready" },
    ],
    wiredOn: "Sep 15 · Alex",
  },
};

/* The suggested change, against Version 4 (removed words struck through, added words marked). */
const DIFF = [
  ["", "Open on a "],
  ["add", "winter "],
  ["", "before-and-after people can picture in their own mirror. Keep "],
  ["del", "every line under twelve words"],
  ["add", "the hook under eight words and every other line under twelve"],
  ["", ", warm and plain, never clinical. The after slide names one habit, never a product, and the caption ends on a question the viewer wants to answer."],
];

/* The wiring checklist, from WIRE-NEW-CONTENT-TYPE.md by way of flow F11. `code` shows the name in monospace. */
const checklist = (T) => [
  { key: "table", name: "Lane table", detail: `${T.short}_decks`, code: true },
  { key: "registry", name: "Registry row", detail: "content_type_registry", code: true },
  { key: "allow", name: "Character allow-list", detail: T.character },
  { key: "trigger", name: "Ready trigger", detail: "scheduler_ready", code: true },
  { key: "posts", name: "Posts view", detail: "unified_posts", code: true },
  { key: "pool", name: "Scheduler pool", detail: "v_scheduler_pool", code: true },
  /* The first batch's approved decks, held until now, are written into the new table (Garreth, 2026-09-15). */
  { key: "decks", name: "Approved decks", detail: `${T.batches[T.batches.length - 1].approved} from the first batch` },
  { key: "cadence", name: "Cadence", detail: `${T.lanes[0].now} a week` },
  { key: "media", name: "Smart Scheduler media entry", detail: "n8n" },
  { key: "music", name: "Music sources", detail: "First batch" },
];

/*
 * Wiring states: fresh (just saved, balanced), mismatch (cadence does not add up), running (Wire held),
 * failed (rolled back), media (wired, media entry missing), done (every item ticked).
 */
const WIRED_MODES = new Set(["media", "done"]);

function itemState(mode, key, i) {
  if (mode === "done") return { st: "ok", detail: key === "music" ? "12 decks" : null };
  if (mode === "running") return { st: i < 4 ? "ok" : i === 4 ? "busy" : "todo" };
  if (mode === "failed") return key === "pool" ? { st: "fail", note: "Check 5 of 7: the pool came back empty" } : { st: "todo" };
  if (mode === "mismatch") return key === "cadence" ? { st: "todo", detail: "14 / 11", detailCls: "is-danger" } : { st: "todo" };
  if (mode === "media") {
    if (key === "media") return { st: "warn", note: "Not in the published workflow" };
    if (key === "music") return { st: "warn", detail: "2 decks waiting", detailCls: "is-warn" };
    return { st: "ok" };
  }
  return { st: "todo" };
}

/* Everything above a tab's panel on the desktop (top bar, padding, title, tabs), so side-by-side panels can fill
   the rest of the 900px screen and end on the same line (Garreth, 2026-09-15). */
const PANEL_H = 900 - 229 - 24;

/* ── Styles ────────────────────────────────────────────────────────────── */

function css(phone, { tall, slides, size }) {
  const P = phone;
  return `
/* ── D7 page ── */
:root { --ok: #4ade80; --warn: #fbbf24; --dot-opacity: 0.34; }
.app.is-light { --ok: #166534; --warn: #92400e; --dot-opacity: 0; }
${tall ? `.app${S} { height: ${tall}px; }` : ""}
${S} .page { gap: ${P ? 20 : 24}px; }
${S} .t7head { display: flex; flex-direction: column; align-items: flex-start; }
/* Back to Carousel types: the breadcrumb above the name, as on D2. */
${S} .up7 { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 4px -2px; padding: 2px; border-radius: 8px; font-size: 13px; line-height: 20px; font-weight: 500; color: var(--text-muted); transition: color 150ms var(--ease); }
${S} .up7:hover { color: var(--text-primary); }
${S} .t7title { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; align-self: stretch; }
${S} .t7name { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; min-width: 0; }
${S} .t7meta { display: flex; flex-wrap: wrap; gap: 6px; }
${S} .t7act { display: flex; align-items: center; gap: 12px; }
${S} .pill--ok { color: var(--ok); }
${S} .pill--warn { color: var(--warn); }
${S} .pill--danger { color: var(--danger); }
${S} .pill--accent { color: var(--accent); }

/* Tabs: account-detail-tabs.tsx, underline tabs over a full-width rule. */
${S} .tabs7 { display: flex; gap: ${P ? 20 : 24}px; border-bottom: 1px solid var(--border); margin-bottom: ${P ? -4 : 0}px; }
${S} .tab7 { position: relative; margin-bottom: -1px; border-bottom: 2px solid transparent; padding: 0 2px 10px; font-size: 14px; line-height: 20px; font-weight: 500; white-space: nowrap; color: var(--text-muted); transition: color 150ms var(--ease); }
${S} .tab7:hover { color: var(--text-primary); }
${S} .tab7[aria-selected="true"] { border-bottom-color: var(--text-primary); font-weight: 600; color: var(--text-primary); }

/* Cards: rounded-card, bg-card, border, with head rows between thin rules like D2's form. */
${S} .c7 { display: flex; flex-direction: column; min-width: 0; border-radius: 24px; background: var(--card); border: 1px solid var(--border); box-shadow: var(--sh-card); }
${S} .c7h { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; min-height: 60px; padding: 14px ${P ? 20 : 24}px; }
${S} .c7h h2 { margin: 0; font-size: 14px; line-height: 20px; font-weight: 600; }
${S} .c7h .cnt { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .tbtn7 { position: relative; display: inline-flex; align-items: center; gap: 4px; border-radius: 8px; padding: 2px 4px; font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-muted); transition: color 150ms var(--ease); }
${S} .tbtn7:hover { color: var(--text-primary); }
${S} .btn2:disabled { opacity: 0.4; cursor: not-allowed; }
${S} .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
${S} .col7 { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

/* ── Overview ── */
${S} .ov7 { display: flex; flex-direction: column; gap: 16px; }
/* The template: its slides across the whole width, one version at a time (Garreth, 2026-09-15). */
${S} .tplh { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; }
${S} .vsel { position: relative; }
${S} .vbtn7 { position: relative; display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; border: 1px solid var(--border); background: var(--card-raised); padding: 5px 10px 5px 14px;
  font-size: 13px; line-height: 18px; font-weight: 500; color: var(--text-primary); transition: border-color 150ms var(--ease); }
${S} .vbtn7:hover, ${S} .vbtn7[aria-expanded="true"] { border-color: color-mix(in srgb, var(--text-muted) 50%, var(--border)); }
${S} .vbtn7 .vd { font-weight: 400; color: var(--text-muted); }
${S} .vbtn7 svg { color: var(--text-muted); }
/* Solid, like D6's versions list: it hangs over the slides, and a veil would let them show through. */
${S} .vpop7 { position: absolute; left: 0; top: calc(100% + 8px); z-index: 40; width: 280px; border-radius: 16px; border: 1px solid var(--border); padding: 6px;
  background: var(--card-raised); box-shadow: var(--overlay-rim); transform-origin: top left; animation: d7-pop 150ms var(--ease-out-strong); }
.is-light ${S} .vpop7 { background: var(--card); box-shadow: 0 16px 40px rgba(27, 29, 33, 0.18); }
@keyframes d7-pop { from { opacity: 0; transform: scale(0.97) translateY(-4px); } }
${S} .vopt { display: flex; align-items: center; gap: 10px; width: 100%; min-height: ${P ? 44 : 36}px; border-radius: 12px; padding: 6px 10px; font-size: 13px; line-height: 20px; transition: background-color 150ms var(--ease); }
${S} .vopt:hover { background: color-mix(in srgb, var(--text-primary) 6%, transparent); }
/* The version showing: a soft accent tint, no tick (Garreth, 2026-09-15, second review). */
${S} .vopt[aria-selected="true"] { background: var(--accent-soft); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 24%, transparent); }
${S} .vopt b { font-weight: 500; }
${S} .vopt[aria-selected="true"] b { color: var(--accent); }
${S} .vopt .vd { color: var(--text-muted); }
${S} .vopt .vend { display: flex; align-items: center; gap: 8px; margin-left: auto; }
${S} .catch7 { position: absolute; inset: 0; z-index: 30; }
${
  P
    ? `${S} .slides7 { display: grid; grid-auto-flow: column; grid-auto-columns: 132px; gap: 10px; padding: 0 20px 20px; overflow-x: auto; scroll-snap-type: x mandatory; }
${S} .slide7 { scroll-snap-align: start; }`
    : `${S} .slides7 { display: grid; grid-template-columns: repeat(${slides}, minmax(0, 1fr)); gap: 12px; padding: 0 24px 24px; }`
}
/* A slide as the painter draws it: the photo, a soft darkening, the copy in white (D5's rendered slide), at the type's
   own size, 4:5 or 9:16 (Garreth, 2026-09-15). */
${S} .slide7 { position: relative; display: flex; align-items: center; justify-content: center; aspect-ratio: ${size === "9:16" ? "9 / 16" : "4 / 5"}; overflow: hidden; border-radius: ${P ? 10 : 12}px; padding: 8%; text-align: center;
  container-type: inline-size; background-size: cover; background-position: center; background-color: var(--card-raised); }
${S} .slide7::after { content: ""; position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0, 0, 0, 0.22), rgba(0, 0, 0, 0.12) 45%, rgba(0, 0, 0, 0.5)); pointer-events: none; }
${PHOTOS.map((id) => `${S} .p7-${id} { background-image: url(./d7-slide-${id}.jpg); }`).join("\n")}
${S} .st7 { position: relative; z-index: 1; max-width: 100%; margin: 0; font-size: 9.5cqw; line-height: 1.15; font-weight: 700; letter-spacing: -0.01em; color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45); text-wrap: balance; overflow-wrap: anywhere; }
${S} .st7--hook { font-size: 11.5cqw; }

/* The pool's four numbers beside the details, both the same height; the tiles narrower and the details wider
   (Garreth, 2026-09-15, second review). */
${S} .bento7 { display: grid; grid-template-columns: ${P ? "minmax(0, 1fr)" : "minmax(0, 5fr) minmax(0, 7fr)"}; gap: 16px; align-items: stretch; }
${S} .tiles7 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: 1fr; gap: 12px; }
/* The analytics page's stat tile (analytics-charts.tsx) without its sparkline: rounded-nested, bg-card-raised, px-4 py-3,
   and globals.css's dot-fade halftone fading out of the top-right corner (off in light mode, as in the app). */
${S} .tile7 { position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; overflow: hidden; border-radius: 16px; border: 1px solid var(--border);
  background: var(--card-raised); padding: 12px 16px; color: var(--text-muted); }
${S} .tile7::after { content: ""; position: absolute; inset: 0; pointer-events: none; background-image: radial-gradient(currentColor 2px, transparent 2.2px); background-size: 7px 7px;
  opacity: var(--dot-opacity); -webkit-mask-image: radial-gradient(115% 115% at 100% 0%, #000 0%, transparent 58%); mask-image: radial-gradient(115% 115% at 100% 0%, #000 0%, transparent 58%); }
${S} .tile7 > span { position: relative; z-index: 1; }
${S} .sl7 { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .sv7 { font-size: 24px; line-height: 1; font-weight: 600; color: var(--text-primary); }
${S} .sv7.is-muted { color: var(--text-muted); }
${S} .drow { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 48px; padding: 10px ${P ? 20 : 24}px; border-top: 1px solid var(--border); font-size: 13px; line-height: 20px; }
${S} .drow .dl { color: var(--text-muted); }
${S} .drow .dv { min-width: 0; display: flex; align-items: center; gap: 10px; text-align: right; }
${S} .libtile { width: 28px; height: 28px; flex-shrink: 0; border-radius: 8px; background: url(./d7-lib-window.jpg) center / cover, var(--card-raised); }
${S} .dv .sub { color: var(--text-muted); }

/* Batches: every column left-aligned, no Ran by (Garreth, 2026-09-15). A whole row opens that batch. */
${S} .bgrid { display: grid; grid-template-columns: 120px repeat(4, 112px) minmax(0, 1fr) 16px; align-items: center; column-gap: 16px; text-align: left; }
${S} .bhead { padding: 0 24px 8px; font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .brow { width: 100%; min-height: 52px; padding: 8px 24px; border-top: 1px solid var(--border); font-size: 14px; line-height: 20px; transition: background-color 150ms var(--ease); }
${S} .brow:hover { background: color-mix(in srgb, var(--text-primary) 4%, transparent); }
${S} .brow:last-child { border-radius: 0 0 23px 23px; }
${S} .brow .bdate { font-weight: 500; }
${S} .brow .dim { color: var(--text-muted); }
${S} .brow .bstate { display: flex; min-width: 0; }
${S} .chev7 { display: flex; color: var(--text-muted); }
${S} .bcounts { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .es7 { display: flex; min-height: 120px; align-items: center; justify-content: center; border-top: 1px solid var(--border); font-size: 13px; color: var(--text-muted); }

/* ── Direction ── */
/* The editor column and the conversation fill the panel and end on the same line (Garreth, 2026-09-15). */
${S} .dir7 { display: grid; grid-template-columns: ${P ? "minmax(0, 1fr)" : "minmax(0, 1fr) 400px"}; gap: 16px; align-items: stretch; ${P ? "" : `height: ${PANEL_H}px;`} }
${S} .dir7 > .col7 { min-height: 0; }
${S} .edcard { flex: 1; min-height: 0; }
${S} .edhead { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
${S} .edhead .date { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .edbody { display: flex; flex: 1; min-height: 0; padding: 0 ${P ? 20 : 24}px; }
${S} .edtext { display: block; flex: 1; width: 100%; min-height: ${P ? 236 : 0}px; resize: none; overflow-y: auto; border-radius: 16px; border: 1px solid var(--border); background: var(--card-sunken); padding: 14px 16px;
  font: inherit; font-size: ${P ? 16 : 15}px; line-height: 26px; color: var(--text-primary); outline: none; text-wrap: pretty; transition: box-shadow 150ms var(--ease); }
${S} .edtext:focus { box-shadow: 0 0 0 2px var(--accent); }
/* The suggestion against the current text: removed words struck through in red, added words underlined in green,
   so the change reads without relying on colour alone. */
${S} .diff { white-space: pre-wrap; }
${S} .diff del { text-decoration: line-through; text-decoration-thickness: 1.5px; color: var(--danger); background: color-mix(in srgb, var(--danger) 12%, transparent); border-radius: 4px; padding: 1px 2px; }
${S} .diff ins { text-decoration: underline; text-decoration-thickness: 1.5px; text-underline-offset: 4px; color: var(--ok); background: color-mix(in srgb, var(--ok) 12%, transparent); border-radius: 4px; padding: 1px 2px; }
${S} .edfoot { display: flex; align-items: center; gap: 16px; min-height: 70px; padding: 16px ${P ? 20 : 24}px; margin-top: 16px; border-top: 1px solid var(--border); }
${S} .edfoot .cta { margin-left: auto; }

/* The conversation: D6's messages and chat box, at the panel's full height. */
${S} .chat7 { min-height: 0; }
${S} .chat7 .c7h { border-bottom: 1px solid var(--border); }
${S} .chat7 .who { display: flex; align-items: center; gap: 10px; }
${S} .markv { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); }
${S} .msgs7 { display: flex; flex: 1; min-height: 0; flex-direction: column; gap: 14px; padding: 16px 20px; overflow-y: auto; }
${S} .msg7 { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; line-height: 20px; text-wrap: pretty; }
${S} .msg7.me { justify-content: flex-end; }
${S} .msg7.me .bub { max-width: 85%; border-radius: 16px 16px 4px 16px; background: var(--card-raised); padding: 8px 12px; }
.is-light ${S} .msg7.me .bub { background: var(--pill-bg); }
${S} .msg7 .aiv { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; flex-shrink: 0; margin-top: -2px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); }
${S} .msg7 .aiv svg { width: 14px; height: 14px; }
${S} .msg7.ai .bub { display: flex; min-width: 0; flex-direction: column; align-items: flex-start; gap: 8px; }
${S} .msg7 .bub.is-err { color: var(--danger); }
${S} .rules { display: flex; flex-wrap: wrap; gap: 6px; }
${S} .rules .pill svg { opacity: 0.8; }
${S} .cin7 { flex-shrink: 0; padding: 0 12px 12px; }
${S} .ai7 { display: flex; align-items: center; gap: 10px; width: 100%; border-radius: 16px; border: 1px solid var(--border); background: var(--card-sunken); padding: 10px; transition: border-color 200ms var(--ease); }
${S} .ai7:focus-within { border-color: color-mix(in srgb, var(--text-muted) 60%, var(--border)); }
${S} .aitile7 { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; flex-shrink: 0; border-radius: 12px; border: 1px solid var(--border); background: var(--card-raised); color: var(--text-muted); }
${S} .ai7 input { flex: 1; min-width: 0; font-size: 14px; line-height: 20px; outline: none; }
${S} .ai7 input::placeholder { color: var(--text-muted); }
${S} .aisend7 { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; flex-shrink: 0; border-radius: 12px; border: 1px solid var(--border); background: var(--card-raised); color: var(--text-muted); }
${S} .fab7 { position: absolute; right: 16px; bottom: 88px; z-index: 24; display: flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 999px; border: 1px solid var(--border);
  background: var(--card-raised); color: var(--text-primary); box-shadow: var(--overlay-rim); transition: transform 160ms var(--ease-out-strong); }
${S} .fab7:active { transform: scale(0.95); }
${S} .fab7 .dot { position: absolute; top: 10px; right: 10px; width: 9px; height: 9px; border-radius: 999px; background: var(--accent); box-shadow: 0 0 0 2px var(--card-raised); }

/* ── Wiring ── */
/* The set-up card and the checklist stretch to the same height and fill the panel (Garreth, 2026-09-15). */
${S} .wire7 { display: grid; grid-template-columns: ${P ? "minmax(0, 1fr)" : "minmax(0, 1fr) 460px"}; gap: 16px; align-items: stretch; ${P ? "" : `min-height: ${PANEL_H}px;`} }
${S} .frow7 { display: grid; grid-template-columns: ${P ? "minmax(0, 1fr)" : "140px minmax(0, 1fr)"}; gap: ${P ? 8 : 24}px; align-items: start; padding: 16px ${P ? 20 : 24}px; border-top: 1px solid var(--border); }
${S} .flabel7 { padding-top: ${P ? 0 : 6}px; font-size: 14px; line-height: 20px; font-weight: 500; }
${S} .field7 { display: flex; align-items: center; border-radius: 16px; border: 1px solid var(--border); background: var(--card-sunken); padding: ${P ? 12 : 10}px 14px; }
${S} .field7 input { width: 100%; font-size: ${P ? 16 : 14}px; line-height: 20px; font-weight: 500; outline: none; }
${S} .ro7 { padding-top: ${P ? 0 : 6}px; font-size: 14px; line-height: 20px; font-weight: 500; }
${S} .budget { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-height: 32px; font-size: 13px; line-height: 20px; }
${S} .budget b { font-weight: 600; }
${S} .budget .over { font-size: 12px; line-height: 16px; color: var(--danger); }
${S} .lanes { display: flex; flex-direction: column; margin-top: 8px; border-radius: 16px; border: 1px solid var(--border); }
${S} .lane { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 8px 8px 8px 14px; border-top: 1px solid var(--border); }
${S} .lane:first-child { border-top: 0; }
${S} .lname { display: flex; min-width: 0; flex: 1; flex-direction: column; }
${S} .lname b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; line-height: 20px; font-weight: 500; }
${S} .lname span { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .lval { padding-right: 8px; font-size: 14px; line-height: 20px; font-weight: 500; }
/* stepper.tsx, as on D2. */
${S} .step7 { display: inline-flex; align-items: stretch; width: ${P ? 132 : 120}px; flex-shrink: 0; overflow: hidden; border-radius: 16px; border: 1px solid var(--border); background: color-mix(in srgb, var(--bg) 60%, transparent); }
${S} .step7 button { display: flex; width: ${P ? 44 : 28}px; flex-shrink: 0; align-items: center; justify-content: center; color: var(--text-muted); }
${S} .step7 button:hover:not(:disabled) { background: var(--card); color: var(--text-primary); }
${S} .step7 button:disabled { cursor: not-allowed; opacity: 0.3; }
${S} .step7 span { display: flex; flex: 1; align-items: center; justify-content: center; padding: ${P ? 10 : 6}px 4px; border-left: 1px solid var(--border); border-right: 1px solid var(--border); font-size: 14px; line-height: 20px; }
${S} .step7.is-changed span { font-weight: 600; }
${S} .is-locked .step7 { opacity: 0.5; }
${S} .wfoot { display: flex; align-items: center; gap: 12px; min-height: 70px; margin-top: auto; padding: 16px 24px; border-top: 1px solid var(--border); }
${S} .wfoot .status7 { min-width: 0; margin-right: auto; font-size: 13px; line-height: 20px; color: var(--text-muted); }
${S} .status7.is-danger { color: var(--danger); }

/* Wire: hold-button.tsx in its warn tone (proposed): it changes the database, but deletes nothing. */
${S} .hold7 { position: relative; isolation: isolate; display: inline-flex; align-items: center; justify-content: center; gap: 8px; overflow: hidden; border-radius: 999px; padding: 6px 18px;
  font-size: 14px; line-height: 20px; font-weight: 500; user-select: none; touch-action: none; background: color-mix(in srgb, var(--warn) 25%, transparent); color: var(--warn); transition: opacity 150ms var(--ease); }
${S} .hold7:hover:not(:disabled) { opacity: 0.9; }
${S} .hold7:disabled { opacity: 0.4; cursor: not-allowed; }
${S} .hold7.is-busy:disabled { opacity: 1; cursor: progress; }
${S} .hold7 i { position: absolute; inset: 0; z-index: -1; transform-origin: left; transform: scaleX(0); background: var(--warn); }
${S} .hold7.is-busy i { transform: scaleX(1); opacity: 0.25; }
${S} .hold7 span { position: relative; display: flex; }

/* The checklist. */
${S} .items { display: flex; flex-direction: column; }
${S} .item { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; column-gap: 12px; align-items: start; padding: 12px ${P ? 20 : 24}px; border-top: 1px solid var(--border); }
${S} .item .ic { display: flex; padding-top: 2px; color: var(--text-muted); }
${S} .item.st-ok .ic { color: var(--ok); }
${S} .item.st-fail .ic { color: var(--danger); }
${S} .item.st-warn .ic { color: var(--warn); }
${S} .item.st-busy .ic { color: var(--accent); }
${S} .item .nm { font-size: 14px; line-height: 20px; font-weight: 500; }
${S} .item.st-todo .nm { color: var(--text-muted); }
${S} .item .dt { padding-top: 2px; font-size: 12px; line-height: 16px; color: var(--text-muted); text-align: right; white-space: nowrap; }
${S} .dt.is-danger { color: var(--danger); }
${S} .dt.is-warn { color: var(--warn); }
${S} .item .why { grid-column: 2 / 4; margin-top: 2px; font-size: 12px; line-height: 16px; }
${S} .item.st-fail .why { color: var(--danger); }
${S} .item.st-warn .why { color: var(--warn); }
/* The media line to copy, and Check again once it should be there. */
${S} .mline { grid-column: 2 / 4; display: flex; align-items: center; gap: 8px; margin-top: 10px; border-radius: 12px; border: 1px solid var(--border); background: var(--card-sunken); padding: 6px 6px 6px 12px; }
${S} .mline code { flex: 1; min-width: 0; overflow-x: auto; white-space: nowrap; line-height: 20px; color: var(--text-primary); }
${S} .mline .btn2, ${S} .mact .btn2 { padding: 4px 10px; }
${S} .mact { grid-column: 2 / 4; display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; }
${S} .mact .why { margin: 0; }

/* Preview: a centred dialog over the whole app, sections of exactly what Wire will run. */
${S} .scrim7 { position: absolute; inset: 0; z-index: 80; background: var(--scrim); -webkit-backdrop-filter: var(--scrim-blur); backdrop-filter: var(--scrim-blur); animation: d7-fade 180ms var(--ease-out-strong); }
${
  P
    ? `/* Phone: a sheet from the bottom, like D6's (Garreth, 2026-09-15), solid so the code reads cleanly. */
${S} .dlg7 { position: absolute; left: 0; right: 0; bottom: 0; z-index: 81; display: flex; flex-direction: column; max-height: 86%; border-radius: 24px 24px 0 0; border: 1px solid var(--border); border-bottom: 0;
  background: var(--card); box-shadow: var(--overlay-rim); animation: d7-sheet 280ms cubic-bezier(0.32, 0.72, 0, 1); }
@keyframes d7-sheet { from { transform: translateY(100%); } }`
    : `${S} .dlg7 { position: absolute; left: 50%; top: 50%; z-index: 81; display: flex; flex-direction: column; width: 720px; max-height: 780px; transform: translate(-50%, -50%);
  border-radius: 24px; border: 1px solid var(--border); background: var(--card); box-shadow: var(--overlay-rim); animation: d7-in 200ms var(--ease-out-strong); }`
}
.is-light ${S} .dlg7 { box-shadow: 0 16px 40px rgba(27, 29, 33, 0.18); }
@keyframes d7-fade { from { opacity: 0; } }
@keyframes d7-in { from { opacity: 0; transform: translate(-50%, -50%) scale(0.97); } }
${S} .dlg7 .c7h { border-bottom: 1px solid var(--border); }
${S} .dlg7 .c7h h2 { font-size: 16px; line-height: 24px; }
${S} .pbody { display: flex; flex-direction: column; gap: 16px; padding: 16px 24px 24px; overflow-y: auto; }
${S} .psec h3 { margin: 0 0 6px; font-size: 13px; line-height: 20px; font-weight: 500; color: var(--text-muted); }
${S} .psec pre { margin: 0; overflow-x: auto; border-radius: 12px; border: 1px solid var(--border); background: var(--card-sunken); padding: 10px 12px; line-height: 19px; color: var(--text-primary); }
${
  P
    ? `
/* Phone: the page's actions live in a bottom bar, as on D2 and D5. */
${S} .main { padding: 16px 16px 104px; }
${S} .note { bottom: 96px; }
${S} .bar7 { position: absolute; left: 0; right: 0; bottom: 0; z-index: 25; display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 70%, transparent); -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px); }
${S} .bar7 .cta, ${S} .bar7 .hold7 { margin-left: auto; padding: 14px 24px; }
${S} .bar7 .btn2 { padding: 10px 16px; }
${S} .bar7 .status7 { min-width: 0; font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .brow { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 12px; row-gap: 2px; align-items: center; padding: 12px 20px; }
${S} .brow .bl { display: flex; align-items: center; gap: 8px; }
${S} .brow .bcounts { grid-column: 1; }
${S} .brow .chev7 { grid-column: 2; grid-row: 1 / 3; }
${S} .tab7::after, ${S} .tbtn7::after, ${S} .vbtn7::after { content: ""; position: absolute; inset: -10px -6px; }
${S} .lane { flex-wrap: wrap; }
${S} .dlg7 .c7h { position: relative; padding-top: 20px; }
${S} .dlg7 .c7h::before { content: ""; position: absolute; top: 6px; left: 50%; width: 36px; height: 4px; margin-left: -18px; border-radius: 999px; background: color-mix(in srgb, var(--text-muted) 40%, transparent); }
${S} .dlg7 .icon-btn { position: relative; }
${S} .dlg7 .icon-btn::after { content: ""; position: absolute; inset: -6px; }
${S} .pbody { padding: 16px 16px 28px; }
`
    : ""
}
@media (prefers-reduced-motion: reduce) {
  ${S} .scrim7, ${S} .dlg7, ${S} .vpop7 { animation: d7-fade 150ms linear; }
  ${S} .tab7, ${S} .fab7, ${S} .brow, ${S} .vopt { transition: none; }
}
`;
}

/* ── Markup ────────────────────────────────────────────────────────────── */

function batchRows(T, phone) {
  if (!T.batches.length) return `<div class="es7">No batches yet</div>`;
  const n = (v) => (v == null ? `<span class="dim tnum">—</span>` : `<span class="tnum">${v}</span>`);
  return T.batches
    .map((b) => {
      const flagged = !b.state ? b.written - b.rendered : 0;
      const pill =
        b.state === "running"
          ? `<span class="pill pill--accent tnum">Writing ${b.written} of ${b.req}</span>`
          : b.state === "stopped"
            ? `<span class="pill">Stopped</span>`
            : flagged
              ? `<span class="pill pill--danger tnum">${flagged} flagged</span>`
              : "";
      const open = b.state === "running" ? "d7openRunning" : b.state === "stopped" ? "d7openStopped" : "d7openBatch";
      if (phone) {
        const counts = b.state ? `${b.written} of ${b.req} written` : `${b.req} decks · ${b.rendered} rendered · ${b.approved} approved`;
        return `
                <button type="button" class="brow" onClick="{{${open}}}"><span class="bl"><span class="bdate tnum">${b.date}</span>${pill}</span><span class="bcounts tnum">${counts}</span><span class="chev7">${I.caretRightSm}</span></button>`;
      }
      return `
                <button type="button" class="brow bgrid" onClick="{{${open}}}"><span class="bdate tnum">${b.date}</span>${n(b.req)}${n(b.written)}${n(b.rendered)}${n(b.approved)}<span class="bstate">${pill}</span><span class="chev7">${I.caretRightSm}</span></button>`;
    })
    .join("");
}

function overview(T, init, phone) {
  const tiles = T.stats
    .map(([l, v]) => `<div class="tile7"><span class="sl7">${l}</span><span class="sv7 tnum${v === "—" ? " is-muted" : ""}">${esc(v)}</span></div>`)
    .join("");
  const details = T.details.map(([l, v]) => `<div class="drow"><span class="dl">${l}</span><span class="dv tnum">${esc(v)}</span></div>`).join("");
  return `
          <div class="ov7">
            <section class="c7" aria-label="Template">
              <div class="c7h">
                <div class="tplh">
                  <h2>Template</h2>
                  <div class="vsel">
                    <button type="button" class="vbtn7" aria-haspopup="listbox" aria-expanded="{{d7tvExpanded}}" onClick="{{d7tvToggle}}"><span class="tnum">{{d7tvName}}</span><span class="vd tnum">{{d7tvDate}}</span>${I.caretDown}</button>
                    <sc-if value="{{d7tvOpen}}" hint-placeholder-val="{{ ${!!init.tvOpen} }}">
                      <div class="vpop7" role="listbox" aria-label="Template versions" onKeyDown="{{d7tvKey}}">
                        <sc-for list="{{d7tvList}}" as="v" hint-placeholder-count="${T.templates.length}">
                          <button type="button" class="vopt" role="option" aria-selected="{{v.selected}}" onClick="{{v.pick}}"><b class="tnum">{{v.name}}</b><span class="vd tnum">{{v.date}}</span><span class="vend"><sc-if value="{{v.active}}" hint-placeholder-val="{{ false }}"><span class="pill pill--ok">Active</span></sc-if></span></button>
                        </sc-for>
                      </div>
                    </sc-if>
                  </div>
                  <sc-if value="{{d7tvActive}}" hint-placeholder-val="{{ ${!init.tv} }}"><span class="pill pill--ok">Active</span></sc-if>
                  <sc-if value="{{d7tvOld}}" hint-placeholder-val="{{ ${!!init.tv} }}"><button type="button" class="btn2" onClick="{{d7makeActive}}">Make active</button></sc-if>
                </div>
                ${phone ? "" : `<button type="button" class="btn2" onClick="{{d7editTemplate}}">${D7I.pencil}Edit template</button>`}
              </div>
              <div class="slides7">
                <sc-for list="{{d7slides}}" as="sl" hint-placeholder-count="${T.slides}">
                  <div class="slide7 {{sl.cls}}" role="img" aria-label="{{sl.label}}"><p class="st7 {{sl.textCls}}">{{sl.text}}</p></div>
                </sc-for>
              </div>
            </section>
            <div class="bento7">
              <div class="tiles7" aria-label="Pool">${tiles}</div>
              <section class="c7">
                <div class="c7h"><h2>Details</h2></div>
                <div class="drow"><span class="dl">Image library</span><span class="dv"><span class="libtile" aria-hidden="true"></span><span>Soft Window Light <span class="sub tnum">· 126</span></span></span></div>
                ${details}
              </section>
            </div>
            <section class="c7">
              <div class="c7h"><h2>Batches</h2><button type="button" class="tbtn7" onClick="{{d7history}}">History${I.caretRightSm}</button></div>
              ${phone || !T.batches.length ? "" : `<div class="bhead bgrid"><span>Date</span><span>Requested</span><span>Written</span><span>Rendered</span><span>Approved</span><span></span><span></span></div>`}
              ${batchRows(T, phone)}
            </section>
          </div>`;
}

function direction(T, init, phone) {
  const proposal = init.dir === "proposal";
  const failed = init.dir === "failed";
  const text = proposal
    ? `<div class="edtext diff" role="textbox" aria-multiline="true" aria-label="Direction">${DIFF.map(([k, t]) => (k === "add" ? `<ins>${esc(t)}</ins>` : k === "del" ? `<del>${esc(t)}</del>` : esc(t))).join("")}</div>`
    : `<textarea class="edtext" aria-label="Direction" value="{{d7dirText}}" onChange="{{d7typeDir}}"></textarea>`;
  /* The versions are a dropdown, the same as the template's (Garreth, 2026-09-15, third review): the version picked
     is the one in the editor, with Make active beside it when it is not the active one. */
  const editor = `
              <section class="c7 edcard">
                <div class="c7h">
                  <div class="tplh">
                    <div class="vsel">
                      <button type="button" class="vbtn7" aria-haspopup="listbox" aria-expanded="{{d7dvExpanded}}" onClick="{{d7dvToggle}}"><span class="tnum">{{d7dvName}}</span><span class="vd tnum">{{d7dvDate}}</span>${I.caretDown}</button>
                      <sc-if value="{{d7dvOpen}}" hint-placeholder-val="{{ ${!!init.dvOpen} }}">
                        <div class="vpop7" role="listbox" aria-label="Direction versions" onKeyDown="{{d7dvKey}}">
                          <sc-for list="{{d7dvList}}" as="v" hint-placeholder-count="${T.directions.length}">
                            <button type="button" class="vopt" role="option" aria-selected="{{v.selected}}" onClick="{{v.pick}}"><b class="tnum">{{v.name}}</b><span class="vd tnum">{{v.meta}}</span><span class="vend"><sc-if value="{{v.active}}" hint-placeholder-val="{{ false }}"><span class="pill pill--ok">Active</span></sc-if></span></button>
                          </sc-for>
                        </div>
                      </sc-if>
                    </div>
                    <sc-if value="{{d7dvActive}}" hint-placeholder-val="{{ ${!init.dv} }}"><span class="pill pill--ok">Active</span></sc-if>
                    <sc-if value="{{d7dvOld}}" hint-placeholder-val="{{ ${!!init.dv} }}"><button type="button" class="btn2" onClick="{{d7makeDirection}}">Make active</button></sc-if>
                    ${proposal ? `<span class="pill pill--accent">Suggested change</span>` : ""}
                  </div>
                  ${proposal ? `<button type="button" class="tbtn7" onClick="{{d7dropSuggestion}}">Discard suggestion</button>` : ""}
                </div>
                <div class="edbody">${text}</div>
                ${
                  phone
                    ? `<div style="height: 20px"></div>`
                    : `<div class="edfoot"><button type="button" class="cta" disabled="{{d7saveDisabled}}" onClick="{{d7saveVersion}}">Save version</button></div>`
                }
              </section>`;
  const me = proposal || failed ? `<div class="msg7 me"><div class="bub">Lean into winter skin, make the hook shorter, and put the hook in a bigger font.</div></div>` : "";
  const reply = proposal
    ? `<div class="msg7 ai"><span class="aiv">${MARK}</span><div class="bub"><span>Changed two lines: winter in the opening, and the hook held to eight words. The hook's font size belongs to the template, not the direction, so that part is in Edit template.</span><div class="rules"><span class="pill">${D7I.book}Hooks under 8 words</span></div></div></div>`
    : failed
      ? `<div class="msg7 ai"><span class="aiv">${MARK}</span><div class="bub is-err"><span>The reply didn't arrive.</span><button type="button" class="btn2" onClick="{{d7retry}}">${D7I.retry}Retry</button></div></div>`
      : "";
  const chat = `
              <section class="c7 chat7" aria-label="Conversation">
                <div class="c7h"><div class="who"><span class="markv">${MARK}</span><h2>Conversation</h2></div></div>
                <div class="msgs7">${me}${reply}</div>
                <div class="cin7"><div class="ai7"><span class="aitile7" aria-hidden="true">${D7I.spark}</span><input type="text" aria-label="Message" placeholder="What should change?" /><button type="button" class="aisend7" aria-label="Send" onClick="{{d7send}}">${D7I.send}</button></div></div>
              </section>`;
  if (phone) return `<div class="dir7">${editor}</div>`;
  return `<div class="dir7">${editor}${chat}</div>`;
}

function wiring(T, mode, phone) {
  const wired = WIRED_MODES.has(mode);
  const locked = mode === "running";
  const lanes = T.lanes.map((l, i) => ({ ...l, now: mode === "mismatch" && i > 0 ? l.was : l.now }));
  const total = lanes.reduce((a, l) => a + l.now, 0);
  const over = total - T.budget;
  const lanesHtml = lanes
    .map((l, i) => {
      const hint = l.now !== l.was && i > 0 ? `Was ${l.was} · ${l.ready}` : l.ready;
      const ctl = wired
        ? `<span class="lval tnum">${l.now} a week</span>`
        : `<div class="step7${l.now !== l.was ? " is-changed" : ""}"><button type="button" aria-label="Fewer for ${esc(l.name)}"${locked ? ` disabled="{{ true }}"` : ""}>${I.minus}</button><span class="tnum">${l.now}</span><button type="button" aria-label="More for ${esc(l.name)}"${locked ? ` disabled="{{ true }}"` : ""}>${I.plus}</button></div>`;
      return `<div class="lane"><span class="lname"><b>${esc(l.name)}</b><span class="tnum">${esc(hint)}</span></span>${ctl}</div>`;
    })
    .join("");
  const budgetPill = `<span class="pill tnum ${over === 0 ? "pill--ok" : "pill--danger"}">${total} / ${T.budget}</span>`;
  const status =
    mode === "mismatch" ? `<span class="status7 is-danger tnum">${over} too many</span>` : mode === "failed" ? `<span class="status7 is-danger">Rolled back</span>` : wired ? `<span class="status7 tnum">Wired ${T.wiredOn}</span>` : `<span class="status7"></span>`;
  const holdBtn = locked
    ? `<button type="button" class="hold7 is-busy" disabled="{{ true }}"><i aria-hidden="true"></i><span class="spin on">${I.busy}</span><span>Wiring</span></button>`
    : `<button type="button" class="hold7" aria-label="Wire, press and hold"${mode === "mismatch" ? ` disabled="{{ true }}"` : ""} onClick="{{d7wire}}"><i aria-hidden="true"></i><span>Wire</span></button>`;
  const previewBtn = `<button type="button" class="btn2" onClick="{{d7openPreview}}"${locked ? ` disabled="{{ true }}"` : ""}>${D7I.eye}Preview</button>`;
  const form = `
              <section class="c7${locked ? " is-locked" : ""}">
                <div class="c7h"><h2>Set up</h2></div>
                <div class="frow7">
                  <label class="flabel7" for="d7-display">Display name</label>
                  ${wired ? `<span class="ro7">${esc(T.name)}</span>` : `<div class="field7"><input id="d7-display" type="text" value="${esc(T.name)}" /></div>`}
                </div>
                <div class="frow7">
                  <span class="flabel7">Cadence</span>
                  <div>
                    <div class="budget"><b>${T.character}</b>${budgetPill}${mode === "mismatch" ? `<span class="over tnum">${over} too many</span>` : ""}</div>
                    <div class="lanes">${lanesHtml}</div>
                  </div>
                </div>
                ${phone ? "" : wired ? `<div class="wfoot">${status}</div>` : `<div class="wfoot">${status}${previewBtn}${holdBtn}</div>`}
              </section>`;

  const items = checklist(T);
  const ticked = items.filter((it, i) => itemState(mode, it.key, i).st === "ok").length;
  const head =
    mode === "failed" ? `<span class="pill pill--danger">Rolled back</span>` : mode === "done" ? `<span class="pill pill--ok tnum">${ticked} of ${items.length}</span>` : `<span class="cnt tnum">${ticked} of ${items.length}</span>`;
  const iconOf = { todo: D7I.todo, ok: D7I.ok, fail: D7I.fail, warn: D7I.warn, busy: `<span class="spin on">${I.busy}</span>` };
  const labelOf = { todo: "Not done", ok: "Done", fail: "Failed", warn: "Needs attention", busy: "Running" };
  const itemsHtml = items
    .map((it, i) => {
      const st = itemState(mode, it.key, i);
      const detail = st.detail ?? it.detail;
      const code = it.code && !st.detail;
      let extra = "";
      if (it.key === "media" && mode !== "done") {
        extra =
          `<div class="mline"><code class="mono">${T.short}: { table: "${T.short}_decks", kind: "carousel" },</code><button type="button" class="btn2" onClick="{{d7copy}}">${D7I.copy}Copy</button></div>` +
          (mode === "media" ? `<div class="mact"><span class="why">${st.note}</span><button type="button" class="btn2" onClick="{{d7check}}">${D7I.retry}Check again</button></div>` : "");
      } else if (st.note) {
        extra = `<span class="why">${st.note}</span>`;
      }
      return `
                <div class="item st-${st.st}"><span class="ic" role="img" aria-label="${labelOf[st.st]}">${iconOf[st.st]}</span><span class="nm">${esc(it.name)}</span><span class="dt tnum ${code ? "mono" : ""} ${st.detailCls || ""}">${esc(detail)}</span>${extra}</div>`;
    })
    .join("");
  const list = `
              <section class="c7">
                <div class="c7h"><h2>Checklist</h2>${head}</div>
                <div class="items">${itemsHtml}
                </div>
              </section>`;
  return `<div class="wire7">${form}${list}</div>`;
}

function header(T, wired, mode, phone) {
  /* The name and pills come from the link that opened the page (the prototype); the review boards show T's own. */
  const statusPill = !wired ? `<span class="pill">Not wired</span>` : mode === "media" ? `<span class="pill pill--warn">Media map missing</span>` : "";
  const actions = phone
    ? ""
    : `<div class="t7act">
                <sc-if value="{{d7genAccent}}" hint-placeholder-val="{{ true }}"><button type="button" class="cta" onClick="{{d7generate}}">Generate</button></sc-if>
                <sc-if value="{{d7genPlain}}" hint-placeholder-val="{{ false }}"><button type="button" class="btn2" onClick="{{d7generate}}">Generate</button></sc-if>
              </div>`;
  return `
          <div class="t7head">
            <button type="button" class="up7" onClick="{{d7back}}">${I.backSm}Carousel types</button>
            <div class="t7title">
              <div class="t7name">
                <h1>{{d7name}}</h1>
                <div class="t7meta"><span class="pill">{{d7character}}</span><span class="pill tnum">{{d7slidesText}}</span>${statusPill}</div>
              </div>
              ${actions}
            </div>
          </div>`;
}

function page(T, init, phone) {
  const mode = init.wire;
  const wired = T === TYPES.before || WIRED_MODES.has(mode);
  const tab = (id, label) =>
    `<button type="button" role="tab" class="tab7" id="d7-tab-${id}" aria-selected="{{d7sel.${id}}}" aria-controls="d7-panel-${id}" onClick="{{d7go.${id}}}">${label}</button>`;
  const panel = (id, html) =>
    `<sc-if value="{{d7is.${id}}}" hint-placeholder-val="{{ ${init.tab === id} }}"><div role="tabpanel" id="d7-panel-${id}" aria-labelledby="d7-tab-${id}">${html}</div></sc-if>`;
  return `
      <main class="main">
        <div class="page">
          ${header(T, wired, mode, phone)}
          <div class="tabs7" role="tablist" aria-label="Carousel type">${tab("overview", "Overview")}${tab("direction", "Direction")}${tab("wiring", "Wiring")}</div>
          ${panel("overview", overview(T, init, phone))}
          ${panel("direction", direction(T, init, phone))}
          ${panel("wiring", wiring(T, mode, phone))}
        </div>
      </main>`;
}

/* At the app's level: the click-away layer for the version dropdown, and Preview's dialog. */
function appOverlay(T, init) {
  const lanes = T.lanes.map((l) => `${l.name.padEnd(20)} ${l.was} → ${l.now}`).join("\n");
  const secs = [
    ["Lane table", `create table ${T.short}_decks (\n  id text primary key,\n  slide_1 text, slide_2 text, slide_3 text,\n  slide_4 text, slide_5 text,\n  caption text,\n  music text,\n  approved boolean default false,\n  scheduler_ready boolean default false\n);`],
    ["Ready trigger", `create trigger ${T.short}_ready\n  before update on ${T.short}_decks\n  for each row execute function set_scheduler_ready();`],
    ["Registry row", `content_type  ${T.short}\ndisplay_name  ${T.name}\ncharacter     ${T.character}\nkind          carousel`],
    ["Character allow-list", `${T.character}  + ${T.short}`],
    ["Posts view", `union all\nselect id, '${T.short}' as content_type, caption, music\nfrom ${T.short}_decks`],
    ["Scheduler pool", `union all\nselect id, '${T.short}' as content_type\nfrom ${T.short}_decks\nwhere scheduler_ready`],
    ["Cadence", lanes],
  ];
  return `
  <sc-if value="{{d7anyOpen}}" hint-placeholder-val="{{ ${!!(init.tvOpen || init.dvOpen)} }}"><div class="catch7" aria-hidden="true" onClick="{{d7closeMenus}}"></div></sc-if>
  <sc-if value="{{d7previewOn}}" hint-placeholder-val="{{ ${!!init.preview} }}">
    <div class="scrim7" aria-hidden="true" onClick="{{d7closePreview}}"></div>
    <div class="dlg7" role="dialog" aria-modal="true" aria-labelledby="d7-preview-title" onKeyDown="{{d7previewKey}}">
      <div class="c7h"><h2 id="d7-preview-title">Preview</h2><button type="button" class="icon-btn" aria-label="Close" onClick="{{d7closePreview}}">${D7I.x}</button></div>
      <div class="pbody">${secs.map(([h, code]) => `<section class="psec"><h3>${h}</h3><pre class="mono">${esc(code)}</pre></section>`).join("")}</div>
    </div>
  </sc-if>`;
}

/* The phone's bottom bar, per tab, and the folded conversation's round button on Direction. */
function phoneBar(T, init) {
  const mode = init.wire;
  const wired = T === TYPES.before || WIRED_MODES.has(mode);
  const lanes = T.lanes.map((l, i) => (mode === "mismatch" && i > 0 ? l.was : l.now));
  const total = lanes.reduce((a, b) => a + b, 0);
  const wireBar = WIRED_MODES.has(mode)
    ? `<span class="status7 tnum">Wired ${T.wiredOn}</span><button type="button" class="cta" onClick="{{d7generate}}">Generate</button>`
    : `<span class="pill tnum ${total === T.budget ? "pill--ok" : "pill--danger"}">${total} / ${T.budget}</span><button type="button" class="btn2" onClick="{{d7openPreview}}">${D7I.eye}Preview</button>` +
      (mode === "running"
        ? `<button type="button" class="hold7 is-busy" disabled="{{ true }}"><i aria-hidden="true"></i><span class="spin on">${I.busy}</span><span>Wiring</span></button>`
        : `<button type="button" class="hold7" aria-label="Wire, press and hold"${mode === "mismatch" ? ` disabled="{{ true }}"` : ""} onClick="{{d7wire}}"><i aria-hidden="true"></i><span>Wire</span></button>`);
  return `
    <sc-if value="{{d7is.overview}}" hint-placeholder-val="{{ ${init.tab === "overview"} }}"><div class="bar7"><button type="button" class="btn2" onClick="{{d7editTemplate}}">${D7I.pencil}Edit template</button><button type="button" class="cta" onClick="{{d7generate}}">Generate</button></div></sc-if>
    <sc-if value="{{d7is.direction}}" hint-placeholder-val="{{ ${init.tab === "direction"} }}">
      <button type="button" class="fab7" aria-label="Open the conversation" onClick="{{d7openChat}}">${MARK}${init.dir === "proposal" ? `<span class="dot" aria-hidden="true"></span>` : ""}</button>
      <div class="bar7">${init.dir === "proposal" ? `<button type="button" class="btn2" onClick="{{d7dropSuggestion}}">Discard suggestion</button>` : ""}<button type="button" class="cta" disabled="{{d7saveDisabled}}" onClick="{{d7saveVersion}}">Save version</button></div>
    </sc-if>
    <sc-if value="{{d7is.wiring}}" hint-placeholder-val="{{ ${init.tab === "wiring"} }}"><div class="bar7">${wireBar}</div></sc-if>`;
}

/* ── Behaviour ─────────────────────────────────────────────────────────── */

function vals(T, init) {
  const TPL = T.templates.map((v) => ({ name: v.name, date: v.date, active: !!v.active, hook: v.hook, imgs: v.imgs.slice(0, T.slides) }));
  return `
    var P = s.params || {};
    var NAME = P.name || ${JSON.stringify(T.name)};
    var PROPOSAL = ${init.dir === "proposal"};
    var DIRS = ${JSON.stringify(T.directions)};
    var TPL = ${JSON.stringify(TPL)};
    var LINES = ${JSON.stringify(T.lines)};
    /* A link may name the tab to open on (the Generate form's Edit opens Direction) until a tab is pressed. */
    var tab = s.d7tabSet ? s.d7tab : P.tab || s.d7tab;
    var d7is = {}, d7sel = {}, d7go = {};
    ["overview", "direction", "wiring"].forEach(function (t) {
      d7is[t] = tab === t;
      d7sel[t] = tab === t ? "true" : "false";
      d7go[t] = function () { self.setState({ d7tab: t, d7tabSet: true, d7tvOpen: false, d7dvOpen: false }); };
    });
    var say = function (text) { return function () { self.note(text); }; };
    var params = { name: NAME, character: P.character || ${JSON.stringify(T.character)}, slides: P.slides || ${JSON.stringify(`${T.slides} slides`)}, size: P.size || ${JSON.stringify(T.size || "4:5")} };
    var cur = TPL[s.d7tv] || TPL[0];
    var dv = DIRS[s.d7dv] || DIRS[0];
    return {
      d7is: d7is, d7sel: d7sel, d7go: d7go,
      d7name: NAME,
      d7character: params.character,
      d7slidesText: params.slides,
      /* One accent a screen: on Direction, Save version is the accent and Generate steps back to secondary. A type not
         wired yet has Generate too, so its first batch can be made; its approved decks wait for Wire (Garreth, 2026-09-15). */
      d7genAccent: tab !== "direction",
      d7genPlain: tab === "direction",
      d7back: function () { ctx.open("types", null, "Back to Carousel types · D1"); },
      d7generate: function () { ctx.open("generate", params, "Opens the Generate form for " + NAME + " · D2"); },
      d7editTemplate: function () { ctx.open("studio", null, "Opens the Studio on " + NAME + "'s active version · D6"); },
      d7history: say("Opens History, filtered to " + NAME + " · D9"),

      /* The template: one version at a time, from the dropdown (Garreth, 2026-09-15). */
      d7tvName: cur.name,
      d7tvDate: cur.date,
      d7tvActive: cur.active,
      d7tvOld: !cur.active,
      d7tvOpen: !!s.d7tvOpen,
      d7tvExpanded: s.d7tvOpen ? "true" : "false",
      d7tvToggle: function () { self.setState({ d7tvOpen: !s.d7tvOpen, d7dvOpen: false }); },
      d7tvClose: function () { self.setState({ d7tvOpen: false }); },
      d7tvKey: function (e) { if (e.key === "Escape") { e.stopPropagation(); self.setState({ d7tvOpen: false }); } },
      d7tvList: TPL.map(function (v, i) {
        var on = i === (s.d7tv || 0);
        return { name: v.name, date: v.date, active: v.active, selected: on ? "true" : "false", pick: function () { self.setState({ d7tv: i, d7tvOpen: false }); } };
      }),
      d7makeActive: say("Makes " + cur.name + " the active template; new batches use it"),
      d7slides: cur.imgs.map(function (img, i) {
        var text = i === 0 ? cur.hook : LINES[i - 1];
        return { cls: "p7-" + img, text: text, textCls: i === 0 ? "st7--hook" : "", label: "Slide " + (i + 1) + ": " + text };
      }),

      /* A batch row opens that batch: its decks, rendered and any flagged, or the batch still writing (Garreth, 2026-09-15). */
      d7openBatch: function () { ctx.open("render", { name: NAME, character: params.character, slides: params.slides, size: params.size, count: 20 }, "Opens that batch's decks: rendered, and any flagged or failed · D5"); },
      d7openRunning: function () { ctx.open("batch", { name: NAME, character: params.character, slides: params.slides, size: params.size, count: 20, writtenUpTo: 7 }, "Opens the running batch · D3"); },
      d7openStopped: function () { ctx.open("batch", { name: NAME, character: params.character, slides: params.slides, size: params.size, count: 50, writtenUpTo: 12 }, "Opens the stopped batch, with Continue · D3"); },

      /* The direction's versions: the same dropdown as the template's (Garreth, 2026-09-15, third review). */
      d7dvName: dv.name,
      d7dvDate: dv.date,
      d7dvActive: !!dv.active,
      d7dvOld: !dv.active,
      d7dvOpen: !!s.d7dvOpen,
      d7dvExpanded: s.d7dvOpen ? "true" : "false",
      d7dvToggle: function () { self.setState({ d7dvOpen: !s.d7dvOpen, d7tvOpen: false }); },
      d7dvKey: function (e) { if (e.key === "Escape") { e.stopPropagation(); self.setState({ d7dvOpen: false }); } },
      d7dvList: DIRS.map(function (v, i) {
        var on = i === (s.d7dv || 0);
        return { name: v.name, meta: v.date + " · " + v.by, active: !!v.active, selected: on ? "true" : "false", pick: function () { self.setState({ d7dv: i, d7dvOpen: false, d7dir: v.text }); } };
      }),
      d7makeDirection: say("Makes " + dv.name + " the active direction; new batches are written from it"),
      d7anyOpen: !!(s.d7tvOpen || s.d7dvOpen),
      d7closeMenus: function () { self.setState({ d7tvOpen: false, d7dvOpen: false }); },
      d7dirText: s.d7dir,
      d7typeDir: function (e) { self.setState({ d7dir: e.target.value }); },
      d7saveDisabled: !(PROPOSAL || s.d7dir !== dv.text),
      d7saveVersion: say("Saves Version 5 and makes it active"),
      d7dropSuggestion: say("Drops the suggestion; Version 4 stays as it is"),
      d7send: say("Sends the message"),
      d7retry: say("Asks again"),
      d7openChat: say("Opens the conversation as a sheet, as in D6"),
      d7copy: say("Copied the media line"),
      d7check: say("Reads the published Smart Scheduler again"),
      d7wire: say("Wire is a press and hold"),
      d7previewOn: !!s.d7preview,
      d7openPreview: function () { self.setState({ d7preview: true }); },
      d7closePreview: function () { self.setState({ d7preview: false }); },
      d7previewKey: function (e) { if (e.key === "Escape") self.setState({ d7preview: false }); }
    };`;
}

/**
 * D7 as a screen. `init`: type ("before" wired, "quiet" not wired), tab, tv (the template version showing, 0 is
 * the newest), tvOpen (its dropdown open), dv and dvOpen (the same for the direction), dir ("plain" | "proposal" | "failed"), wire ("fresh" | "mismatch" |
 * "running" | "failed" | "media" | "done"), preview (the dialog open). `tall` lengthens a review board so the
 * whole page shows.
 */
export function typeScreen({ init = {}, tall = 0 } = {}) {
  const i = { type: "before", tab: "overview", tv: 0, tvOpen: false, dv: 0, dvOpen: false, dir: "plain", wire: "done", preview: false, ...init };
  const T = TYPES[i.type];
  return {
    id: "type",
    nav: "types",
    css: (phone) => css(phone, { tall, slides: T.slides, size: T.size }),
    markup: (phone) => page(T, i, phone),
    appOverlay: () => appOverlay(T, i),
    colOverlay: (phone) => (phone ? phoneBar(T, i) : ""),
    state: { d7tab: i.tab, d7tabSet: false, d7tv: i.tv, d7tvOpen: i.tvOpen, d7dv: i.dv, d7dvOpen: i.dvOpen, d7dir: T.directions[i.dv].text, d7preview: i.preview },
    enter: { d7tab: "overview", d7tabSet: false, d7tv: 0, d7tvOpen: false, d7dv: 0, d7dvOpen: false, d7dir: T.directions[0].text, d7preview: false },
    vals: vals(T, i),
  };
}

/* ── Review artboards ──────────────────────────────────────────────────── */

function build(OUT) {
  fs.mkdirSync(OUT, { recursive: true });
  copyTypeImages(OUT);
  const D = 1540;
  const TALL = 1240;
  const TALL_PHONE = 1640;
  const R0 = TALL_PHONE + 140;
  const R = 1040;
  const BOARDS = [
    { file: "Overview", tall: TALL, init: { type: "before", tab: "overview" }, title: "Overview · Desktop", x: 0, y: 0 },
    { file: "OverviewVersions", tall: TALL, init: { type: "before", tab: "overview", tv: 1, tvOpen: true }, title: "Overview, picking a template version · Desktop", x: D, y: 0 },
    { file: "OverviewPhone", phone: true, tall: TALL_PHONE, init: { type: "before", tab: "overview" }, title: "Overview · Phone", x: D * 2, y: 0 },
    { file: "Direction", init: { type: "before", tab: "direction", dir: "proposal" }, title: "Direction, a suggested change · Desktop", x: 0, y: R0 },
    { file: "DirectionFailed", init: { type: "before", tab: "direction", dir: "failed" }, title: "Direction, the reply failed · Desktop", x: D, y: R0 },
    { file: "DirectionPhone", phone: true, init: { type: "before", tab: "direction", dir: "proposal" }, title: "Direction, a suggested change · Phone", x: D * 2, y: R0 },
    { file: "DirectionVersions", init: { type: "before", tab: "direction", dv: 1, dvOpen: true }, title: "Direction, picking a version · Desktop", x: D * 2 + 470, y: R0 },
    { file: "Wiring", init: { type: "quiet", tab: "wiring", wire: "fresh" }, title: "Newly saved, arriving on Wiring · Desktop", x: 0, y: R0 + R },
    { file: "WiringPhone", phone: true, init: { type: "quiet", tab: "wiring", wire: "fresh" }, title: "Newly saved, arriving on Wiring · Phone", x: D, y: R0 + R },
    { file: "Mismatch", init: { type: "quiet", tab: "wiring", wire: "mismatch" }, title: "Cadence does not add up, Wire unavailable · Desktop", x: 0, y: R0 + R * 2 },
    { file: "Running", init: { type: "quiet", tab: "wiring", wire: "running" }, title: "Wiring, the checklist ticking · Desktop", x: D, y: R0 + R * 2 },
    { file: "CheckFailed", init: { type: "quiet", tab: "wiring", wire: "failed" }, title: "A check failed, rolled back · Desktop", x: 0, y: R0 + R * 3 },
    { file: "MediaMissing", init: { type: "quiet", tab: "wiring", wire: "media" }, title: "Media entry missing from n8n · Desktop", x: D, y: R0 + R * 3 },
    { file: "AllTicked", init: { type: "quiet", tab: "wiring", wire: "done" }, title: "Wired, every item ticked · Desktop", x: 0, y: R0 + R * 4 },
    { file: "Preview", init: { type: "quiet", tab: "wiring", wire: "fresh", preview: true }, title: "Preview, what Wire will run · Desktop", x: D, y: R0 + R * 4 },
    { file: "PreviewPhone", phone: true, init: { type: "quiet", tab: "wiring", wire: "fresh", preview: true }, title: "Preview, what Wire will run · Phone", x: D * 2, y: R0 + R * 4 },
  ];
  const artboards = [];
  for (const light of [false, true]) {
    for (const b of BOARDS) {
      const file = `${b.file}${light ? "Light" : ""}.dc.html`;
      const phone = !!b.phone;
      fs.writeFileSync(path.join(OUT, file), artboard({ phone, light, screens: [typeScreen({ init: b.init, tall: b.tall || 0 })], navMode: "note" }));
      artboards.push({ file, title: `D7 · ${b.title}${light ? " · Light" : ""}`, page: light ? "light" : "dark", x: b.x, y: b.y, w: phone ? 390 : 1440, h: b.tall || (phone ? 844 : 900), is_interactive: true });
    }
  }
  const note =
    "Pictures, one per state. The tabs switch, the template's version dropdown works, the direction text can be typed into, and Preview opens its dialog (Escape or X closes either).\n\nBefore & After is wired and posting. Quiet Luxury Picks was just saved from the Studio and is not wired yet. The Overview boards are taller than a screen so the whole page shows.\n\nFrom the first review: the template's slides lead Overview across the full width, one version at a time with Make active; the four numbers are tiles beside the details; the batch table is left-aligned without Ran by, and a row opens that batch; panels side by side end on the same line.\n\nFrom the second review: narrower tiles in the analytics style beside a wider details card, the version showing tinted instead of ticked, and Preview on the phone as a sheet from the bottom. From the third review: the direction's versions use the same dropdown.\n\nStill proposed:\n· Generate stays in the header on every tab; on Direction it steps back to secondary, so Save version is that tab's one accent.\n· The suggestion shows inside the direction itself: removed words struck through, added words underlined.\n· The cadence rebalance is the cadence editor's rule, with its running total and \"too many\" wording.\n· Wire is a hold in the amber tone: it changes the database but deletes nothing.";
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
          { id: "d7-note", page: "dark", x: D * 2 + 470, y: 0, w: 420, text: note },
          { id: "d7-note-light", page: "light", x: D * 2 + 470, y: 0, w: 420, text: note },
        ],
        launch: { view: "canvas", page: "light" },
      },
      null,
      2,
    ),
  );
  console.log(`Wrote D7 artboards to ${OUT}`);
}

if (isMain(import.meta.url)) build(path.resolve(process.argv[2] ?? path.join(HERE, "out")));
