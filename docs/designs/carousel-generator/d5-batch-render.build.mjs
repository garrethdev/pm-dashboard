#!/usr/bin/env node
/*
 * D5 · Batch, render and finish — where Render on D4 lands: every written,
 * unflagged deck is painted one at a time, its slides land on the card as
 * thumbnails, the automatic check reads each slide, and the batch ends with a
 * count of what went into the pool and a way into Inventory.
 *
 * Design step only (docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md, D5). Nothing
 * here is app code. The shell (menu, top bar, glow, both themes, phone drawer,
 * prototype note) comes from generator-kit.mjs; this file is the screen. All
 * content is made-up sample data. Rendered slides are bank photos from the
 * Supabase image store (Garreth, 2026-09-15: real images, not tinted blocks)
 * with the deck's own copy on top, never real renders.
 *
 * The deck card is D4's card, kept in shape: D4's styles (which carry D3's)
 * are imported and re-scoped to this screen rather than copied, so the three
 * cannot drift. Proposed here, for review:
 *   - Once a deck starts rendering, its copy box becomes the slide grid: one
 *     3:4 slot per slide, empty until that slide lands. The copy is on the
 *     slides themselves and in the full-size preview, so the card does not
 *     grow. Caption and music stay under the grid.
 *   - The check's hit is a red outline on that thumbnail, and the card takes
 *     D3's flagged outline with the reason in a red pill ("Slide 4: cut-off
 *     text"). Flagged decks from the review keep their copy and red outline
 *     and are skipped; both kinds count in "flagged" and ring the bell.
 *   - Regenerate stays the full-width button at the bottom of every card
 *     (D4's rule), unavailable while the deck is queued or rendering; a deck
 *     sent back says Rewriting, its slots empty again, and re-renders after.
 *   - Failed: "Failed on slide 5" in the pill, that slot outlined with a
 *     warning, Retry at the bottom; the rest of the batch carries on.
 *   - Pressing a thumbnail opens the full-size preview: the slide at real
 *     3:4 shape with "3 of 7", arrows on the desktop (also the arrow keys), a
 *     swipe on the phone, the check's reason under a flagged slide, and an
 *     empty shape for a slide not rendered yet. Escape or the X closes it.
 *   - Finished (Garreth, 2026-09-15): "12 of 12 rendered · 5 flagged" with
 *     Approve (n) decks as the accent (flips scheduler_ready, the flag the
 *     Smart Scheduler reads; the only Approve in the generator, since D4's was
 *     dropped on 2026-09-14) and Regenerate (n) decks for the flagged ones.
 *     Approve works while flagged decks remain; approved decks say Approved
 *     and lose Regenerate. On the phone Approve sits in the bottom bar and Regenerate
 *     (n) under the title; the count and track stay under the top bar as on
 *     D3. There is no Inventory link: the text gate ran at writing, so what
 *     Approve flips is postable at once.
 *   - A view switch opposite the title (Garreth, 2026-09-15): Grid is the
 *     card grid; Rows puts one deck per row, the caption, music and
 *     Regenerate in a 28% column on the left and the slides larger on the
 *     right, scrolling sideways when they do not fit. On the phone the row
 *     stacks: the left block above the strip.
 *
 * Run directly, it writes D5's review artboards and canvas.json, each twice
 * (Dark page, Light page), plus a note keying each card-states board:
 *   CardStates          desktop, one deck per card state
 *   Main                desktop, 4 of 12 rendered, deck 5 rendering
 *   Phone               phone, the top of the same batch
 *   PhoneRendering      phone, scrolled to the deck being rendered
 *   Preview             desktop, the full-size preview on deck 2, slide 3
 *   PreviewFlagged      desktop, the preview on deck 4's flagged slide 4
 *   PhonePreview        phone, the same flagged slide
 *   PhonePreviewEmpty   phone, a slide not rendered yet
 *   Trouble             desktop, one deck rendering elsewhere, one failed
 *   PhoneFailed         phone, scrolled to the failed deck
 *   Finished            desktop, every deck rendered: Approve 10, Regenerate 5
 *   PhoneFinished       phone, the same, Approve in the bottom bar
 *   Approved            desktop, after Approve: 10 approved, 5 still flagged
 *   Rows                desktop, the same batch as Main in the Rows view
 *   PhoneRows           phone, the Rows view, stacked
 * Imported, `renderScreen({ auto: true })` is the screen the prototype opens.
 *
 *   node docs/designs/carousel-generator/d5-batch-render.build.mjs <out dir>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { I, icon, artboard, isMain } from "./generator-kit.mjs";
import { reviewScreen } from "./d4-batch-review.build.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const D5I = {
  music: icon("MusicNotes", 12),
  warn: icon("Warning", 12),
  warnLg: icon("Warning", 18),
  retry: icon("ArrowClockwise", 12, "bold"),
  prev: icon("CaretLeft", 16, "bold"),
  next: icon("CaretRight", 16, "bold"),
  x: icon("X", 16, "bold"),
  arrow: icon("ArrowUpRight", 14, "bold"),
  grid: icon("SquaresFour", 14, "bold"),
  rows: icon("Rows", 14, "bold"),
};

/* ── Sample content ────────────────────────────────────────────────────── */

/* D3's invented "Before & After" copy, so a deck reads the same on every screen. */
const HOOKS = [
  "Six months of drinking water before coffee",
  "I stopped skipping sunscreen and my skin noticed",
  "The mirror didn't change overnight, but it changed",
  "Same bathroom, same light, one habit apart",
  "What ten o'clock bedtimes did to my face in ninety days, photographed every single Sunday morning",
  "Before: tired. After: still busy, less tired",
  "The walk I almost didn't take, every day",
  "My friends asked what I changed. It was sleep",
  "One boring change I kept for a whole winter",
  "Day 1 versus day 120 of the same routine",
  "No filter, no new products, just time",
  "The habit that took four minutes a night",
];
const LINES = [
  "Week one felt like nothing was happening",
  "I took the same photo every Sunday",
  "Same window, same time, no filter",
  "Month two is where most people quit",
  "Some weeks I forgot, and started again the next day without making it a big deal",
  "The change was slow enough to miss",
  "Until I put the photos side by side",
  "I didn't buy anything new for this",
  "Consistency beat every shortcut I tried",
  "The after photo isn't perfect, it's honest",
  "Pick one habit and give it ninety days",
  "Your mirror will tell you before anyone else",
  "Small enough to do on a bad day",
  "People noticed before I did",
];
const CAPTIONS = [
  "Ninety days, one habit, zero filters. Which one would you try first?",
  "Photos taken in the same spot every week. What would you change first?",
  "Not a transformation, just a habit that stuck. What's yours?",
  "Same light, same mirror, four months apart. Would you have noticed?",
];
/* Slide backgrounds: bank photos from the Supabase image store, cropped to the slide's 3:4 shape and downsampled
   (Garreth, 2026-09-15). Ten neutral lifestyle shots plus one before and one after, so a deck reads as a real one. */
const SLIDE_IMAGES = ["mug", "journal", "vanity", "shoes", "yoga", "dock", "serum", "oats", "bath", "shower", "before", "after"];
export function copySlides(OUT) {
  for (const id of SLIDE_IMAGES) fs.copyFileSync(path.join(HERE, "assets", `d5-slide-${id}.jpg`), path.join(OUT, `d5-slide-${id}.jpg`));
}
/* Slots drawn per card: slides 1 to 10, shown up to the type's slide count. */
const SLOTS = 10;
const ROWS = 9;
/* What the automatic check can say about a slide (F3 step 4). */
const CHECK = { cut: "cut-off text", long: "text too long", contrast: "poor contrast" };
const REVIEW_FLAG = "Compliance: brand name";
/* A deck. st: queued | rendering | rendered | flagged (from the review, skipped) | elsewhere | failed | rewriting.
   done: slides landed. check: { k, why } when the automatic check flagged a slide. failSlide: the slide a failed
   render stopped on. freshK: the slide that just landed. */
