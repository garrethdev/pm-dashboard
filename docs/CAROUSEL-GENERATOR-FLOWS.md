# Carousel Generator — flows

**Status:** Phase 1 deliverable of `CAROUSEL-GENERATOR-PLAN.md` §9. Written
2026-09-14 for Garreth's sign-off. **Nothing here is built.** Screens are
designed from this document; code is written only after both are signed off.
**Revised 2026-09-17:** F15 added, for browsing and searching the reference
library on the Trends page, and the hand-off to the Studio renamed **Use as
reference** in F9 and F12.
**Revised 2026-09-19 (D10 round three, approved by Garreth):** F15 rewritten —
the search box gains a search-type picker and filters, the feed holds only
what the person has not seen, Saved is a grid, and a post carries thumbs and
**View Details** — and **F16 added**, for the details window a post opens in
(Details, Analysis, Transcription, and analysis on demand). Everything in it
was checked against the live database on 2026-09-18 and 2026-09-19.

Companion documents: the plan (why and what), `CAROUSEL-TEMPLATE-MODEL.md`
(the contract the painter and studio share), `CAROUSEL-RENDERER-PORT-SPEC.md`
(the numbers).

## How to read a flow

Every flow uses the same headings:

- **When:** the situation, and the phase it ships in.
- **Screens:** where it happens.
- **Steps:** what the person does and what the app does back.
- **Accent action:** the screen's one `CtaButton`.
- **Hold:** destructive steps, each a `HoldButton` with no warning text.
- **Empty:** which of the three empty states apply (first run, no results,
  all clear, from `DESIGN-TOKENS.md` §10).
- **Fails:** what can go wrong, and what the person sees and can do.
- **Writes:** tables touched. Every write is also a `dashboard_audit_log` row
  carrying the session email.

Items marked **Proposed** are a default this document chose where the plan
was silent. Items marked **Decide** need Garreth's answer. Both are collected
in §4.

Words used on screen for a deck's state, and their existing Pill tones:

