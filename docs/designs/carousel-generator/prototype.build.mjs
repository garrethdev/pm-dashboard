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
];

fs.mkdirSync(OUT, { recursive: true });
copyCovers(OUT);
copySlides(OUT);
copyStudioImages(OUT);
copyTypeImages(OUT);

const BOARDS = [
  { file: "Main.dc.html", phone: false, title: "Prototype · Desktop", x: 0, y: 0 },
  { file: "Phone.dc.html", phone: true, title: "Prototype · Phone", x: 1540, y: 0 },
];
for (const b of BOARDS) {
  fs.writeFileSync(path.join(OUT, b.file), artboard({ phone: b.phone, screens: SCREENS(), start: "types", navMode: "page" }));
}

const note =
  "Every approved screen, linked. Generate on a carousel type opens its Generate form; Generate there opens the batch, and Open running batch on a card opens one part-way. Carousel types, in the menu or above a title, brings you back. The menu's switch flips dark and light.\n\nOn the batch, decks write one by one: deck 5 fails once (Retry), deck 6 is flagged and rings the bell (its item leads to the deck), and Regenerate on any written deck takes feedback and sends it back as Up next, then Rewriting.\n\nOnce every deck is written (Retry deck 5 first), the batch moves on to review. There: Regenerate on a card (Deck or one slide), the arrows on a card with versions, the … menu's Discard deck (press and hold), Retry music lookup and its arrow's Change track (type to search), Regenerate batch, and J / K / R on a focused card. On the phone, swipe a deck's copy between versions.\n\nRender takes the batch to rendering: decks paint one at a time and their slides land as thumbnails (press one for the full-size preview: arrows or arrow keys, swipe on the phone, Escape closes). Deck 7 fails once on slide 5 (Retry), the check flags deck 4's slide 4 and deck 9's slide 6, and Grid / Rows opposite the title changes the layout. Once every clean deck is rendered: Approve (n) decks, or Regenerate (n) decks for the flagged ones.\n\nNew carousel type (or Studio in the menu) opens the Studio: pick a card (a saved deck, your idea, or a Figma link), a library, then a saved deck, or type into the chat box and send it (for a Figma link, the paperclip attaches it as a chip above the prompt; the box grows as you type, Shift+Enter for a new line). The draft arrives on a canvas that pans in every direction and zooms (drag the ground or scroll; Ctrl or Cmd with the wheel, a pinch, or the zoom buttons in the tool strip, where the zoom level fits every slide). Pick the slide size at the top of the adjustments, press a text box or an image cell and change it on the left, drag a library image onto a cell, fold either panel, rename the type from its title, Render preview, Regenerate sample, Save as carousel type, or hold Discard draft. Back keeps the draft. From a Figma link the draft is layered: press a layer on the slide or in the Layers list, and Bring forward or Send back.\n\nA type's name on Carousel types (or Edit beside the Generate form's direction) opens that type's page: Overview with the template's version dropdown and the batches (a row opens its batch), Direction with its own version dropdown and the conversation, and Wiring with Preview. Generate and Edit template lead on from there.\n\nScreens not approved yet show a Prototype note naming their ticket.\n\nIn so far: D1 Carousel types, D2 Generate form, D3 Batch while writing, D4 Batch review, D5 Batch render and finish, D6 Studio with its second round (D11), D7 A carousel type's page.";
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
