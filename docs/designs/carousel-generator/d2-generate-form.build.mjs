#!/usr/bin/env node
/*
 * D2 · Generate form — opened by Generate on a carousel type in D1.
 *
 * Design step only (docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md, D2). Nothing
 * here is app code. The shell (menu, top bar, glow, both themes, phone drawer,
 * prototype note) comes from generator-kit.mjs; this file is the screen. Dark
 * approved by Garreth 2026-09-14; light designed the same day. All content is
 * made-up sample data; the library covers are placeholder photos from the
 * Supabase image store (Garreth, 2026-09-14). When the library has no images
 * in a set the template needs, Generate with AI opens that library's own
 * Generate images form for those sets (D8) and comes back (Garreth,
 * 2026-09-15).
 *
 * Run directly, it writes D2's review artboards and canvas.json, each screen
 * twice (Dark page, Light page):
 *   Main.dc.html          desktop 1440×900, ready to generate
 *   Phone.dc.html         phone 390×844, Generate in a bottom bar
 *   PhonePicker.dc.html   phone, the library picker open
 *   Picker.dc.html        desktop, the library picker open
 *   EmptySets.dc.html     desktop, the library has no images in two sets
 *   NoLibrary.dc.html     desktop, the type points at no library
 * Imported, `generateScreen()` is the screen prototype.build.mjs opens from D1.
 *
 *   node docs/designs/carousel-generator/d2-generate-form.build.mjs <out dir>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { I, icon, artboard, isMain } from "./generator-kit.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const D2I = { spark: icon("Sparkle", 12) };

/** Library covers, stored in carousel-generator/assets and referenced by name from the CSS. */
export function copyCovers(OUT) {
  for (const id of ["window", "mirror", "outdoor", "kitchen"]) {
    fs.copyFileSync(path.join(HERE, "assets", `d2-lib-${id}.jpg`), path.join(OUT, `d2-lib-${id}.jpg`));
  }
}

/* ── Styles ────────────────────────────────────────────────────────────── */

