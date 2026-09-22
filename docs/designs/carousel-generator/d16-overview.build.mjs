#!/usr/bin/env node
/*
 * D16 · Overview — the Carousel Generator's front page.
 *
 * Design step only (docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md, D16). Nothing
 * here is app code. The shell (menu, top bar, glow, both themes, phone drawer,
 * prototype note) comes from generator-kit.mjs; this file is the screen. All
 * content is made-up sample data, per the design-step rule.
 *
 * Overview becomes the landing at /carousel-generator; Carousel types moves to
 * /carousel-generator/types and keeps its menu item. The menu gains Overview as
 * its first item under ← Dashboard, which is a change to the SHARED shell
 * (generator-kit.mjs, NAV) and therefore shows on every other ticket's boards
 * the next time they are placed — see the note in that file.
 *
 * ROUND TWO (Garreth, 2026-09-22, after the first boards). Four sections, top
 * to bottom, and the same order stacked on a phone:
 *
 *   Today               four stat boxes — Written, Rendered, Approved, Needs input
 *   Running Tasks       |  Carousel types
 *   Trending Carousels  |  Saved
 *
 *  - **"Waiting for you" is now "Running Tasks", and it is a monitor.** The
 *    first round followed the ticket's bell rule — only what needs a person —
 *    and the ticket said in as many words that the widget "should not promise a
 *    monitor". Garreth has now asked for the opposite: work in flight belongs
 *    on the front page, with its own animated icon. So a batch part-way through
 *    writing or rendering is a card here, above the ones that need him. **That
 *    reverses the ticket's own 2026-09-22 narrowing**, which is recorded in the
 *    ticket so the reason the rule moved is not lost.
 *  - **Each task is its own horizontal card**, not a row in a table. The ring
 *    at its left is the whole visual language of the section: a ring that
 *    **turns** means the batch is working and nobody is needed; a ring that is
 *    **still** means it is waiting for him; the icon inside names the stage —
 *    a pencil while writing, slides while rendering, a seal to approve, a play
 *    to render, a flag for a flagged deck, a pause for a stopped batch. The
 *    turning arc's length is how far the batch has got, so one element carries
 *    both "still going" and "12 of 18". Nothing else on the page moves.
 *  - **The stat boxes are the dashboard's own `MetricTile`**, copied value for
 *    value out of `src/components/dashboard/analytics-charts.tsx`: the dithered
 *    corner (`.dot-fade`), the 16px nested radius, `--card-raised`, the small
 *    label over a 24px tabular figure, the green or red delta with its arrow,
 *    and the sparkline running edge to edge under it. Needs input carries no
 *    delta: it is a state, not a trend, and a green "+50%" on a growing backlog
 *    would read as good news.
 *  - **Trending Carousels** is the top of what Trends scraped today, newest
 *    scrape if there is nothing from today — the line beside the heading says
 *    which. The posts are D10's own sample feed, so the two screens show the
 *    same carousels with the same numbers.
 *  - **Saved** means saved references — the carousels favourited on Trends
 *    (D10), never our own decks.
 *  - **Carousel types** is deliberately shorter than D1's cards: the name, the
 *    character and Generate, and nothing else — days of cover came off on
 *    2026-09-22, since it is Inventory's number and this widget is the way to
 *    generate rather than the way to judge supply. Ordered by the types generated most
 *    recently (Garreth, 2026-09-22), five rows, with All n types opening
 *    Carousel types. A type never generated has no date and sorts last. A type
 *    whose batch is writing or rendering reads Open running batch, as its D1
 *    card does; a stopped batch does not block Generate, because it is not
 *    writing into the lane.
 *    **All Carousel Types** sits beside the heading, the way All trends and All
 *    saved do, so it is a section link and always shows.
 *
 * Wording left open by the ticket and chosen here for Garreth's review: a
 * manual or paused batch with flagged decks reads "1 flagged", the words D4's
 * bell body and D7's table already use ("18 to render, 2 flagged").
 *
 * Run directly, it writes D16's review artboards and canvas.json:
 *   Main / Phone                  the top of the page: Today, Running Tasks,
 *                                 Carousel types
 *   MainBottom / PhoneBottom      the same page scrolled to Trending and Saved
 *   NothingRunning                nothing running and nothing waiting: the
 *                                 all-clear, the other sections as normal
 *   NothingSavedOldScrape         scrolled down, with nothing saved yet and a
 *                                 scrape that is not from today
 *   EveryTypeFits                 three types live, today's real number
 *   FirstRun / PhoneFirstRun      nothing ever generated and nothing saved:
 *                                 one first-run state, not five empty sections
 *   …Light                        the same ten on the Light page
 * Imported, `overviewScreen()` is the screen prototype.build.mjs opens.
 *
 *   node docs/designs/carousel-generator/d16-overview.build.mjs <out dir>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { icon, artboard, isMain, shellClashes, markupInValues } from "./generator-kit.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const S = ".screen-overview";

const D16I = {
  caret: icon("CaretRight", 14, "bold"),
  cards: icon("Cards", 14),
  cardsSm: icon("Cards", 12),
  /* The stage a task is at, inside its ring. */
  writing: icon("PencilSimple", 18),
  rendering: icon("Images", 18),
  approve: icon("SealCheck", 18),
  render: icon("Play", 18),
  flagged: icon("Flag", 18),
  stopped: icon("Pause", 18),
};

/* ── Sample content ────────────────────────────────────────────────────── */

/*
 * Today, in the four numbers the dashboard's own stat tiles would carry. The
 * sparkline is the last seven days; the delta is against yesterday. Needs input
 * is the count of cards below that are waiting for a person, so the box and the
 * section under it cannot disagree.
 */
/* No percentage against yesterday (Garreth, 2026-09-22): the four boxes answer
   "what has today done", and a delta turned each of them into a second question.
   What is left is the label and the figure. */
const STATS = [
  { id: "written", label: "Written today", value: "26" },
  { id: "rendered", label: "Rendered today", value: "18" },
  { id: "approved", label: "Approved today", value: "18" },
  { id: "input", label: "Needs input", value: "4" },
];

