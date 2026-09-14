# Carousel Generator — development tickets

**Status:** final, 2026-09-14 (Garreth). Written on the assumption that the
design step (`CAROUSEL-GENERATOR-DESIGN-TICKETS.md`, D1 to D10) is finished
and signed off. **Nothing here is built.** The questions still to answer are
listed at the end, each with the ticket it holds up; none of them holds up
Phase 2. Each ticket is one piece of work a developer or
a build session can pick up, finish, and verify on its own.

Companion documents, read before starting any ticket:

| Document | What it gives the build |
|---|---|
| `CAROUSEL-GENERATOR-PLAN.md` | Why, the architecture (§4), the data model (§5), the phases (§9) |
| `CAROUSEL-GENERATOR-FLOWS.md` | What every screen does, step by step (F1 to F14), and the deck state words |
| `CAROUSEL-GENERATOR-DESIGN-TICKETS.md` | The approved screens (D1 to D10) |
| `CAROUSEL-TEMPLATE-MODEL.md` and `carousel-templates/*.v1.json` | The contract the painter and the Studio share |
| `CAROUSEL-RENDERER-PORT-SPEC.md` | The exact layout numbers, the race guard, the bugs not to port |
| `WIRE-NEW-CONTENT-TYPE.md` (workspace root) | What a lane needs before the rest of the system can see it |

## How the tickets are ordered

**By build phase, then by dependency.** The design tickets follow the path a
person takes through the tool; the build follows the plan's phase order
(Garreth, 2026-09-14): the middle of the pipeline first, so Glow Up and
Covered Eye are restocked before the Studio exists. Inside a phase, a ticket
comes after everything it depends on.

| Phase | Tickets | Ends with |
|---|---|---|
| 0. Prerequisites | DEV-00 | Keys, access and dependencies in place |
| 2. The middle | DEV-01 to DEV-20 | A generator-made batch for each of Glow Up and Covered Eye, posted live |
| 3. The front | DEV-21 to DEV-26 | A new carousel type made in the Studio, first batch reviewed, not yet wired |
| 4. The back | DEV-27 to DEV-31 | That type wired and posting; libraries fillable by upload and Higgsfield |
| 5. Learning | DEV-32 to DEV-35 | Trends reads digests, proposes rules, and opens references in the Studio |

**Sizes** are rough guesses for one developer: **S** a day or less, **M** two
to three days, **L** about a week. They are for planning the order, not
promises.

## Rules for every ticket

**Before writing code**

- This repo runs **Next.js 16**, which differs from most documentation. Read
  the relevant guide in `node_modules/next/dist/docs/` before writing route
  handlers, layouts or config (`AGENTS.md`).
- Wire every Claude call with the `claude-api` skill open. **Do not pin model
  ids from memory**; the plan's intent (plan §4.3) is a strong model for copy
  and templates, a small fast one for scoring, captions and trend summaries.
- The design for the screen is the approved Claude Design version, in dark and
  light, at 1440 and 390 wide.

**Security and data**

- Secrets stay on the server. The browser never sees the Anthropic key, the
  Supabase service-role key, Scrape Creators, Higgsfield or storage keys.
- Every route handler starts with `requireSession()` (`src/lib/api-auth.ts`).
  Being signed in is the whole access rule; there is no generator role.
- Every write goes through a server helper and is followed by `auditLog()`
  with `actingUserEmail()` (`src/lib/data/writes.ts`). Who approved something
  comes from the session, never from the request body.
- New tables have row-level security **on with no policies** (service role
  only, plan §5.5). New database functions revoke execute from `public`,
  `anon` **and** `authenticated` by name, then read `proacl` back to confirm.
  Signing up to Supabase is open and PostgREST is public, so "only the app
  calls it" is not protection.
- A write that touches more than one row in a way that must all happen or
  none happen goes in a **database function**, the pattern `sbRpcWrite`
  already uses. PostgREST cannot hold a transaction across calls.
- Model output, reference text and slide copy render as **plain text**, never
  as HTML.
- The generator **never** writes `approved = true`,
  `gatekeep_status = 'approved'` or `scheduler_ready = true` on a lane row.
- Migrations go in `supabase/migrations/` with a timestamped name, and are
  checked afterwards with the Supabase advisors.

**Screens**

- One `CtaButton` per screen. Destructive steps are a `HoldButton` with no
  warning text above it. No instruction text anywhere: formats in
  placeholders, cautions in the hold, explanations in the changelog.
- Colours come from tokens only (`globals.css`), so light mode works without
  its own pass. Counts, views and slide numbers use `.tnum`.
- Deck state words and pill tones are the table at the top of the flows
  document; no new colour for a new word.
- Nothing scrolls sideways at 390 wide. Icon-only controls have labels, focus
  rings stay, tab order matches what you see, reduced motion is respected.
- A screen's menu item is added to `CAROUSEL_NAV` in
  `src/components/shell/sidebar.tsx` in the same ticket that builds the
  screen. Nothing sits in the menu disabled.
- Run the `web-design-guidelines` review on the screen before calling the
  ticket done.

**Finishing**

- Pure logic gets unit tests (`vitest`, `src/**/*.test.ts`): no browser,
  database or network in them, as `vitest.config.mts` sets out.
- Anything that touches the database is verified with a real query or run, and
  the ticket's changelog entry says which.
- Every ticket ends with its `CHANGELOG.md` entry, in plain English, saying
  where the work came from.
- Garreth decides when to commit.

## Where the code goes

| What | Where |
|---|---|
| Screens | `src/app/(carousel-generator)/carousel-generator/…` (the route group and layout already exist) |
| Generator components | `src/components/carousel/` |
| Route handlers | `src/app/api/carousel-generator/…` |
| Server logic | `src/lib/carousel/` with one folder per part: `data/`, `template/`, `painter/`, `picking/`, `writer/`, `gate/`, `music/`, `wiring/`, `trends/` |
| Bundled fonts | `src/lib/carousel/painter/fonts/`, included in the server bundle with `outputFileTracingIncludes` in `next.config.ts` |
| Database changes | `supabase/migrations/` |
| One-off scripts (parity, seeding) | `scripts/carousel-generator/` |

