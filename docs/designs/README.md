# Designing the Carousel Generator screens

How the design tickets are made, written down so any Claude Code session can
design the next one the same way, including several sessions at once, each on
its own branch. The tickets themselves are in
`docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md`; take the lowest one not marked
done, or the one Garreth names.

**The design step closed on 2026-09-16** with D1 to D11 approved and in the
prototype (**D12, Auto mode, was added and approved on 2026-09-21**, and is in
the prototype), and the work moved to `CAROUSEL-GENERATOR-DEV-TICKETS.md`. **D10 was
reopened on 2026-09-17** (Garreth) for a second round, the feed and the search,
redesigned in place in its own build file and on its own canvas pages; the dev
tickets for it were written the same day, in parallel, and **round two was
approved the same day**, so the design step is closed again. This page stays
as the how-to for any screen Garreth reopens or adds.

## Where the designs live

**One canvas a ticket since 2026-09-18** (Garreth). Each holds the ticket's
dark and light pages together; D6 and D10 have a canvas a theme, because
their two themes do not fit under the 16 MB limit of one canvas (D6 is
12.2 MB a theme; D10 would be about 21 MB with round three in both).

| Ticket | Canvas | Pages | Link | Favicon |
|---|---|---|---|---|
| D1 | Carousel Generator Designs - (D1 Carousel types) | D1 · Dark, D1 · Light | https://claude.ai/artifact/R1qCqyRpsX7AehQPLCbAMi | 🎠1️⃣ |
| D2 | Carousel Generator Designs - (D2 Generate form) | D2 · Dark, D2 · Light | https://claude.ai/artifact/BYwZo8XWDR4x33MszvVotX | 🎠2️⃣ |
| D3 | Carousel Generator Designs - (D3 Batch writing) | D3 · Dark, D3 · Light | https://claude.ai/artifact/1BS64VF3Sydob9oPMU7Xtg | 🎠3️⃣ |
| D4 | Carousel Generator Designs - (D4 Batch review) | D4 · Dark, D4 · Light | https://claude.ai/artifact/J2NcLiDevFJp6s3zf6dhVN | 🎠4️⃣ |
| D5 | Carousel Generator Designs - (D5 Batch render) | D5 · Dark, D5 · Light | https://claude.ai/artifact/4h66j2MEbBPzuJzRujwuXp | 🎠5️⃣ |
| D6 dark | Carousel Generator Designs - Dark (D6 Studio) | D6 · Dark | https://claude.ai/artifact/MtsnyvaJPznX6Kg4JaKb2p | 🎠🎨 |
| D6 light | Carousel Generator Designs - Light (D6 Studio) | D6 · Light | https://claude.ai/artifact/3gbDBA71hV5agEfU4ywa8p | 🎨☀️ |
| D7 | Carousel Generator Designs - (D7 Type page) | D7 · Dark, D7 · Light | https://claude.ai/artifact/Rjg4tERJZkguERBwbU2XWp | 🎠7️⃣ |
| D8 | Carousel Generator Designs - (D8 Image libraries) | D8 · Dark, D8 · Light | https://claude.ai/artifact/WqEfhNzEiUiTieUAU14qms | 🎠8️⃣ |
| D9 | Carousel Generator Designs - (D9 History) | D9 · Dark, D9 · Light | https://claude.ai/artifact/2EjoB77uj9C8qXriiUmRxT | 🎠📜 |
| D10 dark | Carousel Generator Designs - Dark (D10 Trends) | D10 · Dark | https://claude.ai/artifact/2Cs5YYqwJHC6qSPzBrZ1b1 | 🎠📈 |
| D10 light | Carousel Generator Designs - Light (D10 Trends) | D10 · Light | https://claude.ai/artifact/8vc8Sv7TRCi5Xqbhxqi1Sp | 📈☀️ |
| D11 | Carousel Generator Designs - (D6 pt. 2 Studio) | D11 · Dark, D11 · Light | https://claude.ai/artifact/DdWFJ1M8acjehQbj36Wtr5 | 🎠🧩 |
| Prototype | Carousel Generator Prototype | desktop, phone | https://claude.ai/artifact/KNxf22ERryEbTmr2tRuzF6 | 🕹️ |

- **D12 (Auto mode) has no canvas of its own** (Garreth, 2026-09-21: a
  separate canvas would confuse the developer, who should find every state of
  a screen in one place). It extends screens that already exist, so its
  boards are the last rows of **D1, D2, D3, D4, D5, D7 and D9**, every title
  starting "Auto mode", "Auto paused" or naming what a batch is waiting for,
  and its states live in those screens' own build files. Approved
  2026-09-21. A ticket that extends existing screens is drawn this way; a
  ticket that adds a screen still gets its own canvas.