function css(phone) {
  return `
/* ── D2 page ── */
.screen-generate .phead { display: flex; flex-direction: column; align-items: flex-start; }
/* Name left, character and slide count right (Garreth, 2026-09-14). */
.ptitle { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; align-self: stretch; }
/* Back to Carousel types: the breadcrumb above the name, not a second menu. */
.upcrumb { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 4px -2px; padding: 2px; border-radius: 8px; font-size: 13px; line-height: 20px; font-weight: 500; color: var(--text-muted); transition: color 150ms var(--ease); }
.upcrumb:hover { color: var(--text-primary); }
.screen-generate .cmeta { display: flex; flex-wrap: wrap; gap: 6px; }
.pill b { font-weight: 500; color: var(--text-primary); }
.pill--danger, .pill--danger b { color: var(--danger); }

/* The form is one card of rows between thin lines, the same banding as D1's View details. */
/* Scoped: Trends' feed post and the libraries' folder card are .fcard too, and unscoped this boxed them in. */
.screen-generate .fcard { display: flex; flex-direction: column; border-radius: 24px; background: var(--card); border: 1px solid var(--border); box-shadow: var(--sh-card); }
.frow { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 24px; align-items: start; padding: 16px 24px; border-top: 1px solid var(--border); }
.frow:first-child, .fgroup + .frow { border-top: 0; }
.flabel { display: flex; flex-direction: column; padding-top: 6px; font-size: 14px; line-height: 20px; font-weight: 500; }
.flabel .opt { font-size: 12px; line-height: 16px; font-weight: 400; color: var(--text-muted); }
.fgroup { padding: 20px 24px 4px; border-top: 1px solid var(--border); font-size: 11px; line-height: 16.5px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-muted); }
.fctl { position: relative; min-width: 0; }
/* Auto mode (D12): the app's switch (theme-toggle.tsx), with its own on state; the kit's .switch is the theme toggle,
   which light mode always paints on. */
.screen-generate .asw { position: relative; display: block; width: 36px; height: 20px; flex-shrink: 0; border: 0; padding: 0; border-radius: 999px; background: var(--card-raised); cursor: pointer; transition: background-color 150ms var(--ease); }
.screen-generate .asw i { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 999px; background: var(--text-primary); transition: transform 150ms var(--ease), background-color 150ms var(--ease); }
.screen-generate .asw[aria-checked="true"] { background: var(--accent); }
.screen-generate .asw[aria-checked="true"] i { transform: translateX(16px); background: var(--bg); }
.screen-generate .asw:active i { width: 18px; }
.screen-generate .asw::after { content: ""; position: absolute; inset: -12px -8px; }
.is-light .screen-generate .asw { background: color-mix(in srgb, var(--text-muted) 35%, transparent); }
.is-light .screen-generate .asw i, .is-light .screen-generate .asw[aria-checked="true"] i { background: var(--card); }
.is-light .screen-generate .asw[aria-checked="true"] { background: var(--accent); }
.screen-generate .frow--auto { align-items: center; }
.ffoot { display: flex; align-items: center; gap: 16px; min-height: 70px; padding: 16px 24px; border-top: 1px solid var(--border); }
.status { min-width: 0; font-size: 13px; line-height: 20px; color: var(--text-muted); }
.status.danger { color: var(--danger); }
.ffoot .cta { margin-left: auto; }

/* How many — src/components/ui/stepper.tsx */
.stepper { display: inline-flex; align-items: stretch; width: 132px; overflow: hidden; border-radius: 16px; border: 1px solid var(--border); background: color-mix(in srgb, var(--bg) 60%, transparent); }
.stepbtn { display: flex; width: 28px; flex-shrink: 0; align-items: center; justify-content: center; color: var(--text-muted); transition: color 150ms var(--ease), background-color 150ms var(--ease); }
.stepbtn:hover:not(:disabled) { background: var(--card); color: var(--text-primary); }
.stepbtn:disabled { cursor: not-allowed; opacity: 0.3; }
.stepval { display: flex; flex: 1; min-width: 0; align-items: center; border-left: 1px solid var(--border); border-right: 1px solid var(--border); }
.stepval input { width: 100%; min-width: 0; padding: 6px 4px; text-align: center; font-size: 14px; line-height: 20px; outline: none; font-variant-numeric: tabular-nums; }
.stepval:focus-within { box-shadow: inset 0 0 0 2px var(--accent); }

/* Image library */
.lib { display: flex; align-items: center; gap: 12px; min-height: 48px; }
.tile { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; flex-shrink: 0; border-radius: 12px; color: var(--text-muted); }
.tile--empty { border: 1px dashed var(--border); background: var(--card-sunken); }
/* Library covers: placeholder photos (Garreth, 2026-09-14). The tint underneath shows until the photo paints. */
.tile.has-img { background-size: cover; background-position: center; }
.img-window { background-image: url(./d2-lib-window.jpg); }
.img-mirror { background-image: url(./d2-lib-mirror.jpg); }
.img-outdoor { background-image: url(./d2-lib-outdoor.jpg); }
.img-kitchen { background-image: url(./d2-lib-kitchen.jpg); }
.libtext { display: flex; flex: 1; min-width: 0; flex-direction: column; }
.libname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; line-height: 20px; font-weight: 500; }
.libname.muted { color: var(--text-muted); }
.libmeta { font-size: 12px; line-height: 16px; color: var(--text-muted); }
/* Positioned, so the desktop picker hangs 8px under Change itself (dropdown.tsx's mt-2), not under the set pills. */
.libact { position: relative; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.tbtn { position: relative; border-radius: 8px; padding: 2px 4px; font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-muted); transition: color 150ms var(--ease); }
.tbtn:hover { color: var(--text-primary); }
.sets { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
/* The empty sets' way out without leaving the form (Garreth, 2026-09-15). Nothing joins the library until Keep. */
.libai { margin-top: 12px; }

/* Direction — read-only: sunken, no field border, so it never reads as editable. */
.dir { border-radius: 16px; background: var(--card-sunken); border: 1px solid var(--border); padding: 10px 14px 12px; }
.dirhead { display: flex; align-items: center; gap: 8px; }
.dirdate { font-size: 12px; line-height: 16px; color: var(--text-muted); }
.dirhead .tbtn { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; }
.dirtext { margin: 8px 0 0; font-size: 13px; line-height: 20px; color: var(--text-muted); text-wrap: pretty; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.dir.open .dirtext { -webkit-line-clamp: unset; }
.dir .more { margin: 4px 0 0 -4px; }

/* Note — the same box as the fixed opening line below it (Garreth, 2026-09-14): full width, rounded-nested, sunken. */
.field { display: flex; align-items: center; border-radius: 16px; border: 1px solid var(--border); background: var(--card-sunken); padding: 10px 14px; transition: box-shadow 150ms var(--ease); }
.field:focus-within { box-shadow: 0 0 0 2px var(--accent); }
.field input { width: 100%; font-size: 14px; line-height: 20px; font-weight: 500; outline: none; }
.field input::placeholder { color: var(--text-muted); }

/* Opening line — src/components/ui/filter-pills.tsx */
.seg { display: inline-flex; align-items: center; gap: 2px; border-radius: 999px; background: var(--card-raised); padding: 2px; }
.seg button { border-radius: 999px; padding: 4px 12px; font-size: 12px; line-height: 16px; font-weight: 500; white-space: nowrap; color: var(--text-muted); transition: color 150ms var(--ease), background-color 150ms var(--ease); }
.seg button:hover { color: var(--text-primary); }
.seg button[aria-checked="true"] { background: var(--accent); color: var(--bg); }
.fixed { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 200ms var(--ease-out-strong); }
.fixed.on { grid-template-rows: 1fr; }
.fixed-in { min-height: 0; overflow: hidden; }
.fixed:not(.on) .fixed-in { visibility: hidden; transition: visibility 0s 200ms; }
.fixedline { margin-top: 10px; border-radius: 16px; background: var(--card-sunken); border: 1px solid var(--border); padding: 10px 14px; font-size: 14px; line-height: 20px; font-weight: 500; }

/* Popovers — .glass-overlay, rounded-nested. 180ms in, 120ms out, scaled from the trigger's corner. */
.catch { position: absolute; inset: 0; z-index: 30; display: none; }
.catch.on { display: block; }
.pop { position: absolute; z-index: 40; border-radius: 16px; border: 1px solid var(--border); padding: 8px;
  background: var(--overlay-veil); box-shadow: var(--overlay-rim); -webkit-backdrop-filter: var(--overlay-blur); backdrop-filter: var(--overlay-blur);
  opacity: 0; visibility: hidden; pointer-events: none; transform: scale(0.97) translateY(-4px);
  transition: opacity 120ms var(--ease-out-strong), transform 120ms var(--ease-out-strong), visibility 0s 120ms; }
.pop.on { opacity: 1; visibility: visible; pointer-events: auto; transform: none; transition: opacity 180ms var(--ease-out-strong), transform 180ms var(--ease-out-strong); }
.libpop { top: calc(100% + 8px); right: 0; width: 360px; transform-origin: top right; }
.opts { display: flex; flex-direction: column; gap: 2px; }
.optrow { display: flex; width: 100%; align-items: center; gap: 12px; border-radius: 12px; padding: 8px; transition: background-color 150ms var(--ease); }
.optrow:hover { background: color-mix(in srgb, var(--text-primary) 6%, transparent); }
.optrow .tile { width: 40px; height: 40px; border-radius: 10px; }
.optrow .libname { font-size: 13px; }
.optcheck { display: flex; width: 16px; justify-content: center; color: var(--text-primary); }
.popfoot { margin-top: 6px; border-top: 1px solid var(--border); padding-top: 6px; }
.popfoot .optrow { justify-content: space-between; padding: 8px 10px; font-size: 13px; line-height: 20px; font-weight: 500; color: var(--text-muted); }
.popfoot .optrow:hover { color: var(--text-primary); }
${
  phone
    ? `
/* Phone: labels sit above their controls, and Generate lives in a bottom bar
   so it is always in thumb reach with its reason beside it. */
.screen-generate .main { padding-bottom: 96px; }
.screen-generate .note { bottom: 96px; }
.frow { grid-template-columns: minmax(0, 1fr); gap: 8px; padding: 16px 20px; }
.flabel { flex-direction: row; align-items: baseline; justify-content: space-between; padding-top: 0; }
.fgroup { padding: 20px 20px 4px; }
.ffoot { display: none; }
.screen-generate .frow--auto { grid-template-columns: minmax(0, 1fr) auto; align-items: center; }
.bar { position: absolute; left: 0; right: 0; bottom: 0; z-index: 25; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 70%, transparent); -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px); }
.bar .status { font-size: 12px; line-height: 16px; }
.bar .cta { margin-left: auto; padding: 15px 26px; }
/* 44px touch targets: the controls keep the app's look, the hit area grows. */
.stepper { width: 100%; }
.stepbtn { width: 48px; }
.stepval input { padding: 12px 4px; }
.field { padding: 12px 14px; }
.screen-generate .btn2::after, .screen-generate .tbtn::after, .screen-generate .seg button::after { content: ""; position: absolute; inset: -8px -4px; }
.seg { display: flex; }
.seg button { position: relative; flex: 1; padding: 8px 12px; text-align: center; }
/* The library picker is a centred modal on the phone (Garreth, 2026-09-14), over the drawer's scrim.
   Centred, so it scales from its own middle rather than from the trigger. */