/*
 * Running Tasks, most alive first: the batches actually working, then the ones
 * waiting for a person, newest first. `stage` picks the ring and the icon;
 * `progress` is how far a working batch has got, which is the length of the arc
 * that turns. `to` is the screen that holds the press — batch is D3, review is
 * D4 (Render n decks), render is D5 (Approve n decks).
 *
 * Every state is worded as D12 words it and no other way: Writing 7 of 20,
 * Rendering 12 of 18, 18 to approve, 6 to render, 1 flagged, Stopped.
 */
const TASKS = [
  { id: "t1", name: "Myth vs Fact", character: "Character 3", slides: 8, stage: "writing", state: "Writing 7 of 20", count: 20, writtenUpTo: 7, to: "batch", when: "6m 12.4s", auto: "Auto" },
  { id: "t2", name: "Day in the Life", character: "Character 4", slides: 10, stage: "rendering", state: "Rendering 12 of 18", count: 18, to: "render", when: "1m 47.9s" },
  { id: "t3", name: "Before & After", character: "Character 2", slides: 7, stage: "approve", state: "18 to approve", count: 18, to: "render", when: "Just now", auto: "Auto" },
  { id: "t4", name: "Five Things I Stopped Doing After Thirty", character: "Character 3", slides: 7, stage: "flagged", state: "1 flagged", count: 20, writtenUpTo: 9, to: "batch", when: "2h ago", auto: "Auto paused" },
  { id: "t5", name: "Morning Routine", character: "Character 2", slides: 6, stage: "render", state: "6 to render", count: 6, to: "review", when: "Sep 6" },
  { id: "t6", name: "Quiet Luxury Picks", character: "Character 4", slides: 5, size: "9:16", stage: "stopped", state: "Stopped", count: 20, writtenUpTo: 12, to: "batch", when: "Sep 14" },
];

/*
 * The carousel types, D1's own sample set with D1's own numbers. `last` is when
 * the type was last generated, which is what orders this widget; `cover` is
 * days of cover, which no longer sets the order but still shows, because the
 * supply number belongs in front of him. `running` is a batch writing or
 * rendering, which is the only thing that swaps Generate for Open running
 * batch; Sunday Reset has never been run, so it sorts last and is hidden.
 */
const TYPES = [
  { id: "quiet-luxury", name: "Quiet Luxury Picks", character: "Character 4", slides: 5, size: "9:16", cover: 0, last: "Sep 14" },
  { id: "day-life", name: "Day in the Life", character: "Character 4", slides: 10, cover: 11, last: "Sep 13", running: true },
  { id: "myth", name: "Myth vs Fact", character: "Character 3", slides: 8, cover: 2, last: "Sep 12", running: true },
  { id: "before-after", name: "Before & After", character: "Character 2", slides: 7, cover: 6, last: "Sep 11" },
  { id: "morning", name: "Morning Routine", character: "Character 2", slides: 6, cover: 1, last: "Sep 8" },
  { id: "five-things", name: "Five Things I Stopped Doing After Thirty", character: "Character 3", slides: 7, cover: 0, last: "Aug 29" },
  { id: "sunday-reset", name: "Sunday Reset", character: "Character 3", slides: 6, cover: 0, last: null },
];

/* D10's own feed, best-scored first: what Trends scraped, and what was saved
   off it. The covers are the posts' first slides, so the same carousels show
   the same pictures on both screens. */
const TRENDING = [
  { id: "f4", img: "serum", handle: "@the.eye.edit", views: "1.2M", count: 6 },
  { id: "f3", img: "mug", handle: "@calm.skin.notes", views: "412k", count: 5 },
  { id: "f2", img: "dock", handle: "@another.sample", views: "118k", count: 8 },
  { id: "f5", img: "shoes", handle: "@quiet.shelf", views: "58k", count: 5 },
];

const SAVED = [
  { id: "f4", img: "serum", count: 6 },
  { id: "f2", img: "dock", count: 8 },
  { id: "f5", img: "shoes", count: 5 },
  { id: "f1", img: "vanity", count: 7 },
  { id: "f3", img: "mug", count: 5 },
  { id: "f6", img: "oats", count: 5 },
];

const IMAGES = [...new Set([...TRENDING, ...SAVED].map((s) => s.img))];

/*
 * The loader a working batch carries, in place of the still ring: a 3x3 grid of
 * cells with a chevron wavefront driving to the right (Garreth, 2026-09-22, who
 * sent the pattern). The 650ms cycle is shorter than the sweep, so two fronts
 * are always in flight and the grid never looks stalled. Cells are drawn, not
 * bound, like every other piece of markup on this screen.
 */
const CHEVRON = Array.from({ length: 9 }, (_, i) => (Math.floor(i / 3) === 1 ? 0 : 90) + (i % 3) * 90);

const loader = (stage) =>
  `<span class="px16 ${stage === "rendering" ? "is-render" : ""}" aria-hidden="true">` +
  CHEVRON.map((d) => `<span class="px16c" style="animation-delay: ${d}ms;"></span>`).join("") +
  `</span>`;

/* The ring at the left of a task card. `turns` makes it a loading circle: a
   quarter-arc chasing round the track, the way the top bar's own refresh
   spinner turns (Garreth, 2026-09-22 — the first cut rotated an arc whose
   length was the batch's progress, which read as a dial, not as loading; how
   far a batch has got is in its line of text, where it belongs). Without
   `turns` the ring is a still track and the icon inside is what speaks. */
function ring(stage, turns, iconBad) {
  const C = 2 * Math.PI * 19;
  const arc = turns
    ? `<circle class="rg16arc" cx="22" cy="22" r="19" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"` +
      ` stroke-dasharray="${(C * 0.25).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 22 22)"></circle>`
    : "";
  return (
    `<span class="rg16 ${turns ? "is-turning" : ""} ${iconBad ? "is-bad" : ""}">` +
    `<svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true">` +
    `<circle cx="22" cy="22" r="19" fill="none" stroke="var(--rg16track)" stroke-width="3"></circle>${arc}` +
    `</svg><span class="rg16i">${D16I[stage]}</span></span>`
  );
}

/* ── Styles ────────────────────────────────────────────────────────────── */