---

## Phase 0 — prerequisites

### DEV-00. Keys, access and dependencies

- **Size:** S, mostly Garreth's actions.
- **Depends on:** nothing.
- **Build:**
  - Anthropic API key in Vercel and `.env.local` as `ANTHROPIC_API_KEY`, and a
    line in `.env.example`. (Not present on 2026-09-14.)
  - Czedrick's sign-in email confirmed and added to `ALLOWED_EMAILS` in both
    places. (The likely address is unconfirmed; plan §10, item 5.)
  - Add as direct dependencies: `@anthropic-ai/sdk`, `sharp` (today it is only
    present because Next.js pulls it in), and `opentype.js` for text
    measurement.
  - Check the Vercel plan's function limits: the render route needs about
    1024 MB and up to 60 seconds per deck (port spec §C.5).
- **Done when:** a route handler on a Vercel preview can call Claude with the
  key, `npm run typecheck` passes with the new dependencies, and Czedrick can
  sign in.

---

## Phase 2 — the middle: templates, painter, batches

### DEV-01. Database: the generation record, templates, directions, libraries

- **Size:** M.
- **Depends on:** DEV-00.
- **Plan:** §5.1, §5.3, §5.4. **Template model:** §6.
- **Build, one migration:**
  - `carousel_briefs`: add `content_type` (references the registry),
    `rerun_of` (references `carousel_briefs`), `template_id` (references
    `carousel_templates`), `image_library_id`. Widen the `status` check with
    `generating`, `rendering`, `stopped` and `failed`.
  - `carousel_drafts`: widen `status` with `flagged`. Add a unique constraint
    on `(brief_id, position, version)` so a double click cannot write the same
    version twice.
  - **One running batch per lane:** a partial unique index on
    `carousel_briefs (content_type)` where `status in ('generating',
    'rendering')`. The database enforces plan §4.5, not the page.
  - `carousel_templates` as plan §5.4, plus the proposed nullable `lane jsonb`
    (template model §6), with one active version per slug enforced by a
    partial unique index.
  - `carousel_lane_directions` as plan §5.3, one active per content type,
    enforced the same way.
  - `image_libraries` and `image_library_images` as plan §5.3. The second
    table is created empty now so the view below does not change in Phase 4.
  - `v_image_assets`, the union of both banks and `image_library_images` into
    `{library_id, image_id, public_url, is_cover, group, category, luminance,
    status}`.
  - RLS on with no policies for every new table.
- **Seed, in the same migration or a second one:**
  - Two read-only libraries from `glowup_image_bank` and
    `covered_eye_image_bank`, their pools as groups.
  - The two templates from `docs/carousel-templates/*.v1.json`, as version 1,
    `active`, each pointed at its library, mapped to columns as template model
    §6 says.
  - Direction version 1 for each lane, carrying the existing prompts (see
    DEV-08).
- **Tests:** after applying, run `node scripts/carousel-templates/verify.mjs`
  against the rows read back from the database, not only the files.
- **Done when:** `list_tables` shows the new shape, the advisors report
  nothing new, a second `generating` brief on the same lane is refused by the
  database, and both templates read back identical to their JSON files.

### DEV-02. Materialise and render claims as database functions

- **Size:** M.
- **Depends on:** DEV-01.
- **Flows:** F2 step 2, F3 step 2. **Port spec:** §C.3.
- **Why a function:** "Approve all unflagged" on 20 decks sends 20 approvals
  at once. Glow Up ids are `GU-<n>` and Covered Eye `CE-<n>`; two approvals
  computing "highest plus one" at the same moment would collide. The id, the
  lane row and the pointer back to the draft must land together.
- **Build:**
  - `carousel_materialise_draft(draft_id, lane_values jsonb)`: takes a lock
    per lane, allocates the next id for that lane's format, inserts the lane
    row with exactly the template's `lane.set_on_materialise`, and stores the
    lane row id in the draft's `generation_metadata.lane_row_id`. Refuses a
    draft that is not approved, or already materialised.
  - `carousel_withdraw_approval(draft_id)`: deletes the lane row **only if**
    it has not been claimed for rendering (`render_status = 'queued'` for
    Glow Up; `status = 'scripted'` and `rendered_at is null` for Covered Eye),
    and returns the draft to Written. Refuses otherwise.
  - The render claim stays the conditional update from port spec §C.3; wrap
    both lanes' versions in one `carousel_claim_render(content_type, id)`
    function so the route does not build filter strings.
  - `carousel_sweep_stuck_renders(content_type)`: rows in `rendering` for more
    than ten minutes go back to `queued` (or `scripted`).
- **Tests:** on a Supabase branch, fire 20 materialise calls in parallel and
  confirm 20 distinct ids with no gaps reused; claim the same row from two
  sessions and confirm exactly one wins.
- **Done when:** the branch tests pass, the functions are revoked from `anon`
  and `authenticated` by name, and `proacl` reads back as service role only.

### DEV-03. Template types and validator

- **Size:** S.
- **Depends on:** nothing (can run beside DEV-01).
- **Template model:** §1, §2.
- **Build:** TypeScript types for `pm.carousel-template/1` in
  `src/lib/carousel/template/`, a runtime validator (hand-written, no new
  schema library) that rejects an unknown layout, a text box with a missing
  style, a copy role with no lane column, or a slide with no image rule, and a
  loader that reads a template row back into the type.
- **Tests:** both JSON files pass; a set of broken copies each fail with a
  message naming the field.
- **Done when:** the tests pass and DEV-01's seed uses the validator.

### DEV-04. Painter: text

