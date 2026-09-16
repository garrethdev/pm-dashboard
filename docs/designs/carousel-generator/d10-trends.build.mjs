#!/usr/bin/env node
/*
 * D10 · Trends — the daily study digest, what the analysis made of it, and the
 * rules waiting to be accepted into the knowledge base.
 *
 * Design step only (docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md, D10). Nothing
 * here is app code. The shell (menu, top bar, glow, both themes, phone drawer,
 * prototype note) comes from generator-kit.mjs; this file is the screen.
 *
 * Two panes, as the plan's §6.5 has them, in the app's own underline tabs
 * (src/components/dashboard/account-detail-tabs.tsx, the shape D7 uses):
 *
 *   Digests         the digests newest first down a narrow column, the open
 *                   one beside them: its body readable in place, then the
 *                   rules the analysis proposed and the posts they came from,
 *                   each with its slides and Recreate this
 *   Knowledge base  the rules themselves — pending first, with Accept and
 *                   Reject, then the ones already accepted — filtered by
 *                   carousel type and by confidence
 *
 * Chosen with Garreth, 2026-09-16, over one expanding list and over showing
 * both panes at once: an analysis result is a long thing (a body, three rules
 * with their evidence, three posts with their slides), and a list that expands
 * to hold it pushes every other digest off the screen.
 *
 * Decisions this screen makes:
 *  - **Analyse is the accent, and only on the newest unanalysed digest** (the
 *    ticket). Every other action here — Analyse again, Retry, Recreate this,
 *    Accept, Reject — is secondary, so the one lit button on the screen is
 *    always the next thing to do.
 *  - **Accepting and rejecting live in the Knowledge base, not on the digest.**
 *    The ticket puts them there and F13 agrees, so a rule shown under a digest
 *    carries a Pending pill and nothing to press: reading what was proposed and
 *    deciding on it are two different jobs.
 *  - **A state is words before it is a colour.** A digest's second line says
 *    "not analysed", "2 still queued" or "Analysis failed" in plain text; the
 *    colour only agrees with it. Red means something went wrong (D9's rule);
 *    amber means waiting on the outside worker.
 *  - **Queued means queued since when** (the ticket): the post says the time it
 *    went into the queue, so a stalled worker shows up as an old timestamp
 *    rather than as nothing happening.
 *  - Confidence is shown as the number the analysis produced, and the filter
 *    names the bands, so nobody has to learn what 0.64 counts as.
 *
 * The Studio that "Recreate this" opens is D6's own screen, not a new one: D6
 * already designs starting from a reference deck, down to the "Not analysed in
 * Trends" pill on its dashed frame (the ticket asked for the reference's slides
 * in a strip above the canvas; Garreth settled that on 2026-09-15 as a dashed
 * frame first on the canvas instead, and D6 was built that way). The board here
 * is that screen, on this canvas, so D10's reviewer can see where Recreate this
 * lands without going to D6's.
 *
 * Sample content only: D1's invented carousel types, an invented digest whose
 * links go nowhere, invented rules, and the same reference decks D6 keeps
 * (it names them "as Trends (D10) would keep them"), so a person moving
 * between the two screens sees the same titles. Photos are bank shots from the
 * Supabase image store, downsampled, named d10-*.
 *
 * Run directly, it writes D10's review artboards and canvas.json:
 *   Main.dc.html            desktop 1440×900, the newest digest, not analysed
 *   Analysing.dc.html       desktop, Analyse running: links matched and queued
 *   Analysed.dc.html        desktop, the result — rules and the posts they came
 *                           from — on a day when every digest is analysed
 *   Posts.dc.html           desktop, taller than a screen so the whole reading
 *                           pane shows at once, down to the carousels and
 *                           their slides
 *   Queued.dc.html          desktop, two links still waiting, Analyse again
 *   Failed.dc.html          desktop, the analysis failed, Retry
 *   FirstRun.dc.html        desktop, no digests yet
 *   Knowledge.dc.html       desktop, pending rules with Accept and Reject
 *   Confidence.dc.html      desktop, the confidence filter open
 *   NothingPending.dc.html  desktop, nothing pending
 *   Studio.dc.html          desktop, D6's Studio where Recreate this lands
 *   Phone.dc.html           phone 390×844, the digests
 *   PhoneAnalysed.dc.html   phone, an analysed digest
 *   PhoneKnowledge.dc.html  phone, the knowledge base
 *   PhoneEmpty.dc.html      phone, no digests yet
 * Imported, `trendsScreen()` is the screen prototype.build.mjs opens.
 *
 *   node docs/designs/carousel-generator/d10-trends.build.mjs <out dir>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { I, icon, artboard, isMain } from "./generator-kit.mjs";
import { studioScreen } from "./d6-studio.build.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const S = ".screen-trends";

const D10I = {
  spark: icon("Sparkle", 14),
  caretDown: icon("CaretDown", 14, "bold"),
  check: icon("Check", 14, "bold"),
  checkSm: icon("Check", 12, "bold"),
  x: icon("X", 12, "bold"),
  retry: icon("ArrowsClockwise", 12, "bold"),
  clock: icon("Clock", 12),
  warn: icon("WarningCircle", 12),
  tiktok: icon("TiktokLogo", 14),
  instagram: icon("InstagramLogo", 14),
  trend: icon("TrendUp", 24),
  quotes: icon("Quotes", 12),
};

/* ── Sample content ────────────────────────────────────────────────────── */

/* D1's invented carousel types, so the rules point at names seen elsewhere. */
const TYPES = [
  { id: "morning", name: "Morning Routine" },
  { id: "myth", name: "Myth vs Fact" },
  { id: "before", name: "Before & After" },
  { id: "day", name: "Day in the Life" },
  { id: "quiet", name: "Quiet Luxury Picks" },
];

/*
 * The digest body. Invented: the links go nowhere and the numbers are made up.
 * `link: true` marks a line the analysis would pull out — every TikTok and
 * Instagram address in the body (F12 step 2). One line is deliberately long,
 * to see what the reading column does with a sentence that will not fit.
 */
const BODY = [
  { text: "Good morning. Eleven posts worth a look from the last day." },
  {
    text:
      "Skincare myths keep winning when the myth itself is the hook rather than the fix, and the one that went furthest yesterday opened on a line most people believe before it corrected anything at all.",
  },
  { text: "tiktok.com/@sample.handle/video/7412008451", link: true },
  { text: "Two more did the same with sleep and with sunscreen." },
  { text: "instagram.com/p/C9sampleAbc12/", link: true },
  { text: "tiktok.com/@another.sample/video/7411884003", link: true },
  {
    text:
      "Morning routines are flat this week except where a number lands on slide two rather than slide one. The three that did are all above 40k.",
  },
  { text: "tiktok.com/@third.sample/video/7411640887", link: true },
  { text: "Nothing new in the before-and-after lane; the top three are reposts of last month's." },
];

/*
 * The digests, newest first. `decks` counts the carousels in the body, not its
 * links: the videos are filtered out (Garreth, 2026-09-16), so counting links
 * would promise posts the screen never shows.
 * `state` is what the second line in the list says:
 *   new       nothing has been run on it yet — the one Analyse sits on
 *   queued    analysed, but links it cited are still with the outside worker
 *   failed    the analysis call failed
 *   done      analysed, nothing outstanding
 */
