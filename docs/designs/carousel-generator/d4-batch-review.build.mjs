#!/usr/bin/env node
/*
 * D4 · Batch, finished writing: review — where D3 lands once every deck is
 * written, and where a person decides what to regenerate, discard or render.
 *
 * Design step only (docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md, D4). Nothing
 * here is app code. The shell (menu, top bar, glow, both themes, phone drawer,
 * prototype note) comes from generator-kit.mjs; this file is the screen. All
 * content is made-up sample data.
 *
 * There is no approval step (Garreth, 2026-09-14): a written deck counts as
 * accepted unless it is regenerated or discarded. So the card's actions are
 * Regenerate (the whole deck or one slide, with feedback), moving between
 * versions and Discard deck (a hold, inside the card's More menu), and the
 * page's are Regenerate batch and Render.
 *
 * The deck card is D3's card, kept in shape from empty to reviewable: D3's own
 * styles are imported and re-scoped to this screen rather than copied, so the
 * two cannot drift. Second review (Garreth, 2026-09-14):
 *   - Regenerate is the full-width button at the bottom of every card (D3 too).
 *   - A deck with more than one version carries a "Version 2 of 2" pill. On the
 *     desktop, pointing at the card shows arrows on its left and right edges
 *     (none past the first or newest version); on the phone the copy swipes
 *     sideways. The version showing is the version that counts, so there is no
 *     separate "Use this version".
 *   - Retry music lookup sits opposite the song as one split button: the caret
 *     on its right opens Change track, which searches the music library as the
 *     person types (third review).
 *   - A deck or slide being rewritten says Rewriting; no New track pill; no
 *     character or slide-count pills in the title.
 *
 * New pieces this ticket adds to the vocabulary, each built from existing parts:
 *   - the slide picker in the feedback box: FilterPills' segmented shape
 *   - the version arrows: small raised round buttons on the card's edges
 *   - the More button (DotsThree; the app has no overflow icon yet) and its
 *     menu: the notification panel's surface, holding hold-button.tsx
 *   - the track search: the Change field with a suggestion list under it
 *
 * Dark mode approved by Garreth 2026-09-15, light mode designed the same day.
 *
 * Run directly, it writes D4's review artboards and canvas.json, each twice
 * (Dark page, Light page), plus a note keying each card-states board:
 *   CardStates            desktop, one deck per card state
 *   Main                  desktop, 20 written, 3 flagged, Render 16 decks
 *   Phone                 phone, the top of the same batch, Render in a bottom bar
 *   PhoneRegenerate       phone, feedback open on deck 2 for slide 4
 *   PhoneSwipe            phone, deck 3 being swiped back to version 1
 *   PhoneTrack            phone, deck 14's track not found
 *   PhoneTrackSearch      phone, deck 14's track search with suggestions
 *   PhoneDiscard          phone, deck 3's More menu open, Discard being held
 *   RegenerateBatch       desktop, Regenerate batch open with feedback
 *   PhoneRegenerateBatch  phone, the same
 *   ReadOnly              desktop, someone else is running the batch
 *   PhoneReadOnly         phone, the same
 * Imported, `reviewScreen({ auto: true })` is the screen the prototype opens.
 *
 *   node docs/designs/carousel-generator/d4-batch-review.build.mjs <out dir>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { I, icon, artboard, isMain } from "./generator-kit.mjs";
import { batchScreen } from "./d3-batch-writing.build.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const D4I = {
  music: icon("MusicNotes", 12),
  warn: icon("Warning", 12),
  retry: icon("ArrowClockwise", 12, "bold"),
  more: icon("DotsThree", 16, "bold"),
  prev: icon("CaretLeft", 14, "bold"),
  next: icon("CaretRight", 14, "bold"),
  busy: icon("CircleNotch", 12, "bold"),
  search: icon("MagnifyingGlass", 12, "bold"),
  caretDown: icon("CaretDown", 12, "bold"),
};

/* ── Sample content ────────────────────────────────────────────────────── */

/* D3's invented "Before & After" copy, so a deck reads the same on both screens. */
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
/* Placeholder music library for the track search. */
const LIBRARY = [
  "Artist Name – Song Title",
  "Artist Name – Other Song",
  "Artist Name – Song Title (Acoustic)",
  "Another Artist – Late Night Song",
  "Band Name – Track Title",
  "Singer Name – Summer Song",
];
/* Slide rows drawn per card: slides 2 to 10, shown up to the type's slide count. */
const ROWS = 9;
const FLAG = {
  compliance: "Compliance: brand name",
  score: "Score 5.2",
  track: "Track not found on TikTok",
  lookup: "Music lookup failed",
};
/* A deck. cur: the version showing, which is the version that counts. track: ok | checking | notfound |
   failed | changing. seeds: per version, which variant of each slide it holds (0 hook, 1–9 slides 2–10,
   10 caption); built from `vers` when absent. */
const BASE = {
  st: "written", flag: "", vers: 1, cur: 1, seeds: null,
  track: "ok", after: "", prevTrack: "", trackName: "", trackText: "", tsel: 0, tinFocus: false,
  fb: false, scope: 0, note: "", taFocus: false, slideBusy: 0,
  menu: false, hold: 0, tmenu: false, hover: 0, hoverCard: false, kbd: false, fresh: false,
};

/* ── Styles ────────────────────────────────────────────────────────────── */

