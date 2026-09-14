#!/usr/bin/env node
/*
 * D1 · Carousel types — the prototype artboards for the Claude Design canvas.
 *
 * Design step only (docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md, D1). Nothing
 * here is app code. It writes three clickable artboards plus the canvas layout:
 *
 *   Main.dc.html           desktop 1440×900, populated          (Dark page)
 *   Phone.dc.html          phone 390×844, menu as a drawer      (Dark page)
 *   FirstRun.dc.html       desktop 1440×900, no carousel types  (Dark page)
 *   MainLight / PhoneLight / FirstRunLight .dc.html             (Light page)
 *   canvas.json
 *
 * Every visual value is read from the app rather than retyped: the font file,
 * the logo, the logo mark and the icons (rendered from the same Phosphor
 * package at the same weights the app uses). Colours and spacing are copied
 * from src/app/globals.css and src/components/shell/*. All content is made-up
 * sample data, per the design-step rule.
 *
 *   node docs/designs/carousel-generator/d1-carousel-types.build.mjs <out dir>
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../../..");
const OUT = path.resolve(process.argv[2] ?? path.join(HERE, "out"));
const require = createRequire(path.join(REPO, "package.json"));

const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ssrDir = path.join(REPO, "node_modules/@phosphor-icons/react/dist/ssr");
const ssrEntry = fs.readdirSync(ssrDir).find((f) => /^index.*\.(m?js)$/.test(f) && !f.includes("cjs"));
const Ph = await import(pathToFileURL(path.join(ssrDir, ssrEntry)).href);

/** The HTML parser the canvas uses wants every non-void element closed. */
const closeTags = (s) =>
  s.replace(/<(path|rect|circle|polygon|polyline|line|ellipse)(\s[^<>]*?)?\s*\/>/g, "<$1$2></$1>");

/** Same component, same weight, as src/components/ui/icons.tsx. */
function icon(name, size = 16, weight = "fill") {
  const C = Ph[name];
  if (!C) throw new Error(`No Phosphor icon named ${name}`);
  return closeTags(renderToStaticMarkup(React.createElement(C, { size, weight, "aria-hidden": true })));
}

const I = {
  house: icon("House"),
  // Every back button is the outline "<": icons.tsx's ChevronLeft (CaretLeft, bold) (Garreth, 2026-09-14).
  arrowLeft: icon("CaretLeft", 16, "bold"),
  cards: icon("Cards"),
  history: icon("ClockCounterClockwise"),
  images: icon("Images"),
  studio: icon("PaintBrushBroad"),
  trends: icon("TrendUp"),
  gear: icon("Gear"),
  signOut: icon("SignOut"),
  moon: icon("Moon"),
  bell: icon("Bell"),
  refresh: icon("ArrowsClockwise"),
  menu: icon("List", 16, "bold"),
  x: icon("X", 18, "regular"),
  plus: icon("Plus", 12, "bold"),
  caret: icon("CaretRight", 14, "bold"),
  caretDown: icon("CaretDown", 14, "bold"),
  sun: icon("Sun"),
};

// src/components/ui/sidebar-toggle-icon.tsx, verbatim.
const sidebarToggle =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="4" stroke="currentColor" stroke-width="1.6"></rect><path d="M7 4h1.5a0 0 0 0 1 0 0v16a0 0 0 0 1 0 0H7a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Z" fill="currentColor"></path></svg>';

const logoRaw = fs.readFileSync(path.join(REPO, "public/logo-white.svg"), "utf8");
const logo = closeTags(
  `<svg viewBox="${logoRaw.match(/viewBox="([^"]+)"/)[1]}" width="102" height="36" fill="currentColor" aria-hidden="true">` +
    logoRaw
      .replace(/^[\s\S]*?<svg[^>]*>/, "")
      .replace(/<\/svg>\s*$/, "")
      .replace(/<defs>[\s\S]*?<\/defs>/, "")
      .replace(/\s(class|id|data-name)="[^"]*"/g, "")
      .replace(/\s*\n\s*/g, " ")
      .trim() +
    "</svg>",
);