| State | Tone | Meaning |
|---|---|---|
| Writing | `accent` | The model call for this deck is in flight |
| Written | `neutral` | Every copy role, the caption and music exist |
| Flagged | `warn` | Score below 6.0, a compliance hit, a Content Risk Gate rejection (with the gate's reason), a vision-check hit after rendering, or its track could not be found on TikTok or Instagram. Never rendered while flagged; never released. |
| Rendering | `accent` | The painter has claimed the row |
| Rendered | `ok` | Every slide uploaded and on the lane row |
| Approved | `ok` | Approved on the finished batch by Approve (n) decks; in the scheduler's pool (Garreth, 2026-09-15). **The only approval in the app** — there has been no per-deck Approve since 2026-09-14 |
| Dropped | `neutral` | Auto gave up after three tries (D12): kept, dimmed, with its reason; never rendered, never approved, still regenerable |
| Failed | `danger` | The last attempt errored; Retry is on the card |

**Decided (Garreth, 2026-09-14): the last state was "Generated".** The plan
first called it "Ready", which clashes with `posting_status = 'Ready'`
(*scheduled for today*) everywhere else in the dashboard. **Revised
2026-09-15 (Garreth):** with the text gate running inside writing and the
sign-off happening on the finished batch, a rendered deck simply waits as
Rendered until Approve, and the last state is **Approved**. "Generated" is
no longer used on a card.

---

## 1. Screen inventory

| Screen | Route | Phase | Accent action | Hold |
|---|---|---|---|---|
| Generate hub | `/generate` | built 2026-09-14 | none; each card opens its generator | — |
| Carousel types | `/carousel-generator` | 2 | Generate on every card, all the same accent button | — |
| Generate | `/carousel-generator/generate?lane=` | 2 | Generate | — |
| Batch | `/carousel-generator/batches/[id]` | 2 | Render (n) decks, once the writing is done; Approve (n) decks on the finished batch | Discard deck, in the More menu |
| History | `/carousel-generator/history` | 2 | Only in the first-run empty state: Generate | — |
| Content type | `/carousel-generator/types/[slug]` | 2 | Generate | — |
| · Writing tab | same, `?tab=writing` | 2 plain, 3 conversation | Save version | — |
| · Rows tab | same, `?tab=rows` | 2 | none; the tab is read-only | — |
| · Go Live tab | same, `?tab=go-live` | 4 | none; the run is itself a hold | Wire |
| Library | `/carousel-generator/library`, `/library/[id]` | 2 read-only, 4 editable | Phase 4: Upload; Generate images in an empty library | Phase 4: Retire image |
| Studio | `/carousel-generator/studio`, `/studio/[template]` | 3 | Save as content type, or Save version | Discard draft |
| Trends | `/carousel-generator/trends` | 5 | Analyse on the Digests section, on the newest unanalysed digest; none on the Feed | — |
| · Details window | over Trends, from a post, a tile or a recent save (F16) | 5 | none | — |

**Renamed 2026-09-21 (Garreth), design ticket D13, approved 2026-09-22:**
the **Direction** tab is now the **Writing** tab and the **Wiring** tab is now
the **Go Live** tab, on every screen and in every flow below. Only the screens
change: the `direction` column, the table `carousel_lane_directions`, the
database step `carousel_wire_lane()` and the runbook keep their own names, and
so does §4.8 of the plan, "Wiring a new content type", which is the process
rather than the tab. **The two query strings above moved with the screens on
approval**, from `?tab=direction` and `?tab=wiring` to `?tab=writing` and
`?tab=go-live`, because the address bar is something a person reads. Nothing
is built yet, so nothing broke.

**Writing is required before a type can generate (D13, approved 2026-09-22),
and the stop is on the Generate form.** A type with nothing written keeps an
ordinary, pressable Generate on its card and in its header, with a neutral
**Needs writing** pill beside it; pressing it opens the form as always. The
form draws its Writing row in the danger stroke and leaves its own Generate
unavailable until everything required is filled — the same way it already
handles a missing image library. One rule: *Generate always opens the form;
the form names what is missing.*

**The Rows tab is new (D15, proposed 2026-09-21, approved 2026-09-22).** It
sits between Writing and Go Live, and it is the **only read-only screen in the
generator**: it shows what is sitting in the type's lane table and, in words,
why each row cannot post, and every repair happens on the screen that already
owns it. See F18.

All screens work in dark and light mode, like every other page of the
dashboard (Garreth, 2026-09-14). Dark is designed first; light uses the same
token names. Same shell, Topbar breadcrumb. At phone width the
deck grid is one column, batch actions become a bottom bar, and nothing
scrolls sideways.

### The generator's own menu

The generator does not use the dashboard sidebar (Garreth, 2026-09-14). The
dashboard's **Generate** item opens the Generate hub (`/generate`), one card
per kind of content; the **Carousel** card opens Carousel types. From there
every generator screen shares a left menu of its own, in the same shell and
top bar. Its top row, **← Dashboard**, returns to the Generate hub.

| Menu item | Opens | Phase |
|---|---|---|
| Carousel types | Carousel types; a type's page and Generate keep it lit | 2 |
| History | History | 2 |
| Image libraries | Library | 2 |
| Studio | Studio, empty | 3 |
| Trends | Trends | 5 |

An item appears once its screen is built; nothing sits in the menu disabled.
There is no separate database page: History, Carousel types and Image
libraries already show everything the generator stores. **Proposed:** the
menu folds to icons while the Studio is open, since the canvas needs the
width.

---

## 2. Flows

### F1. Generate a batch

- **When:** a lane is running low. Phase 2, for Glow Up and Covered Eye.
- **Screens:** the sidebar's Generate item opens the Generate hub; its
  Carousel card opens Carousel types; then Generate, then Batch.
- **Steps:**
  1. Carousel types shows one card per lane: name, character, postable count and days
     of cover (from `v_scheduler_pool` and cadence), last batch date, 28-day
     median views. Live lanes first, retired lanes in a collapsed group.
  2. Press Generate on a card. Generate opens with the lane filled in.
  3. The form: **How many** (a number, pre-filled with 50 and capped at 50;
     Garreth, 2026-09-14), **Image library** (Garreth, 2026-09-14:
     the library the content type points at, with **Change** to repoint it,
     or a required choice when it points at none), **Writing** (the active
     version shown read-only, with its version number and a link to the
     Writing tab), **Note** (one line, optional, placeholder *anything
     specific about this batch?* — D13, so the difference between the
     standing Writing and the per-batch Note is shown rather than written on
     the screen), and for Glow Up the
     per-batch choices from the template: **Opening line** (Fixed or Written).
     The form has no datestamp field (Garreth, 2026-09-14); where Glow Up's
     datestamp comes from is open (DEV-15). The closing line is always the
     fixed one (Garreth, 2026-09-14), so it is not a field.
     **Proposed:** a repoint is saved to the content type as a new template
     version with only the library changed, so later batches use the new
     library too. Batches already made keep the library they recorded.
     **Undo** beside Change puts the previous library back. On a phone,
     Generate sits in a bottom bar with the reason it is unavailable beside it
     (D2, approved by Garreth 2026-09-14).
     **Auto mode** (D12, approved 2026-09-21) is the form's last row: one
     switch, off by default, its own label and no instruction text. A
     carousel type whose last batch was made in Auto opens with it already
     on; after that it is the person's. With it on the batch carries itself
     to the sign-off — see F2 step 7 and F3.
     **A type with nothing written yet** (D13, approved 2026-09-22) arrives
     here with its Writing row in the **danger stroke**: the line reads *No
     writing* in red and **Write** stands in Edit's place, red with it — the
     one red thing on the page. Generate at the foot of the form is
     unavailable with *No writing* beside it, as it already is for a missing
     library. The stroke is there when the form opens, not after a press,
     because there is no press to fail. Only the Writing row is drawn this
     way; the library row, just as missing on its own board, was left as
     approved.
  4. Press Generate. The app creates the brief, the `content_batches` row
     and one empty deck card per requested deck, then opens Batch.
  5. Batch requests decks one at a time. Each card fills in as its copy
     arrives. The progress line reads "7 of 20 written" and is announced
     politely to screen readers. **In Auto the server drives this, not the
     page** (DEV-48), the progress line carries an **Auto** pill and **Pause
     auto**, and a flagged deck is rewritten by the batch itself — three
     tries, then **Dropped**, which leaves the count and is named beside it:
     "11 of 18 written" with "2 dropped".
  6. As each deck's copy lands, the app scores it and sends its hook, slide
     copy and caption to the **Content Risk Gate** webhook (the same gate n8n
     runs nightly for the other lanes; Garreth, 2026-09-15). A rejection
     flags the deck with the gate's reason and pre-fills its suggested fix in
     the Regenerate box. A flagged deck is never rendered.
- **Accent action:** Generate (Carousel types and Generate).
- **Hold:** none.
- **Empty:** Carousel types has no first-run state, because lanes always exist. A lane
  whose type is not wired shows a **"Not wired" pill and an ordinary Generate**
  (Garreth, 2026-09-15, replacing "no Generate button"), so its first batch can
  be made and judged before wiring; its approved decks wait for **Wire** on the
  type's page (F11). A type that is both unwired and unwritten shows one pill
  on the card — *Needs writing* — because that is the blocking one (D13).
- **Fails:**
  - A lane already has a batch generating: its card's Generate becomes
    **Open running batch** (secondary). One active run per lane (plan §4.5).
  - Count above 50: the field caps at 50 as the person types; no message.
  - A deck's model call fails: that card shows the error and Retry; the batch
    carries on.
  - No progress for 60 seconds: the progress line turns `warn` and says which
    deck has stalled and when it last moved.
  - The tab is closed: nothing is lost; see F4.
  - The chosen library has no images in a set the template draws from:
    Generate is unavailable and the empty sets are named.
  - The type has no Writing saved: Generate is unavailable with *No writing*
    beside it, and the Writing row carries the danger stroke with **Write** in
    it (D13). The card that opened the form was an ordinary button — the form
    is where the requirement is named.
- **Writes:** `carousel_briefs` (recording the library the batch used),
  `content_batches`, `carousel_drafts`, `carousel_draft_slides`, and
  `carousel_templates` when the library is repointed.

### F2. Review what was written, and send it to the painter

*Rewritten 2026-09-21. It still described a per-deck **Approve**, an
**Approve all unflagged** and a **Withdraw approval**, none of which exist:
the per-deck approval was dropped on 2026-09-14, and since then the only
sign-off in the app is **Approve (n) decks** on the finished batch (F3). The
one press on this screen is **Render (n) decks**. D4 is the approved design.*

- **When:** every deck of a batch has been written. Phase 2.
- **Screens:** Batch (the review state, D4).
- **Steps:**
  1. A card shows the hook large, every slide's copy as a numbered list, the
     caption, the music, and the state pill. Flagged cards say why in the pill
     ("Score 5.2", "Compliance: brand name", "Track not found on TikTok").
  2. **Regenerate** at the foot of a card opens the feedback box with a
     picker — **Deck**, **Hook**, or a slide number. A whole deck waits as
     **Up next**; one slide rewrites in place while the rest stays readable.
     Either way it is a new version.
  3. A deck with more than one version carries **Version 2 of 2**: arrows on
     the card's edges on the desktop, a sideways swipe on the phone. The
     version showing is the version that counts — there is no separate "use
     this one".
  4. **Retry music lookup** is the track's own button, with a caret opening
     **Change track**, a search of the music library. A changed track is a new
     version with only the music different.
  5. **Discard deck** sits in the card's **More** menu, so twenty cards do not
     each carry a red button.
  6. **Render (n) decks** is the one press: it names its count and leaves out
     flagged decks and tracks still being checked. "3 flagged" in the progress
     line jumps from one flagged deck to the next. Nothing is written to a
     lane row on this screen.
  7. **In Auto mode (D12) this screen is skipped**: the batch renders itself
     and the person meets it again at the finished batch. Pausing hands it
     back and the press returns.
- **Accent action:** Render (n) decks.
- **Hold:** Discard deck, in the More menu.
- **Empty:** not applicable — the screen exists because there are decks.
- **Fails:**
  - The quality gate call fails: the card is Flagged "Not scored" and is left
    out of Render, like any other flagged deck.
  - Two people open the same batch: the second sees it read-only, with who is
    running it and when it last moved (plan §4.2).
- **Writes:** `carousel_drafts` (new versions) and `carousel_draft_slides`.
  **The lane row is written when the deck is rendered, not here**, and it
  carries the gate's verdict on `gatekeep_status` — never `'pending'` — with
  `approved = false` and `scheduler_ready = false` until F3's Approve.

### F3. Render and approve

- **When:** every deck is written. Phase 2. Rewritten 2026-09-15 for
  Garreth's decision that the text gate runs at writing (F1 step 6) and the
  sign-off is Approve on the finished batch.
- **Screens:** Batch.
- **Steps:**
  1. Press **Render**. It takes every written deck that is not flagged; the
     page requests one deck at a time.
  2. For each deck the painter claims its lane row (one conditional update;
     port spec §C.3), picks and persists images, paints every slide, uploads,
     and writes the URLs, `rendered_at` and the rendered state. The lane row
     carries the gate's verdict from F1 step 6, never `'pending'`.
  3. Slide thumbnails fill in on the card as they land. The progress line
     reads "4 of 12 rendered". A thumbnail opens the full-size preview.
  4. A vision check reads each rendered slide for cut-off text, overflow past
     65% of the height, poor contrast and missing glyphs. A hit Flags the
     card with the reason and a thumbnail outline on the slide.
  5. When every unflagged deck is rendered, the progress line counts rendered
     and flagged decks, and two actions appear: **Approve (n) decks**, the
     accent, for every rendered deck the checks passed; **Regenerate (n)
     decks**, secondary, for every flagged one (with the gate's suggestions
     pre-filled). Approve works while flagged decks remain.
  6. **Approve** sets `scheduler_ready = true` and `approved = true` on those
     lane rows. From that moment the Smart Scheduler, the Posting Agent and
     Inventory see them; they post on the scheduler's timetable, not now.
     Approved decks say Approved and can no longer be regenerated here.
  7. Regenerated decks rewrite (F1 step 6 runs again), render again, and
     rejoin the finished line, where Approve offers them next.
- **Accent action:** Render, then Approve (n) decks.
- **In Auto mode (D12):** the rendering starts by itself, with no Render
  press, and a deck the vision check flags is rewritten and rendered again,
  three times, then **Dropped**. The batch still stops at **Approve (n)
  decks** — Auto never approves — and rings the bell once, **Batch finished**.
- **Hold:** none.
- **Empty:** all clear once every deck is approved or discarded.
- **Fails:**
  - The claim returns nothing: the card reads "Rendering elsewhere" and
    refreshes when that finishes. Someone ran the old Python painter, or a
    second tab.
  - An image fails to download, or a library set is empty: the card is
    Failed with the slide number and Retry. Other decks continue.
  - An upload fails three times: Failed, Retry.
  - A row stuck in Rendering for more than ten minutes: **Proposed:** the
    sweeper runs when a batch page loads and when Render is pressed, not on a
    timer, and returns that lane's stuck rows to queued.
  - Approve fails part-way: the decks that did flip say Approved, the rest
    keep the button; pressing it again approves only what is left.
- **Writes:** lane table (`slide_N_url`, `rendered_at`, render state, the
  persisted manifest; on Approve `scheduler_ready`, `approved`), Storage
  buckets `glowup-renders` and `covered-eye-images/renders`; every Approve
  is audit-logged with who pressed it.

### F4. Resume a stopped batch

- **When:** a batch stopped part-way: a closed tab, a failed call, a deploy.
  Phase 2. Only batches the generator made (Garreth, 2026-09-14).
- **Screens:** History, then Batch.
- **Steps:**
  1. History's row for that batch says **Stopped**, in red, and its Written
     column says how far it got (Garreth, 2026-09-16, approving D9).
  2. Opening it shows Batch with everything already done, and **Continue**
     where the progress line was.
  3. Continue picks up the unwritten decks, or the unrendered ones, whichever
     stage it stopped in. (It used to say "the unrendered **approved** ones";
     there is no per-deck approval to pick up — corrected 2026-09-21.)
- **Accent action:** Continue, while the batch is stopped.
- **Hold:** none.
- **Empty:** not applicable.
- **Fails:** as F1 and F3.
- **Writes:** as F1 to F3.

### F5. Run a batch again

- **When:** a past batch worked and the team wants another like it. Phase 2.
- **Screens:** History, then Batch.
- **Steps:**
  1. History is a table: date, carousel type, requested, written, rendered,
     approved, and a status. Filter pills by type, a Dropdown for date range.
     The counts follow the batch as it runs, so **approved is last** — it is
     the sign-off on the finished batch (F3), and the count the Smart
     Scheduler can see. There is no "who ran it": the app shows nobody's name
     anywhere, and the status column takes that place — Done, Writing 7 of 20,
     Stopped, Not wired, a status meaning something went wrong in red
     (Garreth, 2026-09-16, approving D9). **Since D12** it also says what a
     batch is waiting for — **18 to render**, **18 to approve**, neither of
     them red — and an Auto batch carries a neutral **Auto** pill.
  2. **Run again** on a row clones lane, count, note and per-batch
     copy choices under the **current** direction version and image library, and opens the new
     batch, generating.
  3. The new brief records `rerun_of`, so History shows the pair.
- **Accent action:** none (Run again is per row, secondary).
- **Hold:** none.
- **Empty:** first run: Generate. No results: the filters echoed back, with
  Clear. Both fill the rest of the screen (Garreth, 2026-09-16).
- **Fails:** the lane has a run in progress: Run again opens that batch
  instead.
- **Writes:** as F1, plus `carousel_briefs.rerun_of`.

### F6. Edit the Writing — the standing instruction

- **When:** the copy is drifting, or the team wants a new angle for a lane.
  Phase 2 as a plain editor; Phase 3 adds the conversation.
- **Screens:** Content type, Writing tab.
- **Steps (Phase 2):**
  1. The tab shows the active Writing, its version and date, and the list
     of past versions. The template's **text-box names** are listed along the
     foot of the editor card, left of Save version — `hook`, `line`,
     `closing` — so the instruction is written against the boxes that exist
     (D14).
  2. Edit the text. **Save version** writes a new version and makes it
     active. Past versions have **Make active**.
- **Steps (Phase 3):**
  0. **On a type with nothing written** (D13b, approved 2026-09-22) the panel
     is not a blank card: it carries one offer, **Write a first draft**, made
     from the active template and its slides. The draft opens in the editor
     **unsaved**, under the same **Not saved** pill a Studio-made type's note
     gets, so the two routes to a first Writing end in the same place. The
     box asks *What should this type sound like?* until a first version is
     saved, and *What should change?* after it. The bot never saves.
  1. A conversation panel beside the Writing, down the right at full
     height. Type what should change. The bot proposes a revised instruction,
     cites any knowledge rules it drew on, asks at most one clarifying
     question, and says plainly when something the Writing cannot change —
     how the carousel *looks* — belongs in the Studio instead.
  2. The proposal appears as a diff against the active version.
  3. **Save version** saves it. The bot never saves on its own.
- **Accent action:** Save version.
- **Hold:** none; nothing is overwritten, versions are kept.
- **Empty:** first run (a lane with nothing written yet): the editor carries
  a grey placeholder showing the shape of a good instruction rather than an
  instruction to write one, gone the moment anything is typed — *who is
  speaking, and to whom · what each slide has to do · the words to use, and
  the words never to use · how the caption should read*. Save version is
  unavailable on an empty editor (D13). The conversation beside it **fills
  its card** rather than leaving a void: a muted circle, the line *Nothing
  written for this type yet.*, and the one offer above, with *from the active
  template and its n slides* under it (D13b). The offer is **secondary** —
  Save version stays the tab's one accent. **On the phone** the conversation
  is a sheet behind the floating button, so the same offer also sits under
  the empty editor, where it is met without opening the sheet; the sheet
  carries the same one, and never a third wording (D13b).
- **Pre-filled and not saved:** a type saved out of the Studio opens with the
  AI's draft note already in the editor, under a neutral **Not saved** pill.
  It does not count as written: the requirement is met by a person having
  read it and pressed Save version, not by the field being non-empty (D13).
- **Fails:** the bot call fails: the error sits under the message, with Retry.
  A first draft that does not arrive fails the same way, and the editor is
  left as it was — empty (D13b).
- **Writes:** `carousel_lane_directions`.

### F7. Browse and manage the image libraries

- **When:** checking what images a content type can draw from, or filling a
  library. Phase 2 read-only; Phase 4 new libraries, upload, generate, tag
  and retire.
- **What a library is (Garreth, 2026-09-14, revised 2026-09-16):** a
  collection of images of a character, a place, and anything else a carousel
  needs. A library belongs to no content type. A content type points at one
  library and draws from its sets. Usually one content type uses a library,
  but any other content type can be pointed at the same one (F8 to F10).
- **What a set is (Garreth, 2026-09-16):** a folder a person makes inside one
  library, replacing the groups-and-sets split of 2026-09-15. **A library
  starts with no sets at all**, and images in no set are ordinary, not a
  backlog. Sets appear only when a person makes one or asks the AI to file
  the images. A set belongs to nothing in particular: a Cover set may hold a
  dozen different people. **Sets nest one level**, which is what the live
  banks already do — `glowup_image_bank` and `covered_eye_image_bank` are
  organised `pool` then `category`, so `cover` holds `taraji`,
  `gabrielle_union` and the rest. A set organised by subject ("Maya R.")
  is a set like any other. **A set holds images and nothing else** (Garreth,
  2026-09-16): the values a template's labels quote are columns on the row the
  deck is about, in the content type's own data set, not properties of the
  folder the photographs sit in. A facts panel on a set was designed and
  rejected the same day; see `CAROUSEL-TEMPLATE-MODEL.md` §7.3 and
  `BACKLOG.md`.
- **What an image carries (Garreth, 2026-09-16):** the details the renderer
  reads when it picks an image for a slide. The headings are
  `carousel_images`'s own columns, not invented: `content` (a written
  description), `emotion`, `subject`, `setting`, `framing`, `color_palette`,
  `image_type`, `arc_roles` (a list — Hook, Before, After, Stack, Reveal,
  Payoff, Confession), `pillar`, `tags`, `quality_score` and `has_subject`.
  AI vision writes them from the picture. **Nothing is read automatically:**
  a generated image arrives untagged and stays that way until a person keeps
  it and decides to use it.