function css(phone, { tall }) {
  const S = ".screen-review";
  /* D3's card, progress line, bell dot and phone bar, re-scoped to this screen. */
  const d3 = batchScreen({ tall })
    .css(phone)
    .replaceAll(".screen-batch", S)
    .replace("/* ── D3 page ── */", "/* ── D3's card and page, re-scoped for D4 ── */");
  return `${d3}
/* ── D4 page ── */
${S} .deck { position: relative; }
/* Keyboard: J and K move between decks, R regenerates the focused one. The focus ring is the kit's. */
${S} .deck:focus-visible, ${S} .deck.is-kbd { outline: 2px solid var(--accent); outline-offset: 2px; }
${S} .dtop { flex-wrap: wrap; row-gap: 6px; min-height: 24px; }
${S} .dpills { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 6px; min-width: 0; margin-left: auto; }

/* The progress line once writing is done: counts on the left, the batch's two actions on the right. */
${S} .pstat { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; }
${S} .pflag { position: relative; font-size: 13px; line-height: 20px; font-weight: 500; color: var(--danger); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: color-mix(in srgb, var(--danger) 45%, transparent); }
${S} .pacts { position: relative; display: flex; align-items: center; gap: 12px; margin-left: auto; }
${S} .pwho { display: inline-flex; align-items: center; gap: 8px; min-width: 0; font-size: 13px; line-height: 20px; color: var(--text-muted); }
${S} .pwho b { font-weight: 500; color: var(--text-primary); }
${S} .av { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; flex-shrink: 0; border-radius: 999px; background: var(--pill-bg); color: var(--text-primary); font-size: 10px; line-height: 1; font-weight: 600; }

/* Regenerate batch: a feedback box hung under its button. Solid rather than blurred, because it opens
   inside the progress line's own blur, where a second blur has nothing behind it and the cards show through. */
${S} .bpop { position: absolute; top: calc(100% + 10px); right: 0; z-index: 30; display: flex; flex-direction: column; gap: 10px; width: 380px; border-radius: 16px; border: 1px solid var(--border); padding: 12px;
  background: var(--card-raised); box-shadow: var(--overlay-rim); transform-origin: top right; animation: d3-pop 180ms var(--ease-out-strong); }
${S} .bpop textarea { display: block; width: 100%; min-height: 84px; resize: none; margin: 0; border-radius: 16px; border: 1px solid var(--border); background: var(--card-sunken); padding: 10px 14px;
  font: inherit; font-size: ${phone ? 16 : 14}px; line-height: 20px; color: var(--text-primary); outline: none; transition: box-shadow 150ms var(--ease); }
${S} .bpop textarea::placeholder { color: var(--text-muted); }
${S} .bpop textarea.is-focus, ${S} .bpop textarea:focus { box-shadow: 0 0 0 2px var(--accent); }
.is-light ${S} .bpop { background: var(--card); }

/* Rows carry their own inset, so a picked or hovered slide lights up without moving a word. */
${S} .dhook, ${S} .dslides li { position: relative; margin-inline: -6px; padding-inline: 6px; border-radius: 8px; transition: background-color 150ms var(--ease); }
${S} .dhook.is-picked, ${S} .dslides li.is-picked { background: var(--card-raised); }
.is-light ${S} .dhook.is-picked, .is-light ${S} .dslides li.is-picked { background: var(--pill-bg); }
/* Regenerate one slide, on the desktop: a small button at the end of the row, shown on hover or focus. */
${S} .srg { position: absolute; top: 0; right: 2px; display: flex; align-items: center; justify-content: center; width: 24px; height: 20px; border-radius: 6px;
  background: var(--card-raised); color: var(--text-muted); opacity: 0; transition: opacity 120ms var(--ease), color 150ms var(--ease); }
${S} .dhook .srg { top: 2px; }
${S} .srg:hover { color: var(--text-primary); }
${S} .srg:focus-visible, ${S} .dslides li.is-hover .srg, ${S} .dhook.is-hover .srg { opacity: 1; }
${S} .deck.can-act .dslides li.is-hover, ${S} .deck.can-act .dhook.is-hover { background: color-mix(in srgb, var(--card-raised) 60%, transparent); }
@media (hover: hover) and (pointer: fine) {
  ${S} .deck.can-act .dslides li:hover, ${S} .deck.can-act .dhook:hover { background: color-mix(in srgb, var(--card-raised) 60%, transparent); }
  ${S} .dslides li:hover .srg, ${S} .dhook:hover .srg { opacity: 1; }
}
/* A slide being rewritten: its line becomes a pulsing bar, the rest of the deck stays readable. */
${S} .sk--row { align-self: center; width: 72%; animation: d3-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
${S} .dhook .sk--row { display: block; height: 12px; margin: 6px 0; }

/* Versions. Desktop: round arrows on the card's left and right edges, shown while the card is pointed at
   or holds focus (Garreth, 2026-09-14). Phone: the copy follows the finger sideways and settles on release. */
${S} .vnav { position: absolute; top: 50%; z-index: 5; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; margin-top: -14px; border-radius: 999px;
  border: 1px solid var(--border); background: var(--card-raised); color: var(--text-primary); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  opacity: 0; pointer-events: none; transition: opacity 150ms var(--ease), transform 160ms var(--ease-out-strong); }
${S} .vnav--prev { left: -14px; }
${S} .vnav--next { right: -14px; }
${S} .vnav:active { transform: scale(0.94); }
${S} .deck:hover .vnav, ${S} .deck:focus-within .vnav, ${S} .deck.is-hover-card .vnav { opacity: 1; pointer-events: auto; }
.is-light ${S} .vnav { box-shadow: none; }
${S} .dclip { overflow: hidden; margin-inline: -20px; padding-inline: 20px; }
${S} .dpane { touch-action: pan-y; transition: transform 220ms var(--ease-out-strong), opacity 220ms var(--ease-out-strong); }
${S} .dpane.is-drag { transition: none; }

/* The music, with any track action on the opposite side. When both do not fit, the actions drop under the song. */
${S} .dfoot { flex-wrap: wrap; row-gap: 4px; }
${S} .dmusic { flex: 1 1 120px; }
${S} .dmusic.is-bad { color: var(--danger); }
${S} .dtools { display: flex; align-items: center; gap: 12px; margin-left: auto; }
${S} .dcheck { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; font-size: 12px; line-height: 16px; color: var(--text-muted); }
/* Retry music lookup: one outline button split in two (Garreth, 2026-09-14). The caret on its right opens the
   other option, Change track; the rest of the button retries. */
${S} .split { position: relative; display: inline-flex; align-items: stretch; flex-shrink: 0; border-radius: 999px; border: 1px solid var(--border); }
${S} .split > button { position: relative; display: inline-flex; align-items: center; gap: 4px; font-size: 12px; line-height: 16px; font-weight: 500; white-space: nowrap; color: var(--text-muted); transition: color 150ms var(--ease), transform 160ms var(--ease-out-strong); }
${S} .split > button:hover, ${S} .split > button[aria-expanded="true"] { color: var(--text-primary); }
${S} .split > button:active { transform: scale(0.97); }
${S} .sarrow { padding: 5px 9px 5px 7px; border-left: 1px solid var(--border); }
${S} .sarrow svg { transition: transform 150ms var(--ease); }
${S} .sarrow[aria-expanded="true"] svg { transform: rotate(180deg); }
${S} .smain { padding: 5px 8px 5px 12px; }
${S} .smenu { position: absolute; right: 0; top: calc(100% + 6px); z-index: 12; min-width: 168px; border-radius: 16px; border: 1px solid var(--border); padding: 6px;
  background: var(--card-raised); box-shadow: var(--overlay-rim); transform-origin: top right; animation: d4-drop 150ms var(--ease-out-strong); }
.is-light ${S} .smenu { background: var(--card); }

/* Change track: a search of the music library, suggestions narrowing as the person types. */
${S} .tsearch { position: relative; flex: 1; min-width: 0; }
${S} .tsicon { position: absolute; left: 11px; top: 9px; display: flex; color: var(--text-muted); pointer-events: none; }
${S} .tin { display: block; width: 100%; height: 30px; border-radius: 999px; border: 1px solid var(--border); background: var(--card-sunken); padding: 0 12px 0 30px;
  font-size: ${phone ? 16 : 12}px; line-height: 16px; color: var(--text-primary); outline: none; transition: box-shadow 150ms var(--ease); }
${S} .tin::placeholder { color: var(--text-muted); }
${S} .tin.is-focus, ${S} .tin:focus { box-shadow: 0 0 0 2px var(--accent); }
${S} .tsug { position: absolute; left: 0; right: ${phone ? "-64px" : "-56px"}; top: calc(100% + 6px); z-index: 12; display: flex; flex-direction: column; gap: 2px; border-radius: 16px; border: 1px solid var(--border); padding: 6px;
  background: var(--card-raised); box-shadow: var(--overlay-rim); transform-origin: top center; animation: d4-drop 150ms var(--ease-out-strong); }
@keyframes d4-drop { from { opacity: 0; transform: scale(0.98) translateY(-4px); } }
${S} .topt { display: flex; align-items: center; gap: 8px; width: 100%; min-width: 0; border-radius: 10px; padding: ${phone ? "10px" : "7px"} 10px; font-size: 13px; line-height: 18px; color: var(--text-muted); transition: background-color 120ms var(--ease), color 120ms var(--ease); }
${S} .topt:hover, ${S} .topt.is-on { background: color-mix(in srgb, var(--text-primary) 7%, transparent); color: var(--text-primary); }
${S} .topt b { font-weight: 600; color: var(--text-primary); }
${S} .tname { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${S} .tsep { height: 1px; margin: 4px 6px; background: var(--border); }
.is-light ${S} .tsug { background: var(--card); }

/* More: a small round button at the end of the pills, its menu hanging below it. */
${S} .dmore { position: relative; display: flex; }
${S} .dmore .icon-btn { position: relative; width: 24px; height: 24px; }
${S} .dmore .icon-btn:hover, ${S} .dmore .icon-btn[aria-expanded="true"] { background: var(--card-raised); color: var(--text-primary); }
${S} .dmenu { position: absolute; right: 0; top: calc(100% + 8px); z-index: 14; width: 188px; border-radius: 16px; border: 1px solid var(--border); padding: 8px;
  background: var(--overlay-veil); box-shadow: var(--overlay-rim); -webkit-backdrop-filter: var(--overlay-blur); backdrop-filter: var(--overlay-blur);
  transform-origin: top right; animation: d4-pop 150ms var(--ease-out-strong); }
@keyframes d4-pop { from { opacity: 0; transform: scale(0.97) translateY(-4px); } }
/* hold-button.tsx: danger at 25%, filling solid toward the real colour while held; no warning text. */
${S} .hold { position: relative; isolation: isolate; display: flex; width: 100%; align-items: center; justify-content: center; gap: 8px; overflow: hidden; border-radius: 999px; padding: 6px 16px;
  font-size: 14px; line-height: 20px; font-weight: 500; user-select: none; touch-action: none; background: color-mix(in srgb, var(--danger) 25%, transparent); color: var(--danger); transition: opacity 150ms var(--ease); }
${S} .hold:hover { opacity: 0.9; }
${S} .hold i { position: absolute; inset: 0; z-index: -1; transform-origin: left; background: var(--danger); }
${S} .hold i.is-rest { transition: transform 150ms var(--ease); }
${S} .hold span { position: relative; }
${S} .hold.is-over span { color: #ffffff; }

/* The feedback box's slide picker: FilterPills' segmented shape. Deck regenerates the whole deck; Hook or a number, that slide. */
${S} .scope { display: flex; align-items: center; gap: 2px; width: fit-content; max-width: 100%; overflow-x: auto; border-radius: 999px; background: var(--card-raised); padding: 2px; }
${S} .scope button { position: relative; flex-shrink: 0; border-radius: 999px; padding: 4px 12px; font-size: 12px; line-height: 16px; font-weight: 500; white-space: nowrap; color: var(--text-muted); transition: color 150ms var(--ease), background-color 150ms var(--ease); }
${S} .scope button:not(.is-on):hover { color: var(--text-primary); }
${S} .scope button.is-on { background: var(--accent); color: var(--bg); }
${S} .btn2--full:disabled { opacity: 0.4; cursor: not-allowed; }
${
  phone
    ? `
/* Phone: the counts and Render live in the bottom bar, so the sticky line is not needed; Regenerate batch sits under the title. */
${S} .prog { display: none; }
${S} .pbatch { position: relative; align-self: stretch; margin-top: 12px; }
${S} .pbatch .bpop { left: 0; right: 0; width: auto; transform-origin: top left; }
${S} .scope button { padding: 4px 10px; }
${S} .bar .status { display: flex; flex-direction: column; align-items: flex-start; }
${S} .bflag { position: relative; font-size: 12px; line-height: 16px; font-weight: 500; color: var(--danger); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: color-mix(in srgb, var(--danger) 45%, transparent); }
/* 44px touch targets: the controls keep their look, the hit area grows. */
${S} .dmore .icon-btn::after { content: ""; position: absolute; inset: -10px; }
${S} .bflag::after { content: ""; position: absolute; inset: -6px; }
${S} .split > button::after { content: ""; position: absolute; inset: -8px 0; }
${S} .scope button::after { content: ""; position: absolute; inset: -10px 0; }
${S} .pbatch .btn2::after, ${S} .bpop .btn2::after { content: ""; position: absolute; inset: -12px -8px; }
`
    : ""
}
@media (prefers-reduced-motion: reduce) {
  ${S} .sk--row { animation: none; opacity: 0.7; }
  ${S} .dmenu, ${S} .bpop, ${S} .tsug { animation: d3-fade 150ms linear; }
  ${S} .hold i.is-rest, ${S} .srg, ${S} .dhook, ${S} .dslides li, ${S} .vnav { transition: none; }
  ${S} .dpane { transition: opacity 150ms linear; }
}
`;
}

