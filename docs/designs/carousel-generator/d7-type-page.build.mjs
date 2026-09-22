#!/usr/bin/env node
/*
 * D7 · A carousel type's own page — opened from a card's name on D1, or after
 * Save as carousel type in D6.
 *
 * Design step only (docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md, D7). Nothing
 * here is app code. The shell comes from generator-kit.mjs; this file is the
 * screen. All content is made-up sample data: D1's invented types ("Before &
 * After", wired; "Quiet Luxury Picks", the one not wired yet), D2's invented
 * library and direction, and bank photos from the Supabase image store as the
 * template's slides (the same shots D6 uses, named d7-*).
 *
 * Three tabs under the title, in the app's own underline-tab shape
 * (src/components/dashboard/account-detail-tabs.tsx):
 *   Overview   the template's slides across the full width, with a version
 *              dropdown, Make active and Edit template; four stat tiles beside
 *              the details; then the batches, each row opening that batch
 *   Writing    the standing instruction the copy is written from, its version
 *              picked from a dropdown with Make active beside it, and Save
 *              version; the conversation beside it, its suggested change shown
 *              against the current text; the template's text-box names along
 *              the bottom, so the instruction is written against the boxes
 *              that exist
 *   Go Live    the cadence and its rebalance across the character's other
 *              types (the cadence editor's rules and running total), Preview,
 *              Wire (a hold), and the checklist with the n8n media line to copy
 *
 * From Garreth's first review (2026-09-15):
 *   - The template's slides are the main thing on Overview, across the whole
 *     width. One version shows at a time, picked from a dropdown, with Make
 *     active beside it.
 *   - Posts left, days of cover, median views and weekly cap are four tiles
 *     under the template, the details to their right; the batches below.
 *   - The batch table is left-aligned, without Ran by, and a row opens that
 *     batch's decks.
 *   - Sections side by side are the same height, filling the screen.
 *
 * From his second review (2026-09-15):
 *   - The four tiles are narrower and the details wider. Each tile is the
 *     analytics page's stat tile: the dotted corner, no sparkline.
 *   - In the version dropdown the version showing sits in a soft accent
 *     tint; there is no tick.
 *   - Preview on the phone opens as a sheet from the bottom, like D6's.
 *   - A type's slides are 4:5 or 9:16, chosen when it is made; Details names
 *     the size and the template's slides take that shape.
 *
 * From his third review (2026-09-15): the direction's versions are the same
 * dropdown as the template's; the Versions card is gone.
 *
 * D13 (Garreth, 2026-09-21): the Direction tab is named **Writing** and the
 * Wiring tab is named **Go Live** — "Direction" read just as naturally as how
 * the deck looks, which is the Studio's job, and "Writing" and "Wiring" are
 * one letter apart sitting side by side. Writing is also required: a type with
 * none cannot generate, so its header carries the neutral pill "Needs
 * writing". **Generate stays available** (Garreth, 2026-09-22, first review):
 * it opens the Generate form, which is where the missing Writing is marked in
 * the danger stroke and required. The Writing tab is the other way there. An empty Writing editor carries a guiding
 * placeholder, and a template drafted from a reference opens with the AI's own
 * note in the editor, unsaved — Save version is still a person's press. Only
 * the screen changes: the panel ids, the state names and the field itself keep
 * the names the docs and the database use.
 *
 * D13b (Garreth, 2026-09-22): D13 made the Writing required and drew the empty
 * editor, but left the Conversation beside it a blank card asking "What should
 * change?" — a screen that asks for a standing instruction from a blank page
 * while the one thing that could help says nothing. So on a type with nothing
 * written:
 *   - The Conversation fills its card (the empty-state rule of 2026-09-19) and
 *     carries **one quiet offer**, Write a first draft, from the active
 *     template and its slides. It is secondary; Save version stays the tab's
 *     one accent.
 *   - The draft lands in the editor **unsaved**, under the same "Not saved"
 *     pill the Studio's own note gets, so a type saved out of the Studio and a
 *     type made any other way reach a first Writing the same way. Save version
 *     is still a person's press, so the requirement does not move.
 *   - The box asks **"What should this type sound like?"** until a first
 *     version is saved, and "What should change?" after. One box, two states.
 *   - On the phone the Conversation is a sheet behind the floating button, so
 *     an empty panel is never on screen: the offer sits under the editor too,
 *     and the sheet carries the same one.
 * Nothing else on the tab moves — a Conversation with a saved Writing and no
 * messages is left exactly as it was.
 *
 * From Garreth's decision on 2026-09-21: a batch that has finished a stage and
 * is waiting for a person to press something says so in the batch table, in the
 * same words the Carousel types card (D1) and the bell already use — "18 to
 * render" once the writing is done, "18 to approve" once it is rendered. Plain
 * pills, no new colour, and the row opens the screen that holds the press:
 * waiting for Render opens the written batch (D4), waiting for Approve opens
 * the finished one (D5).
 *
 * Pictures, one screen per state (Garreth's rule from D3 on); only the tabs,
 * the version dropdowns, the direction text and Preview's dialog respond.
 * Dark approved by Garreth on 2026-09-15 after five review rounds; light mode
 * designed the same day, so every board is written twice (Dark page, Light
 * page). In the prototype the page takes the type's name from the link that
 * opened it, and a link can open a tab (the Generate form's Edit opens
 * Writing).
 *
 * Run directly, it writes D7's review artboards and canvas.json:
 *   Overview         desktop (tall), Before & After
 *   OverviewVersions desktop (tall), the version dropdown open, Version 3 picked
 *   OverviewPhone    phone (tall), Before & After
 *   Writing          desktop, a suggested change shown against Version 4
 *   WritingFailed    desktop, the conversation's reply failed, Retry
 *   WritingPhone     phone, the suggested change, the conversation folded
 *   WritingVersions  desktop, the writing's version dropdown open, Version 3 picked
 *   WritingEmpty     desktop, no writing saved: the guiding placeholder (D13)
 *   WritingEmptyPhone phone, the same
 *   WritingDraft     desktop, the Studio's drafted note, unsaved (D13)
 *   NeedsWriting     desktop, Overview, the Needs writing pill beside Generate (D13)
 *   NeedsWritingPhone phone, the same
 *   WritingBefore    desktop, the blank Conversation D13 left, for comparison (D13b)
 *   WritingFirstDraft desktop, the Conversation's first draft in the editor, unsaved (D13b)
 *   WritingOfferFailed desktop, the first draft did not arrive, Retry (D13b)
 *   WritingSheetPhone phone, the Conversation's sheet with the same offer (D13b)
 *   WritingFirstDraftPhone phone, the first draft arrived, unsaved (D13b)
 *   GoLive           desktop, Quiet Luxury Picks just saved, arriving on Go Live
 *   GoLivePhone      phone, the same
 *   Mismatch         desktop, the cadence does not add up: Wire unavailable
 *   Running          desktop, Wire held and running, the checklist ticking
 *   CheckFailed      desktop, a verification failed: rolled back, the item named
 *   MediaMissing     desktop, wired, but the media entry is not in the published workflow
 *   AllTicked        desktop, wired, every item ticked
 *   Preview          desktop, Preview open: what Wire will run
 *   PreviewPhone     phone, Preview open as a sheet from the bottom
 * Imported, `typeScreen()` is the screen the prototype will open once D7 is approved.
 *
 *   node docs/designs/carousel-generator/d7-type-page.build.mjs <out dir>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { I, icon, artboard, isMain, REPO } from "./generator-kit.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const S = ".screen-type";

const D7I = {
  todo: icon("Circle", 16, "regular"),
  ok: icon("CheckCircle", 16),
  fail: icon("XCircle", 16),
  warn: icon("WarningCircle", 16),
  copy: icon("Copy", 13),
  eye: icon("Eye", 13, "bold"),
  pencil: icon("PencilSimple", 13),
  retry: icon("ArrowClockwise", 12, "bold"),
  send: icon("ArrowUp", 15, "bold"),
  spark: icon("Sparkle", 15),
  book: icon("BookOpen", 12),
  x: icon("X", 16, "bold"),
  /* D13b: the empty Conversation's circle, and the sparkle on the offer itself. */
  note: icon("NotePencil", 24),
  spark13: icon("Sparkle", 13),
  /* D15: the lane table's rows — the empty states' mark, and the pager. */
  table: icon("Table", 24),
  prev: icon("CaretLeft", 13, "bold"),
  next: icon("CaretRight", 13, "bold"),
};

/* The Peptide Miracles mark, read from the app the way the kit and D6 read it. */
const markRaw = fs.readFileSync(path.join(REPO, "src/components/ui/peptide-mark.tsx"), "utf8");
const MARK =
  `<svg viewBox="${markRaw.match(/viewBox="([^"]+)"/)[1]}" width="22" height="22" fill="currentColor" aria-hidden="true">` +
  [...markRaw.matchAll(/\sd="([^"]+)"/g)].map((m) => `<path d="${m[1]}"></path>`).join("") +
  "</svg>";

/* The template's slides and the library cover: bank photos, downsampled (the same shots as D6). */
const PHOTOS = ["mug", "journal", "yoga", "oats", "shower", "dock", "vanity"];
export function copyTypeImages(OUT) {
  for (const id of PHOTOS) fs.copyFileSync(path.join(HERE, "assets", `d7-slide-${id}.jpg`), path.join(OUT, `d7-slide-${id}.jpg`));
  fs.copyFileSync(path.join(HERE, "assets", "d7-lib-window.jpg"), path.join(OUT, "d7-lib-window.jpg"));
}

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rotate = (a, n) => a.slice(n).concat(a.slice(0, n));

/* ── Sample content ────────────────────────────────────────────────────── */

const TYPES = {
  /* Wired and posting. */
  before: {
    name: "Before & After", character: "Character 2", slides: 7, size: "4:5", short: "before_after",
    stats: [["Posts left", "14"], ["Days of cover", "6 days"], ["Median views", "31.7k"], ["Weekly cap", "3"]],
    /* The two newest finished batches are the ones waiting for a person: Sep 13 has been written and waits for
       Render, Sep 11 has been rendered and waits for Approve (Garreth, 2026-09-21). */
    batches: [
      { date: "Sep 14", req: 20, written: 7, rendered: null, approved: null, state: "running" },
      { date: "Sep 13", req: 20, written: 18, rendered: null, approved: null },
      { date: "Sep 11", req: 20, written: 20, rendered: 18, approved: null },
      { date: "Sep 6", req: 50, written: 12, rendered: null, approved: null, state: "stopped" },
      { date: "Aug 22", req: 8, written: 8, rendered: 8, approved: 8 },
      { date: "Aug 9", req: 50, written: 50, rendered: 47, approved: 44 },
    ],
    /* Template versions, newest first: each with its own hook and photo order. */
    templates: [
      { name: "Version 4", date: "Sep 12", active: true, hook: "Six months, one habit, no filters", imgs: PHOTOS },
      { name: "Version 3", date: "Aug 30", hook: "Six months without filters", imgs: rotate(PHOTOS, 2) },
      { name: "Version 2", date: "Aug 14", hook: "What six months of one habit did", imgs: rotate(PHOTOS, 4) },
      { name: "Version 1", date: "Aug 2", hook: "Before and after: six months", imgs: rotate(PHOTOS, 5) },
    ],
    lines: [
      "Month one: nothing looked different",
      "Water before coffee, every single day",
      "Month three: people started asking",
      "No new products, just sleep and water",
      "Month six: the same mirror",
      "Which habit would you start with?",
    ],
    details: [["Slide size", "4:5"], ["Short name", "before-after"], ["Created", "Aug 2 · Alex"], ["Wired", "Aug 9 · Sam"]],
    /* The template's text boxes, by the name each carries in the copy contract. D14 gives the Studio the field
       that sets them; D13 lists them here so the instruction is written against the boxes that exist. */
    boxes: ["hook", "line", "closing"],
    /* Direction versions, newest first: the text each one gave the writer. */
    directions: [
      { name: "Version 4", date: "Sep 12", by: "Alex", active: true, text: "Open on a before-and-after people can picture in their own mirror. Keep every line under twelve words, warm and plain, never clinical. The after slide names one habit, never a product, and the caption ends on a question the viewer wants to answer." },
      { name: "Version 3", date: "Aug 30", by: "Sam", text: "Open on a before-and-after people can picture in their own mirror. Keep every line under twelve words, warm and plain. The after slide names one habit, and the caption asks what the viewer would try first." },
      { name: "Version 2", date: "Aug 14", by: "Alex", text: "Lead with the after photo, then walk back to the start. Short lines, no clinical words, one habit per deck. End the caption on a question." },
      { name: "Version 1", date: "Aug 2", by: "Alex", text: "Before and after, six months apart. Plain, warm lines. Name the habit, never a product." },
    ],
    budget: 11,
    lanes: [
      { name: "Before & After", was: 3, now: 3, ready: "14 ready" },
      { name: "Morning Routine", was: 4, now: 4, ready: "2 ready" },
      { name: "Skin Diary", was: 4, now: 4, ready: "9 ready" },
    ],
    wiredOn: "Aug 9 · Sam",
  },
  /* Just saved from the Studio: not wired yet, one first batch made. */
  quiet: {
    name: "Quiet Luxury Picks", character: "Character 4", slides: 5, size: "9:16", short: "quiet_luxury",
    stats: [["Posts left", "0"], ["Days of cover", "—"], ["Median views", "—"], ["Weekly cap", "—"]],
    batches: [{ date: "Sep 13", req: 14, written: 14, rendered: 14, approved: 12 }],
    templates: [{ name: "Version 1", date: "Sep 13", active: true, hook: "Five pieces I've worn for ten years", imgs: ["dock", "vanity", "journal", "mug", "yoga"] }],
    lines: ["The coat: wool, no logo", "The bag only gets better", "The watch, wound every morning", "Worn in Lisbon, Paris and at home"],
    details: [["Slide size", "9:16"], ["Short name", "quiet-luxury"], ["Created", "Sep 13 · Alex"]],
    boxes: ["hook", "line", "closing"],
    directions: [
      { name: "Version 1", date: "Sep 13", by: "Alex", active: true, text: "Show one piece at a time, photographed plainly, and say why it lasts. No prices, no brand names. Every line under ten words; the caption closes on where it was worn." },
    ],
    budget: 11,
    lanes: [
      { name: "Quiet Luxury Picks", was: 0, now: 3, ready: "New" },
      { name: "Day in the Life", was: 7, now: 5, ready: "22 ready" },
      { name: "Capsule Wardrobe", was: 4, now: 3, ready: "9 ready" },
    ],
    wiredOn: "Sep 15 · Alex",
  },
};

/* An empty Writing editor's placeholder: the shape of a good instruction, not an instruction to write one
   (Garreth, 2026-09-21). Grey, and gone the moment anything is typed. */
const WRITING_PLACEHOLDER =
  "who is speaking, and to whom · what each slide has to do · the words to use, and the words never to use · how the caption should read";

/* What the Studio's AI wrote when the template was drafted from a reference: it describes the construction, and it
   opens in the editor unsaved, so the requirement is met by someone having read it (Garreth, 2026-09-21). */
const DRAFTED_NOTE =
  "Five slides at 9:16. Slide 1 carries the hook over the cover photo. Slides 2 to 4 each show one piece, plainly photographed, with a line under ten words saying why it lasts. Slide 5 closes on where it was worn. No prices and no brand names anywhere.";

/* D13b: what the Conversation writes when it is asked for a first draft. Its source is the same as the Studio's
   note — the active template and its slides — so the two agree; it lands in the same place, unsaved (Garreth,
   2026-09-22). It carries the voice as well as the construction, because the Writing is what the copy sounds like. */