const DIGESTS = [
  { id: "g16", date: "Sep 16", when: "Sep 16, 6:02am", decks: 3, state: "new" },
  { id: "g15", date: "Sep 15", when: "Sep 15, 6:04am", decks: 4, state: "queued", queued: 2, analysed: "6:31am" },
  { id: "g14", date: "Sep 14", when: "Sep 14, 6:01am", decks: 3, state: "done", analysed: "9:14am" },
  { id: "g13", date: "Sep 13", when: "Sep 13, 6:03am", decks: 2, state: "failed" },
  { id: "g12", date: "Sep 12", when: "Sep 12, 6:02am", decks: 5, state: "done", analysed: "6:28am" },
  { id: "g11", date: "Sep 11", when: "Sep 11, 6:00am", decks: 3, state: "done", analysed: "6:25am" },
  { id: "g10", date: "Sep 10", when: "Sep 10, 6:05am", decks: 4, state: "done", analysed: "6:33am" },
];

/*
 * What an analysis proposes: the rule, the lines from the digest it rests on,
 * a confidence, and the carousel types it applies to. Invented, in the plain
 * voice the knowledge base already uses.
 */
const RULES = [
  {
    id: "r1",
    text: "Open on the belief, not on the correction.",
    evidence: [
      "the one that went furthest yesterday opened on a line most people believe",
      "Two more did the same with sleep and with sunscreen.",
    ],
    conf: 0.86,
    types: ["myth", "before"],
    from: "Sep 16",
  },
  {
    id: "r2",
    text: "Put the first number on slide two, never slide one.",
    evidence: ["except where a number lands on slide two rather than slide one", "The three that did are all above 40k."],
    conf: 0.71,
    types: ["morning", "day"],
    from: "Sep 16",
  },
  {
    id: "r3",
    text: "A reposted before-and-after does not carry a second time.",
    evidence: ["the top three are reposts of last month's"],
    conf: 0.42,
    types: ["before"],
    from: "Sep 16",
  },
];

/* A fourth rule, proposed by an earlier digest and still waiting. */
const OLDER_RULE = {
  id: "r0",
  text: "Keep the hook to nine words or fewer.",
  evidence: ["every deck over nine words on the cover fell below its lane's median"],
  conf: 0.79,
  types: ["morning", "myth", "before", "day", "quiet"],
  from: "Sep 12",
};

/* Rules already accepted. The count is the live table's size; the rows are invented. */
const ACCEPTED = [
  { id: "a1", text: "One idea a slide, and the slide says which one.", conf: 0.94, types: ["morning", "myth", "before", "day", "quiet"], from: "Sep 9", on: "Sep 9" },
  { id: "a2", text: "A face on the cover beats a product on the cover.", conf: 0.88, types: ["morning", "day"], from: "Sep 6", on: "Sep 7" },
  { id: "a3", text: "Name the peptide once, and not on the first slide.", conf: 0.83, types: ["myth", "before"], from: "Sep 4", on: "Sep 4" },
  { id: "a4", text: "End on what to do next, not on what was proved.", conf: 0.8, types: ["myth", "day"], from: "Aug 30", on: "Aug 31" },
];
const ACCEPTED_TOTAL = 121;

/*
 * The carousels a digest's analysis drew on.
 *
 * **Videos are ignored** (Garreth, 2026-09-16): this app makes carousels, so a
 * digest's video links are filtered out rather than shown. The body still
 * carries them, because the body is the email that arrived — which is why the
 * digest's own count is of carousels, not of links.
 *
 * The titles and figures are D6's saved reference decks, which its own file
 * calls "as Trends (D10) would keep them", so the deck a person recreates here
 * is the deck they meet in the Studio. A carousel still with the outside
 * worker has no slides yet, and says when it went into the queue.
 */
const POSTS = [
  {
    id: "p1",
    net: "tiktok",
    handle: "@sample.handle",
    title: "Skincare myths, calm and plain",
    meta: "7 slides · 24.3k · Sep 12",
    slides: ["vanity", "shower", "journal", "mug", "oats"],
  },
  {
    id: "p2",
    net: "instagram",
    handle: "@another.sample",
    title: "Sunrise walk, day in the life",
    meta: "8 slides · 118k · Sep 11",
    slides: ["dock", "yoga", "mug", "oats", "journal"],
  },
  {
    id: "p3",
    net: "tiktok",
    handle: "@third.sample",
    title: "Water before coffee",
    meta: "5 slides · 0 · Sep 2",
    slides: ["mug", "oats", "vanity", "shower", "dock"],
  },
];

/* Two of the same links, still with the outside worker (the Queued board). */
const QUEUED_POSTS = [
  { id: "q1", net: "tiktok", url: "tiktok.com/@another.sample/video/7411884003", since: "6:07am" },
  { id: "q2", net: "instagram", url: "instagram.com/p/C9sampleAbc12/", since: "6:07am" },
];

const CONFS = [
  { id: "any", label: "Any confidence", min: 0 },
  { id: "high", label: "High, 0.80 and over", min: 0.8 },
  { id: "mid", label: "Medium, 0.50 to 0.79", min: 0.5, max: 0.8 },
  { id: "low", label: "Low, under 0.50", min: 0, max: 0.5 },
];

/* The photos the reference strips use, and the ones D6's Studio board needs. */
const SLIDE_IMAGES = ["mug", "journal", "yoga", "oats", "shower", "dock", "vanity"];
const LIB_IMAGES = ["window", "mirror", "outdoor", "kitchen"];

export function copyTrendsImages(OUT) {
  /* D6's photos under D10's names, the way D11 renames them, so this ticket
     owns every image key on a canvas it shares with D9. Only the slides and
     library covers: round two's layered-template photos belong to the Figma
     moment, which no board here shows, and a canvas is a shared 16 MB. */
  for (const id of SLIDE_IMAGES) fs.copyFileSync(path.join(HERE, "assets", `d6-slide-${id}.jpg`), path.join(OUT, `d10-slide-${id}.jpg`));
  for (const id of LIB_IMAGES) fs.copyFileSync(path.join(HERE, "assets", `d6-lib-${id}.jpg`), path.join(OUT, `d10-lib-${id}.jpg`));
}

/* ── Styles ────────────────────────────────────────────────────────────── */

