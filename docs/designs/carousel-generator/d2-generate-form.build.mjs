#!/usr/bin/env node
/*
 * D2 · Generate form — the prototype artboards for the Claude Design canvas.
 *
 * Design step only (docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md, D2). Nothing
 * here is app code. Built from d1-carousel-types.build.mjs: the shell (menu,
 * top bar, page glow, theme tokens, phone drawer, prototype note) is D1's,
 * unchanged, so every screen matches. Each screen is built twice, on a Dark page
 * and a Light page (light designed 2026-09-14 at Garreth's request).
 *
 *   Main.dc.html          desktop 1440×900, ready to generate
 *   Phone.dc.html         phone 390×844, Generate in a bottom bar
 *   PhonePicker.dc.html   phone, the library picker open
 *   Picker.dc.html        desktop, the library picker open
 *   EmptyGroups.dc.html   desktop, the library has no images in two groups
 *   NoLibrary.dc.html     desktop, the type points at no library
 *   canvas.json
 *
 * The font, logo, logo mark and icons are read from the repo; colours and
 * spacing are copied from src/app/globals.css and src/components/ui (Stepper,
 * FilterPills, Dropdown, SearchInput). All content is made-up sample data.
 *
 *   node docs/designs/carousel-generator/d2-generate-form.build.mjs <out dir>
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
  // D2 additions, at icons.tsx's weights.
  backSm: icon("CaretLeft", 14, "bold"),
  minus: icon("Minus", 12, "bold"),
  caretLeft: icon("CaretLeft", 14, "bold"),
  caretRightSm: icon("CaretRight", 12, "bold"),
  check: icon("Check", 14),
  tileImages: icon("Images", 18),
  busy: icon("CircleNotch", 14, "bold"),
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
button, input { font: inherit; color: inherit; background: none; border: 0; padding: 0; margin: 0; }
button { cursor: pointer; text-align: left; }
a { color: var(--accent); } a:hover { color: var(--text-primary); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
svg { display: block; flex-shrink: 0; }
.tnum { font-variant-numeric: tabular-nums; }
h1 { margin: 0; font-size: 20px; line-height: 28px; font-weight: 600; letter-spacing: -0.02em; }

/* Shell — D1's, unchanged */
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

/* Shared controls — D1's */
.btn2 { position: relative; display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; border-radius: 999px; border: 1px solid var(--border); background: var(--card-raised); padding: 6px 14px;
  font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-muted); white-space: nowrap; transition: color 150ms var(--ease), transform 160ms var(--ease-out-strong); }
.btn2:hover, .btn2[aria-expanded="true"] { color: var(--text-primary); }
.btn2:active { transform: scale(0.97); }
.cta { display: inline-flex; align-items: center; justify-content: center; gap: 8px; flex-shrink: 0; border-radius: 999px; padding: 10px 22px;
  font-size: 13.6px; line-height: 1; font-weight: 500; letter-spacing: 0.01em; white-space: nowrap; color: var(--bg); background: var(--accent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-deep) 45%, transparent), var(--sb-shadow);
  transition: transform 150ms var(--ease), box-shadow 200ms var(--ease), opacity 150ms var(--ease); }
.cta:hover:not(:disabled) { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-deep) 45%, transparent), inset 1px 1px 0 rgba(255,255,255,0.55), var(--sb-shadow); }
.cta:active:not(:disabled) { transform: scale(0.97); }
.cta:focus-visible { outline-offset: 3px; }
/* Unavailable: hold-button.tsx's disabled treatment (40%, not-allowed). */
.cta:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
.cta.is-busy:disabled { opacity: 1; cursor: progress; }
.pill { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; border-radius: 999px; padding: 2px 10px; font-size: 12px; line-height: 16px; font-weight: 500; white-space: nowrap; background: var(--pill-bg); color: var(--text-muted); }
.pill b { font-weight: 500; color: var(--text-primary); }
.pill--danger, .pill--danger b { color: var(--danger); }