function css(phone) {
  const P = phone;
  return `
/* ── D16 page ── */
/* --dot-opacity is globals.css's own, brought in here rather than added to the
   shared shell, because this is the only screen that reads it.
   The light rule has NO space before the screen class: the theme class and the
   screen class sit on the same element (the D12 lesson, 2026-09-21). */
${S} { --dot-opacity: 0.34; }
.is-light${S} { --dot-opacity: 0; }
/* The ring's track. --border is all but invisible against --card, and the
   ring has to read as a ring even when it is standing still. */
${S} { --rg16track: color-mix(in srgb, var(--text-primary) 18%, transparent); }
${S} .page { gap: ${P ? 16 : 20}px; }
${S} .o16head { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 36px; }

/* A section is a heading on the page with its content under it, not a titled
   box: the task cards need to be cards in their own right, and four boxed
   sections inside one page reads as boxes inside boxes. */
${S} .sec16 { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
/* Every section heading is the height of a secondary button whether or not it
   carries one, so Running Tasks and Carousel types start level and so do
   Trending Carousels and Saved. */
${S} .sech16 { display: flex; align-items: center; min-height: 30px; gap: 8px; padding: 0 2px; }
${S} .sech16 h2 { margin: 0; font-size: 14px; line-height: 20px; font-weight: 600; letter-spacing: -0.01em; }
${S} .n16 { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .sech16 .btn2 { margin-left: auto; }

/* The two-column rows. Carousel types and Saved share the right-hand width, so
   the page has one spine down its right edge. */
${S} .cols16 { display: grid; grid-template-columns: ${P ? "minmax(0, 1fr)" : "minmax(0, 1fr) 380px"}; gap: ${P ? 16 : 20}px; align-items: start; }

/* ── Today: the dashboard's own MetricTile, value for value ── */
${S} .tiles16 { display: grid; grid-template-columns: repeat(${P ? 2 : 4}, minmax(0, 1fr)); gap: 12px; }
${S} .tile16 { position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: 10px; overflow: hidden; border-radius: 16px; border: 1px solid var(--border);
  background: var(--card-raised); padding: 16px 20px; color: var(--text-muted); }
/* .dot-fade, from globals.css: a halftone dither in the top-right corner, in
   currentColor so the tile tints its own texture. Light mode sets its opacity
   to 0, which is what the app does. */
${S} .tile16::after { content: ""; position: absolute; inset: 0; pointer-events: none; background-image: radial-gradient(currentColor 2px, transparent 2.2px); background-size: 7px 7px;
  opacity: var(--dot-opacity); -webkit-mask-image: radial-gradient(115% 115% at 100% 0%, #000 0%, transparent 58%); mask-image: radial-gradient(115% 115% at 100% 0%, #000 0%, transparent 58%); }
${S} .tl16 { position: relative; z-index: 1; font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .tv16 { position: relative; z-index: 1; display: flex; align-items: baseline; }
/* No sparkline and no percentage under it (Garreth, 2026-09-22), so the figure
   is the tile: the dashboard's 24px goes to 40px, which is what the room bought. */
${S} .tv16 b { font-size: 40px; line-height: 1; font-weight: 600; letter-spacing: -0.02em; color: var(--text-primary); }


/* ── Running Tasks: one horizontal card a batch ── */
${S} .tasks16 { display: flex; flex-direction: column; gap: 10px; }
${S} .task16 { position: relative; display: grid; grid-template-columns: ${P ? "44px minmax(0, 1fr) 14px" : "44px minmax(0, 1fr) auto 14px"}; align-items: center; column-gap: 14px; ${P ? "row-gap: 2px;" : ""}
  border-radius: 20px; border: 1px solid var(--border); background: var(--card); box-shadow: var(--sh-card); padding: ${P ? "14px 16px" : "12px 18px"};
  transition: background-color 150ms var(--ease), border-color 150ms var(--ease); }
${S} .task16:hover { background: var(--card-raised); border-color: color-mix(in srgb, var(--text-primary) 12%, var(--border)); }
${S} .task16open { position: absolute; inset: 0; z-index: 0; border-radius: 20px; }
${S} .task16 > *:not(.task16open) { position: relative; z-index: 1; pointer-events: none; }

/* The ring is the section's whole visual language: turning means the batch is
   working and nobody is needed, still means it is waiting for a person. The
   arc's length is how far it has got, so one element says both. */
${S} .rg16 { position: relative; display: flex; width: 44px; height: 44px; align-items: center; justify-content: center; }
/* Direct child only. The kit gives every svg display:block, and a plain
   descendant selector here caught the stage icon too and pinned it to the
   ring's top-left corner. */
${S} .rg16 > svg { position: absolute; inset: 0; }
${S} .rg16i { display: flex; color: var(--text-primary); }
${S} .rg16.is-turning .rg16i { color: var(--accent); }
${S} .rg16.is-bad .rg16i { color: var(--danger); }
/* A working batch carries the pixel grid instead of a ring (Garreth,
   2026-09-22): nine cells in a 3x3, with the wavefront driving to the right.
   The 650ms cycle is shorter than the sweep, so two fronts are always in the
   air. The colour is the stage (Garreth, 2026-09-22): white while a batch is
   writing, the accent once it is rendering, so the two stages are told apart
   across the room and the cyan means the pictures are being made. */
${S} .px16 { display: grid; grid-template-columns: repeat(3, 6px); gap: 2px; width: 44px; height: 44px; justify-content: center; align-content: center; }
${S} .px16c { width: 6px; height: 6px; border-radius: 1px; background: var(--text-primary); opacity: 0.12; animation: px16on 650ms ease-in-out infinite; }
${S} .px16.is-render .px16c { background: var(--accent); }
@keyframes px16on { 0%, 100% { opacity: 0.12; } 50% { opacity: 1; } }

/* And its line shimmers, so which stage the batch is at — Writing 7 of 20,
   Rendering 12 of 18 — is the thing that reads as alive. D12's wording is
   untouched; only its treatment changed. */
${S} .sh16 { display: inline-block; background-image: linear-gradient(90deg, var(--text-muted) 35%, var(--text-primary) 50%, var(--text-muted) 65%); background-size: 200% 100%;
  -webkit-background-clip: text; background-clip: text; color: transparent; animation: sh16wipe 1.4s linear infinite; }
@keyframes sh16wipe { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

${S} .tk16m { display: flex; ${P ? "grid-column: 2; grid-row: 1;" : ""} min-width: 0; flex-direction: column; gap: 3px; }
${S} .tk16n { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; line-height: 22px; font-weight: 600; letter-spacing: -0.01em; color: var(--text-primary); }
${S} .tk16s { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; min-width: 0; font-size: 13px; line-height: 18px; color: var(--text-muted); }
${S} .tk16s .st { color: var(--text-primary); }
${S} .tk16s .st.is-bad { color: var(--danger); }
/* Auto, Auto paused and how long ago sit together at the right of the card
   (Garreth, 2026-09-22), so the batch's own line is the state and nothing else
   and the pills read straight down the section. */
${S} .tk16r { display: flex; ${P ? "grid-column: 2; grid-row: 2;" : ""} align-items: center; gap: 10px; min-width: 0; }
${S} .tk16w { font-size: 12px; line-height: 16px; color: var(--text-muted); white-space: nowrap; }
${S} .tk16go { display: flex; ${P ? "grid-column: 3; grid-row: 1 / span 2; align-self: center;" : ""} color: var(--text-muted); }
/* On the phone the ring keeps its own column beside the name and the state
   rather than taking a line to itself, and when it happened moves under them. */
${P ? `${S} .task16 .rg16 { grid-column: 1; grid-row: 1 / span 2; align-self: center; }` : ""}

/* ── Carousel types ── */
${S} .c16 { display: flex; flex-direction: column; min-width: 0; border-radius: 20px; background: var(--card); border: 1px solid var(--border); box-shadow: var(--sh-card); }
/* Two lines: the name on the first, the character and the button on the second.
   Days of cover came off the row on 2026-09-22 (Garreth) — it is Inventory's
   number, and this widget is the way to generate, not the way to judge supply.
   The card sits in the 380px column beside Running Tasks, which is nowhere near
   enough for a name, a pill and Open running batch on one line. */
/* align-content keeps the name and its controls together as one block when the
   row is taller than they are; without it the two lines drift to the ends of
   the row and stop reading as one type. */
${S} .t16row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; align-content: center; column-gap: 12px; row-gap: 8px;
  padding: ${P ? "12px 16px" : "12px 18px"}; border-top: 1px solid var(--border); }
${S} .t16row:first-child { border-top: 0; }
${S} .t16name { min-width: 0; grid-column: 1 / -1; grid-row: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; line-height: 20px; font-weight: 500; color: var(--text-primary);
  text-decoration: underline; text-decoration-color: transparent; text-underline-offset: 4px; transition: text-decoration-color 150ms var(--ease); }
${S} .t16name:hover { text-decoration-color: var(--text-muted); }
${S} .t16act { grid-column: 2; grid-row: 2; display: flex; justify-content: flex-end; }
${S} .t16row .pill { grid-column: 1; grid-row: 2; justify-self: start; }
/* In a row, the accent button takes the secondary button's exact box, so the
   cyan Generate reads as the same control in a different tone, not a bigger
   one — D1's own rule, and its exact values. */
${S} .cta--sm { padding: 6px 14px; border: 1px solid transparent; font-size: 12px; line-height: 16px; letter-spacing: 0; }

/* ── Trending Carousels, and Saved: D10's tiles at the size a section carries ── */
${S} .tr16 { display: grid; grid-template-columns: repeat(${P ? 2 : 4}, minmax(0, 1fr)); gap: ${P ? 10 : 12}px; }
${S} .trc16 { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
${
  P
    ? ""
    : `/* The two sections at the foot of the page end level (Garreth, 2026-09-22).
   Saved keeps D10's own 4:5 tiles, three across and two deep, so it sets the
   height; Trending stretches its covers to meet it, which is a taller crop on a
   section that is the featured one anyway. Its \`min-height\` is the 4:5 height
   of its own row, so when Saved is the shorter of the two — nothing saved yet —
   Trending holds its size and Saved's empty box grows to fill instead. */
${S} .cols16--fill { align-items: stretch; }
${S} .cols16--fill .sec16 { min-height: 0; }
/* The two columns of a row end level (Garreth, 2026-09-22). Running Tasks is
   the taller of the top pair, so the Carousel types card fills down to meet it
   and its rows share out the height between them. The rows stop growing at
   104px \u2014 a little under twice what a row holds \u2014 so a short list becomes an
   airier card with room to spare rather than a stretched-out ladder; the space
   left over then sits at the foot of the card. */
${S} .cols16--fill .c16 { flex: 1; }
${S} .cols16--fill .c16 .t16row { flex: 1; max-height: 104px; }
${S} .cols16--fill .tasks16 { flex: 1; }
${S} .cols16--fill .tr16 { flex: 1; min-height: 266px; grid-auto-rows: minmax(0, 1fr); }
${S} .cols16--fill .trc16 { min-height: 0; }
${S} .cols16--fill .trc16 .gt16 { flex: 1; min-height: 0; aspect-ratio: auto; }
${S} .cols16--fill .none16 { flex: 1; }`
}
${S} .g16 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: ${P ? 8 : 6}px; }
${S} .gt16 { position: relative; aspect-ratio: 4 / 5; overflow: hidden; border-radius: ${P ? 10 : 12}px; background-color: var(--card-sunken); background-size: cover; background-position: center;
  border: 1px solid var(--border); transition: opacity 150ms var(--ease), transform 160ms var(--ease-out-strong); }
${S} .gt16:hover { opacity: 0.88; }
${S} .gt16:active { transform: scale(0.98); }
${S} .gt16 .gm16 { position: absolute; top: 8px; right: 8px; display: flex; color: #fff; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6)); }
${S} .gt16 .gq16 { position: absolute; left: 8px; bottom: 8px; border-radius: 999px; padding: 1px 8px; font-size: 11px; line-height: 16px; font-weight: 500; color: #fff; background: rgba(0, 0, 0, 0.45); }
${S} .trm16 { display: flex; flex-direction: column; gap: 1px; min-width: 0; padding: 0 2px; }
${S} .trm16 b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; line-height: 18px; font-weight: 600; color: var(--text-primary); }
${S} .trm16 span { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${IMAGES.map((id) => `${S} .sv-${id} { background-image: url("./d16-img-${id}.jpg"); }`).join("\n")}

/* A section's own empty line, not the page's empty state: the others carry on
   as normal, so this stays a line in a quiet box. */
${S} .none16 { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: ${P ? 88 : 116}px; margin: 0; border-radius: 20px; border: 1px dashed var(--border);
  background: var(--card-sunken); padding: 16px; font-size: 13px; line-height: 20px; color: var(--text-muted); }

/* First run: one state for the whole page, not five empty sections stacked up,
   and it fills the screen rather than sitting in a short box with dead space
   under it (the standing empty-state rule, 2026-09-19). */
${S} .main:has(> .page.is-fill) { display: flex; flex-direction: column; }
${S} .page.is-fill { flex: 1; min-height: 0; }
${S} .page.is-fill .es16 { flex: 1; }
${S} .es16 { display: flex; min-height: ${P ? 280 : 360}px; flex-direction: column; align-items: center; justify-content: center; gap: 16px; border-radius: 24px; border: 1px solid var(--border);
  background: var(--card-sunken); padding: 44px 28px; text-align: center; }
${S} .es16 .mark { color: var(--text-muted); opacity: 0.55; }
${S} .es16 h4 { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; }
${S} .es16 .es16-sub { margin: -8px 0 0; font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .es16--proto { border-style: dashed; }
${
  P
    ? `
/* 44px touch targets: the pill keeps its size, the hit area grows (D2). */
${S} .t16act .btn2::after, ${S} .t16act .cta::after { content: ""; position: absolute; inset: -8px -6px; }
${S} .t16act .cta, ${S} .t16act .btn2 { position: relative; }
`
    : ""
}
/* Reduced motion: the grid holds still and the line stops shimmering. The grid
   is left readable rather than at its dim 0.12, so a working batch can still be
   picked out from one standing still, and what it is doing is in its line of
   text either way. */
@media (prefers-reduced-motion: reduce) {
  ${S} .px16c { animation: none; opacity: 0.55; }
  ${S} .sh16 { animation: none; background-image: none; color: var(--text-primary); }
  ${S} .task16, ${S} .gt16, ${S} .t16name { transition: none; }
}
`;
}

