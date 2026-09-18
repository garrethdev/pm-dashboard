# Carousel Generator — design tickets

**Status:** design step, 2026-09-14. Nothing here is built from these tickets.

**Where it stands (Garreth, 2026-09-16):** **every design ticket is done.**
D1 to D10 are approved, and D11, the Studio's second round, is approved and
carried into D6. D10, Trends, was the last, approved on 2026-09-16 on the
canvas D9 made. The design step is closed; what follows is development,
against `CAROUSEL-GENERATOR-DEV-TICKETS.md`.
**Reopened since (Garreth, 2026-09-17): D10, Trends, is back open for a second
round — the feed and the search — redesigned in place on its own build file
and its own two canvas pages. There is no D12. Everything else stays closed,
and the dev tickets are being written in parallel with that design.**
The canvas D7 and D8 share is full — 14 MB of its 16 MB with both tickets on
it in both themes — so it was **renamed from "(D7 to D10)" to "(D7 and D8)" on
2026-09-16** (Garreth), because it is never going to hold the other two. D9
made the new canvas the two of them shared, **(D9 and D10)**, until
**2026-09-18**, when D10's third round filled it and Garreth had them
separated: **(D9 History)** is a new canvas and **(D10 Trends)** keeps the
old link. The how-to lists both.
Each ticket is a set of screens to design in the **Peptide Miracles Dashboard**
project in Claude Design. The app is not changed during this step.

**One canvas a ticket since 2026-09-18** (Garreth): every ticket has its own
review canvas holding both of its themes, except D6 and D10, whose two themes
do not fit under one canvas's 16 MB and so have a canvas a theme. **The Status
lines below were written before that and still name the shared canvases each
ticket was reviewed on** — "Dark (D1 to D5)", "Light (D1 to D5)", "(D7 and
D8)", "(D9 and D10)". Those three old shared canvases were left exactly as
they were, as an archive, and are no longer saved to; the boards were copied
off them unchanged. The `docs/designs/README.md` how-to has the steps.

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

Companion documents: `CAROUSEL-GENERATOR-FLOWS.md` (what each screen does,
step by step; the flow numbers F1 to F16 below point there) and
`CAROUSEL-GENERATOR-PLAN.md` (why).

## How the tickets are ordered

By the path a person takes through the tool, not by the build phase
(Garreth, 2026-09-14):

1. The screen you land on after **Generate → Carousel**.
2. The main job from there: making a batch, from pressing Generate to
   finished carousels.
3. The landing screen's second job: creating a new carousel type.
4. The rest of the menu, most-visited first.

Every ticket designs the finished experience with the **full menu** showing,
whatever phase the screen is built in.

## Rules for every ticket

- **Placeholder data only** (Garreth, 2026-09-14). This is the design step,
  so screens use made-up content, not the dashboard's live data. See
  *Placeholder data* below.
- **Dark first**, at desktop (1440 wide) and phone (390 wide). Light mode is
  designed once the dark version of that ticket is approved.
- **Existing components.** Build from what the Claude Design project already
  holds: buttons, the hold button, pills, cards, dropdowns, empty and working
  states. Add something new only when a screen truly needs it, and say so.
- **One accent button per screen.** Everything else is secondary. Deleting or
  undoing is a hold button with no warning text above it.
- **No instruction text on screens.** Formats go in placeholders, cautions in
  the hold, explanations in the changelog.
- **Numbers use tabular figures.** Counts, views, slide numbers.
- **Review after D1** before starting D2, because D1 decides the layout every
  other screen sits in. After that, review each ticket as it is finished.

## Placeholder data

Use content that is obviously sample, but realistic enough to judge the
layout:

| Thing | Use | Not |
|---|---|---|
| Carousel types | Invented names such as "Morning Routine", "Before & After", "Myth vs Fact", "Day in the Life" | Real lane names (Glow Up, Covered Eye) |
| Characters | "Character 2", "Character 3", "Character 4" (Garreth, 2026-09-14) | Account handles |
| Numbers | Plausible made-up values: 14 posts left, 6 days of cover, 24.3k median views, "7 of 20 written" | Live figures from the database |
| Slide copy and captions | Short invented hooks and lines of realistic length, including one long line to test wrapping | Copy from real posts |
| Images | Neutral placeholder photos or tinted blocks. Image library covers (Garreth, 2026-09-14) and the rendered slides on D5 (Garreth, 2026-09-15) use photos from the Supabase image store, downsampled | Real account renders anywhere |
| Music | "Artist Name – Song Title" | Real tracks from the music library |
| People | "Alex", "Sam" for "who ran it" and reviewers | Real team emails |
| Dates | Relative and plausible: "2 days ago", "Sep 12" | |

Long names, zero counts and very large numbers belong in the designs too, so
the edges are tested, not just the happy middle.

---

## D1. Carousel types — the landing screen