function css(phone, tall) {
  const P = phone;
  return `
/* ── D10 page ── */
/* A review board that has to show the whole reading pane at once is taller
   than a screen, the way D7's Overview is: the shell's fixed height is lifted
   and the artboard is cut to match. */
${tall ? `.app${S} { height: ${tall}px; }` : ""}
/* Green and amber, as D8 reads them from the app; red is the kit's --danger. */
:root { --ok: #4ade80; --warn: #fbbf24; }
.app.is-light { --ok: #166534; --warn: #92400e; }

/* The page fills the screen so the two columns end on the same line, the way
   D7's side-by-side sections do. */
${S} .main { display: flex; flex-direction: column; }
${S} .page { flex: 1; min-height: 0; gap: ${P ? 14 : 20}px; }
${S} .t10head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; }

/* Tabs: account-detail-tabs.tsx, underline tabs over a full-width rule — D7's. */
${S} .tabs10 { display: flex; gap: ${P ? 20 : 24}px; border-bottom: 1px solid var(--border); }
${S} .tab10 { position: relative; margin-bottom: -1px; border-bottom: 2px solid transparent; padding: 0 2px 10px; font-size: 14px; line-height: 20px; font-weight: 500; white-space: nowrap; color: var(--text-muted); transition: color 150ms var(--ease); }
${S} .tab10:hover { color: var(--text-primary); }
${S} .tab10[aria-selected="true"] { border-bottom-color: var(--text-primary); font-weight: 600; color: var(--text-primary); }
${S} .tabn { margin-left: 6px; font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-muted); }

/* Cards, as everywhere else in the generator. */
${S} .c10 { display: flex; flex-direction: column; min-width: 0; border-radius: 24px; background: var(--card); border: 1px solid var(--border); box-shadow: var(--sh-card); }

/* ── Digests ── */
${S} .dg { display: ${P ? "flex" : "grid"}; ${P ? "flex-direction: column;" : "grid-template-columns: 236px minmax(0, 1fr);"} gap: ${P ? 14 : 20}px; flex: 1; min-height: 0; }
${S} .dglist { overflow-y: auto; }
${S} .dgrow { position: relative; display: flex; flex-direction: column; gap: 2px; width: 100%; padding: 12px 16px; border-top: 1px solid var(--border); font-size: 14px; line-height: 20px;
  transition: background-color 150ms var(--ease); }
${S} .dgrow:first-child { border-top: 0; border-radius: 23px 23px 0 0; }
${S} .dgrow:last-child { border-radius: 0 0 23px 23px; }
${S} .dgrow:hover { background: color-mix(in srgb, var(--text-primary) 4%, transparent); }
/* The open one: the accounts table's selected-filter treatment, a tint rather
   than a fill, so the only filled accent on the screen stays Analyse. */
${S} .dgrow.on { background: var(--accent-soft); }
${S} .dgrow.on .dgd { color: var(--accent); }
${S} .dgd { font-weight: 500; }
${S} .dgs { font-size: 12px; line-height: 16px; color: var(--text-muted); }
/* A state is words first; the colour only agrees with them. */
${S} .dgs.is-new { color: var(--accent); }
${S} .dgs.is-wait { color: var(--warn); }
${S} .dgs.is-bad { color: var(--danger); }

${S} .dgmain { overflow-y: auto; }
${S} .dgpad { display: flex; flex-direction: column; gap: ${P ? 16 : 20}px; padding: ${P ? 16 : 24}px; }
${S} .dghead { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
${S} .dght { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
${S} .dght h2 { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; letter-spacing: -0.01em; }
${S} .dght span { font-size: 13px; line-height: 18px; color: var(--text-muted); }

/* The body, readable in place: the app's sunken surface, its own scroll. */
${S} .dgbody { display: flex; flex-direction: column; gap: 10px; max-height: ${P ? 200 : 232}px; overflow-y: auto; border-radius: 16px; background: var(--card-sunken); border: 1px solid var(--border); padding: ${P ? 14 : 18}px; }
${S} .dgbody p { margin: 0; font-size: 13.5px; line-height: 21px; color: var(--text-muted); text-wrap: pretty; overflow-wrap: anywhere; }
${S} .dgbody p.is-link { color: var(--accent); }

/* Working, after Analyse: what it is doing, in the order F12 does it. */
${S} .work10 { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; border-radius: 16px; border: 1px solid var(--border); background: var(--card-raised); padding: 12px 16px; font-size: 13px; line-height: 20px; color: var(--text-muted); }
${S} .work10 b { display: inline-flex; align-items: center; gap: 6px; font-weight: 500; color: var(--accent); }

/* A failed analysis: the error where the result would be, and Retry. */
${S} .fail10 { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; border-radius: 16px; border: 1px solid color-mix(in srgb, var(--danger) 40%, var(--border)); background: color-mix(in srgb, var(--danger) 7%, transparent); padding: 12px 16px; font-size: 13px; line-height: 20px; color: var(--danger); }
${S} .fail10 .ft { display: inline-flex; align-items: center; gap: 6px; }

${S} .sec10 { display: flex; flex-direction: column; gap: 12px; }
${S} .sh10 { display: flex; align-items: baseline; gap: 8px; margin: 0; font-size: 13px; line-height: 20px; font-weight: 600; }
${S} .sh10 .n { font-size: 12px; font-weight: 500; color: var(--text-muted); }

/* A proposed rule: what it says, what it rests on, and where it applies. */
${S} .rule10 { display: flex; flex-direction: column; gap: 10px; border-radius: 16px; border: 1px solid var(--border); background: var(--card-raised); padding: ${P ? 14 : 16}px; }
${S} .rtop { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
${S} .rtext { font-size: 14.5px; line-height: 21px; font-weight: 500; text-wrap: pretty; }
${S} .rev { display: flex; flex-direction: column; gap: 6px; border-radius: 12px; background: var(--card-sunken); padding: 10px 12px; }
${S} .rev span { display: flex; gap: 8px; font-size: 12.5px; line-height: 18px; color: var(--text-muted); text-wrap: pretty; }
${S} .rev span .q { display: flex; flex-shrink: 0; padding-top: 3px; opacity: 0.6; }
${S} .rmeta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
${S} .pill--accent { color: var(--accent); }
${S} .pill--quiet { background: none; box-shadow: inset 0 0 0 1px var(--border); }

/* A referenced post: who it is, what it did, and its slides. */
${S} .post10 { display: flex; flex-direction: column; gap: 12px; border-radius: 16px; border: 1px solid var(--border); background: var(--card-raised); padding: ${P ? 14 : 16}px; }
${S} .phead { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 12px; }
${S} .pwho { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
${S} .pwho .l1 { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 14px; line-height: 20px; font-weight: 500; }
${S} .pwho .l1 .net { display: flex; flex-shrink: 0; color: var(--text-muted); }
${S} .pwho .l1 b { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${S} .pwho .l2 { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .pstrip { display: flex; gap: 8px; overflow-x: auto; }
/* The slides themselves, at the 4:5 a carousel slide is. */
${S} .pslide { width: ${P ? 56 : 64}px; aspect-ratio: 4 / 5; flex-shrink: 0; border-radius: 8px; background-color: var(--card-sunken); background-size: cover; background-position: center; }
${SLIDE_IMAGES.map((id) => `${S} .ps-${id} { background-image: url("./d10-slide-${id}.jpg"); }`).join("\n")}
/* Waiting on the outside worker: no slides to show, and the time it went in. */
${S} .pqueue { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; border-radius: 16px; border: 1px dashed var(--border); padding: ${P ? 12 : 14}px 16px; font-size: 13px; line-height: 20px; color: var(--text-muted); }
${S} .pqueue .u { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${S} .pqueue .w { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; color: var(--warn); }

/* ── Knowledge base ── */
${S} .kb { display: flex; flex-direction: column; gap: ${P ? 14 : 16}px; flex: 1; min-height: 0; }
${S} .kbf { display: flex; align-items: ${P ? "stretch" : "center"}; gap: 12px; ${P ? "flex-direction: column;" : ""} }
${S} .chips10 { display: flex; ${P ? "" : "flex-wrap: wrap; flex: 1;"} align-items: center; gap: 8px; min-width: 0; }
${S} .chip10 { position: relative; display: inline-flex; align-items: center; flex-shrink: 0; max-width: 220px; border-radius: 999px; border: 1px solid var(--border); background: var(--card-raised);
  padding: 5px 13px; font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-muted); white-space: nowrap;
  transition: color 150ms var(--ease), border-color 150ms var(--ease), background-color 150ms var(--ease), transform 160ms var(--ease-out-strong); }
${S} .chip10:hover { color: var(--text-primary); }
${S} .chip10:active { transform: scale(0.97); }
${S} .chip10.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
${S} .chip10 span { overflow: hidden; text-overflow: ellipsis; }

/* The confidence dropdown: D9's, same popover and timings. */
${S} .dd10 { position: relative; flex-shrink: 0; }
${S} .dd10 .btn2 { ${P ? "width: 100%; justify-content: space-between; padding: 12px 16px;" : ""} }
${S} .ddcaret { display: flex; transition: transform 150ms var(--ease); }
${S} .dd10.on .ddcaret { transform: rotate(180deg); }
${S} .catch10 { position: absolute; inset: 0; z-index: 30; display: none; }
${S} .catch10.on { display: block; }
${S} .pop10 { position: absolute; top: calc(100% + 8px); right: 0; z-index: 40; width: 240px; transform-origin: top right; border-radius: 16px; border: 1px solid var(--border); padding: 8px;
  background: var(--overlay-veil); box-shadow: var(--overlay-rim); -webkit-backdrop-filter: var(--overlay-blur); backdrop-filter: var(--overlay-blur);
  opacity: 0; visibility: hidden; pointer-events: none; transform: scale(0.97) translateY(-4px);
  transition: opacity 120ms var(--ease-out-strong), transform 120ms var(--ease-out-strong), visibility 0s 120ms; }
${S} .pop10.on { opacity: 1; visibility: visible; pointer-events: auto; transform: none; transition: opacity 180ms var(--ease-out-strong), transform 180ms var(--ease-out-strong); }
${S} .opt10 { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 12px; border-radius: 12px; padding: 8px 10px; font-size: 13px; line-height: 20px; color: var(--text-muted);
  transition: background-color 150ms var(--ease), color 150ms var(--ease); }
${S} .opt10:hover { background: color-mix(in srgb, var(--text-primary) 6%, transparent); color: var(--text-primary); }
${S} .opt10.on { color: var(--text-primary); font-weight: 500; }
${S} .optcheck10 { display: flex; width: 16px; justify-content: center; color: var(--text-primary); }

${S} .kbscroll { display: flex; flex-direction: column; gap: 16px; flex: 1; min-height: 0; overflow-y: auto; }
${S} .kgrid { display: grid; grid-template-columns: minmax(0, 1fr) 232px 88px 172px; align-items: center; column-gap: 16px; }
${S} .khead { padding: 16px 24px 8px; font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .krow { width: 100%; min-height: 60px; padding: 12px 24px; border-top: 1px solid var(--border); font-size: 14px; line-height: 20px; }
${S} .krow:last-child { border-radius: 0 0 23px 23px; }
${S} .kt { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
${S} .kt b { font-weight: 500; text-wrap: pretty; }
${S} .kt span { font-size: 12px; line-height: 16px; color: var(--text-muted); }
${S} .ktypes { display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; }
${S} .kact { display: flex; justify-content: flex-start; gap: 8px; }
/* Accept says yes and Reject says no; neither deletes anything (F13), so
   neither is a hold and neither is lit. */
${S} .kbtn { position: relative; display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; border-radius: 999px; border: 1px solid var(--border); background: var(--card-raised); padding: 6px 12px;
  font-size: 12px; line-height: 16px; font-weight: 500; color: var(--text-muted); white-space: nowrap;
  transition: color 150ms var(--ease), border-color 150ms var(--ease), transform 160ms var(--ease-out-strong); }
${S} .kbtn:hover { color: var(--text-primary); }
${S} .kbtn.is-yes:hover { border-color: color-mix(in srgb, var(--ok) 55%, var(--border)); color: var(--ok); }
${S} .kbtn:active { transform: scale(0.97); }

/* Empty: no digests yet, and nothing pending. Both fill the rest of the
   screen rather than sitting in a short box (D9's rule, Garreth 2026-09-16). */
${S} .es10 { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: 12px; min-height: ${P ? 240 : 320}px; border-radius: 24px; border: 1px dashed var(--border);
  padding: 32px 24px; text-align: center; }
${S} .es10 .ic { display: flex; color: var(--text-muted); }
${S} .es10 p { max-width: 420px; margin: 0; font-size: 14px; line-height: 20px; color: var(--text-muted); text-wrap: pretty; }
/* Nothing pending, but rules already accepted below it: the block says so and
   stops, rather than pushing the accepted rules off the screen. An empty state
   only fills the screen when it is the only thing on it. */
${S} .es10--inline { flex: 0 0 auto; min-height: ${P ? 150 : 176}px; }
${
  P
    ? `
/* Phone: the digests become a row of dates that scrolls sideways inside
   itself, the way the app's own filter pills do and D9's type pills now do,
   rather than a column eating a third of the screen before the digest shows. */
${S} .dglist { flex-direction: row; gap: 8px; overflow-x: auto; overflow-y: visible; border: 0; background: none; box-shadow: none; border-radius: 0; margin: 0 -16px; padding: 0 16px 2px; }
${S} .dgrow { flex-shrink: 0; width: auto; border: 1px solid var(--border); border-radius: 16px; background: var(--card); padding: 8px 14px; }
/* Each date is one chip: its two lines stay on one line each, so the row
   scrolls sideways instead of growing ragged and tall. */
${S} .dgd, ${S} .dgs { white-space: nowrap; }
${S} .dgrow:first-child, ${S} .dgrow:last-child { border-radius: 16px; }
${S} .dgrow.on { border-color: var(--accent); }
${S} .dgmain { flex: 1; min-height: 0; }
${S} .chips10 { overflow-x: auto; padding-bottom: 2px; margin: 0 -16px; padding-left: 16px; padding-right: 16px; }
${S} .chip10 { padding: 7px 13px; }
${S} .khead { display: none; }
${S} .krow { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; }
${S} .kmeta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
/* 44px touch targets: the pill keeps its size, the hit area grows (D2). */
${S} .tab10::after, ${S} .chip10::after, ${S} .kbtn::after { content: ""; position: absolute; inset: -10px -6px; }
`
    : ""
}
@media (prefers-reduced-motion: reduce) {
  ${S} .chip10, ${S} .dgrow, ${S} .tab10, ${S} .opt10, ${S} .kbtn, ${S} .ddcaret { transition: none; }
  ${S} .pop10 { transition: opacity 120ms linear, visibility 0s 120ms; transform: none; }
  ${S} .pop10.on { transition: opacity 150ms linear; }
}
`;
}

