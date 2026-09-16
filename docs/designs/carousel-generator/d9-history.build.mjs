#!/usr/bin/env node
/*
 * D9 · History — every batch the generator has made, newest first, with the
 * two things you come here to do: pick a stopped batch back up, and run a
 * past batch again.
 *
 * Design step only (docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md, D9). Nothing
 * here is app code. The shell (menu, top bar, glow, both themes, phone drawer,
 * prototype note) comes from generator-kit.mjs; this file is the screen.
 *
 * The table is D7's batch table grown up: same `.bgrid` idea, same row height,
 * same left-aligned columns and neutral pills, with the column a type's own
 * page leaves out — which carousel type — a Status column where D7 had an
 * unlabelled state cell, and a per-row action. Following D7 rather than
 * inventing a second table was the point.
 *
 * Decided with Garreth, 2026-09-16:
 *  - **The four counts are Requested, Written, Rendered, Approved**, in the
 *    order the batch actually runs. The ticket asked for "requested, approved,
 *    rendered, generated", which is the batch model from before 2026-09-15:
 *    back then the copy was approved first and rendered after. Since the text
 *    gate moved into writing, the one sign-off is Approve (n) decks on the
 *    FINISHED batch (F3), so Approved is the last column, and it is the count
 *    the Smart Scheduler can see. Neither old name for that column survived:
 *    "Ready" was dropped on 2026-09-14 because posting_status = 'Ready' already
 *    means "scheduled for today" everywhere in the dashboard, and "Generated"
 *    was dropped on 2026-09-15 with the model change.
 *  - There is no "Ran by" column: the app shows nobody's name anywhere, so the
 *    last column before the action is **Status**, and every row has one — Done,
 *    Writing 7 of 20, Stopped, Not wired (Garreth, 2026-09-16).
 *    A status that means something went wrong is red (Garreth, 2026-09-16);
 *    Stopped is the only one so far. Not wired is not an error — it is a type
 *    whose approved decks wait for Wire, and D1 shows it neutral — and neither
 *    is a batch nobody approved, which still reads Done.
 *  - Both empty states fill the rest of the screen rather than sitting in a
 *    short dashed box with dead space under it (Garreth, 2026-09-16).
 *  - A re-run and the batch it copied are tied by a marker in the type cell
 *    ("Re-run of Sep 11" on one, "Re-run on Sep 16" on the other) rather than
 *    by pulling the older row out of date order. The marker is plain text and
 *    nothing is lit (Garreth, 2026-09-16): filter to that type and the pair
 *    sits together on its own.
 *  - Row actions are all secondary. History's one accent button is Generate,
 *    and it only exists in the first-run empty state (screen inventory).
 *  - On the phone the type filter stays a row of pills, scrolling sideways
 *    inside itself the way the app's own FilterPills does, rather than
 *    wrapping over three lines and eating the top of the screen.
 *
 * Sample content only: the carousel type names are D1's invented ones, and
 * every count and date is made up.
 *
 * Run directly, it writes D9's review artboards and canvas.json:
 *   Main.dc.html        desktop 1440×900, the table, last 30 days
 *   Range.dc.html       desktop, the date-range dropdown open
 *   Paired.dc.html      desktop, filtered to one type: a re-run sitting above
 *                       the batch it copied
 *   NoResults.dc.html   desktop, the filters echoed back with Clear
 *   FirstRun.dc.html    desktop, no batches yet, with Generate
 *   Phone.dc.html       phone 390×844, the table as stacked rows
 *   PhoneRange.dc.html  phone, the date range open under its button
 *   PhoneEmpty.dc.html  phone, no batches yet
 * Imported, `historyScreen()` is the screen prototype.build.mjs opens.
 *
 *   node docs/designs/carousel-generator/d9-history.build.mjs <out dir>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { icon, artboard, isMain } from "./generator-kit.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const S = ".screen-history";

const D9I = {
  rerun: icon("ArrowsClockwise", 12, "bold"),
  caretDown: icon("CaretDown", 14, "bold"),
  check: icon("Check", 14, "bold"),
  clock: icon("ClockCounterClockwise", 24),
};

/* ── Sample content ────────────────────────────────────────────────────── */

