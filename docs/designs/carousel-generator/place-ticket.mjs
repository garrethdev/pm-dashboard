#!/usr/bin/env node
/*
 * Put one design ticket's screens onto the shared "Carousel Generator Designs"
 * canvas, leaving every other ticket's pages exactly as they are.
 *
 * Several sessions design tickets in parallel, each on its own branch, so no
 * session can rebuild the whole canvas: its branch only holds its own ticket.
 * Instead each one loads the saved canvas, swaps in its own pages, and saves.
 * See docs/designs/README.md for the full steps.
 *
 *   node place-ticket.mjs --ticket D3 --theme dark --from <ticket build dir> --out <dir>
 *        [--canvas <extracted saved canvas dir>]
 *
 * --from    what dN-<name>.build.mjs wrote: *.dc.html plus canvas.json.
 * --theme   dark or light: which of the build's pages to place. Dark and
 *           light live on separate canvases (Garreth, 2026-09-15), so a
 *           ticket is placed once per theme, each onto its own canvas. Left
 *           out, every page of the build is placed (the old single canvas).
 * --canvas  the saved canvas, unpacked with the /design skill's --extract.
 *           Leave it out only when starting a brand-new canvas.
 * --out     a fresh directory; receives the merged artboards and canvas.json.
 *
 * Ownership is by name: a ticket owns the artboards named "D3-*.dc.html", the
 * images named "d3-*", the pages whose id starts "d3-", and the notes on those
 * pages. Those are replaced;
 * everything else is copied through untouched.
 */
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, a, i, all) => (a.startsWith("--") ? [...pairs, [a.slice(2), all[i + 1]]] : pairs), []),
);
const fail = (msg) => {
  console.error(`place-ticket: ${msg}`);
  process.exit(1);
};

const T = String(args.ticket ?? "").toUpperCase();
if (!/^D\d+$/.test(T)) fail("--ticket must look like D3");
if (!args.from || !args.out) fail("--from and --out are required");
const t = T.toLowerCase();
const THEME = args.theme ? String(args.theme).toLowerCase() : null;
if (THEME && THEME !== "dark" && THEME !== "light") fail("--theme must be dark or light");
const FROM = path.resolve(args.from);
const OUT = path.resolve(args.out);
const CANVAS = args.canvas ? path.resolve(args.canvas) : null;
if (fs.existsSync(OUT) && fs.readdirSync(OUT).length) fail(`--out ${OUT} is not empty`);

const readManifest = (dir) => {
  const f = path.join(dir, "canvas.json");
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
};
const ownsFile = (file) => file.startsWith(`${T}-`);
const ownsId = (id) => String(id ?? "").startsWith(`${t}-`);

/* The saved canvas, minus whatever this ticket owned before. */
const base = CANVAS ? readManifest(CANVAS) : {};
const keptPages = (base.pages ?? []).filter((p) => !ownsId(p.id));
const droppedPages = new Set((base.pages ?? []).filter((p) => ownsId(p.id)).map((p) => p.id));
const firstBasePage = base.pages?.[0]?.id;
const onDroppedPage = (item) => droppedPages.has(item.page ?? firstBasePage);
const keptArtboards = (base.artboards ?? []).filter((a) => !ownsFile(a.file) && !onDroppedPage(a));
const keptNotes = (base.annotations ?? []).filter((n) => !ownsId(n.id) && !onDroppedPage(n));

/* The ticket's own build, renamed into its namespace. */
const mine = readManifest(FROM);
const allPages = mine.pages?.length ? mine.pages : [{ id: "dark", name: "Dark" }];
const firstPage = allPages[0].id;
/* With --theme, only that page of the build is placed; the build's other pages go to the other canvas. */
const srcPages = THEME ? allPages.filter((p) => p.id === THEME) : allPages;
if (!srcPages.length) fail(`${T}'s build has no "${THEME}" page (it has: ${allPages.map((p) => p.id).join(", ")})`);
const placing = new Set(srcPages.map((p) => p.id));
const pageId = (id) => `${t}-${id}`;
const newPages = srcPages.map((p) => ({ id: pageId(p.id), name: `${T} · ${p.name}` }));
const defaultPage = pageId(srcPages[0].id);
const listed = new Map((mine.artboards ?? []).map((a) => [a.file, a]));
const dcFiles = fs
  .readdirSync(FROM)
  .filter((f) => f.endsWith(".dc.html"))
  .filter((f) => placing.has(listed.get(f)?.page ?? firstPage));