- **D13, D13b, D14 and D15 have no canvas of their own either** (Garreth,
  2026-09-21), for the same reason. They change and extend screens that
  already exist, so their boards are new last rows on the canvases those
  screens own. **D13 was approved on 2026-09-22; D13b, D14 and D15 are still
  open, and D13b is taken first.**
  - **D13** (Direction → **Writing**, Wiring → **Go Live**, Writing required)
    — **D1**, **D2** and **D7**, all three saved in dark and light. Boards
    that showed the old names were redrawn in place on those pages, not added
    beside, and D7's Direction and Wiring boards were renamed Writing and Go
    Live. Because the rename had to reach both themes at once, the three
    canvases were placed **without `--theme`** (each holds both pages), not
    dark-first.
  - **D13b** (a first draft from the Conversation, taken before D14) — **D7**,
    dark and light, desktop and phone. Added 2026-09-22 off D13's own *Writing,
    nothing written yet* board, where the Conversation is a blank card. It is
    numbered 13b so the queue reads off the numbers without renumbering D14 to
    D16.
  - **D14** (naming a text box) — **D6 · Dark**, **D6 · Light**, and **D11**
    for the same inspector section on a layered slide.
  - **D15** (the **Rows** tab) — **D7**.
- **D16 (Overview) is the exception and does get its own canvas** (2026-09-22):
  it adds a screen rather than extending one, which is the standing rule two
  bullets down. Name it "Carousel Generator Designs - (D16 Overview)", build
  file `d16-overview.build.mjs`. It also reopens **D1**, whose route moves to
  `/carousel-generator/types`; D1's boards are otherwise unchanged, so its
  canvas is only re-saved if a board shows the old route.
- **Saving a ticket.** Steps 3–6 below read and save **that ticket's own
  canvas**. Step 4 runs `place-ticket.mjs --ticket DN` without `--theme` for a
  canvas that holds both themes, and with `--theme dark` or `--theme light`
  for D6 and D10. Step 5's `--title` is the canvas's name in the table, and
  step 6's `favicon` is the one beside it.
- **A new ticket makes its own canvas**: name it "Carousel Generator Designs -
  (DN <what it is>)", give it a favicon, publish it without `url`, and add a
  row here. If both themes pass about 14 MB together, split it by theme the
  way D6 and D10 are, "Dark (DN …)" and "Light (DN …)".
- **Redrawing one theme on a two-theme canvas** (dark first, light after
  approval): place without `--theme`, then put the other theme's artboards,
  files and note back from the extracted live canvas, because
  `place-ticket.mjs` drops every page the ticket owns.
