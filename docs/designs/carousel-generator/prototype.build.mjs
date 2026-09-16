#!/usr/bin/env node
/*
 * The Carousel Generator prototype: every approved design screen in one
 * click-through, on a desktop artboard and a phone artboard. Generate on a
 * carousel type opens its Generate form; Carousel types brings you back.
 * Screens not approved yet show the Prototype note naming their ticket.
 *
 * Built only from main, by one session, after a ticket is approved
 * (docs/designs/README.md). To add an approved ticket: import its screen and
 * add it to SCREENS, then rebuild and save the Prototype canvas.
 *
 *   node docs/designs/carousel-generator/prototype.build.mjs <out dir>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { artboard } from "./generator-kit.mjs";
import { typesScreen } from "./d1-carousel-types.build.mjs";
import { generateScreen, copyCovers } from "./d2-generate-form.build.mjs";
import { batchScreen } from "./d3-batch-writing.build.mjs";
import { reviewScreen } from "./d4-batch-review.build.mjs";
import { renderScreen, copySlides } from "./d5-batch-render.build.mjs";
import { studioScreen, copyStudioImages } from "./d6-studio.build.mjs";
import { typeScreen, copyTypeImages } from "./d7-type-page.build.mjs";
import { librariesScreen, copyLibraryImages } from "./d8-image-libraries.build.mjs";
import { historyScreen } from "./d9-history.build.mjs";
import { trendsScreen, copyTrendsImages } from "./d10-trends.build.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(process.argv[2] ?? path.join(HERE, "out-prototype"));

/* Approved screens, in the order a person meets them.
   D1 Carousel types, D2 Generate form, D3 Batch while writing (approved 2026-09-14, reopened and approved again
   2026-09-15), D4 Batch review (approved 2026-09-15), D5 Batch render and finish (2026-09-15), D6 Studio (approved
   2026-09-15 after seven review rounds; New carousel type on D1 and the Studio menu item open it). The Studio is
   D6's own build with its second round brought in (approved 2026-09-15): slide sizes, the canvas that pans and
   zooms, layered templates and starting from a Figma link. Every hand-off from a type to its batch carries the
   type's slide size, so D5 draws a 9:16 type's slides at 9:16. */
const SCREENS = () => [
  typesScreen(), generateScreen(), batchScreen({ auto: true }), reviewScreen({ auto: true }), renderScreen({ auto: true }), studioScreen(),
  /* D7 A carousel type's page (approved 2026-09-15 after five review rounds): a type's name on D1 and Edit on D2's
     direction open it. */
  typeScreen(),
  /* D8 Image libraries (approved 2026-09-16 after three review rounds): the Image libraries menu item opens it, as
     does Image libraries at the foot of D2's library picker. */
  librariesScreen(),
  /* D9 History (approved 2026-09-16 after one review round): the History menu item opens it, as does History ›
     on a type's page, which arrives already filtered to that type. A row, or its action, opens that batch — a
     finished one at D5, a running or stopped one at D3 — carrying the type's slide size like every other
     hand-off. */
  historyScreen(),
  /* D10 Trends (designed 2026-09-16, in the prototype at Garreth's request before its review is closed): the Trends
     menu item opens it. The digests and the knowledge base are its two tabs; a date opens that digest, and Analyse
     sits on the newest one nothing has been run on. Recreate this opens the Studio, though not yet on that deck —
     the Studio takes a name and a character today, not a reference, so landing it on the right one is a change to
     D6's own build, for when D10 is approved. */
  trendsScreen(),
];

fs.mkdirSync(OUT, { recursive: true });
copyCovers(OUT);
copySlides(OUT);
copyStudioImages(OUT);
copyTypeImages(OUT);
copyLibraryImages(OUT);
copyTrendsImages(OUT);

const BOARDS = [
  { file: "Main.dc.html", phone: false, title: "Prototype · Desktop", x: 0, y: 0 },
  { file: "Phone.dc.html", phone: true, title: "Prototype · Phone", x: 1540, y: 0 },
];
for (const b of BOARDS) {
  fs.writeFileSync(path.join(OUT, b.file), artboard({ phone: b.phone, screens: SCREENS(), start: "types", navMode: "page" }));
}