if (!dcFiles.length) fail(`no .dc.html artboards in ${FROM}${THEME ? ` on its ${THEME} page` : ""}`);
const newArtboards = dcFiles.map((file, i) => {
  const a = listed.get(file) ?? { file, x: i * 1540, y: 0, w: 1440, h: 900 };
  return { ...a, file: `${T}-${file}`, page: a.page ? pageId(a.page) : defaultPage };
});
const newNotes = (mine.annotations ?? [])
  .filter((n) => placing.has(n.page ?? firstPage))
  .map((n) => ({
    ...n,
    id: ownsId(n.id) ? n.id : `${t}-${n.id}`.slice(0, 40),
    page: n.page ? pageId(n.page) : defaultPage,
  }));

/* Pages in ticket order (D1, D2 … D10), a ticket's own pages in its order. */
const ticketNo = (id) => {
  const m = /^d(\d+)-/.exec(id);
  return m ? Number(m[1]) : -1;
};
const pages = [...keptPages, ...newPages]
  .map((p, i) => ({ p, i }))
  .sort((a, b) => ticketNo(a.p.id) - ticketNo(b.p.id) || a.i - b.i)
  .map(({ p }) => p);

/* Write: kept files from the saved canvas, then this ticket's. */
fs.mkdirSync(OUT, { recursive: true });
if (CANVAS) {
  const keep = new Set(keptArtboards.map((a) => a.file));
  for (const f of fs.readdirSync(CANVAS)) {
    if (f === "canvas.json") continue;
    if (f.endsWith(".dc.html") && !keep.has(f)) continue;
    if (!f.endsWith(".dc.html") && f.startsWith(`${t}-`)) continue;
    fs.copyFileSync(path.join(CANVAS, f), path.join(OUT, f));
  }
}
for (const f of fs.readdirSync(FROM)) {
  if (f === "canvas.json") continue;
  if (f.endsWith(".dc.html") && !dcFiles.includes(f)) continue;
  const dest = f.endsWith(".dc.html") ? `${T}-${f}` : f;
  if (!f.endsWith(".dc.html") && !f.startsWith(`${t}-`)) fail(`image ${f} must be named ${t}-<name> so the ticket owns it`);
  fs.copyFileSync(path.join(FROM, f), path.join(OUT, dest));
}
const manifest = {
  pages,
  artboards: [...keptArtboards, ...newArtboards],
  ...(keptNotes.length + newNotes.length ? { annotations: [...keptNotes, ...newNotes] } : {}),
  /* Open on the page the ticket's own build names (its newest work), else its first page. */
  launch: { view: "canvas", page: mine.launch?.page && placing.has(mine.launch.page) ? pageId(mine.launch.page) : defaultPage },
};
fs.writeFileSync(path.join(OUT, "canvas.json"), JSON.stringify(manifest, null, 2));

const onCanvas = fs.readdirSync(OUT).filter((f) => f.endsWith(".dc.html")).sort();
console.log(`${T}: ${newArtboards.length} artboards on ${newPages.map((p) => p.name).join(", ")}; canvas now has ${pages.length} pages, ${onCanvas.length} artboards`);
const onCanvasImages = fs.readdirSync(OUT).filter((f) => !f.endsWith(".dc.html") && f !== "canvas.json").sort();
console.log([...onCanvas.map((f) => `--artboard ${f}`), ...onCanvasImages.map((f) => `--image ${f}`)].join(" "));
