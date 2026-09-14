#!/usr/bin/env node
/*
 * D1 · Carousel types — the Carousel Generator's landing screen.
 *
 * Design step only (docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md, D1). Nothing
 * here is app code. The shell (menu, top bar, glow, both themes, phone drawer,
 * prototype note) comes from generator-kit.mjs; this file is the screen. All
 * content is made-up sample data, per the design-step rule.
 *
 * Run directly, it writes D1's review artboards and canvas.json:
 *   Main.dc.html           desktop 1440×900, populated          (Dark page)
 *   Phone.dc.html          phone 390×844, menu as a drawer      (Dark page)
 *   FirstRun.dc.html       desktop 1440×900, no carousel types  (Dark page)
 *   MainLight / PhoneLight / FirstRunLight .dc.html             (Light page)
 * Imported, `typesScreen()` is the screen prototype.build.mjs links to D2.
 *
 *   node docs/designs/carousel-generator/d1-carousel-types.build.mjs <out dir>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { I, artboard, isMain } from "./generator-kit.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/* ── Styles ────────────────────────────────────────────────────────────── */

function css(phone) {
  return `
/* ── D1 page ── */
.screen-types .phead { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 36px; }
/* In a card, the accent button takes the secondary button's exact box, so the
   one cyan Generate reads as the same control in a different tone, not a bigger one.
   The transparent border stands in for .btn2's 1px border: both are 30px tall. */
.cta--sm { padding: 6px 14px; border: 1px solid transparent; font-size: 12px; line-height: 16px; letter-spacing: 0; }
/* align-items: start, so opening one card's details does not stretch its row-mates. */
.grid { display: grid; grid-template-columns: repeat(${phone ? 1 : 3}, minmax(0, 1fr)); gap: 12px; align-items: start; }
.card { display: flex; flex-direction: column; min-width: 0; border-radius: 24px; padding: 20px; background: var(--card); border: 1px solid var(--border); box-shadow: var(--sh-card); }
.card.is-retired { background: var(--card-sunken); }
.cname { display: block; align-self: flex-start; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 16px; line-height: 24px; font-weight: 600; letter-spacing: -0.01em;
  color: var(--text-primary); text-decoration: underline; text-decoration-color: transparent; text-underline-offset: 4px; transition: text-decoration-color 150ms var(--ease); }
.cname:hover { text-decoration-color: var(--text-muted); }
.is-retired .cname { color: var(--text-muted); }
/* Character and slide count: neutral pills only (Garreth, 2026-09-14). */
.screen-types .cmeta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.pill--accent { color: var(--accent); }
/* View details sits between two thin rules, so it reads as its own band of the card. */
.cview { margin-top: 16px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.cview-btn { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 0; font-size: 13px; line-height: 20px; font-weight: 500; color: var(--text-muted);
  transition: color 150ms var(--ease); }
.cview-btn:hover { color: var(--text-primary); }
.cchev { display: flex; transition: transform 200ms var(--ease-out-strong); }
.card.open .cchev { transform: rotate(180deg); }
.cdetails { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 220ms var(--ease-out-strong); }
.card.open .cdetails { grid-template-rows: 1fr; }
.cd-in { min-height: 0; overflow: hidden; }
.card:not(.open) .cd-in { visibility: hidden; transition: visibility 0s 220ms; }
.stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding: 2px 0 14px; }
.sv { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; line-height: 20px; font-weight: 600; color: var(--text-primary); }
.sv.danger { color: var(--danger); }
.is-retired .sv { color: var(--text-muted); }
.sl { font-size: 11px; line-height: 1.25; color: var(--text-muted); }
.cfoot { display: flex; align-items: center; gap: 12px; min-height: 30px; margin-top: 16px; }
/* The button sits right whether or not a status sits left of it. On the button
   itself rather than as a child selector, since it renders inside a sc-if. */
.cfoot .cta, .cfoot .btn2 { margin-left: auto; }
.last { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; line-height: 16px; color: var(--text-muted); }

.retired { display: flex; flex-direction: column; gap: 12px; }
.rtoggle { display: inline-flex; align-items: center; gap: 8px; align-self: flex-start; border-radius: 999px; padding: 6px 12px 6px 8px; font-size: 14px; line-height: 20px; font-weight: 500; color: var(--text-muted);
  transition: color 150ms var(--ease), background-color 150ms var(--ease); }
.rtoggle:hover { background: var(--card); color: var(--text-primary); }
.chev { display: flex; transition: transform 200ms var(--ease-out-strong); }
.retired.open .chev { transform: rotate(90deg); }
.rbody { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 220ms var(--ease-out-strong); }
.retired.open .rbody { grid-template-rows: 1fr; }
.rinner { min-height: 0; overflow: hidden; }
.retired:not(.open) .rinner { visibility: hidden; transition: visibility 0s 220ms; }

.es { display: flex; min-height: 268px; flex-direction: column; align-items: center; justify-content: center; gap: 16px; border-radius: 24px; border: 1px solid var(--border); background: var(--card-sunken); padding: 44px 28px; text-align: center; }
.es .mark { color: var(--text-muted); opacity: 0.55; }
.es h4 { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; }
.es .es-sub { margin: -8px 0 0; font-size: 12px; line-height: 16px; color: var(--text-muted); }
.es--proto { border-style: dashed; }
@media (prefers-reduced-motion: reduce) {
  .rbody, .chev, .cchev, .cdetails { transition: none; }
}
`;
}