/* ── Markup ────────────────────────────────────────────────────────────── */

/*
 * The platform's mark. It has to be written into the template, not handed over
 * as a value: a {{hole}} renders as text, so an icon passed through one shows
 * its own SVG source on the screen (found by Garreth, 2026-09-16).
 */
const net = (row) =>
  `<span class="net">` +
  `<sc-if value="{{${row}.isTiktok}}" hint-placeholder-val="{{ true }}">${D10I.tiktok}</sc-if>` +
  `<sc-if value="{{${row}.isInsta}}" hint-placeholder-val="{{ false }}">${D10I.instagram}</sc-if>` +
  `</span>`;

const digestsPanel = (phone) => `
          <div class="dg">
            <section class="c10 dglist" aria-label="Digests">
              <sc-for list="{{digests}}" as="d" hint-placeholder-count="7">
                <button type="button" class="dgrow {{d.cls}}" aria-current="{{d.current}}" onClick="{{d.open}}">
                  <span class="dgd tnum">{{d.date}}</span>
                  <span class="dgs {{d.stateCls}}">{{d.stateText}}</span>
                </button>
              </sc-for>
            </section>
            <section class="c10 dgmain" aria-label="{{openLabel}}">
              <div class="dgpad">
                <div class="dghead">
                  <span class="dght">
                    <h2>{{openSubject}}</h2>
                    <span class="tnum">{{openMeta}}</span>
                  </span>
                  <sc-if value="{{showAnalyse}}" hint-placeholder-val="{{ true }}">
                    <button type="button" class="cta {{analyseCls}}" disabled="{{analyseOff}}" onClick="{{analyse}}"><span class="spin {{analyseSpin}}"><sc-if value="{{analyseIdle}}" hint-placeholder-val="{{ true }}">${D10I.spark}</sc-if><sc-if value="{{analyseBusy}}" hint-placeholder-val="{{ false }}">${I.busy}</sc-if></span>{{analyseLabel}}</button>
                  </sc-if>
                  <sc-if value="{{showAgain}}" hint-placeholder-val="{{ false }}">
                    <button type="button" class="btn2" onClick="{{again}}">${D10I.retry}Analyse again</button>
                  </sc-if>
                </div>
                <div class="dgbody" tabindex="0" role="region" aria-label="{{bodyLabel}}">
                  <sc-for list="{{body}}" as="b" hint-placeholder-count="9">
                    <p class="{{b.cls}}">{{b.text}}</p>
                  </sc-for>
                </div>
                <sc-if value="{{showWork}}" hint-placeholder-val="{{ false }}">
                  <div class="work10" role="status">
                    <b><span class="spin on">${I.busy}</span>{{workNow}}</b>
                    <span>{{workDone}}</span>
                  </div>
                </sc-if>
                <sc-if value="{{showFail}}" hint-placeholder-val="{{ false }}">
                  <div class="fail10" role="status">
                    <span class="ft">${D10I.warn}{{failText}}</span>
                    <button type="button" class="btn2" onClick="{{retry}}">${D10I.retry}Retry</button>
                  </div>
                </sc-if>
                <sc-if value="{{showRules}}" hint-placeholder-val="{{ false }}">
                  <div class="sec10">
                    <h3 class="sh10">Proposed rules<span class="n tnum">{{ruleCount}}</span></h3>
                    <sc-for list="{{rules}}" as="r" hint-placeholder-count="3">
                      <div class="rule10">
                        <div class="rtop">
                          <span class="rtext">{{r.text}}</span>
                          <span class="pill pill--accent">{{r.status}}</span>
                        </div>
                        <div class="rev">
                          <sc-for list="{{r.evidence}}" as="e" hint-placeholder-count="2">
                            <span><span class="q">${D10I.quotes}</span>{{e.line}}</span>
                          </sc-for>
                        </div>
                        <div class="rmeta">
                          <span class="pill tnum">Confidence {{r.conf}}</span>
                          <sc-for list="{{r.types}}" as="t" hint-placeholder-count="2">
                            <span class="pill pill--quiet">{{t.name}}</span>
                          </sc-for>
                        </div>
                      </div>
                    </sc-for>
                  </div>
                </sc-if>
                <sc-if value="{{showPosts}}" hint-placeholder-val="{{ false }}">
                  <div class="sec10">
                    <h3 class="sh10">Carousels it read<span class="n tnum">{{postCount}}</span></h3>
                    <sc-for list="{{posts}}" as="p" hint-placeholder-count="3">
                      <div class="post10">
                        <div class="phead">
                          <span class="pwho">
                            <span class="l1">${net("p")}<b title="{{p.title}}">{{p.title}}</b></span>
                            <span class="l2 tnum">{{p.meta}}</span>
                          </span>
                          <button type="button" class="btn2" onClick="{{p.recreate}}">Recreate this</button>
                        </div>
                        <div class="pstrip">
                          <sc-for list="{{p.slides}}" as="sl" hint-placeholder-count="5">
                            <span class="pslide {{sl.cls}}" aria-hidden="true"></span>
                          </sc-for>
                        </div>
                      </div>
                    </sc-for>
                    <sc-for list="{{queuedPosts}}" as="q" hint-placeholder-count="2">
                      <div class="pqueue">
                        ${net("q")}
                        <span class="u">{{q.url}}</span>
                        <span class="w tnum">${D10I.clock}Queued since {{q.since}}</span>
                      </div>
                    </sc-for>
                  </div>
                </sc-if>
              </div>
            </section>
          </div>`;