/* ── Markup ────────────────────────────────────────────────────────────── */

const slideRows = (phone) =>
  Array.from(
    { length: ROWS },
    (_, k) =>
      `<sc-if value="{{c.s${k}}}" hint-placeholder-val="{{ ${k < 6} }}"><li class="{{c.r${k}}}"><span class="dn tnum">${k + 2}</span>` +
      `<sc-if value="{{c.b${k}}}" hint-placeholder-val="{{ false }}"><i class="sk sk--row" aria-label="Rewriting slide ${k + 2}"></i></sc-if>` +
      `<sc-if value="{{c.nb${k}}}" hint-placeholder-val="{{ true }}"><span class="dt">{{c.t${k}}}</span></sc-if>` +
      (phone ? "" : `<sc-if value="{{c.rowRegen}}" hint-placeholder-val="{{ true }}"><button type="button" class="srg" aria-label="Regenerate slide ${k + 2}" title="Regenerate slide ${k + 2}" onClick="{{c.rg${k}}}">${D4I.retry}</button></sc-if>`) +
      `</li></sc-if>`,
  ).join("");

const skeletonRows = () =>
  Array.from({ length: ROWS }, (_, k) => `<sc-if value="{{c.s${k}}}" hint-placeholder-val="{{ ${k < 6} }}"><li><span class="dn tnum">${k + 2}</span><i class="sk" style="width: {{c.w${k}}}%"></i></li></sc-if>`).join("");

const scopeChips = () =>
  Array.from(
    { length: 10 },
    (_, j) =>
      /* Slide 1 is the hook, and the card shows it unnumbered, so its chip says Hook. */
      `<sc-if value="{{c.sv${j + 1}}}" hint-placeholder-val="{{ ${j < 7} }}"><button type="button" role="radio" class="tnum {{c.scc${j + 1}}}" aria-checked="{{c.sca${j + 1}}}"${j ? ` aria-label="Slide ${j + 1}"` : ""} onClick="{{c.pick${j + 1}}}">${j ? j + 1 : "Hook"}</button></sc-if>`,
  ).join("");