/* ── Markup ────────────────────────────────────────────────────────────── */

const typeCard = (varName, retired) => `
            <article class="card${retired ? " is-retired" : ""} {{${varName}.openCls}}">
              <button type="button" class="cname" title="{{${varName}.name}}" onClick="{{${varName}.openType}}">{{${varName}.name}}</button>
              <div class="cmeta">
                <span class="pill">{{${varName}.character}}</span>
                <span class="pill tnum">{{${varName}.slides}}</span>
              </div>
              <div class="cview">
                <button type="button" class="cview-btn" aria-expanded="{{${varName}.expanded}}" onClick="{{${varName}.toggle}}"><span>View details</span><span class="cchev">${I.caretDown}</span></button>
                <div class="cdetails">
                  <div class="cd-in">
                    <div class="stats">
                      <div><div class="sv tnum">{{${varName}.postsLeft}}</div><div class="sl">Posts left</div></div>
                      <div><div class="sv tnum {{${varName}.coverCls}}">{{${varName}.cover}}</div><div class="sl">Days of cover</div></div>
                      <div><div class="sv tnum">{{${varName}.median}}</div><div class="sl">Median views</div></div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="cfoot">
                <sc-if value="{{${varName}.showLast}}" hint-placeholder-val="{{ true }}"><span class="last tnum">{{${varName}.lastText}}</span></sc-if>
                <sc-if value="{{${varName}.hasPill}}" hint-placeholder-val="{{ false }}">
                  <span class="pill {{${varName}.pillCls}} tnum">{{${varName}.pill}}</span>
                </sc-if>
                ${
                  retired
                    ? ""
                    : `<sc-if value="{{${varName}.isAccent}}" hint-placeholder-val="{{ false }}"><button type="button" class="cta cta--sm" onClick="{{${varName}.generate}}">Generate</button></sc-if>
                <sc-if value="{{${varName}.isSecondary}}" hint-placeholder-val="{{ true }}"><button type="button" class="btn2" onClick="{{${varName}.generate}}">Generate</button></sc-if>
                <sc-if value="{{${varName}.isRunning}}" hint-placeholder-val="{{ false }}"><button type="button" class="btn2" onClick="{{${varName}.openBatch}}">Open running batch</button></sc-if>`
                }
              </div>
            </article>`;

// The empty-state mark from docs/design-system.html (State · Empty).
const emptyMark =
  '<svg width="62" height="50" viewBox="0 0 62 50" fill="none" aria-hidden="true"><rect x="0.75" y="11" width="9" height="28" rx="3" stroke="currentColor" stroke-width="1.5" opacity=".4"></rect><rect x="52.25" y="11" width="9" height="28" rx="3" stroke="currentColor" stroke-width="1.5" opacity=".4"></rect><rect x="16.75" y="1.75" width="28.5" height="46.5" rx="5" fill="var(--card-sunken)" stroke="currentColor" stroke-width="1.5"></rect></svg>';