/* ── D2 page ── */
.page { display: flex; flex-direction: column; gap: 24px; }
.phead { display: flex; flex-direction: column; align-items: flex-start; }
/* Name left, character and slide count right (Garreth, 2026-09-14). */
.ptitle { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; align-self: stretch; }
/* Back to Carousel types: the breadcrumb above the name, not a second menu. */
.upcrumb { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 4px -2px; padding: 2px; border-radius: 8px; font-size: 13px; line-height: 20px; font-weight: 500; color: var(--text-muted); transition: color 150ms var(--ease); }
.upcrumb:hover { color: var(--text-primary); }
.cmeta { display: flex; flex-wrap: wrap; gap: 6px; }

/* The form is one card of rows between thin lines, the same banding as D1's View details. */
.fcard { display: flex; flex-direction: column; border-radius: 24px; background: var(--card); border: 1px solid var(--border); box-shadow: var(--sh-card); }
.frow { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 24px; align-items: start; padding: 16px 24px; border-top: 1px solid var(--border); }
.frow:first-child, .fgroup + .frow { border-top: 0; }
.flabel { display: flex; flex-direction: column; padding-top: 6px; font-size: 14px; line-height: 20px; font-weight: 500; }
.flabel .opt { font-size: 12px; line-height: 16px; font-weight: 400; color: var(--text-muted); }
.fgroup { padding: 20px 24px 4px; border-top: 1px solid var(--border); font-size: 11px; line-height: 16.5px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-muted); }
.fctl { position: relative; min-width: 0; }
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
/* Positioned, so the desktop picker hangs 8px under Change itself (dropdown.tsx's mt-2), not under the group pills. */
.libact { position: relative; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.tbtn { position: relative; border-radius: 8px; padding: 2px 4px; font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-muted); transition: color 150ms var(--ease); }
.tbtn:hover { color: var(--text-primary); }
.groups { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }

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

/* Datestamp — src/components/ui/dropdown.tsx's trigger */
.dd { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; border: 1px solid var(--border); background: var(--card-raised); padding: 6px 14px; font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-primary); }
.dd .ddcaret { display: flex; color: var(--text-muted); transition: transform 200ms var(--ease-out-strong); }
.dd[aria-expanded="true"] .ddcaret { transform: rotate(180deg); }

/* Popovers — .glass-overlay, rounded-nested. 180ms in, 120ms out, scaled from the trigger's corner. */
.catch { position: absolute; inset: 0; z-index: 30; display: none; }
.catch.on { display: block; }
.pop { position: absolute; z-index: 40; border-radius: 16px; border: 1px solid var(--border); padding: 8px;
  background: var(--overlay-veil); box-shadow: var(--overlay-rim); -webkit-backdrop-filter: var(--overlay-blur); backdrop-filter: var(--overlay-blur);
  opacity: 0; visibility: hidden; pointer-events: none; transform: scale(0.97) translateY(-4px);
  transition: opacity 120ms var(--ease-out-strong), transform 120ms var(--ease-out-strong), visibility 0s 120ms; }
.pop.on { opacity: 1; visibility: visible; pointer-events: auto; transform: none; transition: opacity 180ms var(--ease-out-strong), transform 180ms var(--ease-out-strong); }
.libpop { top: calc(100% + 8px); right: 0; width: 360px; transform-origin: top right; }
.monthpop { bottom: calc(100% + 8px); left: 0; width: 256px; padding: 12px; transform-origin: bottom left; transform: scale(0.97) translateY(4px); }
.monthpop.on { transform: none; }
.opts { display: flex; flex-direction: column; gap: 2px; }
.optrow { display: flex; width: 100%; align-items: center; gap: 12px; border-radius: 12px; padding: 8px; transition: background-color 150ms var(--ease); }
.optrow:hover { background: color-mix(in srgb, var(--text-primary) 6%, transparent); }
.optrow .tile { width: 40px; height: 40px; border-radius: 10px; }
.optrow .libname { font-size: 13px; }
.optcheck { display: flex; width: 16px; justify-content: center; color: var(--text-primary); }
.popfoot { margin-top: 6px; border-top: 1px solid var(--border); padding-top: 6px; }
.popfoot .optrow { justify-content: space-between; padding: 8px 10px; font-size: 13px; line-height: 20px; font-weight: 500; color: var(--text-muted); }
.popfoot .optrow:hover { color: var(--text-primary); }
.mhead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.mhead span { font-size: 14px; line-height: 20px; font-weight: 600; }
.mgrid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
.mgrid button { border-radius: 999px; padding: 6px 0; text-align: center; font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-muted); transition: color 150ms var(--ease), background-color 150ms var(--ease); }
.mgrid button:hover { background: color-mix(in srgb, var(--text-primary) 6%, transparent); color: var(--text-primary); }
.mgrid button[aria-pressed="true"] { background: var(--accent); color: var(--bg); }