/* st also takes "approved" once Approve (n) decks has flipped the deck. */
const BASE = { st: "queued", done: 0, check: null, failSlide: 0, flag: "", freshK: 0, retried: false, wait: 0, fb: false, scope: 0, note: "", taFocus: false, kbd: false };

/* ── Styles ────────────────────────────────────────────────────────────── */

const PV_W = { desk: 480, phone: 342 };

function css(phone, { tall }) {
  const S = ".screen-render";
  /* D4's card and page (which carry D3's), re-scoped to this screen. */
  const d4 = reviewScreen({ tall })
    .css(phone)
    .replaceAll(".screen-review", S)
    .replace("/* ── D3's card and page, re-scoped for D4 ── */", "/* ── D3's card and page, re-scoped for D5 ── */")
    .replace("/* ── D4 page ── */", "/* ── D4's additions, re-scoped for D5 ── */");
  const w = phone ? PV_W.phone : PV_W.desk;
  return `${d4}
/* ── D5 page ── */
/* The slide grid takes the copy box's place once a deck starts rendering: the same fixed height, so the caption's
   rule and the footer still line up with a card that shows copy. No fade: thumbnails are not text that runs on. */
${S} .dcopy.slides { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; align-content: start; padding: 4px; margin: -4px; -webkit-mask-image: none; mask-image: none; }
${S} .th { position: relative; display: block; width: 100%; aspect-ratio: 3 / 4; overflow: hidden; border-radius: 8px; background: var(--card-raised); container-type: inline-size;
  transition: transform 160ms var(--ease-out-strong); }
${S} .th:active { transform: scale(0.97); }
${S} .th:focus-visible { outline-offset: 2px; }
${S} .th.is-still { cursor: default; }
${S} .th .tn { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-muted); opacity: 0.6; }
${S} .th .tw { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--danger); }
/* The slot the painter is on pulses like a writing deck; the rest of the empty slots hold still. */
${S} .th.is-landing { animation: d3-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
/* The check's hit, and a failed slide: a red ring on that thumbnail, drawn just inside its edge so the grid's
   clipping can never cut it (Garreth, 2026-09-15). It sits above the photo, below nothing. */
${S} .th.is-flag::before, ${S} .th.is-fail::before { content: ""; position: absolute; inset: 0; z-index: 2; border: 2px solid var(--danger); border-radius: inherit; pointer-events: none; }
/* A rendered slide: a bank photo carrying the slide's copy, sized to its container so the same markup serves the
   thumbnail and the full-size preview. Renders are images, so they look the same in both themes. A soft darkening
   over the photo keeps the white copy readable, the way the painter's own renders do. */
${S} .rs { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8%; text-align: center; background-size: cover; background-position: center; }
${S} .rs::after { content: ""; position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0, 0, 0, 0.22), rgba(0, 0, 0, 0.12) 45%, rgba(0, 0, 0, 0.5)); pointer-events: none; }
/* The photos, named here in full: the canvas swaps a file name for the stored picture only where the name is written
   out in the source, so the slide picks one of these classes rather than building the name at runtime. */
${SLIDE_IMAGES.map((id) => `${S} .img-${id} { background-image: url(./d5-slide-${id}.jpg); }`).join("\n")}
${S} .rt { position: relative; z-index: 1; max-width: 100%; margin: 0; font-size: 9.5cqw; line-height: 1.15; font-weight: 700; letter-spacing: -0.01em; color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45); text-wrap: balance; overflow-wrap: anywhere; }
${S} .rt--hook { font-size: 11.5cqw; }
/* The three things the check catches, drawn as they would look: text running past the bottom edge, text filling
   more than two thirds of the slide, and white text on a pale image. */
${S} .rs.is-cut { justify-content: flex-end; padding-bottom: 0; }
${S} .rs.is-cut .rt { transform: translateY(30%); }
${S} .rs.is-long { padding: 6%; }
${S} .rs.is-long .rt { font-size: 10cqw; }
${S} .rs.is-contrast::after { background: linear-gradient(to bottom, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.2)); }
${S} .th.is-fresh .rs { animation: d3-arrive 220ms var(--ease-out-strong); }
/* A card sent back for a rewrite: its slots empty again. */
${S} .deck.is-rewriting .th, ${S} .deck.is-queued .th, ${S} .deck.is-elsewhere .th { cursor: default; }

/* The view switch, opposite the title: FilterPills' segmented shape (D4's slide picker), with an icon per view. */
${S} .view { display: flex; align-items: center; gap: 2px; flex-shrink: 0; border-radius: 999px; background: var(--card-raised); padding: 2px; }
${S} .view button { position: relative; display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 4px 12px; font-size: 12px; line-height: 16px; font-weight: 500; white-space: nowrap; color: var(--text-muted); transition: color 150ms var(--ease), background-color 150ms var(--ease); }
${S} .view button:not(.is-on):hover { color: var(--text-primary); }
${S} .view button.is-on { background: var(--accent); color: var(--bg); }
.is-light ${S} .view button.is-on { color: #ffffff; }

/* Rows: one deck per row. The card becomes a two-column grid, the deck's number, pills, caption, music, feedback
   and Regenerate on the left (28%, never under 240px), the slides on the right at a larger size, in a strip that
   scrolls sideways when the type has more slides than fit. The fade on the strip's right edge is the cue. */
${S} .grid.is-rows { grid-template-columns: minmax(0, 1fr); }
${S} .is-rows .deck { display: grid; grid-template-columns: minmax(240px, 28%) minmax(0, 1fr); grid-template-rows: auto auto auto 1fr auto; column-gap: 20px;
  grid-template-areas: "top body" "meta body" "fb body" ". body" "act body"; }
${S} .is-rows .dtop { grid-area: top; }
${S} .is-rows .dbody { grid-area: body; align-self: start; min-width: 0; }
${S} .is-rows .dmeta { grid-area: meta; }
${S} .is-rows .dfb { grid-area: fb; }
${S} .is-rows .dact { grid-area: act; margin-top: 0; }
${S} .is-rows .dcap { height: auto; max-height: 92px; }
${S} .is-rows .dcopy.slides { display: flex; height: auto; gap: 8px; overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x proximity; padding: 4px 24px 4px 4px; margin: -4px;
  -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 24px), transparent); mask-image: linear-gradient(to right, #000 calc(100% - 24px), transparent); }
${S} .is-rows .th { width: 168px; flex: 0 0 168px; scroll-snap-align: start; }
/* A deck the review flagged keeps its copy: on the right, at a readable measure, no fixed height. */
${S} .is-rows .dcopy:not(.slides) { max-width: 560px; height: auto; max-height: 300px; }

/* The progress line: counts on the left, and once the batch is finished the way into Inventory on the right. */
${S} .pstat .pmeta { color: var(--text-muted); }
${S} .pill--ok { color: var(--ok); }
${S} .pacts .btn2--line { padding: 9px 16px; font-size: 13px; }
${S} .pelse { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; line-height: 20px; color: var(--text-muted); }
${S} .pelse b { font-weight: 500; color: var(--text-primary); }

/* Full-size preview: the rendered deck at real slide shape, one slide at a time, over everything. A modal, so it
   stays centred rather than growing from the thumbnail. */
${S} .pv { position: absolute; inset: 0; z-index: 80; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px 16px; }
${S} .pvscrim { position: absolute; inset: 0; background: var(--scrim); -webkit-backdrop-filter: var(--scrim-blur); backdrop-filter: var(--scrim-blur); animation: d3-fade 150ms linear; }
${S} .pvbody { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 12px; outline: none; animation: d5-in 200ms var(--ease-out-strong); }
@keyframes d5-in { from { opacity: 0; transform: scale(0.97); } }
${S} .pvhead { display: flex; align-items: center; gap: 12px; width: ${w}px; }
${S} .pvtitle { font-size: 14px; line-height: 20px; font-weight: 600; }
${S} .pvcount { margin-left: auto; font-size: 13px; line-height: 20px; color: var(--text-muted); }
${S} .pvrow { display: flex; align-items: center; gap: 16px; }
${S} .pvslide { position: relative; width: ${w}px; aspect-ratio: 3 / 4; flex-shrink: 0; overflow: hidden; border-radius: 16px; background: var(--card-raised); container-type: inline-size; box-shadow: var(--sb-shadow);
  touch-action: pan-y; transition: transform 220ms var(--ease-out-strong), opacity 220ms var(--ease-out-strong); }
${S} .pvslide.is-drag { transition: none; }
${S} .pvslide .tn { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 20px; line-height: 28px; font-weight: 500; color: var(--text-muted); opacity: 0.6; }
${S} .pvslide .tw { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--danger); }
${S} .pvslide.is-flag { box-shadow: 0 0 0 2px var(--danger), var(--sb-shadow); }
${S} .pvslide.is-fail { box-shadow: 0 0 0 2px var(--danger), var(--sb-shadow); }
/* Previous and next: D4's version arrows, always showing here, unavailable past either end. */
${S} .pvnav { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex-shrink: 0; border-radius: 999px; border: 1px solid var(--border); background: var(--card-raised); color: var(--text-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35); transition: transform 160ms var(--ease-out-strong), opacity 150ms var(--ease); }
${S} .pvnav:active:not(:disabled) { transform: scale(0.94); }
${S} .pvnav:disabled { opacity: 0.4; cursor: not-allowed; }
.is-light ${S} .pvnav { box-shadow: none; }
/* Under the slide: the check's reason when it flagged this slide. The row keeps its height either way, so the slide
   never jumps between a flagged slide and a clean one. */
${S} .pvfoot { display: flex; align-items: center; justify-content: center; min-height: 24px; width: ${w}px; }
${S} .pvfoot .pill--danger { display: inline-flex; gap: 6px; }
${S} .pvclose { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; flex-shrink: 0; border-radius: 999px; color: var(--text-muted); transition: color 150ms var(--ease), background-color 150ms var(--ease); }
${S} .pvclose:hover { background: var(--card-raised); color: var(--text-primary); }
${
  phone
    ? `
/* Phone: the count and its track stay under the top bar, as on D3; the bottom bar holds the batch's action once
   there is one (Open Inventory), like Continue on D3. Swipe moves between slides in the preview. */
${S} .prog { display: block; }
${S} .pacts { display: none; }
${S} .pvnav { display: none; }
${S} .pv { padding: 16px; }
${S} .pvclose::after, ${S} .th::after { content: ""; position: absolute; inset: -6px; }
${S} .th::after { inset: -3px; }
/* Rows on the phone: the left block sits above the strip, and the strip scrolls under the finger. */
${S} .is-rows .deck { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto auto auto auto; grid-template-areas: "top" "body" "meta" "fb" "act"; row-gap: 0; }
${S} .is-rows .dbody { margin-bottom: 12px; }
${S} .is-rows .th { width: 150px; flex-basis: 150px; }
${S} .view button::after { content: ""; position: absolute; inset: -10px 0; }
`
    : ""
}
@media (prefers-reduced-motion: reduce) {
  ${S} .th.is-landing { animation: none; opacity: 0.7; }
  ${S} .th.is-fresh .rs, ${S} .pvbody { animation: d3-fade 150ms linear; }
  ${S} .th, ${S} .pvnav, ${S} .view button { transition: none; }
  ${S} .pvslide { transition: opacity 150ms linear; }
}
`;
}

