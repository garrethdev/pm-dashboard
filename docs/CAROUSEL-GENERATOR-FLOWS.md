# Carousel Generator — flows

**Status:** Phase 1 deliverable of `CAROUSEL-GENERATOR-PLAN.md` §9. Written
2026-09-14 for Garreth's sign-off. **Nothing here is built.** Screens are
designed from this document; code is written only after both are signed off.

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
| Flagged | `warn` | Score below 6.0, a compliance hit, or its track could not be found on TikTok or Instagram. Still approvable; a deck whose track is not found is not handed off. |
| Approved | `ok` | A person accepted the copy |
| Rendering | `accent` | The painter has claimed the row |
| Rendered | `ok` | Every slide uploaded and on the lane row |
| Generated | `ok` | Lane row complete, waiting at gatekeeping outside the app |
| Failed | `danger` | The last attempt errored; Retry is on the card |

**Decided (Garreth, 2026-09-14): the last state is "Generated".** The plan
first called it "Ready", which clashes with `posting_status = 'Ready'`
(*scheduled for today*) everywhere else in the dashboard. The copy stage says
Writing and Written, so on a card "Generated" only ever means the whole deck
is finished.

---

## 1. Screen inventory

| Screen | Route | Phase | Accent action | Hold |
|---|---|---|---|---|
| Lanes | `/carousel-generator` | 2 | Generate, on the lane with the fewest days of cover | — |
| Generate | `/carousel-generator/generate?lane=` | 2 | Generate | — |
| Batch | `/carousel-generator/batches/[id]` | 2 | Render approved, once anything is approved | Discard deck; Withdraw approval |
| History | `/carousel-generator/history` | 2 | Only in the first-run empty state: Generate | — |
| Content type | `/carousel-generator/types/[slug]` | 2 | Generate | — |
| · Direction tab | same, `?tab=direction` | 2 plain, 3 conversation | Save version | — |
| · Wiring tab | same, `?tab=wiring` | 4 | none; the run is itself a hold | Wire |
| Library | `/carousel-generator/library` | 2 read-only, 4 editable | Phase 4: Upload | Phase 4: Retire image |
| Studio | `/carousel-generator/studio`, `/studio/[template]` | 3 | Save as content type, or Save version | Discard draft |
| Trends | `/carousel-generator/trends` | 5 | Analyse, on the newest unanalysed digest | — |

All screens work in dark and light mode, like every other page of the
dashboard (Garreth, 2026-09-14). Dark is designed first; light uses the same
token names. Same shell, Topbar breadcrumb. At phone width the
deck grid is one column, batch actions become a bottom bar, and nothing
scrolls sideways.

---

## 2. Flows

### F1. Generate a batch

- **When:** a lane is running low. Phase 2, for Glow Up and Covered Eye.
- **Screens:** Lanes, then Generate, then Batch.
- **Steps:**
  1. Lanes shows one card per lane: name, character, postable count and days
     of cover (from `v_scheduler_pool` and cadence), last batch date, 28-day
     median views. Live lanes first, retired lanes in a collapsed group.
  2. Press Generate on a card. Generate opens with the lane filled in.
  3. The form: **How many** (a number, pre-filled with the lane's 14-day
     shortfall, capped at 50), **Images from** (a Dropdown of folders tagged
     for this lane), **Direction** (the active version shown read-only, with
     its version number and a link to the Direction tab), **Note** (one line,
     optional), and for Glow Up the per-batch choices from the template: **Opening line**
     (Fixed or Written) and the **Datestamp** (a month and year). The closing
     line is always the fixed one (Garreth, 2026-09-14), so it is not a field.
  4. Press Generate. The app creates the brief, the `content_batches` row
     and one empty deck card per requested deck, then opens Batch.
  5. Batch requests decks one at a time. Each card fills in as its copy
     arrives. The progress line reads "7 of 20 written" and is announced
     politely to screen readers.
- **Accent action:** Generate (Lanes and Generate).
- **Hold:** none.
- **Empty:** Lanes has no first-run state, because lanes always exist. A lane
  whose type is not wired shows a "Not wired" pill and no Generate button.
- **Fails:**
  - A lane already has a batch generating: its card's Generate becomes
    **Open running batch** (secondary), and the page accent moves to the
    next lane. One active run per lane (plan §4.5).
  - Count above 50: the field caps at 50 as the person types; no message.
  - A deck's model call fails: that card shows the error and Retry; the batch
    carries on.
  - No progress for 60 seconds: the progress line turns `warn` and says which
    deck has stalled and when it last moved.
  - The tab is closed: nothing is lost; see F4.