/* ── Markup ────────────────────────────────────────────────────────────── */

// The empty-state mark from docs/design-system.html (State · Empty), as D1 uses it.
const emptyMark =
  '<svg width="62" height="50" viewBox="0 0 62 50" fill="none" aria-hidden="true"><rect x="0.75" y="11" width="9" height="28" rx="3" stroke="currentColor" stroke-width="1.5" opacity=".4"></rect><rect x="52.25" y="11" width="9" height="28" rx="3" stroke="currentColor" stroke-width="1.5" opacity=".4"></rect><rect x="16.75" y="1.75" width="28.5" height="46.5" rx="5" fill="var(--card-sunken)" stroke="currentColor" stroke-width="1.5"></rect></svg>';

/* Every stage the section can show. A card renders under the one its own state
   names, so each keeps its own ring without the ring becoming a value — an icon
   passed through renderVals prints its own SVG source (the 2026-09-19 lesson). */
const STAGES = [
  { key: "writing", loading: true },
  { key: "rendering", loading: true },
  { key: "approve" },
  { key: "render" },
  /* A flagged deck gets the red icon (Garreth, 2026-09-22) — something has gone wrong with it and the eye
     should find it down the column. Its words stay neutral: History's rule is that only a status meaning
     something went wrong is red, and Stopped is still the only status that does. */
  { key: "flagged", iconBad: true },
  { key: "stopped", iconBad: true, textBad: true },
];