const deckCard = (phone) => `
            <article class="deck {{c.cls}}" id="deck-{{c.n}}" tabindex="0" aria-label="{{c.label}}" aria-keyshortcuts="R J K" aria-busy="{{c.busy}}">
              <div class="dtop">
                <span class="dno tnum">{{c.label}}</span>
                <span class="dpills">
                  <sc-if value="{{c.showVer}}" hint-placeholder-val="{{ false }}"><span class="pill tnum">{{c.verText}}</span></sc-if>
                  <sc-if value="{{c.pillWritten}}" hint-placeholder-val="{{ true }}"><span class="pill">Written</span></sc-if>
                  <sc-if value="{{c.pillFlag}}" hint-placeholder-val="{{ false }}"><span class="pill pill--danger">{{c.flag}}</span></sc-if>
                  <sc-if value="{{c.pillRewriting}}" hint-placeholder-val="{{ false }}"><span class="pill pill--accent">Rewriting</span></sc-if>
                  <sc-if value="{{c.pillUpnext}}" hint-placeholder-val="{{ false }}"><span class="pill">Up next</span></sc-if>
                  <sc-if value="{{c.showMore}}" hint-placeholder-val="{{ true }}">
                    <span class="dmore">
                      <button type="button" class="icon-btn" aria-label="{{c.moreLabel}}" aria-haspopup="menu" aria-expanded="{{c.menuExp}}" onClick="{{c.toggleMenu}}">${D4I.more}</button>
                      <sc-if value="{{c.menu}}" hint-placeholder-val="{{ false }}">
                        <div class="dmenu" role="menu" aria-label="{{c.moreLabel}}" onKeyDown="{{c.menuKey}}">
                          <button type="button" class="hold {{c.holdCls}}" role="menuitem" aria-label="Discard deck, press and hold" onPointerDown="{{c.holdStart}}" onPointerUp="{{c.holdStop}}" onPointerLeave="{{c.holdStop}}" onKeyDown="{{c.holdKey}}" onKeyUp="{{c.holdStop}}" onBlur="{{c.holdStop}}"><i class="{{c.holdRest}}" style="transform: scaleX({{c.holdScale}})" aria-hidden="true"></i><span>Discard deck</span></button>
                        </div>
                      </sc-if>
                    </span>
                  </sc-if>
                </span>
              </div>
              <sc-if value="{{c.hasCopy}}" hint-placeholder-val="{{ true }}">
                <div class="dbody">
                  <div class="dclip">
                    <div class="dpane {{c.paneCls}}" style="transform: translateX({{c.dragX}}px); opacity: {{c.dragO}}"${
                      phone ? ` onPointerDown="{{c.paneDown}}" onPointerMove="{{c.paneMove}}" onPointerUp="{{c.paneUp}}" onPointerCancel="{{c.paneUp}}"` : ""
                    }>
                      <div class="dcopy" tabindex="0" role="region" aria-label="{{c.copyLabel}}">
                        <p class="dhook {{c.hookCls}}"><sc-if value="{{c.hookBusy}}" hint-placeholder-val="{{ false }}"><i class="sk sk--row" aria-label="Rewriting the hook"></i></sc-if><sc-if value="{{c.hookIdle}}" hint-placeholder-val="{{ true }}">{{c.hook}}</sc-if>${
                          phone ? "" : `<sc-if value="{{c.rowRegen}}" hint-placeholder-val="{{ true }}"><button type="button" class="srg" aria-label="Regenerate slide 1" title="Regenerate slide 1" onClick="{{c.rgHook}}">${D4I.retry}</button></sc-if>`
                        }</p>
                        <ol class="dslides">${slideRows(phone)}</ol>
                      </div>
                      <p class="dcap">{{c.caption}}</p>
                    </div>
                  </div>
                  <div class="dfoot">
                    <sc-if value="{{c.notChanging}}" hint-placeholder-val="{{ true }}">
                      <div class="dmusic {{c.musicCls}}" title="{{c.trackName}}"><sc-if value="{{c.musicOk}}" hint-placeholder-val="{{ true }}">${D4I.music}</sc-if><sc-if value="{{c.musicBad}}" hint-placeholder-val="{{ false }}">${D4I.warn}</sc-if><span>{{c.trackName}}</span></div>
                      <sc-if value="{{c.showTools}}" hint-placeholder-val="{{ false }}">
                        <span class="dtools">
                          <sc-if value="{{c.isChecking}}" hint-placeholder-val="{{ false }}"><span class="dcheck" role="status"><span class="spin on">${D4I.busy}</span>Checking track</span></sc-if>
                          <sc-if value="{{c.showRetry}}" hint-placeholder-val="{{ false }}">
                            <span class="split" onKeyDown="{{c.tmenuKey}}">
                              <button type="button" class="smain" onClick="{{c.retry}}">${D4I.retry}Retry music lookup</button>
                              <button type="button" class="sarrow" aria-label="{{c.tmenuLabel}}" aria-haspopup="menu" aria-expanded="{{c.tmenuExp}}" onClick="{{c.toggleTmenu}}">${D4I.caretDown}</button>
                              <sc-if value="{{c.tmenu}}" hint-placeholder-val="{{ false }}">
                                <span class="smenu" role="menu" aria-label="{{c.tmenuLabel}}">
                                  <button type="button" role="menuitem" class="topt" onClick="{{c.change}}">${D4I.music}<span class="tname">Change track</span></button>
                                </span>
                              </sc-if>
                            </span>
                          </sc-if>
                        </span>
                      </sc-if>
                    </sc-if>
                    <sc-if value="{{c.isChanging}}" hint-placeholder-val="{{ false }}">
                      <div class="tsearch">
                        <span class="tsicon" aria-hidden="true">${D4I.search}</span>
                        <input class="tin {{c.tinCls}}" type="text" role="combobox" aria-expanded="true" aria-controls="{{c.sugId}}" aria-autocomplete="list" aria-label="{{c.tinLabel}}" placeholder="Search tracks" value="{{c.trackText}}" onChange="{{c.typeTrack}}" onKeyDown="{{c.trackKey}}">
                        <div class="tsug" id="{{c.sugId}}" role="listbox" aria-label="Tracks">
                          <sc-for list="{{c.sugs}}" as="o" hint-placeholder-count="3">
                            <button type="button" role="option" class="topt {{o.cls}}" aria-selected="{{o.sel}}" onClick="{{o.pick}}">${D4I.music}<span class="tname">{{o.pre}}<b>{{o.hit}}</b>{{o.post}}</span></button>
                          </sc-for>
                          <sc-if value="{{c.showLookup}}" hint-placeholder-val="{{ true }}">
                            <span class="tsep" aria-hidden="true"></span>
                            <button type="button" role="option" class="topt {{c.lookCls}}" aria-selected="{{c.lookSel}}" onClick="{{c.lookup}}">${D4I.search}<span class="tname">{{c.lookText}}</span></button>
                          </sc-if>
                        </div>
                      </div>
                      <button type="button" class="tbtn" onClick="{{c.cancelTrack}}">Cancel</button>
                    </sc-if>
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
                <sc-if value="{{c.showAct}}" hint-placeholder-val="{{ true }}">
                  <div class="dact">
                    <sc-if value="{{c.showRegen}}" hint-placeholder-val="{{ true }}"><button type="button" class="btn2 btn2--line btn2--full" title="Regenerate (R)" aria-keyshortcuts="R" onClick="{{c.regen}}">${D4I.retry}Regenerate</button></sc-if>
                    <sc-if value="{{c.fb}}" hint-placeholder-val="{{ false }}"><button type="button" class="btn2 btn2--line btn2--full" onClick="{{c.submit}}">${D4I.retry}{{c.submitText}}</button></sc-if>
                    <sc-if value="{{c.regenOff}}" hint-placeholder-val="{{ false }}"><button type="button" class="btn2 btn2--line btn2--full" disabled="{{c.regenOff}}">${D4I.retry}Regenerate</button></sc-if>
                  </div>
                </sc-if>
                ${
                  phone
                    ? ""
                    : `<sc-if value="{{c.showPrev}}" hint-placeholder-val="{{ false }}"><button type="button" class="vnav vnav--prev" aria-label="{{c.prevLabel}}" title="{{c.prevLabel}}" onClick="{{c.prev}}">${D4I.prev}</button></sc-if>
                <sc-if value="{{c.showNext}}" hint-placeholder-val="{{ false }}"><button type="button" class="vnav vnav--next" aria-label="{{c.nextLabel}}" title="{{c.nextLabel}}" onClick="{{c.next}}">${D4I.next}</button></sc-if>`
                }
              </sc-if>
              <sc-if value="{{c.isSkeleton}}" hint-placeholder-val="{{ false }}">
                <div class="dcopy">
                  <sc-if value="{{c.hasNote}}" hint-placeholder-val="{{ false }}"><p class="dnote">{{c.quote}}</p></sc-if>
                  <div class="dhook"><i class="sk" style="width: {{c.h0}}%"></i><i class="sk" style="width: {{c.h1}}%"></i></div>
                  <ol class="dslides" aria-hidden="true">${skeletonRows()}</ol>
                </div>
                <div class="dcap" aria-hidden="true"><i class="sk" style="width: 92%"></i><i class="sk" style="width: 38%"></i></div>
                <div class="dfoot" aria-hidden="true"><div class="dmusic"><i class="sk" style="width: 42%"></i></div></div>
                <div class="dact" aria-hidden="true"><i class="sk"></i></div>
              </sc-if>
            </article>`;

const batchPop = `
                <sc-if value="{{rvBatchOpen}}" hint-placeholder-val="{{ false }}">
                  <div class="bpop" role="dialog" aria-label="Regenerate batch" onKeyDown="{{rvBatchKey}}">
                    <textarea class="{{rvBatchTaCls}}" rows="3" aria-label="Feedback for every deck" placeholder="Every hook under eight words" value="{{rvBatchNote}}" onChange="{{rvBatchType}}"></textarea>
                    <div class="dfbact">
                      <button type="button" class="tbtn" onClick="{{rvBatchCancel}}">Cancel</button>
                      <button type="button" class="btn2 btn2--line" onClick="{{rvBatchSubmit}}">${D4I.retry}{{rvBatchSubmitText}}</button>
                    </div>
                  </div>
                </sc-if>`;

const batchButton = `<button type="button" class="btn2" aria-expanded="{{rvBatchExp}}" aria-haspopup="dialog" onClick="{{rvBatchToggle}}">${D4I.retry}Regenerate batch</button>`;