- **Writes:** `carousel_briefs`, `content_batches`, `carousel_drafts`,
  `carousel_draft_slides`.

### F2. Review and approve

- **When:** decks are arriving on a batch. Phase 2.
- **Screens:** Batch.
- **Steps:**
  1. A card shows the hook large, every slide's copy as a numbered list, the
     caption, the music, and the state pill. Flagged cards say why in the pill
     ("Score 5.2", "Compliance: brand name", "Track not found on TikTok").
  2. **Approve** on a card. **Proposed:** the lane row is written 5 seconds
     later, not at once; pressing the card's Approve again inside that window
     cancels it. The card shows Approved immediately. When the window closes,
     the deck's track is checked against the music library; a track that is
     new, or missing a link, is found on TikTok and Instagram first (F14). The
     lane row is written only once both are found.
  3. **Approve all unflagged** approves every Written card at once and shows
     a toast with **Undo** for 5 seconds; nothing is written until the toast
     closes.
  4. **Redo** on a card writes version 2 of that deck. The previous version
     stays reachable from a version switcher on the card.
  5. **Redo slide** on a single slide rewrites that slide with the rest of
     the deck as context. **Proposed:** this also creates a new version, with
     only that slide changed, so "which version was approved" is always one
     row.
  6. Approve and Redo are pressed dozens of times per batch: press feedback
     only, no other motion. **Proposed:** keyboard `A` approve, `R` redo,
     `J` and `K` next and previous card.
- **Accent action:** none until something is approved; then Render approved
  (F3).
- **Hold:**
  - **Discard deck**, on a card that is not approved.
  - **Withdraw approval** (**Proposed**), on an approved card whose lane row
    has not yet been claimed for rendering. It deletes that lane row and
    returns the card to Written, so Redo is available again. Once rendering
    has started, withdrawing is not offered; rejection then happens at
    gatekeeping, outside the app, as today.
- **Empty:** all clear, once every card is approved or discarded.
- **Fails:**
  - The quality gate call fails: the card is Flagged "Not scored" and stays
    approvable.
  - Two people open the same batch: the second sees it read-only, with who is
    running it and when it last moved (plan §4.2).
- **Writes:** `carousel_drafts` (`human_approved`, `approved_by`,
  `approved_at`, new versions), `carousel_draft_slides`, the lane table on
  materialise (`glowup_decks` with `render_status = 'queued'`,
  `covered_eye_carousel` with `status = 'scripted'`, both with
  `gatekeep_status = 'pending'`, `approved = false`, `scheduler_ready = false`).

### F3. Render

- **When:** at least one deck is approved. Phase 2.
- **Screens:** Batch.
- **Steps:**
  1. Press **Render approved**. The page requests one deck at a time.
  2. For each deck the painter claims its lane row (one conditional update;
     port spec §C.3), picks and persists images, paints every slide, uploads,
     and writes the URLs, `rendered_at` and the rendered state.
  3. Slide thumbnails fill in on the card as they land. The progress line
     reads "4 of 12 rendered".
  4. A vision check reads each rendered slide for cut-off text, overflow past
     65% of the height, poor contrast and missing glyphs. A hit Flags the
     card with the reason and a thumbnail outline on the slide.
  5. When every approved deck is Generated, the progress line says how many
     went into the pool and links to Inventory.
- **Accent action:** Render approved.
- **Hold:** none.
- **Empty:** all clear once everything approved is Generated.
- **Fails:**
  - The claim returns nothing: the card reads "Rendering elsewhere" and
    refreshes when that finishes. Someone ran the old Python painter, or a
    second tab.
  - An image fails to download, or a pool is empty: the card is Failed with
    the slide number and Retry. Other decks continue.
  - An upload fails three times: Failed, Retry.
  - A row stuck in Rendering for more than ten minutes: **Proposed:** the
    sweeper runs when a batch page loads and when Render is pressed, not on a
    timer, and returns that lane's stuck rows to queued.
- **Writes:** lane table (`slide_N_url`, `rendered_at`, render state, the
  persisted manifest), Storage buckets `glowup-renders` and
  `covered-eye-images/renders`.

### F4. Resume a stopped batch

- **When:** a batch stopped part-way: a closed tab, a failed call, a deploy.
  Phase 2. Only batches the generator made (Garreth, 2026-09-14).
- **Screens:** History, then Batch.
- **Steps:**
  1. History marks the batch's row as stopped, with what was done ("12 of 20
     written, 5 approved").
  2. Opening it shows Batch with everything already done, and **Continue**
     where the progress line was.
  3. Continue picks up the unwritten decks, or the unrendered approved ones,
     whichever stage it stopped in.