- **Screens:** Library, then one library, then a set inside it.
- **Steps:**
  1. A grid of libraries as boards: a mosaic of three of the library's own
     images, its name and its image count. Nothing else rides on a board.
     Phase 2 seeds two, from the Glow Up and Covered Eye banks, each already
     pointed at by its content type, read-only.
  2. A library shows its sets as folder cards, then the images in no set
     under **Not in a set**. Opening a set goes a level down, with a
     breadcrumb back. The library's cover image is marked where it sits.
  3. Phase 4: **New library** is a tile at the end of the grid; it asks for a
     name and creates an empty library. **New set** makes a folder at the
     level you are on.
  4. Phase 4: **Upload** adds images; they land in the library, and go into a
     set only if someone puts them there.
  5. Phase 4: **Generate images** (Garreth, 2026-09-14) makes new images with
     Higgsfield, the provider already chosen (plan §4.7). It does not depend
     on any content type, and **it never picks a set** (Garreth, 2026-09-16):
     what it makes lands in the library. The form: **Prompt**, **Base image**
     (optional — one or more of the library's own images, or one uploaded,
     which Higgsfield works from to keep a face or a place the same), **How
     many** (**Proposed:** capped at 8 per run) and **Shape**
     (**Proposed:** portrait, tall or square; the painter crops each image to
     its slide cell).
  6. Each requested image appears as a Generating tile, then fills in.
     **Proposed:** generated images wait in a review row and join the library
     only when a person presses **Keep**. **Discard** drops one. A kept image
     is untagged until it is read.
  7. Phase 4: **Tag with AI** reads a library with AI vision and writes each
     image's details. It asks two things first: which images (only the ones
     not read yet, or all) and whether to file them into sets while it is
     there. One image can also be read on its own from its modal.
  8. Phase 4: clicking any image opens it as a modal — the picture and what
     can be done to it on one side, what was read off it as metadata on the
     other, and **Retire image** in the footer. Background removal and black
     and white are automatic; an AI edit waits for Keep like a generated
     image.
  9. Phase 4: **Retire image** removes an image from future picks.