.libpop { top: 50%; left: 50%; right: auto; width: calc(100% - 32px); transform-origin: center; transform: translate(-50%, -50%) scale(0.97); }
.libpop.on { transform: translate(-50%, -50%); }
.catch.modal { background: var(--scrim); -webkit-backdrop-filter: var(--scrim-blur); backdrop-filter: var(--scrim-blur); animation: scrim-in 180ms var(--ease-out-strong); }
@keyframes scrim-in { from { opacity: 0; } }
.optrow { padding: 10px 8px; }
`
    : ""
}
.is-light .seg button[aria-checked="true"] { color: #ffffff; }
@media (prefers-reduced-motion: reduce) {
  .fixed, .seg button, .stepbtn, .screen-generate .asw, .screen-generate .asw i { transition: none; }
  .pop { transform: none; transition: opacity 120ms linear, visibility 0s 120ms; }
  .pop.on { transition: opacity 120ms linear; }
  ${phone ? ".libpop, .libpop.on { transform: translate(-50%, -50%); } .catch.modal { animation: none; }" : ""}
}
`;
}

/* ── Markup ────────────────────────────────────────────────────────────── */

const generateButton = `
            <button type="button" class="cta {{genBusyCls}}" disabled="{{genDisabled}}" onClick="{{generate}}">
              <sc-if value="{{busy}}" hint-placeholder-val="{{ false }}"><span class="spin on">${I.busy}</span>Starting</sc-if>
              <sc-if value="{{idle}}" hint-placeholder-val="{{ true }}">Generate</sc-if>
            </button>`;