const markRaw = fs.readFileSync(path.join(REPO, "src/components/ui/peptide-mark.tsx"), "utf8");
const mark =
  `<svg viewBox="${markRaw.match(/viewBox="([^"]+)"/)[1]}" width="32" height="32" fill="currentColor" aria-hidden="true">` +
  [...markRaw.matchAll(/\sd="([^"]+)"/g)].map((m) => `<path d="${m[1]}"></path>`).join("") +
  "</svg>";

const font = fs.readFileSync(path.join(REPO, "src/app/fonts/GeneralSans-Variable.woff2")).toString("base64");

/* ── Styles ────────────────────────────────────────────────────────────── */

function css(phone) {
  return `
@font-face { font-family: "General Sans"; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 200 700; font-style: normal; font-display: swap; }
:root {
  color-scheme: dark;
  --bg: #0b0b0c; --card: #111113; --card-sunken: #0e0e0f; --card-raised: #1a1a1b;
  --border: #242426; --text-primary: #f4f4f5; --text-muted: #8a8a92;
  --overlay-veil: rgba(22, 22, 26, 0.6); --overlay-blur: blur(14px) saturate(1.6);
  --overlay-rim: inset 1px 1px 0 rgba(255,255,255,0.11), inset 2px 2px 7px rgba(255,255,255,0.035), inset -1px -1px 0 rgba(255,255,255,0.03), inset -2px -2px 9px rgba(0,0,0,0.28), inset 0 0 26px rgba(255,255,255,0.025), 0 16px 40px rgba(0,0,0,0.45);
  --scrim: rgba(6, 6, 7, 0.6); --scrim-blur: blur(2px);
  --glow-a: rgba(217, 217, 217, 0.07); --glow-b: rgba(217, 217, 217, 0.05); --glow-blur: 131px;
  --glow-rail: linear-gradient(180deg, rgba(255,255,255,0.12), transparent 46%);
  --glow-rail-bottom: radial-gradient(78% 30% at 50% 78%, rgba(217,217,217,0.045), transparent 72%);
  --glass: rgba(255,255,255,0.045); --glass-border: rgba(255,255,255,0.08);
  --glass-highlight: inset 0 1px 0 rgba(255,255,255,0.09); --glass-blur: blur(16px) saturate(1.15);
  --accent: #22d3ee; --accent-deep: #0e9bb5; --accent-soft: rgba(34, 211, 238, 0.12);
  --danger: #f87171; --pill-bg: #262627;
  --sh-card: 0 1px 2px rgba(0,0,0,0.4);
  --sb-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.25);
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1);
}
/* Light mode: the same token names at globals.css's light values. Flat by the
   app's own decision (2026-09-07): no glow, no blur, no shadows. Scoped to .app
   so the prototype's theme switch can flip it. */
.app.is-light {
  color-scheme: light;
  --bg: #eef0f2; --card: #f7f7f8; --card-sunken: #f2f2f3; --card-raised: #eeeef0;
  --border: #e4e4e6; --text-primary: #1b1d21; --text-muted: #515c6b;
  --overlay-veil: var(--card); --overlay-blur: none; --overlay-rim: none;
  --scrim: rgba(27, 29, 33, 0.32); --scrim-blur: none;
  --glow-a: transparent; --glow-b: transparent; --glow-blur: 0px; --glow-rail: none; --glow-rail-bottom: none;
  --glass: var(--card); --glass-border: var(--border); --glass-highlight: 0 0 #0000; --glass-blur: none;
  --accent: #0e7490; --accent-deep: #155e75; --accent-soft: rgba(14, 116, 144, 0.12);
  --danger: #b91c1c; --pill-bg: #e4e8ed;
  --sh-card: none; --sb-shadow: 0 0 #0000;
}
* { box-sizing: border-box; scrollbar-width: none; }
*::-webkit-scrollbar { display: none; }
html, body { margin: 0; background: var(--bg); color: var(--text-primary); }
body { font-family: "General Sans", ui-sans-serif, system-ui, sans-serif; font-size: 14px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; margin: 0; cursor: pointer; text-align: left; }
a { color: var(--accent); } a:hover { color: var(--text-primary); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
svg { display: block; flex-shrink: 0; }
.tnum { font-variant-numeric: tabular-nums; }
h1 { margin: 0; font-size: 20px; line-height: 28px; font-weight: 600; letter-spacing: -0.02em; }

/* Shell */
/* Colour set here, not only on body: body sits outside the theme scope, so text that
   inherits would stay the dark theme's near-white on the light page. */
.app { position: relative; display: flex; overflow: hidden; background: var(--bg); color: var(--text-primary); width: ${phone ? 390 : 1440}px; height: ${phone ? 844 : 900}px; }
.rail { display: flex; flex-direction: column; flex-shrink: 0; width: 240px; height: 100%; padding: 20px 12px; border-right: 1px solid var(--border);
  background-image: var(--glow-rail), var(--glow-rail-bottom); background-repeat: no-repeat; background-size: 100% 420px, 100% 100%; background-position: top, bottom;
  transition: width 150ms var(--ease); }
.rail--c { width: 64px; padding: 20px 8px; }
.brand { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 12px; }
.rail--c .brand { flex-direction: column; padding: 0; }
.logo { display: flex; align-items: center; color: var(--text-primary); border-radius: 8px; }
.logo-mark { display: none; }
.rail--c .logo-full { display: none; }
.rail--c .logo-mark { display: flex; }
.icon-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; flex-shrink: 0; border-radius: 16px; color: var(--text-muted); transition: color 150ms var(--ease), background-color 150ms var(--ease); }
.icon-btn:hover { background: var(--card); color: var(--text-primary); }
.brand .icon-btn { margin-right: -11px; }
.rail--c .brand .icon-btn { margin-right: 0; }
.nav { margin-top: 12px; display: flex; flex: 1; min-height: 0; flex-direction: column; overflow-y: auto; }
.back { margin-top: 12px; }
.navlist { position: relative; display: flex; flex-direction: column; }
.navpill { position: absolute; left: 0; right: 0; top: 0; border-radius: 16px; opacity: 0; pointer-events: none;
  background: var(--glass); border: 1px solid var(--glass-border); box-shadow: var(--glass-highlight); -webkit-backdrop-filter: var(--glass-blur); backdrop-filter: var(--glass-blur);
  transition: transform 300ms cubic-bezier(0, 0, 0.2, 1), height 300ms cubic-bezier(0, 0, 0.2, 1), opacity 300ms cubic-bezier(0, 0, 0.2, 1); }
.glabel { padding: 24px 12px 8px; font-size: 11px; line-height: 16.5px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-muted); }
.rail--c .glabel { height: 16px; padding: 16px 0 0; font-size: 0; line-height: 0; }
.group { display: flex; flex-direction: column; gap: 2px; }
.navrow { position: relative; display: flex; align-items: center; gap: 10px; width: 100%; border-radius: 16px; padding: 6px 8px; font-size: 14px; line-height: 20px; color: var(--text-muted);
  transition: color 200ms var(--ease), background-color 200ms var(--ease); }
.navrow:hover { background: var(--card); color: var(--text-primary); }
.navrow.is-active { font-weight: 500; color: var(--text-primary); }
.navrow.is-active:hover { background: transparent; }
.nbadge { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex-shrink: 0; border-radius: 10px; transition: background-color 200ms var(--ease), color 200ms var(--ease); }
.navrow.is-active .nbadge { background: var(--text-primary); color: var(--bg); }
.rail--c .navrow { justify-content: center; padding: 6px 0; }
.rail--c .nlabel { display: none; }
.foot { margin-top: auto; display: flex; flex-direction: column; gap: 2px; border-top: 1px solid var(--border); padding-top: 12px; }
.theme { display: flex; align-items: center; justify-content: space-between; border-radius: 16px; padding: 6px 8px; font-size: 14px; line-height: 20px; color: var(--text-muted); }
.theme-l { display: flex; align-items: center; gap: 10px; }
.switch { position: relative; width: 36px; height: 20px; flex-shrink: 0; border-radius: 999px; background: var(--card-raised); transition: background-color 150ms var(--ease); }
.knob { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 999px; background: var(--text-primary); transition: left 150ms var(--ease), background-color 150ms var(--ease); }
.theme-c { display: none; width: 40px; height: 40px; align-self: center; }
.rail--c .theme { display: none; }
.rail--c .theme-c { display: flex; }

.colwrap { position: relative; flex: 1; min-width: 0; height: 100%; }
.col { position: relative; display: flex; flex-direction: column; height: 100%; overflow-y: auto; }
.glow { position: absolute; top: 0; left: 0; right: 0; height: ${phone ? 844 : 900}px; overflow: hidden; pointer-events: none; z-index: 60; }
.glow span { position: absolute; display: block; border-radius: 50%; filter: blur(var(--glow-blur)); }
.top { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: ${phone ? 12 : 16}px; border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 40%, transparent); -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px); padding: 12px ${phone ? 16 : 24}px; }
.crumb { display: flex; min-width: 0; flex-shrink: 1; align-items: baseline; gap: 6px; font-size: 14px; line-height: 20px; }
.crumb .m { color: var(--text-muted); }
.crumb .s { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.top-r { display: flex; flex: 1; flex-shrink: 0; align-items: center; justify-content: flex-end; gap: 12px; }
.greet { font-size: 14px; line-height: 20px; font-weight: 600; white-space: nowrap; }
.round { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex-shrink: 0; border-radius: 999px; border: 1px solid var(--border); background: var(--card); color: var(--text-muted); transition: color 150ms var(--ease); }
.round:hover { color: var(--text-primary); }
.avatar { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex-shrink: 0; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-size: 12px; font-weight: 600; }
.spin { display: flex; }
.spin.on { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.main { width: 100%; flex: 1; padding: 24px; }

/* Page */
.page { display: flex; flex-direction: column; gap: 24px; }
.phead { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 36px; }
.btn2 { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; border-radius: 999px; border: 1px solid var(--border); background: var(--card-raised); padding: 6px 14px;
  font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-muted); white-space: nowrap; transition: color 150ms var(--ease), transform 160ms var(--ease-out-strong); }
.btn2:hover { color: var(--text-primary); }
.btn2:active { transform: scale(0.97); }
.cta { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 999px; padding: 10px 22px;
  font-size: 13.6px; line-height: 1; font-weight: 500; letter-spacing: 0.01em; white-space: nowrap; color: var(--bg); background: var(--accent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-deep) 45%, transparent), var(--sb-shadow);
  transition: transform 150ms var(--ease), box-shadow 200ms var(--ease); }
.cta:hover { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-deep) 45%, transparent), inset 1px 1px 0 rgba(255,255,255,0.55), var(--sb-shadow); }
.cta:active { transform: scale(0.97); }
.cta:focus-visible { outline-offset: 3px; }
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
.cmeta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.pill { display: inline-flex; align-items: center; flex-shrink: 0; border-radius: 999px; padding: 2px 10px; font-size: 12px; line-height: 16px; font-weight: 500; white-space: nowrap; background: var(--pill-bg); color: var(--text-muted); }
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

/* Prototype notes — not product UI. Names the ticket a click leads to. */
.note { position: absolute; left: 50%; bottom: 24px; z-index: 70; display: flex; align-items: center; gap: 10px; max-width: calc(100% - 32px); border-radius: 999px; padding: 8px 16px;
  font-size: 13px; line-height: 18px; color: var(--text-primary); background: var(--overlay-veil); box-shadow: var(--overlay-rim); -webkit-backdrop-filter: var(--overlay-blur); backdrop-filter: var(--overlay-blur);
  opacity: 0; transform: translate(-50%, 8px); pointer-events: none; white-space: nowrap;
  transition: opacity 150ms var(--ease-out-strong), transform 150ms var(--ease-out-strong); }
.note.on { opacity: 1; transform: translate(-50%, 0); transition-duration: 200ms; }
.note b { font-size: 11px; line-height: 16px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); }
.note span { overflow: hidden; text-overflow: ellipsis; }
${
  phone
    ? `
.rail { position: absolute; top: 0; left: 0; z-index: 50; background-color: var(--bg); transform: translateX(-100%); transition: transform 280ms cubic-bezier(0.32, 0.72, 0, 1); }
.rail.open { transform: none; }
.scrim { position: absolute; inset: 0; z-index: 40; background: var(--scrim); -webkit-backdrop-filter: var(--scrim-blur); backdrop-filter: var(--scrim-blur); opacity: 0; pointer-events: none; transition: opacity 220ms var(--ease-out-strong); }
.scrim.on { opacity: 1; pointer-events: auto; }
`
    : ""
}
/* Light-mode specifics the tokens do not cover, each copied from the app:
   the CTA's white label (components.css), the switch's on state
   (theme-toggle.tsx), and a border on the note, since the flat veil has no rim. */
.is-light .cta { color: #ffffff; }
.is-light .switch { background: var(--accent); }
.is-light .knob { left: 18px; background: var(--card); }
.is-light .note { border: 1px solid var(--border); }
.moon, .sun { display: flex; }
.sun { display: none; }
.is-light .sun { display: flex; }
.is-light .moon { display: none; }
@media (prefers-reduced-motion: reduce) {
  .rail, .navpill, .rbody, .chev, .cchev, .cdetails, .btn2, .cta { transition: none; }
  .note { transform: translate(-50%, 0); transition: opacity 150ms linear; }
  .spin.on { animation: none; }
}
`;
}

