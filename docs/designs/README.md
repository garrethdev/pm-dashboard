# Designing the Carousel Generator screens

How the design tickets are made, written down so any Claude Code session can
design the next one the same way, including several sessions at once, each on
its own branch. The tickets themselves are in
`docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md`; take the lowest one not marked
done, or the one Garreth names.

## Where the designs live

- **Carousel Generator Designs**, the review canvas:
  https://claude.ai/code/artifact/d2004744-5f98-4bfa-bddf-71b0d8edcca8.
  One page per ticket and theme (`D1 · Dark`, `D1 · Light`, `D2 · Dark` …).
  Every ticket's screens go here.
- **Carousel Generator Prototype**, the click-through of every approved screen:
  https://claude.ai/code/artifact/94d569f8-fd94-4ce0-9298-f9d0f0f5f175.
  A desktop artboard and a phone artboard; holds D1, D2 and D3 (2026-09-14). It
  is built only from `main`, by one session, after a ticket is approved.
  Ticket sessions never save it.
- The separate D2 canvas (`815e3cc0-…`) is retired and no longer updated.

## The rules

- **Design only.** The app is not changed during a design ticket.
- **Sample content only.** Invented carousel type names, "Character 2",
  "Character 3", "Character 4", made-up numbers, placeholder images. See the
  *Placeholder data* table in the tickets doc.
- **Dark first, then light.** Desktop (1440×900) and phone (390×844). Light
  mode is designed once Garreth approves the dark version.
- **Match the app exactly.** Same sidebar, top bar, font, icons, colours and
  spacing as the running dashboard. Components come from `src/components/ui`
  and `src/app/globals.css`; new pieces extend that vocabulary.
- **Pictures first, clicks later** (Garreth, 2026-09-14). From D3 on, review
  screens are plain pictures: one screen per state, controls need not work.
  The working behaviour is built into the prototype once the ticket is
  approved. D1 and D2 were made clickable before this rule and stay that way.
- **Stop for review** after the first version of a ticket, and after each
  round of feedback.
- **No `CHANGELOG.md` entry.** The changelog is for development work only; a
  design ticket's record is its Status line (Garreth, 2026-09-14).

## The skills

Load all three at the start: `/design` (the Claude Design canvas),
`/emil-design-eng` (motion and interaction feel) and `/ui-ux-pro-max`
(UX rules; run its search for the screen's main concerns, and its checklist
before handing over). Loading `/design` prints its base directory; the
commands below call that directory `<design>`.

## Working in parallel

Each ticket is designed by one session on its own branch. To stay out of each
other's way:

- **A ticket owns only its own things:** its build script
  `carousel-generator/dN-<name>.build.mjs`, its Status line in the tickets
  doc, and on the canvas the pages whose id starts `dN-` and the artboards
  named `DN-*.dc.html`. Touch nothing else.
- **Never rebuild the whole canvas.** Your branch only holds your own ticket,
  so a full rebuild would wipe every other ticket's pages. Load the saved
  canvas and swap in your own pages (steps 3–6 below).
- **The shared shell stays put.** The menu, top bar, glow and theme live in
  `generator-kit.mjs`. Changes to it happen only on `main`, as their own task,
  followed by re-placing every ticket and rebuilding the prototype.
- **The plan, flows and dev tickets** change only after Garreth approves the
  design, and only in the sections for this ticket.
- **Commits** go to the ticket's branch when Garreth asks; he merges branches
  into `main`.

## How a ticket gets built

1. **Describe the screen, not the shell.** Copy
   `carousel-generator/d2-generate-form.build.mjs` to
   `carousel-generator/dN-<name>.build.mjs` and replace its screen: page CSS,
   markup, starting state and behaviour. The shell (menu, top bar, page glow,
   both themes, phone drawer, prototype note, font, logo and icons) comes from
   `generator-kit.mjs`, so nothing visual is retyped; the kit's header lists
   what a screen provides. Give the screen an `id` and the menu item it sits
   under as `nav`, and export it (`export function <name>Screen()`) so the
   prototype can add it once approved. Links to another screen go through
   `ctx.open(id, params, note)`, which opens it in the prototype and shows the
   Prototype note on the review canvas. Scope any class another screen also
   uses under `.screen-<id>`. Start every artboard title with `DN · `, and give
   the script's `canvas.json` a `pages` list (`[{ "id": "dark", "name":
   "Dark" }]`, adding `light` when light mode is designed).
2. **Build the artboards** into a scratch folder:
   `node docs/designs/carousel-generator/dN-<name>.build.mjs <scratch>/dN`
3. **Load the saved canvas.** Read the Designs canvas with the Artifact tool
   (`action: "read"`, the link above); the result names a saved file. Unpack
   it into a fresh, empty folder:
   `node <design>/seed-canvas.mjs --extract <saved file> --to <scratch>/live`
4. **Swap in this ticket's pages:**
   `node docs/designs/carousel-generator/place-ticket.mjs --ticket DN --from <scratch>/dN --canvas <scratch>/live --out <scratch>/merged`
   It replaces only this ticket's pages and prints the `--artboard` and
   `--image` list for the next step. Images a ticket uses live in
   `carousel-generator/assets/`, named `dN-<name>`, and are downsampled to a
   few KB.
5. **Package and check it**, from inside `<scratch>/merged`:
   `node <design>/seed-canvas.mjs --template <design>/payload.template.html --out ../carousel-generator-designs.html --title "Carousel Generator Designs" <that list> --canvas canvas.json`,
   then `node <design>/seed-canvas.mjs --check ../carousel-generator-designs.html`.
   The warning that there is no `Main.dc.html` is expected.
6. **Save it** with the Artifact tool: publish that file with `url` set to the
   Designs link, `contract: "0.1.31"`, `favicon: "🎠"`, and no
   `capabilities`. If the save is refused because someone else saved in the
   meantime, go back to step 3 and redo steps 3–6. Never force it.
7. **Look at it** on the saved canvas, open to your ticket's page, before
   handing over.
8. **Update the ticket's Status line** with its page names, then stop for
   review.

## Adding an approved ticket to the prototype

On `main`, once the ticket's branch is merged:

1. In `carousel-generator/prototype.build.mjs`, import the ticket's screen and
   add it to `SCREENS`. Point the links that lead to it (for example D2's
   Generate, which will open D3) at its id through `ctx.open`.
2. Build it: `node docs/designs/carousel-generator/prototype.build.mjs <scratch>/proto`
3. Package and check it, from inside `<scratch>/proto`:
   `node <design>/seed-canvas.mjs --template <design>/payload.template.html --out ../carousel-generator-prototype.html --title "Carousel Generator Prototype" --artboard Main.dc.html --artboard Phone.dc.html <an --image for every image in the folder> --canvas canvas.json`,
   then `--check` it as for the Designs canvas.
4. Save it with the Artifact tool: `url` set to the Prototype link,
   `contract: "0.1.31"`, `favicon: "🕹️"`, no `capabilities`. The prototype is
   rebuilt whole from `main` every time, so nothing on it is merged by hand.
5. Click through it before handing over: every link into and out of the new
   screen, on desktop and phone.

## Status

Each ticket's Status line in `docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md` is
the record of where it stands. There is no summary table here: parallel
branches would all edit the same lines of it and collide when merged.
