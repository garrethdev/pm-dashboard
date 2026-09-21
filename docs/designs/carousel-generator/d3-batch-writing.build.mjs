#!/usr/bin/env node
/*
 * D3 · Batch, while writing — opened by Generate on the D2 form, or by Open
 * running batch on a D1 card.
 *
 * Design step only (docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md, D3). Nothing
 * here is app code. The shell (menu, top bar, glow, both themes, phone drawer,
 * prototype note) comes from generator-kit.mjs; this file is the screen. All
 * content is made-up sample data. Approved by Garreth 2026-09-14.
 *
 * One live screen serves both uses. The review artboards are pictures of it at
 * a chosen moment (a starting state, timers off); prototype.build.mjs runs it
 * with timers on, so decks fill in one by one, deck 5 fails once, deck 6 is
 * flagged and rings the bell, and Regenerate, Retry and the bell all work.
 *
 * The deck card shows what writing needs: the deck number, its state, the hook,
 * slides 2 onward, the caption, the music and Regenerate. The hook and slides
 * sit in a fixed-height box that scrolls, so every card's caption rule and
 * footer line up (Garreth, 2026-09-14). D4 builds on the same card.
 *
 * Reopened during D4's review (Garreth, 2026-09-14): Regenerate is a full-width
 * button at the bottom of every card, whatever its state (a still skeleton
 * until the deck has copy, Retry on a failed deck), the title no longer
 * carries the character and slide-count pills, and a deck sent back with
 * feedback says Rewriting (not Writing) once its turn comes.
 *
 * Decisions from review (Garreth, 2026-09-14): a written deck can be
 * regenerated with feedback while the rest keep writing, and waits as Up next;
 * nothing is approved while a batch writes; a flagged deck is never rendered,
 * rings the bell, and the bell's item leads to it in a red outline; card
 * buttons are the Secondary button's shape, outline only; no Stop for the batch.
 *
 * Run directly, it writes D3's review artboards and canvas.json, each twice
 * (Dark page, Light page):
 *   Main                desktop, 7 of 20 written, deck 8 writing
 *   Phone               phone, the top of the same batch
 *   PhoneScrolled       phone, scrolled to where written meets unwritten
 *   Regenerate          desktop, feedback open on deck 2, deck 4 up next
 *   PhoneRegenerate     phone, feedback open on deck 2
 *   FlaggedNotify       desktop, deck 6 flagged, the bell's panel open
 *   Flagged             desktop, opened from the bell: deck 6 in its red outline
 *   PhoneFlaggedNotify  phone, the bell's panel open
 *   PhoneFlagged        phone, scrolled to the flagged deck
 *   Stalled             desktop, no movement for over 60 seconds
 *   Failed              desktop, one deck's writing failed, the rest carry on
 *   Stopped             desktop, a batch that stopped part-way, reopened
 *   PhoneStopped        phone, the same, Continue in a bottom bar
 * Imported, `batchScreen({ auto: true })` is the screen the prototype opens.
 *
 * D12 · Auto mode (Garreth, 2026-09-21) is designed on this same screen and its
 * pictures sit on this canvas, after D3's own (Garreth, 2026-09-21: no separate
 * D12 canvas, so a developer finds a screen's states in one place).
 * `AUTO_MOMENTS` holds the four moments as `init` objects. In Auto the
 * batch needs nobody: writing runs into rendering, a flagged deck rewrites
 * itself up to three times and is then Dropped — still on the screen, never
 * rendered, still regenerable by hand — and no flag rings the bell. Pause hands
 * the batch back to the person; Resume takes it again. D3's own artboards are
 * unchanged; the Auto boards are added after them.
 *
 *   node docs/designs/carousel-generator/d3-batch-writing.build.mjs <out dir>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { I, icon, artboard, isMain } from "./generator-kit.mjs";
import { typesScreen } from "./d1-carousel-types.build.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const D3I = {
  music: icon("MusicNotes", 12),
  warn: icon("Warning", 14),
  retry: icon("ArrowClockwise", 12, "bold"),
  arrow: icon("ArrowUpRight", 14, "bold"),
  pause: icon("Pause", 12),
  play: icon("Play", 12),
};

/* ── Sample content ────────────────────────────────────────────────────── */

/* Invented copy for a "Before & After" batch whose opening line is Written.
   Hook 5 and one body line are long on purpose, to test wrapping and the scroll. */
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
/* Slide rows drawn per card: slides 2 to 10, shown up to the type's slide count. */
const ROWS = 9;
const FLAG_REASON = "Compliance: brand name";

/* ── Styles ────────────────────────────────────────────────────────────── */