const knowledgePanel = (phone) => `
          <div class="kb">
            <div class="kbf">
              <div class="chips10" role="group" aria-label="Filter by carousel type">
                <sc-for list="{{kChips}}" as="c" hint-placeholder-count="6">
                  <button type="button" class="chip10 {{c.cls}}" aria-pressed="{{c.pressed}}" title="{{c.name}}" onClick="{{c.pick}}"><span>{{c.name}}</span></button>
                </sc-for>
              </div>
              <div class="dd10 {{ddCls}}">
                <button type="button" class="btn2" aria-haspopup="listbox" aria-expanded="{{ddExpanded}}" onClick="{{toggleConf}}">{{confLabel}}<span class="ddcaret">${D10I.caretDown}</span></button>
                <div class="pop10 {{ddCls}}" role="listbox" aria-label="Confidence" onKeyDown="{{ddKey}}">
                  <sc-for list="{{confOpts}}" as="c" hint-placeholder-count="4">
                    <button type="button" class="opt10 {{c.cls}}" role="option" aria-selected="{{c.selected}}" onClick="{{c.pick}}">{{c.label}}<span class="optcheck10"><sc-if value="{{c.isSelected}}" hint-placeholder-val="{{ false }}">${D10I.check}</sc-if></span></button>
                  </sc-for>
                </div>
              </div>
            </div>
            <div class="kbscroll">
              <sc-if value="{{showPending}}" hint-placeholder-val="{{ true }}">
                <section class="c10" aria-label="Pending rules">
                  ${phone ? "" : `<div class="khead kgrid"><span>Pending</span><span>Applies to</span><span>Confidence</span><span></span></div>`}
                  ${phone ? `<div class="khead">Pending</div>` : ""}
                  <sc-for list="{{pending}}" as="k" hint-placeholder-count="4">
                    <div class="krow ${phone ? "" : "kgrid"}">
                      <span class="kt"><b>{{k.text}}</b><span>{{k.from}}</span></span>
                      ${phone ? `<span class="kmeta"><span class="pill tnum">{{k.conf}}</span>` : `<span class="ktypes">`}
                      <sc-for list="{{k.types}}" as="t" hint-placeholder-count="2">
                        <span class="pill pill--quiet">{{t.name}}</span>
                      </sc-for>
                      </span>
                      ${phone ? "" : `<span class="tnum">{{k.conf}}</span>`}
                      <span class="kact">
                        <button type="button" class="kbtn is-yes" onClick="{{k.accept}}">${D10I.checkSm}Accept</button>
                        <button type="button" class="kbtn" onClick="{{k.reject}}">${D10I.x}Reject</button>
                      </span>
                    </div>
                  </sc-for>
                </section>
              </sc-if>
              <sc-if value="{{showNonePending}}" hint-placeholder-val="{{ false }}">
                <div class="es10 {{nonePendingCls}}">
                  <span class="ic">${D10I.trend}</span>
                  <p>{{nonePendingText}}</p>
                </div>
              </sc-if>
              <sc-if value="{{showAccepted}}" hint-placeholder-val="{{ true }}">
                <section class="c10" aria-label="Accepted rules">
                  ${phone ? "" : `<div class="khead kgrid"><span>Accepted<span class="tabn tnum">{{acceptedCount}}</span></span><span>Applies to</span><span>Confidence</span><span></span></div>`}
                  ${phone ? `<div class="khead">Accepted<span class="tabn tnum">{{acceptedCount}}</span></div>` : ""}
                  <sc-for list="{{accepted}}" as="k" hint-placeholder-count="4">
                    <div class="krow ${phone ? "" : "kgrid"}">
                      <span class="kt"><b>{{k.text}}</b><span>{{k.from}}</span></span>
                      ${phone ? `<span class="kmeta"><span class="pill tnum">{{k.conf}}</span>` : `<span class="ktypes">`}
                      <sc-for list="{{k.types}}" as="t" hint-placeholder-count="2">
                        <span class="pill pill--quiet">{{t.name}}</span>
                      </sc-for>
                      </span>
                      ${phone ? "" : `<span class="tnum">{{k.conf}}</span>`}
                      <span class="kact"></span>
                    </div>
                  </sc-for>
                </section>
              </sc-if>
            </div>
          </div>
          <div class="catch10 {{ddCls}}" aria-hidden="true" onClick="{{closeConf}}"></div>`;

