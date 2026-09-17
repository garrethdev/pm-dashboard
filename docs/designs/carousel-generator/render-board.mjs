#!/usr/bin/env node
/*
 * Render a design artboard (*.dc.html) to plain HTML without the canvas
 * runtime, for a local screenshot: runs the board's renderVals() against a
 * stub component and fills the {{holes}}, sc-if and sc-for in the markup.
 *
 *   node docs/designs/carousel-generator/render-board.mjs <board.dc.html> <out.html>
 *   then screenshot <out.html> with headless Chrome from the board folder, so
 *   the ./d10-*.jpg image links resolve (see docs/designs/README.md).
 */
import fs from "node:fs";
import vm from "node:vm";

const [, , IN, OUT] = process.argv;
const html = fs.readFileSync(IN, "utf8");
const at = html.indexOf("<script data-dc-script");
const scriptStart = html.indexOf(">", at) + 1;
const scriptEnd = html.indexOf("</script>", scriptStart);
const script = html.slice(scriptStart, scriptEnd);
const markup = html.slice(0, at);

/* The Studio's script reaches for timers and the document while it renders (the canvas's wheel listener, the
   pan-to-slide); the stub gives it no-ops so a board still fills. */
const noop = () => 0;
const sandbox = {
  console,
  setTimeout: noop, clearTimeout: noop, setInterval: noop, clearInterval: noop,
  document: { getElementById: () => null, querySelectorAll: () => [], querySelector: () => null, addEventListener: noop, removeEventListener: noop },
};
vm.createContext(sandbox);
vm.runInContext(
  `class DCLogic { constructor() { this.state = {}; } setState() {} note() {} }\n${script}\nglobalThis.__vals = new Component().renderVals();`,
  sandbox,
);
const vals = sandbox.__vals;

const lookup = (path, scopes) => {
  const parts = path.trim().split(".");
  let cur;
  let found = false;
  for (const sc of scopes) {
    if (sc && Object.prototype.hasOwnProperty.call(sc, parts[0])) {
      cur = sc[parts[0]];
      found = true;
      break;
    }
  }
  if (!found) return undefined;
  for (const p of parts.slice(1)) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
};
const show = (v) => (v == null || typeof v === "function" ? "" : String(v));
const fill = (s, scopes) => s.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, p) => show(lookup(p, scopes)));

function renderNode(str, scopes) {
  const re = /<(sc-for|sc-if)\b([^>]*)>/;
  let out = "";
  let rest = str;
  for (;;) {
    const m = re.exec(rest);
    if (!m) return out + fill(rest, scopes);
    out += fill(rest.slice(0, m.index), scopes);
    const tag = m[1];
    const attrs = m[2];
    const pos = m.index + m[0].length;
    const tok = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, "g");
    tok.lastIndex = pos;
    let depth = 1;
    let closeIdx = -1;
    let t;
    while ((t = tok.exec(rest))) {
      depth += t[0].startsWith("</") ? -1 : 1;
      if (depth === 0) {
        closeIdx = t.index;
        break;
      }
    }
    if (closeIdx < 0) throw new Error(`unclosed <${tag}> at ${pos}`);
    const inner = rest.slice(pos, closeIdx);
    if (tag === "sc-if") {
      const v = /value="\{\{\s*([^}]+?)\s*\}\}"/.exec(attrs)[1];
      if (lookup(v, scopes)) out += renderNode(inner, scopes);
    } else {
      const list = /list="\{\{\s*([^}]+?)\s*\}\}"/.exec(attrs)[1];
      const as = /as="([^"]+)"/.exec(attrs)[1];
      for (const item of lookup(list, scopes) || []) out += renderNode(inner, [{ [as]: item }, ...scopes]);
    }
    rest = rest.slice(closeIdx + tag.length + 3);
  }
}

let body = renderNode(markup, [vals]);
body = body
  .replace(/<\/?x-dc>/g, "")
  .replace(/<helmet>|<\/helmet>/g, "")
  .replace(/\s(disabled|hidden)="false"/g, "")
  .replace(/<script src="\.\/support\.js"><\/script>/g, "");
const styleMatch = /<style>([\s\S]*?)<\/style>/.exec(body);
const style = styleMatch ? styleMatch[1] : "";
body = body.replace(/<style>[\s\S]*?<\/style>/, "");
const inner = body.slice(body.indexOf("<body>") + 6, body.lastIndexOf("</body>"));
fs.writeFileSync(OUT, `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000}${style}</style></head><body>${inner}</body></html>`);
console.log(`rendered ${IN} → ${OUT}`);