/* The library picker. Desktop: hung under Change. Phone: a centred modal at the app's level,
   outside the scrolling column, so it centres on the screen. No per-library gap warnings (Garreth, 2026-09-14). */
const libPicker = `
                <div class="pop libpop {{libPopCls}}" id="libpop" role="listbox" aria-labelledby="lib-label" onKeyDown="{{popKey}}">
                  <div class="opts">
                    <sc-for list="{{libs}}" as="l" hint-placeholder-count="5">
                      <button type="button" class="optrow" role="option" aria-selected="{{l.selected}}" onClick="{{l.pick}}">
                        <sc-if value="{{l.hasImages}}" hint-placeholder-val="{{ true }}"><span class="tile {{l.imgCls}}" style="background-color: {{l.tint}}" aria-hidden="true"></span></sc-if>
                        <sc-if value="{{l.isEmpty}}" hint-placeholder-val="{{ false }}"><span class="tile tile--empty" aria-hidden="true">${I.tileImages}</span></sc-if>
                        <span class="libtext"><span class="libname" title="{{l.name}}">{{l.name}}</span><span class="libmeta tnum">{{l.count}}</span></span>
                        <span class="optcheck"><sc-if value="{{l.isSelected}}" hint-placeholder-val="{{ false }}">${I.check}</sc-if></span>
                      </button>
                    </sc-for>
                  </div>
                  <div class="popfoot">
                    <button type="button" class="optrow" onClick="{{openLibraries}}"><span>Image libraries</span>${I.caretRightSm}</button>
                  </div>
                </div>`;

