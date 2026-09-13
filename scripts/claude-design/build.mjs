// Builds the Claude Design copy of the design system into ./dist: colour and
// material tokens, shared classes, the General Sans font and preview cards,
// read straight out of src/app/globals.css so no value is retyped by hand.
// Hand-written parts (type ramp, spacing, guide) are copied from ./static.
//
//   node scripts/claude-design/build.mjs && node scripts/claude-design/verify.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const OUT = path.join(HERE, "dist");
const DATE = new Date().toISOString().slice(0, 10);

const css = fs
  .readFileSync(path.join(REPO, "src/app/globals.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

function blockAt(startIdx) {
  let j = css.indexOf("{", startIdx) + 1;
  const i = j;
  let depth = 1;
  while (depth) {
    const c = css[j++];
    if (c === undefined) throw new Error("unbalanced braces");
    if (c === "{") depth++;
    else if (c === "}") depth--;
  }
  return css.slice(i, j - 1);
}
function find(re) {
  const m = css.match(re);
  if (!m) throw new Error("not found: " + re);
  return m.index;
}
const norm = (v) => v.replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim();
function tokens(body) {
  const t = new Map();
  for (const m of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) t.set(m[1], norm(m[2]));
  return t;
}
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const dark = tokens(blockAt(find(/(^|\n):root\s*\{/)));
const light = tokens(blockAt(find(/:root\[data-theme="light"\]\s*\{/)));
const val = (n, mode) => (mode === "light" && light.has(n) ? light.get(n) : dark.get(n));

const COLOR_GROUPS = [
  ["Surfaces", ["bg", "card", "card-sunken", "card-raised", "border"]],
  ["Text", ["text-primary", "text-muted"]],
  ["Accent: the cyan is locked. Ration it to about one use per screen", ["accent", "accent-deep", "accent-soft"]],
  ["Semantic: these carry meaning, never style", ["ok", "warn", "orange", "danger", "danger-deep", "info"]],
  ["Status pills: one neutral ground, only the label is coloured", ["pill-bg", "pill-red", "pill-amber", "pill-yellow"]],
  ["Chart chrome: deliberately not --border", ["chart-grid", "chart-cursor"]],
];
const MATERIAL_GROUPS = [
  ["Glass: the lit top lip is an inset edge, not a border", ["glass", "glass-border", "glass-highlight", "glass-blur"]],
  ["Floating panels: dropdowns, tooltips, modals", ["overlay-veil", "overlay-blur", "overlay-rim"]],
  ["Drawer scrim", ["scrim", "scrim-blur"]],
  ["Ambient glow: light shafts over the interface, not a vignette", ["glow-a", "glow-b", "glow-blur", "glow-rail", "glow-rail-bottom"]],
  ["Texture", ["dot-opacity"]],
  ["Shadow: light mode has none, borders carry elevation", ["sh-card", "sh-hero", "sb-shadow"]],
];

// Every token in globals.css :root must land in exactly one file.
const grouped = [...COLOR_GROUPS, ...MATERIAL_GROUPS].flatMap(([, names]) => names);
const missing = [...dark.keys()].filter((n) => !grouped.includes(n));
const unknown = grouped.filter((n) => !dark.has(n));
if (missing.length || unknown.length)
  throw new Error(`token grouping out of date. missing: ${missing} unknown: ${unknown}`);

function tokenFile(title, groups, scheme) {
  const section = (map) =>
    groups
      .map(([label, names]) => {
        const lines = names.filter((n) => map.has(n)).map((n) => `  --${n}: ${map.get(n)};`);
        return lines.length ? `  /* ${label} */\n${lines.join("\n")}` : "";
      })
      .filter(Boolean)
      .join("\n\n");
  return `/* Peptide Miracles Dashboard: ${title}.
   Generated ${DATE} from pm-dashboard/src/app/globals.css, the source of truth.
   Do not edit values here. Change globals.css, then re-sync this file. */

:root {
${scheme ? "  color-scheme: dark;\n\n" : ""}${section(dark)}
}

/* Light mode: the same names, resolved flat. The second selector is an
   addition for previews, so one element can show light beside dark. */
:root[data-theme="light"],
[data-theme="light"] {
${scheme ? "  color-scheme: light;\n\n" : ""}${section(light)}
}
`;
}

function rule(selector) {
  const idx = css.indexOf(selector + " {");
  if (idx < 0) throw new Error("rule not found: " + selector);
  const lines = blockAt(idx).split("\n").map((l) => l.trim()).filter(Boolean);
  const out = [];
  let continuing = false;
  for (const l of lines) {
    out.push((continuing ? "    " : "  ") + l);
    continuing = !l.endsWith(";");
  }
  return `${selector.trim()} {\n${out.join("\n")}\n}`;
}
const RULES = [
  "body",
  "h1,\nh2,\n.font-display",
  ".page-glow",
  ".glow-layer",
  ".glow-layer > span",
  ".rail-glow",
  ".glass",
  ".glass-overlay",
  ".dot-fade",
  ".dot-fade::after",
  ".tnum",
  "::selection",
  "\n*",
  "*::-webkit-scrollbar",
];

const write = (rel, content) => {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
};

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(HERE, "static"), OUT, { recursive: true });

// ── Generated components: icons and identity marks, read from the app's source ─
// Glyph and logo path data is never retyped: icons render through Phosphor at
// the weights icons.tsx assigns, and the marks are lifted out of their .tsx files.
const UI = path.join(REPO, "src/components/ui");
const readUi = (f) => fs.readFileSync(path.join(UI, f), "utf8");

function svgFrom(source, fnName) {
  const start = source.indexOf(`export function ${fnName}`);
  if (start < 0) throw new Error(`${fnName} not found`);
  const open = source.indexOf("<svg", start);
  const openEnd = source.indexOf(">", open);
  const close = source.indexOf("</svg>", openEnd);
  const tag = source.slice(open, openEnd + 1);
  return {
    viewBox: tag.match(/viewBox="([^"]+)"/)[1],
    inner: source.slice(openEnd + 1, close).replace(/\{\/\*[\s\S]*?\*\/\}/g, "").trim(),
  };
}

const iconsTsx = readUi("icons.tsx");
const phosphorName = new Map([...iconsTsx.matchAll(/(\w+) as (Ph\w+),/g)].map((m) => [m[2], m[1]]));
const iconDefs = [...iconsTsx.matchAll(/export const (\w+) = icon\((Ph\w+), "\w+"(?:, "(\w+)")?\);/g)].map((m) => ({
  name: m[1],
  phosphor: phosphorName.get(m[2]),
  weight: m[3] || "fill",
}));
if (iconDefs.length === 0 || iconDefs.some((d) => !d.phosphor)) throw new Error("could not read src/components/ui/icons.tsx");

const phosphor = await import("@phosphor-icons/react/ssr");
const React = (await import("react")).default;
const { renderToStaticMarkup } = await import("react-dom/server");
const glyphs = {};
for (const d of iconDefs) {
  const svg = renderToStaticMarkup(React.createElement(phosphor[d.phosphor], { weight: d.weight }));
  const m = svg.match(/viewBox="([^"]+)">([\s\S]*)<\/svg>/);
  if (!m) throw new Error("unexpected Phosphor markup for " + d.name);
  glyphs[d.name] = { viewBox: m[1], body: m[2] };
}
const toggle = svgFrom(readUi("sidebar-toggle-icon.tsx"), "SidebarToggleIcon");
glyphs.SidebarToggle = { viewBox: toggle.viewBox, fill: "none", body: toggle.inner.replace(/strokeWidth=/g, "stroke-width=") };
const iconNames = Object.keys(glyphs);

write(
  "components/icon/Icon.jsx",
  `import React from "react";

/* Generated by scripts/claude-design/build.mjs from src/components/ui/icons.tsx
   (Phosphor at the app's own weights: fill, bold for carets, the spinner, Menu,
   Plus and Minus, regular for X) and sidebar-toggle-icon.tsx. Do not edit. */

const ICONS = {
${iconNames.map((n) => `  ${n}: ${JSON.stringify(glyphs[n])},`).join("\n")}
};

/** One glyph from the dashboard's icon vocabulary, always currentColor.
 *  Sizes: 12 inline with text, 14 in controls, 16 in the nav icon box. */
export function Icon({ name, size = 16, title, className, style }) {
  const glyph = ICONS[name];
  if (!glyph) return null;
  return (
    <svg
      viewBox={glyph.viewBox}
      width={size}
      height={size}
      fill={glyph.fill || "currentColor"}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: glyph.body }}
    />
  );
}
`,
);
write(
  "components/icon/Icon.d.ts",
  `import * as React from "react";

export type IconName =
${iconNames.map((n) => `  | "${n}"`).join("\n")};

export interface IconProps {
  name: IconName;
  /** 12 inline with text, 14 in controls, 16 in the nav icon box. @default 16 */
  size?: number;
  /** Accessible label; omit for decorative icons. */
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Dashboard icon: Phosphor at fill weight, in currentColor. */
export function Icon(props: IconProps): React.JSX.Element | null;
`,
);

const CARD_HEAD = `<link rel="stylesheet" href="../../styles.css" />
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>
<script src="../../_ds_bundle.js"></script>`;
const iconRows = Math.ceil(iconNames.length / 8);
write(
  "components/icon/icons.card.html",
  `<!-- @dsCard group="Components" viewport="700x${40 + iconRows * 62}" name="Icons" subtitle="${iconNames.length} glyphs under the app's own names; Phosphor at fill weight, always currentColor" -->
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
${CARD_HEAD}
<style>
  body { margin: 0; padding: 20px; }
  .grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; }
  .cell { display: grid; justify-items: center; gap: 8px; padding: 10px 2px; color: var(--text-primary); }
  .cell span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 400 10px/14px var(--font-mono); color: var(--text-muted); }
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
  const { Icon } = window.PeptideMiraclesDashboard_26e60f;
  const names = ${JSON.stringify(iconNames)};
  function Demo() {
    return (
      <div className="grid">
        {names.map((n) => (
          <div className="cell" key={n} title={n}><Icon name={n} size={16} /><span>{n}</span></div>
        ))}
      </div>
    );
  }
  ReactDOM.createRoot(document.getElementById("root")).render(<Demo />);
</script>
</body>
</html>
`,
);

const mark = svgFrom(readUi("peptide-mark.tsx"), "PeptideMark");
write(
  "components/identity/PeptideMark.jsx",
  `import React from "react";

/* Generated from src/components/ui/peptide-mark.tsx. The atom from the logo,
   icon-only; currentColor, so it is white on dark and dark on light. Do not edit. */

/** The Peptide Miracles atom mark. */
export function PeptideMark({ size = 24, className, style }) {
  return (
    <svg viewBox="${mark.viewBox}" width={size} height={size} fill="currentColor" aria-label="Peptide Miracles" className={className} style={style}>
      ${mark.inner}
    </svg>
  );
}
`,
);
const brandTsx = readUi("brand-icons.tsx");
const brand = (fn, label) => {
  const g = svgFrom(brandTsx, fn);
  return `/** ${label} glyph in currentColor. */
export function ${fn}({ size = 16, className, style }) {
  return (
    <svg viewBox="${g.viewBox}" width={size} height={size} fill="currentColor" aria-label="${label}" className={className} style={style}>
      ${g.inner}
    </svg>
  );
}`;
};
write(
  "components/identity/BrandIcons.jsx",
  `import React from "react";

/* Generated from src/components/ui/brand-icons.tsx. Platform glyphs in
   currentColor: they take their row's colour, not the brand's. Do not edit. */

${brand("TikTokIcon", "TikTok")}

${brand("InstagramIcon", "Instagram")}
`,
);

write("tokens/colors.css", tokenFile("colour tokens", COLOR_GROUPS, true));
write("tokens/material.css", tokenFile("material tokens (glass, glow, shadow)", MATERIAL_GROUPS, false));
write(
  "tokens/utilities.css",
  `/* Peptide Miracles Dashboard: shared classes.
   Generated ${DATE} from pm-dashboard/src/app/globals.css, copied rule for rule.
   .glass needs a light source behind it (.glow-layer) or it renders as a flat box.
   The glow layer sits ABOVE the interface as a film; pointer-events: none is load-bearing. */

${RULES.map(rule).join("\n\n")}
`,
);

fs.mkdirSync(path.join(OUT, "assets/fonts"), { recursive: true });
for (const f of ["GeneralSans-Variable.woff2", "GeneralSans-LICENSE.txt"])
  fs.copyFileSync(path.join(REPO, "src/app/fonts", f), path.join(OUT, "assets/fonts", f));

// ── Preview cards ────────────────────────────────────────────────────────────
const BASE = `body { margin: 0; padding: 20px; font-size: 14px; line-height: 20px; -webkit-font-smoothing: antialiased; }
.modes { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.mode { background: var(--bg); color: var(--text-primary); border: 1px solid var(--border); border-radius: var(--radius-nested); padding: 14px; }
.label { font-size: 10px; line-height: 14px; font-weight: 600; letter-spacing: 0.025em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; }
.mono { font-family: var(--font-mono); font-size: 10px; line-height: 14px; color: var(--text-muted); }
.row { display: grid; grid-template-columns: 28px 1fr auto; align-items: center; gap: 10px; padding: 4px 0; }
.sw { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--border); box-sizing: border-box; }
.aa { display: grid; place-items: center; background: var(--card); font-size: 12px; font-weight: 600; }
.nm { font-size: 12px; line-height: 16px; font-weight: 500; }
.sub { font-size: 11px; line-height: 15px; color: var(--text-muted); }`;

const card = ({ file, group, name, subtitle, w, h, style = "", body }) =>
  write(
    `guidelines/${file}.card.html`,
    `<!-- @dsCard group="${group}" viewport="${w}x${h}" name="${name}" subtitle="${subtitle}" -->
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" />
<link rel="stylesheet" href="../styles.css" />
<style>
${BASE}
${style}
</style></head>
<body>
${body}
</body></html>
`,
  );

const modes = (fn) => `<div class="modes">
<div class="mode"><div class="label">Dark</div>
${fn("dark")}
</div>
<div class="mode" data-theme="light"><div class="label">Light</div>
${fn("light")}
</div>
</div>`;

const swatchRows = (names, mode, notes = {}) =>
  names
    .map((n) => {
      const sw = n.startsWith("text-")
        ? `<span class="sw aa" style="color:var(--${n})">Aa</span>`
        : `<span class="sw" style="background:var(--${n})"></span>`;
      const note = notes[n] ? `<div class="sub">${notes[n]}</div>` : "";
      return `<div class="row">${sw}<div><div class="nm">--${n}</div>${note}</div><span class="mono">${esc(val(n, mode))}</span></div>`;
    })
    .join("\n");

card({
  file: "colors-surfaces",
  group: "Colors",
  name: "Surfaces & text",
  subtitle: "Near-black grounds, two text tones; light mode resolves the same names flat",
  w: 700,
  h: 380,
  body: modes((m) =>
    swatchRows(["bg", "card", "card-sunken", "card-raised", "border", "text-primary", "text-muted"], m, {
      bg: "Page ground",
      card: "Default card",
      "card-sunken": "Content carries the weight",
      "card-raised": "Ground for controls",
      border: "Every 1px edge and row rule",
      "text-primary": "Anything being read",
      "text-muted": "Labels and chrome",
    }),
  ),
});

card({
  file: "colors-accent",
  group: "Colors",
  name: "Accent",
  subtitle: "Locked cyan, rationed to about one use per screen",
  w: 700,
  h: 290,
  style: `.demo { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: var(--radius-pill); background: var(--card-raised); }
.seg span { padding: 4px 12px; border-radius: var(--radius-pill); font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-muted); }
.seg .on { background: var(--accent); color: var(--bg); }
.chip { padding: 4px 10px; border-radius: var(--radius-pill); background: var(--accent-soft); color: var(--accent); font-size: 12px; line-height: 16px; font-weight: 500; }`,
  body: modes(
    (m) =>
      swatchRows(["accent", "accent-deep", "accent-soft"], m, {
        accent: "The one primary action",
        "accent-deep": "Hero gradient end, CTA base",
        "accent-soft": "Active sort, filter chip, selection",
      }) +
      `\n<div class="demo"><div class="seg"><span>7d</span><span class="on">14d</span><span>30d</span></div><span class="chip">TikTok</span></div>`,
  ),
});

card({
  file: "colors-semantic",
  group: "Colors",
  name: "Semantic",
  subtitle: "A severity ladder: these carry meaning, never style",
  w: 700,
  h: 340,
  body: modes((m) =>
    swatchRows(["ok", "warn", "orange", "danger", "danger-deep", "info"], m, {
      ok: "Healthy, active, within budget",
      warn: "Needs attention, stale data",
      orange: "Collapsing, system error",
      danger: "Banned, failed, destructive",
      "danger-deep": "Shadowbanned",
      info: "Neutral information",
    }),
  ),
});

const PILLS = [
  ["Active", "color:var(--ok)"],
  ["Ramping", "color:var(--accent)"],
  ["Scheduled", "color:var(--info)"],
  ["Paused", "color:var(--text-muted)"],
  ["Throttled", "color:var(--pill-yellow)"],
  ["Collapsing", "color:var(--pill-amber)"],
  ["Banned", "color:var(--pill-red)"],
  ["Shadowbanned", "background:var(--danger-deep);color:#fff"],
];
card({
  file: "colors-status-pills",
  group: "Colors",
  name: "Status pills",
  subtitle: "One neutral ground, coloured label, no dot; Shadowbanned is the only solid pill",
  w: 700,
  h: 350,
  style: `.pills { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.pill { display: inline-flex; align-items: center; border-radius: var(--radius-pill); padding: 2px 10px; font-size: 12px; line-height: 16px; font-weight: 500; white-space: nowrap; background: var(--pill-bg); }`,
  body: modes(
    (m) =>
      `<div class="pills">${PILLS.map(([l, s]) => `<span class="pill" style="${s}">${l}</span>`).join("")}</div>\n` +
      swatchRows(["pill-bg", "pill-yellow", "pill-amber", "pill-red"], m),
  ),
});

const TT = [[0, 80], [40, 70], [80, 74], [120, 52], [160, 58], [200, 34], [240, 40], [280, 22]];
const IG = [[0, 96], [40, 92], [80, 88], [120, 90], [160, 78], [200, 80], [240, 70], [280, 66]];
const pts = (p) => p.map((x) => x.join(",")).join(" ");
const area = (p) => `M${p.map((x) => x.join(",")).join(" L")} L280,120 L0,120 Z`;
const grad = (id, color) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" style="stop-color:var(${color});stop-opacity:0.2"/><stop offset="100%" style="stop-color:var(${color});stop-opacity:0"/></linearGradient>`;
card({
  file: "colors-chart",
  group: "Colors",
  name: "Chart chrome",
  subtitle: "TikTok is accent, Instagram is info, everywhere; dashed grid and cursor",
  w: 700,
  h: 350,
  style: `.legend { display: flex; gap: 12px; font-size: 12px; line-height: 16px; color: var(--text-muted); margin-bottom: 8px; }
.legend i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
svg { display: block; margin-bottom: 8px; }`,
  body: modes(
    (m) => `<div class="legend"><span><i style="background:var(--accent)"></i>TikTok</span><span><i style="background:var(--info)"></i>Instagram</span></div>
<svg viewBox="0 0 280 120" width="100%" height="120" preserveAspectRatio="none">
<defs>${grad(`${m}-tt`, "--accent")}${grad(`${m}-ig`, "--info")}</defs>
${[20, 50, 80, 110].map((y) => `<line x1="0" x2="280" y1="${y}" y2="${y}" style="stroke:var(--chart-grid)" stroke-dasharray="2 4"/>`).join("")}
<path d="${area(IG)}" fill="url(#${m}-ig)"/><polyline points="${pts(IG)}" fill="none" style="stroke:var(--info)" stroke-width="1.5"/>
<path d="${area(TT)}" fill="url(#${m}-tt)"/><polyline points="${pts(TT)}" fill="none" style="stroke:var(--accent)" stroke-width="1.5"/>
<line x1="200" x2="200" y1="0" y2="120" style="stroke:var(--chart-cursor)" stroke-dasharray="2 4"/>
<circle cx="200" cy="34" r="4" style="fill:var(--accent);stroke:var(--bg)" stroke-width="2"/>
</svg>
${swatchRows(["chart-grid", "chart-cursor"], m)}`,
  ),
});

card({
  file: "material-glass",
  group: "Material",
  name: "Glass & glow",
  subtitle: "Glass needs glow; a blur over a flat fill shows nothing",
  w: 700,
  h: 390,
  style: `.stage { position: relative; height: 210px; overflow: hidden; border-radius: 12px; background: var(--bg); margin-bottom: 10px; }
.tile { position: absolute; left: 12px; top: 12px; width: 170px; padding: 16px; border-radius: var(--radius-card); color: var(--text-muted); }
.big { margin-top: 6px; font-size: 20px; line-height: 28px; font-weight: 600; color: var(--text-primary); }
.panel { position: absolute; right: 12px; bottom: 12px; width: 160px; padding: 12px; border-radius: var(--radius-nested); border: 1px solid var(--border); display: grid; gap: 2px; }`,
  body: modes(
    (m) => `<div class="stage">
<div class="tile glass dot-fade"><div class="t-overline">Views · 7d</div><div class="big tnum">1.24M</div></div>
<div class="panel glass-overlay"><div class="t-overline">Notifications</div><div class="t-secondary">Profile 59 · Throttled</div><div class="t-secondary">3 drafts ready</div></div>
<div class="glow-layer" style="height:100%"><span style="width:170px;height:430px;left:-30px;top:-150px;background:var(--glow-a)"></span><span style="width:150px;height:380px;right:-50px;top:-120px;background:var(--glow-b)"></span></div>
</div>
<div class="mono">${["glass", "glass-border", "overlay-veil", "glow-a"].map((n) => `--${n}: ${esc(val(n, m))}`).join("<br>")}</div>`,
  ),
});

card({
  file: "material-cards",
  group: "Material",
  name: "Cards & shadow",
  subtitle: "Borders do most of the work; light mode drops every shadow",
  w: 700,
  h: 250,
  style: `.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.c { height: 84px; box-sizing: border-box; border-radius: var(--radius-card); border: 1px solid var(--border); box-shadow: var(--sh-card); padding: 12px 14px; color: var(--text-muted); }
.hero { background: linear-gradient(135deg, var(--accent), var(--accent-deep)); border-color: color-mix(in srgb, var(--accent) 40%, transparent); box-shadow: var(--sh-hero); color: var(--bg); }`,
  body: modes(
    (m) => `<div class="cards">
<div class="c" style="background:var(--card)"><span class="t-secondary">Card</span></div>
<div class="c" style="background:var(--card-sunken)"><span class="t-secondary">Sunken</span></div>
<div class="c hero"><span class="t-secondary">Hero</span></div>
</div>
<div class="mono" style="margin-top:12px">--sh-card: ${esc(val("sh-card", m))}<br>--sh-hero: ${esc(val("sh-hero", m))}</div>`,
  ),
});

const RAMP = [
  ["Page title", "t-page-title", "Fleet overview", "20/28 · 600", "h1"],
  ["Section heading", "t-section", "Account health", "16/24 · 600", "h2"],
  ["Card title", "t-card-title", "Views this week", "14/20 · 500, 16/24 on phones", "div"],
  ["Sub-heading", "t-sub", "Character 5", "14/20 · 600", "div"],
  ["Overline", "t-overline", "Active filters", "12/16 · 600 · uppercase", "div"],
  ["Control label", "t-control", "Last 14 days", "12/16 · 500", "div"],
  ["Body", "t-body", "Posted 14 times across five accounts", "14/20 · 400", "div"],
  ["Secondary", "t-secondary", "Updated 3 min ago", "12/16 · 400", "div"],
  ["Hint", "t-hint", "Resets at midnight ET", "11/15 · 400", "div"],
  ["Micro", "t-micro", "GLP day 16", "10/14 · 600 · the floor", "div"],
];
card({
  file: "type-ramp",
  group: "Type",
  name: "Type ramp",
  subtitle: "General Sans throughout; 10px is the floor",
  w: 700,
  h: 460,
  style: `h1, h2 { margin: 0; }
.r { display: grid; grid-template-columns: 120px 1fr auto; align-items: baseline; gap: 16px; padding: 9px 0; border-top: 1px solid var(--border); }
.r:first-of-type { border-top: 0; }`,
  body:
    `<div class="t-overline" style="margin-bottom:8px">General Sans 200–700 · Geist Mono</div>\n` +
    RAMP.map(
      ([role, cls, text, spec, tag]) =>
        `<div class="r"><span class="mono">${role}</span><${tag} class="${cls}">${text}</${tag}><span class="mono">${spec}</span></div>`,
    ).join("\n"),
});

// General Sans digits already render equal-width, so a proportional column
// beside a tabular one looks identical. The card shows the rule, not a contrast.
const NUMS = ["1,111", "48,904", "7,210", "302,118"];
card({
  file: "type-numbers",
  group: "Type",
  name: "Tabular figures",
  subtitle: "Every number is tabular; numeric columns right-align",
  w: 700,
  h: 230,
  style: `.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.col { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-nested); padding: 14px; }
.n { text-align: right; font-size: 20px; line-height: 28px; font-weight: 500; }
.m { font-family: var(--font-mono); font-size: 14px; line-height: 28px; color: var(--text-primary); }`,
  body: `<div class="cols">
<div class="col"><div class="label">Numeric column · .tnum · right-aligned</div>${NUMS.map((n) => `<div class="n tnum">${n}</div>`).join("")}</div>
<div class="col"><div class="label">Geist Mono</div>${["prof_059", "prof_060", "prof_062", "prof_073"].map((n) => `<div class="m">${n}</div>`).join("")}</div>
</div>`,
});

const SPACE = [
  [2, "0.5", "Segmented track padding, pill vertical padding"],
  [4, "1", "Icon-to-label gap, chip internals"],
  [8, "2", "Control gaps"],
  [10, "2.5", "Pill horizontal padding, nav row gap"],
  [12, "3", "Between cards"],
  [14, "3.5", "Search field and dropdown horizontal padding"],
  [16, "4", "Button horizontal padding, header column gap"],
  [20, "5", "Card padding, title to content"],
  [24, "6", "Page padding, dialog padding"],
];
card({
  file: "spacing-scale",
  group: "Spacing",
  name: "Spacing scale",
  subtitle: "4px scale: 12 between cards, 20 inside, 24 around the page",
  w: 700,
  h: 310,
  style: `.s { display: grid; grid-template-columns: 90px 70px 200px 1fr; align-items: center; gap: 12px; height: 30px; }
.bar { height: 10px; border-radius: var(--radius-bar); background: color-mix(in srgb, var(--text-muted) 35%, transparent); }`,
  body: SPACE.map(
    ([px, step, role]) =>
      `<div class="s"><span class="mono">--space-${px}</span><span class="mono">${step} · ${px}px</span><div class="bar" style="width:var(--space-${px});min-width:2px;transform-origin:left;transform:scaleX(8)"></div><span class="t-secondary" style="color:var(--text-muted)">${role}</span></div>`,
  ).join("\n"),
});

card({
  file: "spacing-radius",
  group: "Spacing",
  name: "Radius & nesting",
  subtitle: "24 outside, 16 inside, pill for anything you click",
  w: 700,
  h: 330,
  style: `.wrap { max-width: 400px; }
.shapes { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-top: 20px; }
.shape { height: 72px; border: 1px solid var(--text-muted); box-sizing: border-box; margin-bottom: 8px; }
.outer { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-card); padding: var(--pad-card); display: grid; gap: var(--space-20); box-shadow: var(--sh-card); }
.inner { border: 1px solid var(--border); background: color-mix(in srgb, var(--bg) 60%, transparent); border-radius: var(--radius-nested); padding: 12px; display: grid; gap: 10px; }
.line { display: flex; align-items: center; gap: 8px; }
.navicon { width: 32px; height: 32px; border-radius: var(--radius-nav-icon); background: var(--card-raised); }
.btn { border-radius: var(--radius-pill); border: 1px solid var(--border); background: var(--card-raised); padding: 6px 14px; color: var(--text-muted); }
.barcode { height: 14px; border-radius: var(--radius-bar); background: color-mix(in srgb, var(--text-muted) 20%, transparent); }`,
  body: `<div class="wrap">
<div class="outer"><div class="t-card-title">Account health</div>
<div class="inner"><div class="line"><div class="navicon"></div><span class="btn t-control">Pause</span><span class="btn t-control">Details</span></div><div class="barcode"></div></div>
</div>
</div>
<div class="shapes">
${[
  ["radius-card", "24px", "Cards, dialogs"],
  ["radius-nested", "16px", "Inside a card"],
  ["radius-pill", "999px", "Every control"],
  ["radius-nav-icon", "10px", "Nav icon"],
  ["radius-bar", "4px", "Barcode bar"],
]
  .map(
    ([n, v, role]) =>
      `<div><div class="shape" style="border-radius:var(--${n})"></div><div class="nm">--${n}</div><div class="sub">${role} · ${v}</div></div>`,
  )
  .join("\n")}
</div>`,
});

// ── Local preview bundle (--preview) ─────────────────────────────────────────
// Claude Design compiles its own _ds_bundle.js from components/**/*.jsx. To
// screenshot the component cards before uploading, this writes a stand-in that
// transpiles the same files in the browser with the Babel the cards already
// load. It is for local checks only and is never uploaded.
if (process.argv.includes("--preview")) {
  const ORDER = ["icon", "identity", "surfaces", "buttons", "pills", "forms", "feedback", "data"];
  let src = "var E = {};\n";
  for (const dir of ORDER) {
    const d = path.join(OUT, "components", dir);
    for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".jsx")).sort()) {
      let code = fs.readFileSync(path.join(d, f), "utf8");
      const names = [...code.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]);
      code = code
        .replace(/^import React from "react";$/m, "")
        .replace(/^import \{([^}]+)\} from "[^"]+";$/gm, "const {$1} = E;")
        .replace(/^export (function|const) /gm, "$1 ");
      src += `(function () {\n${code}\nObject.assign(E, { ${names.join(", ")} });\n})();\n`;
    }
  }
  src += "return E;\n";
  write(
    "_ds_bundle.js",
    `// LOCAL PREVIEW ONLY. Never upload: Claude Design generates its own _ds_bundle.js.
(function () {
  var out = Babel.transform(${JSON.stringify(src)}, { presets: ["react"], parserOpts: { allowReturnOutsideFunction: true } }).code;
  window.PeptideMiraclesDashboard_26e60f = new Function("React", out)(window.React);
})();
`,
  );
}

console.log(
  `built ${path.relative(REPO, OUT)} · ${dark.size} dark tokens, ${light.size} light · ${iconNames.length} icons` +
    (process.argv.includes("--preview") ? " · with local preview bundle" : ""),
);