const FIRST_DRAFT =
  "Spoken by someone who buys little and keeps it for years. Five slides at 9:16: the first opens on a piece being worn, with the hook under eight words. Slides 2 to 4 take one piece each, photographed plainly, and say in a line why it lasts. Slide 5 closes on where it was worn, and the caption ends there. No prices, no brand names, and never the word luxury.";

/* The suggested change, against Version 4 (removed words struck through, added words marked). */
const DIFF = [
  ["", "Open on a "],
  ["add", "winter "],
  ["", "before-and-after people can picture in their own mirror. Keep "],
  ["del", "every line under twelve words"],
  ["add", "the hook under eight words and every other line under twelve"],
  ["", ", warm and plain, never clinical. The after slide names one habit, never a product, and the caption ends on a question the viewer wants to answer."],
];

/* The wiring checklist, from WIRE-NEW-CONTENT-TYPE.md by way of flow F11. `code` shows the name in monospace. */
const checklist = (T) => [
  { key: "table", name: "Lane table", detail: `${T.short}_decks`, code: true },
  { key: "registry", name: "Registry row", detail: "content_type_registry", code: true },
  { key: "allow", name: "Character allow-list", detail: T.character },
  { key: "trigger", name: "Ready trigger", detail: "scheduler_ready", code: true },
  { key: "posts", name: "Posts view", detail: "unified_posts", code: true },
  { key: "pool", name: "Scheduler pool", detail: "v_scheduler_pool", code: true },
  /* The first batch's approved decks, held until now, are written into the new table (Garreth, 2026-09-15). */
  { key: "decks", name: "Approved decks", detail: `${T.batches[T.batches.length - 1].approved} from the first batch` },
  { key: "cadence", name: "Cadence", detail: `${T.lanes[0].now} a week` },
  { key: "media", name: "Smart Scheduler media entry", detail: "n8n" },
  { key: "music", name: "Music sources", detail: "First batch" },
];

/*
 * Wiring states: fresh (just saved, balanced), mismatch (cadence does not add up), running (Wire held),
 * failed (rolled back), media (wired, media entry missing), done (every item ticked).
 */
const WIRED_MODES = new Set(["media", "done"]);

function itemState(mode, key, i) {
  if (mode === "done") return { st: "ok", detail: key === "music" ? "12 decks" : null };
  if (mode === "running") return { st: i < 4 ? "ok" : i === 4 ? "busy" : "todo" };
  if (mode === "failed") return key === "pool" ? { st: "fail", note: "Check 5 of 7: the pool came back empty" } : { st: "todo" };
  if (mode === "mismatch") return key === "cadence" ? { st: "todo", detail: "14 / 11", detailCls: "is-danger" } : { st: "todo" };
  if (mode === "media") {
    if (key === "media") return { st: "warn", note: "Not in the published workflow" };
    if (key === "music") return { st: "warn", detail: "2 decks waiting", detailCls: "is-warn" };
    return { st: "ok" };
  }
  return { st: "todo" };
}

/* ── D15. Rows: what is sitting in the lane table ───────────────────────── */

/*
 * The table the Smart Scheduler, the Posting Agent and Inventory read, and where everything the generator makes
 * ends up: Approve writes the row, rendering fills its slide URLs, Approve n decks flips it ready. Nothing in the
 * app shows it today, so no screen answers "this lane says nothing is postable and has 240 rows in it — why?".
 *
 * Read-only (Garreth, 2026-09-21): every change to a row happens where it already happens — the batch page,
 * Approve, the scheduler. The tab has no accent button.
 *
 * Six statuses, and the word is the point of the column. Their tone splits on one question: is anything going to
 * happen to this row by itself?
 *   Ready         green — the one that counts, and the one the line above the table counts
 *   Not rendered  neutral — the renderer has it; it will move on its own
 *   Assigned      neutral — the scheduler has taken it, with a date and a profile
 *   Posted        neutral — done, and gone
 *   No caption    amber — stuck. Nothing will fill it but a person
 *   Not gatekept  amber — stuck. The nightly gate reads NULL rows only, so a pending one strands forever
 * No new pill colour: green, amber and neutral are the screen's own (Garreth's rule for this tab).
 */
const ST_TONE = {
  Ready: "pill--ok",
  "No caption": "pill--warn",
  "Not gatekept": "pill--warn",
  "Not rendered": "",
  Assigned: "",
  Posted: "",
};

const MUSIC = [
  "Halden Ross – Slow Morning",
  "Mira Vale – Paper Windows",
  "The Otterlys – Kitchen Light",
  "Nal Fontaine – Ten Years On",
  "Bright Harbour – Same Mirror",
];

/* Sample rows, newest first, the way the table comes back. `img` is slide 1; a row that has not been rendered has
   no slide 1 at all, which is why its thumbnail is an empty frame rather than a picture. One caption is long on
   purpose, to see the two lines a caption gets. */
const LANE_ROWS = {
  /* The ordinary case: rows in every state, mixed. */
  mixed: [
    { id: "ba_0261", st: "Not rendered", cap: "Month one looked like nothing at all. Month six looked like this.", music: null },
    { id: "ba_0260", st: "Not rendered", cap: "Six months, one habit, and the same bathroom mirror — here is every month of it, in order, with nothing skipped and nothing smoothed over.", music: null },
    { id: "ba_0259", img: "mug", st: "No caption", cap: null, music: MUSIC[0] },
    { id: "ba_0258", img: "journal", st: "Not gatekept", cap: "Water before coffee. That was the whole change.", music: MUSIC[1] },
    { id: "ba_0257", img: "yoga", st: "Ready", cap: "The same mirror, six months apart. Which habit would you start with?", music: MUSIC[2] },
    { id: "ba_0256", img: "oats", st: "Ready", cap: "No new products. Sleep and water, every day.", music: MUSIC[3] },
    { id: "ba_0255", img: "shower", st: "Ready", cap: "Month three is when people started asking.", music: MUSIC[4] },
    { id: "ba_0254", img: "dock", st: "Assigned", cap: "One habit, six months, no filters.", music: MUSIC[0], date: "Sep 24", time: "09:40", profile: "Profile 12" },
    { id: "ba_0253", img: "vanity", st: "Assigned", cap: "What six months of one habit did.", music: MUSIC[1], date: "Sep 23", time: "18:10", profile: "Profile 27" },
    { id: "ba_0252", img: "mug", st: "Assigned", cap: "Before and after: six months of the same routine.", music: MUSIC[2], date: "Sep 22", time: "07:55", profile: "Profile 41" },
    { id: "ba_0251", img: "journal", st: "Posted", cap: "Month one: nothing looked different.", music: MUSIC[3], date: "Sep 20", time: "08:15", profile: "Profile 12", views: "42.1k", likes: "3,180", comments: "204" },
    { id: "ba_0250", img: "yoga", st: "Posted", cap: "The habit was boring. The six months were not.", music: MUSIC[4], date: "Sep 19", time: "17:30", profile: "Profile 27", views: "12.6k", likes: "914", comments: "63" },
    { id: "ba_0249", img: "oats", st: "Posted", cap: "Same mirror, same light, six months apart.", music: MUSIC[0], date: "Sep 18", time: "09:05", profile: "Profile 41", views: "88.4k", likes: "7,042", comments: "511" },
    { id: "ba_0248", img: "shower", st: "Posted", cap: "I changed one thing. Here is month six.", music: MUSIC[1], date: "Sep 17", time: "19:20", profile: "Profile 12", views: "9.3k", likes: "602", comments: "38" },
    { id: "ba_0247", img: "dock", st: "Posted", cap: "Six months without filters.", music: MUSIC[2], date: "Sep 16", time: "08:40", profile: "Profile 27", views: "31.7k", likes: "2,466", comments: "159" },
    { id: "ba_0246", img: "vanity", st: "Posted", cap: "Start with water. That is the whole post.", music: MUSIC[3], date: "Sep 15", time: "18:00", profile: "Profile 41", views: "21.0k", likes: "1,604", comments: "97" },
    { id: "ba_0245", img: "mug", st: "Posted", cap: "Month three: people started asking.", music: MUSIC[4], date: "Sep 14", time: "07:45", profile: "Profile 12", views: "54.8k", likes: "4,309", comments: "372" },
    { id: "ba_0244", img: "journal", st: "Posted", cap: "The after slide is not a product.", music: MUSIC[0], date: "Sep 13", time: "17:50", profile: "Profile 27", views: "17.2k", likes: "1,188", comments: "74" },
  ],
  /* The state the tab exists for: 240 rows and nothing postable, and the reason differs row to row. Newest first,
     so the whole of page one is rows that will never move by themselves. */
  stuck: [
    { id: "ba_0261", st: "Not rendered", cap: "Month one looked like nothing at all. Month six looked like this.", music: null },
    { id: "ba_0260", st: "Not rendered", cap: "Six months, one habit, and the same bathroom mirror — here is every month of it, in order, with nothing skipped and nothing smoothed over.", music: null },
    { id: "ba_0259", img: "mug", st: "No caption", cap: null, music: MUSIC[0] },
    { id: "ba_0258", img: "journal", st: "No caption", cap: null, music: MUSIC[1] },
    { id: "ba_0257", img: "yoga", st: "Not gatekept", cap: "The same mirror, six months apart. Which habit would you start with?", music: MUSIC[2] },
    { id: "ba_0256", img: "oats", st: "No caption", cap: null, music: MUSIC[3] },
    { id: "ba_0255", img: "shower", st: "Not gatekept", cap: "Month three is when people started asking.", music: MUSIC[4] },
    { id: "ba_0254", img: "dock", st: "Not gatekept", cap: "One habit, six months, no filters.", music: MUSIC[0] },
    { id: "ba_0253", img: "vanity", st: "No caption", cap: null, music: MUSIC[1] },
    { id: "ba_0252", st: "Not rendered", cap: "Before and after: six months of the same routine.", music: null },
    { id: "ba_0251", img: "mug", st: "Not gatekept", cap: "Month one: nothing looked different.", music: MUSIC[3] },
    { id: "ba_0250", img: "journal", st: "No caption", cap: null, music: MUSIC[4] },
    { id: "ba_0249", img: "yoga", st: "Not gatekept", cap: "Same mirror, same light, six months apart.", music: MUSIC[0] },
    { id: "ba_0248", img: "oats", st: "No caption", cap: null, music: MUSIC[1] },
    { id: "ba_0247", st: "Not rendered", cap: "Six months without filters.", music: null },
    { id: "ba_0246", img: "shower", st: "Not gatekept", cap: "Start with water. That is the whole post.", music: MUSIC[2] },
    { id: "ba_0245", img: "dock", st: "No caption", cap: null, music: MUSIC[3] },
    { id: "ba_0244", img: "vanity", st: "Not gatekept", cap: "The after slide is not a product.", music: MUSIC[4] },
  ],
  none: [],
};

/* The line above the table: data, not instruction text (Garreth, 2026-09-21). */
const LANE_COUNTS = { mixed: { total: 240, ready: 62 }, stuck: { total: 240, ready: 0 }, none: { total: 0, ready: 0 } };
const PAGE_SIZE = 50;

/*
 * Every column the row has, in the table's own order — which is the only order a lane table reliably gives, since
 * no two of them are alike. Shown whole in the drawer, an empty one as a dash: an empty column IS the answer to
 * why a row cannot post, so it is never hidden.
 */
function laneColumns(T, r) {
  const posted = r.st === "Posted";
  const assigned = posted || r.st === "Assigned";
  const rendered = !!r.img;
  const ready = assigned || r.st === "Ready";
  const gate = ready ? "passed" : r.st === "Not gatekept" ? "pending" : null;
  const slides = Array.from({ length: T.slides }, (_, i) => [`slide_${i + 1}`, rendered ? `…/renders/${r.id}/slide-${i + 1}.jpg` : null]);
  const day = r.date ? `2026-${r.date.replace("Sep ", "09-").padStart(5, "0")}` : null;
  return [
    ["id", r.id],
    ["created_at", "2026-09-12 14:22"],
    ["batch", "Sep 11"],
    ["template_version", "Version 4"],
    ["writing_version", "Version 4"],
    ["hook", "Six months, one habit, no filters"],
    ...slides,
    ["caption", r.cap],
    ["hashtags", r.cap ? "#sixmonths #onehabit #nofilter" : null],
    ["music", r.music],
    ["music_source", r.music ? "First batch" : null],
    ["music_url", r.music ? `…/music/${r.id}.mp3` : null],
    ["gatekeep_status", gate],
    ["gatekeep_note", null],
    ["gatekept_at", gate === "passed" ? "2026-09-12 14:31" : null],
    ["approved", "true"],
    ["approved_at", "2026-09-12 14:20"],
    ["approved_by", "Alex"],
    ["rendered_at", rendered ? "2026-09-12 14:28" : null],
    ["render_job", rendered ? `rj_${r.id.slice(3)}` : null],
    ["scheduler_ready", ready ? "true" : "false"],
    ["assigned_profile", r.profile ?? null],
    ["posting_date", day],
    ["posting_time", r.time ?? null],
    ["posted_at", posted ? `${day} ${r.time}` : null],
    ["post_url", posted ? `…/video/${r.id}` : null],
    ["views", r.views ?? null],
    ["likes", r.likes ?? null],
    ["comments", r.comments ?? null],
    ["error", null],
  ];
}

/* Everything above a tab's panel on the desktop (top bar, padding, title, tabs), so side-by-side panels can fill
   the rest of the 900px screen and end on the same line (Garreth, 2026-09-15). */
const PANEL_H = 900 - 229 - 24;

/* ── Styles ────────────────────────────────────────────────────────────── */