function page(phone) {
  return `
      <main class="main">
        <div class="page">
          <div class="phead">
            <button type="button" class="upcrumb" onClick="{{backToTypes}}">${I.backSm}Carousel types</button>
            <div class="ptitle">
              <h1>{{genName}}</h1>
              <div class="cmeta">
                <span class="pill">{{genCharacter}}</span>
                <span class="pill tnum">{{genSlides}}</span>
              </div>
            </div>
          </div>

          <form class="fcard" onSubmit="{{submit}}">
            <div class="frow">
              <label class="flabel" for="count">How many</label>
              <div class="fctl">
                <div class="stepper">
                  <button type="button" class="stepbtn" aria-label="Decrease how many" disabled="{{decDisabled}}" onClick="{{dec}}">${I.minus}</button>
                  <div class="stepval"><input id="count" type="text" inputmode="numeric" value="{{count}}" onChange="{{typeCount}}" /></div>
                  <button type="button" class="stepbtn" aria-label="Increase how many" disabled="{{incDisabled}}" onClick="{{inc}}">${I.plus}</button>
                </div>
              </div>
            </div>

            <div class="frow">
              <span class="flabel" id="lib-label">Image library</span>
              <div class="fctl">
                <div class="lib">
                  <sc-if value="{{hasLib}}" hint-placeholder-val="{{ true }}">
                    <span class="tile {{lib.imgCls}}" style="background-color: {{lib.tint}}" aria-hidden="true"></span>
                    <span class="libtext"><span class="libname" title="{{lib.name}}">{{lib.name}}</span><span class="libmeta tnum">{{lib.meta}}</span></span>
                  </sc-if>
                  <sc-if value="{{noLib}}" hint-placeholder-val="{{ false }}">
                    <span class="tile tile--empty" aria-hidden="true">${I.tileImages}</span>
                    <span class="libtext"><span class="libname muted">No library</span></span>
                  </sc-if>
                  <span class="libact">
                    <sc-if value="{{showUndo}}" hint-placeholder-val="{{ false }}"><button type="button" class="tbtn" onClick="{{undoLib}}">Undo</button></sc-if>
                    <button type="button" class="btn2 js-libtrigger" aria-haspopup="listbox" aria-expanded="{{libExpanded}}" aria-controls="libpop" onClick="{{toggleLib}}">{{changeLabel}}</button>
                    ${phone ? "" : libPicker}
                  </span>
                </div>
                <sc-if value="{{hasLib}}" hint-placeholder-val="{{ true }}">
                  <div class="sets">
                    <sc-for list="{{lib.sets}}" as="g" hint-placeholder-count="4"><span class="pill tnum {{g.cls}}">{{g.name}} <b>{{g.count}}</b></span></sc-for>
                  </div>
                  <sc-if value="{{showAiGen}}" hint-placeholder-val="{{ false }}"><button type="button" class="btn2 libai" onClick="{{aiGen}}">${D2I.spark}Generate with AI</button></sc-if>
                </sc-if>
              </div>
            </div>

            <div class="frow">
              <span class="flabel">Direction</span>
              <div class="fctl">
                <div class="dir {{dirCls}}">
                  <div class="dirhead">
                    <span class="pill tnum">Version 4</span>
                    <span class="dirdate tnum">Sep 12</span>
                    <button type="button" class="tbtn" onClick="{{editDirection}}">Edit${I.caretRightSm}</button>
                  </div>
                  <p class="dirtext" id="dirtext">Open on a before-and-after people can picture in their own mirror. Keep every line under twelve words, warm and plain, never clinical. The after slide names one habit, never a product, and the caption ends on a question the viewer wants to answer.</p>
                  <button type="button" class="tbtn more" aria-expanded="{{dirExpanded}}" aria-controls="dirtext" onClick="{{toggleDir}}">{{dirToggle}}</button>
                </div>
              </div>
            </div>

            <div class="frow">
              <label class="flabel" for="note">Note<span class="opt">Optional</span></label>
              <div class="fctl">
                <div class="field"><input id="note" type="text" maxlength="140" placeholder="Lean into winter skin" value="{{noteVal}}" onChange="{{typeNote}}" /></div>
              </div>
            </div>

            <div class="fgroup">Template</div>
            <div class="frow">
              <span class="flabel" id="opening-label">Opening line</span>
              <div class="fctl">
                <div class="seg" role="radiogroup" aria-labelledby="opening-label">
                  <button type="button" role="radio" aria-checked="{{openFixed}}" onClick="{{pickFixed}}">Fixed</button>
                  <button type="button" role="radio" aria-checked="{{openWritten}}" onClick="{{pickWritten}}">Written</button>
                </div>
                <div class="fixed {{fixedCls}}"><div class="fixed-in"><div class="fixedline">Six months, one habit, no filters</div></div></div>
              </div>
            </div>

            <!-- D12: the batch runs through writing and rendering by itself; the finished batch still waits for Approve. -->
            <div class="frow frow--auto">
              <span class="flabel" id="auto-label">Auto mode</span>
              <div class="fctl">
                <button type="button" class="asw" role="switch" aria-checked="{{d2autoOn}}" aria-labelledby="auto-label" onClick="{{d2autoFlip}}"><i></i></button>
              </div>
            </div>

            <div class="ffoot">
              <span class="status {{statusCls}}" role="status" aria-live="polite">{{statusText}}</span>
              ${phone ? "" : generateButton}
            </div>
          </form>
        </div>
      </main>`;
}

