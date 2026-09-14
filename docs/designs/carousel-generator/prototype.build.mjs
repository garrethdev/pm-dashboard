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

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(process.argv[2] ?? path.join(HERE, "out-prototype"));

/* Approved screens, in the order a person meets them.
   D1 Carousel types, D2 Generate form, D3 Batch while writing (approved 2026-09-14, reopened and approved again
   2026-09-15), D4 Batch review (approved 2026-09-15). */
const SCREENS = () => [typesScreen(), generateScreen(), batchScreen({ auto: true }), reviewScreen({ auto: true })];

fs.mkdirSync(OUT, { recursive: true });
copyCovers(OUT);

const BOARDS = [
  { file: "Main.dc.html", phone: false, title: "Prototype · Desktop", x: 0, y: 0 },
  { file: "Phone.dc.html", phone: true, title: "Prototype · Phone", x: 1540, y: 0 },
];
for (const b of BOARDS) {
  fs.writeFileSync(path.join(OUT, b.file), artboard({ phone: b.phone, screens: SCREENS(), start: "types", navMode: "page" }));
}

const note =
  "Every approved screen, linked. Generate on a carousel type opens its Generate form; Generate there opens the batch, and Open running batch on a card opens one part-way. Carousel types, in the menu or above a title, brings you back. The menu's switch flips dark and light.\n\nOn the batch, decks write one by one: deck 5 fails once (Retry), deck 6 is flagged and rings the bell (its item leads to the deck), and Regenerate on any written deck takes feedback and sends it back as Up next, then Rewriting.\n\nOnce every deck is written (Retry deck 5 first), the batch moves on to review. There: Regenerate on a card (Deck or one slide), the arrows on a card with versions, the … menu's Discard deck (press and hold), Retry music lookup and its arrow's Change track (type to search), Regenerate batch, and J / K / R on a focused card. On the phone, swipe a deck's copy between versions.\n\nScreens not approved yet show a Prototype note naming their ticket.\n\nIn so far: D1 Carousel types, D2 Generate form, D3 Batch while writing, D4 Batch review.";
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