- **Size:** L. The ticket most likely to take longer than guessed.
- **Depends on:** DEV-00, DEV-03.
- **Port spec:** §B.1, §B.2, §C.1, §C.4. **Template model:** §2 rules 1 to 6.
- **Build:**
  - Bundle the fonts: Liberation Sans Bold (Glow Up, stands in for Arial
    Bold), Inter Bold (Covered Eye, stands in for SF Pro), Noto Color Emoji.
    Keep each licence file beside the font.
  - Measure with `opentype.js`. Greedy wrap on whitespace, in pixels, no
    hyphenation, no auto-fit; all whitespace collapses; the Glow Up datestamp
    splits on line breaks and does not wrap. **Do not port** the Glow Up
    blank-first-line bug (template model §4, item 10).
  - Position by the top of the ascender (add `ascender / unitsPerEm × size`
    to reach the SVG baseline). The four vertical anchors of rule 5.
  - Draw each text box as hand-written SVG: `stroke`, `stroke-linejoin:
    round`, `paint-order: stroke fill`. Satori is not used: it cannot stroke
    text.
  - Shadows: `hard` is a copy of the text at `(dx, dy)` with no stroke;
    `soft` is its own layer, blurred with sharp at the template's radius,
    composited before the crisp pass.
  - Covered Eye emoji: each emoji drawn at the text height with Pillow's
    advance and offsets (port spec §B.1), and the curly-quote rule for
    slide 1.
- **Tests:** unit tests over wrap and anchor arithmetic, using the same
  numbers `verify.mjs` checks (for example Covered Eye slide 5's bottom anchor
  at a two-line block, Glow Up's quiz slide question centred at y = 187).
- **Done when:** the tests pass and a text-only slide for each lane renders
  to a PNG that DEV-07 can compare.

### DEV-05. Painter: images, composition and upload

- **Size:** M.
- **Depends on:** DEV-04.
- **Port spec:** §B, §C.4, §C.5.
- **Build:**
  - Cells from the template: cover-fit, centred, zero gap, no rounding. Glow
    Up's collage ground colour behind the cells. EXIF rotation for Covered
    Eye; the resampling filter each template records.
  - Convert to sRGB and strip colour profiles, or colours drift from the
    archive.
  - Composite in order: images, soft shadow, crisp text.
  - Encode as the template's `output` says (Glow Up PNG, Covered Eye JPEG 92)
    and upload to its bucket and path, three attempts with back-off.
  - Everything keyed off the **original slide number**: a slide without an
    image is an error, never a renumber. Write back only the slides painted.
  - Fetch bank images once per request, at most four at a time.
- **Tests:** unit tests for the path pattern and the "no renumber" rule; the
  rest is proven by DEV-07.
- **Done when:** one full Glow Up deck and one Covered Eye deck paint from a
  fixed manifest into a scratch folder in Storage.

### DEV-06. Image picking and the persisted manifest

- **Size:** M.
- **Depends on:** DEV-01, DEV-03.
- **Port spec:** §B.1 image selection, §B.2 image selection, 2+2 diagonal rule,
  `matched_pair`. **Template model:** `image_rules`.
- **Build:** a picker in `src/lib/carousel/picking/` that reads a template's
  image rules and `v_image_assets` for the batch's library, and returns a
  manifest: which image goes in which cell of which slide.
  - Covered Eye: cover-only with the fallback to the whole group, distinct
    within the food group allowing a repeat if the group runs out.
  - Glow Up: the per-slide pools, four distinct covers on slide 1, the
    diagonal rule with brightness matching from the stored `luminance`
    (tolerance 40, nearest when none are in range, category variety as the
    tiebreak).
  - A deterministic random generator seeded from the deck's id. It does not
    need to match Python's; stability comes from saving the manifest on the
    lane row (Glow Up `render_manifest`) or the draft before painting.
  - Thin groups (one image) are normal, not errors. An **empty** group the
    template needs is an error naming the group, which DEV-15 also uses to
    block Generate.
- **Tests:** seeded runs produce the same manifest twice; the diagonal rule
  never puts a matching pair in one row; an empty group fails with its name;
  a one-image group repeats.
- **Done when:** the tests pass.

### DEV-07. Parity check against the Python painters

- **Size:** M.
- **Depends on:** DEV-05, DEV-06.
- **Plan:** §9 Phase 2, last bullet. **Port spec:** §C.1.
- **Build:** `scripts/carousel-generator/parity.mjs` takes ten already
  rendered decks per lane, repaints each from its stored manifest and copy
  with the new painter, and writes a side-by-side sheet (original, new,
  difference) for each slide into a scratch folder, plus a short report of
  line-count changes per text box.
  - Glow Up: ten `manifest_v2` decks from `glowup-renders`.
  - Covered Eye: ten decks from the captioned renders
    (`covered-eye-images/renders/…`, rendered 2026-07-12 to 07-30).
- **Expect:** Glow Up wraps should match, since Liberation Sans is
  metric-compatible with Arial. Covered Eye wraps may move, since Inter is not
  SF Pro, and the emoji will look different.
- **Done when:** Garreth has looked at the sheets and signed off both lanes,
  including the emoji. **The in-app painter is not used on a live lane before
  this sign-off.**

### DEV-08. Copy writer

- **Size:** L.
- **Depends on:** DEV-00, DEV-01, DEV-03.
- **Flows:** F1 step 5, F2 steps 4 and 5. **Plan:** §2.5, §4.3, §4.4 gate 1.
- **Build:** in `src/lib/carousel/writer/`:
  - A prompt builder from the template's copy contract (every `ai` role with
    its length limit), the active direction, the brief's note, the per-batch
    choices (Glow Up opening line and datestamp), any active `batch_briefs`
    row for the lane as extra context, and the fixed lines filled in, not
    written.
  - Port the existing prompts into direction version 1 and the prompt
    templates: Glow Up's seven-slide grammar, Covered Eye's five-beat arc, the
    Caption Maker's voice rules. Keep the "Harden Config" step as code: brand
    and molecule names are stripped from the caption whatever the model
    returned.
  - Structured output: one field per copy role, the caption, and a music
    choice written `artist - title`. A role over its length limit is sent back
    once with the limit restated; still over, the deck is Flagged, not cut.
  - **Redo deck** writes version N+1. **Redo slide** rewrites one role with
    the rest of the deck as context and also writes version N+1, only that
    slide changed. **Change track** rewrites only the music as version N+1.
  - `generation_metadata` records the model id, prompt version, direction
    version and template version on every version.
  - Covered Eye's slide 1 is the hook, so `hook_text` is always slide 1's
    text. Glow Up's `transition_line` is not written.
- **Tests:** prompt-builder snapshots per lane; the length-limit retry; the
  caption strip removes a brand and a molecule name that the model put in.