function page() {
  return `
      <main class="main">
        <div class="page">
          <div class="phead">
            <h1>{{pageTitle}}</h1>
            <sc-if value="{{showHeaderAction}}" hint-placeholder-val="{{ true }}">
              <button type="button" class="btn2" onClick="{{newType}}">${I.plus}New carousel type</button>
            </sc-if>
          </div>

          <sc-if value="{{showTypes}}" hint-placeholder-val="{{ true }}">
            <div class="grid">
              <sc-for list="{{live}}" as="t" hint-placeholder-count="6">${typeCard("t", false)}
              </sc-for>
            </div>
            <section class="retired {{retiredCls}}">
              <button type="button" class="rtoggle" aria-expanded="{{retiredExpanded}}" aria-controls="retired-types" onClick="{{toggleRetired}}">
                <span class="chev">${I.caret}</span><span>Retired</span><span class="pill tnum">{{retiredCount}}</span>
              </button>
              <div class="rbody" id="retired-types">
                <div class="rinner">
                  <div class="grid">
                    <sc-for list="{{retired}}" as="r" hint-placeholder-count="2">${typeCard("r", true)}
                    </sc-for>
                  </div>
                </div>
              </div>
            </section>
          </sc-if>

          <sc-if value="{{showEmpty}}" hint-placeholder-val="{{ false }}">
            <div class="es">
              <div class="mark">${emptyMark}</div>
              <h4>No carousel types</h4>
              <button type="button" class="cta" onClick="{{newType}}">New carousel type</button>
            </div>
          </sc-if>

          <sc-if value="{{showProto}}" hint-placeholder-val="{{ false }}">
            <div class="es es--proto">
              <h4>{{pageTitle}}</h4>
              <p class="es-sub">{{protoTicket}}</p>
            </div>
          </sc-if>
        </div>
      </main>`;
}

/* ── Behaviour ─────────────────────────────────────────────────────────── */

function vals(firstRun) {
  return `
    var FIRST_RUN = ${firstRun};
    var compact = function (v) { return v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? (v / 1e3).toFixed(1) + "k" : String(v); };
    var days = function (n) { return n === 1 ? "1 day" : n + " days"; };

    /* Sample content only — invented names and numbers, per the design step. */
    var TYPES = [
      { id: "five-things", slides: 7, name: "Five Things I Stopped Doing After Thirty", character: "Character 3", posts: 0, cover: 0, median: 1240000, last: "Aug 29", status: "live" },
      { id: "morning", slides: 6, name: "Morning Routine", character: "Character 2", posts: 2, cover: 1, median: 18200, last: "Sep 8", status: "live" },
      { id: "myth", slides: 8, name: "Myth vs Fact", character: "Character 3", posts: 5, cover: 2, median: 24300, last: "Sep 12", status: "live", running: "Writing 7 of 20" },
      { id: "before-after", slides: 7, name: "Before & After", character: "Character 2", posts: 14, cover: 6, median: 31700, last: "Sep 11", status: "live" },
      { id: "day-life", slides: 10, name: "Day in the Life", character: "Character 4", posts: 22, cover: 11, median: 9800, last: "Sep 13", status: "live" },
      { id: "quiet-luxury", slides: 5, name: "Quiet Luxury Picks", character: "Character 4", status: "unwired" },
      { id: "weekly-wins", slides: 6, name: "Weekly Wins", character: "Character 2", posts: 0, cover: 0, median: 12400, last: "Jul 2", status: "retired" },
      { id: "ama", slides: 4, name: "Ask Me Anything", character: "Character 3", posts: 0, cover: 0, median: 6100, last: "Jun 18", status: "retired" }
    ];

    var wired = TYPES.filter(function (t) { return t.status === "live"; }).sort(function (a, b) { return a.cover - b.cover; });
    var unwired = TYPES.filter(function (t) { return t.status === "unwired"; });

    var view = function (t) {
      var isLive = t.status === "live";
      var open = !!s.openCards[t.id];
      return {
        name: t.name,
        character: t.character,
        slides: t.slides + " slides",
        /* Details start folded behind View details (Garreth, 2026-09-14). */
        openCls: open ? "open" : "",
        expanded: open ? "true" : "false",
        toggle: function () {
          var next = Object.assign({}, s.openCards);
          next[t.id] = !open;
          self.setState({ openCards: next });
        },
        postsLeft: isLive || t.status === "retired" ? String(t.posts) : "—",
        cover: isLive ? days(t.cover) : "—",
        coverCls: isLive && t.cover <= 1 ? "danger" : "",
        median: t.median != null ? compact(t.median) : "—",
        /* Opposite Generate: the last batch date, or the status in its place when there is one (Garreth, 2026-09-14). */
        showLast: !(t.running || t.status === "unwired" || t.status === "retired"),
        lastText: t.last ? "Last batch " + t.last : "No batches yet",
        hasPill: !!t.running || t.status === "unwired" || t.status === "retired",
        pill: t.running ? t.running : t.status === "unwired" ? "Not wired" : "Retired",
        pillCls: t.running ? "pill--accent" : "",
        /* Every Generate is the same accent button (Garreth, 2026-09-14). */
        isAccent: isLive && !t.running,
        isSecondary: false,
        isRunning: isLive && !!t.running,
        openType: function () { self.note("Opens the page for " + t.name + " · D7"); },
        generate: function () { ctx.open("generate", { name: t.name, character: t.character, slides: t.slides + " slides" }, "Opens the Generate form for " + t.name + " · D2"); },
        openBatch: function () { ctx.open("batch", { name: t.name, character: t.character, slides: t.slides + " slides", count: 20, writtenUpTo: 7 }, "Opens the running batch · D3"); }
      };
    };

    var retired = TYPES.filter(function (t) { return t.status === "retired"; });
    var onTypes = s.active === "types";

    return {
      pageTitle: ctx.current[1],
      protoTicket: "Designed in " + ctx.current[2],
      showTypes: onTypes && !FIRST_RUN,
      showEmpty: onTypes && FIRST_RUN,
      showProto: !onTypes,
      showHeaderAction: onTypes && !FIRST_RUN,

      live: wired.concat(unwired).map(view),
      retired: retired.map(view),
      retiredCount: String(retired.length),
      retiredCls: s.retiredOpen ? "open" : "",
      retiredExpanded: s.retiredOpen ? "true" : "false",
      toggleRetired: function () { self.setState({ retiredOpen: !s.retiredOpen }); },
      newType: function () { self.setState({ drawer: false }); self.note("Opens the Studio to create a carousel type · D6"); }
    };`;
}