function css(phone, { tall }) {
  const S = ".screen-batch";
  return `
/* ── D3 page ── */
/* Status colours the shell does not carry, at globals.css's values in both themes. */
:root { --ok: #4ade80; --warn: #fbbf24; --pill-red: #ff4949; --pill-yellow: #fff949; }
.app.is-light { --ok: #166534; --warn: #92400e; --pill-red: #a11616; --pill-yellow: #6b4f03; }
${tall ? `.app${S} { height: ${tall}px; }` : ""}

${S} .phead { display: flex; flex-direction: column; align-items: flex-start; }
${S} .upcrumb { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 4px -2px; padding: 2px; border-radius: 8px; font-size: 13px; line-height: 20px; font-weight: 500; color: var(--text-muted); transition: color 150ms var(--ease); }
${S} .upcrumb:hover { color: var(--text-primary); }
${S} .ptitle { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; align-self: stretch; }
${S} .cmeta { display: flex; flex-wrap: wrap; gap: 6px; }
${S} .pill--accent { color: var(--accent); }
${S} .pill--danger { color: var(--pill-red); }
/* Text button — D2's .tbtn. */
${S} .tbtn { position: relative; display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; border-radius: 8px; padding: 2px 4px; font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-muted); transition: color 150ms var(--ease); }
${S} .tbtn:hover { color: var(--text-primary); }
/* Buttons on a card: the Secondary button's shape and size, outline only, no fill (Garreth, 2026-09-14). */
${S} .btn2--line { background: transparent; }

/* The progress line. Sticky under the top bar, so the count stays in view across every card. */
${S} .prog { position: sticky; top: 61px; z-index: 15; margin: -8px -24px -8px; padding: 12px 24px 14px; border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 70%, transparent); -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px); }
${S} .prow { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; min-height: 20px; }
${S} .pcount { font-size: 14px; line-height: 20px; font-weight: 500; }
${S} .pmeta { font-size: 13px; line-height: 20px; color: var(--text-muted); }
${S} .pwarn { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; line-height: 20px; color: var(--warn); }
${S} .pdeck { font-weight: 500; color: var(--warn); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: color-mix(in srgb, var(--warn) 45%, transparent); }
${S} .pfail { font-size: 13px; line-height: 20px; color: var(--danger); }
${S} .prow .cta { margin-left: auto; }
/* D12 · Auto mode. Dropped decks are counted like the failed ones, in the muted tone: nothing went wrong,
   the batch simply moved on without them. The Pause control is the Secondary button, at the row's far end,
   so the count and the state read first and the control is always under the thumb in the sticky row. */
${S} .pdrop { font-size: 13px; line-height: 20px; color: var(--text-muted); }
${S} .prow .a12btn { margin-left: auto; padding: 9px 16px; font-size: 13px; }
/* design-system.html · Working: a 6px track, the fill turning warn when it stalls. */
${S} .track { position: relative; height: 6px; margin-top: 10px; border-radius: 4px; overflow: hidden; background: color-mix(in srgb, var(--text-muted) 20%, transparent); }
${S} .track i { position: absolute; inset-block: 0; left: 0; display: block; border-radius: 4px; background: var(--accent); transition: width 300ms var(--ease-out-strong), background-color 200ms var(--ease); }
${S} .prog.is-stalled .track i { background: var(--warn); }

/* Deck grid */
${S} .grid { display: grid; grid-template-columns: repeat(${phone ? 1 : 3}, minmax(0, 1fr)); gap: 12px; }
${S} .deck { display: flex; flex-direction: column; min-width: 0; border-radius: 24px; padding: 20px; background: var(--card); border: 1px solid var(--border); box-shadow: var(--sh-card);
  transition: border-color 200ms var(--ease), box-shadow 200ms var(--ease); }
${S} .dtop { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 20px; margin-bottom: 12px; }
${S} .dno { font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-muted); }
${S} .dhook { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; letter-spacing: -0.01em; text-wrap: pretty; overflow-wrap: anywhere; }
${S} .dslides { display: flex; flex-direction: column; gap: 4px; margin: 12px 0 0; padding: 0; list-style: none; }
${S} .dslides li { display: flex; gap: 8px; min-height: 20px; font-size: 13px; line-height: 20px; }
${S} .dn { width: 14px; flex-shrink: 0; text-align: right; color: var(--text-muted); }
${S} .dt { min-width: 0; text-wrap: pretty; overflow-wrap: anywhere; }
/* The hook and slides sit in a fixed-height box that scrolls, and the caption holds two lines, so the caption's
   rule and the footer line up across every card (Garreth, 2026-09-14). The bottom fade falls on the box's own
   padding when the copy fits, and on the words when it runs on, which is the cue that it scrolls. */
${S} .dcopy { height: ${phone ? 240 : 224}px; overflow-y: auto; overscroll-behavior: contain; padding-bottom: 16px;
  -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 16px), transparent); mask-image: linear-gradient(to bottom, #000 calc(100% - 16px), transparent); }
${S} .dcopy:focus-visible { outline-offset: 4px; border-radius: 8px; }
${S} .dcap { height: 53px; overflow-y: auto; margin: 0; padding-top: 12px; border-top: 1px solid var(--border); font-size: 13px; line-height: 20px; color: var(--text-muted); text-wrap: pretty; }
/* The music. */
${S} .dfoot { display: flex; align-items: center; gap: 8px; min-height: 30px; margin-top: 10px; }
${S} .dmusic { display: flex; flex: 1; min-width: 0; align-items: center; gap: 6px; font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .dmusic span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* Regenerate: the bottom of every card, full width, whatever the deck's state (Garreth, 2026-09-14, in D4's review).
   A deck with nothing to regenerate yet holds its shape as a skeleton; a failed deck's Retry takes the same place. */
/* Pinned to the card's bottom edge, so it sits in the same place on every card in a row, however short the card's
   own content (Garreth, 2026-09-14). The card is a flex column; the auto margin takes up the slack. */
${S} .dact { margin-top: auto; padding-top: 12px; }
${S} .btn2--full { display: flex; width: 100%; justify-content: center; padding: 8px 14px; }
${S} .dact .sk { display: block; height: 34px; }

/* Not written yet: the card's shape, still. Writing: the same shape, pulsing (skeleton.tsx). */
${S} .sk { display: block; height: 8px; border-radius: 999px; background: var(--card-raised); }
${S} .dslides .sk { align-self: center; }
${S} .dhook .sk { height: 12px; margin: 6px 0; }
${S} .dcap .sk { margin: 6px 0; }
${S} .deck.is-waiting .dn, ${S} .deck.is-upnext .dn { opacity: 0.5; }
${S} .deck.is-writing .sk { animation: d3-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes d3-pulse { 50% { opacity: 0.5; } }
/* The light theme's raised card is too close to its card for a skeleton to read, so the bar takes the border tone. */
.is-light ${S} .sk { background: var(--border); }

/* Up next: a deck sent back with feedback, waiting its turn ahead of the unwritten ones. The note stays on it,
   as quoted text rather than a box, so it never reads as a field still open for typing. */
${S} .dnote { margin: 0 0 12px; font-size: 13px; line-height: 20px; color: var(--text-muted); text-wrap: pretty; overflow-wrap: anywhere; }

/* Feedback open: the deck being edited is the same card in .glass (flows §3). */
${S} .deck.is-editing { background: var(--glass); border-color: var(--glass-border); box-shadow: var(--glass-highlight), var(--sh-card); -webkit-backdrop-filter: var(--glass-blur); backdrop-filter: var(--glass-blur); }
.is-light ${S} .deck.is-editing { border-color: color-mix(in srgb, var(--text-muted) 40%, var(--border)); }
${S} .dfb { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); }
${S} .dfb textarea { display: block; width: 100%; min-height: 84px; resize: none; margin: 0; border-radius: 16px; border: 1px solid var(--border); background: var(--card-sunken); padding: 10px 14px;
  font: inherit; font-size: ${phone ? 16 : 14}px; line-height: 20px; color: var(--text-primary); outline: none; transition: box-shadow 150ms var(--ease); }
${S} .dfb textarea::placeholder { color: var(--text-muted); }
${S} .dfb textarea.is-focus, ${S} .dfb textarea:focus { box-shadow: 0 0 0 2px var(--accent); }
${S} .dfbact { display: flex; align-items: center; justify-content: flex-end; gap: 12px; }

/* Flagged: never rendered. A subtle red outline marks it, which is where the bell's item lands (Garreth, 2026-09-14). */
${S} .deck.is-flagged { border-color: color-mix(in srgb, var(--danger) 45%, var(--border)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--danger) 22%, transparent), var(--sh-card); }

/* D12 · Auto mode on a card. A deck can now carry two pills (Rewriting · Try 2 of 3, Dropped · its reason), so the
   deck number takes the slack and the pills stay grouped at the right, where a single pill already sits. */
${S} .dtop .dno { margin-right: auto; }
/* The dropped deck's reason: the same pill shape in the neutral tone, never red, and it gives way before the card does. */
${S} .pill--quiet { display: inline-block; min-width: 0; flex-shrink: 1; overflow: hidden; text-overflow: ellipsis; }
/* Dropped: the copy is still there to read and to regenerate, but dimmed, so the card reads as out of the batch.
   Regenerate keeps its full strength: it is the way back in. */
${S} .deck.is-dropped .dbody { opacity: 0.45; }
/* Light mode dims on white, where the muted copy gives out sooner, so it keeps a little more of itself. */
.is-light ${S} .deck.is-dropped .dbody { opacity: 0.62; }

/* Failed: the error and Retry take the hook's place, so the card keeps its height. */
${S} .derr { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 48px; font-size: 13px; line-height: 20px; color: var(--danger); }

/* Copy arriving: fades up in place, never scales (flows §3). */
${S} .deck.is-new .dbody { animation: d3-arrive 220ms var(--ease-out-strong); }
@keyframes d3-arrive { from { opacity: 0; transform: translateY(4px); } }

/* The bell's unread dot — topbar.tsx: bg-danger while an alert is unread. Drawn over the kit's bell,
   anchored to the column's right edge so it follows the bell when the menu folds. */
${S} .d3-dot { position: absolute; top: 20px; right: ${phone ? 72 : 80}px; z-index: 30; width: 8px; height: 8px; border-radius: 999px; background: var(--danger); pointer-events: none; }
/* The notifications panel — topbar.tsx: rounded-nested, border, glass-overlay, p-2, w-96, hung under the bell. */
${S} .ncatch { position: absolute; inset: 0; z-index: 60; }
${S} .npop { position: absolute; top: 69px; ${phone ? "left: 16px; right: 16px;" : "right: 72px; width: 384px;"} z-index: 65; max-height: 70%; overflow-y: auto; border-radius: 16px; border: 1px solid var(--border); padding: 8px;
  background: var(--overlay-veil); box-shadow: var(--overlay-rim); -webkit-backdrop-filter: var(--overlay-blur); backdrop-filter: var(--overlay-blur);
  transform-origin: top right; animation: d3-pop 180ms var(--ease-out-strong); }
@keyframes d3-pop { from { opacity: 0; transform: scale(0.97) translateY(-4px); } }
${S} .nhead { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px 8px; }
${S} .nhead b { font-size: 14px; line-height: 20px; font-weight: 600; }
${S} .nhead button { font-size: 12px; line-height: 16px; font-weight: 500; color: var(--accent); }
${S} .nhead span { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .nlist { display: flex; flex-direction: column; }
${S} .nlist > * + * { border-top: 1px solid var(--border); }
${S} .nitem { display: block; width: 100%; border-radius: 10px; padding: 0 12px; transition: background-color 150ms var(--ease); }
${S} .nitem:hover, ${S} .nitem.is-hover { background: var(--card-raised); }
${S} .nin { display: flex; gap: 8px; padding: 10px 0; }
${S} .ndot { width: 6px; height: 6px; margin-top: 7px; flex-shrink: 0; border-radius: 999px; }
${S} .is-unread .ndot { background: var(--accent); }
${S} .nmain { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 4px; }
${S} .ntop { display: flex; align-items: flex-start; gap: 8px; }
${S} .ntitle { flex: 1; min-width: 0; font-size: 14px; line-height: 20px; color: var(--text-muted); }
${S} .is-unread .ntitle { font-weight: 600; color: var(--text-primary); }
${S} .ncat { display: inline-block; margin-left: 8px; border-radius: 999px; padding: 2px 8px; vertical-align: 1px; font-size: 11px; line-height: 14px; font-weight: 500; white-space: nowrap; color: var(--text-muted); background: color-mix(in srgb, var(--text-muted) 10%, transparent); }
${S} .ntop svg { margin-top: 3px; color: var(--accent); }
${S} .nbody { display: block; font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .ntime { display: block; font-size: 11px; line-height: 16px; color: color-mix(in srgb, var(--text-muted) 70%, transparent); }
${
  phone
    ? `
/* Phone: one column; Continue lives in a bottom bar, as Generate does on D2. */
${S} .main { padding-bottom: 96px; }
${S} .note { bottom: 96px; }
${S} .prog.is-stopped { display: none; }
${S} .bar { position: absolute; left: 0; right: 0; bottom: 0; z-index: 25; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 70%, transparent); -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px); }
${S} .bar .status { min-width: 0; font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .bar .status b { display: block; font-size: 13px; line-height: 18px; font-weight: 500; color: var(--text-primary); }
${S} .bar .cta { margin-left: auto; padding: 15px 26px; }
/* 44px touch targets: the controls keep their look, the hit area grows. */
${S} .dfoot .btn2::after, ${S} .dfb .btn2::after, ${S} .tbtn::after { content: ""; position: absolute; inset: -12px -8px; }
${S} .prow .a12btn::after { content: ""; position: absolute; inset: -7px 0; }
${S} .dact .btn2::after { content: ""; position: absolute; inset: -5px 0; }
`
    : ""
}
.is-light ${S} .prog { background: color-mix(in srgb, var(--bg) 85%, transparent); }
@media (prefers-reduced-motion: reduce) {
  ${S} .deck.is-writing .sk { animation: none; opacity: 0.7; }
  ${S} .deck.is-new .dbody { animation: d3-fade 150ms linear; }
  ${S} .npop { animation: d3-fade 150ms linear; }
  ${S} .track i, ${S} .dfb textarea, ${S} .deck { transition: none; }
}
@keyframes d3-fade { from { opacity: 0; } }
`;
}