/* ── Markup ────────────────────────────────────────────────────────────── */

/* A slide, thumbnail or full size: empty shape, warning, or the render. */
const slideFace = (p) => `
                      <sc-if value="{{${p}.empty}}" hint-placeholder-val="{{ false }}"><span class="tn tnum" aria-hidden="true">{{${p}.k}}</span></sc-if>
                      <sc-if value="{{${p}.failed}}" hint-placeholder-val="{{ false }}"><span class="tw" aria-hidden="true">${D5I.warnLg}</span></sc-if>
                      <sc-if value="{{${p}.done}}" hint-placeholder-val="{{ true }}"><span class="rs {{${p}.rsCls}} {{${p}.imgCls}}" aria-hidden="true"><span class="rt {{${p}.rtCls}}">{{${p}.text}}</span></span></sc-if>`;

const slotGrid = () => `
                  <div class="dcopy slides" role="list" aria-label="{{c.slidesLabel}}">
                    <sc-for list="{{c.slots}}" as="t" hint-placeholder-count="7">
                      <button type="button" class="th {{t.cls}}" role="listitem" aria-label="{{t.label}}" disabled="{{t.off}}" onClick="{{t.open}}">${slideFace("t")}
                      </button>
                    </sc-for>
                  </div>`;

/* A deck the review flagged keeps its copy, as on D4, read-only. */
const copyRows = () =>
  Array.from(
    { length: ROWS },
    (_, k) => `<sc-if value="{{c.s${k}}}" hint-placeholder-val="{{ ${k < 6} }}"><li><span class="dn tnum">${k + 2}</span><span class="dt">{{c.t${k}}}</span></li></sc-if>`,
  ).join("");

const scopeChips = () =>
  Array.from(
    { length: 10 },
    (_, j) =>
      `<sc-if value="{{c.sv${j + 1}}}" hint-placeholder-val="{{ ${j < 7} }}"><button type="button" role="radio" class="tnum {{c.scc${j + 1}}}" aria-checked="{{c.sca${j + 1}}}"${j ? ` aria-label="Slide ${j + 1}"` : ""} onClick="{{c.pick${j + 1}}}">${j ? j + 1 : "Hook"}</button></sc-if>`,
  ).join("");

