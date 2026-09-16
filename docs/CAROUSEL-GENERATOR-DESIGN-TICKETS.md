# Carousel Generator — design tickets

**Status:** design step, 2026-09-14. Nothing here is built from these tickets.

**Where it stands (Garreth, 2026-09-16):** D1 to D8 are done, and D11, the
Studio's second round, is approved and carried into D6. **The next ticket is
D9, History.** The (D7 to D10) canvas is at 13.8 MB of its 16 MB with D8's
two themes on it, so D9 will fit but **D10 needs a canvas of its own.**
Each ticket is a set of screens to design in the **Peptide Miracles Dashboard**
project in Claude Design. The app is not changed during this step.

**Three review canvases since 2026-09-15** (Garreth), each named for what
it holds: dark pages of D1 to D5 stay on **Carousel Generator Designs -
Dark (D1 to D5)**
(https://claude.ai/code/artifact/d2004744-5f98-4bfa-bddf-71b0d8edcca8),
every `DN · Light` page named below lives on **Carousel Generator Designs -
Light (D1 to D5)** (https://claude.ai/artifact/APt4THd8a3QoPmPskPJCT4), and
D6, a heavy ticket, has a canvas per theme: **Carousel Generator Designs -
Dark (D6 Studio)** (https://claude.ai/artifact/MtsnyvaJPznX6Kg4JaKb2p) and
**Carousel Generator Designs - Light (D6 Studio)**
(https://claude.ai/artifact/3gbDBA71hV5agEfU4ywa8p). D7 to D10 go on
another, **Carousel Generator Designs - (D7 to D10)**
(https://claude.ai/artifact/REki8sN9NFCJZ9FjXUKcAH), both themes (Garreth,
2026-09-15). The `docs/designs/README.md` how-to has the steps.

Companion documents: `CAROUSEL-GENERATOR-FLOWS.md` (what each screen does,
step by step; the flow numbers F1 to F14 below point there) and
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
  empty-groups state and the no-library state. On the Carousel Generator
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
  groups; the note field is the same full-width box as the fixed opening
  line; both back buttons (the menu's and "Carousel types") use the outline
  "<".
  **Light mode: designed 2026-09-14 at Garreth's request, awaiting review**,
  all six screens on the D2 · Light page. **Datestamp removed** from the form
  after approval (Garreth, 2026-09-14).
  **Reopened during D7's review** (Garreth, 2026-09-15), both pages re-saved:
  when the library has no images in a group the template needs, **Generate
  with AI** under the groups opens that library's Generate images form (D8)
  for those groups. What comes back joins the library only on Keep, and the
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
  - The chosen library has no images in a group the template needs:
    Generate unavailable, the empty groups named.
  - Count typed above 50: the field stops at 50.
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
    from a set's facts, the library shown as sets, and the AI proposing the
    groups and facts a template lacks, whichever way the Studio started.
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
- **Status:** **Done** (Garreth, 2026-09-15: D1 to D7 closed; the next ticket is D8). **approved in dark by Garreth on 2026-09-15 after seven
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
  from its title; an image cell selected; a group with no images; a new library
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
    group; Generate with AI takes a prompt, what it shows, the group, how
    many, the shape and the likeness images, and what comes back waits for
    Keep before it joins the group and appears in the panel. Nothing is
    made inside the Studio itself.
  - **Asking the AI for an image the library lacks** (Garreth's question,
    2026-09-15): the AI never makes an image on its own, since that spends
    Higgsfield credits and fills a library other types may share. It says
    what it could not find and offers the same two doors in its reply,
    Generate with AI (the form filled in from the conversation: the prompt,
    what it shows, the group, how many, the shape) and Upload images. What
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
    existing one puts its images there, by group, each draggable onto a
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
    shows the library it draws from and its groups as a ticked list; a
    group with no images says "No images" in the list and on the cell.
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
    wrap width) or image cell (which library group it draws from).
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
  **Carousel Generator Designs - (D7 to D10)**
  (https://claude.ai/artifact/REki8sN9NFCJZ9FjXUKcAH, Garreth 2026-09-15),
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

- **Status:** **Done.** Dark mode **approved by Garreth on 2026-09-16** after
  three passes — his feedback made folders optional and shown as folders
  rather than filter pills, took the folder out of the Generate form, added a
  base image to it, settled that nothing is read automatically, and pointed
  the detail headings at the live `carousel_images` table. **Light mode
  designed the same day**, and the library cards' thumbnails redrawn as four
  of the library's own images. Pictures, one screen per state, on the Carousel
  Generator Designs - (D7 to D10) canvas
  (https://claude.ai/artifact/REki8sN9NFCJZ9FjXUKcAH), pages **D8 · Dark** and
  **D8 · Light**, built by
  `docs/designs/carousel-generator/d8-image-libraries.build.mjs`.
  Twenty boards a theme: the grid of libraries; a library with no folders, which is
  the default; a library whose images are in folders; inside a folder that
  holds folders of its own; the Generate images form; the images arriving;
  the review row waiting for Keep; one image failed with no credits left; one
  image and what was read off it, hold armed; an image with nothing read off
  it; what Tag with AI will do; AI vision reading the images; naming a new
  folder; the form as D2's Generate with AI opens it; a library with nothing
  in it; a folder with nothing in it; and the grid, a library, the Generate
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
  cause.) The empty states — a library with nothing in it, a folder with
  nothing in it — now stretch to the bottom of the window instead of leaving
  dead space under them, and the lone New folder card no longer sits above an
  empty state.
- **Wording to confirm:** these are called **folders** on screen. Garreth has
  called them sets and folders on different days, and the database calls the
  two levels `pool` and `category`; the screens use one word throughout, and
  it is a one-word change if he wants a different one.
- **D2 still says "groups"** for what is now a set, on its Generate form and
  in its build script — and D2's premise that a library can be missing images
  "in a group the template needs" no longer holds the same way, since sets
  are optional. That needs a pass on `main` once D8 is approved; it was not
  changed here because a ticket owns only its own files.

- **You get here from:** the menu, or Change in D2 and D6.
- **Flows:** F7.
- **Design:**
  - The grid of libraries, as boards in the Pinterest sense (Garreth,
    2026-09-16): a mosaic of three of the library's own images — one large,
    two stacked beside it — with the name and the image count plain
    underneath, and no card drawn round either. Nothing else rides on a
    board: how many folders, how many images are unread and which carousel
    types point at the library all came off. **New library** is a tile at the
    end of the grid rather than a button in the header.
  - One library: its folders as folder cards, each showing a few of its
    images, its name and its count; then the images in no folder under **Not
    in a folder**. Opening a folder goes a level down, with a breadcrumb back.
    Covers marked.
  - **New library**, **New folder**, **Upload**, **Tag with AI**.
  - **Generate images** form: prompt, base image (picked from the library or
    uploaded), how many (up to 8), shape. It never picks a folder — what it
    makes lands in the library (Garreth, 2026-09-16).
  - Generating tiles, then the review row with **Keep** and **Discard**.
  - **Retire image** (hold).
  - Opened from D2's **Generate with AI** (Garreth, 2026-09-15): the Generate
    images form with the empty set already picked, and back to the
    Generate form once the images are kept.
  - **Folders, shown and opened as folders** (Garreth, 2026-09-16, replacing
    the groups-and-sets split of 2026-09-15 and the filter pills of earlier
    the same day). A library starts with **no folders at all**, and images in
    no folder are ordinary, not a backlog. Folders appear only when a person
    makes one, or asks the AI to file the images into them. A folder belongs
    to nothing in particular: a Cover folder may hold a dozen different
    people. **Folders nest one level**, which is what the live banks already
    do — `glowup_image_bank` and `covered_eye_image_bank` are organised
    `pool` then `category`, so `cover` holds `taraji`, `gabrielle_union` and
    the rest. A template cell names the folder it draws from.
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
  - A library with no folders at all — the ordinary case.
  - A folder with nothing in it.
  - A thin folder with a single image.
  - An image nothing has been read off yet.
  - One generated image failed (Retry); Higgsfield out of credits.
  - Review row all clear.
- **Done when:** approved in dark at both sizes.

## D9. History

- **You get here from:** the menu.
- **Flows:** F4, F5.
- **Design:**
  - A table of past batches: date, carousel type, requested, approved,
    rendered, generated, who ran it.
  - Filter pills by type and a date-range dropdown.
  - A stopped batch row ("12 of 20 written, 5 approved") that opens to
    **Continue**.
  - **Run again** per row, and a re-run shown paired with the batch it copied.
- **States:** first run (no batches yet, with Generate); no results (the
  filters echoed back, with Clear).
- **Phone:** the table as stacked rows.
- **Done when:** approved in dark at both sizes.

## D10. Trends

- **You get here from:** the menu.
- **Flows:** F12, F13, F9.
- **Design:**
  - **Digests:** newest first, readable in place, **Analyse** as the accent on
    the newest unanalysed one.
  - The analysis result: suggested rules with evidence lines, confidence and
    the types they apply to; the referenced posts with their slides and
    **Recreate this**.
  - Links still being analysed, marked Queued with when they were queued.
  - **Knowledge base:** pending rules filterable by type and confidence, with
    **Accept** and **Reject**.
  - The Studio variant opened by Recreate this: the reference's slides in a
    strip above the canvas, "Not analysed" when there is no analysis yet.
- **States:** no digests yet; every digest analysed; nothing pending; an
  analysis failing (Retry).
- **Done when:** approved in dark at both sizes.

---

## D11. Studio, round two — slide sizes, layered templates, Figma

- **Status:** **approved in dark by Garreth on 2026-09-15 after three review
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
  frames with the AI proposing the group and facts the library lacks; the
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
    group.
  - **Text on a box:** a solid container behind a text box, with its colour
    and padding, as a text style option.
  - **Shaped frames:** an image clipped to a shape (the wavy frame) with a
    border.
  - **Slides that share a subject:** cells marked as drawing from one set
    (D8), and text boxes filled from that set's facts instead of by the AI.
  - **A third way to start: from a Figma link**, beside Start from a
    reference deck and Discuss your idea. The AI reads the frames and their
    layers, drafts the template, and proposes the library groups it needs.
    The app has no Figma access today (a token or connection), so this starts
    with a spike.
  - The AI proposes the library groups a new template needs, whichever way
    the Studio was started.
- **Also affected:** the slide slots on D3 to D5's deck cards and the
  full-size preview take the type's size. D7's template strip already does
  (2026-09-15).
- **Settled (Garreth, 2026-09-15):** real celebrities' photos edited by AI
  (the gaunt cover), not AI-made look-alike personas, so a set is one real
  person's cut-out, before and after photos and facts. The lane's caption
  safety rules
  (`~/Desktop/en-doc/Caption_Safety_Rules_for_Celebrity_Lane.md`, outside the
  repo) also ban "the shot" in body copy, which the sample cover hook uses.
- **Done when:** approved in dark at desktop, with the phone view agreed in
  review.