function page(phone) {
  return `
      <main class="main">
        <div class="page">
          <div class="phead">
            <button type="button" class="upcrumb" onClick="{{rvBack}}">${I.backSm}Carousel types</button>
            <!-- No character or slide-count pills: the person is already inside this carousel type (Garreth, 2026-09-14). -->
            <div class="ptitle">
              <h1>{{rvName}}</h1>
            </div>
            ${phone ? `<sc-if value="{{rvNotRO}}" hint-placeholder-val="{{ true }}"><div class="pbatch">${batchButton}${batchPop}</div></sc-if>` : ""}
          </div>
          <div class="prog">
            <div class="prow">
              <span class="pstat" role="status" aria-live="polite">
                <span class="pcount tnum">{{rvProgCount}}</span>
                <sc-if value="{{rvShowFlagged}}" hint-placeholder-val="{{ true }}"><button type="button" class="pflag tnum" onClick="{{rvJumpFlag}}">{{rvFlaggedText}}</button></sc-if>
                <sc-if value="{{rvShowDiscarded}}" hint-placeholder-val="{{ false }}"><span class="pmeta tnum">{{rvDiscardedText}}</span></sc-if>
                <sc-if value="{{rvRO}}" hint-placeholder-val="{{ false }}"><span class="pwho"><span class="av" aria-hidden="true">SA</span><span><b>Sam</b> is reviewing this batch, last moved 4 min ago</span></span></sc-if>
              </span>
              <sc-if value="{{rvNotRO}}" hint-placeholder-val="{{ true }}">
                <div class="pacts">
                  ${batchButton}${batchPop}
                  <button type="button" class="cta tnum" disabled="{{rvRenderOff}}" onClick="{{rvRender}}">{{rvRenderText}}</button>
                </div>
              </sc-if>
            </div>
          </div>
          <div class="grid" onKeyDown="{{rvGridKey}}">
            <sc-for list="{{rvDecks}}" as="c" hint-placeholder-count="9">${deckCard(phone)}
            </sc-for>
          </div>
        </div>
      </main>`;
}

/* The bell's dot (flagged decks ring it, as designed in D3), and on the phone the bottom bar. */
const colOverlay = (phone) => `
    <sc-if value="{{rvBellDot}}" hint-placeholder-val="{{ true }}"><span class="d3-dot" aria-hidden="true"></span></sc-if>
    ${
      phone
        ? `<div class="bar">
      <sc-if value="{{rvNotRO}}" hint-placeholder-val="{{ true }}">
        <span class="status tnum"><b>{{rvProgCount}}</b><sc-if value="{{rvShowFlagged}}" hint-placeholder-val="{{ true }}"><button type="button" class="bflag" onClick="{{rvJumpFlag}}">{{rvFlaggedText}}</button></sc-if></span>
        <button type="button" class="cta tnum" disabled="{{rvRenderOff}}" onClick="{{rvRender}}">{{rvRenderShort}}</button>
      </sc-if>
      <sc-if value="{{rvRO}}" hint-placeholder-val="{{ false }}">
        <span class="pwho"><span class="av" aria-hidden="true">SA</span><span class="status"><b>Sam is reviewing</b>Last moved 4 min ago</span></span>
      </sc-if>
    </div>`
        : ""
    }`;

/* ── Behaviour ─────────────────────────────────────────────────────────── */

/* Scroll to a deck when asked (a flagged count, a picture opened part-way down), and put the caret
   in a feedback box or track search as it opens. Keyboard moves scroll instantly: they are repeated. */
const didUpdate = `
    if (st.d4scroll) {
      var column4 = document.querySelector(".col");
      var card4 = document.getElementById("deck-" + st.d4scroll);
      var app4 = document.querySelector(".app");
      if (column4 && card4) {
        var reduce4 = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        column4.scrollTo({ top: card4.offsetTop - (app4 && app4.offsetWidth < 600 ? 76 : 150), behavior: reduce4 || !this.d4smooth ? "auto" : "smooth" });
      }
      this.d4smooth = true;
      this.setState({ d4scroll: 0 });
    }
    if (st.d4focus) {
      var box4 = document.querySelector("#deck-" + st.d4focus + " textarea");
      if (box4) box4.focus({ preventScroll: true });
      this.setState({ d4focus: 0 });
    }
    if (st.d4focusTrack) {
      var tin4 = document.querySelector("#deck-" + st.d4focusTrack + " .tin");
      if (tin4) tin4.focus({ preventScroll: true });
      this.setState({ d4focusTrack: 0 });
    }`;