/* ── Markup ────────────────────────────────────────────────────────────── */

const NAV = [
  ["types", "Carousel types", I.cards],
  ["history", "History", I.history],
  ["libraries", "Image libraries", I.images],
  ["studio", "Studio", I.studio],
  ["trends", "Trends", I.trends],
];

function sidebar(phone) {
  const rows = NAV.map(
    ([id, label, ic]) =>
      `<button type="button" class="navrow {{navCls.${id}}}" aria-current="{{navCurrent.${id}}}" title="{{navTitle.${id}}}" onClick="{{go.${id}}}"><span class="nbadge">${ic}</span><span class="nlabel">${label}</span></button>`,
  ).join("\n        ");
  const brandAction = phone
    ? `<button type="button" class="icon-btn" aria-label="Close navigation" onClick="{{closeDrawer}}">${I.x}</button>`
    : `<button type="button" class="icon-btn" aria-label="{{toggleLabel}}" title="{{toggleLabel}}" onClick="{{toggleCollapse}}">${sidebarToggle}</button>`;
  return `
  <aside class="rail {{railCls}}" aria-label="Carousel Generator">
    <div class="brand">
      <button type="button" class="logo" aria-label="Peptide Miracles" onClick="{{home}}"><span class="logo-full">${logo}</span><span class="logo-mark">${mark}</span></button>
      ${brandAction}
    </div>
    <nav class="nav">
      <div class="back">
        <button type="button" class="navrow" title="{{backTitle}}" onClick="{{back}}"><span class="nbadge">${I.arrowLeft}</span><span class="nlabel">Dashboard</span></button>
      </div>
      <div class="navlist">
        <span class="navpill" aria-hidden="true"></span>
        <div class="glabel"><span class="nlabel">Carousel Generator</span></div>
        <div class="group">
        ${rows}
        </div>
      </div>
      <div class="foot">
        <div class="theme">
          <span class="theme-l"><span class="nbadge"><span class="moon">${I.moon}</span><span class="sun">${I.sun}</span></span>{{themeLabel}}</span>
          <button type="button" class="switch" role="switch" aria-checked="{{themeChecked}}" aria-label="Toggle light / dark mode" onClick="{{theme}}"><span class="knob"></span></button>
        </div>
        <button type="button" class="icon-btn theme-c" title="{{themeLabel}}" aria-label="{{themeLabel}}" onClick="{{theme}}"><span class="moon">${I.moon}</span><span class="sun">${I.sun}</span></button>
        <button type="button" class="navrow" title="{{settingsTitle}}" onClick="{{settings}}"><span class="nbadge">${I.gear}</span><span class="nlabel">Settings</span></button>
        <button type="button" class="navrow" title="{{logoutTitle}}" onClick="{{logout}}"><span class="nbadge">${I.signOut}</span><span class="nlabel">Logout</span></button>
      </div>
    </nav>
  </aside>`;
}

