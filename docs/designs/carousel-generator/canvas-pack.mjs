#!/usr/bin/env node
/*
 * Stand-in for the /design skill's seed-canvas.mjs, which was not on the
 * machine on 2026-09-17. A saved Design canvas page keeps its whole content in one JSON
 * block: <script type="application/json" id="appifact-doc">{ title, content:
 * { files }, comments }</script>. Text files (.dc.html, canvas.json) are
 * stored as strings; images as plain base64 strings. Everything else in the
 * page is the editor and stays as it was.
 *
 *   node canvas-pack.mjs --extract <page.html> --to <dir>
 *   node canvas-pack.mjs --pack --template <page.html> --from <dir> --out <page.html> [--title "..."]
 *   node canvas-pack.mjs --check <page.html>
 *
 * --check reads the manifest back: every artboard listed is present, sits on a
 * page that exists, uses only images the canvas carries, and does not overlap
 * another board on its own page.
 */
import fs from "node:fs";
import path from "node:path";

const a = process.argv.slice(2);
const flag = (n) => a.includes(`--${n}`);
const val = (n) => {
  const i = a.indexOf(`--${n}`);
  return i >= 0 ? a[i + 1] : undefined;
};
const OPEN = '<script type="application/json" id="appifact-doc">';

function split(html) {
  const open = html.indexOf(OPEN);
  if (open < 0) throw new Error("no appifact-doc block in the page");
  const start = open + OPEN.length;
  const end = html.indexOf("</script>", start);
  return { before: html.slice(0, start), json: html.slice(start, end), after: html.slice(end) };
}
const isText = (n) => n.endsWith(".dc.html") || n.endsWith(".json") || n.endsWith(".js") || n.endsWith(".css") || n.endsWith(".svg") || n.endsWith(".txt") || n.endsWith(".md");

if (flag("extract")) {
  const html = fs.readFileSync(val("extract"), "utf8");
  const doc = JSON.parse(split(html).json);
  const to = val("to");
  fs.mkdirSync(to, { recursive: true });
  for (const [n, v] of Object.entries(doc.content.files)) {
    if (typeof v !== "string") fs.writeFileSync(path.join(to, n), JSON.stringify(v, null, 2));
    else if (isText(n)) fs.writeFileSync(path.join(to, n), v);
    else fs.writeFileSync(path.join(to, n), Buffer.from(v.replace(/^data:[^,]*,/, ""), "base64"));
  }
  console.log(`extracted ${Object.keys(doc.content.files).length} files of "${doc.title}" to ${to}`);
} else if (flag("pack")) {
  const html = fs.readFileSync(val("template"), "utf8");
  const { before, json, after } = split(html);
  const old = JSON.parse(json);
  const from = val("from");
  const files = {};
  for (const n of fs.readdirSync(from).sort()) {
    if (n.startsWith(".")) continue;
    files[n] = isText(n) ? fs.readFileSync(path.join(from, n), "utf8") : fs.readFileSync(path.join(from, n)).toString("base64");
  }
  const title = val("title") || old.title;
  const doc = { title, content: { files }, comments: old.comments || [] };
  /* The JSON sits inside a <script>, so "</script" must not appear literally. */
  const packed = JSON.stringify(doc).replace(/<\//g, "<\\/");
  let out = before + packed + after;
  if (title !== old.title) out = out.split(old.title).join(title);
  fs.writeFileSync(val("out"), out);
  console.log(`packed ${Object.keys(files).length} files as "${title}" → ${val("out")} (${(out.length / 1048576).toFixed(1)} MB)`);
} else if (flag("check")) {
  const html = fs.readFileSync(val("check"), "utf8");
  const doc = JSON.parse(split(html).json);
  const files = doc.content.files;
  const manifest = JSON.parse(files["canvas.json"]);
  const problems = [];
  for (const b of manifest.artboards) if (!files[b.file]) problems.push(`artboard ${b.file} listed but missing`);
  /* The Prototype canvas is a single page and has no pages list. */
  const pageList = manifest.pages || [];
  const pages = new Set(pageList.map((p) => p.id));
  for (const b of manifest.artboards) if (b.page && !pages.has(b.page)) problems.push(`artboard ${b.file} on unknown page ${b.page}`);
  for (const [n, v] of Object.entries(files)) {
    if (!n.endsWith(".dc.html")) continue;
    for (const m of v.matchAll(/url\("\.\/([^"]+)"\)/g)) if (!files[m[1]]) problems.push(`${n} uses ${m[1]}, not in the canvas`);
  }
  /* Two boards sitting on top of each other on the same page. Easy to write by hand (a phone board after a desktop
     one steps a whole 1540, not the 470 that separates two phone boards) and invisible until someone opens the
     canvas — Garreth found the first one, 2026-09-22. */
  const hits = (p, q) => p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h;
  const boards = manifest.artboards;
  for (let i = 0; i < boards.length; i++) {
    for (let j = i + 1; j < boards.length; j++) {
      const one = boards[i], two = boards[j];
      if ((one.page ?? "") !== (two.page ?? "")) continue;
      if (hits(one, two)) problems.push(`${one.file} and ${two.file} overlap on page ${one.page ?? "(none)"} — ${one.file} at ${one.x},${one.y} (${one.w}x${one.h}), ${two.file} at ${two.x},${two.y} (${two.w}x${two.h})`);
    }
  }
  if (!files["Main.dc.html"]) console.log("note: no Main.dc.html (expected for a multi-ticket canvas)");
  console.log(`"${doc.title}": ${pageList.length} pages, ${manifest.artboards.length} artboards, ${Object.keys(files).length} files, ${(html.length / 1048576).toFixed(1)} MB`);
  if (problems.length) {
    console.log(problems.join("\n"));
    process.exit(1);
  }
  console.log("ok");
} else {
  console.log("usage: --extract <page> --to <dir> | --pack --template <page> --from <dir> --out <page> [--title t] | --check <page>");
}