- **Accent action:** Phase 4: Upload. **Proposed:** Generate images sits
  beside it as secondary, and becomes the accent in an empty library.
- **Hold:** Retire image, because an unrendered manifest may still reference
  it. Discarding an unkept generated image is not a hold; nothing uses it yet.
- **Empty:** first run (Phase 4, a new library): Upload and Generate images,
  filling the page rather than leaving space under it. A set with nothing in
  it says so in the same way. A thin set with one image shows its count with
  no commentary. All clear: the review row is empty once every generated
  image is kept or discarded.
- **Marks:** an image nothing has been read off yet carries a small amber dot
  on its tile; a library board says how many of its images are unread.
- **Fails:**
  - An upload fails: the tile shows Failed and Retry.
  - A generation fails: that tile shows Failed and Retry; the other images
    in the run carry on.
  - Higgsfield is out of credits or unreachable: every waiting tile shows
    Failed with the reason and Retry.
  - AI vision fails on an image: its details stay empty and it keeps its dot;
    the rest of the run carries on.
- **Writes:** Phase 4 only: `image_libraries`, `image_library_images`,
  `carousel_images` (the details AI vision reads), Storage. A generated image
  also records its prompt, shape, base images and who kept it, so a good
  image can be made again.

### F8. Create a template from scratch

