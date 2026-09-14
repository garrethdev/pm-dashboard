/*
 * The Carousel Generator's design shell, shared by every design screen: the
 * menu, top bar, page glow, theme tokens, phone drawer and prototype note, plus
 * the builder that puts screens into an artboard.
 *
 * A ticket's script (dN-<name>.build.mjs) describes only its own screen: page
 * CSS, markup, starting state and behaviour. Its review artboards pass that one
 * screen to `artboard()`. prototype.build.mjs passes every approved screen, so
 * a click on one (Generate on a D1 card) opens the next (D2) in the same frame.
 *
 * Every visual value is read from the app rather than retyped: the font file,
 * the logo, the logo mark and the Phosphor icons at icons.tsx's weights.
 * Colours and spacing are copied from src/app/globals.css and src/components.
 *
 * A screen is { id, nav, css(phone), markup(phone), appOverlay?(phone),
 * colOverlay?(phone), state, enter?, vals, didUpdate? }:
 *   nav        the menu item it sits under
 *   state      its starting state, merged with the shell's
 *   enter      state set every time another screen opens it
 *   vals       JS source run inside renderVals; sees `s` (state), `self` (the
 *              component) and `ctx`, and returns the values its markup binds
 *   didUpdate  JS source run in componentDidUpdate
 * ctx.open(screenId, params, elsewhere) opens a screen in the same artboard,
 * or shows the Prototype note `elsewhere` when that screen is not in it.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, "../../..");
const require = createRequire(path.join(REPO, "package.json"));

const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ssrDir = path.join(REPO, "node_modules/@phosphor-icons/react/dist/ssr");
const ssrEntry = fs.readdirSync(ssrDir).find((f) => /^index.*\.(m?js)$/.test(f) && !f.includes("cjs"));
const Ph = await import(pathToFileURL(path.join(ssrDir, ssrEntry)).href);

/** The HTML parser the canvas uses wants every non-void element closed. */
export const closeTags = (s) =>
  s.replace(/<(path|rect|circle|polygon|polyline|line|ellipse)(\s[^<>]*?)?\s*\/>/g, "<$1$2></$1>");

/** Same component, same weight, as src/components/ui/icons.tsx. */
export function icon(name, size = 16, weight = "fill") {
  const C = Ph[name];
  if (!C) throw new Error(`No Phosphor icon named ${name}`);
  return closeTags(renderToStaticMarkup(React.createElement(C, { size, weight, "aria-hidden": true })));
}