- **Done when:** a script run writes three decks per lane into drafts, and
  Garreth reads them.

### DEV-09. Quality gate

- **Size:** M.
- **Depends on:** DEV-08.
- **Flows:** F2. **Plan:** §4.4 gate 2, §8 anti-patterns.
- **Build:** in `src/lib/carousel/gate/`:
  - Port the Universal Carousel Quality Gate rubric (hook quality, content
    quality, 1 to 10) on the small model.
  - Port the regex compliance backstop: brand names, molecules, price, cure
    claims. It runs even when the model call fails.
  - A variation check within the batch: a deck whose hook is too close to
    another deck's in the same batch is Flagged "Too similar to deck 4".
  - Below 6.0 or any compliance hit: **Flagged** with the reason in words
    ("Score 5.2", "Compliance: brand name"). Never rejected automatically.
  - The gate call failing: Flagged "Not scored", still approvable.
- **Tests:** every compliance pattern against a hit and a near miss; the
  flag reasons; the similarity threshold on fixed pairs.
- **Done when:** the tests pass and the gate runs as the last step of every
  written version.

### DEV-10. Music lookup (F14)

- **Size:** L. Starts with a half-day check.
- **Depends on:** DEV-01, DEV-08.
- **Flows:** F14. **Template model:** §4 items 12 and 13.
- **First, prove TikTok.** The Instagram lookup was tested end to end on
  2026-09-14; the TikTok lookup has only been seen **rejecting** a re-upload.
  Before building, find three real TikTok matches through Scrape Creators
  (search, then open each video and read its own sound data) and save the
  responses as test fixtures. If no reliable match can be found, stop and
  bring it to Garreth; the flow depends on it.
- **Build:** in `src/lib/carousel/music/`:
  - Match against active `music_library` tracks the way the Posting Agent
    does: lower-cased, spaces collapsed.
  - Found with a real Instagram reel link and a TikTok video id: done.
  - Otherwise, per missing platform, search and open up to five candidates one
    at a time. TikTok: accept the first whose sound data names the title and
    artist and is not an original sound. Instagram: the first whose music
    attribution matches and is not original audio.
  - Both found: add or repair the `music_library` row, set the deck's `music`
    to the exact `artist - title`, show "New track".
  - Not found after five on a platform: Flagged "Track not found on TikTok"
    (or Instagram, or both). Service error or out of credits: Flagged "Music
    lookup failed".
  - Every post opened, and why it was accepted or rejected, goes in the
    draft's `generation_metadata`.
  - Runs **after approval**, not while writing, so discarded decks cost no
    lookups.
- **Tests:** normalised matching; the fixtures, including the "Karma"
  re-upload that must be rejected; the five-candidate cap.
- **Done when:** the tests pass and one real new track is found on both
  platforms and added to `music_library`, confirmed by query.

### DEV-11. Batch service and routes

- **Size:** L.
- **Depends on:** DEV-02, DEV-06, DEV-08, DEV-09, DEV-10.
- **Flows:** F1, F2, F4, F5. **Plan:** §4.2, §4.5, §5.1, §5.2.
- **Build:** the server side of a batch, one request per deck, every result
  saved the moment it exists. Proposed routes, all under
  `/api/carousel-generator/`:

  | Route | Does |
  |---|---|
  | `POST batches` | Creates the brief (recording template version, library, direction version, per-batch choices, `rerun_of`), the `content_batches` row named `{type}-{YYYY-MM-DD}-{letter}`, and one empty draft slot per deck. A second running batch on the lane returns the running one's id. |
  | `GET batches/[id]` | Everything the batch page needs, including who is running it and when it last moved |
  | `POST batches/[id]/decks/[position]/write` | Writes, or retries, one deck; runs the gate |
  | `POST batches/[id]/continue` | Returns the next unfinished step, for resuming |
  | `POST drafts/[id]/approve` and `…/unapprove` | Approve sets `human_approved`, `approved_by`, `approved_at` at once; unapprove is only accepted while the draft is not materialised |
  | `POST drafts/[id]/materialise` | After the 5-second window: runs the music lookup, then `carousel_materialise_draft` |
  | `POST drafts/[id]/redo`, `…/redo-slide`, `…/change-track` | New versions (DEV-08) |
  | `POST drafts/[id]/withdraw` | `carousel_withdraw_approval` |
  | `POST drafts/[id]/discard` | Marks the draft discarded; not offered once approved |
  | `POST batches/[id]/finish` | **Finish here**: closes a stopped batch with what was done, freeing the lane |

  - **The 5-second window lives on the server, not only in the page.** The
    page calls materialise after five seconds, and the batch page load and
    Render approved also materialise any approved draft older than five
    seconds. Closing the tab inside the window does not lose the approval.
  - **Read-only for a second person:** the brief records which session is
    running it. Anyone else gets the batch read-only, with the runner's name
    and last movement, until it has not moved for 60 seconds.
  - **Stopped:** a brief in `generating` or `rendering` that has not moved for
    60 seconds is shown as stalled on the batch page and as stopped in
    History. Continue picks up unwritten decks, or unrendered approved ones.
    **Finish here** closes it as it stands, so the lane can run a new batch.
  - **Unwired types** (no `lane` on the template) approve and render into the
    drafts only. That branch is built in DEV-26; here it returns "not wired".
  - Every write is audit-logged.
- **Tests:** unit tests for the batch-name letter sequence, the stopped rule
  and the approval window; a branch run of a three-deck batch from creation
  to materialised rows.
- **Done when:** a three-deck Glow Up batch runs end to end through the routes
  (no page yet) and the lane rows read back with `render_status = 'queued'`,
  `gatekeep_status = 'pending'`, `approved = false`, `scheduler_ready = false`.

### DEV-12. Render service and vision check