/* The click-away layer, and on the phone the picker as a modal over everything. */
const appOverlay = (phone) => `
  <div class="catch {{catchCls}}" aria-hidden="true" onClick="{{closePops}}"></div>
  ${phone ? libPicker : ""}`;

/* The phone's bottom bar. */
const colOverlay = (phone) =>
  phone
    ? `<div class="bar">
      <span class="status {{statusCls}}" role="status" aria-live="polite">{{statusText}}</span>
      ${generateButton}
    </div>`
    : "";

/* ── Behaviour ─────────────────────────────────────────────────────────── */

/* Focus follows a popover the way a listbox should: into it on open, back
   to its trigger on close. Not on first mount, so the canvas never jumps. */
const didUpdate = `
    if (st.libOpen && !this.libWas) { var o = document.querySelector('.libpop [aria-selected="true"]') || document.querySelector(".libpop .optrow"); if (o) o.focus(); }
    if (!st.libOpen && this.libWas && st.returnFocus) { var t = document.querySelector(".js-libtrigger"); if (t) t.focus(); }
    this.libWas = !!st.libOpen;
    /* A review picture of the form's last row on the phone (D12). */
    if (st.d2toEnd && !this.d2ended) { this.d2ended = true; var c2 = document.querySelector(".col"); if (c2) c2.scrollTop = c2.scrollHeight; }`;