function css(phone, { tall, slides, size }) {
  const P = phone;
  return `
/* ── D7 page ── */
:root { --ok: #4ade80; --warn: #fbbf24; --dot-opacity: 0.34; }
.app.is-light { --ok: #166534; --warn: #92400e; --dot-opacity: 0; }
${tall ? `.app${S} { height: ${tall}px; }` : ""}
${S} .page { gap: ${P ? 20 : 24}px; }
${S} .t7head { display: flex; flex-direction: column; align-items: flex-start; }
/* Back to Carousel types: the breadcrumb above the name, as on D2. */
${S} .up7 { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 4px -2px; padding: 2px; border-radius: 8px; font-size: 13px; line-height: 20px; font-weight: 500; color: var(--text-muted); transition: color 150ms var(--ease); }
${S} .up7:hover { color: var(--text-primary); }
${S} .t7title { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; align-self: stretch; }
${S} .t7name { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; min-width: 0; }
${S} .t7meta { display: flex; flex-wrap: wrap; gap: 6px; }
${S} .t7act { display: flex; align-items: center; gap: 12px; }
${S} .pill--ok { color: var(--ok); }
${S} .pill--warn { color: var(--warn); }
${S} .pill--danger { color: var(--danger); }
${S} .pill--accent { color: var(--accent); }

/* Tabs: account-detail-tabs.tsx, underline tabs over a full-width rule. */
${S} .tabs7 { display: flex; gap: ${P ? 20 : 24}px; border-bottom: 1px solid var(--border); margin-bottom: ${P ? -4 : 0}px; }
${S} .tab7 { position: relative; margin-bottom: -1px; border-bottom: 2px solid transparent; padding: 0 2px 10px; font-size: 14px; line-height: 20px; font-weight: 500; white-space: nowrap; color: var(--text-muted); transition: color 150ms var(--ease); }
${S} .tab7:hover { color: var(--text-primary); }
${S} .tab7[aria-selected="true"] { border-bottom-color: var(--text-primary); font-weight: 600; color: var(--text-primary); }

/* Cards: rounded-card, bg-card, border, with head rows between thin rules like D2's form. */
${S} .c7 { display: flex; flex-direction: column; min-width: 0; border-radius: 24px; background: var(--card); border: 1px solid var(--border); box-shadow: var(--sh-card); }
${S} .c7h { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; min-height: 60px; padding: 14px ${P ? 20 : 24}px; }
${S} .c7h h2 { margin: 0; font-size: 14px; line-height: 20px; font-weight: 600; }
${S} .c7h .cnt { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .tbtn7 { position: relative; display: inline-flex; align-items: center; gap: 4px; border-radius: 8px; padding: 2px 4px; font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-muted); transition: color 150ms var(--ease); }
${S} .tbtn7:hover { color: var(--text-primary); }
${S} .btn2:disabled { opacity: 0.4; cursor: not-allowed; }
${S} .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
${S} .col7 { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

/* ── Overview ── */
${S} .ov7 { display: flex; flex-direction: column; gap: 16px; }
/* The template: its slides across the whole width, one version at a time (Garreth, 2026-09-15). */
${S} .tplh { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; }
${S} .vsel { position: relative; }
${S} .vbtn7 { position: relative; display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; border: 1px solid var(--border); background: var(--card-raised); padding: 5px 10px 5px 14px;
  font-size: 13px; line-height: 18px; font-weight: 500; color: var(--text-primary); transition: border-color 150ms var(--ease); }
${S} .vbtn7:hover, ${S} .vbtn7[aria-expanded="true"] { border-color: color-mix(in srgb, var(--text-muted) 50%, var(--border)); }
${S} .vbtn7 .vd { font-weight: 400; color: var(--text-muted); }
${S} .vbtn7 svg { color: var(--text-muted); }
/* Solid, like D6's versions list: it hangs over the slides, and a veil would let them show through. */
${S} .vpop7 { position: absolute; left: 0; top: calc(100% + 8px); z-index: 40; width: 280px; border-radius: 16px; border: 1px solid var(--border); padding: 6px;
  background: var(--card-raised); box-shadow: var(--overlay-rim); transform-origin: top left; animation: d7-pop 150ms var(--ease-out-strong); }
.is-light ${S} .vpop7 { background: var(--card); box-shadow: 0 16px 40px rgba(27, 29, 33, 0.18); }
@keyframes d7-pop { from { opacity: 0; transform: scale(0.97) translateY(-4px); } }
${S} .vopt { display: flex; align-items: center; gap: 10px; width: 100%; min-height: ${P ? 44 : 36}px; border-radius: 12px; padding: 6px 10px; font-size: 13px; line-height: 20px; transition: background-color 150ms var(--ease); }
${S} .vopt:hover { background: color-mix(in srgb, var(--text-primary) 6%, transparent); }
/* The version showing: a soft accent tint, no tick (Garreth, 2026-09-15, second review). */
${S} .vopt[aria-selected="true"] { background: var(--accent-soft); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 24%, transparent); }
${S} .vopt b { font-weight: 500; }
${S} .vopt[aria-selected="true"] b { color: var(--accent); }
${S} .vopt .vd { color: var(--text-muted); }
${S} .vopt .vend { display: flex; align-items: center; gap: 8px; margin-left: auto; }
${S} .catch7 { position: absolute; inset: 0; z-index: 30; }
${
  P
    ? `${S} .slides7 { display: grid; grid-auto-flow: column; grid-auto-columns: 132px; gap: 10px; padding: 0 20px 20px; overflow-x: auto; scroll-snap-type: x mandatory; }
${S} .slide7 { scroll-snap-align: start; }`
    : `${S} .slides7 { display: grid; grid-template-columns: repeat(${slides}, minmax(0, 1fr)); gap: 12px; padding: 0 24px 24px; }`
}
/* A slide as the painter draws it: the photo, a soft darkening, the copy in white (D5's rendered slide), at the type's
   own size, 4:5 or 9:16 (Garreth, 2026-09-15). */
${S} .slide7 { position: relative; display: flex; align-items: center; justify-content: center; aspect-ratio: ${size === "9:16" ? "9 / 16" : "4 / 5"}; overflow: hidden; border-radius: ${P ? 10 : 12}px; padding: 8%; text-align: center;
  container-type: inline-size; background-size: cover; background-position: center; background-color: var(--card-raised); }
${S} .slide7::after { content: ""; position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0, 0, 0, 0.22), rgba(0, 0, 0, 0.12) 45%, rgba(0, 0, 0, 0.5)); pointer-events: none; }
${PHOTOS.map((id) => `${S} .p7-${id} { background-image: url(./d7-slide-${id}.jpg); }`).join("\n")}
${S} .st7 { position: relative; z-index: 1; max-width: 100%; margin: 0; font-size: 9.5cqw; line-height: 1.15; font-weight: 700; letter-spacing: -0.01em; color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45); text-wrap: balance; overflow-wrap: anywhere; }
${S} .st7--hook { font-size: 11.5cqw; }

/* The pool's four numbers beside the details, both the same height; the tiles narrower and the details wider
   (Garreth, 2026-09-15, second review). */
${S} .bento7 { display: grid; grid-template-columns: ${P ? "minmax(0, 1fr)" : "minmax(0, 5fr) minmax(0, 7fr)"}; gap: 16px; align-items: stretch; }
${S} .tiles7 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: 1fr; gap: 12px; }
/* The analytics page's stat tile (analytics-charts.tsx) without its sparkline: rounded-nested, bg-card-raised, px-4 py-3,
   and globals.css's dot-fade halftone fading out of the top-right corner (off in light mode, as in the app). */
${S} .tile7 { position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; overflow: hidden; border-radius: 16px; border: 1px solid var(--border);
  background: var(--card-raised); padding: 12px 16px; color: var(--text-muted); }
${S} .tile7::after { content: ""; position: absolute; inset: 0; pointer-events: none; background-image: radial-gradient(currentColor 2px, transparent 2.2px); background-size: 7px 7px;
  opacity: var(--dot-opacity); -webkit-mask-image: radial-gradient(115% 115% at 100% 0%, #000 0%, transparent 58%); mask-image: radial-gradient(115% 115% at 100% 0%, #000 0%, transparent 58%); }
${S} .tile7 > span { position: relative; z-index: 1; }
${S} .sl7 { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .sv7 { font-size: 24px; line-height: 1; font-weight: 600; color: var(--text-primary); }
${S} .sv7.is-muted { color: var(--text-muted); }
${S} .drow { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 48px; padding: 10px ${P ? 20 : 24}px; border-top: 1px solid var(--border); font-size: 13px; line-height: 20px; }
${S} .drow .dl { color: var(--text-muted); }
${S} .drow .dv { min-width: 0; display: flex; align-items: center; gap: 10px; text-align: right; }
${S} .libtile { width: 28px; height: 28px; flex-shrink: 0; border-radius: 8px; background: url(./d7-lib-window.jpg) center / cover, var(--card-raised); }
${S} .dv .sub { color: var(--text-muted); }

/* Batches: every column left-aligned, no Ran by (Garreth, 2026-09-15). A whole row opens that batch. */
${S} .bgrid { display: grid; grid-template-columns: 120px repeat(4, 112px) minmax(0, 1fr) 16px; align-items: center; column-gap: 16px; text-align: left; }
${S} .bhead { padding: 0 24px 8px; font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .brow { width: 100%; min-height: 52px; padding: 8px 24px; border-top: 1px solid var(--border); font-size: 14px; line-height: 20px; transition: background-color 150ms var(--ease); }
${S} .brow:hover { background: color-mix(in srgb, var(--text-primary) 4%, transparent); }
${S} .brow:last-child { border-radius: 0 0 23px 23px; }
${S} .brow .bdate { font-weight: 500; }
${S} .brow .dim { color: var(--text-muted); }
${S} .brow .bstate { display: flex; min-width: 0; }
${S} .chev7 { display: flex; color: var(--text-muted); }
${S} .bcounts { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .es7 { display: flex; min-height: 120px; align-items: center; justify-content: center; border-top: 1px solid var(--border); font-size: 13px; color: var(--text-muted); }

/* ── Rows (D15) ── */
/* What is sitting in the lane table. A fixed set of columns, not the whole table: slide 1, the id, the caption,
   the music, the posting date and profile where there are any, and the status. These tables are 32 to 66 columns
   wide and no two are alike, so the rest is in the drawer (Garreth, 2026-09-21). */
${S} .rows15 { display: flex; flex: 1; min-height: 0; flex-direction: column; }
${S} .rows15 > .c7 { flex: 1; }
${S} .counts15 { margin: 0; font-size: 14px; line-height: 20px; font-weight: 600; }
${S} .counts15 .rest { font-weight: 500; color: var(--text-muted); }
${S} .tbl15 { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; line-height: 16px; color: var(--text-muted); }
/* The table fills the width under the counts line, the way the batch table does. A whole row opens the drawer. */
${S} .rgrid { display: grid; grid-template-columns: 40px 104px minmax(0, 1fr) 170px 96px 96px 118px 12px; align-items: center; column-gap: 16px; text-align: left; }
${S} .rhead { padding: 0 24px 8px; font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .rrow15 { width: 100%; min-height: 64px; padding: 9px 24px; border-top: 1px solid var(--border); font-size: 13px; line-height: 18px; transition: background-color 150ms var(--ease); }
${S} .rrow15:hover { background: color-mix(in srgb, var(--text-primary) 4%, transparent); }
/* Slide 1 as it will post — or, on a row nothing has rendered yet, the empty frame that says so before the status
   column is read. */
${S} .thumb15 { width: 40px; aspect-ratio: ${size === "9:16" ? "9 / 16" : "4 / 5"}; border-radius: 6px; background-size: cover; background-position: center; background-color: var(--card-raised); }
${S} .thumb15.is-none { border: 1px dashed var(--border); background: var(--card-sunken); }
${S} .rid { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--text-muted); }
${S} .rcap { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; text-wrap: pretty; }
${S} .rmus, ${S} .rprof { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .rdate { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .rst { display: flex; min-width: 0; }
${S} .rnone { color: var(--text-muted); }
/* Fifty rows a page (Garreth, 2026-09-21). */
${S} .pager15 { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 60px; margin-top: auto; padding: 12px 24px; border-top: 1px solid var(--border);
  font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .pbtns { display: flex; gap: 8px; }
${S} .pbtns .btn2 { padding: ${P ? 8 : 5}px ${P ? 14 : 10}px; }
/* Nothing to list: the shared empty state, filling the card so it reaches the bottom of the screen rather than
   floating above a blank page (the rule of 2026-09-19). */
${S} .main:has(> .page.is-fill) { display: flex; flex-direction: column; }
${S} .page.is-fill { flex: 1; min-height: 0; }
${S} .page.is-fill [role="tabpanel"] { display: flex; flex: 1; min-height: 0; flex-direction: column; }
${S} .rows15 .cempty { padding: 40px 24px; }
${S} .rows15 .cempty.has-head { border-top: 1px solid var(--border); }
${S} .rows15 .cempty .btn2 { margin-top: 2px; }

/* A row's drawer: every column that row has. It comes in from the side so the table it was opened from is still
   read behind it; on the phone it is the sheet Preview and the Conversation already use. */
${
  P
    ? `${S} .dlg7.drw15 { max-height: 88%; }`
    : `${S} .dlg7.drw15 { left: auto; right: 0; top: 0; bottom: 0; width: 500px; max-height: none; transform: none; border-radius: 24px 0 0 24px; border-right: 0;
  animation: d7-drw 260ms cubic-bezier(0.32, 0.72, 0, 1); }
@keyframes d7-drw { from { transform: translateX(100%); } }`
}
${S} .drwh { gap: 10px; }
${S} .drwh .dwho { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
${S} .drwh h2 { overflow: hidden; text-overflow: ellipsis; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; line-height: 20px; }
${S} .drwh .dsub { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .drwh .dend { display: flex; align-items: center; gap: 10px; margin-left: auto; }
${S} .dslides { display: flex; gap: 8px; flex-shrink: 0; padding: 14px ${P ? 16 : 20}px; border-bottom: 1px solid var(--border); overflow-x: auto; }
${S} .dsl { width: 52px; flex-shrink: 0; aspect-ratio: ${size === "9:16" ? "9 / 16" : "4 / 5"}; border-radius: 8px; background-size: cover; background-position: center; background-color: var(--card-raised); }
${S} .dsl.is-none { border: 1px dashed var(--border); background: var(--card-sunken); }
${S} .cols15 { flex: 1; min-height: 0; overflow-y: auto; padding-bottom: ${P ? 20 : 12}px; }
${S} .crow15 { display: grid; grid-template-columns: 160px minmax(0, 1fr); align-items: baseline; column-gap: 16px; padding: 9px ${P ? 16 : 20}px; border-top: 1px solid var(--border); font-size: 13px; line-height: 18px; }
${S} .crow15:first-child { border-top: 0; }
${S} .ck15 { overflow-wrap: anywhere; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; line-height: 18px; color: var(--text-muted); }
${S} .cv15 { min-width: 0; overflow-wrap: anywhere; text-wrap: pretty; }
${S} .cv15.is-none { color: var(--text-muted); }
/* The drawer ends on the one way out: the deck this row was made from, in the batch it came from (Garreth,
   2026-09-22). The table stays read-only and points at the screen where the fixing happens. It is pinned under
   the scrolling columns, so it is still there at the end of thirty-six of them, and it is secondary — this tab
   has no accent button. A row from the old n8n pile has no batch to open, so it has no button; the batch column
   reads as a dash, which says why. */
${S} .drwfoot { display: flex; flex-shrink: 0; padding: 12px ${P ? 16 : 20}px ${P ? 20 : 16}px; border-top: 1px solid var(--border); }
${S} .drwfoot .btn2 { width: 100%; justify-content: center; padding: ${P ? 12 : 8}px 14px; }
${
  P
    ? `
/* Phone: stacked rows (Garreth, 2026-09-21) — slide 1 down the left, the id and the status on the first line, the
   caption under it, and the music, date and profile on one quiet line. The tab is read-only, so it is the one tab
   with no bottom bar; the page ends where the pager does. */
${S} .rhead { display: none; }
${S} .rgrid { display: grid; grid-template-columns: 44px minmax(0, 1fr) 12px; align-items: start; column-gap: 12px; row-gap: 4px; text-align: left; }
${S} .rrow15 { min-height: 0; padding: 14px 20px; }
${S} .thumb15 { width: 44px; grid-column: 1; grid-row: 1 / 4; }
${S} .rtop15 { grid-column: 2; grid-row: 1; display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }
${S} .rcap { grid-column: 2; grid-row: 2; }
${S} .rmeta15 { grid-column: 2; grid-row: 3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .rrow15 .chev7 { grid-column: 3; grid-row: 1; padding-top: 3px; }
${S} .pager15 { padding: 12px 20px; }
/* The drawer on a phone: the column's name over its value, not beside it — a 390px sheet cannot hold both without
   breaking a url across three lines. */
${S} .crow15 { grid-template-columns: minmax(0, 1fr); row-gap: 1px; padding: 10px 16px; }
${S} .main:has(.rows15) { padding-bottom: 16px; }
${S} .colwrap:has(.rows15) .note { bottom: 24px; }
${S} .rows15 .cempty { padding: 32px 20px; }
`
    : ""
}

/* ── Direction ── */
/* The editor column and the conversation fill the panel and end on the same line (Garreth, 2026-09-15). */
${S} .dir7 { display: grid; grid-template-columns: ${P ? "minmax(0, 1fr)" : "minmax(0, 1fr) 400px"}; gap: 16px; align-items: stretch; ${P ? "" : `height: ${PANEL_H}px;`} }
${S} .dir7 > .col7 { min-height: 0; }
${S} .edcard { flex: 1; min-height: 0; }
${S} .edhead { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
${S} .edhead .date { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .edbody { display: flex; flex: 1; min-height: 0; padding: 0 ${P ? 20 : 24}px; }
${S} .edtext { display: block; flex: 1; width: 100%; min-height: ${P ? 236 : 0}px; resize: none; overflow-y: auto; border-radius: 16px; border: 1px solid var(--border); background: var(--card-sunken); padding: 14px 16px;
  font: inherit; font-size: ${P ? 16 : 15}px; line-height: 26px; color: var(--text-primary); outline: none; text-wrap: pretty; transition: box-shadow 150ms var(--ease); }
${S} .edtext:focus { box-shadow: 0 0 0 2px var(--accent); }
${S} .edtext::placeholder { color: var(--text-muted); }
/* The suggestion against the current text: removed words struck through in red, added words underlined in green,
   so the change reads without relying on colour alone. */
${S} .diff { white-space: pre-wrap; }
${S} .diff del { text-decoration: line-through; text-decoration-thickness: 1.5px; color: var(--danger); background: color-mix(in srgb, var(--danger) 12%, transparent); border-radius: 4px; padding: 1px 2px; }
${S} .diff ins { text-decoration: underline; text-decoration-thickness: 1.5px; text-underline-offset: 4px; color: var(--ok); background: color-mix(in srgb, var(--ok) 12%, transparent); border-radius: 4px; padding: 1px 2px; }
${S} .edfoot { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; min-height: 70px; padding: 16px ${P ? 20 : 24}px; margin-top: 16px; border-top: 1px solid var(--border); }
${S} .edfoot .cta { margin-left: auto; }
/* The template's text boxes, by name, under the editor they are written for (D13). */
${S} .boxes7 { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-width: 0; }
${S} .boxes7 .bxl { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .boxes7 .pill { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }
${P ? `${S} .edboxes { padding: 0 20px 16px; }` : ""}
/* D13b, the phone: the Conversation is a sheet, so the offer of a first draft sits under the empty editor instead,
   where a writer meets it without opening the sheet (Garreth, 2026-09-22). */
${S} .edoffer { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 14px ${P ? 20 : 24}px 16px; }
${S} .edoffer .sub { font-size: 12px; line-height: 16px; color: var(--text-muted); }

/* The conversation: D6's messages and chat box, at the panel's full height. */
${S} .chat7 { min-height: 0; }
${S} .chat7 .c7h { border-bottom: 1px solid var(--border); }
${S} .chat7 .who { display: flex; align-items: center; gap: 10px; }
${S} .markv { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); }
${S} .msgs7 { display: flex; flex: 1; min-height: 0; flex-direction: column; gap: 14px; padding: 16px 20px; overflow-y: auto; }
${S} .msg7 { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; line-height: 20px; text-wrap: pretty; }
${S} .msg7.me { justify-content: flex-end; }
${S} .msg7.me .bub { max-width: 85%; border-radius: 16px 16px 4px 16px; background: var(--card-raised); padding: 8px 12px; }
.is-light ${S} .msg7.me .bub { background: var(--pill-bg); }
${S} .msg7 .aiv { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; flex-shrink: 0; margin-top: -2px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); }
${S} .msg7 .aiv svg { width: 14px; height: 14px; }
${S} .msg7.ai .bub { display: flex; min-width: 0; flex-direction: column; align-items: flex-start; gap: 8px; }
${S} .msg7 .bub.is-err { color: var(--danger); }
${S} .rules { display: flex; flex-wrap: wrap; gap: 6px; }
${S} .rules .pill svg { opacity: 0.8; }
/* D13b: nothing written, so the panel carries empty-state.tsx's shape — a muted circle over one quiet line —
   and the one offer under it. It fills the card rather than leaving a void (the rule of 2026-09-19). The offer is
   secondary: Save version stays the tab's only accent. */
${S} .cempty { display: flex; flex: 1; min-height: 0; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px 20px; text-align: center; }
${S} .cempty .eic { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 999px; background: var(--pill-bg); color: var(--text-muted); }
${S} .cempty p { font-size: 14px; line-height: 20px; color: var(--text-muted); }
${S} .cempty .sub { max-width: 240px; font-size: 12px; line-height: 16px; color: var(--text-muted); text-wrap: pretty; }
${S} .cin7 { flex-shrink: 0; padding: 0 12px 12px; }
${S} .ai7 { display: flex; align-items: center; gap: 10px; width: 100%; border-radius: 16px; border: 1px solid var(--border); background: var(--card-sunken); padding: 10px; transition: border-color 200ms var(--ease); }
${S} .ai7:focus-within { border-color: color-mix(in srgb, var(--text-muted) 60%, var(--border)); }
${S} .aitile7 { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; flex-shrink: 0; border-radius: 12px; border: 1px solid var(--border); background: var(--card-raised); color: var(--text-muted); }
${S} .ai7 input { flex: 1; min-width: 0; font-size: 14px; line-height: 20px; outline: none; }
${S} .ai7 input::placeholder { color: var(--text-muted); }
${S} .aisend7 { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; flex-shrink: 0; border-radius: 12px; border: 1px solid var(--border); background: var(--card-raised); color: var(--text-muted); }
${S} .fab7 { position: absolute; right: 16px; bottom: 88px; z-index: 24; display: flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 999px; border: 1px solid var(--border);
  background: var(--card-raised); color: var(--text-primary); box-shadow: var(--overlay-rim); transition: transform 160ms var(--ease-out-strong); }
${S} .fab7:active { transform: scale(0.95); }
${S} .fab7 .dot { position: absolute; top: 10px; right: 10px; width: 9px; height: 9px; border-radius: 999px; background: var(--accent); box-shadow: 0 0 0 2px var(--card-raised); }

/* ── Wiring ── */
/* The set-up card and the checklist stretch to the same height and fill the panel (Garreth, 2026-09-15). */
${S} .wire7 { display: grid; grid-template-columns: ${P ? "minmax(0, 1fr)" : "minmax(0, 1fr) 460px"}; gap: 16px; align-items: stretch; ${P ? "" : `min-height: ${PANEL_H}px;`} }
${S} .frow7 { display: grid; grid-template-columns: ${P ? "minmax(0, 1fr)" : "140px minmax(0, 1fr)"}; gap: ${P ? 8 : 24}px; align-items: start; padding: 16px ${P ? 20 : 24}px; border-top: 1px solid var(--border); }
${S} .flabel7 { padding-top: ${P ? 0 : 6}px; font-size: 14px; line-height: 20px; font-weight: 500; }
${S} .field7 { display: flex; align-items: center; border-radius: 16px; border: 1px solid var(--border); background: var(--card-sunken); padding: ${P ? 12 : 10}px 14px; }
${S} .field7 input { width: 100%; font-size: ${P ? 16 : 14}px; line-height: 20px; font-weight: 500; outline: none; }
${S} .ro7 { padding-top: ${P ? 0 : 6}px; font-size: 14px; line-height: 20px; font-weight: 500; }
${S} .budget { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-height: 32px; font-size: 13px; line-height: 20px; }
${S} .budget b { font-weight: 600; }
${S} .budget .over { font-size: 12px; line-height: 16px; color: var(--danger); }
${S} .lanes { display: flex; flex-direction: column; margin-top: 8px; border-radius: 16px; border: 1px solid var(--border); }
${S} .lane { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 8px 8px 8px 14px; border-top: 1px solid var(--border); }
${S} .lane:first-child { border-top: 0; }
${S} .lname { display: flex; min-width: 0; flex: 1; flex-direction: column; }
${S} .lname b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; line-height: 20px; font-weight: 500; }
${S} .lname span { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .lval { padding-right: 8px; font-size: 14px; line-height: 20px; font-weight: 500; }
/* stepper.tsx, as on D2. */
${S} .step7 { display: inline-flex; align-items: stretch; width: ${P ? 132 : 120}px; flex-shrink: 0; overflow: hidden; border-radius: 16px; border: 1px solid var(--border); background: color-mix(in srgb, var(--bg) 60%, transparent); }
${S} .step7 button { display: flex; width: ${P ? 44 : 28}px; flex-shrink: 0; align-items: center; justify-content: center; color: var(--text-muted); }
${S} .step7 button:hover:not(:disabled) { background: var(--card); color: var(--text-primary); }
${S} .step7 button:disabled { cursor: not-allowed; opacity: 0.3; }
${S} .step7 span { display: flex; flex: 1; align-items: center; justify-content: center; padding: ${P ? 10 : 6}px 4px; border-left: 1px solid var(--border); border-right: 1px solid var(--border); font-size: 14px; line-height: 20px; }
${S} .step7.is-changed span { font-weight: 600; }
${S} .is-locked .step7 { opacity: 0.5; }
${S} .wfoot { display: flex; align-items: center; gap: 12px; min-height: 70px; margin-top: auto; padding: 16px 24px; border-top: 1px solid var(--border); }
${S} .wfoot .status7 { min-width: 0; margin-right: auto; font-size: 13px; line-height: 20px; color: var(--text-muted); }
${S} .status7.is-danger { color: var(--danger); }

/* Wire: hold-button.tsx in its warn tone (proposed): it changes the database, but deletes nothing. */
${S} .hold7 { position: relative; isolation: isolate; display: inline-flex; align-items: center; justify-content: center; gap: 8px; overflow: hidden; border-radius: 999px; padding: 6px 18px;
  font-size: 14px; line-height: 20px; font-weight: 500; user-select: none; touch-action: none; background: color-mix(in srgb, var(--warn) 25%, transparent); color: var(--warn); transition: opacity 150ms var(--ease); }
${S} .hold7:hover:not(:disabled) { opacity: 0.9; }
${S} .hold7:disabled { opacity: 0.4; cursor: not-allowed; }
${S} .hold7.is-busy:disabled { opacity: 1; cursor: progress; }
${S} .hold7 i { position: absolute; inset: 0; z-index: -1; transform-origin: left; transform: scaleX(0); background: var(--warn); }
${S} .hold7.is-busy i { transform: scaleX(1); opacity: 0.25; }
${S} .hold7 span { position: relative; display: flex; }

/* The checklist. */
${S} .items { display: flex; flex-direction: column; }
${S} .item { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; column-gap: 12px; align-items: start; padding: 12px ${P ? 20 : 24}px; border-top: 1px solid var(--border); }
${S} .item .ic { display: flex; padding-top: 2px; color: var(--text-muted); }
${S} .item.st-ok .ic { color: var(--ok); }
${S} .item.st-fail .ic { color: var(--danger); }
${S} .item.st-warn .ic { color: var(--warn); }
${S} .item.st-busy .ic { color: var(--accent); }
${S} .item .nm { font-size: 14px; line-height: 20px; font-weight: 500; }
${S} .item.st-todo .nm { color: var(--text-muted); }
${S} .item .dt { padding-top: 2px; font-size: 12px; line-height: 16px; color: var(--text-muted); text-align: right; white-space: nowrap; }
${S} .dt.is-danger { color: var(--danger); }
${S} .dt.is-warn { color: var(--warn); }
${S} .item .why { grid-column: 2 / 4; margin-top: 2px; font-size: 12px; line-height: 16px; }
${S} .item.st-fail .why { color: var(--danger); }
${S} .item.st-warn .why { color: var(--warn); }
/* The media line to copy, and Check again once it should be there. */
${S} .mline { grid-column: 2 / 4; display: flex; align-items: center; gap: 8px; margin-top: 10px; border-radius: 12px; border: 1px solid var(--border); background: var(--card-sunken); padding: 6px 6px 6px 12px; }
${S} .mline code { flex: 1; min-width: 0; overflow-x: auto; white-space: nowrap; line-height: 20px; color: var(--text-primary); }
${S} .mline .btn2, ${S} .mact .btn2 { padding: 4px 10px; }
${S} .mact { grid-column: 2 / 4; display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; }
${S} .mact .why { margin: 0; }

/* Preview: a centred dialog over the whole app, sections of exactly what Wire will run. */
${S} .scrim7 { position: absolute; inset: 0; z-index: 80; background: var(--scrim); -webkit-backdrop-filter: var(--scrim-blur); backdrop-filter: var(--scrim-blur); animation: d7-fade 180ms var(--ease-out-strong); }
${
  P
    ? `/* Phone: a sheet from the bottom, like D6's (Garreth, 2026-09-15), solid so the code reads cleanly. */
${S} .dlg7 { position: absolute; left: 0; right: 0; bottom: 0; z-index: 81; display: flex; flex-direction: column; max-height: 86%; border-radius: 24px 24px 0 0; border: 1px solid var(--border); border-bottom: 0;
  background: var(--card); box-shadow: var(--overlay-rim); animation: d7-sheet 280ms cubic-bezier(0.32, 0.72, 0, 1); }
@keyframes d7-sheet { from { transform: translateY(100%); } }`
    : `${S} .dlg7 { position: absolute; left: 50%; top: 50%; z-index: 81; display: flex; flex-direction: column; width: 720px; max-height: 780px; transform: translate(-50%, -50%);
  border-radius: 24px; border: 1px solid var(--border); background: var(--card); box-shadow: var(--overlay-rim); animation: d7-in 200ms var(--ease-out-strong); }`
}
.is-light ${S} .dlg7 { box-shadow: 0 16px 40px rgba(27, 29, 33, 0.18); }
/* D13b: the Conversation opens as the same sheet as Preview's and stops short of the top, so the tab it belongs to
   is still read behind it. */
${S} .dlg7.chats7 { height: 72%; }
${S} .dlg7.chats7 .c7h { gap: 8px; }
${S} .dlg7.chats7 .who { display: flex; flex: 1; align-items: center; gap: 10px; }
${S} .dlg7.chats7 .msgs7 { flex: 1; min-height: 0; }
@keyframes d7-fade { from { opacity: 0; } }
@keyframes d7-in { from { opacity: 0; transform: translate(-50%, -50%) scale(0.97); } }
${S} .dlg7 .c7h { border-bottom: 1px solid var(--border); }
${S} .dlg7 .c7h h2 { font-size: 16px; line-height: 24px; }
${S} .pbody { display: flex; flex-direction: column; gap: 16px; padding: 16px 24px 24px; overflow-y: auto; }
${S} .psec h3 { margin: 0 0 6px; font-size: 13px; line-height: 20px; font-weight: 500; color: var(--text-muted); }
${S} .psec pre { margin: 0; overflow-x: auto; border-radius: 12px; border: 1px solid var(--border); background: var(--card-sunken); padding: 10px 12px; line-height: 19px; color: var(--text-primary); }
${
  P
    ? `
/* Phone: the page's actions live in a bottom bar, as on D2 and D5. */
${S} .main { padding: 16px 16px 104px; }
${S} .note { bottom: 96px; }
${S} .bar7 { position: absolute; left: 0; right: 0; bottom: 0; z-index: 25; display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 70%, transparent); -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px); }
${S} .bar7 .cta, ${S} .bar7 .hold7 { margin-left: auto; padding: 14px 24px; }
${S} .bar7 .btn2 { padding: 10px 16px; }
${S} .bar7 .status7 { min-width: 0; font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .brow { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 12px; row-gap: 2px; align-items: center; padding: 12px 20px; }
${S} .brow .bl { display: flex; align-items: center; gap: 8px; }
${S} .brow .bcounts { grid-column: 1; }
${S} .brow .chev7 { grid-column: 2; grid-row: 1 / 3; }
${S} .tab7::after, ${S} .tbtn7::after, ${S} .vbtn7::after { content: ""; position: absolute; inset: -10px -6px; }
${S} .lane { flex-wrap: wrap; }
${S} .dlg7 .c7h { position: relative; padding-top: 20px; }
${S} .dlg7 .c7h::before { content: ""; position: absolute; top: 6px; left: 50%; width: 36px; height: 4px; margin-left: -18px; border-radius: 999px; background: color-mix(in srgb, var(--text-muted) 40%, transparent); }
${S} .dlg7 .icon-btn { position: relative; }
${S} .dlg7 .icon-btn::after { content: ""; position: absolute; inset: -6px; }
${S} .pbody { padding: 16px 16px 28px; }
`
    : ""
}
@media (prefers-reduced-motion: reduce) {
  ${S} .scrim7, ${S} .dlg7, ${S} .vpop7 { animation: d7-fade 150ms linear; }
  ${S} .tab7, ${S} .fab7, ${S} .brow, ${S} .vopt { transition: none; }
}
`;
}