function topbar(phone) {
  return `
      <header class="top">
        ${phone ? `<button type="button" class="round" aria-label="Open navigation" aria-expanded="{{drawerExpanded}}" onClick="{{openDrawer}}">${I.menu}</button>` : ""}
        <div class="crumb">
          ${phone ? "" : `<span class="m">Peptide Miracles</span><span class="m">/</span>`}
          <span class="s">Carousel Generator</span>
        </div>
        <div class="top-r">
          ${phone ? "" : `<span class="greet">Good afternoon, Alex</span>`}
          <button type="button" class="round" title="Refresh data" aria-label="Refresh data" onClick="{{refresh}}"><span class="spin {{spinCls}}">${I.refresh}</span></button>
          <button type="button" class="round" title="Notifications" aria-label="Notifications" onClick="{{bell}}">${I.bell}</button>
          <span class="avatar" title="alex@example.com">AL</span>
        </div>
      </header>`;
}

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

function logic({ phone, firstRun, light }) {
  return `
class Component extends DCLogic {
  componentDidMount() { this.placePill(); }
  componentDidUpdate() { this.placePill(); }
  componentWillUnmount() { clearTimeout(this.noteTimer); clearTimeout(this.spinTimer); }

  /* Glide the active highlight between rows, measured from the DOM the way
     src/components/shell/sidebar.tsx does it: no transition on first placement. */
  placePill() {
    var pill = document.querySelector(".navpill");
    var list = document.querySelector(".navlist");
    if (!pill || !list) return;
    var row = list.querySelector(".navrow.is-active");
    if (!row) { pill.style.opacity = "0"; return; }
    if (pill.style.opacity !== "1") pill.style.transition = "none";
    pill.style.opacity = "1";
    pill.style.height = row.offsetHeight + "px";
    pill.style.transform = "translateY(" + row.offsetTop + "px)";
    if (pill.style.transition === "none") { void pill.offsetHeight; pill.style.transition = ""; }
  }

  note(text) {
    clearTimeout(this.noteTimer);
    this.setState({ note: text, noteOn: true });
    var self = this;
    this.noteTimer = setTimeout(function () { self.setState({ noteOn: false }); }, 2400);
  }

  renderVals() {
    var PHONE = ${phone};
    var FIRST_RUN = ${firstRun};
    var LIGHT = ${light};
    var self = this;
    var s = Object.assign({ active: "types", collapsed: false, retiredOpen: false, note: "", noteOn: false, spinning: false, drawer: false, openCards: {}, light: LIGHT }, this.state || {});

    var NAV = [
      ["types", "Carousel types", ""],
      ["history", "History", "Designed in D9"],
      ["libraries", "Image libraries", "Designed in D8"],
      ["studio", "Studio", "Designed in D6"],
      ["trends", "Trends", "Designed in D10"]
    ];
    var navCls = {}, navCurrent = {}, navTitle = {}, go = {};
    var titleWhenCollapsed = function (label) { return s.collapsed && !PHONE ? label : ""; };
    NAV.forEach(function (n) {
      var on = s.active === n[0];
      navCls[n[0]] = on ? "is-active" : "";
      navCurrent[n[0]] = on ? "page" : "false";
      navTitle[n[0]] = titleWhenCollapsed(n[1]);
      go[n[0]] = function () { self.setState({ active: n[0], drawer: false }); };
    });
    var current = NAV.filter(function (n) { return n[0] === s.active; })[0];

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
        generate: function () { self.note("Opens the Generate form for " + t.name + " · D2"); },
        openBatch: function () { self.note("Opens the running batch · D3"); }
      };
    };

    var retired = TYPES.filter(function (t) { return t.status === "retired"; });
    var onTypes = s.active === "types";

    return {
      railCls: (s.collapsed && !PHONE ? "rail--c" : "") + (PHONE && s.drawer ? " open" : ""),
      themeCls: s.light ? "is-light" : "",
      themeLabel: s.light ? "Light mode" : "Dark mode",
      themeChecked: s.light ? "true" : "false",
      scrimCls: s.drawer ? "on" : "",
      drawerExpanded: s.drawer ? "true" : "false",
      navCls: navCls, navCurrent: navCurrent, navTitle: navTitle, go: go,
      toggleLabel: s.collapsed ? "Expand sidebar" : "Collapse sidebar",
      backTitle: titleWhenCollapsed("Dashboard"),
      settingsTitle: titleWhenCollapsed("Settings"),
      logoutTitle: titleWhenCollapsed("Logout"),

      pageTitle: current[1],
      protoTicket: current[2],
      showTypes: onTypes && !FIRST_RUN,
      showEmpty: onTypes && FIRST_RUN,
      showProto: !onTypes,
      showHeaderAction: onTypes && !FIRST_RUN,

      live: wired.concat(unwired).map(view),
      retired: retired.map(view),
      retiredCount: String(retired.length),
      retiredCls: s.retiredOpen ? "open" : "",
      retiredExpanded: s.retiredOpen ? "true" : "false",

      spinCls: s.spinning ? "on" : "",
      noteCls: s.noteOn ? "on" : "",
      noteText: s.note,

      toggleCollapse: function () { self.setState({ collapsed: !s.collapsed }); },
      toggleRetired: function () { self.setState({ retiredOpen: !s.retiredOpen }); },
      openDrawer: function () { self.setState({ drawer: true }); },
      closeDrawer: function () { self.setState({ drawer: false }); },
      refresh: function () {
        clearTimeout(self.spinTimer);
        self.setState({ spinning: true });
        self.spinTimer = setTimeout(function () { self.setState({ spinning: false }); }, 900);
      },
      home: function () { self.note("Goes to the dashboard home"); },
      back: function () { self.setState({ drawer: false }); self.note("Back to the dashboard's Generate page"); },
      settings: function () { self.note("Opens dashboard Settings"); },
      logout: function () { self.note("Signs out"); },
      theme: function () { self.setState({ light: !s.light }); },
      bell: function () { self.note("Opens notifications"); },
      newType: function () { self.setState({ drawer: false }); self.note("Opens the Studio to create a carousel type · D6"); }
    };
  }
}`;
}