/* ── Markup ────────────────────────────────────────────────────────────── */

const rows = (inner) =>
  Array.from({ length: ROWS }, (_, k) => `<sc-if value="{{d.s${k}}}" hint-placeholder-val="{{ ${k < 6} }}"><li><span class="dn tnum">${k + 2}</span>${inner(k)}</li></sc-if>`).join("");

const deckCard = `
            <article class="deck {{d.cls}}" id="deck-{{d.n}}" aria-label="{{d.label}}" aria-busy="{{d.busy}}">
              <div class="dtop">
                <span class="dno tnum">{{d.label}}</span>
                <sc-if value="{{d.pillWritten}}" hint-placeholder-val="{{ true }}"><span class="pill">Written</span></sc-if>
                <sc-if value="{{d.pillFlag}}" hint-placeholder-val="{{ false }}"><span class="pill pill--danger">{{d.flag}}</span></sc-if>
                <sc-if value="{{d.pillWriting}}" hint-placeholder-val="{{ false }}"><span class="pill pill--accent">Writing</span></sc-if>
                <sc-if value="{{d.pillRewriting}}" hint-placeholder-val="{{ false }}"><span class="pill pill--accent">Rewriting</span></sc-if>
                <sc-if value="{{d.pillFailed}}" hint-placeholder-val="{{ false }}"><span class="pill pill--danger">Failed</span></sc-if>
                <sc-if value="{{d.pillUpnext}}" hint-placeholder-val="{{ false }}"><span class="pill">Up next</span></sc-if>
                <!-- D12 · Auto mode: how many goes Auto has had at this deck, and the deck it gave up on. -->
                <sc-if value="{{d.a12Dropped}}" hint-placeholder-val="{{ false }}"><span class="pill">Dropped</span><span class="pill pill--quiet">{{d.flag}}</span></sc-if>
                <sc-if value="{{d.a12Tries}}" hint-placeholder-val="{{ false }}"><span class="pill tnum">{{d.a12TriesText}}</span></sc-if>
              </div>
              <sc-if value="{{d.hasCopy}}" hint-placeholder-val="{{ true }}">
                <div class="dbody">
                  <div class="dcopy" tabindex="0" role="region" aria-label="{{d.copyLabel}}">
                    <p class="dhook">{{d.hook}}</p>
                    <ol class="dslides">${rows((k) => `<span class="dt">{{d.t${k}}}</span>`)}</ol>
                  </div>
                  <p class="dcap">{{d.caption}}</p>
                  <div class="dfoot">
                    <div class="dmusic">${D3I.music}<span>Artist Name – Song Title</span></div>
                  </div>
                </div>
                <sc-if value="{{d.isEditing}}" hint-placeholder-val="{{ false }}">
                  <div class="dfb">
                    <textarea class="{{d.taCls}}" rows="3" aria-label="{{d.fbLabel}}" placeholder="Shorter hook, warmer tone" value="{{d.note}}" onChange="{{d.type}}"></textarea>
                    <div class="dfbact">
                      <button type="button" class="tbtn" onClick="{{d.cancel}}">Cancel</button>
                    </div>
                  </div>
                </sc-if>
                <div class="dact">
                  <sc-if value="{{d.showRegen}}" hint-placeholder-val="{{ true }}"><button type="button" class="btn2 btn2--line btn2--full" onClick="{{d.regen}}">${D3I.retry}Regenerate</button></sc-if>
                  <sc-if value="{{d.isEditing}}" hint-placeholder-val="{{ false }}"><button type="button" class="btn2 btn2--line btn2--full" onClick="{{d.submit}}">${D3I.retry}Regenerate</button></sc-if>
                </div>
              </sc-if>
              <sc-if value="{{d.isSkeleton}}" hint-placeholder-val="{{ false }}">
                <div class="dcopy">
                  <sc-if value="{{d.hasNote}}" hint-placeholder-val="{{ false }}"><p class="dnote">{{d.quote}}</p></sc-if>
                  <sc-if value="{{d.isFailed}}" hint-placeholder-val="{{ false }}"><div class="derr" role="alert"><span>Writing timed out</span></div></sc-if>
                  <sc-if value="{{d.notFailed}}" hint-placeholder-val="{{ true }}"><div class="dhook"><i class="sk" style="width: {{d.h0}}%"></i><i class="sk" style="width: {{d.h1}}%"></i></div></sc-if>
                  <ol class="dslides" aria-hidden="true">${rows((k) => `<i class="sk" style="width: {{d.w${k}}}%"></i>`)}</ol>
                </div>
                <div class="dcap" aria-hidden="true"><i class="sk" style="width: 92%"></i><i class="sk" style="width: 38%"></i></div>
                <div class="dfoot" aria-hidden="true"><div class="dmusic"><i class="sk" style="width: 42%"></i></div></div>
                <div class="dact">
                  <sc-if value="{{d.isFailed}}" hint-placeholder-val="{{ false }}"><button type="button" class="btn2 btn2--line btn2--full" onClick="{{d.retry}}">${D3I.retry}Retry</button></sc-if>
                  <sc-if value="{{d.notFailed}}" hint-placeholder-val="{{ true }}"><i class="sk" aria-hidden="true"></i></sc-if>
                </div>
              </sc-if>
            </article>`;