const deckCard = () => `
            <article class="deck {{c.cls}}" id="deck-{{c.n}}" tabindex="0" aria-label="{{c.label}}" aria-keyshortcuts="J K" aria-busy="{{c.busy}}">
              <div class="dtop">
                <span class="dno tnum">{{c.label}}</span>
                <span class="dpills">
                  <sc-if value="{{c.pillQueued}}" hint-placeholder-val="{{ false }}"><span class="pill">Queued</span></sc-if>
                  <sc-if value="{{c.pillRendering}}" hint-placeholder-val="{{ false }}"><span class="pill pill--accent tnum">{{c.renderingText}}</span></sc-if>
                  <sc-if value="{{c.pillRendered}}" hint-placeholder-val="{{ true }}"><span class="pill">Rendered</span></sc-if>
                  <sc-if value="{{c.pillCheck}}" hint-placeholder-val="{{ false }}"><span class="pill pill--danger tnum">{{c.checkText}}</span></sc-if>
                  <sc-if value="{{c.pillFlag}}" hint-placeholder-val="{{ false }}"><span class="pill pill--danger">{{c.flag}}</span></sc-if>
                  <sc-if value="{{c.pillElsewhere}}" hint-placeholder-val="{{ false }}"><span class="pill">Rendering elsewhere</span></sc-if>
                  <sc-if value="{{c.pillFailed}}" hint-placeholder-val="{{ false }}"><span class="pill pill--danger tnum">{{c.failedText}}</span></sc-if>
                  <sc-if value="{{c.pillRewriting}}" hint-placeholder-val="{{ false }}"><span class="pill pill--accent">Rewriting</span></sc-if>
                  <sc-if value="{{c.pillApproved}}" hint-placeholder-val="{{ false }}"><span class="pill pill--ok">Approved</span></sc-if>
                </span>
              </div>
              <div class="dbody">
                <sc-if value="{{c.showSlots}}" hint-placeholder-val="{{ true }}">${slotGrid()}</sc-if>
                <sc-if value="{{c.showCopy}}" hint-placeholder-val="{{ false }}">
                  <div class="dcopy" tabindex="0" role="region" aria-label="{{c.copyLabel}}">
                    <p class="dhook">{{c.hook}}</p>
                    <ol class="dslides">${copyRows()}</ol>
                  </div>
                </sc-if>
              </div>
              <div class="dmeta">
                <p class="dcap">{{c.caption}}</p>
                <div class="dfoot">
                  <div class="dmusic" title="{{c.trackName}}">${D5I.music}<span>{{c.trackName}}</span></div>
                </div>
              </div>
              <sc-if value="{{c.fb}}" hint-placeholder-val="{{ false }}">
                <div class="dfb">
                  <div class="scope" role="radiogroup" aria-label="{{c.scopeLabel}}">
                    <button type="button" role="radio" class="{{c.scc0}}" aria-checked="{{c.sca0}}" onClick="{{c.pick0}}">Deck</button>${scopeChips()}
                  </div>
                  <textarea class="{{c.taCls}}" rows="3" aria-label="{{c.fbLabel}}" placeholder="{{c.fbPh}}" value="{{c.note}}" onChange="{{c.type}}"></textarea>
                  <div class="dfbact">
                    <button type="button" class="tbtn" onClick="{{c.cancel}}">Cancel</button>
                  </div>
                </div>
              </sc-if>
              <sc-if value="{{c.showDact}}" hint-placeholder-val="{{ true }}">
                <div class="dact">
                  <sc-if value="{{c.showRegen}}" hint-placeholder-val="{{ true }}"><button type="button" class="btn2 btn2--line btn2--full" onClick="{{c.regen}}">${D5I.retry}Regenerate</button></sc-if>
                  <sc-if value="{{c.fb}}" hint-placeholder-val="{{ false }}"><button type="button" class="btn2 btn2--line btn2--full" onClick="{{c.submit}}">${D5I.retry}{{c.submitText}}</button></sc-if>
                  <sc-if value="{{c.showRetry}}" hint-placeholder-val="{{ false }}"><button type="button" class="btn2 btn2--line btn2--full" onClick="{{c.retry}}">${D5I.retry}Retry</button></sc-if>
                  <sc-if value="{{c.regenOff}}" hint-placeholder-val="{{ false }}"><button type="button" class="btn2 btn2--line btn2--full" disabled="{{c.regenOff}}">${D5I.retry}Regenerate</button></sc-if>
                </div>
              </sc-if>
            </article>`;

/* The finished batch's two actions: Regenerate the flagged decks, Approve the clean ones (Garreth, 2026-09-15). */
const regenAllButton = `<sc-if value="{{rnShowRegenAll}}" hint-placeholder-val="{{ true }}"><button type="button" class="btn2 btn2--line tnum" onClick="{{rnRegenAll}}">${D5I.retry}{{rnRegenAllText}}</button></sc-if>`;
const approveButton = `<sc-if value="{{rnShowApprove}}" hint-placeholder-val="{{ true }}"><button type="button" class="cta tnum" onClick="{{rnApprove}}">{{rnApproveText}}</button></sc-if>`;

function page(phone) {
  return `
      <main class="main">
        <div class="page">
          <div class="phead">
            <button type="button" class="upcrumb" onClick="{{rnBack}}">${I.backSm}Carousel types</button>
            <div class="ptitle">
              <h1>{{rnName}}</h1>
              <div class="view" role="radiogroup" aria-label="Layout">
                <button type="button" role="radio" class="{{rnGridCls}}" aria-checked="{{rnGridOn}}" onClick="{{rnSetGrid}}">${D5I.grid}Grid</button>
                <button type="button" role="radio" class="{{rnRowsCls}}" aria-checked="{{rnRowsOn}}" onClick="{{rnSetRows}}">${D5I.rows}Rows</button>
              </div>
            </div>
            ${phone ? `<sc-if value="{{rnDone}}" hint-placeholder-val="{{ false }}"><div class="pbatch">${regenAllButton}</div></sc-if>` : ""}
          </div>
          <div class="prog">
            <div class="prow">
              <span class="pstat" role="status" aria-live="polite">
                <span class="pcount tnum">{{rnCount}}</span>
                <sc-if value="{{rnShowApproved}}" hint-placeholder-val="{{ false }}"><span class="pmeta tnum">{{rnApprovedText}}</span></sc-if>
                <sc-if value="{{rnShowFlagged}}" hint-placeholder-val="{{ true }}"><button type="button" class="pflag tnum" onClick="{{rnJumpFlag}}">{{rnFlaggedText}}</button></sc-if>
                <sc-if value="{{rnShowFailed}}" hint-placeholder-val="{{ false }}"><span class="pfail tnum">{{rnFailedText}}</span></sc-if>
                <sc-if value="{{rnShowElse}}" hint-placeholder-val="{{ false }}"><span class="pelse"><span><b>{{rnElseDeck}}</b> is rendering elsewhere</span></span></sc-if>
              </span>
              <sc-if value="{{rnDone}}" hint-placeholder-val="{{ false }}">
                <div class="pacts">
                  ${regenAllButton}
                  ${approveButton}
                </div>
              </sc-if>
            </div>
            <div class="track" aria-hidden="true"><i style="width: {{rnTrackW}}%"></i></div>
          </div>
          <div class="grid {{rnLayoutCls}}" onKeyDown="{{rnGridKey}}">
            <sc-for list="{{rnDecks}}" as="c" hint-placeholder-count="9">${deckCard()}
            </sc-for>
          </div>
        </div>
      </main>`;
}

/* The full-size preview, over the whole app. */
const appOverlay = (phone) => `
    <sc-if value="{{pvOpen}}" hint-placeholder-val="{{ false }}">
      <div class="pv">
        <div class="pvscrim" aria-hidden="true" onClick="{{pvClose}}"></div>
        <div class="pvbody" id="pv-dialog" role="dialog" aria-modal="true" aria-label="{{pvLabel}}" tabindex="-1" onKeyDown="{{pvKey}}">
          <div class="pvhead">
            <span class="pvtitle tnum">{{pvDeck}}</span>
            <span class="pvcount tnum" aria-live="polite">{{pvCount}}</span>
            <button type="button" class="pvclose" aria-label="Close preview" onClick="{{pvClose}}">${D5I.x}</button>
          </div>
          <div class="pvrow">
            <button type="button" class="pvnav" aria-label="Previous slide" disabled="{{pvPrevOff}}" onClick="{{pvPrev}}">${D5I.prev}</button>
            <div class="pvslide {{pvCls}}" style="transform: translateX({{pvDragX}}px); opacity: {{pvDragO}}"${
              phone ? ` onPointerDown="{{pvDown}}" onPointerMove="{{pvMove}}" onPointerUp="{{pvUp}}" onPointerCancel="{{pvUp}}"` : ""
            }>${slideFace("pv")}
            </div>
            <button type="button" class="pvnav" aria-label="Next slide" disabled="{{pvNextOff}}" onClick="{{pvNext}}">${D5I.next}</button>
          </div>
          <div class="pvfoot">
            <sc-if value="{{pvFlag}}" hint-placeholder-val="{{ false }}"><span class="pill pill--danger">${D5I.warn}{{pvWhy}}</span></sc-if>
            <sc-if value="{{pvFailed}}" hint-placeholder-val="{{ false }}"><span class="pill pill--danger">${D5I.warn}Render failed on this slide</span></sc-if>
          </div>
        </div>
      </div>
    </sc-if>`;