function artboard({ phone, firstRun, light = false }) {
  const w = phone ? 390 : 1440;
  const h = phone ? 844 : 900;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>${css(phone)}</style>
</helmet>
<div class="app {{themeCls}}">
  ${sidebar(phone)}
  ${phone ? `<div class="scrim {{scrimCls}}" aria-hidden="true" onClick="{{closeDrawer}}"></div>` : ""}
  <div class="colwrap">
    <div class="col">
      <div class="glow" aria-hidden="true">
        <span style="left: 30.2%; top: -20.4%; width: 24.5%; height: 84.5%; background: var(--glow-a);"></span>
        <span style="left: 98%; top: 14%; width: 24.5%; height: 84.5%; background: var(--glow-b);"></span>
      </div>
      ${topbar(phone)}
      ${page()}
    </div>
    <div class="note {{noteCls}}" role="status" aria-live="polite"><b>Prototype</b><span>{{noteText}}</span></div>
  </div>
</div>
</x-dc>
<script data-dc-script data-props='{"$preview":{"width":${w},"height":${h}}}'>
${logic({ phone, firstRun, light })}
</script>
</body>
</html>
`;
}

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
    fs.writeFileSync(path.join(OUT, file), artboard({ phone: b.phone, firstRun: b.firstRun, light }));
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