const taskCard = (st) => `
                <div class="task16">
                  <button type="button" class="task16open" aria-label="{{k.label}}" onClick="{{k.open}}"></button>
                  ${st.loading ? loader(st.key) : ring(st.key, false, !!st.iconBad)}
                  <span class="tk16m">
                    <span class="tk16n" title="{{k.name}}">{{k.name}}</span>
                    <span class="tk16s">
                      <span class="st ${st.loading ? "sh16" : st.textBad ? "is-bad" : ""} tnum">{{k.state}}</span>
                    </span>
                  </span>
                  <span class="tk16r">
                    <sc-if value="{{k.hasAuto}}" hint-placeholder-val="{{ false }}"><span class="pill">{{k.auto}}</span></sc-if>
                    <span class="tk16w tnum">{{k.when}}</span>
                  </span>
                  <span class="tk16go" aria-hidden="true">${D16I.caret}</span>
                </div>`;

/* A stat tile: the label, and the delta with its arrow, are written INTO the
   template rather than handed over as values, because the canvas escapes a
   value as text and an icon passed through renderVals prints its own source on
   the board (the 2026-09-19 lesson, learnt again here on 2026-09-22 when these
   four tiles came back full of markup). Only the figure is bound, because Needs
   input is counted off the section below. */
const statTile = (m) => `              <div class="tile16">
                <span class="tl16">${m.label}</span>
                <span class="tv16"><b class="tnum">{{o16v_${m.id}}}</b></span>
              </div>`;

const typeRow = () => `
                    <div class="t16row">
                      <button type="button" class="t16name" title="{{t.name}}" onClick="{{t.openType}}">{{t.name}}</button>
                      <span class="pill">{{t.character}}</span>
                      <span class="t16act">
                        <sc-if value="{{t.isRunning}}" hint-placeholder-val="{{ false }}"><button type="button" class="btn2" onClick="{{t.openBatch}}">Open running batch</button></sc-if>
                        <sc-if value="{{t.canGenerate}}" hint-placeholder-val="{{ true }}"><button type="button" class="cta cta--sm" onClick="{{t.generate}}">Generate</button></sc-if>
                      </span>
                    </div>`;