function page() {
  return `
      <main class="main">
        <div class="page">
          <div class="phead">
            <button type="button" class="upcrumb" onClick="{{backToTypes}}">${I.backSm}Carousel types</button>
            <!-- No character or slide-count pills: the person is already inside this carousel type (Garreth, 2026-09-14). -->
            <div class="ptitle">
              <h1>{{batchName}}</h1>
            </div>
          </div>
          <div class="prog {{progCls}}">
            <div class="prow" role="status" aria-live="polite">
              <span class="pcount tnum">{{progCount}}</span>
              <!-- D12 · Auto mode: what the batch is doing without anybody, what it dropped, and the way to take it back. -->
              <sc-if value="{{a12On}}" hint-placeholder-val="{{ false }}"><span class="pill pill--accent">Auto</span></sc-if>
              <sc-if value="{{a12Paused}}" hint-placeholder-val="{{ false }}"><span class="pill">Auto paused</span></sc-if>
              <sc-if value="{{a12Drop}}" hint-placeholder-val="{{ false }}"><span class="pdrop tnum">{{a12DropText}}</span></sc-if>
              <sc-if value="{{showStall}}" hint-placeholder-val="{{ false }}"><span class="pwarn">${D3I.warn}<span><button type="button" class="pdeck" onClick="{{stallGo}}">{{stallDeck}}</button> stalled, last moved {{stallAgo}}</span></span></sc-if>
              <sc-if value="{{showFailed}}" hint-placeholder-val="{{ false }}"><span class="pfail tnum">{{failedText}}</span></sc-if>
              <sc-if value="{{isStopped}}" hint-placeholder-val="{{ false }}"><span class="pmeta">{{stoppedText}}</span><button type="button" class="cta" onClick="{{continueBatch}}">Continue</button></sc-if>
              <!-- The same button as D5's render line: outline, with its icon (icons are markup, not values). -->
              <sc-if value="{{a12On}}" hint-placeholder-val="{{ false }}"><button type="button" class="btn2 btn2--line a12btn" onClick="{{a12Toggle}}">${D3I.pause}Pause auto</button></sc-if>
              <sc-if value="{{a12Paused}}" hint-placeholder-val="{{ false }}"><button type="button" class="btn2 btn2--line a12btn" onClick="{{a12Toggle}}">${D3I.play}Resume auto</button></sc-if>
            </div>
            <sc-if value="{{showTrack}}" hint-placeholder-val="{{ true }}"><div class="track" aria-hidden="true"><i style="width: {{trackW}}%"></i></div></sc-if>
          </div>
          <div class="grid">
            <sc-for list="{{d3Decks}}" as="d" hint-placeholder-count="9">${deckCard}
            </sc-for>
          </div>
        </div>
      </main>`;
}