/* Prototype notes — not product UI. Names the ticket a click leads to. */
.note { position: absolute; left: 50%; bottom: ${phone ? 96 : 24}px; z-index: 70; display: flex; align-items: center; gap: 10px; max-width: calc(100% - 32px); border-radius: 999px; padding: 8px 16px;
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

/* Phone: labels sit above their controls, and Generate lives in a bottom bar
   so it is always in thumb reach with its reason beside it. */
.main { padding-bottom: 96px; }
.frow { grid-template-columns: minmax(0, 1fr); gap: 8px; padding: 16px 20px; }
.flabel { flex-direction: row; align-items: baseline; justify-content: space-between; padding-top: 0; }
.fgroup { padding: 20px 20px 4px; }
.ffoot { display: none; }
.bar { position: absolute; left: 0; right: 0; bottom: 0; z-index: 25; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 70%, transparent); -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px); }
.bar .status { font-size: 12px; line-height: 16px; }
.bar .cta { margin-left: auto; padding: 15px 26px; }
/* 44px touch targets: the controls keep the app's look, the hit area grows. */
.stepper { width: 100%; }
.stepbtn { width: 48px; }
.stepval input { padding: 12px 4px; }
.field { padding: 12px 14px; }
.btn2::after, .tbtn::after, .dd::after, .seg button::after { content: ""; position: absolute; inset: -8px -4px; }
.seg { display: flex; }
.seg button { position: relative; flex: 1; padding: 8px 12px; text-align: center; }
.dd { position: relative; }
/* The library picker is a centred modal on the phone (Garreth, 2026-09-14), over the drawer's scrim.
   Centred, so it scales from its own middle rather than from the trigger. */
.libpop { top: 50%; left: 50%; right: auto; width: calc(100% - 32px); transform-origin: center; transform: translate(-50%, -50%) scale(0.97); }
.libpop.on { transform: translate(-50%, -50%); }
.catch.modal { background: var(--scrim); -webkit-backdrop-filter: var(--scrim-blur); backdrop-filter: var(--scrim-blur); animation: scrim-in 180ms var(--ease-out-strong); }
@keyframes scrim-in { from { opacity: 0; } }
.optrow { padding: 10px 8px; }
.monthpop { width: 100%; }
.mgrid button { padding: 12px 0; }
`
    : ""
}
.is-light .cta { color: #ffffff; }
.is-light .seg button[aria-checked="true"], .is-light .mgrid button[aria-pressed="true"] { color: #ffffff; }
.is-light .switch { background: var(--accent); }
.is-light .knob { left: 18px; background: var(--card); }
.is-light .note { border: 1px solid var(--border); }
.moon, .sun { display: flex; }
.sun { display: none; }
.is-light .sun { display: flex; }
.is-light .moon { display: none; }
@media (prefers-reduced-motion: reduce) {
  .rail, .navpill, .btn2, .cta, .fixed, .dd .ddcaret, .seg button, .stepbtn { transition: none; }
  .pop, .monthpop { transform: none; transition: opacity 120ms linear, visibility 0s 120ms; }
  .pop.on, .monthpop.on { transition: opacity 120ms linear; }
  ${phone ? ".libpop, .libpop.on { transform: translate(-50%, -50%); } .catch.modal { animation: none; }" : ""}
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
              <h1>Before &amp; After</h1>
              <div class="cmeta">
                <span class="pill">Character 2</span>
                <span class="pill tnum">7 slides</span>
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
                  <div class="groups">
                    <sc-for list="{{lib.groups}}" as="g" hint-placeholder-count="4"><span class="pill tnum {{g.cls}}">{{g.name}} <b>{{g.count}}</b></span></sc-for>
                  </div>
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
            <div class="frow">
              <span class="flabel" id="date-label">Datestamp</span>
              <div class="fctl">
                <button type="button" class="dd js-datetrigger" aria-haspopup="dialog" aria-expanded="{{monthExpanded}}" aria-labelledby="date-label date-value" onClick="{{toggleMonth}}"><span id="date-value" class="tnum">{{dateLabel}}</span><span class="ddcaret">${I.caretDown}</span></button>
                <div class="pop monthpop {{monthPopCls}}" role="dialog" aria-label="Datestamp" onKeyDown="{{popKey}}">
                  <div class="mhead">
                    <button type="button" class="icon-btn" aria-label="Previous year" onClick="{{prevYear}}">${I.caretLeft}</button>
                    <span class="tnum">{{pickYear}}</span>
                    <button type="button" class="icon-btn" aria-label="Next year" onClick="{{nextYear}}">${I.caret}</button>
                  </div>
                  <div class="mgrid">
                    <sc-for list="{{months}}" as="m" hint-placeholder-count="12"><button type="button" aria-pressed="{{m.on}}" onClick="{{m.pick}}">{{m.label}}</button></sc-for>
                  </div>
                </div>
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

/* ── Behaviour ─────────────────────────────────────────────────────────── */

function logic({ phone, init, light }) {
  return `