/* The bell's dot (flagged decks ring it, as designed in D3), and on the phone the finished batch's bottom bar. */
const colOverlay = (phone) => `
    <sc-if value="{{rnBellDot}}" hint-placeholder-val="{{ true }}"><span class="d3-dot" aria-hidden="true"></span></sc-if>
    ${
      phone
        ? `<sc-if value="{{rnShowBar}}" hint-placeholder-val="{{ false }}"><div class="bar">
      <span class="status tnum"><b>{{rnCount}}</b>{{rnBarSub}}</span>
      ${approveButton}
    </div></sc-if>`
        : ""
    }`;

/* ── Behaviour ─────────────────────────────────────────────────────────── */

/* Scroll to a deck when asked (a flagged count, a picture opened part-way down), put the caret in a feedback box
   as it opens, and move focus into the preview as it opens. */
const didUpdate = `
    if (st.d5scroll) {
      var column5 = document.querySelector(".col");
      var card5 = document.getElementById("deck-" + st.d5scroll);
      var app5 = document.querySelector(".app");
      if (column5 && card5) {
        var reduce5 = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        column5.scrollTo({ top: card5.offsetTop - (app5 && app5.offsetWidth < 600 ? 76 : 150), behavior: reduce5 || !this.d5smooth ? "auto" : "smooth" });
      }
      this.d5smooth = true;
      this.setState({ d5scroll: 0 });
    }
    if (st.d5focus) {
      var box5 = document.querySelector("#deck-" + st.d5focus + " textarea");
      if (box5) box5.focus({ preventScroll: true });
      this.setState({ d5focus: 0 });
    }
    if (st.d5focusPv) {
      var dlg5 = document.getElementById("pv-dialog");
      if (dlg5) dlg5.focus({ preventScroll: true });
      this.setState({ d5focusPv: false });
    }`;