/* The bell's dot and panel, and on the phone the stopped batch's bottom bar. */
const colOverlay = (phone) => `
    <sc-if value="{{showBellDot}}" hint-placeholder-val="{{ false }}"><span class="d3-dot" aria-hidden="true"></span></sc-if>
    <sc-if value="{{notifyOpen}}" hint-placeholder-val="{{ false }}">
      <div class="ncatch" aria-hidden="true" onClick="{{closeNotify}}"></div>
      <div class="npop" role="dialog" aria-label="Notifications" onKeyDown="{{notifyKey}}">
        <div class="nhead">
          <b>Notifications</b>
          <sc-if value="{{hasUnread}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{markAllRead}}">Mark all read (1)</button></sc-if>
          <sc-if value="{{allRead}}" hint-placeholder-val="{{ false }}"><span>All read</span></sc-if>
        </div>
        <div class="nlist">
          <button type="button" class="nitem {{n1Cls}}" onClick="{{openFlagged}}">
            <span class="nin">
              <span class="ndot" aria-hidden="true"></span>
              <span class="nmain">
                <span class="ntop"><span class="ntitle">{{n1Title}}<span class="ncat">Carousel Generator</span></span>${D3I.arrow}</span>
                <span class="nbody">{{n1Body}}</span>
                <span class="ntime">Just now</span>
              </span>
            </span>
          </button>
          <button type="button" class="nitem" onClick="{{openOther}}">
            <span class="nin">
              <span class="ndot" aria-hidden="true"></span>
              <span class="nmain">
                <span class="ntop"><span class="ntitle">Deck 14 flagged<span class="ncat">Carousel Generator</span></span>${D3I.arrow}</span>
                <span class="nbody">Myth vs Fact · Score 5.2</span>
                <span class="ntime">2h ago</span>
              </span>
            </span>
          </button>
        </div>
      </div>
    </sc-if>
    ${
      phone
        ? `<sc-if value="{{isStopped}}" hint-placeholder-val="{{ false }}"><div class="bar">
      <span class="status tnum"><b>{{progCount}}</b>{{stoppedText}}</span>
      <button type="button" class="cta" onClick="{{continueBatch}}">Continue</button>
    </div></sc-if>`
        : ""
    }`;

/* ── Behaviour ─────────────────────────────────────────────────────────── */

/* Scroll to a deck when asked (the bell's item, the stalled deck, a picture opened part-way down),
   and put the caret in a feedback box as it opens. */
const didUpdate = `
    if (st.d3scroll) {
      var column = document.querySelector(".col");
      var card = document.getElementById("deck-" + st.d3scroll);
      if (column && card) {
        var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        column.scrollTo({ top: card.offsetTop - 150, behavior: reduce || !this.d3smooth ? "auto" : "smooth" });
      }
      this.d3smooth = true;
      this.setState({ d3scroll: 0 });
    }
    if (st.d3focus) {
      var box = document.querySelector("#deck-" + st.d3focus + " textarea");
      if (box) box.focus({ preventScroll: true });
      this.setState({ d3focus: 0 });
    }`;

