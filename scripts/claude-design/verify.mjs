// Checks ./dist (from build.mjs) against src/app/globals.css before anything is
// uploaded to Claude Design. Exits non-zero and names every problem it finds.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const OUT = path.join(HERE, "dist");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const norm = (v) => v.replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim();
const failures = [];

function block(text, re) {
  const m = text.match(re);
  if (!m) throw new Error("block not found " + re);
  let j = text.indexOf("{", m.index) + 1;
  const i = j;
  let depth = 1;
  while (depth) {
    const c = text[j++];
    if (c === undefined) throw new Error("unbalanced braces");
    if (c === "{") depth++;
    else if (c === "}") depth--;
  }
  return text.slice(i, j - 1);
}
const tokens = (body) => new Map([...body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], norm(m[2])]));

if (!fs.existsSync(OUT)) throw new Error("no dist/ — run build.mjs first");

const g = strip(fs.readFileSync(path.join(REPO, "src/app/globals.css"), "utf8"));
const gDark = tokens(block(g, /(^|\n):root\s*\{/));
const gLight = tokens(block(g, /:root\[data-theme="light"\]\s*\{/));
const gTheme = tokens(block(g, /@theme inline\s*\{/));

const bDark = new Map();
const bLight = new Map();
for (const f of ["colors", "material"]) {
  const t = strip(fs.readFileSync(path.join(OUT, `tokens/${f}.css`), "utf8"));
  for (const [k, v] of tokens(block(t, /(^|\n):root\s*\{/))) bDark.set(k, v);
  for (const [k, v] of tokens(block(t, /\[data-theme="light"\]\s*\{/))) bLight.set(k, v);
}
for (const [k, v] of gDark) if (bDark.get(k) !== v) failures.push(`dark --${k}: app "${v}" vs bundle "${bDark.get(k)}"`);
for (const [k, v] of gLight) if (bLight.get(k) !== v) failures.push(`light --${k}: app "${v}" vs bundle "${bLight.get(k)}"`);
for (const k of bDark.keys()) if (!gDark.has(k)) failures.push(`bundle has extra dark --${k}`);

const spacing = tokens(strip(fs.readFileSync(path.join(OUT, "tokens/spacing.css"), "utf8")));
for (const k of ["radius-card", "radius-nested"])
  if (spacing.get(k) !== gTheme.get(k)) failures.push(`--${k}: app ${gTheme.get(k)} vs bundle ${spacing.get(k)}`);

// Every var(--x) used anywhere must be defined somewhere in the bundle.
const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else files.push(p);
  }
};
walk(OUT);
const text = files
  .filter((f) => /\.(css|html|jsx)$/.test(f))
  .map((f) => fs.readFileSync(f, "utf8"))
  .join("\n");
const defined = new Set([...strip(text).matchAll(/--([a-z0-9-]+)["']?\s*:/g)].map((m) => m[1]));
const used = new Set([...text.matchAll(/var\(--([a-z0-9-]+)/g)].map((m) => m[1]));
for (const u of used) if (!defined.has(u)) failures.push(`var(--${u}) used but never defined`);

// Claude Design indexes a preview card only if its first line is the marker.
for (const f of files.filter((f) => f.endsWith(".card.html")))
  if (!fs.readFileSync(f, "utf8").startsWith("<!-- @dsCard ")) failures.push(`${path.basename(f)} missing @dsCard first line`);

// Components. Claude Design's adherence lint flags raw colours and pixel strings
// in JSX, so none are allowed. Every pm- class must exist in components.css,
// every <Icon name> must exist, every component file needs type docs, and the
// generated logo and platform marks must carry the app's exact path data.
const jsx = files.filter((f) => f.endsWith(".jsx"));
const classes = new Set(
  [...fs.readFileSync(path.join(OUT, "components/components.css"), "utf8").matchAll(/\.(pm-[a-z0-9_-]+)/g)].map((m) => m[1]),
);
const iconNames = new Set(
  [...fs.readFileSync(path.join(OUT, "components/icon/Icon.jsx"), "utf8").matchAll(/^ {2}(\w+): \{/gm)].map((m) => m[1]),
);
for (const f of jsx) {
  const rel = path.relative(OUT, f);
  const code = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  if (/#[0-9a-fA-F]{3,8}\b/.test(code)) failures.push(`${rel}: raw hex colour`);
  if (/["'`][^"'`\n]*\b\d+px\b/.test(code)) failures.push(`${rel}: raw px string`);
  for (const m of code.matchAll(/\bpm-[a-z0-9_-]*[a-z0-9]/g)) if (!classes.has(m[0])) failures.push(`${rel}: class ${m[0]} not in components.css`);
  const dts = f.replace(/\.jsx$/, ".d.ts");
  const docs = fs.existsSync(dts) ? fs.readFileSync(dts, "utf8") : "";
  if (!docs) failures.push(`${rel}: no .d.ts`);
  for (const m of code.matchAll(/^export function (\w+)/gm)) if (docs && !docs.includes(`function ${m[1]}(`)) failures.push(`${rel}: ${m[1]} missing from .d.ts`);
}
for (const f of files.filter((f) => /\.(jsx|html)$/.test(f)))
  for (const m of fs.readFileSync(f, "utf8").matchAll(/<Icon[^>]*\bname="(\w+)"/g))
    if (!iconNames.has(m[1])) failures.push(`${path.relative(OUT, f)}: unknown icon ${m[1]}`);
for (const [source, generated] of [
  ["peptide-mark.tsx", "components/identity/PeptideMark.jsx"],
  ["brand-icons.tsx", "components/identity/BrandIcons.jsx"],
]) {
  const out = fs.readFileSync(path.join(OUT, generated), "utf8");
  for (const m of fs.readFileSync(path.join(REPO, "src/components/ui", source), "utf8").matchAll(/ d="([^"]+)"/g))
    if (!out.includes(m[1])) failures.push(`${generated}: path data differs from ${source}`);
}
if (fs.existsSync(path.join(OUT, "_ds_bundle.js"))) console.log("note: dist/_ds_bundle.js is the local preview bundle; never upload it");

console.log(
  `app: ${gDark.size} dark, ${gLight.size} light · bundle: ${bDark.size} dark, ${bLight.size} light · ${jsx.length} component files, ${iconNames.size} icons · ${files.length} files`,
);
if (failures.length) {
  console.log(`FAIL\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("PASS: every value matches globals.css, every var() resolves, every card has its marker");