function page(phone) {
  return `
      <main class="main">
        <div class="page">
          <div class="t10head">
            <h1>Trends</h1>
          </div>
          <div class="tabs10" role="tablist" aria-label="Trends">
            <button type="button" class="tab10" role="tab" id="d10-tab-digests" aria-selected="{{tabSel.digests}}" aria-controls="d10-panel-digests" onClick="{{tabGo.digests}}">Digests<span class="tabn tnum">{{digestCount}}</span></button>
            <button type="button" class="tab10" role="tab" id="d10-tab-knowledge" aria-selected="{{tabSel.knowledge}}" aria-controls="d10-panel-knowledge" onClick="{{tabGo.knowledge}}">Knowledge base<span class="tabn tnum">{{pendingCount}}</span></button>
          </div>
          <sc-if value="{{is.digests}}" hint-placeholder-val="{{ true }}">
            <div role="tabpanel" id="d10-panel-digests" aria-labelledby="d10-tab-digests" style="display: flex; flex-direction: column; flex: 1; min-height: 0;">
              <sc-if value="{{hasDigests}}" hint-placeholder-val="{{ true }}">${digestsPanel(phone)}</sc-if>
              <sc-if value="{{noDigests}}" hint-placeholder-val="{{ false }}">
                <div class="es10">
                  <span class="ic">${D10I.trend}</span>
                  <p>{{noDigestsText}}</p>
                </div>
              </sc-if>
            </div>
          </sc-if>
          <sc-if value="{{is.knowledge}}" hint-placeholder-val="{{ false }}">
            <div role="tabpanel" id="d10-panel-knowledge" aria-labelledby="d10-tab-knowledge" style="display: flex; flex-direction: column; flex: 1; min-height: 0;">${knowledgePanel(phone)}</div>
          </sc-if>
        </div>
      </main>`;
}

/* ── Behaviour ─────────────────────────────────────────────────────────── */