- **Size:** M.
- **Depends on:** DEV-05, DEV-06, DEV-07, DEV-11.
- **Flows:** F3. **Plan:** §2.5 (`carousel-vision-qa.mjs`).
- **Build:**
  - `POST /api/carousel-generator/drafts/[id]/render`: sweep the lane's stuck
    rows, claim the row, pick and save the manifest, paint, upload, write the
    URLs, `rendered_at` and the rendered state. An empty claim returns
    "Rendering elsewhere". A failure returns the slide number.
  - Vision check on the rendered slides with a Claude vision call, using the
    rubric from `carousel-vision-qa.mjs`: text cut off, text past 65% of the
    height, poor contrast, missing glyphs. A hit Flags the card with the
    reason and the slide number to outline. It does not undo the render.
  - Generated: the lane row is complete with art, caption and music.
  - `POST /api/carousel-generator/batches/[id]/render` returns the next deck
    to render, so the page asks for one at a time.
- **Tests:** unit tests for the flag reasons; a branch run rendering the
  DEV-11 batch.
- **Done when:** three Glow Up decks render in the deployed preview, their
  URLs open, and a query shows them Generated with nothing written past
  `gatekeep_status = 'pending'`.

### DEV-13. Generator components

- **Size:** M.
- **Depends on:** the approved D3 to D5 designs.
- **Designs:** D4 (the deck card first), D3, D5.
- **Build** in `src/components/carousel/`, from the existing `Card`, `Pill`,
  `CtaButton`, `HoldButton`, `Dropdown` and skeletons:
  - `DeckCard`: every state in D4 (Writing as the empty card, Written, Flagged
    with reason, Approved with its 5-second undo, Track not found with Retry
    and Change track, New track, Music lookup failed, Rendering, Rendering
    elsewhere, Rendered with thumbnails and outlined slides, Generated,
    Failed with slide number and Retry). Redo deck, Redo slide per slide, the
    version switcher, Discard deck and Withdraw approval as holds.
  - `ProgressLine`: "7 of 20 written", `aria-live="polite"`, the stalled
    variant in the warn tone naming the deck and when it last moved.
  - `UndoToast`: five seconds, one Undo. No toast component exists yet.
  - `BatchBottomBar` for phone widths.
  - `SlideThumbStrip` filling in as slides land.
- **Motion:** Approve and Redo get press feedback only (100 to 160 ms); cards
  arriving may stagger 30 to 50 ms; nothing scales from zero; nothing
  keyboard-driven animates.
- **Tests:** unit tests for the state-to-pill mapping.
- **Done when:** every state is visible on a local fixture page in both themes
  at both widths and matches D4.

### DEV-14. Carousel types screen

- **Size:** M.
- **Depends on:** DEV-01, approved D1.
- **Designs:** D1. **Flows:** F1 steps 1 and 2.
- **Build:** replace the `SectionStub` at `/carousel-generator`.
  - One card per carousel type (Garreth, 2026-09-14): the name; neutral
    `StatusPill`s for the character and the template's slide count; a **View
    details** row with a caret on the right, between `border-border` rules,
    folded by default; then the button on the right and, opposite it, the last
    batch date ("Last batch Sep 8"), replaced by the status pill when the type
    has a status.
  - The details, behind View details: postable count and days of cover (from
    `v_scheduler_pool` and the lane's cadence), 28-day median views (the same
    join as the Analytics page, plan §11). The last batch date opposite the
    button comes from `carousel_briefs`, then `content_batches`, and is not
    repeated in the details.
  - Live types first, retired ones in a collapsed group.
  - Every Generate is the same accent button at the secondary button's size.
    Not `CtaButton`: each of those runs its own WebGL context and animation
    loop and its own comment rules it out of anything that repeats, so the
    cards use a plain accent pill. A type with a running batch shows **Open
    running batch** (secondary) instead, with its progress as the status pill.
  - Not wired: the pill and no Generate button.
  - Read through the existing cached-fetcher pattern (`src/lib/data/cache.ts`)
    with its own tag, refreshed when a batch finishes.
- **Done when:** the page shows Glow Up and Covered Eye with numbers that
  match a direct query, in both themes at both widths.

### DEV-15. Generate form

- **Size:** M.
- **Depends on:** DEV-06, DEV-11, DEV-14, approved D2.
- **Designs:** D2. **Flows:** F1 step 3.
- **Build:** `/carousel-generator/generate?lane=`.
  - **How many**, pre-filled with **50** for every carousel type (Garreth,
    2026-09-14), stopping at 50 as the person types.
  - **Image library** with **Change** and the library picker. A repoint saves
    a new template version with only the library changed.
  - **Direction** read-only with its version and a link to the Direction tab.
  - **Note**, one line.
  - The template's `per_batch` choices, rendered from the copy contract, not
    hard-coded per lane.
  - Generate is unavailable with no library, or while a group the template
    needs is empty, and the empty groups are named (DEV-06).
  - From the approved D2 (Garreth, 2026-09-14): **Undo** beside Change puts
    the previous library back after a repoint; the library picker lists each
    library's cover, name and image count, and opens as a centred modal on a
    phone; the datestamp is a month-and-year picker; on a phone, Generate sits
    in a bottom bar with the reason it is unavailable beside it.
  - Submit calls `POST batches` and opens the batch page.
- **Done when:** a batch can be started for each lane from the form, and a
  repoint shows up as a new template version by query.

### DEV-16. Batch page: writing and resuming

- **Size:** M.
- **Depends on:** DEV-11, DEV-13, DEV-15, approved D3.
- **Designs:** D3. **Flows:** F1 steps 4 and 5, F4.
- **Build:** `/carousel-generator/batches/[id]`.
  - The grid of deck cards, space reserved so nothing jumps, filling in as
    the page requests one deck at a time.
  - The progress line, stalled after 60 seconds.
  - A failed deck shows Retry on its card; the rest carry on.
  - A reopened stopped batch shows the work so far and **Continue** where the
    progress line was, with **Finish here** beside it as a hold. D3 does not
    show Finish here yet; add it to the design before building.
  - A second person sees the page read-only.
- **Done when:** closing the tab mid-batch and reopening it loses nothing, and
  Continue finishes the batch.

### DEV-17. Batch page: review and approve

- **Size:** M.
- **Depends on:** DEV-16, approved D4.
- **Designs:** D4. **Flows:** F2, F14.
- **Build:**
  - Approve, the 5-second undo, Redo deck, Redo slide, version switcher,
    Change track, Retry on music, Discard deck, Withdraw approval.
  - **Approve all unflagged** with the undo toast.
  - **Render approved** appears as the accent once anything is approved.
  - Keyboard: `A` approve, `R` redo, `J` and `K` next and previous card.
    Focus visible, no animation.
  - All clear when every card is approved or discarded.