/* The same carousel types as D1, so a person moving between the two screens
   sees the same names. The long one is here to test what a table does with a
   name that will not fit.

   Each one carries its character and slide size as well, so that opening a
   batch from here hands the batch screens the same thing D1 and D7 hand them,
   and Quiet Luxury Picks still renders at 9:16 in the prototype. */
const TYPES = [
  { id: "morning", name: "Morning Routine", character: "Character 2", slides: 6 },
  { id: "myth", name: "Myth vs Fact", character: "Character 3", slides: 8 },
  { id: "before", name: "Before & After", character: "Character 2", slides: 7 },
  { id: "day", name: "Day in the Life", character: "Character 4", slides: 10 },
  { id: "quiet", name: "Quiet Luxury Picks", character: "Character 4", slides: 5, size: "9:16" },
  { id: "five", name: "Five Things I Stopped Doing After Thirty", character: "Character 3", slides: 7 },
];

/*
 * Newest first, as the screen shows them. `ago` is days back from today, which
 * is all the date-range filter needs.
 *
 * The four counts follow the batch as it actually runs (F1, F3): asked for,
 * written, rendered, then approved on the finished batch — the sign-off that
 * puts decks in front of the Smart Scheduler. Each gap says something:
 * requested minus written is what was discarded while writing, written minus
 * rendered is what the gate flagged, rendered minus approved is what the
 * render checks caught.
 *
 * A count is null, and shows a dash, where that stage has not happened yet —
 * which is not the same as a nought. Sep 8's nought is real: 24 decks were
 * written and rendered and not one was approved.
 */
const BATCHES = [
  { id: "b11", date: "Sep 16", ago: 0, type: "myth", req: 20, written: 7, rend: null, appr: null, state: "running" },
  { id: "b10", date: "Sep 16", ago: 0, type: "before", req: 12, written: 12, rend: 11, appr: 11, rerunOf: "b05" },
  { id: "b09", date: "Sep 15", ago: 1, type: "five", req: 20, written: 18, rend: 16, appr: 15 },
  { id: "b08", date: "Sep 14", ago: 2, type: "day", req: 20, written: 12, rend: null, appr: null, state: "stopped" },
  { id: "b07", date: "Sep 13", ago: 3, type: "morning", req: 8, written: 8, rend: 8, appr: 8 },
  { id: "b06", date: "Sep 12", ago: 4, type: "myth", req: 20, written: 20, rend: 18, appr: 17 },
  { id: "b05", date: "Sep 11", ago: 5, type: "before", req: 12, written: 12, rend: 12, appr: 12 },
  { id: "b03", date: "Sep 8", ago: 8, type: "day", req: 24, written: 24, rend: 24, appr: 0 },
  { id: "b02", date: "Sep 6", ago: 10, type: "morning", req: 6, written: 6, rend: 6, appr: 6 },
  { id: "b01", date: "Sep 4", ago: 12, type: "myth", req: 20, written: 20, rend: 19, appr: 19 },
  /* Approved, but the type is not wired, so nothing can post yet: the decks
     wait for Wire on the type's page (D1, D7). The Status column says so. */
  { id: "b04", date: "Sep 2", ago: 14, type: "quiet", req: 10, written: 10, rend: 9, appr: 9, state: "unwired" },
];

const RANGES = [
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
  { id: "all", label: "All time", days: 100000 },
];

/* ── Styles ────────────────────────────────────────────────────────────── */