function vals({ auto, init }) {
  return `
    var P = s.params || {};
    var AUTO = ${auto} || !!s.d3auto;
    /* D12 · Auto mode — nothing to do with AUTO above, which is the prototype's writer running on timers.
       "" the batch waits for the person, "on" it carries itself, "paused" the person has taken it back. */
    var A12 = s.d12auto != null ? s.d12auto : (P.auto || "");
    var HOOKS = ${JSON.stringify(HOOKS)};
    var LINES = ${JSON.stringify(LINES)};
    var CAPTIONS = ${JSON.stringify(CAPTIONS)};
    var FLAG = ${JSON.stringify(FLAG_REASON)};
    var INIT_SCROLL = ${init.scrollTo || 0};
    var FOCUS_CLS = ${JSON.stringify(init.focusCls || "")};
    var SLIDES = parseInt(P.slides, 10) || 7;
    var NAME = P.name || "Before & After";

    var blank = function (n) { return { n: n, st: "waiting", prev: "", note: "", flag: "", ver: 0, tries: 0, retried: false, rewritten: false, fresh: false }; };
    /* A batch opened from another screen: nothing written, or a running batch part-way (deck 6 already flagged). */
    var seedFrom = function (p) {
      var total = Math.min(50, Math.max(1, parseInt((p || {}).count, 10) || 20));
      var upTo = parseInt((p || {}).writtenUpTo, 10) || 0;
      var list = [];
      for (var n = 1; n <= total; n++) {
        var d = blank(n);
        if (n <= upTo) { d.st = n === 6 ? "flagged" : "written"; d.flag = n === 6 ? FLAG : ""; }
        else if (n === upTo + 1) d.st = "writing";
        list.push(d);
      }
      return list;
    };
    var decks = s.d3decks || seedFrom(P);
    var current = function () { return (self.state && self.state.d3decks) || decks; };
    var hasFlag = decks.some(function (d) { return d.st === "flagged"; });
    /* In Auto a flagged deck is a moment, not an errand: it rewrites itself, so it never rings the bell.
       Paused, the batch is the person's again and a flag calls for them as it does today. */
    var notif = s.d3notif || (hasFlag && A12 !== "on" ? "unread" : "none");
    var setDeck = function (i, patch, extra) {
      var next = current().slice();
      next[i] = Object.assign({}, next[i], patch);
      self.setState(Object.assign({ d3decks: next }, extra || {}));
    };

    /* The writer: one deck at a time. Deck 5 times out once; deck 6 is flagged until it is regenerated.
       A deck sent back with feedback goes next, ahead of the unwritten ones. */
    var tick = function () {
      var st = self.state || {};
      if (st.screen !== "batch") { clearInterval(self.d3timer); self.d3timer = null; return; }
      var cur = (st.d3decks || seedFrom(st.params)).slice();
      var bell = st.d3notif || (cur.some(function (d) { return d.st === "flagged"; }) ? "unread" : "none");
      var w = -1, nx = -1;
      cur.forEach(function (d, i) { if (d.st === "writing") w = i; });
      if (w >= 0) {
        var d = Object.assign({}, cur[w], { fresh: true });
        if (d.n === 5 && !d.retried) d.st = "failed";
        else if (d.n === 6 && !d.rewritten) { d.st = "flagged"; d.flag = FLAG; bell = "unread"; }
        else { d.st = "written"; d.flag = ""; }
        cur[w] = d;
      }
      cur.forEach(function (d, i) { if (nx < 0 && d.st === "upnext") nx = i; });
      if (nx < 0) cur.forEach(function (d, i) { if (nx < 0 && d.st === "waiting") nx = i; });
      if (nx >= 0) {
        var up = cur[nx].st === "upnext";
        cur[nx] = Object.assign({}, cur[nx], { st: "writing", ver: (cur[nx].ver || 0) + (up ? 1 : 0), fresh: false });
      }
      self.setState({ d3decks: cur, d3notif: bell });
      if (nx < 0) {
        clearInterval(self.d3timer); self.d3timer = null;
        /* Every deck written and none left failed or open for feedback: the batch moves on to review (D4),
           a moment after the last deck lands, carrying which decks are flagged. */
        var settled = !cur.some(function (d) { return d.st === "failed" || d.st === "editing"; });
        if (settled) {
          var doneParams = Object.assign({}, st.params || {}, {
            count: cur.length,
            flagged: cur.filter(function (d) { return d.st === "flagged"; }).map(function (d) { return d.n; })
          });
          setTimeout(function () {
            if ((self.state || {}).screen === "batch") ctx.open("review", doneParams, "Every deck written. Review and render · D4");
          }, 1200);
        }
      }
    };
    var busy = decks.some(function (d) { return d.st === "writing" || d.st === "upnext" || d.st === "waiting"; });
    var working = decks.some(function (d) { return d.st === "writing"; }) || decks.some(function (d) { return d.st === "upnext"; });
    if (AUTO && s.screen === "batch" && s.d3mode !== "stopped" && busy && !self.d3timer && (working || s.d3auto)) {
      self.d3timer = setInterval(tick, 800);
    }
    if (INIT_SCROLL && !self.d3scrolled) {
      self.d3scrolled = true;
      setTimeout(function () { self.setState({ d3scroll: INIT_SCROLL }); }, 60);
    }

    var total = decks.length;
    var written = decks.filter(function (d) { return d.st === "written" || d.st === "editing" || d.st === "flagged"; }).length;
    var failed = decks.filter(function (d) { return d.st === "failed"; }).length;
    /* A dropped deck is not written — the count never claims it — but the batch is done with it, so the bar counts it
       as work behind us and can still reach the end. */
    var dropped = decks.filter(function (d) { return d.st === "dropped"; }).length;
    var mode = s.d3mode || "writing";
    var firstFlag = decks.filter(function (d) { return d.st === "flagged"; })[0];

    var view = decks.map(function (d, i) {
      var copy = d.st === "written" || d.st === "editing" || d.st === "flagged" || d.st === "dropped";
      var ver = d.ver || 0;
      var o = {
        n: d.n,
        label: "Deck " + d.n,
        copyLabel: "Deck " + d.n + " copy",
        fbLabel: "Feedback for deck " + d.n,
        cls: ["is-" + d.st, d.st === "flagged" ? "" : "", d.fresh && copy ? "is-new" : ""].join(" "),
        busy: d.st === "writing" ? "true" : "false",
        pillWritten: d.st === "written" || d.st === "editing",
        pillFlag: d.st === "flagged",
        /* A deck sent back with feedback says Rewriting once its turn comes, so a redo reads apart from a first write
           (Garreth, 2026-09-14, matching D4). */
        pillWriting: d.st === "writing" && !d.rewritten,
        pillRewriting: d.st === "writing" && !!d.rewritten,
        pillFailed: d.st === "failed",
        pillUpnext: d.st === "upnext",
        /* D12: Auto's second and third goes at a deck, and the deck it gave up on. A dropped deck says only that,
           with its reason beside it in the neutral tone. */
        a12Tries: (d.tries || 0) > 0 && d.st !== "dropped",
        a12TriesText: "Try " + (d.tries || 0) + " of 3",
        a12Dropped: d.st === "dropped",
        flag: d.flag || FLAG,
        hasCopy: copy,
        isEditing: d.st === "editing",
        showRegen: d.st === "written" || d.st === "flagged" || d.st === "dropped",
        isSkeleton: !copy,
        isFailed: d.st === "failed",
        notFailed: d.st !== "failed",
        hasNote: (d.st === "upnext" || d.st === "writing") && !!d.note,
        quote: "\\u201c" + (d.note || "") + "\\u201d",
        note: d.note || "",
        taCls: FOCUS_CLS,
        hook: HOOKS[(d.n - 1 + ver * 5) % HOOKS.length],
        caption: CAPTIONS[(d.n + ver) % CAPTIONS.length],
        h0: 86 - (d.n % 4) * 6,
        h1: 44 + (d.n % 3) * 9,
        regen: function () { setDeck(i, { st: "editing", prev: d.st, note: "" }, { d3focus: d.n }); },
        cancel: function () { setDeck(i, { st: d.prev || "written" }); },
        type: function (e) { setDeck(i, { note: e.target.value }); },
        submit: function () { setDeck(i, { st: "upnext", rewritten: true, fresh: false }, { d3auto: true }); },
        retry: function () { setDeck(i, { st: "upnext", retried: true, note: "" }, { d3auto: true }); }
      };
      for (var k = 0; k < ${ROWS}; k++) {
        o["s" + k] = k < SLIDES - 1;
        o["t" + k] = LINES[(d.n * 3 + k * 5 + ver * 7) % LINES.length];
        o["w" + k] = 48 + ((d.n * 17 + (k + 2) * 29) % 42);
      }
      return o;
    });

    return {
      batchName: NAME,
      batchCharacter: P.character || "Character 2",
      batchSlides: P.slides || "7 slides",
      backToTypes: function () { ctx.open("types", null, "Back to Carousel types · D1"); },

      d3Decks: view,
      progCls: mode === "stalled" ? "is-stalled" : mode === "stopped" ? "is-stopped" : "",
      progCount: written + " of " + total + " written",
      showTrack: mode !== "stopped",
      trackW: Math.round(((written + dropped) / total) * 100),
      showStall: mode === "stalled",
      stallDeck: "Deck " + ${init.stalledDeck || 8},
      stallAgo: "3 min ago",
      stallGo: function () { self.setState({ d3scroll: ${init.stalledDeck || 8} }); },
      showFailed: mode !== "stopped" && failed > 0,
      failedText: failed + " failed",
      isStopped: mode === "stopped",
      stoppedText: "Stopped 2 hours ago",

      /* D12 · Auto mode. Pause hands the batch back (flags wait for the person, rendering waits for the press);
         Resume takes it again. A stopped batch has nothing to run, so the control stays away. */
      a12Show: (A12 === "on" || A12 === "paused") && mode !== "stopped",
      a12On: A12 === "on" && mode !== "stopped",
      a12Paused: A12 === "paused" && mode !== "stopped",
      a12Drop: dropped > 0 && mode !== "stopped",
      a12DropText: dropped + " dropped",
      a12BtnText: A12 === "paused" ? "Resume auto" : "Pause auto",
      a12Toggle: function () { self.setState({ d12auto: A12 === "paused" ? "on" : "paused" }); },
      continueBatch: function () {
        var next = current().slice();
        var nx = next.findIndex(function (d) { return d.st === "waiting"; });
        if (nx >= 0) next[nx] = Object.assign({}, next[nx], { st: "writing" });
        self.setState({ d3mode: "writing", d3decks: next, d3auto: true });
      },

      /* The bell */
      showBellDot: notif === "unread",
      notifyOpen: !!s.d3open,
      hasUnread: notif === "unread",
      allRead: notif !== "unread",
      n1Cls: (notif === "unread" ? "is-unread" : "") + (${!!init.hoverFirst} ? " is-hover" : ""),
      n1Title: "Deck " + (firstFlag ? firstFlag.n : 6) + " flagged",
      n1Body: NAME + " · " + FLAG,
      openFlagged: function () { self.setState({ d3open: false, d3notif: "read", d3scroll: firstFlag ? firstFlag.n : 0 }); },
      openOther: function () { self.setState({ d3open: false }); self.note("Opens the Myth vs Fact batch at deck 14"); },
      markAllRead: function () { self.setState({ d3notif: "read" }); },
      closeNotify: function () { self.setState({ d3open: false }); },
      notifyKey: function (e) { if (e.key === "Escape") self.setState({ d3open: false }); },
      bell: function () {
        if (s.screen === "batch") self.setState({ d3open: !s.d3open });
        else self.note("Opens notifications");
      }
    };`;
}

/**
 * D3 as a screen. `auto` runs the writer on timers (the prototype). `init` is
 * the moment a review picture shows: decks, mode, bell and scroll.
 */