class Component extends DCLogic {
  componentDidMount() { this.placePill(); }
  componentDidUpdate() {
    this.placePill();
    /* Focus follows a popover the way a listbox should: into it on open, back
       to its trigger on close. Not on first mount, so the canvas never jumps. */
    var st = this.state || {};
    if (st.libOpen && !this.libWas) { var o = document.querySelector('.libpop [aria-selected="true"]') || document.querySelector(".libpop .optrow"); if (o) o.focus(); }
    if (!st.libOpen && this.libWas && st.returnFocus) { var t = document.querySelector(".js-libtrigger"); if (t) t.focus(); }
    if (st.monthOpen && !this.monthWas) { var m = document.querySelector('.monthpop [aria-pressed="true"]'); if (m) m.focus(); }
    if (!st.monthOpen && this.monthWas && st.returnFocus) { var d = document.querySelector(".js-datetrigger"); if (d) d.focus(); }
    this.libWas = !!st.libOpen; this.monthWas = !!st.monthOpen;
  }
  componentWillUnmount() { clearTimeout(this.noteTimer); clearTimeout(this.spinTimer); clearTimeout(this.busyTimer); }

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
    var INIT = ${JSON.stringify(init)};
    var LIGHT = ${light};
    var self = this;
    var s = Object.assign({
      active: "types", collapsed: false, note: "", noteOn: false, spinning: false, drawer: false, light: LIGHT,
      count: 50, libId: INIT.libId, libOpen: INIT.libOpen, returnFocus: false, dirOpen: false, noteVal: "",
      opening: "fixed", month: 8, year: 2026, pickYear: 2026, monthOpen: false, busy: false
    }, this.state || {});

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
      go[n[0]] = function () {
        self.setState({ drawer: false });
        if (n[0] === "types") self.note("Back to Carousel types · D1");
        else self.note("Opens " + n[1] + " · " + n[2].replace("Designed in ", ""));
      };
    });

    /* Sample content only — invented libraries, groups and counts. */
    var GROUPS = ["Cover", "Before", "After", "Portrait"];
    var LIBS = [
      { id: "window", name: "Soft Window Light", hue: "#c8a27a", g: [18, 41, 44, 23] },
      { id: "mirror", name: "Bathroom Mirror Mornings, Natural Light Series", hue: "#7aa0c8", g: [96, 402, 511, 275] },
      { id: "outdoor", name: "Outdoor Walks", hue: "#7ac8a0", g: [30, 90, 92, 0] },
      { id: "kitchen", name: "Kitchen Counter Shots", hue: "#b8b07a", g: [12, 46, 0, 0] },
      { id: "new", name: "New library", hue: "", g: [0, 0, 0, 0] }
    ];
    var OWN = INIT.libId;
    var fmt = function (n) { return n.toLocaleString("en-US"); };
    var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
    var tint = function (hex) { return hex ? "color-mix(in srgb, var(--card-raised) 78%, " + hex + ")" : "var(--card-sunken)"; };
    var list = function (names) { return names.length < 2 ? names.join("") : names.slice(0, -1).join(", ") + " and " + names[names.length - 1]; };
    var emptyOf = function (l) { return GROUPS.filter(function (_, i) { return l.g[i] === 0; }); };
    var images = function (n) { return n === 1 ? "1 image" : fmt(n) + " images"; };

    var cur = LIBS.filter(function (l) { return l.id === s.libId; })[0] || null;
    var empty = cur ? emptyOf(cur) : [];
    var closeAll = function (focus) { self.setState({ libOpen: false, monthOpen: false, returnFocus: !!focus }); };

    var clamp = function (n) { return Math.min(50, Math.max(1, n)); };
    var ready = !!cur && empty.length === 0;
    var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    var statusText = !cur ? "No image library" : empty.length ? "No images in " + list(empty) : "";

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
        groups: GROUPS.map(function (name, i) { return { name: name, count: fmt(cur.g[i]), cls: cur.g[i] === 0 ? "pill--danger" : "" }; })
      } : { name: "", tint: "", meta: "", groups: [] },
      changeLabel: cur ? "Change" : "Choose",
      showUndo: !!OWN && s.libId !== OWN,
      undoLib: function () { self.setState({ libId: OWN, libOpen: false }); },
      libExpanded: s.libOpen ? "true" : "false",
      libPopCls: s.libOpen ? "on" : "",
      toggleLib: function () { self.setState({ libOpen: !s.libOpen, monthOpen: false, returnFocus: false }); },
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
      openLibraries: function () { closeAll(false); self.note("Opens Image libraries · D8"); },
      popKey: function (e) { if (e.key === "Escape") { e.stopPropagation(); closeAll(true); } },
      catchCls: (s.libOpen || s.monthOpen ? "on" : "") + (PHONE && s.libOpen ? " modal" : ""),
      closePops: function () { closeAll(false); },

      /* Direction, read-only */
      dirCls: s.dirOpen ? "open" : "",
      dirExpanded: s.dirOpen ? "true" : "false",
      dirToggle: s.dirOpen ? "Less" : "More",
      toggleDir: function () { self.setState({ dirOpen: !s.dirOpen }); },
      editDirection: function () { self.note("Opens the Direction tab for Before & After · D7"); },

      noteVal: s.noteVal,
      typeNote: function (e) { self.setState({ noteVal: e.target.value }); },

      /* Template choices: this sample type's opening line and datestamp. */
      openFixed: s.opening === "fixed" ? "true" : "false",
      openWritten: s.opening === "written" ? "true" : "false",
      pickFixed: function () { self.setState({ opening: "fixed" }); },
      pickWritten: function () { self.setState({ opening: "written" }); },
      fixedCls: s.opening === "fixed" ? "on" : "",
      dateLabel: MONTHS[s.month] + " " + s.year,
      monthExpanded: s.monthOpen ? "true" : "false",
      monthPopCls: s.monthOpen ? "on" : "",
      toggleMonth: function () { self.setState({ monthOpen: !s.monthOpen, libOpen: false, pickYear: s.year, returnFocus: false }); },
      pickYear: String(s.pickYear),
      prevYear: function () { self.setState({ pickYear: s.pickYear - 1 }); },
      nextYear: function () { self.setState({ pickYear: s.pickYear + 1 }); },
      months: MONTHS.map(function (label, i) {
        return {
          label: label,
          on: i === s.month && s.pickYear === s.year ? "true" : "false",
          pick: function () { self.setState({ month: i, year: s.pickYear, monthOpen: false, returnFocus: true }); }
        };
      }),

      /* Generate */
      statusText: statusText,
      statusCls: cur && empty.length ? "danger" : "",
      genDisabled: !ready || s.busy,
      genBusyCls: s.busy ? "is-busy" : "",
      busy: s.busy,
      idle: !s.busy,
      generate: function () {
        if (!ready || s.busy) return;
        self.setState({ busy: true, libOpen: false, monthOpen: false });
        clearTimeout(self.busyTimer);
        self.busyTimer = setTimeout(function () {
          self.setState({ busy: false });
          self.note("Opens the batch: " + s.count + " decks of Before & After · D3");
        }, 900);
      },
      submit: function (e) { e.preventDefault(); },

      spinCls: s.spinning ? "on" : "",
      noteCls: s.noteOn ? "on" : "",
      noteText: s.note,

      toggleCollapse: function () { self.setState({ collapsed: !s.collapsed }); },
      openDrawer: function () { self.setState({ drawer: true }); },
      closeDrawer: function () { self.setState({ drawer: false }); },
      refresh: function () {
        clearTimeout(self.spinTimer);
        self.setState({ spinning: true });
        self.spinTimer = setTimeout(function () { self.setState({ spinning: false }); }, 900);
      },
      home: function () { self.note("Goes to the dashboard home"); },
      back: function () { self.setState({ drawer: false }); self.note("Back to the dashboard's Generate page"); },
      backToTypes: function () { self.note("Back to Carousel types · D1"); },
      settings: function () { self.note("Opens dashboard Settings"); },
      logout: function () { self.note("Signs out"); },
      theme: function () { self.setState({ light: !s.light }); },
      bell: function () { self.note("Opens notifications"); }
    };
  }
}`;
}

function artboard({ phone, init, light = false }) {
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
  <div class="catch {{catchCls}}" aria-hidden="true" onClick="{{closePops}}"></div>
  ${phone ? libPicker : ""}
  <div class="colwrap">
    <div class="col">
      <div class="glow" aria-hidden="true">
        <span style="left: 30.2%; top: -20.4%; width: 24.5%; height: 84.5%; background: var(--glow-a);"></span>
        <span style="left: 98%; top: 14%; width: 24.5%; height: 84.5%; background: var(--glow-b);"></span>
      </div>
      ${topbar(phone)}
      ${page(phone)}
    </div>
    ${
      phone
        ? `<div class="bar">
      <span class="status {{statusCls}}" role="status" aria-live="polite">{{statusText}}</span>
      ${generateButton}
    </div>`
        : ""
    }
    <div class="note {{noteCls}}" role="status" aria-live="polite"><b>Prototype</b><span>{{noteText}}</span></div>
  </div>
</div>
</x-dc>
<script data-dc-script data-props='{"$preview":{"width":${w},"height":${h}}}'>
${logic({ phone, init, light })}
</script>
</body>
</html>
`;
}