export const I = {
  // Every back button is the outline "<": icons.tsx's ChevronLeft (CaretLeft, bold) (Garreth, 2026-09-14).
  arrowLeft: icon("CaretLeft", 16, "bold"),
  backSm: icon("CaretLeft", 14, "bold"),
  cards: icon("Cards"),
  history: icon("ClockCounterClockwise"),
  images: icon("Images"),
  studio: icon("PaintBrushBroad"),
  trends: icon("TrendUp"),
  gear: icon("Gear"),
  signOut: icon("SignOut"),
  moon: icon("Moon"),
  sun: icon("Sun"),
  bell: icon("Bell"),
  refresh: icon("ArrowsClockwise"),
  menu: icon("List", 16, "bold"),
  x: icon("X", 18, "regular"),
  plus: icon("Plus", 12, "bold"),
  minus: icon("Minus", 12, "bold"),
  caret: icon("CaretRight", 14, "bold"),
  caretDown: icon("CaretDown", 14, "bold"),
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

/** The generator's own menu. `ticket` designs the screen the item opens. */
export const NAV = [
  { id: "types", label: "Carousel types", icon: I.cards, ticket: "D1" },
  { id: "history", label: "History", icon: I.history, ticket: "D9" },
  { id: "libraries", label: "Image libraries", icon: I.images, ticket: "D8" },
  { id: "studio", label: "Studio", icon: I.studio, ticket: "D6" },
  { id: "trends", label: "Trends", icon: I.trends, ticket: "D10" },
];

/* ── Styles ────────────────────────────────────────────────────────────── */

export function shellCss(phone) {
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
.page { display: flex; flex-direction: column; gap: 24px; }

/* Shared controls */
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
  .rail, .navpill, .btn2, .cta { transition: none; }
  .note { transform: translate(-50%, 0); transition: opacity 150ms linear; }
  .spin.on { animation: none; }
}
`;
}

/* ── Markup ────────────────────────────────────────────────────────────── */

function sidebar(phone) {
  const rows = NAV.map(
    ({ id, label, icon: ic }) =>
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

/* ── Behaviour ─────────────────────────────────────────────────────────── */

/*
 * navMode "page": a menu item selects itself, and items whose screen is not
 * designed yet show D1's placeholder page (D1's own behaviour). navMode "note":
 * a menu item only shows a Prototype note (a single screen that is not D1).
 */
function logic({ phone, light, screens, start, navMode }) {
  const first = screens.find((sc) => sc.id === start);
  const state = Object.assign(
    { screen: start, params: {}, active: first.nav, collapsed: false, note: "", noteOn: false, spinning: false, drawer: false, light },
    ...screens.map((sc) => sc.state || {}),
  );
  const navOf = Object.fromEntries(screens.map((sc) => [sc.id, sc.nav]));
  const enter = Object.fromEntries(screens.map((sc) => [sc.id, sc.enter || {}]));
  const nav = NAV.map(({ id, label, ticket }) => [id, label, ticket]);
  const goHandler =
    navMode === "page"
      ? `function () { self.setState({ active: n[0], screen: has("types") ? "types" : s.screen, drawer: false }); }`
      : `function () { self.setState({ drawer: false }); self.note(n[0] === "types" ? "Back to Carousel types · D1" : "Opens " + n[1] + " · " + n[2]); }`;
  return `
class Component extends DCLogic {
  componentDidMount() { this.placePill(); this.screenWas = (this.state || {}).screen; }
  componentDidUpdate() {
    this.placePill();
    var st = this.state || {};
    /* A newly opened screen starts at the top, the way a page load would. */
    if (st.screen && st.screen !== this.screenWas) {
      var column = document.querySelector(".col");
      if (column) column.scrollTop = 0;
      this.screenWas = st.screen;
    }
${screens.map((sc) => sc.didUpdate || "").join("\n")}
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
    var SCREENS = ${JSON.stringify(screens.map((sc) => sc.id))};
    var NAV_OF = ${JSON.stringify(navOf)};
    var ENTER = ${JSON.stringify(enter)};
    var NAV = ${JSON.stringify(nav)};
    var self = this;
    var s = Object.assign(${JSON.stringify(state)}, this.state || {});
    var has = function (id) { return SCREENS.indexOf(id) >= 0; };
    var ctx = {
      PHONE: PHONE,
      current: NAV.filter(function (n) { return n[0] === s.active; })[0],
      note: function (text) { self.note(text); },
      open: function (id, params, elsewhere) {
        if (has(id)) self.setState(Object.assign({ screen: id, params: params || {}, active: NAV_OF[id], drawer: false }, ENTER[id]));
        else { self.setState({ drawer: false }); self.note(elsewhere); }
      }
    };

    var navCls = {}, navCurrent = {}, navTitle = {}, go = {};
    var titleWhenCollapsed = function (label) { return s.collapsed && !PHONE ? label : ""; };
    NAV.forEach(function (n) {
      var on = s.active === n[0];
      navCls[n[0]] = on ? "is-active" : "";
      navCurrent[n[0]] = on ? "page" : "false";
      navTitle[n[0]] = titleWhenCollapsed(n[1]);
      go[n[0]] = ${goHandler};
    });
    var screenIs = {};
    SCREENS.forEach(function (id) { screenIs[id] = s.screen === id; });

    var vals = {
      screenIs: screenIs,
      screenCls: "screen-" + s.screen,
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
      settings: function () { self.note("Opens dashboard Settings"); },
      logout: function () { self.note("Signs out"); },
      theme: function () { self.setState({ light: !s.light }); },
      bell: function () { self.note("Opens notifications"); }
    };
${screens.map((sc) => `    Object.assign(vals, (function () {\n${sc.vals}\n    })());`).join("\n")}
    return vals;
  }
}`;
}

/**
 * One artboard. With one screen it is a ticket's review screen; with several
 * it is the prototype, showing `start` first and switching on ctx.open.
 */
export function artboard({ phone, light = false, screens, start = screens[0].id, navMode = "page" }) {
  const w = phone ? 390 : 1440;
  const h = phone ? 844 : 900;
  const many = screens.length > 1;
  const only = (sc, html) =>
    many && html ? `<sc-if value="{{screenIs.${sc.id}}}" hint-placeholder-val="{{ ${sc.id === start} }}">${html}</sc-if>` : html;
  const part = (fn) => screens.map((sc) => only(sc, fn(sc) || "")).join("");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>${shellCss(phone)}${screens.map((sc) => sc.css(phone)).join("")}</style>
</helmet>
<div class="app {{themeCls}} {{screenCls}}">
  ${sidebar(phone)}
  ${phone ? `<div class="scrim {{scrimCls}}" aria-hidden="true" onClick="{{closeDrawer}}"></div>` : ""}
  ${part((sc) => sc.appOverlay && sc.appOverlay(phone))}
  <div class="colwrap">
    <div class="col">
      <div class="glow" aria-hidden="true">
        <span style="left: 30.2%; top: -20.4%; width: 24.5%; height: 84.5%; background: var(--glow-a);"></span>
        <span style="left: 98%; top: 14%; width: 24.5%; height: 84.5%; background: var(--glow-b);"></span>
      </div>
      ${topbar(phone)}
      ${part((sc) => sc.markup(phone))}
    </div>
    ${part((sc) => sc.colOverlay && sc.colOverlay(phone))}
    <div class="note {{noteCls}}" role="status" aria-live="polite"><b>Prototype</b><span>{{noteText}}</span></div>
  </div>
</div>
</x-dc>
<script data-dc-script data-props='{"$preview":{"width":${w},"height":${h}}}'>
${logic({ phone, light, screens, start, navMode })}
</script>
</body>
</html>
`;
}

/** True when the calling script was run directly rather than imported. */
export const isMain = (metaUrl) => !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(metaUrl);