function page(phone) {
  return `
      <main class="main">
        <div class="page {{o16FillCls}}">
          <div class="o16head">
            <h1>{{o16Title}}</h1>
          </div>

          <sc-if value="{{o16ShowPage}}" hint-placeholder-val="{{ true }}">
            <div class="tiles16">
${STATS.map(statTile).join("\n")}
            </div>

            <div class="cols16 cols16--fill">
              <section class="sec16" aria-labelledby="o16-tasks">
                <div class="sech16">
                  <h2 id="o16-tasks">Running Tasks</h2>
                  <sc-if value="{{o16HasTasks}}" hint-placeholder-val="{{ true }}"><span class="n16 tnum">{{o16TaskCount}}</span></sc-if>
                </div>
                <sc-if value="{{o16HasTasks}}" hint-placeholder-val="{{ true }}">
                  <div class="tasks16">
${STAGES.map(
  (st) => `                    <sc-for list="{{o16Tasks_${st.key}}}" as="k" hint-placeholder-count="1">${taskCard(st)}
                    </sc-for>`,
).join("\n")}
                  </div>
                </sc-if>
                <sc-if value="{{o16NoTasks}}" hint-placeholder-val="{{ false }}">
                  <p class="none16">Nothing running, nothing waiting</p>
                </sc-if>
              </section>

              <section class="sec16" aria-labelledby="o16-types">
                <div class="sech16">
                  <h2 id="o16-types">Carousel types</h2>
                  <button type="button" class="btn2" onClick="{{o16AllTypes}}">All Carousel Types</button>
                </div>
                <div class="c16">
                  <sc-for list="{{o16Types}}" as="t" hint-placeholder-count="5">${typeRow()}
                  </sc-for>
                </div>
              </section>
            </div>

            <div class="cols16 cols16--fill" id="o16-bottom">
              <section class="sec16" aria-labelledby="o16-trending">
                <div class="sech16">
                  <h2 id="o16-trending">Trending Carousels</h2>
                  <span class="n16">{{o16ScrapeLine}}</span>
                  <button type="button" class="btn2" onClick="{{o16AllTrends}}">All trends</button>
                </div>
                <div class="tr16" role="list">
                  <sc-for list="{{o16Trending}}" as="r" hint-placeholder-count="4">
                    <div class="trc16" role="listitem">
                      <button type="button" class="gt16 {{r.cls}}" aria-label="{{r.label}}" onClick="{{r.open}}"><span class="gm16" aria-hidden="true">${D16I.cards}</span><span class="gq16 tnum">{{r.count}}</span></button>
                      <span class="trm16"><b title="{{r.handle}}">{{r.handle}}</b><span class="tnum">{{r.views}} views</span></span>
                    </div>
                  </sc-for>
                </div>
              </section>

              <section class="sec16" aria-labelledby="o16-saved">
                <div class="sech16">
                  <h2 id="o16-saved">Saved</h2>
                  <sc-if value="{{o16HasSaved}}" hint-placeholder-val="{{ true }}"><button type="button" class="btn2" onClick="{{o16AllSaved}}">All saved</button></sc-if>
                </div>
                <sc-if value="{{o16HasSaved}}" hint-placeholder-val="{{ true }}">
                  <div class="g16" role="list">
                    <sc-for list="{{o16Saved}}" as="v" hint-placeholder-count="6">
                      <button type="button" class="gt16 {{v.cls}}" role="listitem" aria-label="{{v.label}}" onClick="{{v.open}}"><span class="gm16" aria-hidden="true">${D16I.cardsSm}</span><span class="gq16 tnum">{{v.count}}</span></button>
                    </sc-for>
                  </div>
                </sc-if>
                <sc-if value="{{o16NoSaved}}" hint-placeholder-val="{{ false }}">
                  <p class="none16">Nothing saved yet</p>
                </sc-if>
              </section>
            </div>
          </sc-if>

          <sc-if value="{{o16FirstRun}}" hint-placeholder-val="{{ false }}">
            <div class="es16">
              <div class="mark">${emptyMark}</div>
              <h4>Nothing generated yet</h4>
              <button type="button" class="cta" onClick="{{o16Generate}}">Generate</button>
            </div>
          </sc-if>

          <sc-if value="{{o16Proto}}" hint-placeholder-val="{{ false }}">
            <div class="es16 es16--proto">
              <h4>{{o16Title}}</h4>
              <p class="es16-sub">{{o16ProtoTicket}}</p>
            </div>
          </sc-if>
        </div>
      </main>`;
}

/* ── Behaviour ─────────────────────────────────────────────────────────── */