- **When:** Garreth has an idea for a new carousel. Phase 3.
- **Screens:** Carousel types ("New from idea", secondary), then Studio.
- **Steps:**
  1. Studio opens on three cards (Garreth, 2026-09-15): **Start from a
     reference deck** (F9), **Discuss your idea**, or **Start from a Figma
     link**. Whichever is picked, it first asks for the **Image library**
     (Garreth, 2026-09-14): an existing library, or **New library** with a
     name. **Proposed:** it is asked first so the draft and Render preview use
     real images; it can be changed at any point before saving. New library
     arrives in Phase 4 with upload and generation, so in Phase 3 only an
     existing library can be chosen.
  2. The conversation opens. Describe the idea. The chat box grows with the
     prompt, up to eight lines before it scrolls; Shift+Enter starts a new
     line and Enter sends (Garreth, 2026-09-15).
     **From a Figma link** (D11, 2026-09-15): the link attaches to the chat
     box as a chip (the file's name and frame count, with a remove button)
     and is sent together with the prompt. The conversation then keeps a small
     chip for the file above its chat box, and the file's frames sit read-only
     in a dashed frame on the canvas while the AI reads the frames and their
     layers. The app has no Figma access today, so this starts with a spike.
  3. The AI drafts a template: slide size, slide count, layouts, text boxes or
     layers, style guess, image cells each drawing from a set in the chosen
     library, and a direction note. It asks at most one question. When the
     template needs a set the library lacks, it proposes it, and nothing is
     added until Add is pressed. **What it should do when a template needs a
     value the content type's data set has no column for is not designed**
     (Garreth, 2026-09-16) — that question is parked in `BACKLOG.md`, and the
     approved D11 screens still show the old answer.
  4. Every slide sits in a row on an infinite canvas at its true shape: **4:5
     (1080 × 1350) or 9:16 (1080 × 1920)**, the only two sizes (Garreth,
     2026-09-15). The canvas pans in every direction and zooms from 25% to
     200%; pressing the zoom level fits every slide. Sample copy fills the
     text boxes.
  5. **Slide size** comes first in the adjustments. Select a text box to edit
     its font, weight, size, stroke, shadow, alignment and wrap width; drag it
     to move it.
     **Above Font sits the box's copy contract** (D14, approved 2026-09-22):
     its **Name**, which is the role the writer reads and the key the template
     saves; **Written by** — **AI**, **Fixed** or **Per batch**, and on a
     layered slide also **Set** — with a box for the words themselves when it
     is Fixed and the set's fact when it is Set; and **Fits n characters**, a
     read-back the Studio works out from the box's wrap width and the bundled
     fonts rather than taking a typed number, because a new box has no painted
     history to take a limit from. A name already used on the same slide is
     refused the way the Save dialog's short name is. Every box on the slide
     being worked on shows its name above it, so three boxes on one cover read
     as three roles. **A box is never unnamed** (Garreth, 2026-09-22): one the
     AI drafted carries its role, and one added by hand arrives named **Text
     Box 1**, counting up per slide, so nothing ever holds Generate. There is
     no per-box description — what a box is *for* is said in the type's
     Writing, with the box names listed beside that editor (D13, F6).
     Select an image cell to choose which set of the library it
     draws from. A cell whose set has no images shows "No images". New
     images are made in the library (F7), not here.
     On a **layered slide** (`CAROUSEL-TEMPLATE-MODEL.md` §7) the Layers list,
     front first, selects a layer, and Bring forward and Send back change its
     place. A text layer can sit on a box and be written by the AI or filled
     from the row the deck is about (`CAROUSEL-TEMPLATE-MODEL.md` §7.3, not
     designed yet); a cut-out is sized and placed freely; a shaped frame
     takes a shape, a border, Fill or Fit and a crop; a fixed image is
     replaced by uploading another.
     **Slides can be added, duplicated, deleted and moved** (D6 round three,
     approved by Garreth on 2026-09-17): a dashed **Add slide** slot after the last
     slide, a plus in the gap between two slides on hover, and a menu on each
     slide's caption with **Duplicate**, **Move left**, **Move right** and
     **Delete**. A new slide takes the layout of the slide before it and the
     AI writes its line; a duplicate keeps the text; a carousel keeps at
     least two slides, so Delete is unavailable at two. The conversation can
     do the same ("Make it eight slides"). In edit mode a changed slide count
     saves a new version, like a changed size.
  6. **Regenerate sample** asks for new sample copy under the current
     direction.
  7. **Render preview** runs the real painter on the selected slide and marks
     it **Rendered** in its caption (Garreth, 2026-09-15: no separate preview
     beside the canvas). Sign-off happens on the rendered slide, not on the
     HTML canvas.
  8. **Save as content type** asks for a name, a character and a slug, saves
     version 1 pointing at the chosen library, and opens the Writing with the
     draft note pre-filled but **not saved**. The type appears on Carousel
     types as Not wired and carrying a **Needs writing** pill; it can generate
     once someone has read that draft and pressed Save version (D13). **This
     is not the only route to a first draft** (D13b): a type made any other
     way arrives with nothing written, and asks its own conversation for one
     on the Writing tab (F6). Both end with an unsaved draft under the same
     **Not saved** pill.
- **Accent action:** Save as content type.
- **Hold:** Discard draft. **Decided (Garreth, 2026-09-15):** Back keeps an
  unsaved draft and the Studio reopens on it next time; Discard draft is the
  only way to drop one.
- **Empty:** first run: the three cards are the only thing on the canvas.
- **Fails:**
  - The draft call fails: the error in the conversation, with Retry.
  - Render preview fails: **Render failed** in the slide's caption, with
    Retry; the canvas is untouched.
  - The Figma link cannot be opened: its chip says "No access" and Send
    waits until the link is removed or replaced.
  - The slug is taken: the field says "Taken".
  - No library chosen: Save as content type is unavailable.
- **Writes:** `carousel_templates` (including `image_library_id`),
  `carousel_lane_directions`, and `image_libraries` when a new library is
  made.

### F9. Recreate a reference

- **When:** a reference carousel is worth copying the construction of.
  Phase 3 from a reference id; Phase 5 adds the two Trends entries.
- **Screens:** Trends, then Studio — or a reference id on its own. On Trends
  the way in is **Copy to Studio**: on a **feed post** (F15), in the **details
  window** a post opens in (F16, added 2026-09-19), or on a carousel listed
  under an analysed digest (F12). All three land in the same place with the
  same reference (Garreth, 2026-09-17). The button was called
  "Recreate this", then "Use as reference", earlier the same day; **Copy to
  Studio** is its name everywhere in this file from here on.
- **Steps:**
  1. Studio opens on **Start from a reference deck**, then the saved decks.
  2. **Image library** (Garreth, 2026-09-14): a reference comes with none, so
     one is chosen, as in F8 step 1.
  3. The reference's slides sit first on the canvas inside a dashed frame,
     read-only, with a light sweeping down each while the AI works
     (Garreth, 2026-09-15). The AI reads the reference's beats and visual
     notes from the reference library, runs a vision pass over its slides, and drafts a template with the same
     slide count, layouts and text placement, image cells drawing from sets
     in the chosen library, plus a direction note describing the
     construction.
  4. From here it is F8 from step 4. The saved template records
     `source_reference_id`.
- **Accent action:** Save as content type.
- **Hold:** Discard draft.
- **Empty:** not applicable.
- **Fails:** the reference has no analysis yet: its dashed frame says "Not
  analysed in Trends", and the draft is made from the vision pass alone.
- **Writes:** as F8.

### F10. Edit a template

- **When:** a lane's look or construction needs changing. Phase 3.
- **Screens:** Content type ("Edit template", secondary), then Studio.
- **Steps:**
  1. Studio opens the active version, with sample copy from the lane's most
     recent approved deck, drawing images from the library the content type
     points at. The library is changed on the Generate form (F1), not here.
  2. Edit as in F8 steps 5 to 7. Changing the **slide size** (4:5 or 9:16)
     is saved like any other change, as a new version; decks already made keep
     the size they were painted at (D11, 2026-09-15).
  3. **Save version** saves version N+1 and makes it active. Batches already
     generated keep the version they recorded; new batches use the new one.
  4. Past versions are listed, each with **Make active**.
- **Accent action:** Save version.
- **Hold:** Discard draft (unsaved changes).
- **Empty:** not applicable.
- **Fails:** as F8. **Proposed:** a batch generating on this lane does not
  block saving; it finishes on the version it started with.
- **Writes:** `carousel_templates`.

### F11. Wire a new content type

- **When:** a studio-made type has an approved first batch and should start
  posting. Phase 4.
- **Screens:** Content type, Go Live tab.
- **Before wiring, a type has no lane table.** **Proposed:** for an unwired
  type, Approve and Render write to the drafts only (rendered slide URLs on
  `carousel_draft_slides`), and the lane rows are written as the last step of
  wiring. This is the only way "generate and review a first batch before
  wiring" (plan §4.7) can work, since materialising needs the table.
- **Steps:**
  1. The tab lists the wiring checklist from `WIRE-NEW-CONTENT-TYPE.md`, each
     item unticked: lane table, registry row, character allow-list,
     `scheduler_ready` trigger, `unified_posts` block, `v_scheduler_pool`
     block, cadence rebalance, Smart Scheduler media entry, and music sources
     for the first batch (F14).
  2. Fill in what the runbook asks for: display name, cadence per week, and
     the rebalance (which sibling lanes give up how many, so the character
     still sums to its weekly budget). The rebalance uses the existing
     cadence editor's rules and shows the running sum.
  3. **Preview** shows exactly what will run: the table definition, the
     trigger, the registry values, the allow-list change, and the one block
     each view gains.
  4. **Wire** is a hold. It runs everything in one transaction, runs the
     runbook's seven verification queries inside that transaction, and
     commits only if all seven pass. If any fails, it rolls back and the
     checklist shows which item failed and why.
  5. On success the checklist ticks. Each approved deck of the first batch has
     its track confirmed on TikTok and Instagram (F14) and is then written to
     the new table. A deck whose track is not found stays Flagged on its card
     and is not written; the music item shows how many decks are waiting. The
     lane appears on Carousel types with its pool count.
  6. **The Smart Scheduler media entry stays a human step.** The tab shows
     the exact line to add to the `MEDIA` map in n8n, and reminds that saving
     is not publishing. **Proposed:** the tab reads the Smart Scheduler's
     published version through the n8n API and ticks the item when the slug
     is present, rather than trusting a checkbox.
- **Accent action:** none; Wire is a hold.
- **Hold:** Wire.
- **Empty:** all clear once every item is ticked.
- **Fails:**
  - A verification query fails: rolled back, nothing changed, the failing
    item named.
  - The cadence sum does not match the budget: Wire is unavailable and the
    rebalance field shows the sum.
  - The media entry is not found in the published workflow: that item stays
    unticked and the lane's card on Carousel types shows "Media map missing". The lane
    can still post, but unrendered rows could be scheduled (runbook §9).
  - **Decided (Garreth, 2026-09-14):** the dashboard has never run schema
    changes. It creates a lane through a reviewed database function that
    builds the standard shape, never through a direct database connection,
    so every table the app creates follows one checked definition.
- **Writes:** a new lane table, `content_type_registry`, `characters`,
  `unified_posts` and `v_scheduler_pool` definitions, `carousel_templates.lane`,
  the lane table's first rows.

### F12. Analyse a study digest

- **When:** a daily study digest has arrived. Phase 5.
- **Screens:** Trends, Digests pane.
- **Steps:**
  1. Digests are listed newest first down a narrow column, the open one
     readable in place beside them (D10, approved 2026-09-16). Each is counted
     in **carousels, not links**.
  2. **Analyse** on a digest: the app extracts every TikTok and Instagram
     link, matches each against the reference library, queues the new ones
     for analysis, and runs the pattern pass over the digest plus the
     analyses of its linked posts.
  3. The result lists proposed rules (the rule, the evidence lines, a
     confidence, the carousel types it applies to) and the **carousels** it
     read, each with its slides and **Copy to Studio** (F9). A rule here shows
     a Pending pill and nothing to press: accepting and rejecting are F13's
     job, on the Knowledge tab.
  4. Links still waiting for analysis show "Queued" with the time they were
     queued, and the digest can be analysed again once they land.
  5. **Videos are ignored** (Garreth, 2026-09-16): this app makes carousels.
     The filter is on the reference's `format`, not on the address, since a
     TikTok carousel and a TikTok video share the same URL shape — so a queued
     link only joins the digest's carousels if it turns out to be one. The
     body still shows every link, because the body is the email that arrived.
     The pattern pass still reads a video's analysis where one exists: a video
     can support a rule without being shown.
- **Accent action:** Analyse, on the newest unanalysed digest — this tab's
  only accent (D10) — and the page's only accent anywhere. Analyse again,
  Retry and **Copy to Studio** are all secondary here, and Copy to Studio is
  quiet on a feed post and in the details window too (F15, F16).
- **Hold:** none.
- **Empty:** first run: no digests yet, no action (they arrive on their own),
  and the block fills the screen. All clear: every digest analysed, which reads
  as the accent simply leaving the screen.
- **Fails:** the analysis call fails: the error on that digest, Retry. The
  external analysis worker is down: links stay Queued with the time they were
  queued, so a stall is visible.
- **Writes:** `study_digests.analysis`, `source_discovery_evidence`.

### F13. Accept or reject a proposed rule

- **When:** an analysed digest proposed rules. Phase 5.
- **Screens:** Trends, Knowledge pane.
- **Steps:**
  1. Proposed rules appear as pending on the **Knowledge** tab,
     filterable by lane and confidence, above the rules already accepted.
  2. **Accept** appends the rule with the digest it came from and the session
     email. The Writing conversation can now cite it.
  3. **Reject** removes it from the pending list and records nothing.
- **Accent action:** none (Accept and Reject are per rule, secondary).
- **Hold:** none; rejecting records nothing and accepting overwrites nothing.
- **Empty:** all clear: nothing pending. The block says so and stops rather
  than filling the screen, because the accepted rules sit below it (D10).
- **Fails:** the write fails: the rule stays pending with Retry.
- **Writes:** `content_knowledge_base`.

### F14. Find a new track on TikTok and Instagram

- **When:** a deck has just been written and its track is not an active
  `music_library` track with both a TikTok video and an Instagram reel.
  Phase 2, for every lane. **Corrected 2026-09-21:** this said "an *approved*
  deck's track", and the lookup was set to run after approval so discarded
  decks cost nothing. That approval was dropped on 2026-09-14 and what
  replaced it happens after the rendering — too late to stop a deck whose
  track cannot post from being painted. The lookup now runs as each deck is
  written, which is also the only timing Auto can retry against (D12).
  Garreth's decision, 2026-09-14: the writer may choose any track available
  on TikTok or Instagram, and a track missing from the library has its
  sources found first.
- **Where it sits (Garreth, 2026-09-14):** it is a step of wiring a new
  content type (F11), so no new type goes live with tracks that cannot post.
  It also runs on every deck the generator makes, Glow Up and Covered Eye
  included. Those lanes' earlier batches were made outside one pipeline, which
  is how tracks were picked without working source links. The generator
  exists to close that gap, so no deck it makes skips this step.
- **Why it is needed:** the Posting Agent attaches music from `music_library`
  only: an Instagram reel link (`same_style_url`) for Instagram and a TikTok
  video id (`tiktok_ref_video_id`) for TikTok. A carousel whose track is not
  in the library is skipped and never posts.
- **Screens:** Batch, on the card. No screen of its own.
- **Steps:**
  1. The writer names the track as `artist - title`.
  2. The app matches it against active `music_library` tracks the way the
     Posting Agent does: lower-cased, spaces collapsed.
  3. Found with both a real Instagram reel link and a TikTok video id: done.
  4. Otherwise, **TikTok:** search videos for the artist and title, then open
     up to 5 candidates, one at a time. Accept the first whose own sound data matches
     the title and artist and is not an "original sound". Its video id
     becomes `tiktok_ref_video_id`.
  5. **Instagram:** search reels for the artist and title, then open
     up to 5 candidates, one at a time. Accept the first whose music attribution
     matches the song and artist and does not use original audio. Its link
     becomes `same_style_url`.
  6. Both found: the track is added to `music_library` as active (or the
     existing row's missing link is filled) and the deck's `music` column
     gets the exact `artist - title`. The card shows a small "New track" note
     beside the music. **The lane row is written when the deck is rendered**,
     not here (corrected 2026-09-21).
  7. **A track found once is free from then on.** It is in the library, so
     every later deck that picks it — in this batch and in every future one
     — matches at step 3 and costs nothing. The lookup is paid per new track,
     not per deck.
  7. Either not found after 5 checks on that platform (Garreth, 2026-09-14):
     the card is Flagged "Track not found on TikTok" (or Instagram, or both)
     for a person to act on, and the lane row is not written.
- **Accent action:** none.
- **Hold:** none.
- **Empty:** not applicable.
- **Fails:**
  - Not found: **Retry**, or **Change track**, which rewrites only the music
    as a new version of the deck and runs this flow again.
  - The lookup service errors or is out of credits: Flagged "Music lookup
    failed", with Retry.
  - A post's caption names the track but its sound is a re-upload: rejected,
    and the next candidate is opened. Seen live on 2026-09-14 (below).
- **Writes:** `music_library`, the lookup evidence (every post opened and why
  it was accepted or rejected) in `carousel_drafts.generation_metadata`, the
  lane table.
- **What was tested, 2026-09-14,** with Summer Walker, "Karma":
  - **Instagram, end to end.** Reel search found candidates. The first reel
    opened reported song "Karma", artist "Summer Walker", not original audio,
    with an audio id. It was the same reel the library already holds for that
    track.
  - **TikTok, the rejection only.** The search returned 30 videos captioned
    with the track. The first one opened was captioned "Karma - Summer
    Walker", but its sound was "original sound - kvdysjams", a re-upload.
    That is exactly what step 4 must reject, and why the caption cannot be
    trusted. A genuine TikTok match was not found in that one test, so the
    TikTok half is designed but not yet proven.
  - Each post opened costs one Scrape Creators credit. The dashboard already
    uses that service for account profiles and top posts.
- **The library today, 2026-09-14:** of 76 active tracks, 50 have a real
  Instagram reel link. 15 hold a TikTok link where the Instagram link belongs,
  and 11 have no links at all. **Proposed:** those 26 are repaired by this
  flow when a deck chooses them, not in a separate clean-up.

### F15. Browse and search the library

*Rewritten 2026-09-19 for D10's third round (Garreth approved dark that day).
Round two's version is in git history; what it decided and round three kept
is restated here, so this section reads on its own.*

- **When:** looking for a carousel worth building a content type from, or
  checking what the library already holds on a subject or on an account. The
  feed shows carousels the library collected from **other creators, never our
  own** — like a social feed — so that a person can see what is doing well and
  recreate it in the Studio (Garreth, 2026-09-17). Phase 5, with the rest of
  Trends. It needs only the reference library, which is already full, so it
  does not wait on the digest work.
- **What the library is:** 1,252 reference carousels on 2026-09-18, collected
  by the Virlo bridge and read by the analysis workers. **Carousels only** —
  videos are filtered out here exactly as they are on the digests (Garreth,
  2026-09-16), on the reference's `format`, never on the address.
- **What can be searched:** only a carousel the workers have read. Search runs
  over the pieces of text a reading writes (slide words, caption, what each
  slide looks like, how the deck is built, its comments), so a carousel with
  no reading cannot be found by its content. On 2026-09-19 that was **1,143 of
  1,252**; 84 were unread, 24 blocked (their images could not be fetched) and
  one had no search pieces. The workers close the gap on their own, and
  **Transcribe and analyse** (F16) closes it for one carousel at once.
  Searching by **account name** works for all of them. "How it looks" reaches
  about 834 carousels and "Comments" about 710, because only one of the two
  analysis runs wrote those pieces. The screen says none of this.
- **Screens:** Trends — **Feed**, the first of the four buttons on the page's
  left rail (Feed, Digests, Knowledge, Saved), which on a phone is a floating
  bar along the bottom — then the details window (F16), then the Studio if a
  post is copied into it (F9).
- **Steps:**
  1. **Trends** in the generator's menu opens the page on **Feed**. No rail
     button carries a count. The title and the search box, the rail and the
     Recent saves panel are pinned; **only the posts scroll** (Garreth,
     2026-09-17). The posts are one column **500px wide**, centred between the
     rail (200px) and the Recent saves panel (300px), with the search box
     centred over them the same way.
  2. **A post** is shaped like an Instagram feed post: a header row with the
     platform mark, the handle, the date **only when the library knows one**,
     and **View Post** at the top right (it opens the original on TikTok or
     Instagram in a new tab); a muted line of topic tags; the slides at 4:5 as
     **a track that snaps slide to slide**, with the counter, the arrows on
     hover and the dots; then a row with **thumb up and thumb down** at the
     left (useful / not useful — pressing one fills it, pressing it again
     takes the vote back) and **Copy to Studio** and **View Details** at the
     right; then the numbers on a line of their own (`24.3k views · 1.2k likes
     · 108 saves`); then the hook as the caption with the handle in bold.
     **A number the library does not hold is left off the line, never shown as
     0.** Every button on a post is a quiet grey outline; **nothing on the
     feed is lit** (Garreth, 2026-09-17).
  3. **View Details** opens the post in the details window (F16). **Save moved
     there**: a feed post has no bookmark (Garreth, 2026-09-18).
  4. **The feed holds what this person has not seen** (Garreth, 2026-09-18),
     best-scored first among those. **Seen means the post has been on the
     screen for about a second** (Garreth, 2026-09-19); a post loaded below
     the fold and never reached does not count. A seen post stays where it is
     for the rest of the visit — nothing vanishes under the reader — and is
     gone from the feed at the next launch. It is found again by searching, or
     in Saved.
  5. Reaching the end of twenty posts fetches the next twenty, with the next
     post's outline and the busy icon while they load.
  6. **After the last unseen post** the feed reads **No more new carousels**
     with a quiet **See older carousels** button, which carries on into the
     ones already seen, **most recently seen first**, in the same pages of
     twenty. **That's every carousel** is the end of those.
  7. **With nothing new at launch**, the feed shows a small **No new
     carousels** line and, under it, the last ones seen; scrolling carries on
     into the older ones without a button, since the reader is already among
     seen posts.
  8. **When new carousels land while the page is open**, a quiet button at the
     top — **6 new carousels** — brings them in. The feed never reorders
     itself under the reader.
  9. **Saved**, on the rail, is **a grid three tiles across**, like search
     results (Garreth, 2026-09-19): each tile the post's **cover**, a small
     carousel mark and an `n slides` badge, newest saved first; a tile opens
     the details window, which is also where a post is unsaved. **Nothing
     saved yet** when there are none. **On the desktop only**, a **Recent
     saves** panel to the right of the feed lists the last five (thumbnail,
     handle, views and likes), each opening the details window, with **View
     all saves**.
  10. **Searching.** One box as wide as the posts. Inside it at the right is
      **how the search reads the library** — Meaning (the default), Exact
      words, How it's built, How it looks, Comments — and just outside it a
      round **filter** button, which shows how many filters are on (Garreth,
      2026-09-18, reversing round two's "no scope pills, no chips"). On a
      phone the box sits beside the title, and the search type is the first
      group of the filter sheet. Type, then press Enter or the search icon:
      nothing runs while typing, because a search is a round trip. One query
      searches creators and carousels together.
  11. **Filters** open as a panel under the box (a sheet from the bottom on a
      phone): **Topic**, **Hook style** and **Views**, each **a dropdown that
      starts on Any and takes one value** (Garreth, 2026-09-18), with **Clear
      all** and **Apply**. Apply runs the search again. The panel is nearly
      solid in dark and solid in light, so its labels keep their contrast over
      the photos. Filters narrow a search; they do not filter the plain feed.
  12. **While a search is on its way** the results line reads **Searching for
      "under-eye serum"** with the busy icon, over six breathing tiles.
  13. **Results replace the feed in place.** Accounts that match come first as
      a short list (handle, platform, how many of their carousels we hold,
      their best views); pressing one shows that creator's carousels as
      ordinary posts with the handle as a chip. The carousels are **a grid
      three tiles across**, each tile **the slide that matched**, with the
      carousel mark and the `n slides` badge, under a line that says what was
      found — `14 carousels for "under-eye serum" · best match first`. **A
      search returns 25 at most, so a full page reads "The 25 best matches
      for …"**, never a total the library was not asked for.
  14. **The filters a search ran with sit over its results as chips**, each
      with an **X** that takes that filter off and runs the search again, and
      **Clear all** when there is more than one (Garreth, 2026-09-18). They
      show over a search that found nothing too, where taking one off is
      usually the fix.
  15. **Pressing a tile opens the details window** (F16) on the slide that
      matched; closing it returns to the grid where it was. The X on the
      search box clears the search and brings the feed back. Searching from
      any other section switches to Feed to show the results.
- **Accent action:** **none on the feed** (Garreth, 2026-09-17). Apply, in the
  filter panel, is filled in the ordinary text colour, not the accent. The
  page's accent belongs to **Analyse**, on Digests (F12).
- **Hold:** none. A vote, a save and a filter are each undone in one press.
- **Empty:** first run: **No carousels yet** fills the screen, and only when
  the library itself is empty. No results: **Nothing matches "…"** in the
  results line and **Nothing in the library matches** where the grid would be.
  Saved with nothing in it: **Nothing saved yet**.
- **Fails:**
  - A slide's picture has expired, which the stored links do: the frame reads
    **Image gone** and the post keeps its words, its numbers and its buttons.
    A reference is never dropped because a picture went missing.
  - **The search times out or errors:** a message where the results would be —
    **The search timed out** — with **Retry**. This is a different thing from
    finding nothing, and the screen says so.
  - A page of posts fails to load: the busy outline becomes a Retry in the
    same place, and the posts already read stay where they are.
- **Writes:** `reference_favourites` on Save and unsave (in the details
  window); `reference_votes` on a thumb; `reference_seen` as posts pass under
  the reader's eye. Browsing and searching write nothing else.

### F16. Open a post: details, analysis, transcription

*Added 2026-09-19 (D10 round three).*

- **When:** a post in the feed, a tile in the search results or in Saved, or a
  row of Recent saves is worth a closer look — its numbers, what the library's
  reading says about it, the words on its slides — before copying it into the
  Studio. Phase 5.
- **Screens:** the **details window**, over the Trends page. One window,
  wherever it is opened from (Garreth, 2026-09-18).
- **Steps:**
  1. The window opens with the **slides at the left**, 4:5, swipeable, with
     the arrows, the counter and the dots — on the slide that matched, when it
     was opened from a search result — and at the right the platform mark, the
     handle, the topic line, and an **X at the upper right** that closes it
     back to wherever it was opened from. Along the foot: **thumb up, thumb
     down, Save** at the left, **View Post** and **Copy to Studio** at the
     right. All quiet.
  2. **Three tabs: Details, Analysis, Transcription** (Garreth, 2026-09-19).
  3. **Details:** Views, Likes and Saves as three cells; then Posted, Platform
     and Slides; then the whole caption. **A number or a date the library does
     not hold reads Unknown, never 0.** Every carousel's posted date is blank
     today.
  4. **Analysis** is what the library's reading says about the deck, as
     **groups that open and close** (Garreth, 2026-09-19): **Summary** (open
     when the tab opens), **How it works**, **Reusable pattern** and
     **Audience response** (shut). A header is its name and a caret, **with no
     counts or other small text**. More than one can be open at once. Over
     them, the reading's own state — **Complete**, **Partial** or **Blocked**
     — and "Read by the model" with the date.
     - *Summary:* the short values, two across — Topic, Angle, Hook, Story,
       Tone, Look, and the slide the product first shows on. They are stored
       as code words (`outcome_preview`); the screen shows plain words.
     - *How it works:* Why it hooks, Opener, Payoff and Call to action with
       their slide, and Proof, as sentences.
     - *Reusable pattern:* what to **Keep**, and its **Limits**.
     - *Audience response:* themes and questions read from the comments, or
       **Too few comments to read**.
     - **A row the library has nothing for is left out, never shown blank.**
       The newer of the two analysis runs (309 carousels) records only the
       hook, the story and the call to action, so its tab has fewer rows and
       no pattern or audience group.
  5. **Transcription** is each slide in the deck's order: its words, a muted
     line saying what the slide shows, and its job in the story (Setup,
     Problem, Turn, Proof, Payoff, Call to action), with **All 6 slides read**
     — or **4 of 6 slides read** — at the top. **A slide with no words says
     "No words on this slide"; the screen never invents copy.** The first
     slide is labelled **Opening slide**.
  6. **A part-read deck keeps every row of its analysis.** Partial means the
     worker could only fetch some of the slides, not that the analysis is
     short: the label reads Partial and the transcription says how many.
  7. **Not read yet:** both tabs show **Not transcribed or analysed yet** and
     one quiet button, **Transcribe and analyse**. It is one button because
     the reading does both in one pass (Garreth asked for two; one pass makes
     two pointless). Pressing it starts the reading **at once**; the tabs fill
     in as it goes — "Reading slide 3 of 7" — and **the result is kept on the
     carousel, for everyone**, not for the person who pressed it, so it is
     paid for once and the carousel becomes searchable (F15).
  8. **On a phone** the window fills the screen. The **slides stay pinned
     under the header**; the tabs and what they hold are a **sheet that rides
     up over the slides as the reader scrolls**, until a strip of the slide is
     left, and lets go again on the way back down; a grab bar at its top does
     the same on a press (Garreth, 2026-09-19). The header and the foot never
     move.
  9. **Copy to Studio** hands over to F9 with this reference.
- **Accent action:** none.
- **Hold:** none.
- **Empty:** the not-read-yet state above.
- **Fails:**
  - **Blocked:** the slides could not be fetched. The tab reads **Blocked**
    and **The slides could not be fetched**, with **Try again**, because the
    pipeline can fetch expired media afresh.
  - **The reading failed:** **The analysis failed**, with **Retry**.
- **Writes:** `reference_favourites`, `reference_votes`; and, on Transcribe
  and analyse, a job for the analysis worker, whose results land in
  `reference_beats`, `reference_analysis` and `carousel_search_documents` as
  they do for every other carousel.

### F18. Read the lane — what is sitting there, and why it cannot post

- **When:** a lane says nothing is postable and the count does not explain it.
  Inventory gives the number; the batch page says what the generator did in
  one run; neither says a row is sitting there with no caption. Phase 2 — it
  reads a table that already exists, and it is most useful on the pile that is
  already there.
- **Screens:** Content type, **Rows** tab (`?tab=rows`).
- **Read-only** (Garreth, 2026-09-21, reaffirmed at approval 2026-09-22).
  Every change to a row happens where it already happens: the batch page,
  Approve (n) decks, the scheduler. The tab has no accent button, and nothing
  on it writes.
- **Steps:**
  1. The tab lists the rows of this type's lane table, newest first, fifty a
     page, with a line of counts above them — *240 rows · 0 ready to post*.
     The table's own name sits quietly to the right of the counts, so this tab
     and Go Live's checklist name the same thing.
  2. **A fixed set of columns, not the whole table**: slide 1 as a thumbnail,
     the id, the caption, the music, the posting date and the profile where
     there are any, and the status. These tables are 32 to 66 columns wide and
     no two are alike, so the rest waits in the drawer.
  3. **The status column says why a row cannot post, in words**: **Ready**,
     **No caption**, **Not gatekept**, **Not rendered**, **Assigned**,
     **Posted**. This is the point of the tab.
  4. A whole row opens a **drawer** with every column that row has, in the
     table's own order, an empty one shown as a dash — an empty column is the
     answer to why the row cannot post, so it is never left out. The drawer
     comes in from the side on the desktop, so the table is still read behind
     it; on the phone it is the sheet Preview and the Conversation use, with
     each column's name over its value.
  5. The drawer ends on one secondary button, **Open the deck**, pinned under
     the scrolling columns. It opens that deck in the batch it came from — a
     lane row exists only once its batch was rendered and approved, so that is
     always a finished batch (F3). **The button changes nothing**; it points
     at the screen that already owns the fixing.
- **What the status means, and why its tone is what it is.** The colour splits
  on one question: *is anything going to happen to this row by itself?*
  - **Ready** — green. Nothing is wrong. This is the number the counts line
    counts.
  - **Not rendered** — neutral. The renderer has it. A row with no slide 1 has
    an empty dashed frame where its thumbnail would be, so the picture says
    the same thing one column earlier.
  - **Assigned** — neutral. The Smart Scheduler has taken it, with a date and
    a profile.
  - **Posted** — neutral. Done, and gone.
  - **No caption** — amber. Stuck. Nothing but a person will fill it.
  - **Not gatekept** — amber. Stuck. The nightly Pre-Publish Gate audits only
    rows whose `gatekeep_status` is NULL, so a `'pending'` row is invisible to
    it forever (73 of them on Covered Eye, 2026-09-15).
  No new pill colour: green, amber and neutral are the screen's own.
- **The two amber ones are inherited, not made here.** Under the new design a
  deck that fails at writing is **flagged in its batch and no lane row is
  written** (F2), and the lane row carries the gate's verdict, never
  `'pending'` (§3). So the generator cannot add a row in either state. The
  rows that are in them came from the old n8n path, and those rows have **no
  batch**, so their drawer has no **Open the deck** button — their `batch`
  column reads as a dash, which says why.
- **Accent action:** none. The header's Generate is the page's, as on every
  tab.
- **Hold:** none. Nothing here deletes or changes a row.
- **Empty:**
  - **A type that has not gone live** has no lane table to read. The empty
    state fills the card down to the bottom of the screen: *No rows until this
    type goes live*, with a secondary **Go Live** that switches tabs. No
    counts line, because there is no table to count.
  - **A type that is live with nothing in it yet**: the counts line reads
    *0 rows · 0 ready to post*, and the empty state under it says *No rows
    yet*. The difference between the two reads at a glance.
- **Fails:** the lane table cannot be read (a type wired outside the app, or a
  table renamed): the tab says so where the counts line goes, with **Retry**.
  It never falls back to an empty table, which would read as "nothing here".
- **Writes:** nothing. This flow is read-only.

---

## 3. Rules that apply to every flow

- Slide copy and model output render as plain text, never as HTML. Source and
  model text are untrusted (carousel-search handover).
- No instruction copy on screens. Formats live in placeholders; cautions live
  in holds; explanations live in the changelog.
- Every failure carries Retry on the thing that failed, next to it.
- A deck card is `rounded-card p-5 bg-card border border-border`; the deck
  being edited is the same card with `.glass`. Counts use `.tnum`.
- Cards arriving may stagger in at 30 to 50 ms; nothing scales from zero;
  reduced motion is respected.
- Every icon-only control has a label, focus rings stay, tab order matches
  visual order.
- The generator writes `gatekeep_status` only as the Content Risk Gate's
  verdict, never `'pending'` (the nightly gate ignores `'pending'` rows
  forever). `approved = true` and `scheduler_ready = true` are written only
  by Approve (n) decks on the finished batch (Garreth, 2026-09-15).

---

## 4. Answers needed for sign-off

**Decided (Garreth, 2026-09-14)**

1. A finished deck waiting at gatekeeping is **Generated**. *(Revised
   2026-09-15: the gate runs at writing; a rendered deck waits as Rendered
   and becomes **Approved** on Approve (n) decks. See F3.)*
2. Glow Up's closing line is always the fixed one.
3. Covered Eye's slide 1 is the hook, so `hook_text` always holds it.
4. The writer may choose any track on TikTok or Instagram. A track missing
   from the library has its TikTok and Instagram sources found before the deck
   is handed off (F14). This is a step of wiring a new content type (F11), and
   it runs on every deck the generator makes, so no lane is left with tracks
   that cannot post.
5. The music lookup checks up to 5 posts per platform, then flags the deck
   for a person (F14).
6. Wiring creates a lane through a reviewed database function, never a direct
   database connection (F11).
7. An image library belongs to no content type. A content type points at one
   library, and several may share one. Generating images inside a library does
   not depend on any content type (F7, Phase 4).
8. Creating a content type, from an idea or a reference, asks which image
   library it uses (F8, F9). Generating a batch for an existing content type
   shows its library with Change to repoint it, or asks for one when it has
   none (F1).
9. The generator has its own left menu, with ← Dashboard back to the Generate
   hub. Its items are named Carousel types and History (§1).

Nothing is left to decide before the screens.

**Decided (Garreth, 2026-09-17)**

10. Trends opens on **Feed**, a feed of the reference library, with one search
    box centred over it, as wide as the posts and with no scope pills; one
    query searches creators and carousels together, and the carousels come
    back as a grid of three tiles across, a tile opening that post alone with
    **Back to results** (F15). **Saved**, Digests and
    **Knowledge** are the other three buttons on the page's left rail, none
    of them carrying a count (F15). Carousels only, as before.
11. The hand-off button is called **Copy to Studio** everywhere, after a day
    that also tried "Recreate this" and "Use as reference" (F9, F12, F15).
12. Favourites are personal to the person who saved them, newest saved first,
    and they are listed back in the **Saved** section, with the desktop's
    **Recent saves** panel as a shortcut into it (F15).
13. A post carries **no Share and no Open source button**; the handle is what
    opens that creator's carousels. *(Answered 2026-09-17, in the fourth
    review: a quiet **View Post** button at the top right of every post opens
    it on its own platform, from `references_unified.source_url`. The slides
    swipe sideways on the desktop too, as a track that snaps slide to slide.
    See F15.)*

**Decided (Garreth, 2026-09-18 and 2026-09-19, D10 round three)**

14. The search box gains **how the search reads the library** (Meaning, Exact
    words, How it's built, How it looks, Comments) and a **filter** button;
    the filters are **Topic, Hook style and Views, each a dropdown that starts
    on Any and takes one value**, and the ones a search ran with sit over its
    results as **chips with an X**. This reverses item 10's "no scope pills"
    (F15).
15. A post opens in **one details window** — slides at the left, an X at the
    upper right, **Details, Analysis and Transcription** as tabs — from a feed
    post's **View Details**, a results tile, a Saved tile or a recent save. It
    replaces "a tile opening that post alone with Back to results" in item 10
    (F16).
16. **Useful and not useful** are a thumb up and a thumb down, on every post
    and in the details window (F15, F16).
17. On a post **View Details takes Save's place**; Save lives in the details
    window. **Saved is a grid**, like the search results (F15).
18. **The feed holds what the person has not seen**, and **seen means on the
    screen for about a second**. After the last unseen post: **No more new
    carousels** and **See older carousels**. With nothing new: **No new
    carousels** over the last ones seen (F15).
19. **Analysis is groups that open and close**, Summary open and the rest
    shut, their headers carrying no counts; **Transcription is a tab of its
    own**. A carousel not read yet offers one **Transcribe and analyse**
    button, whose result is kept on the carousel for everyone (F16).
20. On a phone the details are **a sheet that rides up over pinned slides**
    (F16).

**Proposed defaults, accepted unless changed**

8. ~~Approve writes the lane row after a 5-second window~~ — **dead since
   2026-09-14**: there is no per-deck Approve. The lane row is written when
   the deck is rendered (F2, F3).
9. Redo on one slide creates a new version (F2).
10. Keyboard on the batch page: **J and K** move between cards and **R**
    opens the focused card's feedback box (D4). The `A` for approve is gone
    with the press it belonged to.
11. ~~Withdraw approval, as a hold, until rendering starts~~ — **dead since
    2026-09-14**, for the same reason. Rejection after rendering happens at
    gatekeeping, outside the app, as it does today.
12. The stuck-row sweeper runs on page load and on Render, not on a timer (F3).
13. A template edit does not interrupt a batch already generating (F10).
14. Unwired types approve and render into drafts; lane rows are written at
    wiring (F11).
15. The Go Live tab checks the n8n media entry against the published
    workflow (F11).
16. **The music lookup runs as each deck is written** (Garreth, 2026-09-21,
    replacing "runs at approval", whose approval was dropped on 2026-09-14).
    It is what the screens already assume — D3 flags "Track not found on
    TikTok" while the batch writes, D4 offers Retry music lookup — and the
    only timing Auto can retry against. The cost is per new track, not per
    deck, because a track found once is in the library (F14).
17. The 26 library tracks with a missing or wrong link are repaired when a
    deck chooses them (F14).
18. Glow Up's `transition_line` stops being written, since no slide draws it
    (`CAROUSEL-TEMPLATE-MODEL.md` §5).
19. Library generation makes up to 8 images per run, offers portrait, tall or
    square, and a generated image joins the library only when a person presses
    Keep (F7).
20. The Studio asks for the image library first, so the draft and Render
    preview use real images (F8).
21. Repointing a content type on the Generate form is saved as a new template
    version, so later batches use that library too (F1).
22. Generate is unavailable while the chosen library has no images in a set
    the template draws from (F1).