/* ── Markup ────────────────────────────────────────────────────────────── */

function batchRows(T, phone) {
  if (!T.batches.length) return `<div class="es7">No batches yet</div>`;
  const n = (v) => (v == null ? `<span class="dim tnum">—</span>` : `<span class="tnum">${v}</span>`);
  return T.batches
    .map((b) => {
      /* A batch that has finished a stage and waits for a person says so in the same words as the Carousel types
         card and the bell (Garreth, 2026-09-21). A press that has not happened reads as a dash or a nought — the
         same rule D9 uses — so written but nothing rendered waits for Render, and rendered but nothing approved
         waits for Approve, however the count got to zero. A batch with some approvals on it is done: what it did
         not approve is what the checks caught, which is the n flagged below. */
      const nothing = (v) => v == null || v === 0;
      const toRender = !b.state && nothing(b.rendered);
      const toApprove = !b.state && !nothing(b.rendered) && nothing(b.approved);
      const flagged = !b.state && !toRender && !toApprove ? b.written - b.rendered : 0;
      const pill =
        b.state === "running"
          ? `<span class="pill pill--accent tnum">Writing ${b.written} of ${b.req}</span>`
          : b.state === "stopped"
            ? `<span class="pill">Stopped</span>`
            : toRender
              ? `<span class="pill tnum">${b.written} to render</span>`
              : toApprove
                ? `<span class="pill tnum">${b.rendered} to approve</span>`
                : flagged
                  ? `<span class="pill pill--danger tnum">${flagged} flagged</span>`
                  : "";
      const open = b.state === "running" ? "d7openRunning" : b.state === "stopped" ? "d7openStopped" : toRender ? "d7openToRender" : toApprove ? "d7openToApprove" : "d7openBatch";
      if (phone) {
        const counts = b.state
          ? `${b.written} of ${b.req} written`
          : toRender
            ? `${b.req} decks · ${b.written} written`
            : toApprove
              ? `${b.req} decks · ${b.rendered} rendered`
              : `${b.req} decks · ${b.rendered} rendered · ${b.approved} approved`;
        return `
                <button type="button" class="brow" onClick="{{${open}}}"><span class="bl"><span class="bdate tnum">${b.date}</span>${pill}</span><span class="bcounts tnum">${counts}</span><span class="chev7">${I.caretRightSm}</span></button>`;
      }
      return `
                <button type="button" class="brow bgrid" onClick="{{${open}}}"><span class="bdate tnum">${b.date}</span>${n(b.req)}${n(b.written)}${n(b.rendered)}${n(b.approved)}<span class="bstate">${pill}</span><span class="chev7">${I.caretRightSm}</span></button>`;
    })
    .join("");
}