function vals({ firstRun, noTasks, noSaved, liveTypes, scrapedToday }) {
  return `
    var FIRST_RUN = ${firstRun};
    var NO_TASKS = ${noTasks};
    var NO_SAVED = ${noSaved};
    var SCRAPED_TODAY = ${scrapedToday};
    /* How many carousel types exist at all. Five rows show; the rest are behind All n types. */
    var LIVE = ${liveTypes};

    var STATS = ${JSON.stringify(STATS)};
    var TASKS = ${JSON.stringify(TASKS)};
    var TYPES = ${JSON.stringify(TYPES)};
    var TRENDING = ${JSON.stringify(TRENDING)};
    var SAVED = ${JSON.stringify(SAVED)};

    var onOverview = s.active === "overview";
    var tasks = NO_TASKS || FIRST_RUN ? [] : TASKS;
    var saved = NO_SAVED || FIRST_RUN ? [] : SAVED;
    var trending = FIRST_RUN ? [] : TRENDING;

    /* Needs input counts the cards that are waiting for a person, so the box and the section under it
       cannot disagree; a batch that is writing or rendering is not one of them. */
    var needs = tasks.filter(function (k) { return k.stage !== "writing" && k.stage !== "rendering"; }).length;

    /* The words the Prototype note says when the screen a card opens is not in the frame. They are the
       bell's own words, so the note and the notification cannot drift apart. */
    var noteFor = function (k) {
      if (k.stage === "rendering") return "Opens the batch that is rendering · D5";
      if (k.stage === "writing") return "Opens the running batch · D3";
      if (k.stage === "approve") return "Opens the finished batch, with Approve " + k.count + " decks · D5";
      if (k.stage === "render") return "Opens the written batch, with Render " + k.count + " decks · D4";
      if (k.stage === "stopped") return "Opens the stopped batch, with Continue · D3";
      return "Opens the paused batch, on the flagged deck · D3";
    };

    var card = function (k) {
      return {
        name: k.name,
        state: k.state,
        hasAuto: !!k.auto,
        auto: k.auto || "",
        when: k.when,
        label: k.name + " — " + k.state,
        open: function () {
          var p = { name: k.name, character: k.character, slides: k.slides + " slides", size: k.size || "4:5", count: k.count };
          if (k.writtenUpTo) p.writtenUpTo = k.writtenUpTo;
          ctx.open(k.to, p, noteFor(k));
        }
      };
    };

    /* Ordered by the types generated most recently (Garreth, 2026-09-22). A type never generated has no date and
       sorts last, so one made in the Studio yesterday is still reachable from here. */
    var pool = TYPES.slice(0, LIVE).sort(function (a, b) {
      if (!a.last && !b.last) return 0;
      if (!a.last) return 1;
      if (!b.last) return -1;
      return 0;
    });
    var typeRows = (FIRST_RUN ? [] : pool.slice(0, 5)).map(function (t) {
      return {
        name: t.name,
        character: t.character,
        /* Tied to the section above: if nothing is running, no type can be reading Open running batch.
           The all-clear board caught this disagreeing with itself. */
        isRunning: !NO_TASKS && !!t.running,
        canGenerate: NO_TASKS || !t.running,
        openType: function () { ctx.open("type", { name: t.name, character: t.character, slides: t.slides + " slides", size: t.size || "4:5" }, "Opens the page for " + t.name + " · D7"); },
        generate: function () { ctx.open("generate", { name: t.name, character: t.character, slides: t.slides + " slides", size: t.size || "4:5" }, "Opens the Generate form for " + t.name + " · D2"); },
        openBatch: function () { ctx.open("batch", { name: t.name, character: t.character, slides: t.slides + " slides", size: t.size || "4:5", count: 20, writtenUpTo: 7 }, "Opens the running batch · D3"); }
      };
    });

    var tile = function (v, extra) {
      return Object.assign({
        cls: "sv-" + v.img,
        count: String(v.count),
        open: function () { ctx.open("trends", { tab: extra ? "feed" : "saved" }, extra ? "Opens the carousel on Trends · D10" : "Opens the saved carousel on Trends · D10"); }
      }, extra || {});
    };

    var out = {
      o16Title: ctx.current[1],
      o16ProtoTicket: "Designed in " + ctx.current[2],
      o16ShowPage: onOverview && !FIRST_RUN,
      o16FirstRun: onOverview && FIRST_RUN,
      o16Proto: !onOverview,
      /* The first-run state is the only thing on the page, so it fills it. */
      o16FillCls: onOverview && FIRST_RUN ? "is-fill" : "",

      o16HasTasks: tasks.length > 0,
      o16NoTasks: tasks.length === 0,
      o16TaskCount: needs === 0 ? "none waiting" : needs === 1 ? "1 needs you" : needs + " need you",

      o16Types: typeRows,
      /* All Carousel Types sits beside the heading, the way All trends and All saved do (Garreth,
         2026-09-22), so it is a section link and shows whether or not a type is hidden. That retires the
         proposal in the ticket to hide it while nothing is hidden, which was about a label carrying a count. */
      o16AllTypes: function () { ctx.open("types", null, "Opens Carousel types · D1"); },

      /* Today's scrape when there is one, the newest otherwise — the line says which, so a quiet day
         cannot look like today's winners. */
      o16ScrapeLine: SCRAPED_TODAY ? "Scraped today" : "Nothing scraped today · newest is Sep 20",
      o16Trending: trending.map(function (r) { return tile(r, { handle: r.handle, views: r.views, label: r.handle + ", " + r.views + " views" }); }),
      o16AllTrends: function () { ctx.open("trends", null, "Opens Trends · D10"); },

      o16Saved: saved.map(function (v) { return tile(v, null); }),
      o16HasSaved: saved.length > 0,
      o16NoSaved: saved.length === 0,
      o16AllSaved: function () { ctx.open("trends", { tab: "saved" }, "Opens Trends on Saved · D10"); },

      o16Generate: function () { ctx.open("types", null, "Opens Carousel types, to pick what to generate · D1"); }
    };

    /* The four figures the stat tiles bind. Everything else on a tile is in the template. */
    STATS.forEach(function (m) {
      out["o16v_" + m.id] = m.id === "input" ? String(needs) : m.value;
    });

    /* One list a stage: a card's ring and icon are markup, not values, so each stage has its own
       sc-for and a card renders under the one its state names. */
    ${JSON.stringify(STAGES.map((st) => st.key))}.forEach(function (stage) {
      out["o16Tasks_" + stage] = tasks.filter(function (k) { return k.stage === stage; }).map(card);
    });
    return out;`;
}

/** D16 as a screen. `firstRun` is the page with nothing ever generated and nothing saved; `noTasks` is the
    all-clear; `noSaved` empties only the Saved section; `liveTypes` is how many carousel types exist at all;
    `scrapedToday` is whether Trends has a scrape from today; `toBottom` scrolls a review board to the
    Trending and Saved row. */
export function overviewScreen({ firstRun = false, noTasks = false, noSaved = false, liveTypes = TYPES.length, scrapedToday = true, toBottom = false } = {}) {
  return {
    id: "overview",
    nav: "overview",
    css,
    markup: page,
    state: {},
    vals: vals({ firstRun, noTasks, noSaved, liveTypes, scrapedToday }),
    didUpdate: toBottom
      ? `
    if (!this.o16scrolled) { var o16b = document.getElementById("o16-bottom"); var o16c = document.querySelector(".col"); if (o16b && o16c) { this.o16scrolled = true; o16c.scrollTop = o16b.offsetTop - 70; } }`
      : "",
  };
}

/* ── Review artboards ──────────────────────────────────────────────────── */