- **Status:** **Done** (Garreth, 2026-09-15: D1 to D7 closed; the next ticket is D8). dark mode **done**, approved by Garreth on 2026-09-14, desktop,
  phone and first run. On the Carousel Generator Designs canvas
  (https://claude.ai/code/artifact/d2004744-5f98-4bfa-bddf-71b0d8edcca8),
  pages **D1 · Dark** and **D1 · Light**, built by
  `docs/designs/carousel-generator/d1-carousel-types.build.mjs`.
  **Light mode: designed 2026-09-14, awaiting review** (the D1 · Light page;
  the menu's theme switch also flips any screen). The menu's back button uses
  the outline "<" (the app's ChevronLeft), like every back button in the
  generator (Garreth, 2026-09-14).
  **Reopened during D7's review** (Garreth, 2026-09-15), both pages re-saved:
  a type not wired yet has Generate beside its Not wired pill, so its first
  batch can be made and judged before wiring.
- **You get here from:** the dashboard's Generate page, Carousel card.
- **Flows:** F1 steps 1–2; entry point for F8.
- **Design:**
  - The generator's own left menu with every item: **← Dashboard**,
    Carousel types (active), History, Image libraries, Studio, Trends.
  - **New carousel type** (secondary), opening the Studio.
  - Card layout (Garreth, 2026-09-14): the name; below it, neutral pills for
    the character and the template's slide count; a **View details** row with
    an arrow on the right, set between thin grey lines, that opens posts left,
    days of cover and median views; then **Generate** on the
    right with the last batch date opposite it, or the status in the date's
    place when the type has one.
  - Every Generate button is the same accent button, at the secondary
    button's size.
- **States:**
  - A type with a batch already running: its button becomes **Open running
    batch**.
  - A type that is not wired yet: "Not wired" pill and Generate (Garreth,
    2026-09-15, replacing "no Generate button"): its approved decks wait for
    Wire on the type's page (D5, D7).
  - Retired types folded into a collapsed group.
  - First run: no carousel types at all.
  - Phone: the menu as a slide-out drawer, cards in one column.
- **Done when:** the layout, card and menu are approved in dark mode at both
  sizes.

## D2. Generate form

- **Status:** **Done** (Garreth, 2026-09-15: D1 to D7 closed; the next ticket is D8). dark mode **approved by Garreth on 2026-09-14**: desktop,
  phone, the library picker at both sizes, the
  empty-sets state and the no-library state. On the Carousel Generator
  Designs canvas
  (https://claude.ai/code/artifact/d2004744-5f98-4bfa-bddf-71b0d8edcca8),
  pages **D2 · Dark** and **D2 · Light**, built by
  `docs/designs/carousel-generator/d2-generate-form.build.mjs`.
  **Added beyond the ticket, approved with it and now in F1 and DEV-15**: on
  the phone, Generate sits in a bottom bar with the reason
  it is unavailable beside it; changing the library offers **Undo**.
  **First review** (Garreth, 2026-09-14): the form fills the page width; the
  character and slide pills sit opposite the type name; library covers are
  placeholder photos; the desktop picker hangs just under **Change**; the
  phone picker is a centred modal; the picker no longer warns about empty
  sets; the note field is the same full-width box as the fixed opening
  line; both back buttons (the menu's and "Carousel types") use the outline
  "<".
  **Light mode: designed 2026-09-14 at Garreth's request, awaiting review**,
  all six screens on the D2 · Light page. **Datestamp removed** from the form
  after approval (Garreth, 2026-09-14).
  **Reopened during D7's review** (Garreth, 2026-09-15), both pages re-saved:
  when the library has no images in a set the template needs, **Generate
  with AI** under the sets opens that library's Generate images form (D8)
  for those sets. What comes back joins the library only on Keep, and the
  form is then ready to generate.
- **You get here from:** Generate on a card in D1.
- **Flows:** F1 step 3.
- **Design:**
  - **How many** (pre-filled, capped at 50).
  - **Image library**: the type's library with **Change**, and the library
    picker it opens.
  - **Direction** shown read-only with its version number and a link to edit.
  - **Note** (one line).
  - Per-type choices from the template, shown with one sample type's
    opening-line choice (Fixed or Written). No datestamp field (Garreth,
    2026-09-14).
  - **Generate** as the accent.
- **States:**
  - No library chosen: Generate unavailable until one is picked.
  - The chosen library has no images in a set the template needs:
    Generate unavailable, the empty sets named.
  - Count typed above 50: the field stops at 50.
- **Renamed to sets** (Garreth, 2026-09-16): what this form called groups is
  what D8 calls sets, and both now say sets. The screens themselves never
  showed the word, so only the code, the comments and one board title
  changed; both D2 pages were re-saved on 2026-09-16.
- **Done when:** approved in dark at both sizes.

## D3. Batch — while writing

- **Status:** **Done** (Garreth, 2026-09-15: D1 to D7 closed; the next ticket is D8). **done.** Approved by Garreth on 2026-09-14; light mode
  designed and D3 added to the Carousel Generator Prototype
  (https://claude.ai/code/artifact/94d569f8-fd94-4ce0-9298-f9d0f0f5f175)
  the same day. Pictures, one screen per state, in both themes: writing (desktop, phone, phone
  scrolled to where written meets unwritten), regenerating a deck while the
  batch writes (desktop and phone), stalled, one deck failed, and stopped then
  reopened (desktop and phone).
  **First review** (Garreth, 2026-09-14): any written deck can be regenerated
  with feedback while the rest of the batch keeps writing (Regenerate on the
  card opens a feedback box in place; the deck then waits as **Up next**, ahead
  of unwritten decks, with its note shown); nothing is approved while a batch
  writes, so the stopped batch shows Written, not Approved.
  **Flagged decks** (Garreth, 2026-09-14): never rendered. The top bar's bell
  gets an item ("Deck 6 flagged", the type and the reason); clicking it opens
  the batch at that deck, which carries a subtle red outline and its reason in
  a red pill. Four more pictures: the bell open and the batch opened from it,
  desktop and phone.
  **Second review** (Garreth, 2026-09-14): Regenerate, Retry and the feedback
  box's Regenerate are the Secondary button's shape with an outline and no
  fill; the hook and slides sit in a fixed-height box that scrolls, and the
  caption holds two lines, so the caption rule and footer line up across every
  card. D3 is copy only: rendered slide images first appear in D5. On the Carousel Generator Designs canvas
  (https://claude.ai/code/artifact/d2004744-5f98-4bfa-bddf-71b0d8edcca8),
  pages **D3 · Dark** and **D3 · Light**, built by
  `docs/designs/carousel-generator/d3-batch-writing.build.mjs`.
  **Reopened during D4's review** (Garreth, 2026-09-14), both pages re-saved:
  Regenerate is a full-width button pinned to the bottom of every card whatever its
  state (a still skeleton until the deck has copy, Retry there on a failed
  deck), the title no longer shows the character and slide-count pills, and a
  deck sent back with feedback says **Rewriting**, not Writing, once its turn
  comes (the Regenerate pictures show one Rewriting and one Up next).
  **Approved again with D4** (Garreth, 2026-09-15) and the Prototype rebuilt:
  once every deck is written, the batch moves on to D4's review.
  **Confirmed in review:** the deck card here is the card D4 will
  add review actions to (deck number, state pill, hook, slides 2–7, caption,
  music), so a card keeps its shape from empty to reviewable; the progress
  line sticks under the top bar; a waiting deck is a still skeleton and only
  the deck being written pulses; on the phone, a stopped batch's Continue sits
  in a bottom bar, like Generate on D2.
  **Decided (Garreth, 2026-09-14):** no way to stop a batch while it is
  writing; once the batch is finished, the person regenerates the whole batch,
  one carousel in it, or one slide of a carousel, with feedback for the AI
  (to design in D4). The page
  does not show which batch it is (date, who ran it) for now.
- **You get here from:** pressing Generate in D2.
- **Flows:** F1 steps 4–5, F4.
- **Design:**
  - A grid of empty deck cards, one per requested deck, filling in as each
    deck's copy arrives.
  - The progress line: "7 of 20 written".
  - The Content Risk Gate runs on each deck as its copy lands (Garreth,
    2026-09-15); a rejection is the Flagged pill's reason, and its suggested
    fix is pre-filled in the Regenerate box. No new screen: the flag already
    designed carries it.
- **States:**
  - Stalled: the progress line turns amber and names the stuck deck and when
    it last moved.
  - One deck's writing failed: error and **Retry** on that card, the rest
    carry on.
  - A batch that stopped part-way, reopened: work so far shown, **Continue**
    where the progress line was.
- **Done when:** approved in dark at both sizes.

## D4. Batch — finished writing, review (includes the deck card)

- **Status:** **Done** (Garreth, 2026-09-15: D1 to D7 closed; the next ticket is D8). **done.** Dark mode approved by Garreth on 2026-09-15; light
  mode designed the same day and D4 added to the Carousel Generator Prototype
  (https://claude.ai/code/artifact/94d569f8-fd94-4ce0-9298-f9d0f0f5f175),
  where D3 hands over to it once every deck is written. Pictures,
  one screen per state, on the Carousel Generator Designs canvas
  (https://claude.ai/code/artifact/d2004744-5f98-4bfa-bddf-71b0d8edcca8),
  pages **D4 · Dark** and **D4 · Light**, built by
  `docs/designs/carousel-generator/d4-batch-review.build.mjs`: every card
  state on one desktop board, keyed by a note beside it; review (desktop and
  phone); regenerate one slide, swiping between versions, track not found,
  track search, Discard deck being held (phone); Regenerate batch (desktop
  and phone); someone else running the batch (desktop and phone).
  **Proposed in this design, for review:**
  - The card keeps D3's shape (D3's styles are imported, not copied).
    **Second review** (Garreth, 2026-09-14): Regenerate is the full-width
    button at the bottom of every card, in D3 too; track actions sit opposite
    the song and drop under it when they do not fit; More sits at the end of
    the pills; **third review:** **Retry music lookup** is the only track
    button, split with a caret on its right that opens **Change track**;
    a deck or slide being rewritten says **Rewriting**; no New track pill; no
    character or slide-count pills in the title.
  - Regenerate opens D3's feedback box with a picker: **Deck**, **Hook**, 2–7.
    On the desktop, a small button at the end of any slide row opens the box
    on that slide. A whole deck waits as Up next, as in D3; one slide rewrites
    in place while the rest of the deck stays readable.
  - Versions (Garreth, 2026-09-14): a deck with more than one version carries
    a grey pill, **Version 2 of 2**. On the desktop, pointing at the card shows
    round arrows on its left and right edges, with no arrow past the first or
    newest version; on the phone the copy swipes sideways. **Proposed with
    it:** the version showing is the version that counts, so there is no
    separate "Use this version".
  - **Discard deck** is the hold button inside a **More** (…) menu, so twenty
    cards do not each carry a red button. The More icon (Phosphor DotsThree)
    is new; icons.tsx has no overflow icon yet.
  - **Change track** (Garreth, 2026-09-14) is a search of the music library:
    suggestions narrow as the person types, the typed part in bold, and the
    last option looks the typed name up as a new track. Either way it is a new
    version with only the music different. It is also the way out when Retry
    music lookup keeps failing.
  - **Render 16 decks** names its count and leaves out flagged decks and tracks
    still being checked. "3 flagged" in the progress line jumps from one
    flagged deck to the next.
  - Keyboard: J and K move focus between cards (the kit's focus ring), R opens
    the focused card's feedback box; no motion on either.
  - Someone else running it: no actions anywhere, "Sam is reviewing this
    batch, last moved 4 min ago" in the progress line.
  - Phone: the counts and Render sit in a bottom bar, Regenerate batch under
    the title.
- **Reshaped by Garreth, 2026-09-14, during D3's review:** there is no
  approval step. A written deck counts as accepted unless someone regenerates
  or discards it; gatekeeping outside the app is still the check before
  posting. This replaces Approve, Approve all unflagged, the 5-second undo and
  Withdraw approval. The flows (F2, F3, F14) are updated to match once D3 is
  approved.
- **You get here from:** D3, once every deck is written.
- **Flows:** F2, F14 (to be rewritten as above).
- **Design the deck card first**, since the page is mostly a grid of them. It
  is D3's card:
  - Hook large, every slide's copy as a numbered list, caption, music, state
    pill.
  - Card states: **Written**; **Flagged** with its reason ("Score 5.2",
    "Compliance: brand name", "Track not found on TikTok") and a subtle red
    outline; **Track not found** with Retry and Change track; **New track**
    note; **Music lookup failed**.
  - **Regenerate** the deck, or **one slide** of it, each with feedback for
    the AI, and the version switcher.
  - **Discard deck**, a hold button.
- **Then the page:**
  - **Regenerate the whole batch**, with feedback.
  - **Render** as the accent: renders every written deck that is not flagged.
  - Flagged decks are never rendered. Each one sends a notification to the
    top bar's bell; clicking it opens the batch at that deck, with its red
    outline.
  - Keyboard focus moving between cards (R regenerate, J/K next and
    previous).
  - Someone else already running the batch: read-only, with who and when it
    last moved.
- **Done when:** the card in every state and the page are approved in dark at
  both sizes.

## D5. Batch — render and finish

- **Status:** **Done** (Garreth, 2026-09-15: D1 to D7 closed; the next ticket is D8). dark mode **designed 2026-09-15 and reviewed with Garreth
  the same day** (real photos on the slides, the Grid / Rows switch, the
  uncut flag rings, and the Approve / Regenerate finish all came from that
  review); **light mode designed and D5 added to the Carousel Generator
  Prototype** (https://claude.ai/code/artifact/94d569f8-fd94-4ce0-9298-f9d0f0f5f175)
  on 2026-09-15, where D4's Render hands over the batch with its flagged and
  discarded decks. Pictures, one screen per state, on the Carousel Generator
  Designs canvas (https://claude.ai/code/artifact/d2004744-5f98-4bfa-bddf-71b0d8edcca8),
  page **D5 · Dark**, and the same on the Light canvas
  (https://claude.ai/artifact/APt4THd8a3QoPmPskPJCT4), page **D5 · Light**,
  built by `docs/designs/carousel-generator/d5-batch-render.build.mjs`: every card
  state on one desktop board, keyed by a note beside it; rendering (desktop,
  phone, phone scrolled to the deck being rendered); the full-size preview
  (desktop on a clean slide and on a flagged one; phone on a flagged slide
  and on a slide not rendered yet); rendering elsewhere and one deck failed
  (desktop and phone); finished (desktop and phone); after Approve
  (desktop); the Rows view (desktop and phone).
  **Added by Garreth, 2026-09-15:** a view switch opposite the title, Grid
  or Rows. Grid is the card grid. Rows puts one deck per row: the deck's
  number and pills, caption, music, feedback box and Regenerate in a column
  on the left (28% of the width, never under 240px), and the slides larger
  on the right in a strip that scrolls sideways when the type has more
  slides than fit, a fade on its right edge as the cue. On the phone the row
  stacks, the left block above the strip. The view chosen stays while the
  batch is open.
  **Proposed in this design, for review:**
  - The card is D4's card (D4's styles imported, not copied). Once a deck
    starts rendering, its copy box becomes a grid of slide slots at the
    slide's 3:4 shape, one per slide, empty until that slide lands. The copy
    is on the slides themselves and in the preview, so the card keeps its
    height; caption and music stay under the grid.
  - Rendered slides are bank photos from the Supabase image store with the
    deck's own copy over them (Garreth, 2026-09-15: real images, not tinted
    blocks), never real renders. Twelve photos, cropped to 3:4 and kept
    small, in `carousel-generator/assets/d5-slide-*.jpg`.
  - The check's hit is a red outline on that thumbnail; the card takes D3's
    flagged outline and a red pill names it ("Slide 4: cut-off text"). Decks
    flagged in the review keep their copy and outline and are skipped. Both
    kinds count in "flagged" (which jumps between them) and ring the bell.
  - Regenerate stays the full-width button at the bottom of every card (D4's
    rule), unavailable while the deck is queued or rendering. It opens D4's
    feedback box with the flagged slide already picked; a deck sent back says
    Rewriting with its slots emptied, and renders again after.
  - Failed: "Failed on slide 5" in the pill, that slot outlined with a
    warning, Retry at the bottom; the rest of the batch carries on.
  - The preview is a centred lightbox over the whole app: "Deck 2" and
    "3 of 7" above the slide, round arrows either side on the desktop (the
    arrow keys too), a swipe on the phone, the check's reason in a red pill
    under a flagged slide, an empty numbered shape for a slide not rendered
    yet. Escape or the X closes it.
  - The progress line reads "4 of 12 rendered" over D3's track, 12 being the
    decks D4 sent. **Finished (Garreth, 2026-09-15, replacing the Inventory
    link):** the line counts rendered and flagged decks, and two actions
    appear: **Approve (n) decks**, the accent, for every rendered deck the
    checks passed; **Regenerate (n) decks**, secondary, for the flagged ones.
    Approve works while flagged decks remain. Approved decks show a green
    Approved pill and lose their Regenerate button; the line then says "10
    approved". (Named Approve by Garreth, 2026-09-15; "Release" read as
    discarding.)
    On the phone the count and track stay under the top bar as on D3,
    Approve sits in the bottom bar and Regenerate (n) under the title; while
    it renders there is no bar, since there is nothing to press (no stop, as
    decided for D3). Pictures: finished (desktop and phone) and approved
    (desktop).
  - Not wired yet: D4's Render passes only a count, so which decks were
    flagged reaches D5 only once D5 joins the prototype on `main`.
  - **Reopened during D7's review** (Garreth, 2026-09-15), both pages
    re-saved: on a type not wired yet, Approve holds the decks for wiring
    (there is no table to post from yet). The progress line says "10
    approved, waiting for wiring", and Wire on the type's page (D7) writes
    them in. New picture: after Approve on a type not wired yet (desktop).
  - **Refit (round two), 2026-09-15, approved by Garreth on 2026-09-15 after
    three review rounds; D5 · Light re-placed on the Light (D1 to D5) canvas
    the same day:**
    the slide slots on the card, the Rows strip and the full-size preview
    stop drawing 3:4 and take the type's slide size from D11. The Before &
    After batch is 4:5 (four slots across); Quiet Luxury Picks, D11's 9:16
    type, is 9:16 (five slots across, so two rows still fit the card, and a
    narrower preview so the tall slide fits the screen). After Approve on a
    type not wired yet now shows Quiet Luxury Picks at 9:16, and two new
    pictures show its full-size preview (desktop and phone). Page **D5 ·
    Dark** re-saved on the Dark (D1 to D5) canvas and **D5 · Light** on the
    Light (D1 to D5) canvas, from the same build. The imported Glow Up template
    (`docs/carousel-templates/glowup.v1.json`, 1080×1440) is not refitted
    here: that is a template change, not a design.
    First review (Garreth, 2026-09-15): 9:16 deck cards made taller so their second row stays inside the card.
    Second review (Garreth, 2026-09-15): 9:16 cards grow with their slides, so the second row clears the divider above the caption.
    Third review (Garreth, 2026-09-15): the 9:16 cards approved; phone deck cards hug their slides, so two-row 4:5 cards lose the empty space at the bottom.
- **You get here from:** Render in D4.
- **Flows:** F3.
- **Design:**
  - Slide thumbnails filling in on each written, unflagged card as they land.
    Flagged cards keep their red outline and are skipped (Garreth,
    2026-09-14).
  - The progress line: "4 of 12 rendered".
  - The automatic check flagging a slide (cut-off text, text too long, poor
    contrast), with an outline on that thumbnail.
  - **View switch** (Garreth, 2026-09-15): Grid or Rows, opposite the
    title. Rows shows one deck per row, caption, music and Regenerate on the
    left at about a quarter of the width, the slides larger on the right and
    scrolling sideways when they do not fit.
  - **Full-size preview** (Garreth, 2026-09-14): pressing a thumbnail opens
    the rendered deck at real slide shape, one slide at a time, on the slide
    that was pressed. Next and previous (arrow keys; swipe on the phone), the
    slide number ("3 of 7"), the check's reason on a flagged slide, and close
    back to the card. A slide not rendered yet shows its empty shape.
- **States:**
  - **Rendering elsewhere** on a card.
  - **Failed** with the slide number and **Retry**.
  - Finished (Garreth, 2026-09-15): **Approve (n) decks** as the accent and
    **Regenerate (n) decks** for the flagged ones; Approve works while
    flagged decks remain. Approved decks say Approved.
  - Phone: batch actions in a bottom bar.
- **Done when:** approved in dark at both sizes.

## D6. Studio — create a new carousel type

- **Round three, approved by Garreth on 2026-09-17: slides can be added,
  duplicated, deleted and moved.** Garreth asked whether D6 or D11 had any
  way to add a slide; neither did. The slide count was set only by the AI's
  draft, and the tool strip added a text box or an image cell to a slide,
  never a slide. Designed in place in `d6-studio.build.mjs` and placed on
  both D6 canvases the same day (pages D6 · Dark and D6 · Light, seven new
  boards a theme, 36 in all). What it does:
  - **A dashed Add slide slot** the size of a slide sits after the last one,
    on the canvas, at the type's size. Pressing it adds a slide at the end.
  - **A plus in the gap** between two slides appears on hover, to insert one
    there. The phone has no hover, so it has the slot and the menu only.
  - **Each slide's caption carries a menu** (three dots, shown on hover and
    on the selected slide): Duplicate, Move left, Move right and Delete. It
    is a solid surface like the versions list. Move left is unavailable on
    the first slide and Move right on the last.
  - **A new slide takes the layout of the slide before it**, and the AI
    writes its line to match: the boxes pulse, the top strip says "Writing
    slide 4" and the conversation says what it is doing, then the line
    lands and the AI says what it did. A **duplicate** keeps the text too.
    Regenerate sample rewrites the whole deck as before.
  - **A carousel keeps at least two slides**: at two, Delete is unavailable
    with "Keep at least two slides" under it. Delete is a plain action, not
    a hold, because the Studio has undo (DEV-21); the AI's reply says Ctrl
    or Cmd+Z brings the slide back.
  - **The slide count in the top strip follows** ("Slide 4 of 7"), and each
    slide's own settings, images and Rendered mark travel with it when it
    moves.
  - **The conversation can do the same**: "Make it eight slides" adds two,
    and the canvas follows. The buttons and the chat are two doors to one
    thing, the way images already work.
  - **In edit mode a changed slide count saves a new version**, like a
    changed slide size (D11).
  - Boards: the slot after the last slide; the plus in the gap; a slide's
    menu open; a slide added after slide 3 with its line being written; the
    new slide written with the AI's reply; two slides left with Delete
    unavailable; and the phone with the slot at the end of the row and a
    slide's menu open. Both themes.
  - Not decided: the most slides a carousel may have. Instagram allows
    twenty; the design sets no cap and leaves it to DEV-21.
  - **D11's layered decks have the same controls** (the slot, the plus in the
    gap and the caption menu); D11's canvas was re-saved with them on
    2026-09-17, and Garreth approved D11's version on 2026-09-18.
- **Round two:** D11 (slide sizes, layered templates, starting from a Figma
  link), added 2026-09-15 during D7's review and approved in dark the same
  day. The prototype's Studio is already D11's (2026-09-15). **Still to
  bring into D6's own build and canvas** (`d6-studio.build.mjs`, pages
  D6 · Dark and D6 · Light), as decided by Garreth across D11's reviews:
  - **Slide size** first in the adjustments: 4:5 (1080×1350) or 9:16
    (1080×1920), each option drawn to scale with its pixels. 3:4 goes, so
    the slides, the reference deck's slides on the canvas and the library's
    image tiles take the type's size.
  - **The canvas pans in every direction and zooms**, not only sideways:
    drag the dotted ground or scroll to pan; Ctrl or Cmd with the wheel, or
    a pinch, zooms around the pointer from 25% to 200%; the tool strip ends
    with Zoom out, the zoom level (press it to fit every slide) and Zoom in;
    the dotted ground moves and scales with the slides. The phone keeps its
    sideways scroll.
  - **A third start card, Start from a Figma link.** The link attaches to
    the chat box as a chip above the prompt (file name, frame count, a
    remove button; No access in red holds Send), and both are sent
    together. The conversation then keeps a small chip for the file above
    its chat box, and the file's frames sit in the dashed reference frame
    while the AI reads them.
  - **The chat box grows with the prompt**, up to eight lines before it
    scrolls; Shift+Enter starts a new line, Enter sends.
  - **Layered templates:** the Layers list (front first, each marked AI, Set
    or Fixed, with Bring forward and Send back), cut-outs placed freely,
    text on a box, shaped frames with a border, fixed images, labels filled
    from the row the deck is about, the library shown as sets, and the AI
    proposing the sets a template lacks, whichever way the Studio started.
    **The boards say "Set" where they should say the row** — see the note at
    the end of D11.
  - **The phone:** D11 has no phone boards, so the size choice, the Figma
    chip and the Layers list in the phone's sheets are designed in this
    pass.
  Outside D6, in the same pass: D5's thumbnails and full-size preview take
  the type's size, the imported Glow Up template is refitted to 4:5, and
  `CAROUSEL-TEMPLATE-MODEL.md` and flows F8 to F10 gain sizes and layers.
  **Brought into D6 and approved by Garreth, 2026-09-15; light mode placed
  the same day** on the Light (D6 Studio) canvas, both D6 canvases now
  12.2 MB. D11's canvas was re-saved so its library tiles take 4:5 too, and
  `CAROUSEL-TEMPLATE-MODEL.md` §7 and flows F8 to F10 gained sizes and
  layers. What was done:
  round two now lives in `d6-studio.build.mjs` (D11's build draws its
  pictures from it; they come out the same apart from the tile shapes), and
  D6 · Dark was re-placed. Every Studio board takes 4:5: the slides, the
  reference's slides, the saved decks' covers and the library's tiles. The
  first screen has the third card, the adjustments open with Slide size, the
  chat box grows with the prompt and the tool strip ends with the zoom
  controls. Two new phone boards: the Figma file's chip in the conversation
  sheet, and the Layers list in the adjustments sheet; the adjustments sheet
  board now opens on Slide size. The phone keeps its sideways scroll, with
  no zoom. The layered desktop screens stay on D11's canvas.
- **Status:** **Round three approved** (Garreth, 2026-09-17: the slide controls, on both D6 canvases and carried to D11's). Merged to `main` and **in the prototype since 2026-09-18** (version 19, rebuilt whole from `main`): on a ready draft the Add slide slot, the plus in the gap, and each slide's Duplicate, Move left, Move right and Delete all work, the new slide is written before it lands, the count in the top strip follows, Delete goes unavailable at two slides, and a deck handed over from Trends takes the same controls; checked on desktop and phone by driving the boards locally, not on the canvas. Before that, **Done** (Garreth, 2026-09-15: D1 to D7 closed; the next ticket is D8). **approved in dark by Garreth on 2026-09-15 after seven
  review rounds the same day; light mode designed and D6 added to the
  Carousel Generator Prototype
  (https://claude.ai/code/artifact/94d569f8-fd94-4ce0-9298-f9d0f0f5f175)
  the same day**, where New carousel type on D1 and the Studio menu item
  open it, and a draft in progress survives leaving and coming back. Pictures,
  one screen per state, on D6's own canvases, **Carousel Generator Designs -
  Dark (D6 Studio)** (https://claude.ai/artifact/MtsnyvaJPznX6Kg4JaKb2p),
  page **D6 · Dark**, and **Carousel Generator Designs - Light (D6 Studio)**
  (https://claude.ai/artifact/3gbDBA71hV5agEfU4ywa8p), page **D6 · Light**
  (Garreth, 2026-09-15: D6 is heavy, so it left the shared Designs canvas,
  which is back to 10.9 MB; later that day its light mode was split onto
  a canvas of its own to make room for round two), built by
  `docs/designs/carousel-generator/d6-studio.build.mjs`: just opened, the
  two cards; the image library choice; saved reference decks; Discuss your
  idea, the chat box alone; the first draft arriving; the draft call
  failed; the slides on the canvas with the hook selected; both panels
  open; both panels folded; the adjustments folded with the conversation
  open; asking the AI for an image the library lacks; renaming the type
  from its title; an image cell selected; a set with no images; a new library
  with Upload images and Generate with AI; slide 1 rendered; the render
  failed; the Save as carousel type dialog with the short name taken;
  Discard draft being held; editing an existing type with the versions
  list open; Regenerate sample with the new copy arriving; a slide while
  it renders; from a reference deck, its slides being analysed, then the
  draft beside the reference; and three phone boards: the simplified
  view, the adjustments sheet open, and the conversation sheet open.
  **Decided by Garreth, 2026-09-15 (seventh review):**
  - **From a reference deck:** once a saved deck is picked, at least three
    of its slides appear first on the canvas inside a dark grey dashed
    frame, read-only and a little muted, with a light sweeping down each
    one while the AI analyses them (the vision pass); the conversation
    says what it is reading. When it is done, the draft's slides appear
    beside the frame, made from the library's images and copy in the
    reference's construction. The frame stays as the thing being copied
    and can never be selected or edited. A deck Trends had not analysed
    says "Not analysed in Trends" on the frame; the draft then comes from
    the vision pass alone. Feasible on the backend: Trends stores the
    slide images, and the two states are the two calls, vision then draft.
  - **Regenerate sample** shows the text boxes as pulsing bars with
    "Rewriting sample" in the top strip until the new copy lands.
  - **Back keeps an unsaved draft**, and the Studio reopens on it next
    time. Discard draft is the only way to drop one.
  **Decided by Garreth, 2026-09-15 (third review):**
  - The title sits in the exact middle of the toolbar, whatever the back
    button and the actions measure.
  - No separate rendered preview. The canvas is infinite and pannable, like
    Figma: every slide in a row at true shape on the dotted grid, which
    pans with them (drag the ground, or scroll). Render preview marks the
    selected slide **Rendered** in its caption, or **Render failed** with
    Retry.
  - The side panels are fixed, not floating, the way an editor's side bars
    are, and each folds to a thin rail of icons. Left: the adjustments for
    whatever is selected and, in the same panel, the library's images (or
    Upload images and Generate with AI for a new library). Right: the
    conversation.
  **Decided by Garreth, 2026-09-15 (fourth review):**
  - Folding and unfolding a panel uses the dashboard's own sidebar toggle
    button, the one beside the logo in the main menu. Folded, the
    conversation leaves no rail: that same button floats at the canvas's
    upper right to bring it back, with a dot when the AI answered while it
    was folded. The adjustments keep their rail (the toggle above the two
    section icons).
  - The versions list is a solid surface, not glass: as a veil, the text of
    the strips behind it showed through.
  - Every library in the Studio's panel, new or existing, carries **Upload
    images** and **Generate with AI** under its header. Both open the
    library's own flows (F7, designed in D8): Upload puts files into a
    set; Generate with AI takes a prompt, what it shows, the set, how
    many, the shape and the likeness images, and what comes back waits for
    Keep before it joins the set and appears in the panel. Nothing is
    made inside the Studio itself.
  - **Asking the AI for an image the library lacks** (Garreth's question,
    2026-09-15): the AI never makes an image on its own, since that spends
    Higgsfield credits and fills a library other types may share. It says
    what it could not find and offers the same two doors in its reply,
    Generate with AI (the form filled in from the conversation: the prompt,
    what it shows, the set, how many, the shape) and Upload images. What
    comes back waits for Keep; once kept, the AI puts the image on the slide
    it was asked about and says so.
  - The pointer, text and image tools float at the bottom centre of the
    screen and the slide count with Render preview and Regenerate sample at
    the top centre. Both are anchored to the whole sandbox, not to the
    canvas area between the panels, so a panel opening or folding never
    moves them (Garreth, 2026-09-15, fifth review).
  **Decided by Garreth, 2026-09-15 (second review):**
  - Whatever comes before the draft (the two cards, the library, the saved
    decks, the chat box) sits in the middle of the sandbox, not near the
    top.
  - The title is the type's name: press it to rename (a pencil shows on
    hover; Enter or leaving the field keeps the name, Escape drops it). The
    Save dialog's Name starts from it.
  - The adjustments (the selected item's settings, then the library's
    images) take the left where the menu was, at the sandbox's full height;
    the conversation takes the right. (Refined in the third review: fixed
    panels that fold to rails, and the filmstrip is gone since every slide
    is on the canvas.)
  - **Phone with the adjustments open:** a sheet from the bottom, opened by
    the sliders button in the bar or by selecting a box or cell on the
    slide, holding the same settings and library, scrolling.
  **Decided by Garreth, 2026-09-15 (first review):**
  - The Studio takes the whole screen: no menu and no top bar. A toolbar
    stands in their place with a back button in the menu's own back-row
    shape (to Carousel types, or to the type's page in edit mode), the
    title and its pills in the middle, and the actions on the right.
  - The backdrop below the toolbar carries a subtle dotted grid, so the
    Studio reads as a sandbox.
  - It opens on two portrait cards: **Start from a reference deck** (a
    saved deck from Trends) or **Discuss your idea**. Either leads to the
    image library: an existing one, or a new one by name. A new library
    puts **Upload images** and **Generate with AI** in the tools panel; an
    existing one puts its images there, by set, each draggable onto a
    cell of the open slide (a click puts it in the selected cell), and the
    AI picks from the same images.
  - Discuss your idea opens a chat box in the reviewed shape: a rounded box
    with a leading icon tile, a placeholder that cycles through sample
    ideas, an attach button and a square send button that shows the return
    glyph until there is text. Only the parts this Studio needs: no tabs,
    no model badge.
  - Discard draft is a plain outlined button, not red. It is still a press
    and hold; the fill that sweeps across while it is held is neutral.
  - The conversation is a floating panel at the bottom right. Folded, it is
    a round button carrying the Peptide Miracles mark, with a dot when the
    AI answered while it was folded. The same chat box sits at the panel's
    foot.
  **Kept from the first version, for review:**
  - While the draft is being written the six slides on the canvas are
    pulsing skeletons and the conversation shows "Drafting six slides".
  - A selected text box shows its role as a small tag and eight handles;
    the adjustments edit Font, Weight, Size, Stroke (colour and width),
    Shadow (Off, Hard, Soft, with offset and blur), Alignment and Wrap
    width, each change visible on the canvas at once. A selected image cell
    shows the library it draws from and its sets as a ticked list; a
    set with no images says "No images" in the list and on the cell.
  - Save as carousel type is a centred dialog: Name, Character, Short name.
    A short name already in use says "Taken" inside the field and Save
    waits. Save itself waits until a library is chosen and a draft exists.
  - Edit mode (from D7): the type's name in the title with its character
    and library pills, "Version 4" as a button that lists every version
    with its date, Active on the current one and Make active on the rest;
    Save version is the accent and Discard changes the hold. The library
    has no Change here (it is changed on the Generate form, F10).
  - The draft call failing puts the error in the conversation as the AI's
    reply, with Retry beside it.
  **Proposed, for review:**
  - The tool strip's Text box and Image cell tools add a box or a cell to
    the slide; that is not in the flows yet, so it is a proposal.
  - **Phone** (Garreth's sixth review, 2026-09-15): the slides pan
    sideways at the phone's width; the back button is its badge alone so
    the type's name and the library pill share one line; the slide count
    sits as plain text above the pill holding Render preview and
    Regenerate sample; the bar holds the sliders button, **Discard** (the
    short label) and Save as carousel type. Both panels open as sheets from
    the bottom: the adjustments from the sliders button or by selecting
    something on the slide, each section a card inset from the edges; the
    conversation from the round button carrying the mark, at the sheet's
    full height with the chat box at its foot. No dragging on a phone.
  - Not wired yet: Save opens D7, which is not designed, and a saved
    reference deck comes from Trends (D10), so the saved-decks list here is
    sample content.
- **You get here from:** New carousel type in D1, or Studio in the menu.
- **Flows:** F8, F10.
- **Design:**
  - Choosing an image library first (an existing one, or New library).
  - The empty Studio: only the conversation.
  - The AI's first draft arriving.
  - Canvas at true slide shape, filmstrip of the other slides, settings panel
    for the selected text box (font, weight, size, stroke, shadow, alignment,
    wrap width) or image cell (which library set it draws from).
  - Image cells with **No images**.
  - **Render preview** beside the canvas, and **Regenerate sample**.
  - **Save as carousel type** dialog: name, character, short name, with the
    "Taken" state.
  - **Discard draft** (hold).
  - The menu folded to icons while the Studio is open.
- **Also design:** edit mode for an existing type (opened from D7), with
  **Save version** and the list of past versions.
- **States:** the draft call failing (error in the conversation, Retry);
  Render preview failing (error in place of the preview, Retry).
- **Done when:** approved in dark at desktop. The Studio's phone layout is a
  simplified view only; agree what it shows during review.

## D7. A carousel type's own page

- **Status:** **Done** (Garreth, 2026-09-15: D1 to D7 closed; the next ticket is D8). **done.** Dark mode approved by Garreth on 2026-09-15 after
  five review rounds; light mode designed the same day and D7 added to the
  Carousel Generator Prototype
  (https://claude.ai/code/artifact/94d569f8-fd94-4ce0-9298-f9d0f0f5f175),
  where a type's name on D1 and Edit beside D2's direction open it (the
  prototype holds one sample type page, Before & After; a type not wired yet
  is seen on the D7 canvas). On a new canvas for the rest of the tickets,
  **Carousel Generator Designs - (D7 and D8)**
  (https://claude.ai/artifact/REki8sN9NFCJZ9FjXUKcAH, Garreth 2026-09-15;
  named "(D7 to D10)" until 2026-09-16),
  pages **D7 · Dark** and **D7 · Light**, built by
  `docs/designs/carousel-generator/d7-type-page.build.mjs`. Pictures, one
  screen per state; only the tabs, the direction text and Preview's dialog
  respond. Overview (desktop and phone); Direction with a suggested change
  (desktop and phone) and with the reply failed (desktop); Wiring for a type
  just saved (desktop and phone), the cadence not adding up, Wire running, a
  check failed and rolled back, the media entry missing, every item ticked,
  and Preview open (desktop); and, from the first review, Overview with a
  template version being picked (desktop). The Overview boards are taller
  than a screen so the whole page shows.
  **First review** (Garreth, 2026-09-15), all three pages re-saved:
  - The template's slides are the main thing on Overview, across the full
    width, drawn as the painter draws them. One version shows at a time,
    picked from a dropdown; Make active sits beside it when the version
    showing is not the active one (it says Active when it is). The list of
    every version is gone.
  - Posts left, days of cover, median views and weekly cap are four tiles
    under the template, the details to their right, both the same height;
    the batches below, full width.
  - The batch table is left-aligned and has no Ran by column. A whole row
    opens that batch: a finished one opens its decks (D5, rendered, with any
    flagged or failed), the running one D3, a stopped one D3 with Continue.
    A finished row with flagged decks says how many.
  - Sections side by side are the same height and fill the screen: Direction's
    editor column and conversation, Wiring's set-up card and checklist.
  **Second review** (Garreth, 2026-09-15), the page re-saved:
  - The four stat tiles are narrower and the details card wider. Each tile
    is the analytics page's stat tile (`analytics-charts.tsx`): the raised
    surface and the dotted texture fading out of its top-right corner, with
    no line graph.
  - In the template's version dropdown the version showing sits in a soft
    accent tint; there is no tick.
  - Preview on the phone, a new picture: a sheet from the bottom, like D6's
    sheets, with each block of what Wire will run scrolling inside it.
  - Answered, no change: History above the batches opens History (D9)
    filtered to this type.
  **Third review** (Garreth, 2026-09-15), the page re-saved:
  - Direction's versions use the template's dropdown: the version picked is
    the one in the editor, tinted in the list, with Make active beside it
    when it is not the active one (Active when it is). The Versions card is
    gone. New picture: Direction with a version being picked (desktop).
  **Fourth review** (Garreth, 2026-09-15), the page re-saved:
  - A type not wired yet has Generate, like any other type (D1's card and
    this page's header), so its first batch is made and judged before
    wiring. Its approved decks wait (D5); Wire writes them into the new
    table, which is a new checklist item, **Approved decks**.
  **Fifth review** (Garreth, 2026-09-15), the page re-saved:
  - A carousel type's slides are **4:5 or 9:16**, chosen when the type is
    made (designed in D11). Details names the size, and the template's slides
    on Overview take that shape.
  **Proposed in this design, for review:**
  - The title keeps D2's shape (Carousel types above the name, the character
    and slide pills beside it, "Not wired" or "Media map missing" when it
    applies); underline tabs under it, the app's own
    (`account-detail-tabs.tsx`). Generate sits opposite the title on every
    tab of a wired type; on Direction it steps back to secondary so Save
    version is that tab's one accent.
  - Overview: the pool's numbers (posts left, days of cover, median views, a
    week), the batches as a small table with Open running batch or Continue
    on the rows that need them, and beside them the template (the active
    version's slides, every version with Active or Make active, Edit
    template) and the details.
  - Direction: the suggestion shows inside the direction itself, removed
    words struck through and added words underlined; the conversation sits
    beside it with D6's messages and chat box, citing the knowledge rule it
    used and saying plainly what direction cannot change (a font size is the
    template's). Versions listed under the text. On the phone the
    conversation folds to D6's round button and Save version sits in the
    bottom bar.
  - Wiring: the cadence rebalance follows the cadence editor's rule (this
    character's types add up to its weekly number), with its running total
    pill and "3 too many" wording; Wire is unavailable until it adds up. Wire
    is the hold in its amber tone, since it changes the database but deletes
    nothing. The checklist ticks as Wire runs, names the failing check after
    a rollback, and carries the n8n media line with Copy, then Check again
    once the type is wired.
  - **Settled** (Garreth, 2026-09-15): a type not wired yet has Generate; see
    the fourth review.
- **Flows:** F6, F10, F11.
- **Design:**
  - **Overview:** the type's details, template versions, its batches, **Edit
    template**, **Generate**.
  - **Direction tab:** the direction text with version and date, **Save
    version**, past versions with **Make active**; the AI chat beside it with
    the suggested change shown against the current text.
  - **Wiring tab:** the checklist, cadence per week with the rebalance of
    sibling types and its running total, **Preview** of what will run, **Wire**
    (hold), the n8n media-entry line to copy.
- **States:**
  - A newly saved type: Not wired, arriving on the Wiring tab.
  - A failed check: rolled back, the failing item named.
  - Cadence total not matching the budget: Wire unavailable.
  - Media entry missing from the published n8n workflow.
  - All ticked.
- **Done when:** all three tabs approved in dark at both sizes.

## D8. Image libraries

- **Status:** **Done. Dark and light both approved by Garreth on 2026-09-16**,
  after three review passes. His feedback along the way made sets optional
  and shown as folders you open rather than filter pills, took the set out of
  the Generate form, added a base image you pick or upload, settled that
  nothing is read automatically, pointed the detail headings at the live
  `carousel_images` table, and redrew the library grid as Pinterest-style
  boards. Pictures, one screen per state, on the Carousel
  Generator Designs - (D7 and D8) canvas
  (https://claude.ai/artifact/REki8sN9NFCJZ9FjXUKcAH), pages **D8 · Dark** and
  **D8 · Light**, built by
  `docs/designs/carousel-generator/d8-image-libraries.build.mjs`.
  Twenty boards a theme: the grid of libraries; a library with no sets, which is
  the default; a library whose images are in sets; inside a set that
  holds sets of its own; the Generate images form; the images arriving;
  the review row waiting for Keep; one image failed with no credits left; one
  image and what was read off it, hold armed; an image with nothing read off
  it; what Tag with AI will do; AI vision reading the images; naming a new
  set; the form as D2's Generate with AI opens it; a library with nothing
  in it; a set with nothing in it; and the grid, a library, the Generate
  form and the image modal on the phone — each of them in both themes.
- **Fixed after Garreth's look, 2026-09-16:** the grid of libraries counted
  five but drew none, on desktop and phone. The list of libraries was worked
  out but never handed to the template — the header's count was, which is why
  the number showed and the cards did not. The build now checks, on every
  board, that everything the markup asks for is actually handed over, so this
  particular kind of silence cannot happen again unnoticed. (A first attempt
  blamed the card's markup — a `<button>` wrapping an `<h2>`, which is not
  legal HTML — and rebuilt it as an `<article>` with one stretched button over
  it, the way D1's type cards are built. That was worth doing but was not the
  cause.) The empty states — a library with nothing in it, a set with
  nothing in it — now stretch to the bottom of the window instead of leaving
  dead space under them, and the lone New set card no longer sits above an
  empty state.
- **The word is "sets"** (Garreth, 2026-09-16), settled after the screens had
  tried both. D2 was renamed to match on the same day, so the generator says
  sets throughout. The database still calls the two levels `pool` and
  `category`, which is a naming question for the dev tickets, not the screens.
- **D6 and D11 were brought across too** (Garreth, 2026-09-16). The Studio had
  the harder version of this: it used "Group" for the folder and "set" for a
  per-person set with facts, so a plain rename would have left two meanings of
  one word on the same screen. Settled by making **a person just a set inside
  the library** — sets nest, so "Maya R." is a set in Red Carpet Sets holding
  her cut-out, before and after. **The second half of that decision — that the
  facts her labels quote also hang off the set — was reversed the next day**;
  see the entry below and D11's closing note. The Celebrity Peptide template keeps its one-person guarantee and its
  years, and the Studio now says "set" for one thing only. **D8 will need a
  small facts panel on a set** to match. **It was designed and rejected on
  2026-09-16**, see below.
- **No facts panel: designed and rejected the same day** (Garreth,
  2026-09-16). A band of a set's facts was drawn on a set page, with a dialog
  that added or removed a fact for every set in the library at once. Garreth
  turned it down, and the reason matters more than the screen: **a fact is not
  a property of a folder of pictures.** It is a column on a row in the content
  type's own data set — `celebrity_verdict.before_year` is the year that
  "2022. Struggling before any of this started." quotes. Only Celebrity
  Peptide would have used the panel, and it would have shown three empty
  fields on every set of every library that had facts, including sets that are
  not people. **D8 stays what it was: libraries, holding images in sets, each
  image carrying the details AI vision read off it.** The screens were taken
  back off the canvas the same day; nothing on the (D7 and D8) canvas shows
  them. What a carousel is *about* is a bigger question, parked in
  `BACKLOG.md` under "The generator has no idea what a carousel is about",
  which also lists the five places that still assert the old decision.
- **Two build fixes came out of it**, and stayed. Two of D8's boards had been
  sitting on top of each other on the canvas (Waiting for Keep ran under An
  image with nothing read off it) because a board that grew had to be moved by
  hand and was not; boards now say which row and column they are in and the
  build works out the spacing. And the build now does what the entry above
  already claimed it did — check, on every board, that everything the markup
  asks for is actually handed over. That check had never been written. It is
  now, and it was confirmed to catch the case that caused the bug.
- **The companion documents were brought across on 2026-09-16**, now that D8
  is approved and the how-to allows it: F7 rewritten for optional nesting
  sets, image details and Tag with AI; F1, F3, F8, F9 and F14's passing
  references; the plan's §5.3 and §6; the template model's layer table and
  §7.3. Three decisions were made while doing it, each worth knowing:
  - **`v_image_assets` carries `set_name` and `subset_name`, not `set`.**
    `SET` is a SQL keyword that would need quoting everywhere, and sets nest
    one level, so the two levels are named outright. They come from the
    banks' `pool` and `category` (DEV-01).
  - **A new ticket for AI vision writing the image details** — written as
    DEV-36 on 2026-09-16 and **renumbered DEV-41 on 2026-09-17**, when D10
    was reopened and DEV-36 to DEV-40 went to the Trends feed. It had no
    ticket at all — DEV-12's vision check is a different thing, on rendered
    slides. It writes `carousel_images`'s own columns, so the
    vocabulary comes from the live data rather than being invented, and it
    carries a warning that a vision pass over a bank of hundreds needs its
    cost measured first.
  - **`CAROUSEL-RENDERER-PORT-SPEC.md` was left alone.** Its "distinct-group"
    is the existing Python painter's own rule name, cited with line numbers,
    and `pair_group` is a real column in `glowup_image_bank`. Renaming either
    would make the document describe code that does not exist.

- **You get here from:** the menu, or Change in D2 and D6.
- **Flows:** F7.
- **Design:**
  - The grid of libraries, as boards in the Pinterest sense (Garreth,
    2026-09-16): a mosaic of three of the library's own images — one large,
    two stacked beside it — with the name and the image count plain
    underneath, and no card drawn round either. Nothing else rides on a
    board: how many sets, how many images are unread and which carousel
    types point at the library all came off. **New library** is a tile at the
    end of the grid rather than a button in the header.
  - One library: its sets as set cards, each showing a few of its
    images, its name and its count; then the images in no set under **Not
    in a set**. Opening a set goes a level down, with a breadcrumb back.
    Covers marked.
  - **New library**, **New set**, **Upload**, **Tag with AI**.
  - **Generate images** form: prompt, base image (picked from the library or
    uploaded), how many (up to 8), shape. It never picks a set — what it
    makes lands in the library (Garreth, 2026-09-16).
  - Generating tiles, then the review row with **Keep** and **Discard**.
  - **Retire image** (hold).
  - Opened from D2's **Generate with AI** (Garreth, 2026-09-15): the Generate
    images form with the empty set already picked, and back to the
    Generate form once the images are kept.
  - **Sets, shown and opened as sets** (Garreth, 2026-09-16, replacing
    the groups-and-sets split of 2026-09-15 and the filter pills of earlier
    the same day). A library starts with **no sets at all**, and images in
    no set are ordinary, not a backlog. Sets appear only when a person
    makes one, or asks the AI to file the images into them. A set belongs
    to nothing in particular: a Cover set may hold a dozen different
    people. **Sets nest one level**, which is what the live banks already
    do — `glowup_image_bank` and `covered_eye_image_bank` are organised
    `pool` then `category`, so `cover` holds `taraji`, `gabrielle_union` and
    the rest. A template cell names the set it draws from.
  - **Every image carries details an AI reads** (Garreth, 2026-09-16). The
    headings are the dashboard's own `carousel_images` columns, read from
    Supabase on 2026-09-16 rather than invented: **content** (a written
    description of the picture), **emotion**, **subject**, **setting**,
    **framing**, **color_palette**, **image_type**, **arc_roles** (a list —
    Hook, Before, After, Stack, Reveal, Payoff, Confession), **pillar**,
    **tags**, **quality_score** (6 to 9 in the live data) and
    **has_subject**. AI vision writes them from the picture, one image at a
    time or across a library from **Tag with AI**. The renderer reads them
    back when it is choosing which image belongs on which slide.
  - **Nothing is read automatically** (Garreth, 2026-09-16). A generated
    image arrives untagged and stays that way; only images a person has kept
    and decided to use get read. Images with nothing read off them carry a
    small amber dot on their tile.
  - Clicking any image opens it as a modal: the picture and what can be done
    to it on the left, what was read off it on the right as metadata, and the
    hold to retire it in the footer.
  - **Preparing an image** inside the library: background removal and black
    and white as automatic steps, and an AI edit of an uploaded photo (a
    pose, a look) that waits for Keep like any generated image.
- **States:**
  - An empty new library.
  - A library with no sets at all — the ordinary case.
  - A set with nothing in it.
  - A thin set with a single image.
  - An image nothing has been read off yet.
  - One generated image failed (Retry); Higgsfield out of credits.
  - Review row all clear.
- **Done when:** approved in dark at both sizes.

## D9. History

- **Status:** **Done** — dark mode **approved by Garreth on 2026-09-16**,
  after one round of review whose every change is made and saved. Desktop, the
  date-range dropdown, a re-run beside the batch it copied, the no-results
  state and first run, plus the phone at all three. On its own new canvas,
  **Carousel Generator Designs - (D9 History)**
  (https://claude.ai/artifact/2EjoB77uj9C8qXriiUmRxT; moved there on
  2026-09-18 from the canvas it shared with D10, which kept the old link),
  pages **D9 · Dark** and
  **D9 · Light**, built by
  `docs/designs/carousel-generator/d9-history.build.mjs`. The light pages are
  built from the same tokens and were approved alongside the dark ones.
  A re-run is tied to the batch it copied by a marker in each row ("Re-run of
  Sep 11", "Re-run on Sep 16"), rather than by pulling the older batch out of
  date order.
  Added beyond the ticket: on the phone the type pills scroll sideways inside
  their own row the way the app's own filter pills do, rather than wrapping
  over three lines.
  **From the review (Garreth, 2026-09-16), all made and saved:** the
  "Ran by" column is gone, because the app shows nobody's name anywhere, and
  **Status** takes its place, with a status on every row — Done, Writing 7 of
  20, Stopped, Not wired. Both empty states now fill the rest of
  the screen. The paired rows are no longer highlighted in the accent colour:
  the marker names the other batch by its date and that is all, so the jump
  that lit both rows went with it, and filtering to that type brings the pair
  together on its own. A status meaning something went wrong is
  **red** (the app's
  danger colour, as D7 marks flagged decks); Stopped is the only one so far —
  Not wired is a type whose approved decks wait for Wire, not a fault, and a
  batch nobody approved still reads Done.
  **The four counts were corrected** to Requested / Written / Rendered /
  Approved, because the ticket's original list came from the batch model that
  was replaced on 2026-09-15. Two other documents still carry the old list and
  needed the same correction, and got it on approval: the plan's §6.3, F4 and
  F5 in the flows, and **DEV-19a**.
  **Fixed in the prototype on 2026-09-19 (version 21)** after Garreth found
  History broken. Two faults. One was D9's own and had been there since it
  joined the prototype on 2026-09-16: the screen looked a type up in a table
  eight lines before making the table, which only bites when History is
  opened by a click (from the menu, or History › on a type's page), and then
  stops the whole board; the review boards never reach that line, so they
  were always fine. The other came with D10's round three (see D10's
  Status). Checked with the local harness, desktop and phone, headless
  Chrome: History opens from both routes, the pills filter, the date range
  opens and shuts, Clear filters works, and a sweep pressing every button on
  every screen once (8,580 presses a size) finds no crash. D9's 16 boards
  render exactly as before.
  **In the prototype** (https://claude.ai/code/artifact/94d569f8-fd94-4ce0-9298-f9d0f0f5f175)
  since 2026-09-16: the History menu item opens it, and so does **History ›**
  on a type's page, which arrives already filtered to that type. A row, or its
  action, opens that batch — a finished one at D5, a running or stopped one at
  D3 — carrying the type's slide size like every other hand-off, so Quiet
  Luxury Picks still renders at 9:16.
- **You get here from:** the menu.
- **Flows:** F4, F5.
- **Design:**
  - A table of past batches: date, carousel type, **Requested, Written,
    Rendered, Approved**, and a **Status** column. The counts were "requested,
    approved, rendered, generated" until 2026-09-16, which was the batch model
    from before 2026-09-15 — copy approved first, rendered after. Since the
    text gate moved into writing, the one sign-off is Approve (n) decks on the
    finished batch (F3), so Approved is the last count and it is what the Smart
    Scheduler can see (Garreth, 2026-09-16).
    **No "who ran it"** (Garreth, 2026-09-16): the app shows nobody's name
    anywhere, and Status takes that place — Done, Writing 7 of 20, Stopped,
    Not wired. A status that means something went wrong is red.
  - Filter pills by type and a date-range dropdown.
  - A stopped batch row that opens to **Continue**. It says plainly
    **Stopped**; how far it got is the Written column (Garreth, 2026-09-16).
  - **Run again** per row, and a re-run shown paired with the batch it copied.
- **States:** first run (no batches yet, with Generate); no results (the
  filters echoed back, with Clear). Both fill the rest of the screen rather
  than sitting in a short box (Garreth, 2026-09-16).
- **Phone:** the table as stacked rows.
- **Done when:** approved in dark at both sizes.

## D10. Trends

- **Status:** **Done — round three APPROVED by Garreth on 2026-09-19, dark
  and light, both sizes.** Light was drawn the same day, once dark was
  approved. Dark is version 40 of
  Carousel Generator Designs - Dark (D10 Trends), light is version 2 of
  Carousel Generator Designs - Light (D10 Trends)
  (https://claude.ai/artifact/8vc8Sv7TRCi5Xqbhxqi1Sp), 48 boards a theme from
  one build (`R3_LIGHT = true`). In light the filter panel is the card colour
  outright (light mode has no blur, so anything short of solid showed the
  results through it). **The documents were brought up to date on 2026-09-19** at
  Garreth's word: the plan (§1 D6 to D9, §2.6, §5.3, a round-three block
  heading §6.5, §10 items 43 to 53), the flows (**F15 rewritten, F16 new**, F9
  and F12 touched), the dev tickets (**DEV-34 rewritten; DEV-35, 36, 37 and 39
  amended; DEV-42 to DEV-47 new**; decisions and open questions 7 to 9) and
  the backlog. Merged to `main` (commit cb79ce4, pull request 8) and **the
  prototype holds round three since 2026-09-19** (version 24 of Carousel
  Generator Prototype, https://claude.ai/artifact/KNxf22ERryEbTmr2tRuzF6,
  rebuilt whole from `main`). Clicked through on desktop and phone with the
  local harness, 60 checks a size, all passing in dark and again in light,
  with screenshots in headless Chrome (not Safari): the details window from View Details, a search tile, a
  Saved tile and a Recent saves row, and the X back to where it was opened;
  the three tabs; Analysis's groups; the thumbs; Save in the window feeding
  the Saved grid and Recent saves; the filter panel, its three dropdowns,
  Apply, and the chips; the search-type picker; the phone's grab bar; the
  three sample searches. One change to the build file for the prototype's
  sake: only the under-eye serum post had an analysis written out, so the
  other five opened on a near-empty Analysis tab; they now borrow a general
  sample one (`ANALYSIS_ANY`). Every review board renders exactly as it did
  (all 96 compared before and after). Not reachable by clicking, because
  they are moments a board is opened on rather than something a press
  leads to: a search on its way or timed out, analysis nothing yet / on its
  way / blocked / failed / partial, a dead slide link, and the feed's
  caught up, new carousels and See older states. **Version 21, the same
  day, put History right** (Garreth found it broken on version 20; see D9's
  Status). Round three was half the cause: its new filter panel used value
  names History already had (`showFilters`, `clearFilters`, and the
  dropdown's three), and in the prototype the screen added last won, so
  History lost its filter row. The shared kit now lets the screen that is
  showing have the last word on its own names; all 386 review boards across
  the 11 tickets render exactly as before. **Version 22, the same day, made
  the feed posts match the design** (Garreth saw a rounded, bordered box
  round each post, crowding the handle and clipping View Post). The
  Generate form (D2) styled a class named `.fcard` as a card without tying
  the rule to its own screen, and Trends' feed post is `.fcard` too, so in
  the prototype, where D2's styles are also on the page, the box leaked
  onto every post; D10's own canvas has no D2 on it, so the design was
  always right there. D2's rule is now scoped to `.screen-generate`; its
  12 boards compare identical as images before and after. Checked by
  drawing each of the ten screens twice, with every screen's styles and
  with its own only, desktop and phone (headless Chrome): all ten now
  match, opening state only. **Version 23, the same day, made the phone's
  menu open again** (Garreth: the menu button only blurred the screen).
  Trends named its own rail's values `railCls`, the very name the shell
  uses for the side menu, so on every screen the menu's "open" arrived as
  nonsense; the desktop's Collapse sidebar was dead the same way. In since
  round two (2026-09-17), so version 19 had it too. Trends' values are now
  `t10railCls` and `t10railCur`; its 96 boards are otherwise unchanged. The
  prototype build now stops, naming the screen and the value, if any
  screen hands over a name the shell uses (the batch screens' bell is the
  one allowed). Checked on all ten screens, headless Chrome: the drawer
  opens, shuts on the blur, and a menu item goes there and shuts it
  (phone); Collapse and Expand (desktop). **Version 24, the same day, made
  the phone's details sheet pull** (Garreth: it should pull up over the
  slide and would not). The design had always said so, but only the two
  resting positions were drawn, and the build moved the sheet on a press of
  the small grab bar alone. Now, on the phone: a pull on the grab bar or the
  row of tabs makes the sheet follow the finger between its two rests, and
  letting go settles it (60px or more goes the way it was pulled, less
  falls back to the nearer rest); scrolling what the sheet holds raises it,
  and at the top a pull down lowers it; the grab bar takes a finger 14px
  above itself; a press still toggles it and a tab still switches. The look
  is untouched: all 96 boards match as text and the 20 phone boards as
  images. Tested with REAL input in headless Chrome at 390 by 844, through
  a small stand-in for the canvas runtime: touch 18 of 18, mouse and wheel 8
  of 8. Not tested on the saved canvas itself, in Safari, or on a real
  phone. What round three is, as first saved for review (
  2026-09-19, canvas version 39, page D10 · Dark, top row, 24 new boards):**
  **On the phone the details are a sheet that rides up over the slides**
  (Garreth, 2026-09-19: the room under the slide was too small, and only two
  of Analysis's groups showed). The slides stay pinned under the header and do
  not scroll away; scrolling the sheet carries it up over them until a strip
  of the slide is left, and scrolling back down lets it go; the grab bar at
  its top does the same on a press. Two phone boards: Analysis and
  Transcription with the sheet up. The details window also sits above the
  shell's page glow now, which had been washing over it.
  The Analysis groups' headers carry their name and nothing else: the small
  counts ("7 tags", "5 notes") came off the same day (Garreth: no
  unnecessary text).
  **Saved is a grid** (Garreth, 2026-09-19), three across like the search
  results, each tile the post's cover with its slide count, newest saved
  first; a tile opens the details window, which is where a post is unsaved.
  It replaces the saved posts drawn in the feed's layout (desktop and phone
  boards redrawn in place). **Transcription is a tab of its own** beside
  Details and Analysis: the two share one reading and so its states (nothing
  yet, on its way, blocked, failed), and Analysis keeps four groups (Summary,
  How it works, Reusable pattern, Audience response).
  **The Analysis tab is groups that open and close** (Garreth, 2026-09-19,
  so it is tidy when it opens): Summary, How it works, Reusable pattern and
  Audience response; **Summary starts open, the rest shut**,
  and more than one can be open at once. Boards: the default, the pattern and
  the audience opened, and the transcription opened.
  **The Analysis tab was widened on 2026-09-19** after Garreth asked whether
  the analysis really was three rows (the part-read board had shown three,
  wrongly). Read from the live tables: the short values two across (Topic,
  Angle, Hook, Story, Tone, Look, and the slide the product first shows on),
  then Why it hooks, Opener, Payoff and Call to action with their slide, and
  Proof; then **Reusable pattern** (what to keep, its limits), **Audience
  response** from the comments (themes and questions, or "Too few comments to
  read"), then the transcription. **A part-read deck keeps every row** — the
  model read what it was given; what is short is the slides it could fetch —
  so that board now shows the whole analysis under a Partial label and "4 of
  6 slides read". Two more boards: the tab scrolled down, and the **newer
  run's thinner analysis** (309 carousels: hook, story and call to action
  only), which simply has fewer rows and nothing blank.
  **Seen means a post has been on the screen for about a second** (Garreth,
  decided 2026-09-18). **After the last unseen post the feed reads "No more
  new carousels" with a quiet See older carousels button**, which carries on
  into the ones already seen, most recently seen first; "That's every
  carousel" is the end of those. The three tall boards grew to 1960px, since
  a post is a line taller than it was in round two.
  **The filters a search ran with sit over its results as chips, each with an
  X that takes it off and runs the search again, and Clear all when there is
  more than one** (Garreth; desktop and phone boards); they replace the
  "2 filters" note and the Clear filters link in the results line.
  Latest cut, after the filters and the search were checked against the live
  database: the filter panel is **three dropdowns that start on Any and take
  one value** — Topic (the one filter the search function has built in; the
  library's seven common topics), Hook style (its six common values) and
  Views; Visual style and Standout posts only are gone (614 free-text values;
  4 carousels marked) — with a board of the Topic dropdown open. **The feed
  holds what this person has not seen** (Garreth): a post seen does not come
  back on the next launch and is found again by searching; with nothing new
  the feed shows the last ones seen under a small **No new carousels** line,
  and when new ones land while the page is open a quiet **"6 new carousels"**
  button brings them in (two boards). The Analysis tab has a **Blocked** board
  (the slides could not be fetched, Try again). The filter panel is nearly solid rather than the app's glass (Garreth, same day: over photos the glass left its labels without contrast). The Analysis
  tab was redrawn the same day from the live tables' own fields (Garreth asked
  whether the first cut matched the database; it did not): the analysis first
  — Topic, Angle, Hook, Tone, Look as short tags, then Opener, Proof and Call
  to action as sentences, with a Complete / Partial / Blocked label, and any
  row the library has nothing for left out — then the transcription, each
  slide with its words, what it shows, and its job in the story. Story shows
  only when it is there (309 of 1,252 carousels) and the strength scores are
  not drawn. A twelfth board shows a part-read deck. Reopened by
  Garreth on 2026-09-18 after the developer handover's frontend addendum
  (2026-09-17) was read against the page. Twelve new dark boards: the filter
  panel open with two filters on, the search-type picker, a search on its
  way, a search that timed out, the details window from a tile, its Analysis
  tab in four states (transcribed and analysed, nothing yet with the
  Transcribe and analyse button, on its way and filling in, failed with
  Retry), and on the phone the details window and the filter sheet. What
  changed: the search bar gains a search-type picker inside it and a filter
  button beside it (reversing round two's "no scope pills, no chips"); a post
  opens in a **details window** (slides left, X upper right, Details and
  Analysis tabs, and along the foot the thumbs, Save, View Post, Copy to
  Studio), which replaces the "tile opened alone" board and also opens from
  **View Details** on a post and from a Recent saves row; **useful / not
  useful** are a thumb up and down on every post and in the window; on a post
  **View Details takes Save's place** and the numbers get a line of their
  own; a missing number is left off a post and reads Unknown in the window,
  never 0; a full page of results reads "The 25 best matches", never a
  total. Light mode was drawn after dark was approved (see the top of this line). D9 moved to
  its own canvas the same day (Garreth), and then **D10 · Light moved to a
  canvas of its own**, Carousel Generator Designs - Light (D10 Trends)
  (https://claude.ai/artifact/8vc8Sv7TRCi5Xqbhxqi1Sp), because both themes
  with round three would come to about 21 MB; the old link is now
  **Carousel Generator Designs - Dark (D10 Trends)**, D10 · Dark only,
  10.7 MB, version 31, every board kept. The plan, flows and dev tickets are not updated until dark
  is approved. **Before it: round two approved by Garreth on 2026-09-17, dark and
  light, both sizes**, after four reviews and two rounds of small fixes, every
  change made and saved (canvas version 26). Merged to `main` and **in the
  prototype since 2026-09-17**: Trends opens on the Feed, the search bar runs
  the three sample queries on Enter (and finds nothing for any other), Saved
  and the Recent saves panel work, and Copy to Studio opens the Studio on the
  deck picked, from a post and from a digest's carousel (Garreth asked for
  the landing the same day; D6's build reads the deck it is handed).
  **Reopened 2026-09-17 (Garreth)** for **round two — the feed and
  the search**, redesigned **in place**: the same build file
  `docs/designs/carousel-generator/d10-trends.build.mjs` and the same canvas
  pages **D10 · Dark** and **D10 · Light** on
  **Carousel Generator Designs - (D10 Trends)**
  (https://claude.ai/artifact/2Cs5YYqwJHC6qSPzBrZ1b1; called "(D9 and D10)"
  until D9 moved to its own canvas on 2026-09-18). There is no D12: this
  one ticket carries both rounds.
  **Round two, fifth cut, saved 2026-09-17 after Garreth's fourth review,
  dark and light, 25 boards a theme; approved the same day.** Desktop: the feed, a post
  on its third slide with the arrows and Save pressed, a slide whose link has
  died, the next twenty loading and the end of the library (both taller than
  a screen), the Studio that Copy to Studio opens, carousels found for a
  search, a search whose accounts sit above its carousels, one creator's
  carousels, a tile opened, the post alone with the way back, a search that
  found nothing, the Saved section, the feed with nothing saved yet, and
  round one's Digests (newest not analysed, analysed,
  links queued, failed, no digests yet) and Knowledge (pending rules,
  nothing pending). Phone: the feed, carousels found for a search, the Saved
  section, an analysed digest, Knowledge. Five of round one's boards were
  dropped to keep the shared canvas under its 16 MB (Analyse running, the
  tall carousels board, the confidence filter open, the phone's digest list
  and its first run); the states are still in the build file. The canvas
  came to 13.3 MB. Every board was rendered locally before saving; the close
  look on the canvas is Garreth's. The first cut (the card beside its words,
  a chip row, underline tabs, a rail riding on the phone's slide), the second
  (the scope pills, the honest label over the feed, Open source on the card,
  counts on the rail), the third (the accent Copy to Studio, and a page
  that scrolled whole rather than the posts alone) and the fourth (slides
  stacked and faded rather than swiped, no View Post on a post, search results
  drawn as posts rather than tiles) were saved earlier the same
  day and are all superseded.
  **Round one stays as history: approved by Garreth on 2026-09-16**, in dark
  and light, after two rounds of review whose every change was made and saved.
  Desktop: the newest digest with nothing run on it, Analyse running, an
  analysed digest, links still queued, a failed analysis, no digests yet, the
  knowledge base with Accept and Reject, the confidence filter open, nothing
  pending, and the Studio that **Use as reference** (called Recreate this in
  round one) opens. Phone: the digests, an analysed digest, the knowledge base
  and first run.
  **Two panes, as two tabs** in the app's own underline-tab shape (D7's), with
  a narrow column of digest dates inside Digests and the open digest beside it
  (chosen with Garreth, 2026-09-16, over one list that expands in place and
  over both panes side by side: an analysis result is a body, three rules with
  their evidence and three posts with their slides, and a list that expands to
  hold all that pushes every other digest off the screen). Round two puts a
  third section, **Feed**, in front of those two and leaves them as they are;
  after Garreth's first review the three are a rail of buttons rather than
  tabs (below).
  Decisions the screen makes, for review:
  - **Accepting and rejecting are on the Knowledge tab only.** A rule
    shown under its digest carries a Pending pill and nothing to press, so
    reading what was proposed and deciding on it stay two jobs. The ticket and
    F13 both put the actions there.
  - **Analyse is the only accent on the page, and only on the newest digest
    nothing has been run on.** Analyse again, Retry, Copy to Studio, Accept
    and Reject are all secondary — on the digest sections and on the feed
    alike. **Copy to Studio is a quiet grey outline button beside Save, and
    nothing on the feed is lit** (Garreth, 2026-09-17, third review of round
    two); the earlier "one lit button per post" is reversed.
  - **A state is words before it is a colour:** a digest's second line reads
    "11 links · not analysed", "2 still queued" or "Analysis failed", and the
    colour only agrees with it — red for a fault (D9's rule), amber for waiting
    on the outside worker.
  - **The empty state fills the screen only when it is the only thing on it.**
    "No digests yet" fills it; "Nothing pending" does not, because the rules
    already accepted sit below it.
  - **Videos are filtered out of a digest** (Garreth, 2026-09-16): this app
    makes carousels, so a digest's video links are ignored rather than shown.
    The question came up because the library is mostly video — read that day it
    held **1,179 TikTok carousels against 2,682 videos and 264 short videos** —
    and the first answer drawn was a second shape for a video (one thumbnail
    that opened the post on TikTok or Instagram). Garreth replaced it with
    filtering, which is simpler and truer to what the app does.
    Two knock-on decisions: the section is headed **Carousels it read**, and a
    digest is counted in **carousels, not links** ("3 carousels · not
    analysed"), because counting links would promise posts the screen never
    shows. The body still carries the video links, because the body is the
    email that arrived.
    The board **"The carousels a digest read"** is taller than a screen, the
    way D7's Overview is, so the whole reading pane shows at once.
  - **An icon is written into the template, never handed over as a value.**
    Garreth found the posts section showing its own SVG source on 2026-09-16:
    a `{{hole}}` renders as text, so an icon passed through one prints its
    markup. Three did it — the two platform marks and the Analyse button's.
    The build script's own check now fails on it, so it cannot come back.
  - **The Studio that Copy to Studio opens is D6's own screen**, already
    approved, down to the "Not analysed in Trends" pill on its dashed frame.
    One board of it sits on this canvas so the hand-off can be seen without
    opening D6's. **The ticket's wording is out of date here:** it asks for the
    reference's slides "in a strip above the canvas", which Garreth replaced on
    2026-09-15 with a dashed frame sitting first on the canvas itself, and D6
    was built that way.
  - **Round two (Garreth, 2026-09-17) — the feed and the search.** Trends stops
    being a digest reader with a knowledge base beside it and becomes the place
    you go to look at what other people are posting. Decided that day:
    - **Feed is the first tab and the one the page opens on.** Digests and
      Knowledge base move to second and third, unchanged in what they do. The
      whole page is now built around the feed and the search.
    - **The search sits in the header**, between the "Trends" title and the
      tabs, so it belongs to the page rather than to one tab. A scope of two
      quiet pills, **Carousels | Accounts**, and the format lives in the
      placeholder — no instruction text anywhere, as the rules say. **Nothing
      happens until Enter** (or the search icon), because a search of this kind
      is a round trip that can take seconds.
    - **Results replace the feed in place**, drawn as the same feed cards,
      under a line of plain words: "14 carousels for 'under-eye serum'", or
      "No carousels match". **Clear** puts the feed back, at the top. On the
      Digests and Knowledge base tabs the bar switches to Feed to show what it
      found. **Accounts** returns a short creator list instead — handle,
      platform mark, how many carousels, top views — and pressing one shows
      that creator's carousels as feed cards with the handle pinned as a chip.
    - **The card** carries the creator's handle and platform mark (TikTok or
      Instagram), **one slide large at 4:5** with a dot pager and left/right
      arrows on hover, the existing slide strip underneath as thumbnails, the
      hook as plain text clipped to two lines, a metrics line reading
      "24.3k views · 1.2k likes · 108 saves", and up to three quiet topic
      pills. **The date shows only when it is known**, which today is almost
      never.
    - **The rail on the card's right edge is Save, Open source and Use as
      reference.** Save is a quiet bookmark that flips to **Saved** with the
      filled icon; Open source is quiet and goes out to the original post;
      **Use as reference is the one lit accent on a card**, and it is the same
      hand-off to the Studio the digests already had.
    - **Chips under the tabs on the Feed:** **Trending** (the default),
      **Saved**, then the five carousel types as topic filters. Saved shows
      only this person's own favourites, newest saved first.
    - **Twenty cards a page.** The next twenty are fetched as the reader nears
      the end; while they come, the next card's outline shows with the busy
      icon. The bottom of the library reads **"That's every carousel"**.
    - **A missing picture keeps its card.** The slide becomes a muted frame
      reading **"Image gone"** and the card and all three buttons stay, because
      the reference is still worth having. (Slide picture links do expire.)
    - **"Trending in the library" is the honest label.** Trending today is a
      ranking of the library itself — best-scoring first, then by views — and
      not what is rising this week, because the posting date is empty on every
      carousel we hold. The screen says so in those words rather than promising
      something it cannot know. A recency term is added when dates arrive.
    - **Carousels only; videos stay filtered out**, the same decision round one
      made for digests, for the same reason: this app makes carousels.
    - **Favourites are personal** — yours, by the email you signed in with. The
      table behind them is shaped so that showing the whole team's saves later
      is a change of filter, not a rebuild.
    - **"Recreate this" is renamed "Use as reference"**, on the feed cards and
      on a digest's carousels alike. One name for one hand-off, and it says
      what actually happens: the Studio opens on that reference.
    - **Phone: one card fills the viewport**, and scrolling snaps from card to
      card. The handle, the hook and the metrics sit over the bottom of the
      slide on a dark scrim; the rail stacks down the right as icons with
      one-word labels, and Use as reference keeps its full label.
    - **Open, deliberately:** how search results should look is settled only as
      far as "the same cards, in place". Garreth wants to see the first boards
      before deciding whether they deserve a shape of their own.
  - **First review (Garreth, 2026-09-17).** The first round-two boards were
    read and four things changed. Round two's bullets above are the record of
    what was drawn; these are what the second cut draws instead:
    - **The search bar sits centred horizontally over the feed**, not on the
      right of the header. **On a phone it sits beside the "Trends" title on
      the same row**, never under it: a compact bar carrying the scope pills,
      the search mark and a short placeholder.
    - **No chip row at all** — no "Trending in the library" chip, no Saved
      chip, no carousel-type chips. The feed shows only carousels the library
      scraped from **other creators, never the user's own**, the way a social
      feed does, so that a person sees what is trending and can recreate it in
      the Studio. **That is the page's goal.** What follows from it: the feed
      is **one list, best-scored first**; the type filter is gone, and with it
      `carousel_feed_page`'s optional `topic` parameter (DEV-36); and the
      honest label **"Trending in the library"** survives only as a small
      muted caption above the first card. **Save stays on the card** and a
      favourite is still written to `reference_favourites` (DEV-37), but the
      Saved view has no place on screen now. **This left one question open** —
      where does a person find what they saved — and the second review below
      **answers it: a fourth section, Saved, on the rail.**
    - **The card follows an Instagram feed post.** A header row: a round
      platform mark, the handle and the date, and the one lit button, **Use as
      reference**, at the right, where Follow sits. A muted second line under
      it carrying the topic tags, and "Matches on slide 3" when the card is a
      search result. Then the image at 4:5 with the slide counter and arrows on
      hover and a row of dots under it; then an icon row, **Open source** at
      the left and **Save** as the bookmark at the right, the way Instagram
      places it; then the numbers line, "24.3k views · 1.2k likes · 108
      saves"; then the hook as the caption, with the handle in bold before it.
      Cards sit one under the other in a centred column with a thin divider
      between them and **no card box**.
    - **The three sections are a vertical rail of buttons down the left of the
      page** — Feed, Digests, Knowledge base, with the digest and pending
      counts — replacing the underline tabs. **On a phone that rail becomes a
      floating bar at the bottom of the screen**, and the card is the same
      layout with the image edge to edge and **no action rail riding on the
      image**.
  - **Second review (Garreth, 2026-09-17).** The second cut was read. Six
    changes, and the question the first review left open is answered. These
    are what the third cut draws:
    - **Saved has a home: a fourth section.** The rail reads Feed, **Saved**,
      Digests, Knowledge base, and the phone's floating bar carries the same
      four. Saved shows the posts this person saved in the feed's own layout,
      newest saved first, and reads **"Nothing saved yet"** when there are
      none. That answers where a person finds what they saved.
    - **A "Recent saves" panel, on the desktop only**, sitting to the right of
      the feed: the last five saves as horizontal cards — the thumbnail at the
      left, then the handle, and views and likes — with a **View all saves**
      button that opens the Saved section. The phone has no panel; its way in
      is the Saved button on the bar.
    - **No Share or Open source button on a post.** The icon row is now the
      numbers — "24.3k views · 1.2k likes · 108 saves" — at the left, and the
      lit button and **Save** together at the right. The handle and the caption
      sit right under that row. **Nothing on the card links out to the original
      post any more**: pressing the handle shows that creator's carousels
      instead. If a link back to the source is wanted later, it needs a new
      decision. **Answered in the fourth review below** (Garreth, 2026-09-17):
      a quiet **View Post** button at the top right of every post opens it on
      its own platform.
    - **The lit button is renamed "Copy to Studio."** It was Use as reference,
      and Recreate this before that. Same action, same destination — the
      Studio's reference variant — and it sits beside Save at both sizes. The
      new name is used everywhere below; the bullets above are left as the
      record of what the earlier cuts drew.
    - **One search box, as wide as the posts, and no scope switch.** The
      Carousels | Accounts pills are gone. One query searches creators and
      carousels together: accounts that match show as a short list above the
      carousel results, and pressing one shows that creator's carousels.
    - **No "Trending in the library" line on the feed.** The honest label the
      first review kept is reversed: the feed carries no label at all. The
      order is still `total_score`, then `views_normalized` — the screen simply
      no longer says so.
    - **No count indicators** on the rail's Digests and Knowledge base rows,
      nor on the phone's bar.
  - **Third review (Garreth, 2026-09-17).** The third cut was read. Five
    changes. These are what the fourth cut draws:
    - **Only the posts scroll.** The title and the search bar, the left rail
      and the Recent saves panel all stay where they are; the column of posts
      is the one thing that moves, in a scroller of its own inside the page.
      On a phone the same: the title and the bar stay put, the floating bar
      stays, and the posts scroll under them.
    - **More space under the search bar**, before the first post.
    - **The posts and the search bar are a little wider** on the desktop:
      **500px**, where the third cut drew 450.
    - **Copy to Studio is not the accent.** It is a quiet grey outline button
      with no fill, its text and its icon in the ordinary text colour, sitting
      beside Save. This reverses the second review's one lit button per post:
      **nothing on the feed is lit at all**, and the accent stays with
      **Analyse** on Digests.
    - **The posts are centred between the rail and the panel, not on the
      page.** The left rail takes 200px and the Recent saves panel 300px, and
      the column of posts sits centred in what is left, so the gap either side
      of it is the same — 76px on a 1440px screen. The search bar sits centred
      over the posts the same way. Garreth asked for it because the gap to the
      rail was much wider than the gap to the panel.
  - **Fourth review (Garreth, 2026-09-17).** The fourth cut was read. Four
    changes. These are what the fifth cut draws:
    - **The slides swipe sideways on the desktop too.** The slide area of a
      post is a **track that snaps slide to slide**, so a trackpad swipe pages
      it the way a thumb does on a phone. The dots and the hover arrows still
      page it, and the counter still counts. The fourth cut stacked the slides
      and faded between them; this replaces that.
    - **"View Post", a quiet grey outline button** — no fill, its text in the
      ordinary text colour — at the **top right of every post**, opposite the
      handle and the topic line. It opens the post on its own platform, TikTok
      or Instagram, in a new tab, from `references_unified.source_url`. **This
      answers the note the second review left open**, that nothing on a post
      led back to the original any more; pressing the handle still shows that
      creator's carousels.
    - **"Knowledge base" is renamed "Knowledge"** as the section's label on the
      rail, on the phone's bar and wherever the section is named on screen.
      The label is all that changes: the table behind it is still
      `content_knowledge_base`, and F13 is still F13.
    - **Carousel search results are a grid**, the way Instagram lays search
      results out: **three tiles across**, each tile **the slide that matched**
      at 4:5, with a small carousel mark in the corner and an **"n slides"**
      badge. Accounts that match are still listed above the grid. **Pressing a
      tile opens that post alone in the column**, in the feed's own layout,
      with **Back to results** in the results line to return to the grid;
      **Clear** still returns to the feed.
    - **Then, the same evening** (Garreth, 2026-09-17): the Recent saves
      panel's padding tightened, with a thin rule under its title; and the
      **Clear button left the results line**. Clearing a search is the X on
      the search bar; Back to results stays on the one-post view. And **the
      feed scrolls from anywhere in the section**: the scroller spans the
      whole width, with the posts centred inside it, so a wheel over the
      empty space either side of the posts scrolls them too.
- **You get here from:** the menu.
- **Flows:** F12, F13, F9, and F15 (browse and search the library, added
  2026-09-17).
- **Design:**
  - **The four sections as a vertical rail of buttons on the left** — Feed,
    Saved, Digests, **Knowledge** (renamed from "Knowledge base" on screen,
    Garreth, 2026-09-17, fourth review; the table is still
    `content_knowledge_base`), **with no counts on any of them** — and, on
    a phone, that rail as a floating bar at the bottom of the screen.
  - **Feed** (the first section, and the default): one list, best-scored first,
    with no chip row, no type filter and **no label over it**. **Only the
    posts scroll**: the title, the search bar, the rail and the Recent saves
    panel are pinned, and the column of posts moves in a scroller of its own,
    with **generous space under the search bar** before the first post. The
    posts are **centred between the rail (200px) and the Recent saves panel
    (300px), not on the page**, so the gap either side of them is the same —
    76px on a 1440px screen — and the search bar is centred over them the same
    way.
    The card is an **Instagram feed post**: a header row with the round
    platform mark, the handle and the date only when known, and **View Post**
    at its top right, opposite the handle and the topic line — a quiet grey
    outline button, no fill, ordinary text colour, which opens the post on
    TikTok or Instagram in a new tab; a muted line of
    topic tags ("Matches on slide 3" on a search result); the slides at 4:5 as
    **a track that snaps slide to slide**, so a trackpad swipe pages them on
    the desktop the way a thumb does on a phone, with the slide counter, hover
    arrows and dots paging them too; then the row carrying the numbers
    at the left and **Copy to Studio** — a quiet grey outline button, no fill,
    its text and icon in the ordinary text colour — beside **Save** at the
    right; then the hook as the caption with the handle in
    bold, directly under that row. **View Post is the only way out to the
    original post**; the handle opens that creator's carousels. Cards in a
    centred column **500px wide on the desktop**, a thin divider between them,
    no card box. On a
    phone the same card with the image edge to edge and nothing over it.
    **The feed carries no accent action at all**: Analyse, on Digests, keeps
    the page's only lit button.
  - **Recent saves**, on the desktop only: a panel to the right of the feed
    holding the last five saves as horizontal cards — thumbnail at the left,
    then the handle, and views and likes — with **View all saves** under them.
    The phone has no panel.
  - **Saved** (the second section): the same feed layout, this person's saves,
    newest saved first; **"Nothing saved yet"** when there are none.
  - **One search box, as wide as the posts** — 500px on the desktop — centred
    over the posts and beside the **Trends** title on a phone: no scope pills,
    the format in the placeholder, Enter to run it. One query searches creators and carousels
    together — matching accounts as a short list above the carousel results,
    the carousels as **a grid of three tiles across** under a line of words,
    each tile the slide that matched at 4:5 with a small carousel mark in the
    corner and an **"n slides"** badge — and pressing
    an account shows that creator's carousels with the handle pinned as a chip.
    **Pressing a tile opens that post alone in the column**, in the feed's own
    layout, with **Back to results** in the results line; **Clear** returns to
    the feed at the top.
  - **Digests:** newest first, readable in place, **Analyse** as the accent on
    the newest unanalysed one.
  - The analysis result: suggested rules with evidence lines, confidence and
    the types they apply to; the referenced posts with their slides and
    **Copy to Studio**.
  - Links still being analysed, marked Queued with when they were queued.
  - **Knowledge:** pending rules filterable by type and confidence, with
    **Accept** and **Reject**.
  - The Studio variant opened by **Copy to Studio**: the reference's slides
    in a strip above the canvas, "Not analysed" when there is no analysis yet.
- **States:** the feed at the top of the library and part-way down it; a page
  of twenty loading the next, with the coming card's outline and the busy icon;
  the end of the library, "That's every carousel"; a slide whose picture is
  gone, "Image gone", the card and its buttons staying; a card with Save
  pressed; the Saved section with saves in it, and with none,
  **"Nothing saved yet"**; a search whose carousels come back as a grid of
  tiles, and one with none, "No
  carousels match", inline where the grid would be; a search whose accounts
  sit above its grid, one creator opened, and a tile opened as the post alone
  with **Back to results**;
  **"No carousels yet"**, the only one that fills the screen, because an empty
  library leaves nothing else on it. And, unchanged from round one: no digests
  yet; every digest analysed; nothing pending; an analysis failing (Retry).
- **Done when:** **round two is approved in dark at both sizes.** **Met
  2026-09-17**, in light as well. Round one was approved on 2026-09-16 and is
  history above.
  **In the prototype** (https://claude.ai/artifact/KNxf22ERryEbTmr2tRuzF6)
  since 2026-09-16: the Trends menu item opens it. One link is not aimed yet —
  **Copy to Studio** opens the Studio, but not on the deck picked, because
  the Studio takes a type's name and character today rather than a reference.
  Aiming it is DEV-35, and it needs DEV-23's reference variant.

---

## D11. Studio, round two — slide sizes, layered templates, Figma

- **Status:** **Round three's slide controls carried in on 2026-09-17 and approved by Garreth on 2026-09-18** (the layered decks got the Add slide slot, the plus in the gap and the caption menu, and this canvas was re-saved). Before that, **approved in dark by Garreth on 2026-09-15 after three review
  rounds; light mode designed and the Carousel Generator Prototype's Studio
  switched to D11's the same day.** No phone boards: the phone is designed
  when D11 is brought into D6 (the list is under D6's Round two). Added by
  Garreth the same day, during D7's review. It extends
  D6, whose canvas is close to its 16 MB limit, so it takes a canvas of its
  own with both themes, the way D6 did: **Carousel Generator Designs - (D6
  pt. 2 Studio)** (https://claude.ai/artifact/DdWFJ1M8acjehQbj36Wtr5,
  Garreth, 2026-09-15), pages **D11 · Dark** and **D11 · Light**. Pictures,
  one screen per state:
  just opened with the third card; a Figma link attached to the chat box
  with a prompt; the attached link failing with No access; the file's five
  frames being read; the draft beside the
  frames with the AI proposing the set and facts the library lacks (the facts
  part is superseded — see the closing note); the
  layers list with the masthead behind the cut-out; a cut-out placed
  freely; the hook on its box; a photo in the wavy frame; a label filled
  from the set; a fixed image; Quiet Luxury Picks at 9:16 from D7's Edit
  template; and Before & After switched to 9:16, saving a new version.
  **First review** (Garreth, 2026-09-15), the page re-saved:
  - Real photos in the template, not drawn silhouettes: bank photos from
    the image store (the glow-up bank's before and after shots), and the
    cover's cut-out is one of them with its background removed.
  - **Start from a Figma link** uses the chat box, the way AI tools take an
    attachment: the link sits as a chip above the prompt, and both are sent
    together. Once sent, the conversation opens and the link stays as a
    small chip above its chat box.
  - **Slide size** (4:5 or 9:16) is in the adjustments on the left, first,
    not in the strip above the canvas.
  **Second review** (Garreth, 2026-09-15), the page re-saved:
  - The chat box grows with the prompt as it is typed, so the whole prompt
    stays in view, up to eight lines before it scrolls. Shift+Enter starts a
    new line; Enter sends. The picture with the Figma link attached carries a
    four-line prompt to show it.
  **Third review** (Garreth, 2026-09-15), the page re-saved:
  - The canvas pans in every direction and zooms, like Figma, not only
    sideways. Dragging the dotted ground or scrolling pans; Ctrl or Cmd with
    the scroll wheel, or a trackpad pinch, zooms around the pointer, from 25%
    to 200%. The tool strip ends with Zoom out, the zoom level and Zoom in;
    pressing the zoom level fits every slide on screen. The dotted ground
    moves and scales with the slides.
  Built by
  `docs/designs/carousel-generator/d11-studio-round-two.build.mjs`. The
  template model (`CAROUSEL-TEMPLATE-MODEL.md`) changes with it once the
  design is approved.
  **Decided by Garreth, 2026-09-15 (before design):**
  - **Two sizes only, 4:5 and 9:16.** 3:4 goes; the imported Glow Up
    template is refitted.
  - **D5 and D6 are refitted after D11 is approved**, not alongside it: the
    Studio's slides, D6's reference covers and library tiles, and D5's
    thumbnails and full-size preview still draw 3:4 and take the type's size
    then. The same pass carries whatever of D11 is approved back into D6's
    own build (`d6-studio.build.mjs`), and both D6 canvas pages (listed under D6's Round
    two; the prototype already has D11's Studio), starting with the third card on the Studio's first screen,
    **Start from a Figma link**, with the link as a chip in the chat box, the
    chat box that grows with the prompt, the **Slide size** choice at the
    top of the adjustments, and the canvas that pans in every direction and
    zooms (Garreth, 2026-09-15: the size selector goes into D6 once D11 is
    done).
  - **The celebrity lane uses real celebrities' photos edited by AI**, not
    look-alike personas. The designs still show invented sample content.
  - The lane renders today from
    `github.com/garrethdev/celebrity-peptide-renderer` (Pillow on plates
    exported from Figma): its slide 1 puts a cut-out portrait above the
    masthead and the hook in a black pill, slides 2 and 3 put the photo
    under a wavy border with a stroked line and a label filled from the row,
    and slides 4 and 5 are fixed images. D11's layered template is drawn to
    describe exactly that.
- **Why:** templates like the Celebrity Peptide Gone Wrong lane (designed in
  Figma at 1080×1350) cannot be described by today's template. A slide has
  one fixed shape, images always fill a rectangle underneath, and every text
  box sits on top.
- **You get here from:** the Studio (D6): New carousel type, Studio in the
  menu, Edit template on D7.
- **Flows:** F8, F9, F10, all to be extended.
- **Design:**
  - **Slide size: 4:5 (1080×1350) or 9:16 (1080×1920)**, picked when the type
    is made and shown on the canvas. Changing it later saves a new template
    version. The imported Glow Up template is 3:4 (1080×1440) and is refitted
    (decided above).
  - **Layers in an order the person can change** (bring forward, send back),
    so text can sit behind a cut-out and a box in front of it. A layers list
    in the adjustments panel.
  - **Image layers placed freely**, not only filling a cell: a cut-out
    subject, background removed, sized and positioned over another image.
  - **Fixed images** that appear on every deck (a grunge paper background, a
    closing product slide), uploaded to the template instead of picked from a
    set.
  - **Text on a box:** a solid container behind a text box, with its colour
    and padding, as a text style option.
  - **Shaped frames:** an image clipped to a shape (the wavy frame) with a
    border.
  - **Slides that share a subject:** cells marked as drawing from one set
    (D8), and text boxes filled from the row the deck is about instead of by
    the AI (drawn as the set's facts — superseded, see the closing note).
  - **A third way to start: from a Figma link**, beside Start from a
    reference deck and Discuss your idea. The AI reads the frames and their
    layers, drafts the template, and proposes the library sets it needs.
    The app has no Figma access today (a token or connection), so this starts
    with a spike.
  - The AI proposes the library sets a new template needs, whichever way
    the Studio was started.
- **Also affected:** the slide slots on D3 to D5's deck cards and the
  full-size preview take the type's size. D7's template strip already does
  (2026-09-15).
- **Settled (Garreth, 2026-09-15):** real celebrities' photos edited by AI
  (the gaunt cover), not AI-made look-alike personas, so a set is one real
  person's cut-out, before and after photos, and the row its labels quote.
  The lane's caption
  safety rules
  (`~/Desktop/en-doc/Caption_Safety_Rules_for_Celebrity_Lane.md`, outside the
  repo) also ban "the shot" in body copy, which the sample cover hook uses.
- **Done when:** approved in dark at desktop, with the phone view agreed in
  review.
- **Superseded, 2026-09-16: labels are filled from the row, not from the set.**
  D11 was designed and approved on 2026-09-15 on the understanding that a
  subject's set carried both its photographs and the facts its labels quote.
  The next day Garreth rejected that: **a set holds images and nothing else**,
  and the values a label prints are columns on the row the deck is about, in
  the content type's own data set — `celebrity_verdict.before_year` is the
  1080×1350 slide's "2019". The prose above has been corrected;
  `CAROUSEL-TEMPLATE-MODEL.md` §7.3 carries the full reasoning.

  **The boards themselves have not been re-drawn**, and they are the thing to
  be careful about. On the **(D6 pt. 2 Studio)** canvas
  (https://claude.ai/artifact/DdWFJ1M8acjehQbj36Wtr5) the approved screens
  still show a text layer whose source reads **Set** with a **Fact** beneath
  it, and the AI offering to add "Name", "Before year" and "After year" to
  Red Carpet Sets. The same wording is in `d6-studio.build.mjs`, which is the
  Studio the Prototype runs, so it is on the click-through too.

  **Re-drawing them is a design change, not a wording fix**, and it was left
  alone deliberately: the replacement depends on where a data set comes from
  and how the Studio shows a row's columns, which is not designed. That work
  is parked in `BACKLOG.md` under "The generator has no idea what a carousel
  is about", and Garreth's decision (2026-09-16) is that it belongs in the
  Studio's own AI conversation, since creating a content type is the moment
  its data set should be researched and created. **Do the boards with that
  work, in one pass, rather than patching the word now.**