function overview(T, init, phone) {
  const tiles = T.stats
    .map(([l, v]) => `<div class="tile7"><span class="sl7">${l}</span><span class="sv7 tnum${v === "—" ? " is-muted" : ""}">${esc(v)}</span></div>`)
    .join("");
  const details = T.details.map(([l, v]) => `<div class="drow"><span class="dl">${l}</span><span class="dv tnum">${esc(v)}</span></div>`).join("");
  return `
          <div class="ov7">
            <section class="c7" aria-label="Template">
              <div class="c7h">
                <div class="tplh">
                  <h2>Template</h2>
                  <div class="vsel">
                    <button type="button" class="vbtn7" aria-haspopup="listbox" aria-expanded="{{d7tvExpanded}}" onClick="{{d7tvToggle}}"><span class="tnum">{{d7tvName}}</span><span class="vd tnum">{{d7tvDate}}</span>${I.caretDown}</button>
                    <sc-if value="{{d7tvOpen}}" hint-placeholder-val="{{ ${!!init.tvOpen} }}">
                      <div class="vpop7" role="listbox" aria-label="Template versions" onKeyDown="{{d7tvKey}}">
                        <sc-for list="{{d7tvList}}" as="v" hint-placeholder-count="${T.templates.length}">
                          <button type="button" class="vopt" role="option" aria-selected="{{v.selected}}" onClick="{{v.pick}}"><b class="tnum">{{v.name}}</b><span class="vd tnum">{{v.date}}</span><span class="vend"><sc-if value="{{v.active}}" hint-placeholder-val="{{ false }}"><span class="pill pill--ok">Active</span></sc-if></span></button>
                        </sc-for>
                      </div>
                    </sc-if>
                  </div>
                  <sc-if value="{{d7tvActive}}" hint-placeholder-val="{{ ${!init.tv} }}"><span class="pill pill--ok">Active</span></sc-if>
                  <sc-if value="{{d7tvOld}}" hint-placeholder-val="{{ ${!!init.tv} }}"><button type="button" class="btn2" onClick="{{d7makeActive}}">Make active</button></sc-if>
                </div>
                ${phone ? "" : `<button type="button" class="btn2" onClick="{{d7editTemplate}}">${D7I.pencil}Edit template</button>`}
              </div>
              <div class="slides7">
                <sc-for list="{{d7slides}}" as="sl" hint-placeholder-count="${T.slides}">
                  <div class="slide7 {{sl.cls}}" role="img" aria-label="{{sl.label}}"><p class="st7 {{sl.textCls}}">{{sl.text}}</p></div>
                </sc-for>
              </div>
            </section>
            <div class="bento7">
              <div class="tiles7" aria-label="Pool">${tiles}</div>
              <section class="c7">
                <div class="c7h"><h2>Details</h2></div>
                <div class="drow"><span class="dl">Image library</span><span class="dv"><span class="libtile" aria-hidden="true"></span><span>Soft Window Light <span class="sub tnum">· 126</span></span></span></div>
                ${details}
              </section>
            </div>
            <section class="c7">
              <div class="c7h"><h2>Batches</h2><button type="button" class="tbtn7" onClick="{{d7history}}">History${I.caretRightSm}</button></div>
              ${phone || !T.batches.length ? "" : `<div class="bhead bgrid"><span>Date</span><span>Requested</span><span>Written</span><span>Rendered</span><span>Approved</span><span></span><span></span></div>`}
              ${batchRows(T, phone)}
            </section>
          </div>`;
}

/*
 * D15. The Rows tab: what is sitting in this type's lane table.
 *
 * `wired` decides whether there is a table to read at all. A type that has not gone live has none, and says so in
 * the empty state that names Go Live; a type that is live with nothing in it says "No rows yet". Both fill the
 * card down to the bottom of the screen (the rule of 2026-09-19).
 */
const SHOWN = 12;

function rowsPanel(T, init, phone, wired) {
  const lane = init.rows || "mixed";
  const all = LANE_ROWS[lane] || [];
  const rows = all.slice(0, SHOWN);
  const counts = LANE_COUNTS[lane] || { total: 0, ready: 0 };

  if (!wired) {
    return `
          <div class="rows15 is-empty">
            <section class="c7" aria-label="Rows">
              <div class="cempty">
                <span class="eic">${D7I.table}</span>
                <p>No rows until this type goes live</p>
                <button type="button" class="btn2" onClick="{{d7go.wiring}}">Go Live</button>
              </div>
            </section>
          </div>`;
  }

  const head = `
              <div class="c7h"><p class="counts15 tnum">${counts.total} rows<span class="rest"> · ${counts.ready} ready to post</span></p><span class="tbl15">${T.short}_decks</span></div>`;

  if (!rows.length) {
    return `
          <div class="rows15 is-empty">
            <section class="c7" aria-label="Rows">${head}
              <div class="cempty has-head">
                <span class="eic">${D7I.table}</span>
                <p>No rows yet</p>
              </div>
            </section>
          </div>`;
  }

  const body = rows
    .map((r, i) => {
      const thumb = `<span class="thumb15${r.img ? ` p7-${r.img}` : " is-none"}" aria-hidden="true"></span>`;
      const pill = `<span class="pill ${ST_TONE[r.st]}">${r.st}</span>`;
      const cap = r.cap ? `<span class="rcap">${esc(r.cap)}</span>` : `<span class="rcap rnone">—</span>`;
      if (phone) {
        const meta = [r.date, r.profile, r.music].filter(Boolean).join(" · ");
        return `
              <button type="button" class="rrow15 rgrid" onClick="{{d7openRow.r${i}}}">${thumb}<span class="rtop15"><span class="rid">${r.id}</span>${pill}</span>${cap}${meta ? `<span class="rmeta15 tnum">${esc(meta)}</span>` : ""}<span class="chev7">${I.caretRightSm}</span></button>`;
      }
      return `
              <button type="button" class="rrow15 rgrid" onClick="{{d7openRow.r${i}}}">${thumb}<span class="rid">${r.id}</span>${cap}<span class="rmus">${r.music ? esc(r.music) : "—"}</span><span class="rdate tnum">${r.date || "—"}</span><span class="rprof tnum">${r.profile || "—"}</span><span class="rst">${pill}</span><span class="chev7">${I.caretRightSm}</span></button>`;
    })
    .join("");

  const from = 1;
  const to = Math.min(PAGE_SIZE, counts.total);
  return `
          <div class="rows15">
            <section class="c7" aria-label="Rows">${head}
              ${phone ? "" : `<div class="rhead rgrid"><span></span><span>Id</span><span>Caption</span><span>Music</span><span>Posting date</span><span>Profile</span><span>Status</span><span></span></div>`}${body}
              <div class="pager15">
                <span class="tnum">${from}–${to} of ${counts.total}</span>
                <div class="pbtns">
                  <button type="button" class="btn2" aria-label="Previous page" disabled="{{ true }}">${D7I.prev}</button>
                  <button type="button" class="btn2" aria-label="Next page" onClick="{{d7nextPage}}">${D7I.next}</button>
                </div>
              </div>
            </section>
          </div>`;
}

function direction(T, init, phone) {
  const proposal = init.dir === "proposal";
  const failed = init.dir === "failed";
  /* D13b: the first draft was asked for and did not arrive. The same shape as any failed reply, with Retry. */
  const offerFailed = init.dir === "offerfail";
  /* D13: a type can have no Writing at all, or the Studio's drafted note sitting in the editor unsaved. Neither has
     a saved version yet, so neither shows the version dropdown. D13b adds a third, the first draft the Conversation
     wrote itself: it lands in the same place as the Studio's note, under the same Not saved pill. */
  const draft = init.writing === "draft" || init.writing === "first";
  const saved = init.writing !== "none" && !draft;
  /* What was asked. An offer pressed says so in the offer's own words, so the transcript reads back (D13b). */
  const asked = proposal || failed ? "Lean into winter skin, make the hook shorter, and put the hook in a bigger font." : init.writing === "first" || offerFailed ? "Write a first draft" : "";
  /* D13b: nothing written and nothing asked, so the panel carries the empty state and the one offer. Once the offer
     has been pressed the panel holds the exchange instead, even when the reply failed and the editor is still
     empty. `pre` holds a board back at the state D13 left it in, for the comparison the ticket asks for. */
  const noneYet = init.writing === "none" && !init.pre && !asked;
  /* One box, two states (Garreth, 2026-09-22): "What should change?" reads wrong on a blank page, so until a first
     version is saved the box asks what the type should sound like. */
  const boxAsk = init.writing !== "saved" && !init.pre ? "What should this type sound like?" : "What should change?";
  /* The offer itself: secondary, because Save version stays the tab's one accent. It shows in the Conversation's
     empty state, and again under the phone's editor, where the Conversation is a sheet and would be missed. */
  const offer = `<button type="button" class="btn2" onClick="{{d7firstDraft}}">${D7I.spark13}Write a first draft</button>`;
  const offerSub = `<span class="sub">from the active template and its ${T.slides} slides</span>`;
  const text = proposal
    ? `<div class="edtext diff" role="textbox" aria-multiline="true" aria-label="Writing">${DIFF.map(([k, t]) => (k === "add" ? `<ins>${esc(t)}</ins>` : k === "del" ? `<del>${esc(t)}</del>` : esc(t))).join("")}</div>`
    : `<textarea class="edtext" aria-label="Writing" placeholder="${esc(WRITING_PLACEHOLDER)}" value="{{d7dirText}}" onChange="{{d7typeDir}}"></textarea>`;
  /* The boxes the instruction is written against, listed under the editor (D13). */
  const boxes = `<span class="boxes7"><span class="bxl">Text boxes</span>${T.boxes.map((b) => `<span class="pill">${esc(b)}</span>`).join("")}</span>`;
  /* The versions are a dropdown, the same as the template's (Garreth, 2026-09-15, third review): the version picked
     is the one in the editor, with Make active beside it when it is not the active one. */
  const versions = `
                  <div class="tplh">
                    <div class="vsel">
                      <button type="button" class="vbtn7" aria-haspopup="listbox" aria-expanded="{{d7dvExpanded}}" onClick="{{d7dvToggle}}"><span class="tnum">{{d7dvName}}</span><span class="vd tnum">{{d7dvDate}}</span>${I.caretDown}</button>
                      <sc-if value="{{d7dvOpen}}" hint-placeholder-val="{{ ${!!init.dvOpen} }}">
                        <div class="vpop7" role="listbox" aria-label="Writing versions" onKeyDown="{{d7dvKey}}">
                          <sc-for list="{{d7dvList}}" as="v" hint-placeholder-count="${T.directions.length}">
                            <button type="button" class="vopt" role="option" aria-selected="{{v.selected}}" onClick="{{v.pick}}"><b class="tnum">{{v.name}}</b><span class="vd tnum">{{v.meta}}</span><span class="vend"><sc-if value="{{v.active}}" hint-placeholder-val="{{ false }}"><span class="pill pill--ok">Active</span></sc-if></span></button>
                          </sc-for>
                        </div>
                      </sc-if>
                    </div>
                    <sc-if value="{{d7dvActive}}" hint-placeholder-val="{{ ${!init.dv} }}"><span class="pill pill--ok">Active</span></sc-if>
                    <sc-if value="{{d7dvOld}}" hint-placeholder-val="{{ ${!!init.dv} }}"><button type="button" class="btn2" onClick="{{d7makeDirection}}">Make active</button></sc-if>
                    ${proposal ? `<span class="pill pill--accent">Suggested change</span>` : ""}
                  </div>
                  ${proposal ? `<button type="button" class="tbtn7" onClick="{{d7dropSuggestion}}">Discard suggestion</button>` : ""}`;
  /* Nothing saved yet: no version to pick, so the card takes the plain heading every other card has, and the
     Studio's draft says so with a neutral pill (D13). */
  const noVersions = `
                  <div class="tplh"><h2>Writing</h2>${draft ? `<span class="pill">Not saved</span>` : ""}</div>`;
  const editor = `
              <section class="c7 edcard">
                <div class="c7h">${saved ? versions : noVersions}
                </div>
                <div class="edbody">${text}</div>
                ${
                  phone
                    ? `${noneYet ? `<div class="edoffer">${offer}${offerSub}</div>` : ""}<div class="edboxes">${boxes}</div>`
                    : `<div class="edfoot">${boxes}<button type="button" class="cta" disabled="{{d7saveDisabled}}" onClick="{{d7saveVersion}}">Save version</button></div>`
                }
              </section>`;
  const me = asked ? `<div class="msg7 me"><div class="bub">${esc(asked)}</div></div>` : "";
  const reply = proposal
    ? `<div class="msg7 ai"><span class="aiv">${MARK}</span><div class="bub"><span>Changed two lines: winter in the opening, and the hook held to eight words. The hook's font size belongs to the template, not the direction, so that part is in Edit template.</span><div class="rules"><span class="pill">${D7I.book}Hooks under 8 words</span></div></div></div>`
    : init.writing === "first"
      ? `<div class="msg7 ai"><span class="aiv">${MARK}</span><div class="bub"><span>A first draft is in the editor, not saved. It reads the ${T.slides} slides as they stand, so it says what each one is for; the voice is a guess, and changing it is the next thing to ask for.</span><div class="rules"><span class="pill">${D7I.book}${esc(T.templates[0].name)}</span><span class="pill tnum">${T.slides} slides</span></div></div></div>`
      : failed || offerFailed
        ? `<div class="msg7 ai"><span class="aiv">${MARK}</span><div class="bub is-err"><span>The reply didn't arrive.</span><button type="button" class="btn2" onClick="{{d7retry}}">${D7I.retry}Retry</button></div></div>`
        : "";
  /* empty-state.tsx's shape: a muted circle over one quiet line, filling the card, with the offer under it. */
  const empty = `<div class="cempty"><span class="eic" aria-hidden="true">${D7I.note}</span><p>Nothing written for this type yet.</p>${offer}${offerSub}</div>`;
  const body = `<div class="msgs7">${noneYet ? empty : `${me}${reply}`}</div>`;
  const box = `<div class="cin7"><div class="ai7"><span class="aitile7" aria-hidden="true">${D7I.spark}</span><input type="text" aria-label="Message" placeholder="${esc(boxAsk)}" /><button type="button" class="aisend7" aria-label="Send" onClick="{{d7send}}">${D7I.send}</button></div></div>`;
  const chat = `
              <section class="c7 chat7" aria-label="Conversation">
                <div class="c7h"><div class="who"><span class="markv">${MARK}</span><h2>Conversation</h2></div></div>
                ${body}
                ${box}
              </section>`;
  /* The phone's Conversation is the sheet in appOverlay, built from these same two pieces (D13b). */
  if (phone) return { markup: `<div class="dir7">${editor}</div>`, body, box };
  return { markup: `<div class="dir7">${editor}${chat}</div>`, body, box };
}