function vals({ auto, init }) {
  return `
    var P = s.params || {};
    var AUTO = ${auto};
    var HOOKS = ${JSON.stringify(HOOKS)};
    var LINES = ${JSON.stringify(LINES)};
    var CAPTIONS = ${JSON.stringify(CAPTIONS)};
    var LIBRARY = ${JSON.stringify(LIBRARY)};
    var FLAG = ${JSON.stringify(FLAG)};
    var BASE = ${JSON.stringify(BASE)};
    var INIT_SCROLL = ${init.scrollTo || 0};
    var SLIDES = parseInt(P.slides, 10) || 7;
    var NAME = P.name || "Before & After";
    var SONG = LIBRARY[0];
    var RO = !!s.d4ro;
    var PHONE = ctx.PHONE;

    /* Opened from D3: every deck written, carrying D3's flagged decks (deck 6 when none were passed). */
    var seed = function (p) {
      var total = Math.min(50, Math.max(1, parseInt((p || {}).count, 10) || 20));
      var flagList = (p && p.flagged) || [6];
      var list = [];
      for (var n = 1; n <= total; n++) list.push(Object.assign({}, BASE, { n: n }, flagList.indexOf(n) >= 0 ? { st: "flagged", flag: FLAG.compliance } : {}));
      return list;
    };
    var decks = s.d4decks || seed(P);
    var current = function () { return (self.state && self.state.d4decks) || decks; };
    var find = function (n) { return current().filter(function (d) { return d.n === n; })[0]; };
    var setDeck = function (n, patch, extra) {
      var next = current().map(function (d) { return d.n === n ? Object.assign({}, d, patch) : d; });
      self.setState(Object.assign({ d4decks: next }, extra || {}));
    };
    /* One open panel at a time: a feedback box, a More menu or a track search closes the others. */
    var only = function (n, patch, extra) {
      var next = current().map(function (d) {
        var calm = { fb: false, menu: false, hold: 0, tmenu: false, kbd: false };
        if (d.n === n) return Object.assign({}, d, calm, patch);
        return Object.assign({}, d, calm, d.track === "changing" ? { track: d.prevTrack || "notfound" } : {});
      });
      self.setState(Object.assign({ d4decks: next, d4batch: false }, extra || {}));
    };

    /* Versions: each holds which variant of every slide it shows (0 hook, 1-9 slides 2-10, 10 caption). */
    var seedsOf = function (d) {
      if (d.seeds) return d.seeds;
      var a = [];
      for (var v = 0; v < d.vers; v++) { var r = []; for (var j = 0; j <= 10; j++) r.push(v); a.push(r); }
      return a;
    };
    /* A new version from the one showing: the whole deck (0), one slide (1-10), or only the music (-1). */
    var bump = function (d, slide) {
      var a = seedsOf(d).map(function (r) { return r.slice(); });
      var last = a[d.cur - 1].slice();
      for (var j = 0; j <= 10; j++) if (slide === 0 || j === slide - 1) last[j] = last[j] + 1;
      a.push(last);
      return { seeds: a, vers: a.length, cur: a.length };
    };
    var trackFlag = function (d) { return d.flag === FLAG.track || d.flag === FLAG.lookup; };

    /* The prototype's writer and music lookup, on timers. */
    var tick = function () {
      var st = self.state || {};
      if (st.screen !== "review") { clearInterval(self.d4timer); self.d4timer = null; return; }
      var moved = false;
      var cur = (st.d4decks || seed(st.params)).map(function (d) {
        if (d.st === "writing") { moved = true; return Object.assign({}, d, { st: "written", flag: "", fresh: true, note: "" }, bump(d, 0)); }
        if (d.slideBusy) { moved = true; return Object.assign({}, d, { slideBusy: 0, st: d.st === "flagged" && !trackFlag(d) ? "written" : d.st, flag: d.st === "flagged" && !trackFlag(d) ? "" : d.flag }, bump(d, d.slideBusy)); }
        if (d.track === "checking") { moved = true; return Object.assign({}, d, { track: d.after || "ok", after: "" }, trackFlag(d) ? { st: "written", flag: "" } : {}); }
        return d;
      });
      if (!cur.some(function (d) { return d.st === "writing"; })) {
        for (var i = 0; i < cur.length; i++) if (cur[i].st === "upnext") { cur[i] = Object.assign({}, cur[i], { st: "writing" }); moved = true; break; }
      }
      self.setState({ d4decks: cur });
      if (!moved) { clearInterval(self.d4timer); self.d4timer = null; }
    };
    var working = decks.some(function (d) { return d.st === "upnext" || d.st === "writing" || d.slideBusy || d.track === "checking"; });
    if (AUTO && s.screen === "review" && working && !self.d4timer) self.d4timer = setInterval(tick, 900);
    if (INIT_SCROLL && !self.d4scrolled) {
      self.d4scrolled = true;
      setTimeout(function () { self.setState({ d4scroll: INIT_SCROLL }); }, 60);
    }

    /* Discard deck: hold-button.tsx's timing, 1.1 seconds; letting go early always aborts. */
    var holdStop = function (n) {
      return function () {
        clearInterval(self.d4hold); self.d4hold = null;
        var d = find(n);
        if (d && d.hold > 0) setDeck(n, { hold: 0 });
      };
    };
    var holdStart = function (n) {
      return function (e) {
        if (e && typeof e.button === "number" && e.button !== 0) return;
        if (self.d4hold) return;
        var t0 = Date.now();
        self.d4hold = setInterval(function () {
          var p = Math.min(1, (Date.now() - t0) / 1100);
          if (p >= 1) { clearInterval(self.d4hold); self.d4hold = null; setDeck(n, { st: "discarded", menu: false, hold: 0 }); }
          else setDeck(n, { hold: p });
        }, 16);
      };
    };

    /* J and K move between decks, R opens the focused deck's feedback box. Only while a card has focus,
       never inside a field, and never with a modifier held, so undo and the browser's own keys pass through. */
    var gridKey = function (e) {
      var tag = (e.target && e.target.tagName) || "";
      if (tag === "TEXTAREA" || tag === "INPUT" || e.metaKey || e.ctrlKey || e.altKey) return;
      var key = (e.key || "").toLowerCase();
      if (key !== "j" && key !== "k" && key !== "r") return;
      var card = e.target && e.target.closest ? e.target.closest(".deck") : null;
      if (!card) return;
      var n = parseInt(card.id.replace("deck-", ""), 10);
      if (key === "r") {
        var d = find(n);
        if (!RO && d && (d.st === "written" || d.st === "flagged") && !d.slideBusy) { e.preventDefault(); only(n, { fb: true, scope: 0, note: "" }, { d4focus: n }); }
        return;
      }
      e.preventDefault();
      var cards = Array.prototype.slice.call(document.querySelectorAll(".screen-review .deck"));
      var i = cards.indexOf(card);
      var to = cards[key === "j" ? Math.min(cards.length - 1, i + 1) : Math.max(0, i - 1)];
      if (to) to.focus();
    };

    /* Change track. A library track is used as it is; anything else is looked up on TikTok and Instagram.
       Either way only the music changes, as a new version. */
    var pickTrack = function (d, name) {
      setDeck(d.n, Object.assign({ track: "ok", trackName: name, trackText: "", tsel: 0 }, trackFlag(d) ? { st: "written", flag: "" } : {}, bump(d, -1)));
    };
    var lookupTrack = function (d, name) {
      setDeck(d.n, Object.assign({ track: "checking", after: "ok", trackName: name, trackText: "", tsel: 0 }, bump(d, -1)));
    };

    var drag = s.d4drag;
    var live = decks.filter(function (d) { return d.st !== "discarded"; });
    var hasCopy = function (d) { return d.st === "written" || d.st === "flagged"; };
    var view = live.map(function (d) {
      var copy = hasCopy(d);
      var act = !RO && copy && !d.fb;
      var busy = !!d.slideBusy;
      var sd = seedsOf(d)[d.cur - 1] || seedsOf(d)[0];
      var dragging = !!drag && drag.n === d.n;
      var dx = dragging ? Math.round(drag.dx) : 0;

      /* Track search suggestions: library tracks containing what is typed, the typed part in bold. */
      var q = (d.trackText || "").trim();
      var ql = q.toLowerCase();
      var hits = LIBRARY.filter(function (t) { return !ql || t.toLowerCase().indexOf(ql) >= 0; }).slice(0, 4);
      var exact = LIBRARY.some(function (t) { return t.toLowerCase() === ql; });
      var lookupShown = !!q && !exact;
      var optCount = hits.length + (lookupShown ? 1 : 0);
      var sel = Math.max(0, Math.min(optCount - 1, d.tsel || 0));

      var o = {
        n: d.n,
        label: "Deck " + d.n,
        copyLabel: "Deck " + d.n + " copy",
        fbLabel: "Feedback for deck " + d.n,
        scopeLabel: "What to regenerate in deck " + d.n,
        cls: ["is-" + d.st, d.fb ? "is-editing" : "", d.kbd ? "is-kbd" : "", d.hoverCard ? "is-hover-card" : "", d.fresh && copy ? "is-new" : "", act && !busy && !PHONE ? "can-act" : ""].join(" "),
        busy: d.st === "writing" || busy || d.track === "checking" ? "true" : "false",
        showVer: copy && d.vers > 1,
        verText: "Version " + d.cur + " of " + d.vers,
        pillWritten: d.st === "written" && !busy,
        pillFlag: d.st === "flagged" && !busy,
        pillRewriting: d.st === "writing" || busy,
        pillUpnext: d.st === "upnext",
        flag: d.flag,
        hasCopy: copy,
        isSkeleton: !copy,
        hasNote: (d.st === "upnext" || d.st === "writing") && !!d.note,
        quote: "\\u201c" + (d.note || "") + "\\u201d",

        paneCls: dragging ? "is-drag" : "",
        dragX: dx,
        dragO: Math.round((1 - Math.min(0.45, Math.abs(dx) / 260)) * 100) / 100,
        /* Swipe left for the newer version, right for the older one. Past either end the copy only gives a little. */
        paneDown: function (e) {
          if (RO || d.vers < 2 || d.fb || busy) return;
          self.d4sw = { n: d.n, x: e.clientX, t: Date.now() };
          if (e.currentTarget && e.currentTarget.setPointerCapture) { try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {} }
        },
        paneMove: function (e) {
          var g = self.d4sw;
          if (!g || g.n !== d.n) return;
          var mx = e.clientX - g.x;
          if ((mx > 0 && d.cur <= 1) || (mx < 0 && d.cur >= d.vers)) mx = mx * 0.2;
          self.setState({ d4drag: { n: d.n, dx: mx } });
        },
        paneUp: function (e) {
          var g = self.d4sw; self.d4sw = null;
          if (!g || g.n !== d.n) return;
          var mx = e.clientX - g.x;
          var flick = Math.abs(mx) / Math.max(1, Date.now() - g.t) > 0.11;
          var to = d.cur;
          if (Math.abs(mx) > 8 && (Math.abs(mx) > 64 || flick)) {
            if (mx < 0 && d.cur < d.vers) to = d.cur + 1;
            if (mx > 0 && d.cur > 1) to = d.cur - 1;
          }
          setDeck(d.n, { cur: to }, { d4drag: null });
        },

        hook: HOOKS[(d.n - 1 + sd[0] * 5) % HOOKS.length],
        hookBusy: d.slideBusy === 1,
        hookIdle: d.slideBusy !== 1,
        hookCls: ((d.fb && d.scope === 1) || d.slideBusy === 1 ? "is-picked" : "") + (d.hover === 1 ? " is-hover" : ""),
        caption: CAPTIONS[(d.n + sd[10]) % CAPTIONS.length],
        rowRegen: act && !busy,
        rgHook: function () { only(d.n, { fb: true, scope: 1, note: "" }, { d4focus: d.n }); },

        trackName: d.trackName || SONG,
        notChanging: d.track !== "changing",
        isChanging: d.track === "changing",
        musicOk: d.track !== "notfound" && d.track !== "failed",
        musicBad: d.track === "notfound" || d.track === "failed",
        musicCls: d.track === "notfound" || d.track === "failed" ? "is-bad" : "",
        isChecking: d.track === "checking",
        showRetry: !RO && (d.track === "notfound" || d.track === "failed"),
        tmenu: !!d.tmenu,
        tmenuExp: d.tmenu ? "true" : "false",
        tmenuLabel: "Other music options for deck " + d.n,
        toggleTmenu: function () { if (d.tmenu) setDeck(d.n, { tmenu: false }); else only(d.n, { tmenu: true }); },
        tmenuKey: function (e) { if (e.key === "Escape" && d.tmenu) setDeck(d.n, { tmenu: false }); },
        showTools: d.track === "checking" || (!RO && (d.track === "notfound" || d.track === "failed")),
        retry: function () { setDeck(d.n, { track: "checking", after: "ok" }); },
        change: function () { only(d.n, { track: "changing", prevTrack: d.track, trackText: "", tsel: 0 }, { d4focusTrack: d.n }); },
        tinCls: d.tinFocus ? "is-focus" : "",
        tinLabel: "Track for deck " + d.n,
        sugId: "tracks-" + d.n,
        trackText: d.trackText,
        typeTrack: function (e) { setDeck(d.n, { trackText: e.target.value, tsel: 0 }); },
        trackKey: function (e) {
          if (e.key === "Escape") { setDeck(d.n, { track: d.prevTrack || "notfound" }); return; }
          if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setDeck(d.n, { tsel: Math.max(0, Math.min(optCount - 1, sel + (e.key === "ArrowDown" ? 1 : -1))) }); return; }
          if (e.key === "Enter") { e.preventDefault(); if (sel < hits.length) pickTrack(d, hits[sel]); else if (lookupShown) lookupTrack(d, q); }
        },
        sugs: hits.map(function (t, i) {
          var at = ql ? t.toLowerCase().indexOf(ql) : -1;
          return {
            pre: at >= 0 ? t.slice(0, at) : t,
            hit: at >= 0 ? t.slice(at, at + q.length) : "",
            post: at >= 0 ? t.slice(at + q.length) : "",
            cls: i === sel ? "is-on" : "",
            sel: i === sel ? "true" : "false",
            pick: function () { pickTrack(d, t); }
          };
        }),
        showLookup: lookupShown,
        lookText: "Look up \\u201c" + q + "\\u201d as a new track",
        lookCls: lookupShown && sel === hits.length ? "is-on" : "",
        lookSel: lookupShown && sel === hits.length ? "true" : "false",
        lookup: function () { lookupTrack(d, q); },
        cancelTrack: function () { setDeck(d.n, { track: d.prevTrack || "notfound" }); },

        showPrev: !PHONE && !RO && copy && !d.fb && !busy && d.cur > 1,
        showNext: !PHONE && !RO && copy && !d.fb && !busy && d.cur < d.vers,
        prevLabel: "Version " + (d.cur - 1),
        nextLabel: "Version " + (d.cur + 1),
        prev: function () { setDeck(d.n, { cur: Math.max(1, d.cur - 1) }); },
        next: function () { setDeck(d.n, { cur: Math.min(d.vers, d.cur + 1) }); },

        showAct: !RO && copy,
        showRegen: act && !busy,
        regenOff: act && busy,
        regen: function () { only(d.n, { fb: true, scope: 0, note: "" }, { d4focus: d.n }); },

        showMore: act,
        menu: d.menu,
        menuExp: d.menu ? "true" : "false",
        moreLabel: "More for deck " + d.n,
        toggleMenu: function () { if (d.menu) setDeck(d.n, { menu: false, hold: 0 }); else only(d.n, { menu: true }); },
        menuKey: function (e) { if (e.key === "Escape") setDeck(d.n, { menu: false, hold: 0 }); },
        holdCls: d.hold > 0.5 ? "is-over" : "",
        holdRest: d.hold > 0 ? "" : "is-rest",
        holdScale: d.hold,
        holdStart: holdStart(d.n),
        holdStop: holdStop(d.n),
        holdKey: function (e) { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); holdStart(d.n)(); } },

        fb: copy && d.fb,
        taCls: d.taFocus ? "is-focus" : "",
        note: d.note,
        fbPh: d.scope === 0 ? "Shorter hook, warmer tone" : "Under ten words, no numbers",
        type: function (e) { setDeck(d.n, { note: e.target.value }); },
        cancel: function () { setDeck(d.n, { fb: false }); },
        submitText: d.scope === 0 ? "Regenerate deck" : d.scope === 1 ? "Regenerate hook" : "Regenerate slide " + d.scope,
        /* The whole deck waits as Up next, as in D3, then rewrites; one slide rewrites in place. */
        submit: function () {
          if (d.scope === 0) setDeck(d.n, { fb: false, st: "upnext" });
          else setDeck(d.n, { fb: false, slideBusy: d.scope });
        },
        scc0: d.scope === 0 ? "is-on" : "",
        sca0: d.scope === 0 ? "true" : "false",
        pick0: function () { setDeck(d.n, { scope: 0 }); },
        h0: 86 - (d.n % 4) * 6,
        h1: 44 + (d.n % 3) * 9
      };
      for (var k = 0; k < ${ROWS}; k++) {
        var slide = k + 2;
        o["s" + k] = k < SLIDES - 1;
        o["t" + k] = LINES[(d.n * 3 + k * 5 + sd[k + 1] * 7) % LINES.length];
        o["w" + k] = 48 + ((d.n * 17 + slide * 29) % 42);
        o["b" + k] = d.slideBusy === slide;
        o["nb" + k] = d.slideBusy !== slide;
        o["r" + k] = ((d.fb && d.scope === slide) || d.slideBusy === slide ? "is-picked" : "") + (d.hover === slide ? " is-hover" : "");
        o["rg" + k] = (function (sl) { return function () { only(d.n, { fb: true, scope: sl, note: "" }, { d4focus: d.n }); }; })(slide);
      }
      for (var j = 1; j <= 10; j++) {
        o["sv" + j] = j <= SLIDES;
        o["scc" + j] = d.scope === j ? "is-on" : "";
        o["sca" + j] = d.scope === j ? "true" : "false";
        o["pick" + j] = (function (sl) { return function () { setDeck(d.n, { scope: sl }); }; })(j);
      }
      return o;
    });

    var written = live.filter(hasCopy).length;
    var flagged = live.filter(function (d) { return d.st === "flagged"; });
    var ready = live.filter(function (d) { return d.st === "written" && d.track !== "checking" && d.track !== "changing" && !d.slideBusy; }).length;
    var discarded = decks.length - live.length;
    var priorBell = vals.bell;

    return {
      rvName: NAME,
      rvBack: function () { ctx.open("types", null, "Back to Carousel types · D1"); },
      rvDecks: view,
      rvRO: RO,
      rvNotRO: !RO,
      rvGridKey: gridKey,

      rvProgCount: written === live.length ? written + " written" : written + " of " + live.length + " written",
      rvShowFlagged: flagged.length > 0,
      rvFlaggedText: flagged.length + " flagged",
      rvJumpFlag: function () {
        if (!flagged.length) return;
        var i = (s.d4flag || 0) % flagged.length;
        self.setState({ d4scroll: flagged[i].n, d4flag: i + 1 });
      },
      rvShowDiscarded: discarded > 0,
      rvDiscardedText: discarded + " discarded",
      rvRenderOff: ready === 0,
      rvRenderText: ready ? "Render " + ready + (ready === 1 ? " deck" : " decks") : "Render",
      rvRenderShort: ready ? "Render " + ready : "Render",
      rvRender: function () { ctx.open("render", { count: ready }, "Renders " + ready + (ready === 1 ? " deck" : " decks") + " · D5"); },

      rvBatchOpen: !RO && !!s.d4batch,
      rvBatchExp: s.d4batch ? "true" : "false",
      rvBatchNote: s.d4batchNote || "",
      rvBatchTaCls: ${JSON.stringify(init.batchFocus ? "is-focus" : "")},
      rvBatchSubmitText: "Regenerate " + live.length + (live.length === 1 ? " deck" : " decks"),
      rvBatchToggle: function () {
        var next = current().map(function (d) { return Object.assign({}, d, { fb: false, menu: false, hold: 0 }); });
        self.setState({ d4batch: !s.d4batch, d4decks: next });
      },
      rvBatchType: function (e) { self.setState({ d4batchNote: e.target.value }); },
      rvBatchCancel: function () { self.setState({ d4batch: false }); },
      rvBatchKey: function (e) { if (e.key === "Escape") self.setState({ d4batch: false }); },
      rvBatchSubmit: function () {
        self.setState({ d4batch: false });
        ctx.open("batch", { count: live.length, name: NAME, character: P.character, slides: P.slides }, "Every deck rewrites with the feedback · D3");
      },

      rvBellDot: flagged.length > 0,
      bell: function () {
        if (s.screen === "review") self.note("Flagged decks ring the bell · designed in D3");
        else if (priorBell) priorBell();
      }
    };`;
}