- **Done when:** a 20-deck batch can be reviewed with the keyboard alone, and
  an undone bulk approval writes no lane rows, confirmed by query.

### DEV-18. Batch page: render and finish

- **Size:** S.
- **Depends on:** DEV-12, DEV-17, approved D5.
- **Designs:** D5. **Flows:** F3.
- **Build:** "4 of 12 rendered", thumbnails filling in, flagged slides
  outlined, Rendering elsewhere, Failed with Retry, and the finished line
  saying how many went into the pool with a link to Inventory. Batch actions
  in the bottom bar on phones.
- **Done when:** a batch renders from the page, and running the old Python
  painter against the same rows at the same time picks none of them up.

### DEV-19. History, the content type page, and image libraries (read-only)

Three screens, each its own piece of work; grouped here because none blocks
the others.

**DEV-19a. History** · S · depends on DEV-11 and approved D9 · flows F4, F5.
The table of briefs (date, type, requested, approved, rendered, generated, who
ran it), filter pills by type, a date-range dropdown, stopped rows with
Continue, **Run again** (clones type, count, note and per-batch choices under
the current direction and library, or opens the running batch instead), and a
re-run shown paired with its original. First run and no-results states.
Stacked rows on phones. Adds History to the menu.

**DEV-19b. Content type page, Overview and Direction tab** · M · depends on
DEV-01 and approved D7 · flow F6 (Phase 2 steps). `/carousel-generator/types/[slug]`:
details, template versions, its batches, Generate. The Direction tab as a
plain editor: active version and date, **Save version** writes a new active
version, past versions with **Make active**. Both writes in one database
function so there is never zero or two active versions. **Edit template**
arrives in Phase 3; the Wiring tab in Phase 4.

**DEV-19c. Image libraries, read-only** · S · depends on DEV-01 and approved
D8 · flow F7 steps 1 and 2. The grid (cover, count, groups, the types pointing
at each) and one library's images by group with covers marked. Adds Image
libraries to the menu.

- **Done when:** each screen matches its design in both themes at both
  widths, with numbers that match a direct query.

### DEV-20. Phase 2 live proof

- **Size:** S, spread over a few days of waiting.
- **Depends on:** everything above, and DEV-07's sign-off.
- **Plan:** §9 Phase 2.
- **Build:** nothing new. Run one real batch per lane from the deployed app,
  review it, render it, and hand it to gatekeeping outside the app as today.
- **Watch:** posting is paused fleet-wide for the Geelark exit (2026-09-14),
  so "posted live" waits for Garreth to resume the accounts. Until then, the
  proof stops at the rows showing in `v_scheduler_pool` once gatekept.
- **Done when:** for each lane, the Smart Scheduler has assigned at least one
  generator-made deck and the Posting Agent has posted it, confirmed by query
  against `unified_posts` and the post record. Only then does Phase 3 start.

---

## Phase 3 — the front: the Studio

### DEV-21. Studio canvas, filmstrip and inspector

- **Size:** L.
- **Depends on:** DEV-03, DEV-04 (fonts), approved D6.
- **Designs:** D6. **Flows:** F8 steps 4 and 5. **Plan:** §4.7.
- **Build:** `/carousel-generator/studio` and `/studio/[template]`.
  - The canvas draws the template as HTML at true slide shape, scaled to fit,
    with the **same bundled font files** as the painter.
  - Filmstrip of slides; select a text box or an image cell; drag to move.
  - Inspector for a text box (font, weight, size, stroke, shadow, alignment,
    wrap width) with the change shown at once; for an image cell, which
    library group it draws from, and "No images" when the group is empty.
  - Every change edits the template object and is saved as a draft template
    row (`status = 'draft'`) a moment after the last change, so a closed tab
    loses nothing.
  - Undo and redo for canvas edits.
  - The generator menu folds to icons while the Studio is open.
- **Tests:** unit tests for the edit operations on the template object
  (move, restyle, change group) and that the result still validates.
- **Done when:** the Glow Up template opens and edits in the Studio, and the
  canvas matches D6 at desktop.

### DEV-22. Render preview and Regenerate sample

- **Size:** S.
- **Depends on:** DEV-05, DEV-08, DEV-21.
- **Flows:** F8 steps 6 and 7.
- **Build:** **Render preview** paints the current slide with the real painter
  from the unsaved template (no upload; the image comes back in the response)
  and shows it beside the canvas. **Regenerate sample** asks the writer for
  new sample copy under the current direction. Each failure shows in its own
  place with Retry.
- **Done when:** a style change on the canvas shows up in the rendered preview
  on the next press.

### DEV-23. AI template drafting