function vals(init) {
  return `
    var PHONE = ctx.PHONE;
    /* The carousel type it was opened for; Before & After when seen on its own. */
    var P = s.params || {};
    var NAME = P.name || "Before & After";
    var D2AUTO = s.d2auto != null ? !!s.d2auto : !!P.lastAuto;

    /* Sample content only — invented libraries, sets and counts. */
    var GROUPS = ["Cover", "Before", "After", "Portrait"];
    var LIBS = [
      { id: "window", name: "Soft Window Light", hue: "#c8a27a", g: [18, 41, 44, 23] },
      { id: "mirror", name: "Bathroom Mirror Mornings, Natural Light Series", hue: "#7aa0c8", g: [96, 402, 511, 275] },
      { id: "outdoor", name: "Outdoor Walks", hue: "#7ac8a0", g: [30, 90, 92, 0] },
      { id: "kitchen", name: "Kitchen Counter Shots", hue: "#b8b07a", g: [12, 46, 0, 0] },
      { id: "new", name: "New library", hue: "", g: [0, 0, 0, 0] }
    ];
    var OWN = ${JSON.stringify(init.libId)};
    var fmt = function (n) { return n.toLocaleString("en-US"); };
    var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
    var tint = function (hex) { return hex ? "color-mix(in srgb, var(--card-raised) 78%, " + hex + ")" : "var(--card-sunken)"; };
    var list = function (names) { return names.length < 2 ? names.join("") : names.slice(0, -1).join(", ") + " and " + names[names.length - 1]; };
    var emptyOf = function (l) { return GROUPS.filter(function (_, i) { return l.g[i] === 0; }); };
    var images = function (n) { return n === 1 ? "1 image" : fmt(n) + " images"; };

    var cur = LIBS.filter(function (l) { return l.id === s.libId; })[0] || null;
    var empty = cur ? emptyOf(cur) : [];
    var closeAll = function (focus) { self.setState({ libOpen: false, returnFocus: !!focus }); };

    var clamp = function (n) { return Math.min(50, Math.max(1, n)); };
    var ready = !!cur && empty.length === 0;

    var statusText = !cur ? "No image library" : empty.length ? "No images in " + list(empty) : "";

    return {
      genName: NAME,
      genCharacter: P.character || "Character 2",
      genSlides: P.slides || "7 slides",
      backToTypes: function () { ctx.open("types", null, "Back to Carousel types · D1"); },

      /* How many: pre-filled at 50 and stopping there as the person types (F1 step 3). */
      count: String(s.count),
      decDisabled: s.count <= 1,
      incDisabled: s.count >= 50,
      dec: function () { self.setState({ count: clamp(s.count - 1) }); },
      inc: function () { self.setState({ count: clamp(s.count + 1) }); },
      typeCount: function (e) { var raw = String(e.target.value).replace(/[^0-9]/g, ""); self.setState({ count: raw === "" ? 1 : clamp(Number(raw)) }); },

      /* Image library */
      hasLib: !!cur,
      noLib: !cur,
      lib: cur ? {
        name: cur.name,
        tint: tint(cur.hue),
        imgCls: cur.hue ? "has-img img-" + cur.id : "",
        meta: images(sum(cur.g)),
        sets: GROUPS.map(function (name, i) { return { name: name, count: fmt(cur.g[i]), cls: cur.g[i] === 0 ? "pill--danger" : "" }; })
      } : { name: "", tint: "", imgCls: "", meta: "", sets: [] },
      changeLabel: cur ? "Change" : "Choose",
      showUndo: !!OWN && s.libId !== OWN,
      undoLib: function () { self.setState({ libId: OWN, libOpen: false }); },
      libExpanded: s.libOpen ? "true" : "false",
      libPopCls: s.libOpen ? "on" : "",
      toggleLib: function () { self.setState({ libOpen: !s.libOpen, returnFocus: false }); },
      libs: LIBS.map(function (l) {
        var total = sum(l.g), on = l.id === s.libId;
        return {
          name: l.name, tint: tint(l.hue), count: images(total),
          hasImages: total > 0, isEmpty: total === 0,
          imgCls: l.hue ? "has-img img-" + l.id : "",
          selected: on ? "true" : "false", isSelected: on,
          pick: function () { self.setState({ libId: l.id, libOpen: false, returnFocus: true }); }
        };
      }),
      /* D8 is approved, so this opens it for real in the prototype (2026-09-16). */
      openLibraries: function () { closeAll(false); ctx.open("libraries", null, "Opens Image libraries · D8"); },
      showAiGen: !!cur && empty.length > 0,
      aiGen: function () { closeAll(false); self.note("Opens " + (cur ? cur.name : "the library") + "'s Generate images form for " + list(empty) + ", then back here · D8"); },
      popKey: function (e) { if (e.key === "Escape") { e.stopPropagation(); closeAll(true); } },
      catchCls: (s.libOpen ? "on" : "") + (PHONE && s.libOpen ? " modal" : ""),
      closePops: function () { closeAll(false); },

      /* Direction, read-only */
      dirCls: s.dirOpen ? "open" : "",
      dirExpanded: s.dirOpen ? "true" : "false",
      dirToggle: s.dirOpen ? "Less" : "More",
      toggleDir: function () { self.setState({ dirOpen: !s.dirOpen }); },
      editDirection: function () { ctx.open("type", { name: NAME, character: P.character || "Character 2", slides: P.slides || "7 slides", size: P.size || "4:5", tab: "direction" }, "Opens the Direction tab for " + NAME + " · D7"); },

      noteVal: s.noteVal,
      typeNote: function (e) { self.setState({ noteVal: e.target.value }); },

      /* Template choice: this sample type's opening line. No datestamp field (Garreth, 2026-09-14). */
      openFixed: s.opening === "fixed" ? "true" : "false",
      openWritten: s.opening === "written" ? "true" : "false",
      pickFixed: function () { self.setState({ opening: "fixed" }); },
      pickWritten: function () { self.setState({ opening: "written" }); },
      fixedCls: s.opening === "fixed" ? "on" : "",

      /* Generate */
      statusText: statusText,
      statusCls: cur && empty.length ? "danger" : "",
      /* The switch opens the way this type was last generated (Garreth, 2026-09-21); after that it is the person's. */
      d2autoOn: D2AUTO ? "true" : "false",
      d2autoFlip: function () { self.setState({ d2auto: !D2AUTO }); },
      genDisabled: !ready || s.busy,
      genBusyCls: s.busy ? "is-busy" : "",
      busy: s.busy,
      idle: !s.busy,
      generate: function () {
        if (!ready || s.busy) return;
        self.setState({ busy: true, libOpen: false });
        clearTimeout(self.busyTimer);
        self.busyTimer = setTimeout(function () {
          self.setState({ busy: false });
          ctx.open("batch", { name: NAME, character: P.character || "Character 2", slides: P.slides || "7 slides", size: P.size || "4:5", count: s.count, auto: D2AUTO ? "on" : "" }, "Opens the batch: " + s.count + " decks of " + NAME + (D2AUTO ? ", in Auto mode" : "") + " · D3");
        }, 900);
      },
      submit: function (e) { e.preventDefault(); }
    };`;
}