- **Accent action:** Continue, while the batch is stopped.
- **Hold:** none.
- **Empty:** not applicable.
- **Fails:** as F1 and F3.
- **Writes:** as F1 to F3.

### F5. Run a batch again

- **When:** a past batch worked and the team wants another like it. Phase 2.
- **Screens:** History, then Batch.
- **Steps:**
  1. History is a table: date, lane, requested, approved, rendered,
     generated, who ran it. Filter pills by lane, a Dropdown for date range.
  2. **Run again** on a row clones lane, count, folder, note and per-batch
     copy choices under the **current** direction version, and opens the new
     batch, generating.
  3. The new brief records `rerun_of`, so History shows the pair.
- **Accent action:** none (Run again is per row, secondary).
- **Hold:** none.
- **Empty:** first run: Generate. No results: the filters echoed back, with
  Clear.
- **Fails:** the lane has a run in progress: Run again opens that batch
  instead.
- **Writes:** as F1, plus `carousel_briefs.rerun_of`.

### F6. Edit the standing direction

- **When:** the copy is drifting, or the team wants a new angle for a lane.
  Phase 2 as a plain editor; Phase 3 adds the conversation.
- **Screens:** Content type, Direction tab.
- **Steps (Phase 2):**
  1. The tab shows the active direction, its version and date, and the list
     of past versions.
  2. Edit the text. **Save version** writes a new version and makes it
     active. Past versions have **Make active**.
- **Steps (Phase 3):**
  1. A conversation panel beside the direction. Type what should change. The
     bot proposes a revised direction, cites any knowledge rules it drew on,
     asks at most one clarifying question, and says plainly when something
     cannot be changed by direction.
  2. The proposal appears as a diff against the active version.
  3. **Save version** saves it. The bot never saves on its own.
- **Accent action:** Save version.
- **Hold:** none; nothing is overwritten, versions are kept.
- **Empty:** first run (a lane with no direction yet): Save version on an
  empty editor.
- **Fails:** the bot call fails: the error sits under the message, with Retry.
- **Writes:** `carousel_lane_directions`.

### F7. Browse and manage the library

- **When:** checking what images a lane can draw from. Phase 2 read-only;
  Phase 4 upload, tag and retire.
- **Screens:** Library, then a folder.
- **Steps:**
  1. A grid of folders: cover image, count, lane, role tags. Phase 2 seeds
     them from the two banks' pools, read-only.
  2. A folder shows its images as a grid, covers marked.
  3. Phase 4: **Upload** adds images to the folder; each can be tagged.
  4. Phase 4: **Retire image** removes an image from future picks.
- **Accent action:** Phase 4: Upload.
- **Hold:** Retire image, because an unrendered manifest may still reference
  it.
- **Empty:** first run (Phase 4, a new folder): Upload. No results (a tag
  filter): the tags echoed back. A pool with one image shows its count with
  no commentary; the thin pools are visible as numbers.
- **Fails:** an upload fails: the tile shows Failed and Retry.
- **Writes:** Phase 4 only: `image_folders`, the bank tables, Storage.

### F8. Create a template from scratch

- **When:** Garreth has an idea for a new carousel. Phase 3.
- **Screens:** Lanes ("New from idea", secondary), then Studio.
- **Steps:**
  1. Studio opens empty, with the conversation open. Describe the idea.
  2. The AI drafts a template: slide count, layouts, text boxes, style guess,
     image slots with a pool or a generation prompt, and a direction note. It
     asks at most one question.
  3. The canvas shows slide 1 at true aspect ratio; the filmstrip shows the
     rest. Sample copy fills the text boxes.
  4. Select a text box to edit its font, weight, size, stroke, shadow,
     alignment and wrap width in the inspector; drag it to move it. Select an
     image cell to point it at a folder or edit its generation prompt.
  5. **Regenerate sample** asks for new sample copy under the current
     direction.
  6. **Render preview** runs the real painter on the current slide and shows
     the exact output beside the canvas. Sign-off happens on this, not on the
     HTML canvas.
  7. **Save as content type** asks for a name, a character and a slug, saves
     version 1, creates the standing direction, and the type appears on Lanes
     as Not wired.
- **Accent action:** Save as content type.
- **Hold:** Discard draft.
- **Empty:** first run: the conversation input is the only thing on the
  canvas.
- **Fails:**
  - The draft call fails: the error in the conversation, with Retry.
  - Render preview fails: the error in place of the preview, with Retry; the
    canvas is untouched.
  - The slug is taken: the field says "Taken".
- **Writes:** `carousel_templates`, `carousel_lane_directions`.

### F9. Recreate a reference