export function batchScreen({ auto = false, tall = 0, init = {} } = {}) {
  return {
    id: "batch",
    nav: "types",
    css: (phone) => css(phone, { tall }),
    markup: page,
    colOverlay,
    state: {
      d3decks: init.decks || null,
      d3mode: init.mode || "writing",
      d3notif: init.notif || null,
      d3open: !!init.notifyOpen,
      d3auto: false,
      d3scroll: 0,
      d3focus: 0,
      /* D12: "on" or "paused" when the picture is an Auto batch; null lets the batch's own params decide. */
      d12auto: init.auto || null,
    },
    /* Opened from another screen: a fresh batch from its params, the writer starting. */
    enter: { d3decks: null, d3mode: "writing", d3notif: null, d3open: false, d3auto: false, d3scroll: 0, d3focus: 0, d12auto: null },
    vals: vals({ auto, init }),
    didUpdate,
  };
}

/* ── The bell on another screen ────────────────────────────────────────── */

/* A batch that needs its person rings the bell wherever they are (Garreth, 2026-09-21); Carousel types stands in for
   "anywhere". Two items: Batch written, a manual batch waiting for Render (opens D4), and Batch finished, any batch
   waiting for Approve (opens D5). Each picture lives on the canvas of the screen its item opens. */
const BELL_ITEMS = {
  finished: { title: "Batch finished", body: "Before & After · 18 rendered, 2 dropped", waitText: "18 to approve", to: "render", note: "Opens the finished batch, with Approve 18 decks · D5" },
  written: { title: "Batch written", body: "Before & After · 18 to render, 2 flagged", waitText: "18 to render", to: "review", note: "Opens the written batch, with Render 18 decks · D4" },
};

/* D3's dot and panel styles, moved onto Carousel types, so the panel here can never drift from the batch's. */
const bellCss = (phone) =>
  [
    ...batchScreen()
      .css(phone)
      .matchAll(/^\.screen-batch \.(?:d3-dot|ncatch|npop|nhead|nlist|nitem|nin|ndot|nmain|ntop|ntitle|ncat|nbody|ntime|is-unread)\b[^{]*\{[^}]*\}/gm),
  ]
    .map((m) => m[0])
    .join("\n")
    .replaceAll(".screen-batch", ".screen-types") + "\n@keyframes d3-pop { from { opacity: 0; transform: scale(0.97) translateY(-4px); } }";

const arrow = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M204,64V168a12,12,0,0,1-24,0V93L72.49,200.49a12,12,0,0,1-17-17L163,76H88a12,12,0,0,1,0-24H192A12,12,0,0,1,204,64Z"/></svg>`;

const bellOverlay = (item) => () => `
    <sc-if value="{{a12nDot}}" hint-placeholder-val="{{ true }}"><span class="d3-dot" aria-hidden="true"></span></sc-if>
    <sc-if value="{{a12nOpen}}" hint-placeholder-val="{{ true }}">
      <div class="ncatch" aria-hidden="true" onClick="{{a12nClose}}"></div>
      <div class="npop" role="dialog" aria-label="Notifications">
        <div class="nhead">
          <b>Notifications</b>
          <sc-if value="{{a12nUnread}}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{a12nMark}}">Mark all read (1)</button></sc-if>
          <sc-if value="{{a12nAllRead}}" hint-placeholder-val="{{ false }}"><span>All read</span></sc-if>
        </div>
        <div class="nlist">
          <button type="button" class="nitem {{a12nCls}}" onClick="{{a12nGo}}">
            <span class="nin">
              <span class="ndot" aria-hidden="true"></span>
              <span class="nmain">
                <span class="ntop"><span class="ntitle">${item.title}<span class="ncat">Carousel Generator</span></span>${arrow}</span>
                <span class="nbody tnum">${item.body.replace("&", "&amp;")}</span>
                <span class="ntime">Just now</span>
              </span>
            </span>
          </button>
          <button type="button" class="nitem" onClick="{{a12nClose}}">
            <span class="nin">
              <span class="ndot" aria-hidden="true"></span>
              <span class="nmain">
                <span class="ntop"><span class="ntitle">Deck 14 flagged<span class="ncat">Carousel Generator</span></span>${arrow}</span>
                <span class="nbody">Myth vs Fact · Score 5.2</span>
                <span class="ntime">2h ago</span>
              </span>
            </span>
          </button>
        </div>
      </div>
    </sc-if>`;

/** Carousel types with the bell ringing for a batch that needs its person. `kind` is which item; `open` shows the
    panel; `bell: false` leaves only the card's own state. */
export function typesWithBell({ kind = "finished", open = true, bell = true, toCard = false } = {}) {
  const item = BELL_ITEMS[kind];
  const screen = typesScreen({ waiting: 18, waitText: item.waitText, waitTo: item.to, toCard });
  return {
    ...screen,
    css: (phone) => `${screen.css(phone)}\n${bellCss(phone)}`,
    colOverlay: bellOverlay(item),
    state: { ...screen.state, d12nOpen: bell && open, d12nRead: false },
    vals: `
    var a12base = (function () {${screen.vals}
    })();
    return Object.assign(a12base, {
      a12nDot: ${bell} && !s.d12nRead,
      a12nOpen: !!s.d12nOpen,
      a12nUnread: !s.d12nRead,
      a12nAllRead: !!s.d12nRead,
      a12nCls: (s.d12nRead ? "" : "is-unread") + " is-hover",
      a12nMark: function () { self.setState({ d12nRead: true }); },
      a12nClose: function () { self.setState({ d12nOpen: false }); },
      a12nGo: function () {
        self.setState({ d12nOpen: false, d12nRead: true });
        ctx.open(${JSON.stringify(item.to)}, { name: "Before & After", count: 20 }, ${JSON.stringify(item.note)});
      },
      bell: function () { self.setState({ d12nOpen: !s.d12nOpen }); }
    });`,
  };
}

/* ── Review artboards ──────────────────────────────────────────────────── */

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
function decks(spec, total = 20) {
  return range(1, total).map((n) => {
    const v = spec[n];
    const o = typeof v === "object" ? v : { st: v || "waiting" };
    return { n, st: o.st, prev: o.prev || "", note: o.note || "", flag: o.flag || "", ver: o.rewritten ? 1 : 0, tries: o.tries || 0, retried: false, rewritten: !!o.rewritten, fresh: false };
  });
}
const writtenTo = (k) => Object.fromEntries(range(1, k).map((n) => [n, "written"]));
const flagged = { st: "flagged", flag: FLAG_REASON };