- **The old shared canvases are gone** (Garreth, 2026-09-21). They had been
  an untouched archive since 2026-09-18 and kept turning up in the gallery
  looking like current work, so **Dark (D1 to D5)**, **Light (D1 to D5)** and
  **(D7 and D8)** were deleted, along with two older strays from 2026-09-14:
  the separate **D2 Generate Form** canvas (`815e3cc0-…`, six boards, all of
  them on D2's own canvas now) and a drawn **Carousel Generator Flows** page
  (F1 to F14 as diagrams, drawn before the flows were revised). Every board
  had been copied to its ticket's own canvas unchanged, and each build file
  can redraw its boards from scratch, so nothing was lost that the repo does
  not hold. "(D9 and D10)" was never among them: its link became D10's dark
  canvas. **The table above is now the whole set** — if a page is not in it,
  it is not a Carousel Generator canvas.
- **Reading a canvas without filling the session.** The Artifact tool's plain
  read prints the page's long head into the conversation; reading it with
  `path: "index.html"` saves the same file and prints nothing. Use the plain
  read only for the canvas about to be saved over, which the tool asks for.
- **Packing and looking.**
  The `/design` skill that shipped `seed-canvas.mjs` was not on the machine
  on 2026-09-17; the canvas is one page whose whole content sits in a JSON
  block (`<script type="application/json" id="appifact-doc">`, with `title`
  and `content.files`: artboards and `canvas.json` as text, images as plain
  base64), so `carousel-generator/canvas-pack.mjs` (added 2026-09-17) does
  steps 3 and 5 instead: `--extract <saved page> --to <dir>`, then
  `--pack --template <saved page> --from <merged dir> --out <file> --title
  "..."`, then `--check <file>`. **`--check` also catches two boards laid on
  top of each other** on the same page (added 2026-09-22, after Garreth found
  D13's phone board sitting inside its desktop one): a phone board placed after
  a desktop board steps a whole **1540**, not the 470 that separates two phone
  boards. Read what `--check` prints; it exits non-zero on a problem. The saved page comes from the Artifact tool's
  read of the canvas link (it names the file it saved). And a board can be
  looked at before saving: `carousel-generator/render-board.mjs <board.dc.html>
  <out.html>` fills the board's template without the canvas runtime, and
  headless Chrome (`--headless=new --screenshot=... --window-size=1440,900`,
  run against the file inside the build folder so its images resolve) gives a
  picture of it. D10's second round was checked that way.
- **D11** is built by `d11-studio-round-two.build.mjs`, which draws its
  pictures from D6's Studio: round two was brought into `d6-studio.build.mjs`
  on 2026-09-15, so that file holds the whole screen and D11's keeps only its
  own review moments and image names.
- **The prototype** is the click-through of every approved screen (a desktop
  artboard and a phone artboard; holds D1 to D10, with D11, D12 and D13 riding
  in on the screens they extend — version 27, 2026-09-22; the older
  `claude.ai/code/artifact/94d569f8-…` form opens the same artifact). Its
  Studio is D6's own build with round two included, and a type's slide size
  travels from Carousel types through Generate, the batch and review to D5,
  so Quiet Luxury Picks renders at 9:16. It is built only from `main`, by one
  session, after a ticket is approved. Ticket sessions never save it.

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
  doc, and on each canvas the page whose id starts `dN-` and the artboards
  named `DN-*.dc.html`. Touch nothing else.
- **Never rebuild a whole canvas.** Your branch only holds your own ticket,
  so a full rebuild would wipe every other ticket's pages. Load the saved
  canvas and swap in your own page (steps 3–6 below), once per theme.
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
3. **Load the saved canvas** for the theme you are placing (dark first;
   light once dark is approved). Read it with the Artifact tool
   (`action: "read"`, the Dark or Light link above); the result names a saved
   file. Unpack it into a fresh, empty folder:
   `node <design>/seed-canvas.mjs --extract <saved file> --to <scratch>/live`
4. **Swap in this ticket's page:**
   `node docs/designs/carousel-generator/place-ticket.mjs --ticket DN --theme dark --from <scratch>/dN --canvas <scratch>/live --out <scratch>/merged`
   (`--theme light` for the Light canvas). It replaces only this ticket's
   page for that theme and prints the `--artboard` and `--image` list for
   the next step. Images a ticket uses live in `carousel-generator/assets/`,
   named `dN-<name>`, and are downsampled to a few tens of KB.
5. **Package and check it**, from inside `<scratch>/merged`. Dark:
   `node <design>/seed-canvas.mjs --template <design>/payload.template.html --out ../carousel-generator-designs.html --title "Carousel Generator Designs - Dark (D1 to D5)" <that list> --canvas canvas.json`;
   light: the same with `--out ../carousel-generator-designs-light.html --title "Carousel Generator Designs - Light (D1 to D5)"`.
   Then `node <design>/seed-canvas.mjs --check <that file>`. The warning that
   there is no `Main.dc.html` is expected. Since 2026-09-18 every ticket has
   its own canvas, so `--out` and `--title` are that canvas's own (the table
   above); the "(D1 to D5)" names in this step are the old shared canvases.
6. **Save it** with the Artifact tool: publish that file with `url` set to
   that theme's link, `contract: "0.1.31"`, the canvas's own `favicon`
   (the table above), and no `capabilities` (a brand-new canvas is the one
   exception: publish it with `capabilities: {"downloads": {}, "self": {}}`,
   which is what the editor's Save needs). If the save is refused
   because someone else saved in the meantime, go back to step 3 and redo
   steps 3–6. Never force it.
7. **Look at it** on the saved canvas, open to your ticket's page, before
   handing over. Light mode, once designed, repeats steps 3–7 against the
   Light canvas.
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
   screen, on desktop and phone. **And check the rest of the prototype, not
   only the new screen.** Every screen's values and styles share the one
   page, so a new screen can break an old one without any review board
   showing it (2026-09-19: Trends round three took History's filter row,
   the Generate form's card style boxed Trends' posts, and Trends' rail
   stopped the phone's menu opening on every screen). Open every menu item;
   open the phone's menu and the desktop's Collapse sidebar; put the new
   screen beside its approved board. Name a screen's values after its
   ticket (`t10…`, `h9…`) and scope its styles under `.screen-<id>`. The
   build stops by itself if a screen hands over a name the shell uses.

## Status

Each ticket's Status line in `docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md` is
the record of where it stands. There is no summary table here: parallel
branches would all edit the same lines of it and collide when merged.