function wiring(T, mode, phone) {
  const wired = WIRED_MODES.has(mode);
  const locked = mode === "running";
  const lanes = T.lanes.map((l, i) => ({ ...l, now: mode === "mismatch" && i > 0 ? l.was : l.now }));
  const total = lanes.reduce((a, l) => a + l.now, 0);
  const over = total - T.budget;
  const lanesHtml = lanes
    .map((l, i) => {
      const hint = l.now !== l.was && i > 0 ? `Was ${l.was} · ${l.ready}` : l.ready;
      const ctl = wired
        ? `<span class="lval tnum">${l.now} a week</span>`
        : `<div class="step7${l.now !== l.was ? " is-changed" : ""}"><button type="button" aria-label="Fewer for ${esc(l.name)}"${locked ? ` disabled="{{ true }}"` : ""}>${I.minus}</button><span class="tnum">${l.now}</span><button type="button" aria-label="More for ${esc(l.name)}"${locked ? ` disabled="{{ true }}"` : ""}>${I.plus}</button></div>`;
      return `<div class="lane"><span class="lname"><b>${esc(l.name)}</b><span class="tnum">${esc(hint)}</span></span>${ctl}</div>`;
    })
    .join("");
  const budgetPill = `<span class="pill tnum ${over === 0 ? "pill--ok" : "pill--danger"}">${total} / ${T.budget}</span>`;
  const status =
    mode === "mismatch" ? `<span class="status7 is-danger tnum">${over} too many</span>` : mode === "failed" ? `<span class="status7 is-danger">Rolled back</span>` : wired ? `<span class="status7 tnum">Wired ${T.wiredOn}</span>` : `<span class="status7"></span>`;
  const holdBtn = locked
    ? `<button type="button" class="hold7 is-busy" disabled="{{ true }}"><i aria-hidden="true"></i><span class="spin on">${I.busy}</span><span>Wiring</span></button>`
    : `<button type="button" class="hold7" aria-label="Wire, press and hold"${mode === "mismatch" ? ` disabled="{{ true }}"` : ""} onClick="{{d7wire}}"><i aria-hidden="true"></i><span>Wire</span></button>`;
  const previewBtn = `<button type="button" class="btn2" onClick="{{d7openPreview}}"${locked ? ` disabled="{{ true }}"` : ""}>${D7I.eye}Preview</button>`;
  const form = `
              <section class="c7${locked ? " is-locked" : ""}">
                <div class="c7h"><h2>Set up</h2></div>
                <div class="frow7">
                  <label class="flabel7" for="d7-display">Display name</label>
                  ${wired ? `<span class="ro7">${esc(T.name)}</span>` : `<div class="field7"><input id="d7-display" type="text" value="${esc(T.name)}" /></div>`}
                </div>
                <div class="frow7">
                  <span class="flabel7">Cadence</span>
                  <div>
                    <div class="budget"><b>${T.character}</b>${budgetPill}${mode === "mismatch" ? `<span class="over tnum">${over} too many</span>` : ""}</div>
                    <div class="lanes">${lanesHtml}</div>
                  </div>
                </div>
                ${phone ? "" : wired ? `<div class="wfoot">${status}</div>` : `<div class="wfoot">${status}${previewBtn}${holdBtn}</div>`}
              </section>`;

  const items = checklist(T);
  const ticked = items.filter((it, i) => itemState(mode, it.key, i).st === "ok").length;
  const head =
    mode === "failed" ? `<span class="pill pill--danger">Rolled back</span>` : mode === "done" ? `<span class="pill pill--ok tnum">${ticked} of ${items.length}</span>` : `<span class="cnt tnum">${ticked} of ${items.length}</span>`;
  const iconOf = { todo: D7I.todo, ok: D7I.ok, fail: D7I.fail, warn: D7I.warn, busy: `<span class="spin on">${I.busy}</span>` };
  const labelOf = { todo: "Not done", ok: "Done", fail: "Failed", warn: "Needs attention", busy: "Running" };
  const itemsHtml = items
    .map((it, i) => {
      const st = itemState(mode, it.key, i);
      const detail = st.detail ?? it.detail;
      const code = it.code && !st.detail;
      let extra = "";
      if (it.key === "media" && mode !== "done") {
        extra =
          `<div class="mline"><code class="mono">${T.short}: { table: "${T.short}_decks", kind: "carousel" },</code><button type="button" class="btn2" onClick="{{d7copy}}">${D7I.copy}Copy</button></div>` +
          (mode === "media" ? `<div class="mact"><span class="why">${st.note}</span><button type="button" class="btn2" onClick="{{d7check}}">${D7I.retry}Check again</button></div>` : "");
      } else if (st.note) {
        extra = `<span class="why">${st.note}</span>`;
      }
      return `
                <div class="item st-${st.st}"><span class="ic" role="img" aria-label="${labelOf[st.st]}">${iconOf[st.st]}</span><span class="nm">${esc(it.name)}</span><span class="dt tnum ${code ? "mono" : ""} ${st.detailCls || ""}">${esc(detail)}</span>${extra}</div>`;
    })
    .join("");
  const list = `
              <section class="c7">
                <div class="c7h"><h2>Checklist</h2>${head}</div>
                <div class="items">${itemsHtml}
                </div>
              </section>`;
  return `<div class="wire7">${form}${list}</div>`;
}

function header(T, wired, mode, phone, init) {
  /* The name and pills come from the link that opened the page (the prototype); the review boards show T's own.
     Needs writing is neutral, like Not wired, and sits closest to Generate because it is why Generate is off (D13). */
  const needsWriting = init.writing !== "saved";
  const statusPill =
    (!wired ? `<span class="pill">Not wired</span>` : mode === "media" ? `<span class="pill pill--warn">Media map missing</span>` : "") +
    (needsWriting ? `<span class="pill">Needs writing</span>` : "");
  const actions = phone
    ? ""
    : `<div class="t7act">
                <sc-if value="{{d7genAccent}}" hint-placeholder-val="{{ true }}"><button type="button" class="cta" onClick="{{d7generate}}">Generate</button></sc-if>
                <sc-if value="{{d7genPlain}}" hint-placeholder-val="{{ false }}"><button type="button" class="btn2" onClick="{{d7generate}}">Generate</button></sc-if>
              </div>`;
  return `
          <div class="t7head">
            <button type="button" class="up7" onClick="{{d7back}}">${I.backSm}Carousel types</button>
            <div class="t7title">
              <div class="t7name">
                <h1>{{d7name}}</h1>
                <div class="t7meta"><span class="pill">{{d7character}}</span><span class="pill tnum">{{d7slidesText}}</span>${statusPill}</div>
              </div>
              ${actions}
            </div>
          </div>`;
}

function page(T, init, phone) {
  const mode = init.wire;
  const wired = T === TYPES.before || WIRED_MODES.has(mode);
  const tab = (id, label) =>
    `<button type="button" role="tab" class="tab7" id="d7-tab-${id}" aria-selected="{{d7sel.${id}}}" aria-controls="d7-panel-${id}" onClick="{{d7go.${id}}}">${label}</button>`;
  const panel = (id, html) =>
    `<sc-if value="{{d7is.${id}}}" hint-placeholder-val="{{ ${init.tab === id} }}"><div role="tabpanel" id="d7-panel-${id}" aria-labelledby="d7-tab-${id}">${html}</div></sc-if>`;
  return `
      <main class="main">
        <div class="page {{d7pageCls}}">
          ${header(T, wired, mode, phone, init)}
          <!-- D13: the panel ids keep the names the docs and the database use; only the labels changed.
               D15 adds Rows between Writing and Go Live. -->
          <div class="tabs7" role="tablist" aria-label="Carousel type">${tab("overview", "Overview")}${tab("direction", "Writing")}${tab("rows", "Rows")}${tab("wiring", "Go Live")}</div>
          ${panel("overview", overview(T, init, phone))}
          ${panel("direction", direction(T, init, phone).markup)}
          ${panel("rows", rowsPanel(T, init, phone, wired))}
          ${panel("wiring", wiring(T, mode, phone))}
        </div>
      </main>`;
}

/* At the app's level: the click-away layer for the version dropdown, Preview's dialog, and on the phone the
   Conversation as a sheet (D13b). */
function appOverlay(T, init) {
  const conv = direction(T, init, true);
  const lanes = T.lanes.map((l) => `${l.name.padEnd(20)} ${l.was} → ${l.now}`).join("\n");
  const secs = [
    ["Lane table", `create table ${T.short}_decks (\n  id text primary key,\n  slide_1 text, slide_2 text, slide_3 text,\n  slide_4 text, slide_5 text,\n  caption text,\n  music text,\n  approved boolean default false,\n  scheduler_ready boolean default false\n);`],
    ["Ready trigger", `create trigger ${T.short}_ready\n  before update on ${T.short}_decks\n  for each row execute function set_scheduler_ready();`],
    ["Registry row", `content_type  ${T.short}\ndisplay_name  ${T.name}\ncharacter     ${T.character}\nkind          carousel`],
    ["Character allow-list", `${T.character}  + ${T.short}`],
    ["Posts view", `union all\nselect id, '${T.short}' as content_type, caption, music\nfrom ${T.short}_decks`],
    ["Scheduler pool", `union all\nselect id, '${T.short}' as content_type\nfrom ${T.short}_decks\nwhere scheduler_ready`],
    ["Cadence", lanes],
  ];
  return `
  <sc-if value="{{d7anyOpen}}" hint-placeholder-val="{{ ${!!(init.tvOpen || init.dvOpen)} }}"><div class="catch7" aria-hidden="true" onClick="{{d7closeMenus}}"></div></sc-if>
  <sc-if value="{{d7previewOn}}" hint-placeholder-val="{{ ${!!init.preview} }}">
    <div class="scrim7" aria-hidden="true" onClick="{{d7closePreview}}"></div>
    <div class="dlg7" role="dialog" aria-modal="true" aria-labelledby="d7-preview-title" onKeyDown="{{d7previewKey}}">
      <div class="c7h"><h2 id="d7-preview-title">Preview</h2><button type="button" class="icon-btn" aria-label="Close" onClick="{{d7closePreview}}">${D7I.x}</button></div>
      <div class="pbody">${secs.map(([h, code]) => `<section class="psec"><h3>${h}</h3><pre class="mono">${esc(code)}</pre></section>`).join("")}</div>
    </div>
  </sc-if>
  <!-- D13b: the phone's Conversation, the same sheet as Preview's. It holds the same empty state and the same
       offer as the desktop panel, so a phone writer meets the offer twice and never a third wording. -->
  <sc-if value="{{d7chatOn}}" hint-placeholder-val="{{ ${!!init.sheet} }}">
    <div class="scrim7" aria-hidden="true" onClick="{{d7closeChat}}"></div>
    <div class="dlg7 chats7" role="dialog" aria-modal="true" aria-label="Conversation" onKeyDown="{{d7chatKey}}">
      <div class="c7h"><div class="who"><span class="markv">${MARK}</span><h2>Conversation</h2></div><button type="button" class="icon-btn" aria-label="Close" onClick="{{d7closeChat}}">${D7I.x}</button></div>
      ${conv.body}
      ${conv.box}
    </div>
  </sc-if>
  <!-- D15: a row's drawer — every column that row has, in the table's own order. An empty column reads as a dash
       rather than being left out, because an empty column is the answer to why the row cannot post. It comes in
       from the side so the table it was opened from is still read behind it; on the phone it is the same sheet as
       Preview's. -->
  <sc-if value="{{d7rowOn}}" hint-placeholder-val="{{ ${init.row != null} }}">
    <div class="scrim7" aria-hidden="true" onClick="{{d7closeRow}}"></div>
    <div class="dlg7 drw15" role="dialog" aria-modal="true" aria-label="Row" onKeyDown="{{d7rowKey}}">
      <div class="c7h drwh">
        <div class="dwho"><h2>{{d7rowId}}</h2><span class="dsub tnum">{{d7rowCount}} columns</span></div>
        <div class="dend"><span class="pill {{d7rowStCls}}">{{d7rowSt}}</span><button type="button" class="icon-btn" aria-label="Close" onClick="{{d7closeRow}}">${D7I.x}</button></div>
      </div>
      <div class="dslides" aria-hidden="true">
        <sc-for list="{{d7rowSlides}}" as="sl" hint-placeholder-count="${T.slides}"><span class="dsl {{sl.cls}}"></span></sc-for>
      </div>
      <div class="cols15">
        <sc-for list="{{d7rowCols}}" as="c" hint-placeholder-count="14">
          <div class="crow15"><span class="ck15">{{c.k}}</span><span class="cv15 {{c.cls}}">{{c.v}}</span></div>
        </sc-for>
      </div>
      <sc-if value="{{d7rowHasBatch}}" hint-placeholder-val="{{ true }}">
        <div class="drwfoot"><button type="button" class="btn2" onClick="{{d7openDeck}}">Open the deck${I.caretRightSm}</button></div>
      </sc-if>
    </div>
  </sc-if>`;
}