const note =
  "Every approved screen, linked. Generate on a carousel type opens its Generate form; Generate there opens the batch, and Open running batch on a card opens one part-way. Carousel types, in the menu or above a title, brings you back. The menu's switch flips dark and light.\n\nOn the batch, decks write one by one: deck 5 fails once (Retry), deck 6 is flagged and rings the bell (its item leads to the deck), and Regenerate on any written deck takes feedback and sends it back as Up next, then Rewriting.\n\nOnce every deck is written (Retry deck 5 first), the batch moves on to review. There: Regenerate on a card (Deck or one slide), the arrows on a card with versions, the … menu's Discard deck (press and hold), Retry music lookup and its arrow's Change track (type to search), Regenerate batch, and J / K / R on a focused card. On the phone, swipe a deck's copy between versions.\n\nRender takes the batch to rendering: decks paint one at a time and their slides land as thumbnails (press one for the full-size preview: arrows or arrow keys, swipe on the phone, Escape closes). Deck 7 fails once on slide 5 (Retry), the check flags deck 4's slide 4 and deck 9's slide 6, and Grid / Rows opposite the title changes the layout. Once every clean deck is rendered: Approve (n) decks, or Regenerate (n) decks for the flagged ones.\n\nNew carousel type (or Studio in the menu) opens the Studio: pick a card (a saved deck, your idea, or a Figma link), a library, then a saved deck, or type into the chat box and send it (for a Figma link, the paperclip attaches it as a chip above the prompt; the box grows as you type, Shift+Enter for a new line). The draft arrives on a canvas that pans in every direction and zooms (drag the ground or scroll; Ctrl or Cmd with the wheel, a pinch, or the zoom buttons in the tool strip, where the zoom level fits every slide). Pick the slide size at the top of the adjustments, press a text box or an image cell and change it on the left, drag a library image onto a cell, fold either panel, rename the type from its title, Render preview, Regenerate sample, Save as carousel type, or hold Discard draft. Back keeps the draft. From a Figma link the draft is layered: press a layer on the slide or in the Layers list, and Bring forward or Send back.\n\nA type's name on Carousel types (or Edit beside the Generate form's direction) opens that type's page: Overview with the template's version dropdown and the batches (a row opens its batch), Direction with its own version dropdown and the conversation, and Wiring with Preview. Generate and Edit template lead on from there.\n\nImage libraries, in the menu or at the foot of the Generate form's library picker, opens the libraries: a card opens that library, and a library's folders open into it (Cover holds folders of its own, so the trail goes three deep). Click any image to see what AI vision read off it — the headings are the dashboard's own carousel_images columns. Tag with AI reads a whole library, New folder makes a folder, and Generate images takes a prompt and a base image you pick or upload. A small amber dot means nothing has been read off that image yet.\n\nHistory, in the menu or from History › on a type's page, lists every batch: date, carousel type, the four counts as the batch runs (requested, written, rendered, approved) and a status. The type pills and the date range filter, and the count beside the title follows them. A row opens that batch — Sep 16's Myth vs Fact is still writing, Sep 14's Day in the Life is stopped and opens with Continue — and Run again on a finished row starts another. Run again on a Myth vs Fact row opens the batch already writing instead. Sep 16's Before & After is a re-run: it and the Sep 11 batch it copied each name the other, and filtering to that type brings them together.\n\nTrends, in the menu, holds the daily study digest and the knowledge base on two tabs. A date on the left opens that digest and its body reads in place; Analyse is lit on Sep 16, the newest one nothing has been run on. An analysed digest lists the rules it proposed, each with the lines it rests on, a confidence and the types it applies to, then the carousels it read with their slides and Recreate this. Videos are filtered out — this app makes carousels — so a digest is counted in carousels, not links. Accepting and rejecting a rule happens on the Knowledge base tab, where the type pills and the confidence dropdown filter both the pending rules and the ones already accepted.\n\nScreens not approved yet show a Prototype note naming their ticket.\n\nIn so far: D1 Carousel types, D2 Generate form, D3 Batch while writing, D4 Batch review, D5 Batch render and finish, D6 Studio with its second round (D11), D7 A carousel type's page, D8 Image libraries, D9 History, D10 Trends (designed, not yet approved).";
fs.writeFileSync(
  path.join(OUT, "canvas.json"),
  JSON.stringify(
    {
      artboards: BOARDS.map((b) => ({ file: b.file, title: b.title, x: b.x, y: b.y, w: b.phone ? 390 : 1440, h: b.phone ? 844 : 900, is_interactive: true })),
      annotations: [{ id: "prototype-how", x: 2010, y: 0, w: 390, text: note }],
      launch: { view: "focused", file: "Main.dc.html" },
    },
    null,
    2,
  ),
);
console.log(`Wrote the prototype to ${OUT}`);