- **Size:** L.
- **Depends on:** DEV-03, DEV-21.
- **Flows:** F8 steps 1 to 3, F9. **Plan:** §4.7.
- **Build:**
  - The library choice first (existing libraries only until Phase 4).
  - **From an idea:** a conversation that drafts a whole template (slide
    count, layouts, text boxes, a style guess, image cells drawing from the
    library's groups, a direction note) as structured output, validated with
    DEV-03 before it reaches the canvas. At most one clarifying question, in
    the manner of the recovered `direction-chat.js`.
  - **From a reference:** reads the reference's beats and visual notes from
    `reference_beats` and `reference_analysis`, runs a vision pass over its
    slides, and drafts a template with the same slide count and text
    placement. The reference's slides show in a strip above the canvas, with
    "Not analysed" when there is no analysis. The template records
    `source_reference_id`.
  - Reference text and model output are untrusted: plain text only, and never
    followed as instructions.
  - The draft call failing: the error in the conversation, with Retry.
- **Done when:** one template from an idea and one from a real reference id
  arrive on the canvas and pass validation.

### DEV-24. Save as carousel type, versions, edit mode

- **Size:** M.
- **Depends on:** DEV-21, DEV-19b.
- **Flows:** F8 step 8, F10.
- **Build:**
  - **Save as carousel type** dialog: name, character, short name; "Taken"
    when the short name is used by the registry or another template. Saves
    version 1, creates direction version 1 from the draft's direction note,
    and the type appears on Carousel types as Not wired. Unavailable with no
    library chosen.
  - **Edit template** on the content type page opens the active version with
    the most recent approved deck as sample copy. **Save version** saves N+1
    and makes it active in one database function. Past versions with **Make
    active**. A batch already running keeps the version it started with.
  - **Discard draft** is a hold.
  - Adds Studio to the menu, and "New carousel type" to Carousel types.
- **Done when:** a Studio-made type is saved, appears Not wired, and a version
  change on Glow Up leaves a running batch on its old version, by query.

### DEV-25. Direction conversation

- **Size:** M.
- **Depends on:** DEV-19b.
- **Flows:** F6 (Phase 3 steps). **Plan:** §6.4.
- **Build:** a conversation beside the direction on the Direction tab, ported
  from `direction-chat.js` onto Claude: proposes a revised direction, cites
  accepted rules from `content_knowledge_base` by `rule_key`, asks at most one
  question, says plainly when direction cannot change something. The proposal
  shows as a difference against the active text. **Save version** saves it,
  recording the cited rule keys; the bot never saves. A failed call shows
  under the message with Retry.
- **Done when:** a direction change proposed in the chat is saved as a new
  version with its cited rules, by query.

### DEV-26. First batches for types that are not wired

- **Size:** M.
- **Depends on:** DEV-11, DEV-12, DEV-24.
- **Flows:** F11 "Before wiring". **Plan:** §4.7.
- **Build:** the branch DEV-11 left open. For a template with no `lane`:
  approval does not materialise; rendering paints into a generator-owned
  Storage path and writes the slide URLs onto `carousel_draft_slides`; the
  card's last state is Rendered, not Generated. The music lookup still runs.
- **Done when:** a Studio-made type's first batch is written, approved and
  rendered with no lane table, and nothing appears in `unified_posts`.

---

## Phase 4 — the back: wiring, and images

### DEV-27. The lane-creation database function

- **Size:** L. **Needs its own short design review before code.**
- **Depends on:** DEV-26.
- **Flows:** F11 steps 3 to 5. **Plan:** §4.8. **Runbook:**
  `WIRE-NEW-CONTENT-TYPE.md` §2 to §12.
- **Build:** one reviewed function, `carousel_wire_lane(...)`, that in a single
  transaction:
  - creates the lane table in the runbook's standard carousel shape
    (`content_id`, `slide_1_url` to `slide_12_url`, `caption`, `music`, the
    twelve required posting columns) with RLS and grants matching the
    existing lanes;
  - creates the `scheduler_ready` trigger;
  - inserts the `content_type_registry` row and the character's allow-list
    entry;
  - adds the lane's block to `unified_posts` and `v_scheduler_pool`;
  - writes the cadence rebalance;
  - runs the runbook's seven verification checks, and raises (rolling
    everything back) naming the check that failed.
  - Plus a `preview` mode that returns exactly what it would run, without
    running it.
- **Not started until answered:** open questions 1 and 2 at the end of this
  document, on how the function adds the lane to the two views.
- **Tests:** on a Supabase branch: wire a test type, run all seven checks, then
  force a failure in check 5 and confirm nothing is left behind.
- **Done when:** the branch tests pass, the function is service-role only, and
  `unified_posts` and `v_scheduler_pool` return every existing lane's count
  unchanged after a wire.

### DEV-28. Wiring tab

- **Size:** M.
- **Depends on:** DEV-27, DEV-10, approved D7.
- **Designs:** D7 Wiring tab. **Flows:** F11.
- **Build:**
  - The checklist, each item ticking from a real check, not a checkbox.
  - Cadence per week and the rebalance of sibling types, reusing the rules in
    `src/lib/data/cadence-rules.ts`, with the running total. Wire unavailable
    while the total does not match the budget.
  - **Preview** shows the function's preview output.
  - **Wire** is a hold. On success: the checklist ticks, each approved deck of
    the first batch has its track confirmed (DEV-10) and is then written to
    the new table, and decks whose track is not found stay Flagged with a
    count on the music item.
  - The Smart Scheduler `MEDIA` line to copy. The item ticks only when the
    **published** Smart Scheduler version contains the slug, read through the
    n8n API (`activeVersionId`, not the latest saved draft). Until then the
    type's card shows "Media map missing".
- **Done when:** a Studio-made type is wired from the tab, its first batch
  lands in its table, and it appears on Carousel types with its pool count.

### DEV-29. Libraries: new, upload, retire

- **Size:** M.
- **Depends on:** DEV-19c, approved D8.
- **Flows:** F7 steps 3, 4 and 7.
- **Build:** **New library** with a name and an empty state; **Upload** into a
  group (an existing one or a new one), with a Failed tile and Retry per
  upload; **Retire image** as a hold. A retired image drops out of
  `v_image_assets` for new picks, while manifests already saved keep their
  URL. The two seeded bank libraries stay read-only.
- **Done when:** a new library is filled by upload and a Studio template can
  draw from it.

### DEV-30. Higgsfield image generation

- **Size:** L. Starts with a check.
- **Depends on:** DEV-29.
- **Flows:** F7 steps 5 and 6.
- **First, confirm access.** Higgsfield is connected to Claude today, not to
  the app: nothing in the repo or `.env.example` calls it. Confirm there is an
  API the deployed app can call with its own key, that it supports the
  likeness reference the flow needs, and what a run costs. If not, stop and
  bring it to Garreth.
- **Build:** the **Generate images** form (prompt; shows Character, Place or
  Other; group; how many, up to 8; shape: portrait, tall or square; likeness
  images from this library when it shows a character). Generating tiles, then
  the review row with **Keep** and **Discard**. A kept image joins its group
  with its prompt, shape, likeness images and who kept it recorded. One
  failed image shows Retry; out of credits shows the reason on every waiting
  tile.
- **Done when:** eight images are generated into a new library, some kept and
  some discarded, and only the kept ones are available to a template.

### DEV-31. Keys out of n8n before any rotation