function vals({ auto, init }) {
  return `
    var P = s.params || {};
    var AUTO = ${auto};
    var HOOKS = ${JSON.stringify(HOOKS)};
    var LINES = ${JSON.stringify(LINES)};
    var CAPTIONS = ${JSON.stringify(CAPTIONS)};
    var CHECK = ${JSON.stringify(CHECK)};
    var REVIEW_FLAG = ${JSON.stringify(REVIEW_FLAG)};
    var BASE = ${JSON.stringify(BASE)};
    var INIT_SCROLL = ${init.scrollTo || 0};
    var SLIDES = parseInt(P.slides, 10) || 7;
    var NAME = P.name || "Before & After";
    var SONG = "Artist Name – Song Title";
    var PHONE = ctx.PHONE;

    /* Opened from D4: the batch's decks, queued in order; the ones D4 listed as flagged are skipped, the ones
       discarded there are gone. */
    var seed = function (p) {
      var total = Math.min(50, Math.max(1, parseInt((p || {}).total, 10) || parseInt((p || {}).count, 10) || 12));
      var flagList = (p && p.flagged) || [];
      var gone = (p && p.discarded) || [];
      var list = [];
      for (var n = 1; n <= total; n++) {
        if (gone.indexOf(n) >= 0) continue;
        list.push(Object.assign({}, BASE, { n: n }, flagList.indexOf(n) >= 0 ? { st: "flagged", flag: REVIEW_FLAG } : {}));
      }
      return list;
    };
    var decks = s.d5decks || seed(P);
    var current = function () { return (self.state && self.state.d5decks) || decks; };
    var find = function (n) { return current().filter(function (d) { return d.n === n; })[0]; };
    var setDeck = function (n, patch, extra) {
      var next = current().map(function (d) { return d.n === n ? Object.assign({}, d, patch) : d; });
      self.setState(Object.assign({ d5decks: next }, extra || {}));
    };
    /* One feedback box open at a time. */
    var only = function (n, patch, extra) {
      var next = current().map(function (d) { return Object.assign({}, d, { fb: false, kbd: false }, d.n === n ? patch : {}); });
      self.setState(Object.assign({ d5decks: next }, extra || {}));
    };

    /* What a rendered slide shows: the deck's own copy on a bank photo. The hook sits on the before shot on odd
       decks and the after shot on even ones; the other slides walk through the neutral photos. The check's three
       findings are drawn as they would look, so the outline has something to point at. */
    var IMAGES = ${JSON.stringify(SLIDE_IMAGES)};
    var NEUTRAL = IMAGES.slice(0, 10);
    var slideOf = function (d, k) {
      var why = d.check && d.check.k === k ? d.check.why : "";
      var text = k === 1 ? HOOKS[(d.n - 1) % HOOKS.length] : LINES[(d.n * 3 + (k - 2) * 5) % LINES.length];
      if (why === "cut") text = LINES[4];
      if (why === "long") text = LINES[4] + ". " + LINES[(d.n * 3 + 7) % LINES.length];
      var img = k === 1 ? (d.n % 2 ? "before" : "after") : NEUTRAL[(d.n * 3 + k * 7) % NEUTRAL.length];
      if (why === "contrast") img = "vanity";
      return { text: text, imgCls: "img-" + img, rsCls: why ? "is-" + why : "", rtCls: k === 1 ? "rt--hook" : "" };
    };
    var hasSlots = function (d) { return d.st !== "flagged"; };
    var canOpen = function (d) { return d.st === "rendering" || d.st === "rendered" || d.st === "approved" || d.st === "failed"; };
    var isFlagged = function (d) { return d.st === "flagged" || !!d.check; };
    var openPv = function (n, k) { self.setState({ d5pv: { n: n, k: k }, d5focusPv: true, d5drag: null }); };

    /* The prototype's painter, on a timer: one deck at a time, one slide at a time. Deck 7 fails once on slide 5
       (Retry picks it up there); the check flags deck 4's slide 4 and deck 9's slide 6. A deck rendering elsewhere
       lands on its own after a while; a deck sent back rewrites, then queues again. */
    var tick = function () {
      var st = self.state || {};
      if (st.screen !== "render") { clearInterval(self.d5timer); self.d5timer = null; return; }
      var moved = false;
      var cur = (st.d5decks || seed(st.params)).map(function (d) {
        if (d.st === "rendering") {
          moved = true;
          var next = d.done + 1;
          if (d.n === 7 && !d.retried && next === 5) return Object.assign({}, d, { st: "failed", failSlide: 5, freshK: 0 });
          var fin = next >= SLIDES;
          var check = fin ? (d.n === 4 ? { k: 4, why: "cut" } : d.n === 9 ? { k: 6, why: "contrast" } : null) : d.check;
          return Object.assign({}, d, { done: next, freshK: next, st: fin ? "rendered" : "rendering", check: check });
        }
        if (d.st === "elsewhere") { moved = true; return d.wait >= 8 ? Object.assign({}, d, { st: "rendered", done: SLIDES, freshK: 0 }) : Object.assign({}, d, { wait: d.wait + 1 }); }
        if (d.st === "rewriting") { moved = true; return Object.assign({}, d, { st: "queued", done: 0, check: null, freshK: 0 }); }
        return d.freshK ? Object.assign({}, d, { freshK: 0 }) : d;
      });
      if (!cur.some(function (d) { return d.st === "rendering"; })) {
        for (var i = 0; i < cur.length; i++) if (cur[i].st === "queued") { cur[i] = Object.assign({}, cur[i], { st: "rendering" }); moved = true; break; }
      }
      self.setState({ d5decks: cur });
      if (!moved) { clearInterval(self.d5timer); self.d5timer = null; }
    };
    var working = decks.some(function (d) { return d.st === "queued" || d.st === "rendering" || d.st === "elsewhere" || d.st === "rewriting"; });
    if (AUTO && s.screen === "render" && working && !self.d5timer) self.d5timer = setInterval(tick, 480);
    if (INIT_SCROLL && !self.d5scrolled) {
      self.d5scrolled = true;
      setTimeout(function () { self.setState({ d5scroll: INIT_SCROLL }); }, 60);
    }

    /* J and K move between decks, as on D4. Only while a card has focus, never inside a field. */
    var gridKey = function (e) {
      var tag = (e.target && e.target.tagName) || "";
      if (tag === "TEXTAREA" || tag === "INPUT" || e.metaKey || e.ctrlKey || e.altKey) return;
      var key = (e.key || "").toLowerCase();
      if (key !== "j" && key !== "k") return;
      var card = e.target && e.target.closest ? e.target.closest(".deck") : null;
      if (!card) return;
      e.preventDefault();
      var cards = Array.prototype.slice.call(document.querySelectorAll(".screen-render .deck"));
      var i = cards.indexOf(card);
      var to = cards[key === "j" ? Math.min(cards.length - 1, i + 1) : Math.max(0, i - 1)];
      if (to) to.focus();
    };

    var view = decks.map(function (d) {
      var slots = hasSlots(d);
      var busy = d.st === "queued" || d.st === "rendering" || d.st === "elsewhere" || d.st === "rewriting";
      var settled = d.st === "rendered" || d.st === "flagged";
      var approved = d.st === "approved";
      var slideText = function (k) { return k === 1 ? "Slide 1" : "Slide " + k; };
      var o = {
        n: d.n,
        label: "Deck " + d.n,
        copyLabel: "Deck " + d.n + " copy",
        slidesLabel: "Deck " + d.n + " slides",
        fbLabel: "Feedback for deck " + d.n,
        scopeLabel: "What to regenerate in deck " + d.n,
        cls: ["is-" + d.st, d.check ? "is-flagged" : "", d.fb ? "is-editing" : "", d.kbd ? "is-kbd" : ""].join(" "),
        busy: d.st === "rendering" || d.st === "rewriting" ? "true" : "false",
        pillQueued: d.st === "queued",
        pillRendering: d.st === "rendering",
        renderingText: "Rendering " + Math.min(SLIDES, d.done + 1) + " of " + SLIDES,
        pillRendered: d.st === "rendered" && !d.check,
        pillCheck: d.st === "rendered" && !!d.check,
        checkText: d.check ? "Slide " + d.check.k + ": " + CHECK[d.check.why] : "",
        pillFlag: d.st === "flagged",
        flag: d.flag,
        pillElsewhere: d.st === "elsewhere",
        pillFailed: d.st === "failed",
        failedText: "Failed on slide " + d.failSlide,
        pillRewriting: d.st === "rewriting",
        pillApproved: approved,
        showDact: !approved,
        showSlots: slots,
        showCopy: !slots,
        hook: HOOKS[(d.n - 1) % HOOKS.length],
        caption: CAPTIONS[d.n % CAPTIONS.length],
        trackName: SONG,
        slots: [],

        showRegen: settled && !d.fb,
        regenOff: busy && !d.fb,
        showRetry: d.st === "failed",
        regen: function () { only(d.n, { fb: true, scope: d.check ? d.check.k : 0, note: "" }, { d5focus: d.n }); },
        retry: function () { setDeck(d.n, { st: "rendering", done: Math.max(0, d.failSlide - 1), failSlide: 0, retried: true }); },
        fb: d.fb,
        taCls: d.taFocus ? "is-focus" : "",
        note: d.note,
        fbPh: d.scope === 0 ? "Shorter hook, warmer tone" : "Under ten words, no numbers",
        type: function (e) { setDeck(d.n, { note: e.target.value }); },
        cancel: function () { setDeck(d.n, { fb: false }); },
        submitText: d.scope === 0 ? "Regenerate deck" : d.scope === 1 ? "Regenerate hook" : "Regenerate slide " + d.scope,
        /* Sent back with feedback: the deck rewrites (D4), then renders again. */
        submit: function () {
          setDeck(d.n, { fb: false, st: "rewriting", done: 0, check: null, flag: "" });
          if (!AUTO) self.note("Rewrites " + (d.scope === 0 ? "the deck" : d.scope === 1 ? "the hook" : "slide " + d.scope) + " with the feedback, then renders it again");
        },
        scc0: d.scope === 0 ? "is-on" : "",
        sca0: d.scope === 0 ? "true" : "false",
        pick0: function () { setDeck(d.n, { scope: 0 }); }
      };
      for (var k = 1; k <= ${SLOTS}; k++) {
        if (k > SLIDES) break;
        var landed = d.st !== "rewriting" && k <= d.done;
        var failedHere = d.st === "failed" && k === d.failSlide;
        var flaggedHere = !!d.check && d.check.k === k;
        var face = landed ? slideOf(d, k) : { text: "", imgCls: "", rsCls: "", rtCls: "" };
        o.slots.push({
          k: k,
          label: slideText(k) + " of deck " + d.n + (landed ? "" : ", not rendered yet") + (flaggedHere ? ", " + CHECK[d.check.why] : "") + (failedHere ? ", render failed" : ""),
          cls: [landed ? "is-done" : "is-empty", d.st === "rendering" && k === d.done + 1 ? "is-landing" : "", flaggedHere ? "is-flag" : "", failedHere ? "is-fail" : "", d.freshK === k ? "is-fresh" : "", canOpen(d) ? "" : "is-still"].join(" "),
          off: !canOpen(d),
          open: (function (kk) { return function () { if (canOpen(d)) openPv(d.n, kk); }; })(k),
          empty: !landed && !failedHere,
          failed: failedHere,
          done: landed,
          text: face.text, imgCls: face.imgCls, rsCls: face.rsCls, rtCls: face.rtCls
        });
      }
      for (var r = 0; r < ${ROWS}; r++) {
        o["s" + r] = r < SLIDES - 1;
        o["t" + r] = LINES[(d.n * 3 + r * 5) % LINES.length];
      }
      for (var j = 1; j <= 10; j++) {
        o["sv" + j] = j <= SLIDES;
        o["scc" + j] = d.scope === j ? "is-on" : "";
        o["sca" + j] = d.scope === j ? "true" : "false";
        o["pick" + j] = (function (sl) { return function () { setDeck(d.n, { scope: sl }); }; })(j);
      }
      return o;
    });

    /* The counts. "Rendered" counts every deck the painter finished, checked or not, approved or not. Approve takes the
       rendered decks the checks passed; Regenerate (n) takes every flagged one, from the review or from the check. */
    var toRender = decks.filter(function (d) { return d.st !== "flagged"; });
    var rendered = toRender.filter(function (d) { return d.st === "rendered" || d.st === "approved"; });
    var approvable = rendered.filter(function (d) { return d.st === "rendered" && !d.check; });
    var approved = decks.filter(function (d) { return d.st === "approved"; });
    var flagged = decks.filter(isFlagged);
    var failed = toRender.filter(function (d) { return d.st === "failed"; });
    var elsewhere = toRender.filter(function (d) { return d.st === "elsewhere"; })[0];
    var done = toRender.length > 0 && rendered.length === toRender.length;
    var plural = function (n) { return n === 1 ? " deck" : " decks"; };

    /* The preview. */
    var pv = s.d5pv;
    var pvDeck = pv ? find(pv.n) : null;
    var pvK = pv ? Math.max(1, Math.min(SLIDES, pv.k)) : 1;
    var pvLanded = !!pvDeck && pvDeck.st !== "rewriting" && pvK <= pvDeck.done;
    var pvFailed = !!pvDeck && pvDeck.st === "failed" && pvK === pvDeck.failSlide;
    var pvFlag = !!pvDeck && !!pvDeck.check && pvDeck.check.k === pvK;
    var pvFace = pvLanded ? slideOf(pvDeck, pvK) : { text: "", imgCls: "", rsCls: "", rtCls: "" };
    var pvGo = function (k) { if (pv) self.setState({ d5pv: { n: pv.n, k: Math.max(1, Math.min(SLIDES, k)) }, d5drag: null }); };
    var pvClose = function () { self.setState({ d5pv: null, d5drag: null }); };
    var drag = s.d5drag;
    var dx = drag ? Math.round(drag.dx) : 0;
    var priorBell = vals.bell;

    var rows = s.d5view === "rows";

    return {
      rnName: NAME,
      rnBack: function () { ctx.open("types", null, "Back to Carousel types · D1"); },
      /* Grid or Rows: no motion on the switch, the cards simply take their other shape. */
      rnLayoutCls: rows ? "is-rows" : "",
      rnGridCls: rows ? "" : "is-on",
      rnRowsCls: rows ? "is-on" : "",
      rnGridOn: rows ? "false" : "true",
      rnRowsOn: rows ? "true" : "false",
      rnSetGrid: function () { self.setState({ d5view: "grid" }); },
      rnSetRows: function () { self.setState({ d5view: "rows" }); },
      rnDecks: view,
      rnGridKey: gridKey,

      rnCount: rendered.length + " of " + toRender.length + " rendered",
      rnShowApproved: approved.length > 0,
      rnApprovedText: approved.length + " approved",
      rnShowFlagged: flagged.length > 0,
      rnFlaggedText: flagged.length + " flagged",
      rnJumpFlag: function () {
        if (!flagged.length) return;
        var i = (s.d5flag || 0) % flagged.length;
        self.setState({ d5scroll: flagged[i].n, d5flag: i + 1 });
      },
      rnShowFailed: failed.length > 0,
      rnFailedText: failed.length + " failed",
      rnShowElse: !!elsewhere,
      rnElseDeck: elsewhere ? "Deck " + elsewhere.n : "",
      rnTrackW: toRender.length ? Math.round((rendered.length / toRender.length) * 100) : 0,
      rnDone: done,
      rnShowBar: done && (approvable.length > 0 || approved.length > 0),
      rnBarSub: approved.length ? approved.length + " approved" : flagged.length ? flagged.length + " flagged" : "",
      /* Regenerate (n) decks: every flagged deck goes back to be rewritten (the gate runs again), then renders again. */
      rnShowRegenAll: done && flagged.length > 0,
      rnRegenAllText: "Regenerate " + flagged.length + plural(flagged.length),
      rnRegenAll: function () {
        var next = current().map(function (d) { return isFlagged(d) ? Object.assign({}, d, { st: "rewriting", done: 0, check: null, flag: "", fb: false }) : d; });
        self.setState({ d5decks: next });
        if (!AUTO) self.note("Rewrites the " + flagged.length + " flagged" + plural(flagged.length) + " with the gate's suggestions, then renders them again");
      },
      /* Approve (n) decks: the sign-off. Flips scheduler_ready, the flag the Smart Scheduler reads, on every clean, rendered deck. */
      rnShowApprove: done && approvable.length > 0,
      rnApproveText: "Approve " + approvable.length + plural(approvable.length),
      rnApprove: function () {
        var n = approvable.length;
        var next = current().map(function (d) { return d.st === "rendered" && !d.check ? Object.assign({}, d, { st: "approved", fb: false }) : d; });
        self.setState({ d5decks: next });
        self.note("Approved " + n + plural(n) + ": the Smart Scheduler will post them");
      },

      pvOpen: !!pv,
      pvLabel: pv ? "Deck " + pv.n + ", slide " + pvK + " of " + SLIDES : "",
      pvDeck: pv ? "Deck " + pv.n : "",
      pvCount: pvK + " of " + SLIDES,
      pvCls: [pvFlag ? "is-flag" : "", pvFailed ? "is-fail" : "", drag ? "is-drag" : ""].join(" "),
      pvDragX: dx,
      pvDragO: Math.round((1 - Math.min(0.45, Math.abs(dx) / 260)) * 100) / 100,
      pv: { k: pvK, empty: !pvLanded && !pvFailed, failed: pvFailed, done: pvLanded, text: pvFace.text, imgCls: pvFace.imgCls, rsCls: pvFace.rsCls, rtCls: pvFace.rtCls },
      pvFlag: pvFlag,
      pvWhy: pvFlag ? CHECK[pvDeck.check.why].charAt(0).toUpperCase() + CHECK[pvDeck.check.why].slice(1) : "",
      pvFailed: pvFailed,
      pvPrevOff: pvK <= 1,
      pvNextOff: pvK >= SLIDES,
      pvPrev: function () { pvGo(pvK - 1); },
      pvNext: function () { pvGo(pvK + 1); },
      pvClose: pvClose,
      /* Arrow keys move between slides, Escape closes: no motion on either, they are pressed over and over. */
      pvKey: function (e) {
        if (e.key === "Escape") { e.preventDefault(); pvClose(); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); pvGo(pvK - 1); }
        else if (e.key === "ArrowRight") { e.preventDefault(); pvGo(pvK + 1); }
      },
      /* Phone: the slide follows the finger sideways and settles when the finger lifts; past either end it only gives a little. */
      pvDown: function (e) {
        self.d5sw = { x: e.clientX, t: Date.now() };
        if (e.currentTarget && e.currentTarget.setPointerCapture) { try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {} }
      },
      pvMove: function (e) {
        var g = self.d5sw;
        if (!g) return;
        var mx = e.clientX - g.x;
        if ((mx > 0 && pvK <= 1) || (mx < 0 && pvK >= SLIDES)) mx = mx * 0.2;
        self.setState({ d5drag: { dx: mx } });
      },
      pvUp: function (e) {
        var g = self.d5sw; self.d5sw = null;
        if (!g) return;
        var mx = e.clientX - g.x;
        var flick = Math.abs(mx) / Math.max(1, Date.now() - g.t) > 0.11;
        var to = pvK;
        if (Math.abs(mx) > 8 && (Math.abs(mx) > 64 || flick)) {
          if (mx < 0 && pvK < SLIDES) to = pvK + 1;
          if (mx > 0 && pvK > 1) to = pvK - 1;
        }
        pvGo(to);
      },

      rnBellDot: flagged.length > 0,
      bell: function () {
        if (s.screen === "render") self.note("Flagged decks ring the bell · designed in D3");
        else if (priorBell) priorBell();
      }
    };`;
}