function css(phone) {
  const P = phone;
  return `
/* ── D9 page ── */
${S} .page { gap: ${P ? 16 : 24}px; }

/* Head: the title and how many batches are being shown, as on D8's grid. */
${S} .h9head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; }
${S} .h9count { font-size: 13px; line-height: 20px; color: var(--text-muted); }

/* Filters: pills by type, a dropdown for the date range. */
${S} .h9filters { display: flex; align-items: ${P ? "stretch" : "center"}; gap: 12px; ${P ? "flex-direction: column;" : ""} }
${S} .chips9 { display: flex; ${P ? "" : "flex-wrap: wrap; flex: 1;"} align-items: center; gap: 8px; min-width: 0; }
${S} .chip9 { position: relative; display: inline-flex; align-items: center; flex-shrink: 0; max-width: 220px; border-radius: 999px; border: 1px solid var(--border); background: var(--card-raised);
  padding: 5px 13px; font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-muted); white-space: nowrap;
  transition: color 150ms var(--ease), border-color 150ms var(--ease), background-color 150ms var(--ease), transform 160ms var(--ease-out-strong); }
${S} .chip9:hover { color: var(--text-primary); }
${S} .chip9:active { transform: scale(0.97); }
/* Selected: the accounts table's own selected-filter treatment (accounts-table.tsx) —
   an accent outline and tint rather than a filled accent pill, so the one filled
   accent on the screen stays the button that does something. */
${S} .chip9.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
${S} .chip9 span { overflow: hidden; text-overflow: ellipsis; }

${S} .dd9 { position: relative; flex-shrink: 0; }
${S} .dd9 .btn2 { ${P ? "width: 100%; justify-content: space-between; padding: 12px 16px;" : ""} }
${S} .ddcaret { display: flex; transition: transform 150ms var(--ease); }
${S} .dd9.on .ddcaret { transform: rotate(180deg); }
/* Popover: .glass-overlay at rounded-nested, scaled from the trigger's corner —
   D2's picker, same timings. */
${S} .catch9 { position: absolute; inset: 0; z-index: 30; display: none; }
${S} .catch9.on { display: block; }
${S} .pop9 { position: absolute; top: calc(100% + 8px); right: 0; z-index: 40; width: 208px; transform-origin: top right; border-radius: 16px; border: 1px solid var(--border); padding: 8px;
  background: var(--overlay-veil); box-shadow: var(--overlay-rim); -webkit-backdrop-filter: var(--overlay-blur); backdrop-filter: var(--overlay-blur);
  opacity: 0; visibility: hidden; pointer-events: none; transform: scale(0.97) translateY(-4px);
  transition: opacity 120ms var(--ease-out-strong), transform 120ms var(--ease-out-strong), visibility 0s 120ms; }
${S} .pop9.on { opacity: 1; visibility: visible; pointer-events: auto; transform: none; transition: opacity 180ms var(--ease-out-strong), transform 180ms var(--ease-out-strong); }
${S} .opt9 { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 12px; border-radius: 12px; padding: 8px 10px; font-size: 13px; line-height: 20px; color: var(--text-muted);
  transition: background-color 150ms var(--ease), color 150ms var(--ease); }
${S} .opt9:hover { background: color-mix(in srgb, var(--text-primary) 6%, transparent); color: var(--text-primary); }
${S} .opt9.on { color: var(--text-primary); font-weight: 500; }
${S} .optcheck9 { display: flex; width: 16px; justify-content: center; color: var(--text-primary); }

/* The table, in the app's card. */
${S} .c9 { display: flex; flex-direction: column; min-width: 0; border-radius: 24px; background: var(--card); border: 1px solid var(--border); box-shadow: var(--sh-card); }
/* D7's batch grid with the column a type's own page has no need for — which
   carousel type — and a Status column in place of D7's unlabelled state cell.
   Left-aligned throughout, as there (Garreth, 2026-09-15). Nobody's name: the
   app does not show who ran a thing anywhere (Garreth, 2026-09-16). */
${S} .hgrid { display: grid; grid-template-columns: 88px minmax(0, 1fr) repeat(4, 88px) 156px 112px; align-items: center; column-gap: 16px; text-align: left; }
${S} .hhead { padding: 16px 24px 8px; font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .hrow { position: relative; width: 100%; min-height: 52px; padding: 8px 24px; border-top: 1px solid var(--border); font-size: 14px; line-height: 20px;
  transition: background-color 150ms var(--ease); }
${S} .hrow:hover { background: color-mix(in srgb, var(--text-primary) 4%, transparent); }
${S} .hrow:last-child { border-radius: 0 0 23px 23px; }
/* The whole row opens that batch; the marker and the action sit above it. */
${S} .hopen { position: absolute; inset: 0; z-index: 0; }
${S} .hrow:last-child .hopen { border-radius: 0 0 23px 23px; }
${S} .hdate { font-weight: 500; }
${S} .htype { position: relative; z-index: 1; display: flex; min-width: 0; align-items: center; gap: 8px; pointer-events: none; }
${S} .hname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${S} .dim9 { color: var(--text-muted); }
${S} .hnum { color: var(--text-primary); }
${S} .hact { position: relative; z-index: 1; display: flex; justify-content: flex-start; }
/* Status: every row says where it got to, so the column reads straight down —
   Done, Writing 7 of 20, Stopped at 12 of 20, Not wired. */
${S} .hstatus { display: flex; min-width: 0; }
${S} .pill--accent { color: var(--accent); }
/* A status that means something went wrong is red, the way D7 marks flagged
   decks (Garreth, 2026-09-16). --danger is globals.css's own, so it changes
   with the theme; the pill's ground stays neutral. */
${S} .pill--danger { color: var(--danger); }

/* A re-run and the batch it copied. The marker names the other one by its
   date and that is all: no rail, no tint, nothing lit (Garreth, 2026-09-16).
   Filter to that type and the pair sits together on its own. */
${S} .rerun9 { display: inline-flex; flex-shrink: 0; align-items: center; gap: 4px;
  font-size: 12px; line-height: 16px; color: var(--text-muted); white-space: nowrap; }

/* Empty: the first run, and the filters finding nothing. Both use D8's block,
   and both fill the rest of the screen rather than sitting in a short box
   with dead space under it (Garreth, 2026-09-16). */
${S} .main:has(> .page.is-fill) { display: flex; flex-direction: column; }
${S} .page.is-fill { flex: 1; min-height: 0; }
${S} .page.is-fill .es9 { flex: 1; }
${S} .es9 { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; min-height: ${P ? 280 : 360}px; border-radius: 24px; border: 1px dashed var(--border);
  padding: 32px 24px; text-align: center; }
${S} .es9 .ic { display: flex; color: var(--text-muted); }
${S} .es9 p { max-width: 420px; margin: 0; font-size: 14px; line-height: 20px; color: var(--text-muted); text-wrap: pretty; }
${S} .es9 .acts { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px; margin-top: 4px; }
${
  P
    ? `
/* Phone: the table as stacked rows, and the type pills scroll sideways inside
   their own row the way the app's FilterPills does — three wrapped lines of
   them would take the top sixth of the screen before a single batch showed. */
${S} .chips9 { overflow-x: auto; padding-bottom: 2px; margin: 0 -16px; padding-left: 16px; padding-right: 16px; }
${S} .chip9 { padding: 7px 13px; }
${S} .hhead { display: none; }
${S} .hrow { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 12px; row-gap: 6px; padding: 12px 16px; }
${S} .hline1 { grid-column: 1; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; }
${S} .htype { grid-column: 1 / -1; }
${S} .hcounts { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px 8px; }
${S} .hcell { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
${S} .hcl { font-size: 11px; line-height: 15px; color: var(--text-muted); }
${S} .hcv { font-size: 14px; line-height: 18px; }
${S} .hact { grid-column: 2; grid-row: 1; align-self: start; }
/* 44px touch targets: the pill keeps its size, the hit area grows (D2). */
${S} .hact .btn2::after, ${S} .chip9::after { content: ""; position: absolute; inset: -10px -6px; }
${S} .es9 { min-height: 240px; }
`
    : ""
}
@media (prefers-reduced-motion: reduce) {
  ${S} .chip9, ${S} .hrow, ${S} .opt9, ${S} .ddcaret { transition: none; }
  ${S} .pop9 { transition: opacity 120ms linear, visibility 0s 120ms; transform: none; }
  ${S} .pop9.on { transition: opacity 150ms linear; }
}
`;
}

/* ── Markup ────────────────────────────────────────────────────────────── */

const filters = (phone) => `
          <sc-if value="{{showFilters}}" hint-placeholder-val="{{ true }}">
            <div class="h9filters">
              <div class="chips9" role="group" aria-label="Filter by carousel type">
                <sc-for list="{{chips}}" as="c" hint-placeholder-count="7">
                  <button type="button" class="chip9 {{c.cls}}" aria-pressed="{{c.pressed}}" title="{{c.name}}" onClick="{{c.pick}}"><span>{{c.name}}</span></button>
                </sc-for>
              </div>
              <div class="dd9 {{ddCls}}">
                <button type="button" class="btn2" aria-haspopup="listbox" aria-expanded="{{ddExpanded}}" onClick="{{toggleRange}}">{{rangeLabel}}<span class="ddcaret">${D9I.caretDown}</span></button>
                <div class="pop9 {{ddCls}}" role="listbox" aria-label="Date range" onKeyDown="{{ddKey}}">
                  <sc-for list="{{rangeOpts}}" as="r" hint-placeholder-count="4">
                    <button type="button" class="opt9 {{r.cls}}" role="option" aria-selected="{{r.selected}}" onClick="{{r.pick}}">{{r.label}}<span class="optcheck9"><sc-if value="{{r.isSelected}}" hint-placeholder-val="{{ false }}">${D9I.check}</sc-if></span></button>
                  </sc-for>
                </div>
              </div>
            </div>
          </sc-if>`;

/* The state pill rides in the type cell on the desktop, where there is room
   beside the name, so every row stays one line tall. */
const desktopRow = `
              <div class="hrow hgrid">
                <button type="button" class="hopen" aria-label="{{b.openLabel}}" onClick="{{b.open}}"></button>
                <span class="hdate tnum">{{b.date}}</span>
                <span class="htype">
                  <span class="hname" title="{{b.name}}">{{b.name}}</span>
                  <sc-if value="{{b.hasRerun}}" hint-placeholder-val="{{ false }}"><span class="rerun9">${D9I.rerun}{{b.rerunText}}</span></sc-if>
                </span>
                <span class="tnum {{b.reqCls}}">{{b.req}}</span>
                <span class="tnum {{b.writtenCls}}">{{b.written}}</span>
                <span class="tnum {{b.rendCls}}">{{b.rend}}</span>
                <span class="tnum {{b.apprCls}}">{{b.appr}}</span>
                <span class="hstatus"><span class="pill {{b.pillCls}} tnum">{{b.pillText}}</span></span>
                <span class="hact"><button type="button" class="btn2" onClick="{{b.act}}">{{b.actLabel}}</button></span>
              </div>`;

const phoneRow = `
              <div class="hrow">
                <button type="button" class="hopen" aria-label="{{b.openLabel}}" onClick="{{b.open}}"></button>
                <span class="hline1">
                  <span class="hdate tnum">{{b.date}}</span>
                  <span class="pill {{b.pillCls}} tnum">{{b.pillText}}</span>
                </span>
                <span class="htype">
                  <span class="hname" title="{{b.name}}">{{b.name}}</span>
                  <sc-if value="{{b.hasRerun}}" hint-placeholder-val="{{ false }}"><span class="rerun9">${D9I.rerun}{{b.rerunText}}</span></sc-if>
                </span>
                <span class="hcounts">
                  <span class="hcell"><span class="hcl">Requested</span><span class="hcv tnum {{b.reqCls}}">{{b.req}}</span></span>
                  <span class="hcell"><span class="hcl">Written</span><span class="hcv tnum {{b.writtenCls}}">{{b.written}}</span></span>
                  <span class="hcell"><span class="hcl">Rendered</span><span class="hcv tnum {{b.rendCls}}">{{b.rend}}</span></span>
                  <span class="hcell"><span class="hcl">Approved</span><span class="hcv tnum {{b.apprCls}}">{{b.appr}}</span></span>
                </span>
                <span class="hact"><button type="button" class="btn2" onClick="{{b.act}}">{{b.actLabel}}</button></span>
              </div>`;

function page(phone) {
  const row = phone ? phoneRow : desktopRow;
  return `
      <main class="main">
        <div class="page {{pageCls}}">
          <div class="h9head">
            <h1>History</h1>
            <sc-if value="{{showCount}}" hint-placeholder-val="{{ true }}"><span class="h9count tnum">{{count}}</span></sc-if>
          </div>
          ${filters(phone)}
          <sc-if value="{{showTable}}" hint-placeholder-val="{{ true }}">
            <section class="c9">
              ${phone ? "" : `<div class="hhead hgrid"><span>Date</span><span>Carousel type</span><span>Requested</span><span>Written</span><span>Rendered</span><span>Approved</span><span>Status</span><span></span></div>`}
              <sc-for list="{{rows}}" as="b" hint-placeholder-count="${phone ? 5 : 11}">${row}
              </sc-for>
            </section>
          </sc-if>
          <sc-if value="{{showEmpty}}" hint-placeholder-val="{{ false }}">
            <div class="es9">
              <span class="ic">${D9I.clock}</span>
              <p>{{emptyText}}</p>
              <div class="acts">
                <sc-if value="{{emptyFirst}}" hint-placeholder-val="{{ true }}"><button type="button" class="cta" onClick="{{generate}}">Generate</button></sc-if>
                <sc-if value="{{emptyFiltered}}" hint-placeholder-val="{{ false }}"><button type="button" class="btn2" onClick="{{clearFilters}}">Clear filters</button></sc-if>
              </div>
            </div>
          </sc-if>
        </div>
      </main>
      <div class="catch9 {{ddCls}}" aria-hidden="true" onClick="{{closeRange}}"></div>`;
}

/* ── Behaviour ─────────────────────────────────────────────────────────── */

function vals(init) {
  return `
    var P = s.params || {};
    var BATCHES = ${JSON.stringify(BATCHES)};
    var TYPES = ${JSON.stringify(TYPES)};
    var RANGES = ${JSON.stringify(RANGES)};
    /* Opened from a type's own page, History arrives already filtered to it
       (D7's "History ›"); pressing a pill takes over from there. */
    var TYPE = s.h9type || idOfName[P.type] || P.type || "all";

    var typeOf = function (id) {
      for (var i = 0; i < TYPES.length; i++) if (TYPES[i].id === id) return TYPES[i];
      return null;
    };
    var nameOf = function (id) { var t = typeOf(id); return t ? t.name : id; };
    /* A type's page hands History the type's NAME, not its id (D7's History ›). */
    var idOfName = {};
    TYPES.forEach(function (t) { idOfName[t.name] = t.id; });
    var batchOf = function (id) {
      for (var i = 0; i < BATCHES.length; i++) if (BATCHES[i].id === id) return BATCHES[i];
      return null;
    };
    /* Which batch was made from which: the marker reads both ways. */
    var rerunBy = {};
    BATCHES.forEach(function (b) { if (b.rerunOf) rerunBy[b.rerunOf] = b.id; });
    /* A type with a run in progress: Run again opens that batch instead (F5). */
    var running = {};
    BATCHES.forEach(function (b) { if (b.state === "running") running[b.type] = b; });

    var days = RANGES.filter(function (r) { return r.id === s.h9range; })[0] || RANGES[1];
    var firstRun = ${init.empty === "first"};
    var shown = firstRun ? [] : BATCHES.filter(function (b) {
      return (TYPE === "all" || b.type === TYPE) && b.ago <= days.days;
    });

    var num = function (v) { return v == null ? "—" : String(v); };
    var numCls = function (v) { return v == null ? "dim9" : "hnum"; };

    var rows = shown.map(function (b) {
      var t = typeOf(b.type) || {};
      var name = nameOf(b.type);
      /* What D1 and D7 hand the batch screens, so the slide size travels. */
      var handover = { name: name, character: t.character, slides: t.slides + " slides", size: t.size || "4:5", count: b.req };
      var mate = b.rerunOf || rerunBy[b.id] || null;
      var mateB = mate ? batchOf(mate) : null;
      var run = running[b.type];
      return {
        date: b.date,
        name: name,
        openLabel: name + ", " + b.date + ", opens this batch",
        req: num(b.req), reqCls: numCls(b.req),
        written: num(b.written), writtenCls: numCls(b.written),
        rend: num(b.rend), rendCls: numCls(b.rend),
        appr: num(b.appr), apprCls: numCls(b.appr),
        /* Every row says where it got to. A stopped batch just says Stopped:
           how far it got is the Written column's job. */
        pillText: b.state === "running"
          ? "Writing " + b.written + " of " + b.req
          : b.state === "stopped" ? "Stopped"
            : b.state === "unwired" ? "Not wired" : "Done",
        pillCls: b.state === "running" ? "pill--accent" : b.state === "stopped" ? "pill--danger" : "",
        hasRerun: !!mateB,
        rerunText: !mateB ? "" : b.rerunOf ? "Re-run of " + mateB.date : "Re-run on " + mateB.date,
        open: function () {
          if (b.state === "stopped") ctx.open("batch", Object.assign({ writtenUpTo: b.written }, handover), "Opens the stopped batch, with Continue · D3");
          else if (b.state === "running") ctx.open("batch", Object.assign({ writtenUpTo: b.written }, handover), "Opens the running batch · D3");
          else ctx.open("render", handover, "Opens that batch's decks, rendered and approved · D5");
        },
        actLabel: b.state === "running" ? "Open batch" : b.state === "stopped" ? "Continue" : "Run again",
        act: function () {
          if (b.state === "running") ctx.open("batch", Object.assign({ writtenUpTo: b.written }, handover), "Opens the running batch · D3");
          else if (b.state === "stopped") ctx.open("batch", Object.assign({ writtenUpTo: b.written }, handover), "Continues the batch where it stopped · D3");
          /* A type already writing a batch: Run again opens that one (F5). */
          else if (run) {
            var rt = typeOf(run.type) || {};
            ctx.open("batch", { name: name, character: rt.character, slides: rt.slides + " slides", size: rt.size || "4:5", count: run.req, writtenUpTo: run.written },
              name + " is already writing a batch — opens that one instead · D3");
          }
          else ctx.open("batch", handover, "Runs " + name + " again: same count, same note · D3");
        }
      };
    });

    var chips = [{ id: "all", name: "All types" }].concat(TYPES).map(function (t) {
      var on = TYPE === t.id;
      return {
        name: t.name,
        cls: on ? "on" : "",
        pressed: on ? "true" : "false",
        pick: function () { self.setState({ h9type: t.id }); }
      };
    });

    var rangeOpts = RANGES.map(function (r) {
      var on = s.h9range === r.id;
      return {
        label: r.label,
        cls: on ? "on" : "",
        selected: on ? "true" : "false",
        isSelected: on,
        pick: function () { self.setState({ h9range: r.id, h9open: false }); }
      };
    });

    var counted = shown.length === 1 ? "1 batch" : shown.length + " batches";

    return {
      showCount: !firstRun && shown.length > 0,
      count: counted,
      showFilters: !firstRun,
      showTable: shown.length > 0,
      rows: rows,

      chips: chips,
      rangeLabel: days.label,
      rangeOpts: rangeOpts,
      ddCls: s.h9open ? "on" : "",
      ddExpanded: s.h9open ? "true" : "false",
      toggleRange: function () { self.setState({ h9open: !s.h9open }); },
      closeRange: function () { self.setState({ h9open: false }); },
      ddKey: function (e) { if (e.key === "Escape") self.setState({ h9open: false }); },

      showEmpty: shown.length === 0,
      /* An empty state fills the rest of the screen (Garreth, 2026-09-16). */
      pageCls: shown.length === 0 ? "is-fill" : "",
      emptyFirst: firstRun,
      emptyFiltered: !firstRun,
      emptyText: firstRun
        ? "No batches yet"
        : "No batches for " + (TYPE === "all" ? "any carousel type" : nameOf(TYPE)) + " in the " + days.label.toLowerCase(),
      clearFilters: function () { self.setState({ h9type: "all", h9range: "30" }); },
      generate: function () { ctx.open("types", null, "Opens Carousel types, to pick what to generate · D1"); }
    };
`;
}

export function historyScreen({ init = {} } = {}) {
  const full = { type: "all", range: "30", dropdown: false, empty: null, phone: false, ...init };
  return {
    id: "history",
    nav: "history",
    css: (phone) => css(phone),
    markup: (phone) => page(phone),
    state: {
      h9type: full.type,
      h9range: full.range,
      h9open: !!full.dropdown,
      },
    /* Opened from the menu or another screen: back to everything, newest
       first — except a type that named itself in the parameters. */
    enter: { h9type: null, h9range: "30", h9open: false },
    vals: vals(full),
  };
}

/* ── Review artboards ──────────────────────────────────────────────────── */

/*
 * Every {{name}} the markup asks for has to be handed over by something; a
 * name nothing supplies renders as nothing at all, silently. D8's net, run on
 * every board here too.
 */
const KEYWORDS = new Set(["true", "false", "null", "undefined"]);

function checkBindings(file, html) {
  const at = html.indexOf("<script data-dc-script");
  const markup = html.slice(0, at);
  const script = html.slice(at);
  const aliases = new Set([...markup.matchAll(/\bas="([^"]+)"/g)].map((m) => m[1]));
  const handed = new Set([...script.matchAll(/(?:^|[,{])\s*([A-Za-z_$][\w$]*)\s*:/gm)].map((m) => m[1]));
  const missing = new Set();
  for (const m of markup.matchAll(/\{\{\s*([A-Za-z_$][\w$]*)/g)) {
    const root = m[1];
    if (!KEYWORDS.has(root) && !aliases.has(root) && !handed.has(root)) missing.add(root);
  }
  if (missing.size) {
    const names = [...missing].join(", ");
    throw new Error(`${file}: the markup asks for ${names}, and nothing hands ${missing.size > 1 ? "them" : "it"} over`);
  }
}

function build(OUT) {
  fs.mkdirSync(OUT, { recursive: true });

  const BOARDS = [
    { file: "Main.dc.html", title: "D9 · History · Desktop", init: {}, row: 0, col: 0 },
    { file: "Range.dc.html", title: "D9 · Choosing the date range · Desktop", init: { dropdown: true }, row: 0, col: 1 },
    {
      file: "Paired.dc.html",
      title: "D9 · A re-run and the batch it copied · Desktop",
      init: { type: "before" },
      row: 0,
      col: 2,
    },
    { file: "NoResults.dc.html", title: "D9 · The filters found nothing · Desktop", init: { type: "quiet", range: "7" }, row: 0, col: 3 },
    { file: "FirstRun.dc.html", title: "D9 · No batches yet · Desktop", init: { empty: "first" }, row: 0, col: 4 },
    { file: "Phone.dc.html", title: "D9 · History · Phone", phone: true, init: { phone: true }, row: 0, col: 5 },
    { file: "PhoneRange.dc.html", title: "D9 · The date range on a phone · Phone", phone: true, init: { phone: true, dropdown: true }, row: 0, col: 6 },
    { file: "PhoneEmpty.dc.html", title: "D9 · No batches yet · Phone", phone: true, init: { phone: true, empty: "first" }, row: 0, col: 7 },
  ];

  /* Rows are laid out from the tallest board in each one, so a board that
     grows cannot land on its neighbour (D8's rule). */
  const GAP_X = 100;
  const GAP_Y = 120;
  const height = (b) => b.init.tall || (b.phone ? 844 : 900);
  const rowTop = [];
  for (let r = 0, y = 0; ; r += 1) {
    const inRow = BOARDS.filter((b) => b.row === r);
    if (!inRow.length) break;
    rowTop[r] = y;
    y += Math.max(...inRow.map(height)) + GAP_Y;
  }
  const colLeft = [];
  for (let c = 0, x = 0; ; c += 1) {
    const inCol = BOARDS.filter((b) => b.col === c);
    if (!inCol.length) break;
    colLeft[c] = x;
    x += Math.max(...inCol.map((b) => (b.phone ? 390 : 1440))) + GAP_X;
  }
  const noteX = colLeft[colLeft.length - 1] + 390 + GAP_X * 2;

  const artboards = [];
  for (const light of [false, true]) {
    for (const b of BOARDS) {
      const phone = !!b.phone;
      const file = light ? b.file.replace(".dc.html", "Light.dc.html") : b.file;
      const html = artboard({ phone, light, screens: [historyScreen({ init: { ...b.init, phone } })], navMode: "note" });
      checkBindings(file, html);
      fs.writeFileSync(path.join(OUT, file), html);
      artboards.push({
        file,
        title: light ? `${b.title} · Light` : b.title,
        page: light ? "light" : "dark",
        x: colLeft[b.col],
        y: rowTop[b.row],
        w: phone ? 390 : 1440,
        h: b.init.tall || (phone ? 844 : 900),
        is_interactive: true,
      });
    }
  }

  const tryNote =
    "Clickable. The type pills and the date range really filter, and the count beside the title follows them.\n\nFilter to Before & After to see a re-run sitting above the batch it copied. Each one names the other by its date, and nothing is highlighted.\n\nRun again on a Myth vs Fact row says so, because that type is already writing a batch (F5).\n\nThe four counts read in the order the batch runs — Requested, Written, Rendered, Approved — which is the model D5 was built on: the sign-off is Approve on the finished batch. Each gap says something: what was discarded while writing, what the gate flagged, what the render checks caught.";
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
          { id: "d9-try", page: "dark", x: noteX, y: 0, w: 390, text: tryNote },
          { id: "d9-try-light", page: "light", x: noteX, y: 0, w: 390, text: tryNote },
        ],
        launch: { view: "canvas", page: "dark" },
      },
      null,
      2,
    ),
  );
  console.log(`Wrote D9 artboards to ${OUT}`);
}

if (isMain(import.meta.url)) build(path.resolve(process.argv[2] ?? path.join(HERE, "out")));