/**
 * D2 as a screen. `init` is the library the carousel type points at and
 * whether the picker starts open.
 */
export function generateScreen({ init = { libId: "window", libOpen: false } } = {}) {
  return {
    id: "generate",
    nav: "types",
    css,
    markup: page,
    appOverlay,
    colOverlay,
    state: {
      count: 50, libId: init.libId, libOpen: init.libOpen, returnFocus: false, dirOpen: false, noteVal: "",
      opening: "fixed", busy: false, d2auto: init.auto ? true : null, d2toEnd: !!init.toEnd,
    },
    /* Opened from another screen: no picker left open, nothing mid-start. */
    enter: { libOpen: false, busy: false, d2auto: null },
    vals: vals(init),
    didUpdate,
  };
}

/* ── Review artboards ──────────────────────────────────────────────────── */

function build(OUT) {
  fs.mkdirSync(OUT, { recursive: true });
  copyCovers(OUT);
  const BOARDS = [
    { file: "Main.dc.html", phone: false, init: { libId: "window", libOpen: false }, title: "D2 · Generate form · Desktop", x: 0, y: 0 },
    { file: "Phone.dc.html", phone: true, init: { libId: "window", libOpen: false }, title: "D2 · Generate form · Phone", x: 1540, y: 0 },
    { file: "PhonePicker.dc.html", phone: true, init: { libId: "window", libOpen: true }, title: "D2 · Library picker · Phone", x: 2010, y: 0 },
    { file: "Picker.dc.html", phone: false, init: { libId: "window", libOpen: true }, title: "D2 · Library picker · Desktop", x: 0, y: 1040 },
    { file: "EmptySets.dc.html", phone: false, init: { libId: "kitchen", libOpen: false }, title: "D2 · Library with empty sets · Desktop", x: 1540, y: 1040 },
    { file: "NoLibrary.dc.html", phone: false, init: { libId: null, libOpen: false }, title: "D2 · No library chosen · Desktop", x: 0, y: 2080 },
    /* Auto mode (D12, Garreth 2026-09-21): the form's last row, off as the form opens (every board above), on here. */
    { file: "AutoOn.dc.html", phone: false, init: { libId: "window", libOpen: false, auto: true }, title: "D2 · Auto mode on, the way it opens for a type last generated in Auto · Desktop", x: 1540, y: 2080 },
    { file: "PhoneAutoOn.dc.html", phone: true, init: { libId: "window", libOpen: false, auto: true, toEnd: true }, title: "D2 · Auto mode on, the form's last row · Phone", x: 3080, y: 2080 },
  ];
  const artboards = [];
  for (const light of [false, true]) {
    for (const b of BOARDS) {
      const file = light ? b.file.replace(".dc.html", "Light.dc.html") : b.file;
      fs.writeFileSync(path.join(OUT, file), artboard({ phone: b.phone, light, screens: [generateScreen({ init: b.init })], navMode: "note" }));
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
    "Clickable. Try typing 64 into How many (it stops at 50), Change on the library and pick Kitchen Counter Shots or New library, Undo, More on the direction, Fixed and Written, the Auto mode switch, and Generate.\n\nEscape or a click outside closes a picker.\n\nScreens not designed yet show a Prototype note naming their ticket.";
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
          { id: "d2-try", page: "dark", x: 2480, y: 0, w: 390, text: tryNote },
          { id: "d2-try-light", page: "light", x: 2480, y: 0, w: 390, text: tryNote },
        ],
        launch: { view: "canvas", page: "light" },
      },
      null,
      2,
    ),
  );
  console.log(`Wrote D2 artboards to ${OUT}`);
}

if (isMain(import.meta.url)) build(path.resolve(process.argv[2] ?? path.join(HERE, "out")));