/**
 * D4 as a screen. `auto` runs the regenerate and music lookup timers (the
 * prototype). `init` is the moment a review picture shows.
 */
export function reviewScreen({ auto = false, tall = 0, init = {} } = {}) {
  return {
    id: "review",
    nav: "types",
    css: (phone) => css(phone, { tall }),
    markup: page,
    colOverlay,
    state: {
      d4decks: init.decks || null,
      d4ro: !!init.ro,
      d4batch: !!init.batchOpen,
      d4batchNote: init.batchNote || "",
      d4drag: init.drag || null,
      d4scroll: 0,
      d4focus: 0,
      d4focusTrack: 0,
      d4flag: 0,
    },
    /* Opened from another screen: the batch from its params, every deck written. */
    enter: { d4decks: null, d4ro: false, d4batch: false, d4batchNote: "", d4drag: null, d4scroll: 0, d4focus: 0, d4focusTrack: 0, d4flag: 0 },
    vals: vals({ auto, init }),
    didUpdate,
  };
}

/* ── Review artboards ──────────────────────────────────────────────────── */

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const decks = (spec, total = 20) => range(1, total).map((n) => ({ ...BASE, n, ...(spec[n] || {}) }));
const v2 = { vers: 2, cur: 2 };
const flagged = (flag, extra = {}) => ({ st: "flagged", flag, ...extra });
const searching = { track: "changing", prevTrack: "notfound", trackText: "Artist Na", tinFocus: true };

