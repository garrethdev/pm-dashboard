# Carousel Generator — design tickets

**Status:** design step, 2026-09-14. Nothing here is built from these tickets.
Each ticket is a set of screens to design in the **Peptide Miracles Dashboard**
project in Claude Design. The app is not changed during this step.

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
| Images | Neutral placeholder photos or tinted blocks. Image library covers may use photos from the Supabase image store as placeholders (Garreth, 2026-09-14) | Real account renders or bank images anywhere else |
| Music | "Artist Name – Song Title" | Real tracks from the music library |
| People | "Alex", "Sam" for "who ran it" and reviewers | Real team emails |
| Dates | Relative and plausible: "2 days ago", "Sep 12" | |

Long names, zero counts and very large numbers belong in the designs too, so
the edges are tested, not just the happy middle.

---

## D1. Carousel types — the landing screen

- **Status:** dark mode **done**, approved by Garreth on 2026-09-14, desktop,
  phone and first run. On the Carousel Generator Designs canvas
  (https://claude.ai/code/artifact/d2004744-5f98-4bfa-bddf-71b0d8edcca8),
  pages **D1 · Dark** and **D1 · Light**, built by
  `docs/designs/carousel-generator/d1-carousel-types.build.mjs`.
  **Light mode: designed 2026-09-14, awaiting review** (the D1 · Light page;
  the menu's theme switch also flips any screen). The menu's back button uses
  the outline "<" (the app's ChevronLeft), like every back button in the
  generator (Garreth, 2026-09-14).
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
  - A type that is not wired yet: "Not wired" pill, no Generate button.
  - Retired types folded into a collapsed group.
  - First run: no carousel types at all.
  - Phone: the menu as a slide-out drawer, cards in one column.
- **Done when:** the layout, card and menu are approved in dark mode at both
  sizes.

## D2. Generate form

- **Status:** dark mode **approved by Garreth on 2026-09-14**: desktop,
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

- **Status:** **done.** Approved by Garreth on 2026-09-14; light mode
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
- **States:**
  - Stalled: the progress line turns amber and names the stuck deck and when
    it last moved.
  - One deck's writing failed: error and **Retry** on that card, the rest
    carry on.
  - A batch that stopped part-way, reopened: work so far shown, **Continue**
    where the progress line was.
- **Done when:** approved in dark at both sizes.

## D4. Batch — finished writing, review (includes the deck card)

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

- **You get here from:** Render in D4.
- **Flows:** F3.
- **Design:**
  - Slide thumbnails filling in on each written, unflagged card as they land.
    Flagged cards keep their red outline and are skipped (Garreth,
    2026-09-14).
  - The progress line: "4 of 12 rendered".
  - The automatic check flagging a slide (cut-off text, text too long, poor
    contrast), with an outline on that thumbnail.
  - **Full-size preview** (Garreth, 2026-09-14): pressing a thumbnail opens
    the rendered deck at real slide shape, one slide at a time, on the slide
    that was pressed. Next and previous (arrow keys; swipe on the phone), the
    slide number ("3 of 7"), the check's reason on a flagged slide, and close
    back to the card. A slide not rendered yet shows its empty shape.
- **States:**
  - **Rendering elsewhere** on a card.
  - **Failed** with the slide number and **Retry**.
  - Finished: how many went into the pool, with a link to Inventory.
  - Phone: batch actions in a bottom bar.
- **Done when:** approved in dark at both sizes.

## D6. Studio — create a new carousel type

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

- **You get here from:** a card in D1, or after saving in D6.
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

- **You get here from:** the menu, or Change in D2 and D6.
- **Flows:** F7.
- **Design:**
  - The grid of libraries: cover image, image count, groups, and the carousel
    types pointing at each.
  - One library: images by group, covers marked.
  - **New library**, **Upload**.
  - **Generate images** form: prompt, shows (Character, Place or Other),
    group, how many (up to 8), shape, and likeness images when it shows a
    character.
  - Generating tiles, then the review row with **Keep** and **Discard**.
  - **Retire image** (hold).
- **States:**
  - An empty new library.
  - A group filter with no results.
  - A thin group with a single image.
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