const MOMENTS = {
  writing: { decks: decks({ ...writtenTo(7), 8: "writing" }) },
  regenerate: {
    decks: decks({
      ...writtenTo(7),
      2: { st: "editing", prev: "written", note: "The hook sounds like an ad. Keep slide 5 under ten words." },
      /* Two decks sent back: one being rewritten now, one waiting its turn. The writer does one deck at a time. */
      4: { st: "writing", note: "Warmer, and drop the numbers", rewritten: true },
      5: { st: "upnext", note: "Shorter captions" },
    }),
    focusCls: "is-focus",
  },
  flaggedNotify: { decks: decks({ ...writtenTo(9), 6: flagged, 10: "writing" }), notif: "unread", notifyOpen: true, hoverFirst: true },
  flagged: { decks: decks({ ...writtenTo(9), 6: flagged, 10: "writing" }), notif: "read" },
  stalled: { decks: decks({ ...writtenTo(7), 8: "writing" }), mode: "stalled", stalledDeck: 8 },
  failed: { decks: decks({ ...writtenTo(11), 5: "failed", 12: "writing" }) },
  stopped: { decks: decks(writtenTo(12)), mode: "stopped" },
};

/* ── D12 · Auto mode moments ───────────────────────────────────────────────
 * The same screen at the four moments an Auto batch has. They are the last two
 * rows of BOARDS below (Garreth, 2026-09-21: on D3's canvas, no D12 canvas).
 * `autoDropped` carries `scrollTo: 6`, which puts the first dropped deck in
 * view on a phone board; a board that passes its own `scrollTo` overrides it. */
const droppedDeck = (flag) => ({ st: "dropped", flag, tries: 3 });

export const AUTO_MOMENTS = {
  /* Auto carrying the batch: nothing to do, nothing rung. */
  autoWriting: { auto: "on", notif: "none", decks: decks({ ...writtenTo(7), 8: "writing" }) },
  /* Auto putting two decks back through the writer on the gate's suggested fix, one at a time. */
  autoRetrying: {
    auto: "on",
    notif: "none",
    decks: decks({
      ...writtenTo(9),
      3: { st: "upnext", rewritten: true, tries: 1 },
      6: { st: "writing", rewritten: true, tries: 2 },
    }),
  },
  /* Three goes were not enough for two decks: they stay on screen, dimmed, out of the render. */
  autoDropped: {
    auto: "on",
    notif: "none",
    scrollTo: 6,
    decks: decks({ ...writtenTo(13), 6: droppedDeck(FLAG_REASON), 11: droppedDeck("Score 5.2"), 14: "writing" }),
  },
  /* Paused: the batch is the person's again, so the flagged deck waits for them and rings the bell. */
  autoPaused: { auto: "paused", notif: "unread", decks: decks({ ...writtenTo(9), 6: flagged, 10: "writing" }) },
};

export const DESK_H = 1620;

function build(OUT) {
  fs.mkdirSync(OUT, { recursive: true });
  const ROW = DESK_H + 140;
  const BOARDS = [
    { name: "Main", phone: false, m: "writing", title: "D3 · Writing · Desktop", x: 0, y: 0 },
    { name: "Phone", phone: true, m: "writing", title: "D3 · Writing · Phone", x: 1540, y: 0 },
    { name: "PhoneScrolled", phone: true, m: "writing", scrollTo: 7, title: "D3 · Writing, scrolled to deck 7 · Phone", x: 2010, y: 0 },
    { name: "Regenerate", phone: false, m: "regenerate", title: "D3 · Regenerate a deck while writing · Desktop", x: 0, y: ROW },
    { name: "PhoneRegenerate", phone: true, m: "regenerate", scrollTo: 2, title: "D3 · Regenerate a deck while writing · Phone", x: 1540, y: ROW },
    { name: "FlaggedNotify", phone: false, m: "flaggedNotify", title: "D3 · Deck flagged, bell open · Desktop", x: 0, y: ROW * 2 },
    { name: "Flagged", phone: false, m: "flagged", title: "D3 · Deck flagged, opened from the bell · Desktop", x: 1540, y: ROW * 2 },
    { name: "PhoneFlaggedNotify", phone: true, m: "flaggedNotify", title: "D3 · Deck flagged, bell open · Phone", x: 3080, y: ROW * 2 },
    { name: "PhoneFlagged", phone: true, m: "flagged", scrollTo: 6, title: "D3 · Deck flagged, opened from the bell · Phone", x: 3550, y: ROW * 2 },
    { name: "Stalled", phone: false, m: "stalled", title: "D3 · Stalled · Desktop", x: 0, y: ROW * 3 },
    { name: "Failed", phone: false, m: "failed", title: "D3 · One deck failed · Desktop", x: 1540, y: ROW * 3 },
    { name: "Stopped", phone: false, m: "stopped", title: "D3 · Stopped, reopened · Desktop", x: 0, y: ROW * 4 },
    { name: "PhoneStopped", phone: true, m: "stopped", title: "D3 · Stopped, reopened · Phone", x: 1540, y: ROW * 4 },
    /* Auto mode (D12, Garreth 2026-09-21). */
    { name: "AutoWriting", phone: false, m: "autoWriting", title: "D3 · Auto mode: writing, with Pause auto · Desktop", x: 0, y: ROW * 5 },
    { name: "AutoRetrying", phone: false, m: "autoRetrying", title: "D3 · Auto mode: flagged decks rewritten by themselves, Try 2 of 3 · Desktop", x: 1540, y: ROW * 5 },
    { name: "PhoneAutoWriting", phone: true, m: "autoWriting", title: "D3 · Auto mode: writing · Phone", x: 3080, y: ROW * 5 },
    { name: "AutoDropped", phone: false, m: "autoDropped", title: "D3 · Auto mode: still flagged after three tries, Dropped · Desktop", x: 0, y: ROW * 6 },
    { name: "AutoPaused", phone: false, m: "autoPaused", title: "D3 · Auto paused: back to manual, the flagged deck waits and rings the bell · Desktop", x: 1540, y: ROW * 6 },
    { name: "PhoneAutoDropped", phone: true, m: "autoDropped", scrollTo: 6, title: "D3 · Auto mode: a dropped deck · Phone", x: 3080, y: ROW * 6 },
  ];
  const artboards = [];
  for (const light of [false, true]) {
    for (const b of BOARDS) {
      const file = `${b.name}${light ? "Light" : ""}.dc.html`;
      const h = b.phone ? 844 : DESK_H;
      const screen = batchScreen({ tall: b.phone ? 0 : DESK_H, init: { ...(MOMENTS[b.m] || AUTO_MOMENTS[b.m]), scrollTo: b.scrollTo || 0 } });
      const html = artboard({ phone: b.phone, light, screens: [screen], navMode: "note" }).replace('"height":900', `"height":${h}`);
      fs.writeFileSync(path.join(OUT, file), html);
      artboards.push({ file, title: light ? `${b.title} · Light` : b.title, page: light ? "light" : "dark", x: b.x, y: b.y, w: b.phone ? 390 : 1440, h });
    }
  }
  fs.writeFileSync(
    path.join(OUT, "canvas.json"),
    JSON.stringify(
      {
        pages: [
          { id: "dark", name: "Dark" },
          { id: "light", name: "Light" },
        ],
        artboards,
        launch: { view: "canvas", page: "light" },
      },
      null,
      2,
    ),
  );
  console.log(`Wrote D3 artboards to ${OUT}`);
}

if (isMain(import.meta.url)) build(path.resolve(process.argv[2] ?? path.join(HERE, "out")));