/**
 * D5 as a screen. `auto` runs the painter on a timer (the prototype). `init`
 * is the moment a review picture shows.
 */
export function renderScreen({ auto = false, tall = 0, init = {} } = {}) {
  return {
    id: "render",
    nav: "types",
    css: (phone) => css(phone, { tall }),
    markup: page,
    appOverlay,
    colOverlay,
    state: {
      d5decks: init.decks || null,
      d5pv: init.pv || null,
      d5view: init.view || "grid",
      d5drag: init.drag || null,
      d5scroll: 0,
      d5focus: 0,
      d5focusPv: false,
      d5flag: 0,
    },
    /* Opened from another screen: the batch from its params, everything queued. The view chosen last time stays. */
    enter: { d5decks: null, d5pv: null, d5drag: null, d5scroll: 0, d5focus: 0, d5focusPv: false, d5flag: 0 },
    vals: vals({ auto, init }),
    didUpdate,
  };
}

/* ── Review artboards ──────────────────────────────────────────────────── */

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const decks = (spec, total = 15) => range(1, total).map((n) => ({ ...BASE, n, ...(spec[n] || {}) }));
const rendered = (check) => ({ st: "rendered", done: 7, check: check || null });
const reviewFlag = { st: "flagged", flag: REVIEW_FLAG };
const renderedTo = (k, from = 1) => Object.fromEntries(range(from, k).map((n) => [n, rendered()]));