/* The phone's bottom bar, per tab, and the folded conversation's round button on Direction. */
function phoneBar(T, init) {
  const mode = init.wire;
  const wired = T === TYPES.before || WIRED_MODES.has(mode);
  const lanes = T.lanes.map((l, i) => (mode === "mismatch" && i > 0 ? l.was : l.now));
  const total = lanes.reduce((a, b) => a + b, 0);
  const wireBar = WIRED_MODES.has(mode)
    ? `<span class="status7 tnum">Wired ${T.wiredOn}</span><button type="button" class="cta" onClick="{{d7generate}}">Generate</button>`
    : `<span class="pill tnum ${total === T.budget ? "pill--ok" : "pill--danger"}">${total} / ${T.budget}</span><button type="button" class="btn2" onClick="{{d7openPreview}}">${D7I.eye}Preview</button>` +
      (mode === "running"
        ? `<button type="button" class="hold7 is-busy" disabled="{{ true }}"><i aria-hidden="true"></i><span class="spin on">${I.busy}</span><span>Wiring</span></button>`
        : `<button type="button" class="hold7" aria-label="Wire, press and hold"${mode === "mismatch" ? ` disabled="{{ true }}"` : ""} onClick="{{d7wire}}"><i aria-hidden="true"></i><span>Wire</span></button>`);
  return `
    <sc-if value="{{d7is.overview}}" hint-placeholder-val="{{ ${init.tab === "overview"} }}"><div class="bar7"><button type="button" class="btn2" onClick="{{d7editTemplate}}">${D7I.pencil}Edit template</button><button type="button" class="cta" onClick="{{d7generate}}">Generate</button></div></sc-if>
    <sc-if value="{{d7is.direction}}" hint-placeholder-val="{{ ${init.tab === "direction"} }}">
      <button type="button" class="fab7" aria-label="Open the conversation" onClick="{{d7openChat}}">${MARK}${init.dir === "proposal" || init.writing === "first" ? `<span class="dot" aria-hidden="true"></span>` : ""}</button>
      <div class="bar7">${init.dir === "proposal" ? `<button type="button" class="btn2" onClick="{{d7dropSuggestion}}">Discard suggestion</button>` : ""}<button type="button" class="cta" disabled="{{d7saveDisabled}}" onClick="{{d7saveVersion}}">Save version</button></div>
    </sc-if>
    <sc-if value="{{d7is.wiring}}" hint-placeholder-val="{{ ${init.tab === "wiring"} }}"><div class="bar7">${wireBar}</div></sc-if>`;
}

/* ── Behaviour ─────────────────────────────────────────────────────────── */

function vals(T, init) {
  const TPL = T.templates.map((v) => ({ name: v.name, date: v.date, active: !!v.active, hook: v.hook, imgs: v.imgs.slice(0, T.slides) }));
  /* D15: the rows on the page, and for each one every column it has. A row that has not been rendered has no
     slide URLs at all, so its thumbnails are empty frames — which is the same fact its status says in words. */
  const wired15 = T === TYPES.before || WIRED_MODES.has(init.wire);
  const lane15 = (LANE_ROWS[init.rows || "mixed"] || []).slice(0, SHOWN);
  const ROWS15 = lane15.map((r) => ({
    id: r.id,
    st: r.st,
    tone: ST_TONE[r.st],
    /* Which batch the row was made from, so the drawer can open that deck. A row the old n8n path wrote has
       none, and then the drawer has no button (Garreth, 2026-09-22). */
    batch: laneColumns(T, r).find(([k]) => k === "batch")[1] || "",
    slides: r.img
      ? rotate(PHOTOS, PHOTOS.indexOf(r.img)).slice(0, T.slides).map((img) => ({ cls: `p7-${img}` }))
      : Array.from({ length: T.slides }, () => ({ cls: "is-none" })),
    cols: laneColumns(T, r).map(([k, v]) => ({ k, v: v == null || v === "" ? "\u2014" : String(v), cls: v == null || v === "" ? "is-none" : "" })),
  }));
  /* The two batches waiting for a person (Garreth, 2026-09-21): their rows open the screen that holds the press. */
  const wRender = T.batches.find((b) => !b.state && (b.rendered == null || b.rendered === 0)) || { req: 20, written: 0 };
  const wApprove = T.batches.find((b) => !b.state && b.rendered && (b.approved == null || b.approved === 0)) || { req: 20, rendered: 0 };
  return `
    var P = s.params || {};
    var NAME = P.name || ${JSON.stringify(T.name)};
    var PROPOSAL = ${init.dir === "proposal"};
    /* D13: no Writing saved means no version to pick and Generate unavailable. The Studio's draft counts as not
       saved — the requirement is met by someone having read it and pressed Save version, not by a full field. */
    var NOWRITING = ${init.writing !== "saved"};
    var DIRS = ${JSON.stringify(init.writing === "saved" ? T.directions : [])};
    var TPL = ${JSON.stringify(TPL)};
    var LINES = ${JSON.stringify(T.lines)};
    /* A link may name the tab to open on (the Generate form's Edit opens Direction) until a tab is pressed. */
    var tab = s.d7tabSet ? s.d7tab : P.tab || s.d7tab;
    var d7is = {}, d7sel = {}, d7go = {};
    ["overview", "direction", "rows", "wiring"].forEach(function (t) {
      d7is[t] = tab === t;
      d7sel[t] = tab === t ? "true" : "false";
      d7go[t] = function () { self.setState({ d7tab: t, d7tabSet: true, d7tvOpen: false, d7dvOpen: false, d7row: null }); };
    });
    var say = function (text) { return function () { self.note(text); }; };
    var params = { name: NAME, character: P.character || ${JSON.stringify(T.character)}, slides: P.slides || ${JSON.stringify(`${T.slides} slides`)}, size: P.size || ${JSON.stringify(T.size || "4:5")} };
    var ROWS = ${JSON.stringify(ROWS15)};
    var OPENROW = {};
    ROWS.forEach(function (r, i) { OPENROW["r" + i] = function () { self.setState({ d7row: i }); }; });
    var R = s.d7row == null || s.d7row < 0 ? null : ROWS[s.d7row];
    var cur = TPL[s.d7tv] || TPL[0];
    var dv = DIRS[s.d7dv] || DIRS[0] || { name: "", date: "", active: false, text: "" };
    return {
      d7is: d7is, d7sel: d7sel, d7go: d7go,
      d7name: NAME,
      d7character: params.character,
      d7slidesText: params.slides,
      /* One accent a screen: on Direction, Save version is the accent and Generate steps back to secondary. A type not
         wired yet has Generate too, so its first batch can be made; its approved decks wait for Wire (Garreth, 2026-09-15). */
      d7genAccent: tab !== "direction",
      d7genPlain: tab === "direction",
      d7back: function () { ctx.open("types", null, "Back to Carousel types · D1"); },
      d7generate: function () { ctx.open("generate", Object.assign({}, params, { nowriting: NOWRITING ? "1" : "" }), "Opens the Generate form for " + NAME + (NOWRITING ? ", which has no Writing yet" : "") + " · D2"); },
      d7editTemplate: function () { ctx.open("studio", null, "Opens the Studio on " + NAME + "'s active version · D6"); },
      d7history: function () { ctx.open("history", { type: NAME }, "Opens History, filtered to " + NAME + " · D9"); },

      /* The template: one version at a time, from the dropdown (Garreth, 2026-09-15). */
      d7tvName: cur.name,
      d7tvDate: cur.date,
      d7tvActive: cur.active,
      d7tvOld: !cur.active,
      d7tvOpen: !!s.d7tvOpen,
      d7tvExpanded: s.d7tvOpen ? "true" : "false",
      d7tvToggle: function () { self.setState({ d7tvOpen: !s.d7tvOpen, d7dvOpen: false }); },
      d7tvClose: function () { self.setState({ d7tvOpen: false }); },
      d7tvKey: function (e) { if (e.key === "Escape") { e.stopPropagation(); self.setState({ d7tvOpen: false }); } },
      d7tvList: TPL.map(function (v, i) {
        var on = i === (s.d7tv || 0);
        return { name: v.name, date: v.date, active: v.active, selected: on ? "true" : "false", pick: function () { self.setState({ d7tv: i, d7tvOpen: false }); } };
      }),
      d7makeActive: say("Makes " + cur.name + " the active template; new batches use it"),
      d7slides: cur.imgs.map(function (img, i) {
        var text = i === 0 ? cur.hook : LINES[i - 1];
        return { cls: "p7-" + img, text: text, textCls: i === 0 ? "st7--hook" : "", label: "Slide " + (i + 1) + ": " + text };
      }),

      /* A batch row opens that batch: its decks, rendered and any flagged, or the batch still writing (Garreth, 2026-09-15). */
      d7openBatch: function () { ctx.open("render", { name: NAME, character: params.character, slides: params.slides, size: params.size, count: 20 }, "Opens that batch's decks: rendered, and any flagged or failed · D5"); },
      d7openRunning: function () { ctx.open("batch", { name: NAME, character: params.character, slides: params.slides, size: params.size, count: 20, writtenUpTo: 7 }, "Opens the running batch · D3"); },
      d7openStopped: function () { ctx.open("batch", { name: NAME, character: params.character, slides: params.slides, size: params.size, count: 50, writtenUpTo: 12 }, "Opens the stopped batch, with Continue · D3"); },
      /* A waiting row opens the screen that holds the press: written waits for Render (D4), rendered waits for
         Approve (D5) (Garreth, 2026-09-21). */
      d7openToRender: function () { ctx.open("review", { name: NAME, character: params.character, slides: params.slides, size: params.size, count: ${wRender.req} }, "Opens the written batch, with Render ${wRender.written} decks · D4"); },
      d7openToApprove: function () { ctx.open("render", { name: NAME, character: params.character, slides: params.slides, size: params.size, count: ${wApprove.req} }, "Opens the finished batch, with Approve ${wApprove.rendered} decks · D5"); },

      /* The direction's versions: the same dropdown as the template's (Garreth, 2026-09-15, third review). */
      d7dvName: dv.name,
      d7dvDate: dv.date,
      d7dvActive: !!dv.active,
      d7dvOld: !dv.active,
      d7dvOpen: !!s.d7dvOpen,
      d7dvExpanded: s.d7dvOpen ? "true" : "false",
      d7dvToggle: function () { self.setState({ d7dvOpen: !s.d7dvOpen, d7tvOpen: false }); },
      d7dvKey: function (e) { if (e.key === "Escape") { e.stopPropagation(); self.setState({ d7dvOpen: false }); } },
      d7dvList: DIRS.map(function (v, i) {
        var on = i === (s.d7dv || 0);
        return { name: v.name, meta: v.date + " · " + v.by, active: !!v.active, selected: on ? "true" : "false", pick: function () { self.setState({ d7dv: i, d7dvOpen: false, d7dir: v.text }); } };
      }),
      d7makeDirection: say("Makes " + dv.name + " the active Writing; new batches are written from it"),
      d7anyOpen: !!(s.d7tvOpen || s.d7dvOpen),
      d7closeMenus: function () { self.setState({ d7tvOpen: false, d7dvOpen: false }); },
      d7dirText: s.d7dir,
      d7typeDir: function (e) { self.setState({ d7dir: e.target.value }); },
      d7saveDisabled: !(PROPOSAL || s.d7dir !== dv.text),
      d7saveVersion: say("Saves Version " + (DIRS.length + 1) + " and makes it active"),
      d7dropSuggestion: say("Drops the suggestion; Version 4 stays as it is"),
      d7send: say("Sends the message"),
      d7retry: say("Asks again"),
      /* D13b: the one offer. It fills the editor and leaves it unsaved, exactly where the Studio's note lands, so
         Save version stays the press that meets the requirement (Garreth, 2026-09-22). */
      d7firstDraft: say("Writes a first draft from the active template and its ${T.slides} slides; it opens in the editor, not saved"),
      /* The phone's Conversation opens and closes for real, as Preview's sheet does. */
      d7chatOn: !!s.d7chat,
      d7openChat: function () { self.setState({ d7chat: true }); },
      d7closeChat: function () { self.setState({ d7chat: false }); },
      d7chatKey: function (e) { if (e.key === "Escape") self.setState({ d7chat: false }); },
      d7copy: say("Copied the media line"),
      d7check: say("Reads the published Smart Scheduler again"),
      d7wire: say("Wire is a press and hold"),
      d7previewOn: !!s.d7preview,
      d7openPreview: function () { self.setState({ d7preview: true }); },
      d7closePreview: function () { self.setState({ d7preview: false }); },
      d7previewKey: function (e) { if (e.key === "Escape") self.setState({ d7preview: false }); },

      /* D15: Rows. Read-only — the only presses are the tab, the pager and a row, and a row only opens the drawer.
         With nothing to list, the page grows so the card reaches the bottom of the screen (the rule of
         2026-09-19); with rows in it the page is its own length. */
      d7pageCls: tab === "rows" && ${!wired15 || !lane15.length} ? "is-fill" : "",
      d7nextPage: say("Shows rows 51 to 100"),
      d7openRow: OPENROW,
      d7rowOn: !!R,
      d7rowId: R ? R.id : "",
      d7rowSt: R ? R.st : "",
      d7rowStCls: R ? R.tone : "",
      d7rowCount: R ? R.cols.length : 0,
      d7rowSlides: R ? R.slides : [],
      d7rowCols: R ? R.cols : [],
      d7rowHasBatch: !!(R && R.batch),
      /* The one way out of a read-only table: that deck, in the batch it came from. A lane row exists only once
         the batch was rendered and approved, so it is always a finished batch (D5). */
      d7openDeck: function () { ctx.open("render", { name: NAME, character: params.character, slides: params.slides, size: params.size, count: 20 }, "Opens " + (R ? R.id : "that deck") + " in its " + (R ? R.batch : "") + " batch \u00b7 D5"); },
      d7closeRow: function () { self.setState({ d7row: null }); },
      d7rowKey: function (e) { if (e.key === "Escape") self.setState({ d7row: null }); }
    };`;
}

/**
 * D7 as a screen. `init`: type ("before" wired, "quiet" not wired), tab, tv (the template version showing, 0 is
 * the newest), tvOpen (its dropdown open), dv and dvOpen (the same for the writing), dir ("plain" | "proposal" |
 * "failed" | "offerfail", D13b), wire ("fresh" | "mismatch" |
 * "running" | "failed" | "media" | "done"), writing ("saved" | "none" | "draft", D13; "first", the Conversation's
 * own first draft, D13b), sheet (the phone's Conversation open, D13b), pre (a board held at the state D13 left it
 * in, for comparison, D13b), preview (the dialog open), rows ("mixed" | "stuck" | "none", which lane the Rows
 * tab reads, D15) and row (the index of the row whose drawer is open, D15).
 * `tall` lengthens a review board so the whole page shows.
 */