/* A batch as it lands from D3: three flagged, one track still being checked, one deck on its second version. */
const REVIEW = {
  3: v2,
  6: flagged(FLAG.compliance),
  8: { track: "checking" },
  11: flagged(FLAG.score),
  14: flagged(FLAG.track, { track: "notfound" }),
};

/* One deck per card state, in reading order. The key beside the board names them. */
const CARD_STATES = [
  [{ hover: 3 }, "Written. The pointer is on slide 3, which shows its regenerate button"],
  [{ ...v2, hoverCard: true }, "Version 2 of 2, pointed at: only the left arrow, since it is the newest"],
  [{ vers: 2, cur: 1, hoverCard: true }, "Version 1 of 2, pointed at: only the right arrow"],
  [{ fb: true, scope: 0, note: "The hook sounds like an ad. Make it quieter.", taFocus: true }, "Regenerate open for the whole deck"],
  [{ fb: true, scope: 4, note: "Keep slide 4 under ten words" }, "Regenerate open for one slide (slide 4)"],
  [{ slideBusy: 5 }, "Rewriting one slide (slide 5)"],
  [flagged(FLAG.score), "Flagged: Score 5.2"],
  [flagged(FLAG.compliance), "Flagged: Compliance: brand name"],
  [flagged(FLAG.lookup, { track: "failed" }), "Flagged: Music lookup failed (Retry music lookup, its arrow closed)"],
  [flagged(FLAG.track, { track: "notfound", tmenu: true }), "Flagged: Track not found on TikTok, the arrow opened: Change track"],
  [{ menu: true, hold: 0.6 }, "More menu open, Discard deck being held"],
  [{ track: "checking" }, "Checking the track"],
  [{ st: "writing", note: "Warmer, and drop the numbers" }, "Rewriting the whole deck"],
  /* In the last row, so its suggestion list hangs into the empty space under the grid. */
  [flagged(FLAG.track, searching), "Change track: searching the music library"],
  [{ kbd: true }, "Selected with the keyboard (J / K)"],
];

const MOMENTS = {
  cards: { decks: decks(Object.fromEntries(CARD_STATES.map(([spec], i) => [i + 1, spec])), CARD_STATES.length) },
  review: { decks: decks(REVIEW) },
  phoneRegenerate: { decks: decks({ ...REVIEW, 2: { fb: true, scope: 4, note: "Keep slide 4 under ten words", taFocus: true } }) },
  phoneSwipe: { decks: decks(REVIEW), drag: { n: 3, dx: 96 } },
  phoneSearch: { decks: decks({ ...REVIEW, 14: flagged(FLAG.track, searching) }) },
  phoneTrack: { decks: decks({ ...REVIEW, 14: flagged(FLAG.track, { track: "notfound", tmenu: true }) }) },
  phoneDiscard: { decks: decks({ ...REVIEW, 3: { ...v2, menu: true, hold: 0.6 } }) },
  batch: { decks: decks(REVIEW), batchOpen: true, batchNote: "Warmer tone across the batch, and keep the last slide short", batchFocus: true },
  readOnly: { decks: decks(REVIEW), ro: true },
};

const DESK_H = 1700;
const SHEET_H = 2960;

function build(OUT) {
  fs.mkdirSync(OUT, { recursive: true });
  const R1 = SHEET_H + 140;
  const ROW = DESK_H + 140;
  const BOARDS = [
    { name: "CardStates", phone: false, h: SHEET_H, m: "cards", title: "D4 · Every card state · Desktop", x: 0, y: 0 },
    { name: "Main", phone: false, m: "review", title: "D4 · Review · Desktop", x: 0, y: R1 },
    { name: "Phone", phone: true, m: "review", title: "D4 · Review · Phone", x: 1540, y: R1 },
    { name: "PhoneRegenerate", phone: true, m: "phoneRegenerate", scrollTo: 2, title: "D4 · Regenerate one slide · Phone", x: 2010, y: R1 },
    { name: "PhoneSwipe", phone: true, m: "phoneSwipe", scrollTo: 3, title: "D4 · Swiping back to version 1 · Phone", x: 2480, y: R1 },
    { name: "PhoneDiscard", phone: true, m: "phoneDiscard", scrollTo: 3, title: "D4 · Discard deck, held · Phone", x: 2950, y: R1 },
    { name: "PhoneTrack", phone: true, m: "phoneTrack", scrollTo: 14, title: "D4 · Track not found, arrow opened · Phone", x: 1540, y: R1 + 984 },
    { name: "PhoneTrackSearch", phone: true, m: "phoneSearch", scrollTo: 14, title: "D4 · Change track, searching · Phone", x: 2010, y: R1 + 984 },
    { name: "RegenerateBatch", phone: false, m: "batch", title: "D4 · Regenerate batch · Desktop", x: 0, y: R1 + ROW },
    { name: "PhoneRegenerateBatch", phone: true, m: "batch", title: "D4 · Regenerate batch · Phone", x: 1540, y: R1 + ROW + 984 },
    { name: "ReadOnly", phone: false, m: "readOnly", title: "D4 · Someone else is running it · Desktop", x: 0, y: R1 + ROW * 2 },
    { name: "PhoneReadOnly", phone: true, m: "readOnly", title: "D4 · Someone else is running it · Phone", x: 2010, y: R1 + ROW + 984 },
  ];
  const artboards = [];
  for (const light of [false, true]) {
    for (const b of BOARDS) {
      const file = `${b.name}${light ? "Light" : ""}.dc.html`;
      const h = b.phone ? 844 : b.h || DESK_H;
      const screen = reviewScreen({ tall: b.phone ? 0 : h, init: { ...MOMENTS[b.m], scrollTo: b.scrollTo || 0 } });
      const html = artboard({ phone: b.phone, light, screens: [screen], navMode: "note" }).replace('"height":900', `"height":${h}`);
      fs.writeFileSync(path.join(OUT, file), html);
      artboards.push({ file, title: light ? `${b.title} · Light` : b.title, page: light ? "light" : "dark", x: b.x, y: b.y, w: b.phone ? 390 : 1440, h });
    }
  }
  /* A key beside each card-states board, so each deck's state can be found without guessing. */
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
  console.log(`Wrote D4 artboards to ${OUT}`);
}

if (isMain(import.meta.url)) build(path.resolve(process.argv[2] ?? path.join(HERE, "out")));