/* The batch as it comes from D4: fifteen decks, three of them flagged in the review and skipped. */
const SKIPPED = { 6: reviewFlag, 11: reviewFlag, 14: reviewFlag };
/* Rendering: decks 1 to 4 done (the check caught deck 4's slide 4), deck 5 on its fourth slide, the rest queued. */
const MAIN = { ...renderedTo(4), 4: rendered({ k: 4, why: "cut" }), 5: { st: "rendering", done: 3 }, ...SKIPPED };
/* Trouble: deck 3's claim went to someone else's painter, deck 5 failed on slide 5, deck 7 is on its third slide. */
const TROUBLE = { ...renderedTo(4), 3: { st: "elsewhere" }, 5: { st: "failed", done: 4, failSlide: 5 }, 7: { st: "rendering", done: 2 }, ...SKIPPED };
/* Finished: every deck rendered; the check caught two, so ten went into the pool. */
const FINISHED = { ...renderedTo(15), 4: rendered({ k: 4, why: "cut" }), 9: rendered({ k: 6, why: "contrast" }), ...SKIPPED };
/* After Approve: the ten clean decks approved, the five flagged ones still waiting for Regenerate. */
const APPROVED = Object.fromEntries(Object.entries(FINISHED).map(([n, d]) => [n, d.st === "rendered" && !d.check ? { ...d, st: "approved" } : d]));

/* One deck per card state, in reading order. The key beside the board names them. */
const CARD_STATES = [
  [{ st: "queued" }, "Queued: empty slots, still"],
  [{ st: "rendering", done: 3 }, "Rendering: three slides landed, the fourth slot pulsing"],
  [rendered(), "Rendered"],
  [rendered({ k: 4, why: "cut" }), "Rendered, the check flagged slide 4: cut-off text (outline on the thumbnail, red pill, red outline)"],
  [rendered({ k: 6, why: "contrast" }), "Rendered, the check flagged slide 6: poor contrast"],
  [rendered({ k: 2, why: "long" }), "Rendered, the check flagged slide 2: text too long"],
  [reviewFlag, "Flagged in the review, skipped: keeps its copy and red outline, never rendered"],
  [{ st: "elsewhere" }, "Rendering elsewhere: the claim went to another painter; refreshes when that finishes"],
  [{ st: "failed", done: 4, failSlide: 5 }, "Failed on slide 5: that slot outlined, Retry at the bottom"],
  [{ ...rendered({ k: 4, why: "cut" }), fb: true, scope: 4, note: "Cut the last line", taFocus: true }, "Regenerate open on the flagged slide (slide 4 picked for it)"],
  [{ st: "rewriting" }, "Rewriting: sent back with feedback, its slots empty again until it renders"],
  [{ ...rendered(), kbd: true }, "Selected with the keyboard (J / K)"],
];

const MOMENTS = {
  cards: { decks: decks(Object.fromEntries(CARD_STATES.map(([spec], i) => [i + 1, spec])), CARD_STATES.length) },
  main: { decks: decks(MAIN) },
  preview: { decks: decks(MAIN), pv: { n: 2, k: 3 } },
  previewFlagged: { decks: decks(MAIN), pv: { n: 4, k: 4 } },
  previewEmpty: { decks: decks(MAIN), pv: { n: 5, k: 6 } },
  trouble: { decks: decks(TROUBLE) },
  finished: { decks: decks(FINISHED) },
  rows: { decks: decks(MAIN), view: "rows" },
  approved: { decks: decks(APPROVED) },
};

const DESK_H = 1700;
const SHEET_H = 2500;

function build(OUT) {
  fs.mkdirSync(OUT, { recursive: true });
  copySlides(OUT);
  const R1 = SHEET_H + 140;
  const ROW = DESK_H + 140;
  const BOARDS = [
    { name: "CardStates", phone: false, h: SHEET_H, m: "cards", title: "D5 · Every card state · Desktop", x: 0, y: 0 },
    { name: "Main", phone: false, m: "main", title: "D5 · Rendering · Desktop", x: 0, y: R1 },
    { name: "Phone", phone: true, m: "main", title: "D5 · Rendering · Phone", x: 1540, y: R1 },
    { name: "PhoneRendering", phone: true, m: "main", scrollTo: 4, title: "D5 · Rendering, scrolled to decks 4 and 5 · Phone", x: 2010, y: R1 },
    { name: "Preview", phone: false, h: 900, m: "preview", title: "D5 · Full-size preview · Desktop", x: 0, y: R1 + ROW },
    { name: "PreviewFlagged", phone: false, h: 900, m: "previewFlagged", title: "D5 · Preview on a flagged slide · Desktop", x: 1540, y: R1 + ROW },
    { name: "PhonePreview", phone: true, m: "previewFlagged", title: "D5 · Preview on a flagged slide · Phone", x: 3080, y: R1 + ROW },
    { name: "PhonePreviewEmpty", phone: true, m: "previewEmpty", title: "D5 · Preview, slide not rendered yet · Phone", x: 3550, y: R1 + ROW },
    { name: "Trouble", phone: false, m: "trouble", title: "D5 · Rendering elsewhere, and one deck failed · Desktop", x: 0, y: R1 + ROW + 1040 },
    { name: "PhoneFailed", phone: true, m: "trouble", scrollTo: 5, title: "D5 · Failed on slide 5 · Phone", x: 1540, y: R1 + ROW + 1040 },
    { name: "Finished", phone: false, m: "finished", title: "D5 · Finished · Desktop", x: 0, y: R1 + ROW * 2 + 1040 },
    { name: "PhoneFinished", phone: true, m: "finished", title: "D5 · Finished · Phone", x: 1540, y: R1 + ROW * 2 + 1040 },
    { name: "Rows", phone: false, m: "rows", title: "D5 · Rows view · Desktop", x: 0, y: R1 + ROW * 3 + 1040 },
    { name: "PhoneRows", phone: true, m: "rows", scrollTo: 4, title: "D5 · Rows view, scrolled to decks 4 and 5 · Phone", x: 1540, y: R1 + ROW * 3 + 1040 },
    { name: "Approved", phone: false, m: "approved", title: "D5 · After Approve · Desktop", x: 0, y: R1 + ROW * 4 + 1040 },
  ];
  const artboards = [];
  for (const light of [false, true]) {
    for (const b of BOARDS) {
      const file = `${b.name}${light ? "Light" : ""}.dc.html`;
      const h = b.phone ? 844 : b.h || DESK_H;
      const screen = renderScreen({ tall: b.phone || h === 900 ? 0 : h, init: { ...MOMENTS[b.m], scrollTo: b.scrollTo || 0 } });
      const html = artboard({ phone: b.phone, light, screens: [screen], navMode: "note" }).replace('"height":900', `"height":${h}`);
      fs.writeFileSync(path.join(OUT, file), html);
      artboards.push({ file, title: light ? `${b.title} · Light` : b.title, page: light ? "light" : "dark", x: b.x, y: b.y, w: b.phone ? 390 : 1440, h });
    }
  }
  /* A key beside the card-states board, so each deck's state can be found without guessing. */
  const key = ["Every card state, by deck", "", ...CARD_STATES.map(([, label], i) => `${i + 1}  ${label}`)].join("\n");
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
          { id: "cards-key", x: 1540, y: 0, w: 420, text: key, page: "dark" },
          { id: "cards-key-light", x: 1540, y: 0, w: 420, text: key, page: "light" },
        ],
        launch: { view: "canvas", page: "light" },
      },
      null,
      2,
    ),
  );
  console.log(`Wrote D5 artboards to ${OUT}`);
}

if (isMain(import.meta.url)) build(path.resolve(process.argv[2] ?? path.join(HERE, "out")));