/** D1 as a screen. `firstRun` shows the screen with no carousel types at all. */
export function typesScreen({ firstRun = false } = {}) {
  return {
    id: "types",
    nav: "types",
    css,
    markup: page,
    state: { retiredOpen: false, openCards: {} },
    vals: vals(firstRun),
  };
}

/* ── Review artboards ──────────────────────────────────────────────────── */

function build(OUT) {
  fs.mkdirSync(OUT, { recursive: true });
  const BOARDS = [
    { file: "Main.dc.html", phone: false, firstRun: false, title: "D1 · Carousel types · Desktop", x: 0, y: 0 },
    { file: "Phone.dc.html", phone: true, firstRun: false, title: "D1 · Carousel types · Phone", x: 1540, y: 0 },
    { file: "FirstRun.dc.html", phone: false, firstRun: true, title: "D1 · First run · Desktop", x: 0, y: 1040 },
  ];
  const artboards = [];
  for (const light of [false, true]) {
    for (const b of BOARDS) {
      const file = light ? b.file.replace(".dc.html", "Light.dc.html") : b.file;
      fs.writeFileSync(path.join(OUT, file), artboard({ phone: b.phone, light, screens: [typesScreen({ firstRun: b.firstRun })], navMode: "page" }));
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
    "Clickable. Try the menu (the highlight glides), the collapse button beside the logo, View details on a card, Retired, refresh, the Dark mode switch, a type's name, and Generate, Open running batch or New carousel type.\n\nScreens not designed yet show a Prototype note naming their ticket.\n\nOn the phone, the menu button opens the drawer.";
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
          { id: "d1-try", page: "dark", x: 1540, y: 940, w: 390, text: tryNote },
          { id: "d1-try-light", page: "light", x: 1540, y: 940, w: 390, text: tryNote },
        ],
        launch: { view: "canvas", page: "light" },
      },
      null,
      2,
    ),
  );
  console.log(`Wrote D1 artboards to ${OUT}`);
}

if (isMain(import.meta.url)) build(path.resolve(process.argv[2] ?? path.join(HERE, "out")));