fs.mkdirSync(OUT, { recursive: true });
/* Library covers: placeholder photos taken from the Supabase image store and downsampled (Garreth, 2026-09-14). */
for (const id of ["window", "mirror", "outdoor", "kitchen"]) {
  fs.copyFileSync(path.join(HERE, "assets", `d2-lib-${id}.jpg`), path.join(OUT, `d2-lib-${id}.jpg`));
}
const BOARDS = [
  { file: "Main.dc.html", phone: false, init: { libId: "window", libOpen: false }, title: "D2 · Generate form · Desktop", x: 0, y: 0 },
  { file: "Phone.dc.html", phone: true, init: { libId: "window", libOpen: false }, title: "D2 · Generate form · Phone", x: 1540, y: 0 },
  { file: "PhonePicker.dc.html", phone: true, init: { libId: "window", libOpen: true }, title: "D2 · Library picker · Phone", x: 2010, y: 0 },
  { file: "Picker.dc.html", phone: false, init: { libId: "window", libOpen: true }, title: "D2 · Library picker · Desktop", x: 0, y: 1040 },
  { file: "EmptyGroups.dc.html", phone: false, init: { libId: "kitchen", libOpen: false }, title: "D2 · Library with empty groups · Desktop", x: 1540, y: 1040 },
  { file: "NoLibrary.dc.html", phone: false, init: { libId: null, libOpen: false }, title: "D2 · No library chosen · Desktop", x: 0, y: 2080 },
];
const artboards = [];
for (const light of [false, true]) {
  for (const b of BOARDS) {
    const file = light ? b.file.replace(".dc.html", "Light.dc.html") : b.file;
    fs.writeFileSync(path.join(OUT, file), artboard({ phone: b.phone, init: b.init, light }));
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
  "Clickable. Try typing 64 into How many (it stops at 50), Change on the library and pick Kitchen Counter Shots or New library, Undo, More on the direction, Fixed and Written, the datestamp, and Generate.\n\nEscape or a click outside closes a picker.\n\nScreens not designed yet show a Prototype note naming their ticket.";
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