function build(OUT) {
  /* A value that carries markup prints its own source on the canvas, which the local render cannot show;
     the stat tiles were drawn that way once, so the build refuses to write boards in that state. */
  const bad = markupInValues([overviewScreen()]);
  if (bad.length) throw new Error(`D16 hands markup over as values: ${bad.join(", ")}`);
  const clash = shellClashes([overviewScreen()]);
  if (clash.length) throw new Error(`D16 takes names the shell uses: ${clash.join(", ")}`);

  fs.mkdirSync(OUT, { recursive: true });
  for (const id of IMAGES) fs.copyFileSync(path.join(HERE, "assets", `d8-img-${id}.jpg`), path.join(OUT, `d16-img-${id}.jpg`));

  const BOARDS = [
    { file: "Main.dc.html", title: "D16 · Overview: Today, Running Tasks, Carousel types · Desktop", x: 0, y: 0 },
    { file: "Phone.dc.html", phone: true, title: "D16 · Overview · Phone", x: 1540, y: 0 },
    { file: "MainBottom.dc.html", opts: { toBottom: true }, title: "D16 · Overview: Trending Carousels and Saved · Desktop", x: 2010, y: 0 },
    { file: "PhoneBottom.dc.html", phone: true, opts: { toBottom: true }, title: "D16 · Trending Carousels and Saved · Phone", x: 3550, y: 0 },
    { file: "NothingRunning.dc.html", opts: { noTasks: true }, title: "D16 · Nothing running, nothing waiting · Desktop", x: 0, y: 1040 },
    { file: "PhoneNothingRunning.dc.html", phone: true, opts: { noTasks: true }, title: "D16 · Nothing running, nothing waiting · Phone", x: 1540, y: 1040 },
    /* Nothing saved yet, and a Trends scrape that is not from today: the two states of the bottom row. */
    { file: "NothingSavedOldScrape.dc.html", opts: { noSaved: true, scrapedToday: false, toBottom: true }, title: "D16 · Nothing saved yet, nothing scraped today · Desktop", x: 2010, y: 1040 },
    /* Three types live, which is today's real number, so the five rows show every one of them and the
       widget reads exactly like D1's list. The cap starts doing its job once the Studio has made a few. */
    { file: "EveryTypeFits.dc.html", opts: { liveTypes: 3 }, title: "D16 · Three carousel types, today's real number · Desktop", x: 3550, y: 1040 },
    { file: "FirstRun.dc.html", opts: { firstRun: true }, title: "D16 · First run · Desktop", x: 5090, y: 1040 },
    { file: "PhoneFirstRun.dc.html", phone: true, opts: { firstRun: true }, title: "D16 · First run · Phone", x: 6630, y: 1040 },
  ];

  const artboards = [];
  for (const light of [false, true]) {
    for (const b of BOARDS) {
      const file = light ? b.file.replace(".dc.html", "Light.dc.html") : b.file;
      fs.writeFileSync(
        path.join(OUT, file),
        artboard({ phone: !!b.phone, light, screens: [overviewScreen(b.opts || {})], navMode: "page" }),
      );
      artboards.push({
        file,
        title: light ? `${b.title} · Light` : b.title,
        page: light ? "light" : "dark",
        x: b.x,
        y: b.y,
        w: b.phone ? 390 : 1440,
        h: b.phone ? 844 : 900,
        is_interactive: true,
      });
    }
  }

  const tryNote =
    "ROUND TWO (2026-09-22), to Garreth's notes on round one. Overview is the generator's front page at /carousel-generator; Carousel types moves to /carousel-generator/types and keeps its menu item. The menu gains Overview as its first item, which is a change to the shared shell and will show on every other ticket's boards once they are re-placed.\n\nFour sections, top to bottom, and the same order stacked on a phone: Today, then Running Tasks beside Carousel types, then Trending Carousels beside Saved. The page is taller than one screen, so the review has two boards a size: the top of the page, and the same page scrolled to the bottom row.\n\nToday is the dashboard's own stat tile, copied value for value from analytics-charts.tsx: the dithered corner, the small label over a 24px figure, the green or red delta with its arrow, and the sparkline running edge to edge. Needs input carries no delta, because a backlog is a state rather than a trend and a green \"+50%\" on it would read as good news; its number is the count of cards below that are waiting for a person, so the box and the section cannot disagree.\n\nRunning Tasks is Waiting for you renamed, and it now shows work in flight as well: a batch part-way through writing or rendering is a card here, above the ones that need a person. That reverses the narrowing written into the ticket, which said the widget should not promise a monitor; the reason it moved is recorded there.\n\nEach task is its own horizontal card. The ring at its left is the whole language of the section: a ring that TURNS means the batch is working and nobody is needed, and the length of its arc is how far it has got — 7 of 20, 12 of 18. A ring that is STILL means it is waiting for you. The icon inside names the stage: a pencil while writing, slides while rendering, a seal to approve, a play to render, a flag for a flagged deck, a pause for a stopped batch, which is the one red one. Nothing else on the page moves.\n\nTrending Carousels is the top of what Trends scraped today; the line beside the heading says so, and gives the date of the newest scrape instead when there is nothing from today. The posts and the saved covers are D10's own sample feed, so the same carousels show the same pictures on both screens.\n\nCarousel types is ordered by the types generated most recently, five rows, with All n types opening Carousel types. A type whose batch is writing or rendering reads Open running batch; a stopped batch does not block Generate.\n\nClickable. Try the menu, the collapse button beside the logo, a task card, a type's name, Generate, Open running batch, All 7 types, a trending or saved cover, All trends and All saved. Screens not designed yet show a Prototype note naming their ticket. On the phone the menu button opens the drawer.\n\nStill open from round one: a manual or paused batch with flagged decks is worded \"1 flagged\", the words D4's bell body and D7's table already use — the ticket left that wording open.";

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
          { id: "d16-try", page: "dark", x: 8170, y: 0, w: 390, text: tryNote },
          { id: "d16-try-light", page: "light", x: 8170, y: 0, w: 390, text: tryNote },
        ],
        launch: { view: "canvas", page: "dark" },
      },
      null,
      2,
    ),
  );
  console.log(`Wrote D16 artboards to ${OUT}`);
}

if (isMain(import.meta.url)) build(path.resolve(process.argv[2] ?? path.join(HERE, "out")));