- **When:** a reference carousel is worth copying the construction of.
  Phase 3 from a reference id; Phase 5 adds the Trends entry.
- **Screens:** Trends ("Recreate this") or a reference id, then Studio.
- **Steps:**
  1. Studio opens with the reference's slides in a strip above the canvas.
  2. The AI reads the reference's beats and visual notes from the library,
     runs a vision pass over its slides, and drafts a template with the same
     slide count, layouts and text placement, plus a direction note
     describing the construction.
  3. From here it is F8 from step 3. The saved template records
     `source_reference_id`.
- **Accent action:** Save as content type.
- **Hold:** Discard draft.
- **Empty:** not applicable.
- **Fails:** the reference has no analysis yet: the strip shows the slides
  and "Not analysed", and the draft is made from the vision pass alone.
- **Writes:** as F8.

### F10. Edit a template

- **When:** a lane's look or construction needs changing. Phase 3.
- **Screens:** Content type ("Edit template", secondary), then Studio.
- **Steps:**
  1. Studio opens the active version, with sample copy from the lane's most
     recent approved deck.
  2. Edit as in F8 steps 4 to 6.
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
- **Screens:** Content type, Wiring tab.
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
     lane appears on Lanes with its pool count.
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
    unticked and the lane's card on Lanes shows "Media map missing". The lane
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
  1. Digests are listed newest first, each readable in place.
  2. **Analyse** on a digest: the app extracts every TikTok and Instagram
     link, matches each against the reference library, queues the new ones
     for analysis, and runs the pattern pass over the digest plus the
     analyses of its linked posts.
  3. The result lists proposed rules (the rule, the evidence lines, a
     confidence, the lanes it applies to) and the referenced posts, each with
     its slides and **Recreate this** (F9).
  4. Links still waiting for analysis show "Queued", and the digest can be
     analysed again once they land.
- **Accent action:** Analyse, on the newest unanalysed digest.
- **Hold:** none.
- **Empty:** first run: no digests yet, no action (they arrive on their own).
  All clear: every digest analysed.
- **Fails:** the analysis call fails: the error on that digest, Retry. The
  external analysis worker is down: links stay Queued with the time they were
  queued, so a stall is visible.
- **Writes:** `study_digests.analysis`, `source_discovery_evidence`.

### F13. Accept or reject a proposed rule

- **When:** an analysed digest proposed rules. Phase 5.
- **Screens:** Trends, Knowledge base pane.
- **Steps:**
  1. Proposed rules appear as pending, filterable by lane and confidence.
  2. **Accept** appends the rule with the digest it came from and the session
     email. The Direction conversation can now cite it.
  3. **Reject** removes it from the pending list and records nothing.
- **Accent action:** none (Accept and Reject are per rule, secondary).
- **Hold:** none; rejecting records nothing and accepting overwrites nothing.
- **Empty:** all clear: nothing pending.
- **Fails:** the write fails: the rule stays pending with Retry.
- **Writes:** `content_knowledge_base`.

### F14. Find a new track on TikTok and Instagram

- **When:** an approved deck's track is not an active `music_library` track
  with both a TikTok video and an Instagram reel. Phase 2, for every lane.
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
     existing row's missing link is filled), the deck's `music` column gets
     the exact `artist - title`, and the lane row is written. The card shows a
     small "New track" note beside the music.
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
- The generator never writes `approved = true`, `gatekeep_status = 'approved'`
  or `scheduler_ready = true` on a lane row.

---

## 4. Answers needed for sign-off

**Decided (Garreth, 2026-09-14)**

1. A finished deck waiting at gatekeeping is **Generated**.
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

Nothing is left to decide before the screens.

**Proposed defaults, accepted unless changed**

7. Approve writes the lane row after a 5-second window, for single and bulk
   approvals alike (F2).
8. Redo on one slide creates a new version (F2).
9. Keyboard `A`, `R`, `J`, `K` on the batch page (F2).
10. Withdraw approval, as a hold, until rendering starts (F2).
11. The stuck-row sweeper runs on page load and on Render, not on a timer (F3).
12. A template edit does not interrupt a batch already generating (F10).
13. Unwired types approve and render into drafts; lane rows are written at
    wiring (F11).
14. The wiring tab checks the n8n media entry against the published workflow
    (F11).
15. The music lookup runs at approval, not while the copy is being written,
    so discarded decks cost no lookups (F14).
16. The 26 library tracks with a missing or wrong link are repaired when a
    deck chooses them (F14).
17. Glow Up's `transition_line` stops being written, since no slide draws it
    (`CAROUSEL-TEMPLATE-MODEL.md` §5).