function vals(init) {
  return `
    var DIGESTS = ${JSON.stringify(DIGESTS)};
    var BODY = ${JSON.stringify(BODY)};
    var RULES = ${JSON.stringify(RULES)};
    var OLDER_RULE = ${JSON.stringify(OLDER_RULE)};
    var ACCEPTED = ${JSON.stringify(ACCEPTED)};
    var ACCEPTED_TOTAL = ${ACCEPTED_TOTAL};
    var POSTS = ${JSON.stringify(POSTS)};
    var QUEUED_POSTS = ${JSON.stringify(QUEUED_POSTS)};
    var TYPES = ${JSON.stringify(TYPES)};
    var CONFS = ${JSON.stringify(CONFS)};

    var firstRun = ${init.empty === "first"};
    /* "Every digest analysed" is the all-clear: the accent leaves the screen
       because there is nothing waiting to be run. */
    var allDone = ${init.allDone === true};
    var working = ${init.working === true};
    var nothingPending = ${init.pending === false};

    var list = firstRun ? [] : DIGESTS.map(function (d) {
      return allDone && d.state !== "done" ? Object.assign({}, d, { state: "done", analysed: d.analysed || "6:30am" }) : d;
    });
    var openId = s.t10open || (list[0] ? list[0].id : null);
    var open = null;
    for (var i = 0; i < list.length; i++) if (list[i].id === openId) open = list[i];
    if (!open) open = list[0] || null;

    /* The newest digest nothing has been run on: the one Analyse sits on. */
    var newest = null;
    for (var j = 0; j < list.length; j++) if (list[j].state === "new" && !newest) newest = list[j];

    var deckCount = function (d) { return d.decks === 1 ? "1 carousel" : d.decks + " carousels"; };
    var stateOf = function (d) {
      if (d.state === "new") return { text: deckCount(d) + " · not analysed", cls: "is-new" };
      if (d.state === "queued") return { text: d.queued + " still queued", cls: "is-wait" };
      if (d.state === "failed") return { text: "Analysis failed", cls: "is-bad" };
      return { text: deckCount(d), cls: "" };
    };

    var digests = list.map(function (d) {
      var st = stateOf(d);
      return {
        date: d.date,
        stateText: st.text,
        stateCls: st.cls,
        cls: open && d.id === open.id ? "on" : "",
        current: open && d.id === open.id ? "true" : "false",
        open: function () { self.setState({ t10open: d.id }); }
      };
    });

    /* What the header line says about the open digest: when it arrived, how
       many links it carries, and when it was analysed if it was. */
    var meta = !open ? "" : open.when + " · " + deckCount(open) +
      (open.state === "failed" || open.state === "new" ? "" : " · analysed at " + open.analysed);

    var body = BODY.map(function (b) { return { text: b.text, cls: b.link ? "is-link" : "" }; });

    var analysed = !!open && (open.state === "done" || open.state === "queued");
    var typeRows = function (ids) {
      if (ids.length === TYPES.length) return [{ name: "All types" }];
      return ids.map(function (id) {
        var t = TYPES.filter(function (x) { return x.id === id; })[0];
        return { name: t ? t.name : id };
      });
    };

    var rules = (analysed ? RULES : []).map(function (r) {
      return {
        text: r.text,
        status: "Pending",
        conf: r.conf.toFixed(2),
        evidence: r.evidence.map(function (line) { return { line: line }; }),
        types: typeRows(r.types)
      };
    });

    /* Carousels only: a digest's video links are filtered out, because this
       app makes carousels (Garreth, 2026-09-16). */
    var posts = (analysed ? POSTS : []).map(function (p) {
      return {
        isTiktok: p.net === "tiktok",
        isInsta: p.net === "instagram",
        title: p.title,
        meta: p.meta,
        slides: p.slides.map(function (id) { return { cls: "ps-" + id }; }),
        recreate: function () {
          ctx.open("studio", { ref: p.title, refNew: true },
            "Opens the Studio on \\u201c" + p.title + "\\u201d, to build a template the same way \\u00b7 D6");
        }
      };
    });

    /* Only the queued board shows links still with the outside worker. */
    var queuedPosts = (analysed && open.state === "queued" ? QUEUED_POSTS : []).map(function (q) {
      return { isTiktok: q.net === "tiktok", isInsta: q.net === "instagram", url: q.url, since: q.since };
    });

    /* Analyse, while it runs, says what it is doing in F12's order. */
    var workNow = "Running the pattern pass";
    var workDone = "9 links read · 6 videos ignored · 3 carousels, 2 of them new";

    /* ── Knowledge base ── */
    var pendingAll = nothingPending ? [] : [OLDER_RULE].concat(RULES);
    var kType = s.t10type || "all";
    var conf = CONFS.filter(function (c) { return c.id === s.t10conf; })[0] || CONFS[0];
    var keep = function (r) {
      if (kType !== "all" && r.types.indexOf(kType) < 0) return false;
      if (r.conf < conf.min) return false;
      if (conf.max != null && r.conf >= conf.max) return false;
      return true;
    };
    var kbRow = function (r, on) {
      return {
        text: r.text,
        from: on ? "From " + r.from + "'s digest · accepted " + on : "From " + r.from + "'s digest",
        conf: r.conf.toFixed(2),
        types: typeRows(r.types),
        accept: function () { self.note("Adds the rule to the knowledge base, with the digest it came from"); },
        reject: function () { self.note("Drops the rule; nothing is recorded"); }
      };
    };
    var pending = pendingAll.filter(keep).map(function (r) { return kbRow(r, null); });
    var accepted = ACCEPTED.filter(keep).map(function (r) { return kbRow(r, r.on); });

    var chips = [{ id: "all", name: "All types" }].concat(TYPES).map(function (t) {
      var on = kType === t.id;
      return {
        name: t.name,
        cls: on ? "on" : "",
        pressed: on ? "true" : "false",
        pick: function () { self.setState({ t10type: t.id }); }
      };
    });

    var confOpts = CONFS.map(function (c) {
      var on = conf.id === c.id;
      return {
        label: c.label,
        cls: on ? "on" : "",
        selected: on ? "true" : "false",
        isSelected: on,
        pick: function () { self.setState({ t10conf: c.id, t10dd: false }); }
      };
    });

    var tab = s.t10tab || "digests";
    var tabSel = { digests: tab === "digests" ? "true" : "false", knowledge: tab === "knowledge" ? "true" : "false" };
    var tabGo = {
      digests: function () { self.setState({ t10tab: "digests", t10dd: false }); },
      knowledge: function () { self.setState({ t10tab: "knowledge" }); }
    };

    return {
      is: { digests: tab === "digests", knowledge: tab === "knowledge" },
      tabSel: tabSel,
      tabGo: tabGo,
      digestCount: firstRun ? "" : String(list.length),
      pendingCount: pendingAll.length ? String(pendingAll.length) : "",

      hasDigests: !firstRun,
      noDigests: firstRun,
      noDigestsText: "No digests yet",

      digests: digests,
      openLabel: open ? "Digest of " + open.date : "Digest",
      openSubject: "Daily Creator Study",
      openMeta: meta,
      bodyLabel: open ? "The digest of " + open.date : "The digest",
      body: body,

      /* Analyse is the accent, and only on the newest digest nothing has been
         run on; while it runs it stays put and goes busy. */
      showAnalyse: !!open && !!newest && open.id === newest.id,
      analyseLabel: working ? "Analysing" : "Analyse",
      analyseIdle: !working,
      analyseBusy: working,
      analyseCls: working ? "is-busy" : "",
      analyseSpin: working ? "on" : "",
      analyseOff: working ? "true" : "false",
      analyse: function () { self.note("Reads the digest's links, queues the new ones, and runs the pattern pass"); },

      /* A digest whose links have since landed can be run again (F12 step 4). */
      showAgain: !!open && open.state === "queued",
      again: function () { self.note("Runs the pattern pass again, now the queued posts have landed"); },

      showWork: working,
      workNow: workNow,
      workDone: workDone,

      showFail: !!open && open.state === "failed",
      failText: "The analysis call failed",
      retry: function () { self.note("Runs the analysis again"); },

      showRules: analysed && rules.length > 0,
      ruleCount: String(rules.length),
      rules: rules,
      showPosts: analysed && (posts.length > 0 || queuedPosts.length > 0),
      postCount: String(posts.length + queuedPosts.length),
      posts: posts,
      queuedPosts: queuedPosts,

      kChips: chips,
      confLabel: conf.label,
      confOpts: confOpts,
      ddCls: s.t10dd ? "on" : "",
      ddExpanded: s.t10dd ? "true" : "false",
      toggleConf: function () { self.setState({ t10dd: !s.t10dd }); },
      closeConf: function () { self.setState({ t10dd: false }); },
      ddKey: function (e) { if (e.key === "Escape") self.setState({ t10dd: false }); },

      showPending: pending.length > 0,
      pending: pending,
      showNonePending: pending.length === 0,
      nonePendingCls: accepted.length ? "es10--inline" : "",
      nonePendingText: pendingAll.length === 0 ? "Nothing pending" : "No pending rules for these filters",
      showAccepted: accepted.length > 0,
      accepted: accepted,
      acceptedCount: String(ACCEPTED_TOTAL)
    };
`;
}

export function trendsScreen({ init = {}, tall = 0 } = {}) {
  const full = { tab: "digests", open: null, type: "all", conf: "any", dd: false, empty: null, allDone: false, working: false, pending: true, ...init };
  return {
    id: "trends",
    nav: "trends",
    css: (phone) => css(phone, tall),
    markup: (phone) => page(phone),
    state: {
      t10tab: full.tab,
      t10open: full.open,
      t10type: full.type,
      t10conf: full.conf,
      t10dd: !!full.dd,
    },
    /* Opened from the menu: back to the digests, newest first, nothing filtered. */
    enter: { t10tab: "digests", t10open: null, t10type: "all", t10conf: "any", t10dd: false },
    vals: vals(full),
  };
}

/* ── Review artboards ──────────────────────────────────────────────────── */

/*
 * Every {{name}} the markup asks for has to be handed over by something; a
 * name nothing supplies renders as nothing at all, silently. D8's net, run on
 * every board here too.
 */
const KEYWORDS = new Set(["true", "false", "null", "undefined"]);