- **Size:** S, Garreth's call to run.
- **Depends on:** nothing; must be done before DEV-32 touches n8n.
- **Plan:** §2.6.
- **Build:** move the plain-text Supabase keys in the Virlo bridge, the
  Posting Agent (five HTTP nodes) and the Smart Scheduler into n8n
  credentials; publish each workflow (saving alone is a draft); confirm each
  still runs; only then rotate the keys.
- **Done when:** no workflow holds a key in plain text and one scheduled run
  of each has succeeded after the change.

---

## Phase 5 — learning

### DEV-32. Capture the study digest

- **Size:** S.
- **Depends on:** DEV-31.
- **Plan:** §5.3 `study_digests`.
- **Build:** a migration for `study_digests`, and the two new columns on
  `content_knowledge_base` (`source_digest_id`, `approved_by`). One Supabase
  insert node, using an n8n credential, added to the "Daily Study Digest
  Email" workflow before its Gmail node, then **published**, checking
  `versionId` against `activeVersionId`.
- **Done when:** the next scheduled digest lands as a row and the email still
  goes out.

### DEV-33. Analyse a digest

- **Size:** L.
- **Depends on:** DEV-32.
- **Flows:** F12. **Plan:** §5.3 "Analysing the videos and carousels a digest
  points at".
- **Build:** in `src/lib/carousel/trends/`: extract every TikTok and Instagram
  link; match each against `references_unified.source_url`; insert new ones
  into `source_discovery_evidence` with `provider = 'study_digest'` and the
  digest id; run the pattern pass (small model) over the digest plus the
  analyses of its already-analysed links; store proposed rules (rule, evidence
  lines, confidence, the types it applies to) and the reference ids in
  `study_digests.analysis`. Links not yet analysed are stored as Queued with
  the time.
- **Watch:** analysis of new links depends on the external worker whose owner
  is still unknown (plan §10, item 3). If it is down, links stay Queued, which
  the page shows; the ticket is not blocked by it.
- **Tests:** link extraction over real digest bodies, including shortened and
  tracking-parameter URLs.
- **Done when:** a real digest is analysed, its new links appear as references
  within the bridge's five-minute cycle, and a re-analysis picks them up.

### DEV-34. Trends page and the knowledge base

- **Size:** M.
- **Depends on:** DEV-33, approved D10.
- **Designs:** D10. **Flows:** F12, F13.
- **Build:** `/carousel-generator/trends`. Digests newest first, readable in
  place, **Analyse** as the accent on the newest unanalysed one. The result
  with rules, evidence, confidence and types, and the referenced posts with
  their slides. Queued links with when they were queued. The Knowledge base
  pane: pending rules filterable by type and confidence, **Accept** (appends to
  `content_knowledge_base` with the digest id and session email) and
  **Reject** (marks the rule dismissed; see *Proposed defaults*, item 4). Adds
  Trends to the menu.
- **Done when:** a rule accepted on the page is cited by the Direction
  conversation (DEV-25).

### DEV-35. Recreate this

- **Size:** S.
- **Depends on:** DEV-23, DEV-34.
- **Flows:** F9 from Trends.
- **Build:** **Recreate this** on a referenced post opens the Studio's
  reference variant (DEV-23) with that reference id.
- **Done when:** a Trends result opens in the Studio and saves as a type with
  `source_reference_id` set.

---

## Decisions, open questions and proposed defaults

### Decided (Garreth, 2026-09-14)

1. **The Generate form's How many starts at 50** for every carousel type, the
   batch cap. The plan's "14-day shortfall" default is dropped: nothing
   calculates a shortfall per carousel type (`inventory_check` counts per
   character, and must not change because the digest email reads it). DEV-15.

### Open questions, to be answered

| # | Question | Holds up |
|---|---|---|
| 1 | **How does Wire add a new carousel type to the two master lists** (`unified_posts` and `v_scheduler_pool`), which the Smart Scheduler, the Posting Agent and Inventory read? **(a)** Each Wire takes the current list and adds one section for the new type: less work now, but every Wire rewrites the lists every live type posts from. **(b)** A one-time change rebuilds both lists so they are always generated from the registry, and Wire only adds the type there: more work now, touching how every live type is listed, but no hand-edited text is rewritten afterwards. | DEV-27, DEV-28 |
| 2 | If (b): **when is the one-time rebuild done**, and how are the older types whose columns differ from the standard shape handled in it? | DEV-27 |
| 3 | **Czedrick's sign-in email** for `ALLOWED_EMAILS`. Likely `czedrickjhake.cc@gmail.com`, unconfirmed (plan §10, item 5). | DEV-00 |
| 4 | **Who runs the external analysis worker** that analyses new references? If it stops, links from a digest stay Queued (plan §10, item 3). | DEV-33 working fully, not its build |

### Proposed defaults, accepted unless changed

Things the plan and flows left unsettled, found while writing the tickets.

1. **Finish here.** A stopped batch still counts as the lane's running batch,
   so without a way to close it the lane could never run another. A
   **Finish here** hold closes it with what was done. DEV-11, DEV-16.
2. **Approval is saved at once and written to the lane later.** The flows
   write the lane row five seconds after Approve. If only the page waited,
   closing the tab would lose approvals silently, so the server saves the
   approval and the page or the next load finishes the write. DEV-11.
3. **New deck ids are handed out inside the database.** Twenty approvals at
   once would otherwise collide on `GU-<n>`. DEV-02.
4. **Rejecting a proposed rule marks it dismissed** inside the digest's
   analysis and writes nothing to the knowledge base. Writing nothing at all
   would bring the rule back on the next page load. DEV-34.
5. **The template model's `lane jsonb` column is accepted**, since it is how a
   type that is not wired becomes wired by filling one column. DEV-01.
6. **Plan §6.4's separate Directions page** is the content type page's
   Direction tab, as in the flows. DEV-19b, DEV-25.

### Checks built into tickets

- **The TikTok music lookup is unproven.** DEV-10 starts by finding three real
  matches; if it cannot, it stops and comes back to Garreth.
- **Higgsfield is connected to Claude, not to the app.** DEV-30 starts by
  confirming an API the deployed app can call; if there is none, it stops and
  comes back to Garreth.