export function typeScreen({ init = {}, tall = 0 } = {}) {
  const i = { type: "before", tab: "overview", tv: 0, tvOpen: false, dv: 0, dvOpen: false, dir: "plain", wire: "done", writing: "saved", preview: false, sheet: false, pre: false, rows: "mixed", row: null, ...init };
  const T = TYPES[i.type];
  /* What the editor opens on: a saved version, the Studio's drafted note or the Conversation's first draft (both
     unsaved, D13b), or nothing at all (D13). */
  const startText = i.writing === "none" ? "" : i.writing === "draft" ? DRAFTED_NOTE : i.writing === "first" ? FIRST_DRAFT : T.directions[i.dv].text;
  return {
    id: "type",
    nav: "types",
    css: (phone) => css(phone, { tall, slides: T.slides, size: T.size }),
    markup: (phone) => page(T, i, phone),
    appOverlay: () => appOverlay(T, i),
    colOverlay: (phone) => (phone ? phoneBar(T, i) : ""),
    state: { d7tab: i.tab, d7tabSet: false, d7tv: i.tv, d7tvOpen: i.tvOpen, d7dv: i.dv, d7dvOpen: i.dvOpen, d7dir: startText, d7preview: i.preview, d7chat: i.sheet, d7row: i.row },
    enter: { d7tab: "overview", d7tabSet: false, d7tv: 0, d7tvOpen: false, d7dv: 0, d7dvOpen: false, d7dir: T.directions[0].text, d7preview: false, d7chat: false, d7row: null },
    vals: vals(T, i),
  };
}

/* ── Review artboards ──────────────────────────────────────────────────── */

function build(OUT) {
  fs.mkdirSync(OUT, { recursive: true });
  copyTypeImages(OUT);
  const D = 1540;
  const TALL = 1240;
  const TALL_PHONE = 1640;
  const R0 = TALL_PHONE + 140;
  const R = 1040;
  /* D15's own two rows, below everything D13b left. A Rows board is tall enough to show the card down to its
     pager; the drawer spans that same height, so most of a row's columns are read without scrolling. */
  const T15 = 1240;
  const R15 = R0 + R * 7;
  const BOARDS = [
    { file: "Overview", tall: TALL, init: { type: "before", tab: "overview" }, title: "Overview · Desktop", x: 0, y: 0 },
    { file: "OverviewVersions", tall: TALL, init: { type: "before", tab: "overview", tv: 1, tvOpen: true }, title: "Overview, picking a template version · Desktop", x: D, y: 0 },
    { file: "OverviewPhone", phone: true, tall: TALL_PHONE, init: { type: "before", tab: "overview" }, title: "Overview · Phone", x: D * 2, y: 0 },
    { file: "Writing", init: { type: "before", tab: "direction", dir: "proposal" }, title: "Writing, a suggested change · Desktop", x: 0, y: R0 },
    { file: "WritingFailed", init: { type: "before", tab: "direction", dir: "failed" }, title: "Writing, the reply failed · Desktop", x: D, y: R0 },
    { file: "WritingPhone", phone: true, init: { type: "before", tab: "direction", dir: "proposal" }, title: "Writing, a suggested change · Phone", x: D * 2, y: R0 },
    { file: "WritingVersions", init: { type: "before", tab: "direction", dv: 1, dvOpen: true }, title: "Writing, picking a version · Desktop", x: D * 2 + 470, y: R0 },
    { file: "GoLive", init: { type: "quiet", tab: "wiring", wire: "fresh" }, title: "Newly saved, arriving on Go Live · Desktop", x: 0, y: R0 + R },
    { file: "GoLivePhone", phone: true, init: { type: "quiet", tab: "wiring", wire: "fresh" }, title: "Newly saved, arriving on Go Live · Phone", x: D, y: R0 + R },
    { file: "Mismatch", init: { type: "quiet", tab: "wiring", wire: "mismatch" }, title: "Cadence does not add up, Wire unavailable · Desktop", x: 0, y: R0 + R * 2 },
    { file: "Running", init: { type: "quiet", tab: "wiring", wire: "running" }, title: "Wiring, the checklist ticking · Desktop", x: D, y: R0 + R * 2 },
    { file: "CheckFailed", init: { type: "quiet", tab: "wiring", wire: "failed" }, title: "A check failed, rolled back · Desktop", x: 0, y: R0 + R * 3 },
    { file: "MediaMissing", init: { type: "quiet", tab: "wiring", wire: "media" }, title: "Media entry missing from n8n · Desktop", x: D, y: R0 + R * 3 },
    { file: "AllTicked", init: { type: "quiet", tab: "wiring", wire: "done" }, title: "Wired, every item ticked · Desktop", x: 0, y: R0 + R * 4 },
    { file: "Preview", init: { type: "quiet", tab: "wiring", wire: "fresh", preview: true }, title: "Preview, what Wire will run · Desktop", x: D, y: R0 + R * 4 },
    { file: "PreviewPhone", phone: true, init: { type: "quiet", tab: "wiring", wire: "fresh", preview: true }, title: "Preview, what Wire will run · Phone", x: D * 2, y: R0 + R * 4 },
    /* D13 (Garreth, 2026-09-21): Writing is required, so a type saved out of the Studio starts here. Quiet Luxury
       Picks is that type on every board below: nothing written, the Studio's own drafted note, and the header a
       person meets when neither has been saved. */
    { file: "WritingEmpty", init: { type: "quiet", tab: "direction", wire: "fresh", writing: "none" }, title: "Writing, nothing written yet · Desktop", x: 0, y: R0 + R * 5 },
    { file: "WritingDraft", init: { type: "quiet", tab: "direction", wire: "fresh", writing: "draft" }, title: "Writing, the Studio's drafted note, not saved · Desktop", x: D, y: R0 + R * 5 },
    { file: "NeedsWriting", init: { type: "quiet", tab: "overview", wire: "fresh", writing: "none" }, title: "A type that needs writing: the pill, and Generate still opens the form · Desktop", x: D * 2, y: R0 + R * 5 },
    { file: "WritingEmptyPhone", phone: true, init: { type: "quiet", tab: "direction", wire: "fresh", writing: "none" }, title: "Writing, nothing written yet · Phone", x: D * 3, y: R0 + R * 5 },
    { file: "NeedsWritingPhone", phone: true, init: { type: "quiet", tab: "overview", wire: "fresh", writing: "none" }, title: "A type that needs writing: the pill, and Generate still opens the form · Phone", x: D * 3 + 470, y: R0 + R * 5 },
    /* D13b (Garreth, 2026-09-22): on a type with nothing written the Conversation offers one first draft, and the
       box asks what the type should sound like rather than what should change. The before board is kept beside
       them so the change can be read off the canvas. */
    { file: "WritingBefore", init: { type: "quiet", tab: "direction", wire: "fresh", writing: "none", pre: true }, title: "Before D13b: nothing written, the Conversation blank · Desktop", x: 0, y: R0 + R * 6 },
    { file: "WritingFirstDraft", init: { type: "quiet", tab: "direction", wire: "fresh", writing: "first" }, title: "The first draft arrived from the Conversation, not saved · Desktop", x: D, y: R0 + R * 6 },
    { file: "WritingOfferFailed", init: { type: "quiet", tab: "direction", wire: "fresh", writing: "none", dir: "offerfail" }, title: "The first draft didn't arrive, Retry · Desktop", x: D * 2, y: R0 + R * 6 },
    { file: "WritingSheetPhone", phone: true, init: { type: "quiet", tab: "direction", wire: "fresh", writing: "none", sheet: true }, title: "The Conversation's sheet, with the same offer · Phone", x: D * 3, y: R0 + R * 6 },
    { file: "WritingFirstDraftPhone", phone: true, init: { type: "quiet", tab: "direction", wire: "fresh", writing: "first" }, title: "The first draft arrived, not saved · Phone", x: D * 3 + 470, y: R0 + R * 6 },
    /* D15 (Garreth, 2026-09-21), the last two rows: the Rows tab — what is sitting in the type's lane table, and
       why a row cannot post. Read-only, a fixed set of columns, fifty rows a page, and a whole row opens the
       drawer. Before & After is the live lane, on a good day and on a bad one; Quiet Luxury Picks is the type
       that has not gone live, and the same type once it has, with nothing in it yet. */
    { file: "Rows", tall: T15, init: { type: "before", tab: "rows", rows: "mixed" }, title: "Rows, the ordinary case · Desktop", x: 0, y: R15 },
    { file: "RowsStuck", tall: T15, init: { type: "before", tab: "rows", rows: "stuck" }, title: "Rows, nothing postable and the reason different row to row · Desktop", x: D, y: R15 },
    { file: "RowsPhone", phone: true, tall: 1580, init: { type: "before", tab: "rows", rows: "mixed" }, title: "Rows, stacked · Phone", x: D * 2, y: R15 },
    { file: "RowsNotLivePhone", phone: true, init: { type: "quiet", tab: "rows", wire: "fresh", writing: "none" }, title: "Not live yet: no table to read · Phone", x: D * 2 + 470, y: R15 },
    { file: "RowsDrawerPhone", phone: true, init: { type: "before", tab: "rows", rows: "mixed", row: 2 }, title: "A row's drawer · Phone", x: D * 2 + 940, y: R15 },
    { file: "RowsDrawer", tall: T15, init: { type: "before", tab: "rows", rows: "mixed", row: 2 }, title: "A row's drawer: the caption column is empty · Desktop", x: 0, y: R15 + 1780 },
    { file: "RowsNotLive", init: { type: "quiet", tab: "rows", wire: "fresh", writing: "none" }, title: "Not live yet: no table to read · Desktop", x: D, y: R15 + 1780 },
    { file: "RowsNone", init: { type: "quiet", tab: "rows", wire: "done", rows: "none" }, title: "Live, with no rows yet · Desktop", x: D * 2, y: R15 + 1780 },
    /* A drawer on a row that has everything — `{ rows: "mixed", row: 10 }`, the Sep 20 posted row — reads well
       beside the one above and was drawn during the ticket, but D7's canvas is at its 16 MB ceiling, so it is
       left out rather than a state the ticket actually asks for. It comes back if the canvas is split by theme
       the way D6's and D10's are. */
  ];
  const artboards = [];
  for (const light of [false, true]) {
    for (const b of BOARDS) {
      const file = `${b.file}${light ? "Light" : ""}.dc.html`;
      const phone = !!b.phone;
      fs.writeFileSync(path.join(OUT, file), artboard({ phone, light, screens: [typeScreen({ init: b.init, tall: b.tall || 0 })], navMode: "note" }));
      artboards.push({ file, title: `D7 · ${b.title}${light ? " · Light" : ""}`, page: light ? "light" : "dark", x: b.x, y: b.y, w: phone ? 390 : 1440, h: b.tall || (phone ? 844 : 900), is_interactive: true });
    }
  }
  const note =
    "Pictures, one per state. The tabs switch, the template's version dropdown works, the Writing text can be typed into, and Preview opens its dialog (Escape or X closes either).\n\nBefore & After is wired and posting. Quiet Luxury Picks was just saved from the Studio and is not wired yet. The Overview boards are taller than a screen so the whole page shows.\n\nFrom the first review: the template's slides lead Overview across the full width, one version at a time with Make active; the four numbers are tiles beside the details; the batch table is left-aligned without Ran by, and a row opens that batch; panels side by side end on the same line.\n\nFrom the second review: narrower tiles in the analytics style beside a wider details card, the version showing tinted instead of ticked, and Preview on the phone as a sheet from the bottom. From the third review: the writing's versions use the same dropdown.\n\nNew in D13 (Garreth, 2026-09-21), the bottom row: Direction is named Writing and Wiring is named Go Live, and a type cannot generate until its Writing is saved.\n· Nothing written: the editor carries a guiding placeholder and the header the neutral pill Needs writing. Generate stays available and opens the Generate form, which is where the missing Writing is marked in red and required (Garreth, 2026-09-22).\n· The Studio's drafted note opens in the editor as Not saved; Save version is still a person's press.\n· The template's text boxes are listed under the editor, so the instruction is written against the boxes that exist. D14 is what gives the Studio a way to name them.\n\nNew in D13b (Garreth, 2026-09-22), the last row: a type with nothing written can ask the Conversation for a first draft.\n· The empty Conversation fills its card — a muted circle, one line, and one offer, Write a first draft, from the active template and its 5 slides. It is secondary; Save version stays the tab's one accent.\n· The draft lands in the editor unsaved, under the same Not saved pill the Studio's note gets, so a type made in the Studio and a type made any other way both have a way to a first Writing.\n· The box asks What should this type sound like? until a first version is saved, then goes back to What should change?\n· On the phone the Conversation is a sheet, so the offer sits under the editor as well, where it is met without opening the sheet. The sheet carries the same one.\n· Before D13b is the first board of the row, for comparison: the panel was blank and the box asked what should change.\n\nNew in D15 (Garreth, 2026-09-21), the last two rows: a fourth tab, Rows, between Writing and Go Live. It shows what is sitting in the type's lane table — the table the Smart Scheduler, the Posting Agent and Inventory read, and where everything the generator makes ends up.\n\u00b7 Read-only. Every change to a row happens where it already happens: the batch page, Approve, the scheduler. The tab has no accent button of its own; the header's Generate is the page's, as on every tab.\n\u00b7 A fixed set of columns, not the whole table: slide 1, the id, the caption, the music, the posting date and profile where there are any, and the status. These tables are 32 to 66 columns wide and no two are alike.\n\u00b7 The status column says why a row cannot post, in words. The tone splits on one question \u2014 is anything going to happen to this row by itself? Ready is green; Not rendered, Assigned and Posted are neutral because something else is already moving them; No caption and Not gatekept are amber because nothing but a person will move them. No new colour.\n\u00b7 A row that has not been rendered has no slide 1 at all, so its thumbnail is an empty frame \u2014 the same fact the status says in words.\n\u00b7 The counts line above the table is data, not instruction text: \"240 rows \u00b7 0 ready to post\". The table's own name sits quietly on the right, so the tab and Go Live's checklist name the same thing.\n\u00b7 Fifty rows a page, tabular figures, stacked rows on the phone, where the date and the profile lead the quiet line and the music takes what room is left. The boards draw the first twelve of the fifty.\n\u00b7 A whole row opens the drawer: every column it has, in the table's own order, an empty one as a dash \u2014 an empty column is the answer to why the row cannot post, so it is never left out. It comes in from the side on the desktop so the table is still read behind it, and is the phone sheet Preview and the Conversation already use, with each column's name over its value. Escape or X closes it.\n\u00b7 The drawer ends on one secondary button, Open the deck, which opens that deck in the batch it came from (Garreth, 2026-09-22). The table stays read-only; the button only points at the screen where the fixing already happens. It is pinned under the scrolling columns, so it is still there at the end of thirty-six of them. A row the old n8n path wrote has no batch, so it has no button \u2014 its batch column reads as a dash.\n\u00b7 Two empty states, and both fill the card down to the bottom of the screen (the rule of 2026-09-19): a type that has not gone live has no table to read and names Go Live; a type that is live with nothing in it says No rows yet, under its own 0 rows line.\n\n\nStill proposed:\n· Generate stays in the header on every tab; on Direction it steps back to secondary, so Save version is that tab's one accent.\n· The suggestion shows inside the direction itself: removed words struck through, added words underlined.\n· The cadence rebalance is the cadence editor's rule, with its running total and \"too many\" wording.\n· Wire is a hold in the amber tone: it changes the database but deletes nothing.";
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
          { id: "d7-note", page: "dark", x: D * 2 + 470, y: 0, w: 420, text: note },
          { id: "d7-note-light", page: "light", x: D * 2 + 470, y: 0, w: 420, text: note },
        ],
        launch: { view: "canvas", page: "light" },
      },
      null,
      2,
    ),
  );
  console.log(`Wrote D7 artboards to ${OUT}`);
}

if (isMain(import.meta.url)) build(path.resolve(process.argv[2] ?? path.join(HERE, "out")));