function checkBindings(file, html) {
  const at = html.indexOf("<script data-dc-script");
  const markup = html.slice(0, at);
  const script = html.slice(at);
  const aliases = new Set([...markup.matchAll(/\bas="([^"]+)"/g)].map((m) => m[1]));
  const handed = new Set([...script.matchAll(/(?:^|[,{])\s*([A-Za-z_$][\w$]*)\s*:/gm)].map((m) => m[1]));
  const missing = new Set();
  for (const m of markup.matchAll(/\{\{\s*([A-Za-z_$][\w$]*)/g)) {
    const root = m[1];
    if (!KEYWORDS.has(root) && !aliases.has(root) && !handed.has(root)) missing.add(root);
  }
  if (missing.size) {
    const names = [...missing].join(", ");
    throw new Error(`${file}: the markup asks for ${names}, and nothing hands ${missing.size > 1 ? "them" : "it"} over`);
  }
  /* A {{hole}} renders as a TEXT node, so markup handed over as a value shows
     its own source on the screen instead of drawing anything. Garreth found
     three icons doing exactly that on 2026-09-16; this stops the next one.
     Icons belong in the template, written out by `net()` and its like. */
  const asValue = [...script.matchAll(/(?:^|[,{])\s*([A-Za-z_$][\w$]*)\s*:\s*"<(?:svg|span|div|b)\b/gm)].map((m) => m[1]);
  if (asValue.length) {
    throw new Error(`${file}: ${[...new Set(asValue)].join(", ")} hand markup over as a value; a hole renders it as text. Put it in the template instead.`);
  }
}

/* The Studio D6 already designs, with D10's image names: where Recreate this
   lands, on a reference the library has no analysis for. */
function studioBoard() {
  const screen = studioScreen({
    init: {
      d6: { stage: "ready", lib: "window", slide: 1, entry: "reference", ref: POSTS[0].title, refNew: true, left: false },
    },
  });
  return { ...screen, css: (phone) => screen.css(phone).replace(/\.\/d6-(slide-|lib-|cut\.|photo-)/g, "./d10-$1") };
}

function build(OUT) {
  fs.mkdirSync(OUT, { recursive: true });
  copyTrendsImages(OUT);

  const BOARDS = [
    { file: "Main.dc.html", title: "D10 · Trends: the newest digest, not analysed yet · Desktop", init: {}, row: 0, col: 0 },
    { file: "Analysing.dc.html", title: "D10 · Analyse running: the links read and queued · Desktop", init: { working: true }, row: 0, col: 1 },
    {
      file: "Analysed.dc.html",
      title: "D10 · An analysed digest, on a day when every digest is analysed · Desktop",
      init: { allDone: true },
      row: 0,
      col: 2,
    },
    {
      file: "Posts.dc.html",
      title: "D10 · The carousels a digest read, with their slides · Desktop",
      init: { allDone: true },
      tall: 1720,
      row: 0,
      col: 3,
    },
    { file: "Queued.dc.html", title: "D10 · Links still being analysed · Desktop", init: { open: "g15" }, row: 0, col: 4 },
    { file: "Failed.dc.html", title: "D10 · The analysis failed: Retry · Desktop", init: { open: "g13" }, row: 0, col: 5 },
    { file: "FirstRun.dc.html", title: "D10 · No digests yet · Desktop", init: { empty: "first" }, row: 0, col: 6 },
    { file: "Knowledge.dc.html", title: "D10 · Knowledge base: pending rules, Accept and Reject · Desktop", init: { tab: "knowledge" }, row: 1, col: 0 },
    {
      file: "Confidence.dc.html",
      title: "D10 · Filtering the knowledge base by confidence · Desktop",
      init: { tab: "knowledge", dd: true },
      row: 1,
      col: 1,
    },
    {
      file: "NothingPending.dc.html",
      title: "D10 · Knowledge base: nothing pending · Desktop",
      init: { tab: "knowledge", pending: false },
      row: 1,
      col: 2,
    },
    /* D6's own screen, on this canvas so D10's reviewer can see where Recreate
       this lands without opening D6's. */
    { file: "Studio.dc.html", title: "D10 · Recreate this: the Studio on a reference with no analysis · Desktop", studio: true, init: {}, row: 1, col: 3 },
    { file: "Phone.dc.html", title: "D10 · Trends · Phone", phone: true, init: {}, row: 1, col: 4 },
    { file: "PhoneAnalysed.dc.html", title: "D10 · An analysed digest · Phone", phone: true, init: { allDone: true }, row: 1, col: 5 },
    { file: "PhoneKnowledge.dc.html", title: "D10 · Knowledge base · Phone", phone: true, init: { tab: "knowledge" }, row: 1, col: 6 },
    { file: "PhoneEmpty.dc.html", title: "D10 · No digests yet · Phone", phone: true, init: { empty: "first" }, row: 1, col: 7 },
  ];

  /* Rows are laid out from the tallest board in each one, so a board that
     grows cannot land on its neighbour (D8's rule). */
  const GAP_X = 100;
  const GAP_Y = 120;
  const height = (b) => b.tall || (b.phone ? 844 : 900);
  const width = (b) => (b.phone ? 390 : 1440);
  const rowTop = [];
  for (let r = 0, y = 0; ; r += 1) {
    const inRow = BOARDS.filter((b) => b.row === r);
    if (!inRow.length) break;
    rowTop[r] = y;
    y += Math.max(...inRow.map(height)) + GAP_Y;
  }
  const colLeft = [];
  for (let c = 0, x = 0; ; c += 1) {
    const inCol = BOARDS.filter((b) => b.col === c);
    if (!inCol.length) break;
    colLeft[c] = x;
    x += Math.max(...inCol.map(width)) + GAP_X;
  }
  const noteX = colLeft[colLeft.length - 1] + 1440 + GAP_X * 2;

  const artboards = [];
  for (const light of [false, true]) {
    for (const b of BOARDS) {
      const phone = !!b.phone;
      const file = light ? b.file.replace(".dc.html", "Light.dc.html") : b.file;
      const screen = b.studio ? studioBoard() : trendsScreen({ init: b.init, tall: b.tall || 0 });
      const html = artboard({ phone, light, screens: [screen], navMode: "note" });
      if (!b.studio) checkBindings(file, html);
      fs.writeFileSync(path.join(OUT, file), html);
      artboards.push({
        file,
        title: light ? `${b.title} · Light` : b.title,
        page: light ? "light" : "dark",
        x: colLeft[b.col],
        y: rowTop[b.row],
        w: width(b),
        h: height(b),
        is_interactive: true,
      });
    }
  }

  const tryNote =
    "Clickable. The two tabs switch, a date in the left column opens that digest, the type pills and the confidence dropdown really filter the knowledge base, and Accept and Reject say what they would do.\n\nSep 16 has had nothing run on it, so Analyse is lit there and nowhere else. Sep 15 was analysed while two of its links were still with the outside worker, and says how long they have been queued. Sep 13's analysis failed.\n\nA proposed rule shows what it says, the lines from the digest it rests on, a confidence, and the carousel types it applies to. Accepting or rejecting it happens on the Knowledge base tab, not here: reading what was proposed and deciding on it are two different jobs.\n\nA digest's links are mostly not carousels \u2014 on 2026-09-16 the library held 1,179 TikTok carousels against 2,682 videos and 264 short videos \u2014 and the videos are filtered out, because this app makes carousels. The body still shows them, because the body is the email that arrived; the digest's own count is of carousels, which is what the screen will actually show you.\n\nThe board called \u201cThe carousels a digest read\u201d is taller than a screen so the whole reading pane shows at once.\n\nRecreate this opens the Studio on that deck. That screen is D6's own, already approved — the board at the end of the second row is it, showing the one thing this ticket adds: the dashed frame says Not analysed in Trends when the library has no analysis for the deck yet, and the draft is made from the vision pass alone.\n\nThe content is invented: the digest's links go nowhere, the rules and figures are made up, and the reference decks are the ones D6 already keeps, so the same titles show in both.";
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
          { id: "d10-try", page: "dark", x: noteX, y: 0, w: 420, text: tryNote },
          { id: "d10-try-light", page: "light", x: noteX, y: 0, w: 420, text: tryNote },
        ],
        launch: { view: "canvas", page: "dark" },
      },
      null,
      2,
    ),
  );
  console.log(`Wrote D10 artboards to ${OUT}`);
}

if (isMain(import.meta.url)) build(path.resolve(process.argv[2] ?? path.join(HERE, "out")));
