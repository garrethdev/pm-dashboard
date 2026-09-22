# Carousel Generator — development tickets

**Status:** final, 2026-09-14 (Garreth). Written on the assumption that the
design step (`CAROUSEL-GENERATOR-DESIGN-TICKETS.md`, D1 to D10) is finished
and signed off — true everywhere but Phase 5, where D10 was reopened on
2026-09-17 and the note below applies. **Nothing here is built.** The
questions still to answer are listed at the end, each with the ticket it
holds up; none of them holds up Phase 2. Each ticket is one piece of work a
developer or a build session can pick up, finish, and verify on its own.

**Two tabs renamed 2026-09-21 (Garreth), design ticket D13, approved
2026-09-22.** The **Direction** tab is the **Writing** tab, and the **Wiring**
tab is the **Go Live** tab; the tickets below use the new words. Only the
screens change — the `direction` column, the table
`carousel_lane_directions`, the database function `carousel_wire_lane()` and
the runbook keep their own names, and so does plan §4.8, "Wiring a new
content type", which is the process and not the tab. The flows' query strings
moved with the screens on approval: `?tab=writing` and `?tab=go-live`.

**What D13's approval added to the tickets below.** **DEV-15** gained the
required-Writing state and the Note's placeholder; **DEV-19b** gained the
empty Writing editor with its guiding placeholder, the not-saved draft state
and the list of the template's text-box names.

**What D13b's approval added (Garreth, 2026-09-22).** **DEV-25**, the Writing
conversation, gained the whole of it: on a type with nothing written the panel
fills its card and offers **one first draft** from the active template and its
slides, the draft lands unsaved in the same place the Studio's note does, the
box asks *What should this type sound like?* until a first version is saved,
and on the phone the offer also sits under the editor because the conversation
there is a sheet. Nothing moved in DEV-19b: the editor, Save version, the
version dropdown and the text-box names are exactly as D13 left them. **D15's approval on
2026-09-22 added DEV-54 and DEV-55**, the Rows tab and a row's drawer: a
read-only fourth tab on a type's page showing what is sitting in its lane
table and, in words, why each row cannot post. Nothing on it writes, and the
drawer's one button only opens the deck in the batch it came from. **DEV-21
gained its text-box copy contract on 2026-09-22**, when D14 was approved in
dark and light: Name, Written by and a measured character limit above Font, a
box added by hand arriving named **Text Box 1** rather than unnamed, and the
names showing on the canvas. Two knock-ons for other tickets: a **Per batch**
box adds a field to the Generate form (**DEV-06**), and renaming a box renames
the key the writer writes against (**DEV-08**).

**What D16's approval added (Garreth, 2026-09-22, dark and light).** The
generator gains a **front page**: **DEV-56** to **DEV-59** in Phase 2 and
**DEV-60** in Phase 5. Overview takes `/carousel-generator`, **Carousel types
moves to `/carousel-generator/types`**, and the menu gains Overview as its
first item. Nothing in the tickets below changes except the address and the
menu; every screen keeps what it does. Overview writes nothing — it gathers
what the other screens already say.
**One word of warning for whoever builds DEV-57:** Running Tasks is the
**fourth** place a batch's state is put into words, after the bell (DEV-52),
the type's card (DEV-14) and History's Status column (DEV-53). It must read
from the same state and use the same words. A fifth wording is a bug.

**Where the Writing requirement is enforced — read this before building
either ticket.** Generate on a carousel type's card and in its header is an
**ordinary, pressable button** even when nothing has been written; it carries
a neutral **Needs writing** pill beside it and opens the Generate form as
always. The **form** is what enforces the requirement: its own Generate, at
the foot, is unavailable until everything required is filled. One rule instead
of two — *Generate always opens the form; the form names what is missing.*
(Garreth, 2026-09-22. An earlier round made the card's button dead and created
a dead end: the only screen that could explain the problem was the one you
could no longer reach.)

**Phase 5 amended 2026-09-17 (Garreth).** D10 was reopened and redesigned in
place rather than drawn again under a new number, so the Trends page now opens
on a feed of the carousel library with a search bar over it. DEV-34 and DEV-35
are rewritten for that, and DEV-36 to DEV-40 are new. The head of Phase 5 says
what changed. The image-library ticket that used to be DEV-36 is now
**DEV-41**, so that no two tickets share a number.

Companion documents, read before starting any ticket:

| Document | What it gives the build |
|---|---|
| `CAROUSEL-GENERATOR-PLAN.md` | Why, the architecture (§4), the data model (§5), the phases (§9) |
| `CAROUSEL-GENERATOR-FLOWS.md` | What every screen does, step by step (F1 to F16), and the deck state words |
| `CAROUSEL-GENERATOR-DESIGN-TICKETS.md` | The approved screens (D1 to D12). D10 was reopened for its second round, the Trends feed and search (2026-09-17); **D12, Auto mode, was added and approved on 2026-09-21** and is Phase 6 here |
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
| 2. The middle | DEV-01 to DEV-20, and DEV-54 to DEV-55 | A generator-made batch for each of Glow Up and Covered Eye, posted live |
| 3. The front | DEV-21 to DEV-26 | A new carousel type made in the Studio, first batch reviewed, not yet wired |
| 4. The back | DEV-27 to DEV-31, and DEV-41 | That type wired and posting; libraries fillable by upload and Higgsfield |
| 5. Learning | DEV-32 to DEV-40, DEV-42 to DEV-47 | Trends opens on a searchable, filterable feed of the carousels a person has not seen, opens a post's details, analysis and transcription, reads digests, proposes rules, and opens references in the Studio |
| 6. Auto mode | DEV-48 to DEV-53 | A batch started in Auto writes, retries its own flagged decks, renders and stops at Approve (n) decks, with the dashboard closed |

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
- The generator writes `gatekeep_status` **only as the Content Risk Gate's
  verdict**, never `'pending'` (the nightly n8n gate audits NULL rows only and
  ignores `'pending'` forever; plan §2.4). `approved = true` and
  `scheduler_ready = true` are written only by Approve (n) decks (DEV-18), never by
  writing or rendering (Garreth, 2026-09-15).
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
    `{library_id, image_id, public_url, is_cover, set_name, subset_name,
    luminance, status}`. **Named `set_name`/`subset_name`, not `set`**
    (Garreth, 2026-09-16): sets nest one level, and `SET` is a SQL keyword
    that would need quoting everywhere. They come straight from the banks'
    `pool` and `category`.
  - RLS on with no policies for every new table.
- **Seed, in the same migration or a second one:**
  - Two read-only libraries from `glowup_image_bank` and
    `covered_eye_image_bank`, their pools as sets and their categories as the
    sets nested inside them.
  - The two templates from `docs/carousel-templates/*.v1.json`, as version 1,
    `active`, each pointed at its library, mapped to columns as template model
    §6 says.
  - A first `carousel_lane_directions` version for each lane, carrying the
    existing prompts (see DEV-08). This is what the **Writing** tab shows and
    saves; the table and its `direction` column keep their own names.
- **Tests:** after applying, run `node scripts/carousel-templates/verify.mjs`
  against the rows read back from the database, not only the files.
- **Done when:** `list_tables` shows the new shape, the advisors report
  nothing new, a second `generating` brief on the same lane is refused by the
  database, and both templates read back identical to their JSON files.

### DEV-02. Materialise and render claims as database functions

- **Size:** M.
- **Depends on:** DEV-01.
- **Flows:** F2 step 2, F3 step 2. **Port spec:** §C.3.
- **Why a function:** **Render (n) decks** sends a whole batch to the painter
  at once, and in Auto the worker does the same without anyone pressing
  anything. Glow Up ids are `GU-<n>` and Covered Eye `CE-<n>`; two decks
  computing "highest plus one" at the same moment would collide. The id, the
  lane row and the pointer back to the draft must land together. (This used
  to say "Approve all unflagged on 20 decks sends 20 approvals at once"; that
  press was dropped on 2026-09-14 — corrected 2026-09-21. The race it
  describes is the same one, now run by rendering.)
- **Build:**
  - `carousel_materialise_draft(draft_id, lane_values jsonb)`: takes a lock
    per lane, allocates the next id for that lane's format, inserts the lane
    row with exactly the template's `lane.set_on_materialise`, and stores the
    lane row id in the draft's `generation_metadata.lane_row_id`. **Refuses a
    draft that is already materialised, flagged, or dropped** — it used to
    refuse "a draft that is not approved", and there is no per-deck approval
    to check (corrected 2026-09-21). It is the painter that calls this, when
    the deck renders.
  - `carousel_withdraw_approval(draft_id)`: deletes the lane row **only if**
    it has not been claimed for rendering (`render_status = 'queued'` for
    Glow Up; `status = 'scripted'` and `rendered_at is null` for Covered Eye),
    and returns the draft to Written. Refuses otherwise.
    **No screen calls this any more** (2026-09-21): Withdraw approval went
    with the per-deck approve on 2026-09-14, and rejection after rendering
    happens at gatekeeping, outside the app. Do not build it unless something
    asks for it.
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
  - Covered Eye: cover-only with the fallback to the whole set, distinct
    within the food set allowing a repeat if the set runs out.
  - Glow Up: the per-slide pools, four distinct covers on slide 1, the
    diagonal rule with brightness matching from the stored `luminance`
    (tolerance 40, nearest when none are in range, category variety as the
    tiebreak).
  - A deterministic random generator seeded from the deck's id. It does not
    need to match Python's; stability comes from saving the manifest on the
    lane row (Glow Up `render_manifest`) or the draft before painting.
  - Thin sets (one image) are normal, not errors. An **empty** set the
    template needs is an error naming the set, which DEV-15 also uses to
    block Generate. A set with nothing in it and **a library with no sets at
    all** are different: the second is ordinary (D8), and a template that
    names no set draws from the whole library.
- **Tests:** seeded runs produce the same manifest twice; the diagonal rule
  never puts a matching pair in one row; an empty set fails with its name;
  a one-image set repeats; a template naming no set draws from the whole
  library.
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
  - **Mentions in the direction are resolved, not passed through as words**
    (Garreth, 2026-09-22, approving D17 — this is a requirement, not an
    option). The Writing stores the plain characters `@hook`; before the
    prompt is sent, each mention is matched against the **active template's**
    boxes and replaced with what that box actually is — its role and its
    character limit — so the model is told *which text slot the instruction is
    about* instead of having to infer it from the surrounding prose. That is
    the whole point of the feature: stored plainly, resolved deliberately. A
    mention matching no box **resolves to nothing and is dropped from the
    prompt** rather than sent as a literal `@closing` the model will try to
    honour; the screen has already said so beside Save version (DEV-19b), and
    a dropped mention is recorded in `generation_metadata` so a deck written
    against a stale Writing can be explained afterwards.
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
  caption strip removes a brand and a molecule name that the model put in; a
  direction carrying `@hook` resolves to that box's role and limit in the
  built prompt, and one carrying a renamed box's name drops the mention
  instead of sending it as a word.
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
  - Call the **Content Risk Gate** webhook (n8n `Content Risk Gate
    (Pre-Publish)`, `w3YwEhm5CZtHts0P`, `POST /webhook/content-risk-gate`)
    with `items: [{content_id, type, text_hook, caption, on_screen_text}]`,
    the way `[Content Audit] Pre-Publish Gate` does, on every written
    version. `risk_level = high` or `action = delete` is a rejection; keep
    the `violations`, `llm_reasons` and `suggestions` it returns. Record the
    verdict on the draft so the lane row can carry it (DEV-11).
  - Below 6.0, any compliance hit or a gate rejection: **Flagged** with the
    reason in words ("Score 5.2", "Compliance: brand name", the gate's own
    violation), the gate's suggestions pre-filled in the Regenerate box.
    Never rejected automatically; never rendered while flagged.
  - The gate or scorer call failing: Flagged "Not gated" / "Not scored", with
    Retry; a deck with no verdict cannot be rendered.
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
  - Runs **as each deck is written**, right after the copy lands, so a track
    that cannot post is flagged on the card while the batch is still writing
    (D3) and can be fixed on the review screen before anything is rendered
    (D4's **Retry music lookup** and **Change track**). **Decided
    2026-09-21**, replacing "runs after approval, not while writing, so
    discarded decks cost no lookups": the approval it waited for was dropped
    on 2026-09-14, and it sat after the rendering, which is too late to save
    the cost of painting a deck whose track cannot post. Auto mode needs this
    timing too — a missing track is one of the flags it retries three times
    (DEV-49), and Auto never sees the review screen.
  - **The cost is per new track, not per deck.** A track found once is
    written into `music_library`, so every later deck that picks it — in
    this batch and in every future one — is a database match and free. What
    this timing spends that the old one did not is the lookups for a new
    track on a deck later discarded.
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
  | `POST batches/[id]/decks/[position]/write` | Writes, or retries, one deck; runs the gate and the music lookup (DEV-10), so a bad score or a track that cannot post flags the card while the batch is still writing |
  | `POST batches/[id]/continue` | Returns the next unfinished step, for resuming |
  | `POST batches/[id]/render` | **Render (n) decks**: takes every written, unflagged deck and hands it to the painter (DEV-12), which writes the lane row |
  | `POST batches/[id]/approve` | **Approve (n) decks** on the finished batch: the one sign-off (DEV-18) |
  | `POST drafts/[id]/redo`, `…/redo-slide`, `…/change-track` | New versions (DEV-08) |
  | `POST drafts/[id]/withdraw` | `carousel_withdraw_approval` |
  | `POST drafts/[id]/discard` | Marks the draft discarded; not offered once approved |
  | `POST batches/[id]/finish` | **Finish here**: closes a stopped batch with what was done, freeing the lane |

  - **No per-deck approve, and no 5-second window.** Both were dropped on
    2026-09-14 (corrected here 2026-09-21). A deck is written, checked by the
    gate and by the music lookup, and then either regenerated or sent to the
    painter by **Render (n) decks**; the lane row is written when it renders.
    The only approval is **Approve (n) decks** on the finished batch.
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
  `gatekeep_status = 'approved'` (the gate's verdict, with `gatekeep_notes`
  and `gatekeep_reviewed_at`; never `'pending'`), `approved = false`,
  `scheduler_ready = false`.

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
  - Rendered: the lane row is complete with art, caption and music, still
    `scheduler_ready = false` until Approve (DEV-18).
  - `POST /api/carousel-generator/batches/[id]/render` returns the next deck
    to render, so the page asks for one at a time.
- **Tests:** unit tests for the flag reasons; a branch run rendering the
  DEV-11 batch.
- **Done when:** three Glow Up decks render in the deployed preview, their
  URLs open, and a query shows them rendered with the gate's verdict on
  `gatekeep_status` and `scheduler_ready` still false.

### DEV-13. Generator components

- **Size:** M.
- **Depends on:** the approved D3 to D5 designs.
- **Designs:** D4 (the deck card first), D3, D5.
- **Build** in `src/components/carousel/`, from the existing `Card`, `Pill`,
  `CtaButton`, `HoldButton`, `Dropdown` and skeletons:
  - `DeckCard`: every state in D4 and D5 (Writing as the empty card, Written,
    Flagged with reason, Up next and Rewriting, Track not found with Retry
    music lookup and Change track, New track, Music lookup failed, Rendering,
    Rendering elsewhere, Rendered with thumbnails and outlined slides,
    Approved, Dropped with its reason (D12), Failed with slide number and
    Retry), plus **Try (n) of 3** beside a deck Auto is retrying. Regenerate
    at the foot of the card, Regenerate per slide, the version switcher, and
    Discard deck as the hold, inside the More menu. (The old list had
    "Approved with its 5-second undo" and "Withdraw approval"; both went with
    the per-deck approve on 2026-09-14 — corrected 2026-09-21.)
  - `ProgressLine`: "7 of 20 written", `aria-live="polite"`, the stalled
    variant in the warn tone naming the deck and when it last moved.
  - `UndoToast`: five seconds, one Undo. No toast component exists yet.
    **Nothing in the batch screens needs it now** that the per-deck approve
    and its bulk undo are gone; keep it only if another screen asks for one.
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
- **Build:** this screen lives at **`/carousel-generator/types`** (D16, approved
  2026-09-22 — Overview took `/carousel-generator`, where the `SectionStub`
  still is; DEV-56 replaces that one and moves this one). Its card list, its
  numbers and its Generate are exactly as D1 left them; only the address and
  the menu's order changed.
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
  - Not wired: the pill, and **an ordinary Generate** (Garreth, 2026-09-15,
    replacing "no Generate button"; drawn on the approved D1 and D7 boards).
    A type's first batch is made and judged before wiring; its approved decks
    wait for **Wire** on the type's page (DEV-19b, Phase 4).
  - **Needs writing** (D13, approved 2026-09-22): a type saved out of the
    Studio with nothing written carries a **neutral** pill reading *Needs
    writing* — no new pill colour, like *Not wired* — beside an **ordinary,
    pressable Generate**, which opens the form as always. The form is where
    the requirement is enforced (DEV-15). A card has room for one pill and
    shows the blocking one, so a type that is both unwired and unwritten
    shows *Needs writing*; the type page's header has room for both and shows
    both (DEV-19b).
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
  - **Writing** read-only with its version and a link to the Writing tab.
  - **Note**, one line, placeholder *anything specific about this batch?*
    (D13). No instruction text beside it — the placeholder does the
    explaining.
  - **A type with no Writing saved** (D13): the Writing row is drawn in the
    **danger stroke**, its line reads *No writing* in red, and **Write**
    stands in Edit's place in the row's corner, red with it — the one red
    thing on the page. The stroke is there when the form opens, not after a
    press. Only the Writing row is drawn this way; the library row is left as
    D2 approved it.
  - The template's `per_batch` choices, rendered from the copy contract, not
    hard-coded per lane.
  - Generate is unavailable with no library, while a set the template needs
    is empty, or with no Writing saved, and the reason is named beside it —
    *No image library*, *No images in Cover and Before*, *No writing*
    (DEV-06, D13).
  - From the approved D2 (Garreth, 2026-09-14): **Undo** beside Change puts
    the previous library back after a repoint; the library picker lists each
    library's cover, name and image count, and opens as a centred modal on a
    phone; on a phone, Generate sits in a bottom bar with the reason it is
    unavailable beside it.
  - **Open:** the form has no datestamp field (Garreth, 2026-09-14), but the
    Glow Up template prints a month and year on a slide for each batch. Where
    that value comes from is not decided yet.
  - Submit calls `POST batches` and opens the batch page.
- **Done when:** a batch can be started for each lane from the form, a
  repoint shows up as a new template version by query, and a type with
  nothing written reaches this form from an ordinary Generate press and is
  stopped here, not earlier.

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

### DEV-17. Batch page: review, and send it to the painter

**Rewritten 2026-09-21.** It described a per-deck **Approve**, an **Approve
all unflagged**, a 5-second undo and a **Withdraw approval**. None of them
exist: the per-deck approval was dropped on **2026-09-14**, and the only
sign-off in the app is **Approve (n) decks** on the finished batch (DEV-18).
The one press on this screen is **Render (n) decks**. The approved D4 is the
design; F2 was corrected the same day.

- **Size:** M.
- **Depends on:** DEV-16, approved D4.
- **Designs:** D4. **Flows:** F2, F14.
- **Build:**
  - **Regenerate** at the foot of every card, opening the feedback box with
    its picker (Deck, Hook, or a slide). A whole deck waits as **Up next**;
    one slide rewrites in place. Either way it is a new version.
  - The **version switcher**: *Version 2 of 2*, arrows on the card's edges on
    the desktop, a sideways swipe on the phone. The version showing is the
    version that counts.
  - **Retry music lookup**, split with a caret opening **Change track** (the
    music-library search, F14). A changed track is a new version with only
    the music different.
  - **Discard deck** inside the card's **More** menu.
  - **Render (n) decks** as the accent, naming its count, leaving out flagged
    decks and tracks still being checked. **"(n) flagged"** in the progress
    line jumps from one flagged deck to the next.
  - Keyboard: **`J` and `K`** next and previous card, **`R`** opens the
    focused card's feedback box. Focus visible, no animation. (`A` went with
    the approve press.)
  - **Nothing on this screen writes a lane row**; that happens at rendering
    (DEV-12).
  - **In Auto mode the screen is skipped** and the batch renders itself
    (DEV-48). Pause brings the press back.
- **Done when:** a 20-deck batch can be reviewed and sent to the painter with
  the keyboard alone, and a query after **Render (n) decks** shows the lane
  rows written by the painter, not by this screen.

### DEV-18. Batch page: render and finish

- **Size:** S.
- **Depends on:** DEV-12, DEV-17, approved D5.
- **Designs:** D5. **Flows:** F3.
- **Build:** "4 of 12 rendered", thumbnails filling in, flagged slides
  outlined, the full-size preview, the Grid / Rows view switch, Rendering
  elsewhere, Failed with Retry, and the finished line counting rendered and
  flagged decks with **Approve (n) decks** (accent) and **Regenerate (n)
  decks** (Garreth, 2026-09-15). `POST /api/carousel-generator/batches/[id]/approve`
  sets `scheduler_ready = true` and `approved = true` on every rendered,
  unflagged lane row of the batch in one database function, audit-logged
  with who pressed it; a partial failure leaves the rest approvable.
  Regenerate (n) sends every flagged deck back through DEV-09 with the gate's
  suggestions as feedback. Approve works while flagged decks remain. On
  phones Approve sits in the bottom bar and Regenerate (n) under the title.
- **Done when:** a batch renders from the page, and running the old Python
  painter against the same rows at the same time picks none of them up.

### DEV-19. History, the content type page, and image libraries (read-only)

Three screens, each its own piece of work; grouped here because none blocks
the others.

**DEV-19a. History** · S · depends on DEV-11 and approved D9 · flows F4, F5.
The table of briefs (date, type, requested, written, rendered, approved, and a
status — approved is last, being the sign-off on the finished batch; no "who
ran it" column, the app names nobody), filter pills by type, a date-range
dropdown, stopped rows with
Continue, **Run again** (clones type, count, note and per-batch choices under
the current direction and library, or opens the running batch instead), and a
re-run shown paired with its original. First run and no-results states.
Stacked rows on phones. Adds History to the menu.

**DEV-19b. Content type page, Overview and Writing tab** · M · depends on
DEV-01 and approved D7 · flow F6 (Phase 2 steps). `/carousel-generator/types/[slug]`:
details, template versions, its batches, Generate. The tab row reads
**Overview · Writing · Go Live**. The Writing tab as a plain editor: active
version and date, **Save version** writes a new active version, past versions
with **Make active**. Both writes in one database function so there is never
zero or two active versions. **Edit template** arrives in Phase 3; the Go Live
tab in Phase 4.
- **From the approved D17 (Garreth, 2026-09-22) — naming a text box while you
  write.** The text-box names listed under the editor stop being labels and
  become how a name gets into the Writing:
  - **Drag a pill into the editor** and it drops in at the point it was
    dropped, with the caret line showing where that is while the drag is in
    flight. **Pressing a pill** inserts it at the caret — the fast route on
    the desktop and the only one a phone has, so both are built, not one.
  - **Typing `@` opens the names**, filtered as more is typed, one highlighted,
    Enter or a press to choose. The menu **only stays open while what follows
    the `@` still matches a box name**, so writing *never @ anyone* is not
    interfered with, and **Escape closes it and leaves the plain characters
    alone**. On the phone it opens above the caret, which sits on the last
    line of a short editor. Each row names the box's character limit, which is
    the number D14 measures.
  - **What is stored is plain text** — the characters `@hook`, in the same
    single `carousel_lane_directions.direction` column, which nothing else has
    to learn to read. The screen highlights a mention by matching the name
    against the **active template's** boxes each time the Writing is shown.
  - **This changes the editor itself, and that is the bulk of the work.** A
    mention is drawn as the mono pill inline in the sentence, and a pill
    cannot live inside a plain `<textarea>`; the editor becomes a rendered
    surface, the way the suggested-change view already is. The *field* stays
    words — that promise is about what is saved, not about what is typed into.
  - **A mention that matches no box says so twice** (Garreth's decision after
    seeing both): the mention goes muted in the sentence — fill dropped, dotted
    underline, never red, because such a Writing is stale rather than broken —
    **and** a count sits beside Save version, *n text boxes no longer exist*.
    It is not decoration: a dead mention is exactly where the prompt resolves
    to nothing (DEV-08) and the model is told about a box that is not there,
    and this is the only warning that ever surfaces.

From the approved D13 (Garreth, 2026-09-22):
- **The empty editor** carries a grey placeholder — the shape of a good
  instruction, not an instruction to write one — gone the moment anything is
  typed: *who is speaking, and to whom · what each slide has to do · the
  words to use, and the words never to use · how the caption should read*.
- **The Studio's drafted note pre-fills the editor and does not count as
  saved**, under a neutral **Not saved** pill. The requirement is met by a
  person having read it and pressed Save version, not by the field being
  non-empty.
- **The template's text-box names** are listed along the **foot** of the
  editor card, left of Save version — `hook`, `line`, `closing` — and at the
  foot of the card on a phone. Not beside it: the right-hand column is the
  Conversation at full height, and moving the names to a side would mean
  moving the Conversation (approved as drawn).
- **The header shows both pills** when a type is fresh out of the Studio —
  *Not wired* and *Needs writing* — where the card on Carousel types has room
  for one and shows the blocking one. **Generate in the header stays an
  ordinary button.**

**DEV-19c. Image libraries, read-only** · S · depends on DEV-01 and approved
D8 · flow F7 steps 1 and 2. The grid as boards — a mosaic of three of the
library's own images, its name and its image count, and nothing else — and one
library showing its sets as folder cards with the images in no set under **Not
in a set**, covers marked. Opening a set goes a level down with a breadcrumb
back. Adds Image libraries to the menu. Read-only here: the image modal, Tag
with AI, New set and the amber unread dot arrive with DEV-29 and DEV-30.

- **Done when:** each screen matches its design in both themes at both
  widths, with numbers that match a direct query.

### DEV-54. The Rows tab: what is sitting in the lane

- **Size:** M.
- **Depends on:** DEV-19a (the type page and its tabs).
- **Designs:** D15 (D7). **Flows:** F18.
- **Why** (Garreth, 2026-09-21): a lane says nothing is postable and has 240
  rows in it, and no screen answers *why*. Inventory gives the number; the
  batch page says what the generator did in one run; neither says a row is
  sitting there with no caption.
- **Read-only.** Nothing on this tab writes. There is no accent button, no
  hold, no delete. If a ticket ever wants to change a row from here, it is a
  new decision by Garreth, not an extension of this one.
- **Build:**
  - A fourth tab, **Rows**, between Writing and Go Live, at `?tab=rows`. The
    panel ids and state names keep the words the docs and the database use.
  - One query per page against the type's lane table, named from
    `content_type_registry` — **never** an interpolated table name from the
    URL. Fifty rows a page, newest first, with a total and a count of the
    rows that are ready to post. Two numbers, one round trip.
  - **A fixed set of columns**, because these tables are 32 to 66 columns wide
    and no two are alike: slide 1 as a thumbnail, the id, the caption, the
    music, the posting date and the profile where there are any, and the
    status. Stacked rows on the phone, with the date and the profile leading
    the quiet line and the music taking what room is left. Tabular figures.
  - **The status is derived, not stored**, and its words are fixed:
    **Ready**, **No caption**, **Not gatekept**, **Not rendered**,
    **Assigned**, **Posted**. Derive in SQL, in one place, so the list and the
    counts line can never disagree:
    - `posted_at` present → **Posted**
    - else assigned to a profile with a date → **Assigned**
    - else no slide 1 → **Not rendered**
    - else no caption → **No caption**
    - else `gatekeep_status` is not the gate's pass verdict → **Not gatekept**
    - else → **Ready**, and only these count in *n ready to post*
  - **Tone:** Ready is the ok green; **No caption** and **Not gatekept** are
    the warn amber; the rest are the plain neutral pill. No new colour. The
    split is *is anything going to move this row by itself?* — see F18.
  - A row with no slide 1 shows an **empty dashed frame** where the thumbnail
    goes, not a broken image and not a spinner.
- **Two empty states**, both filling the card to the bottom of the screen with
  the shared `EmptyState` (every ancestor a flex column; `FillAncestors` for
  Safari):
  - **Not wired:** no lane table exists. *No rows until this type goes live*,
    with a secondary **Go Live** that switches tabs. No counts line.
  - **Wired and empty:** the counts line reads *0 rows · 0 ready to post*, and
    the state under it says *No rows yet*.
- **Fails:** the lane table cannot be read — a type wired outside the app, or
  a table since renamed. Say so where the counts line goes, with **Retry**.
  **Never fall back to an empty table**, which reads as "nothing here" and is
  the opposite of the truth.
- **Watch:** the two amber states cannot be produced by the generator — a deck
  that fails at writing is flagged in its batch and no lane row is written
  (F2), and the lane row carries the gate's verdict, never `'pending'`. Every
  row in those states came from the old n8n path. Do not "fix" this by hiding
  them; they are the reason the tab exists.
- **Done when:** a wired type with rows shows them fifty a page in both themes
  at both widths, the counts line and the status column agree with a direct
  query against the lane table, both empty states reach the bottom of the
  screen, and nothing on the tab issues a write.

### DEV-55. A row's drawer, and the way back to its deck

- **Size:** S.
- **Depends on:** DEV-54.
- **Designs:** D15 (D7). **Flows:** F18 steps 4 and 5.
- **Why** (Garreth, 2026-09-21): the fixed columns are a readable summary; the
  drawer is the whole truth, and an empty column is the answer to why a row
  cannot post.
- **Build:**
  - A whole row opens a drawer: **every column that row has, in the table's
    own order** — the only order a lane table reliably gives — with an empty
    one shown as a dash rather than left out. Read the column list from the
    table itself, so a lane with 66 columns needs no code change. The head
    carries the id, the column count and the status pill.
  - **Desktop:** in from the side, so the table is still read behind it.
    **Phone:** the sheet Preview and the Conversation already use, with each
    column's **name over its value** — side by side, a URL breaks across three
    lines at 390px. Escape and X close it either way.
  - A strip of the deck's slides across the top; a row with nothing rendered
    gets the same empty dashed frames as the table.
  - **One secondary button, Open the deck**, pinned under the scrolling
    columns so it survives thirty-six of them. It opens that deck in the batch
    it came from — always a finished batch, since a lane row exists only after
    render and approve. **It changes nothing**; it points at the screen that
    already owns the fixing.
  - **A row with no batch has no button** — the old n8n rows have nowhere to
    go. Do not disable it and do not explain it: the `batch` column in the
    list reads as a dash, which says why. This tab carries no instruction text.
- **Done when:** a row with 36 columns and one with 66 both open a drawer
  listing every column in table order in both themes at both widths; the
  caption column of a **No caption** row reads as a dash; **Open the deck**
  lands on that deck in its batch; and a row with no batch shows no button.

### DEV-56. Overview becomes the landing, and Carousel types moves

- **Size:** M.
- **Depends on:** DEV-13, DEV-14.
- **Designs:** D16. **Flows:** F17, F1 step 1, the screen inventory and the
  menu table.
- **Build:**
  - **Overview at `/carousel-generator`**, and **Carousel types at
    `/carousel-generator/types`**, beside the type page's own
    `/types/[slug]`. The Generate hub's **Carousel** card points at Overview.
    Repoint every in-app link to Carousel types. Nothing is built yet, so no
    redirect is owed; add one anyway if anything outside the app has the old
    address.
  - The menu gains **Overview** as its first item under ← Dashboard, with
    `SquaresFour` — the icon `icons.tsx` already exports as `LayoutDashboard`.
    Carousel types keeps its item, under it. **No item carries a count.**
  - The page's shape: the title, then **Today**; then **Running Tasks beside
    Carousel types**; then **Trending Carousels beside Saved**. On a phone all
    five stack in that order. The right-hand column is 380px, so Carousel
    types and Saved share one spine down the page.
  - **Each pair of columns ends level:** whichever section is the taller sets
    the height and the other fills down to meet it. It has to work both ways
    round — on the all-clear board the types card is the taller one and
    Running Tasks' empty line grows to meet it.
  - **A section heading is the height of a secondary button** whether or not
    it carries one, so the two columns of a row start level as well as end
    level.
  - Nothing on this page writes.
- **Done when:** the Carousel card opens Overview with the menu's first item
  lit; Carousel types answers at its new address with its card list unchanged;
  and both pairs of columns start and end level in both themes at both widths,
  including the states where the shorter section is the other one.

### DEV-57. Overview: Running Tasks

- **Size:** L.
- **Depends on:** DEV-56, DEV-11, DEV-14; and DEV-48, DEV-52 and DEV-53 for
  Auto and for the wording.
- **Designs:** D16. **Flows:** F17 steps 3 and 4.
- **Build:**
  - **One query**, and the same one DEV-58 and DEV-59 read: every batch that
    is **working** or **waiting for a person**, working first, then waiting,
    newest first. Working is writing or rendering. Waiting is written and not
    rendered (*n to render*), rendered and not approved (*n to approve*), a
    manual or paused batch with a flagged deck (*n flagged*), or a batch that
    stopped (*Stopped*).
  - **Read the state off the counts, the way History does** (DEV-53): a dash
    and a nought both mean the press has not happened.
  - **A finished and approved batch is not here.** Neither is a flagged deck
    inside a **running** Auto batch — Auto takes it back itself, which is why
    the bell stays quiet for it too (DEV-52). Pause the batch and it appears.
  - **The words are D12's and no others** (see the warning at the head of this
    file).
  - **The card:** the ring or the grid at the left, the name and the state,
    then the **Auto** / **Auto paused** pill and the time together at the
    right, then a caret. The whole card is the press. **Nobody is named on it.**
  - **The loader a working batch carries:** a 3×3 grid of 6px cells 2px apart,
    delays `(column + |row − 1|) × 90ms`, a 650ms `ease-in-out` cycle between
    0.12 and 1 opacity — shorter than the sweep, so two fronts are always in
    the air and it never looks stalled. **White while writing, `--accent`
    while rendering.** Its line shimmers: a 90° gradient muted → primary →
    muted at 200% width, `background-clip: text`, 1.4s linear.
  - **The elapsed time ticks** where the date sits on the other cards, in
    tabular figures so it does not jitter: `6m 12.4s`, to a tenth under a
    minute.
  - **A waiting batch carries a still ring** — a track at 18% of the text
    colour — with the stage's icon inside: `SealCheck`, `Play`, `Flag`,
    `Pause`. **The flag and the pause are `--danger`.** The flag's **words
    stay neutral**: History's rule is that only a status meaning something
    went wrong is red, and *Stopped* is still the only one.
  - **Reduced motion:** the grid holds still at a readable opacity rather than
    its dim 0.12, and the shimmer stops. The timer still ticks.
  - **Empty:** *Nothing running, nothing waiting*, one line in a quiet dashed
    box that fills down to meet the column beside it.
- **Done when:** a batch moving from writing to rendering changes its grid's
  colour and its line without the card being rebuilt; a finished and approved
  batch never appears; a flagged deck in a running Auto batch never appears
  and the same deck appears the moment the batch is paused; and for any one
  batch the words here, in the bell and in History's Status column are the
  same words.

### DEV-58. Overview: Today, the four counts

- **Size:** S.
- **Depends on:** DEV-56, DEV-57, DEV-11, DEV-12.
- **Designs:** D16. **Flows:** F17 step 2.
- **Build:**
  - Four tiles — *Written today*, *Rendered today*, *Approved today*, *Needs
    input* — each the dashboard's own `MetricTile` from
    `analytics-charts.tsx`: the `.dot-fade` corner, `rounded-nested`,
    `--card-raised`, the small label over the figure. **No delta and no
    sparkline** (Garreth, 2026-09-22), and the figure at 40px, which is what
    the room bought.
  - The three "today" counts are **decks, not batches**, on the dashboard's
    own day boundary (America/New_York, as every other *today* in the app).
    Pin the zone in the query; the instance's own default is not it.
  - ***Needs input* is the count of Running Tasks cards waiting for a person**,
    read from DEV-57's query and never a second one, so the box and the
    section under it cannot disagree.
  - **A count that cannot be read shows a dash, not 0.** A nought is an answer.
- **Done when:** the four figures match a direct query; *Needs input* equals
  the number of still-ringed cards below it in every state, including 0 on the
  all-clear; and a count that errors shows a dash rather than a nought.

### DEV-59. Overview: the Carousel types section

- **Size:** S.
- **Depends on:** DEV-56, DEV-14, DEV-57 (for what is running).
- **Designs:** D16. **Flows:** F17 step 5.
- **Build:**
  - **Five rows, ordered by the type's most recent batch**, newest first. A
    type never generated has no date and sorts last, so one made in the Studio
    yesterday is still reachable from here. Retired types are not in this
    section.
  - A row is the **name**, the **character** pill and **Generate** — the
    accent button at the secondary size D1's cards carry, none singled out.
    **No days of cover** (Garreth, 2026-09-22): it is Inventory's number, and
    this section is the way to generate. Carousel types itself still carries
    it.
  - A type whose batch is **writing or rendering** reads **Open running
    batch**; a **stopped** batch does not, because it is not writing into the
    lane. Read it from DEV-57's query, so this section and Running Tasks
    cannot disagree about what is running.
  - The name opens the type's page. **Generate opens the Generate form**,
    which is where a missing Writing is named and marked (DEV-15, D13) — the
    row never blocks the press.
  - **All Carousel Types** sits opposite the heading, as *All trends* and *All
    saved* do, and opens Carousel types. It always shows.
- **Done when:** the order follows the most recent batch with never-generated
  types last; a type with a writing batch reads *Open running batch* both here
  and on its own card; and Generate opens the form for the right type.

### DEV-20. Phase 2 live proof

- **Size:** S, spread over a few days of waiting.
- **Depends on:** everything above, and DEV-07's sign-off.
- **Plan:** §9 Phase 2.
- **Build:** nothing new. Run one real batch per lane from the deployed app,
  review it, render it, and press Approve (n) decks.
- **Watch:** posting is paused fleet-wide for the Geelark exit (2026-09-14),
  so "posted live" waits for Garreth to resume the accounts. Until then, the
  proof stops at the approved rows showing in `v_scheduler_pool`, and the
  nightly Pre-Publish Gate leaving them untouched the next morning.
- **Done when:** for each lane, the Smart Scheduler has assigned at least one
  generator-made deck and the Posting Agent has posted it, confirmed by query
  against `unified_posts` and the post record. Only then does Phase 3 start.

---

## Phase 3 — the front: the Studio

### DEV-21. Studio canvas, slides and inspector

- **Size:** L. Round three's slide controls (2026-09-17, below) add to it,
  but it stays inside the week's guess.
- **Depends on:** DEV-03, DEV-04 (fonts), approved D6. D6's round three, the
  slide controls, was approved by Garreth the same day
  (2026-09-17); the rest of the ticket does not wait on it.
- **Designs:** D6. **Flows:** F8 steps 4 and 5. **Plan:** §4.7.
- **Build:** `/carousel-generator/studio` and `/studio/[template]`.
  - The canvas draws the template as HTML at true slide shape, scaled to fit,
    with the **same bundled font files** as the painter.
  - **Every slide sits in a row on the canvas**, which pans in every
    direction and zooms from 25% to 200% (D6, 2026-09-15); select a text box
    or an image cell; drag to move. This line read "Filmstrip of slides"
    and the ticket was titled "Studio canvas, filmstrip and inspector" until
    2026-09-17: the filmstrip went on 2026-09-15, when D6's third review put
    every slide on the canvas, and the wording here is corrected to match
    (Garreth, 2026-09-17, D6 round three, approved the same day). Plan §4.7 still says
    filmstrip; the approved design is the truth.
  - Inspector for a text box (font, weight, size, stroke, shadow, alignment,
    wrap width) with the change shown at once; for an image cell, which
    library set it draws from, and "No images" when the set is empty.
  - **The box's copy contract sits above Font** (D14, approved by Garreth
    2026-09-22). Three rows, and nothing else in the inspector moves:
    - **Name** — a text field pre-filled from the AI's draft. It *is* the
      box's key in the template's copy contract, so renaming it renames that
      key and the writer (DEV-08) writes against the new one. A name already
      used **on the same slide** is refused with **Taken**, the same word and
      the same danger stroke the Save dialog's short name uses, and is not
      saved; names need not be unique across slides, since four slides each
      carrying a `line` is the ordinary case. Emptying the field saves
      nothing — the box keeps the name it had.
    - **Written by** — a segmented control across the panel's width, because
      four options do not fit beside an 84px label: **AI**, **Fixed**, **Per
      batch**, and on a layered slide also **Set**. Fixed opens a sub-row for
      the words themselves, stored on the template and painted on every deck
      of the type. **Per batch** means the Generate form (DEV-06) asks for it,
      the way it already asks for the opening line, so adding a Per batch box
      adds a field to that form. Set keeps D11's existing behaviour and its
      **Fact** dropdown, which moved into this row.
    - **Fits n characters** — a read-back, never an input. Measure it from
      the box's wrap width and the bundled font files the painter uses, and
      recompute it whenever wrap width or size changes. Do not store a typed
      limit: a new box has no painted history to take one from, which is why
      this is measured rather than entered.
  - **A text box is never unnamed** (Garreth, 2026-09-22). A box the AI
    drafted carries its role; a box added from the tool strip is created
    already named **Text Box 1**, the number counting the boxes added to that
    slide in the order they were made — so the next one is Text Box 2, and the
    first free number is used if one was deleted. There is therefore **no hole
    in the copy contract to guard against**: nothing here holds Generate, and
    the Generate form has no missing-name state to mark. Do not build one.
  - **Every text box on the selected slide shows its name** on the canvas, in
    a tag above the box — the selected box's in the accent, the others in a
    dark chip that reads over a photograph in either theme. Before D14 the tag
    showed only on the selected box and its text came from the box's position,
    so three boxes on one slide all read the same.
  - **No per-box description field.** What a box is for is said in the type's
    Writing (DEV-19), one place to read rather than two; the box names are
    listed beside that editor (DEV-19b).
  - Every change edits the template object and is saved as a draft template
    row (`status = 'draft'`) a moment after the last change, so a closed tab
    loses nothing.
  - Undo and redo for canvas edits. **Undo covers deleting a slide** (Garreth,
  2026-09-17, D6 round three, approved the same day): Delete is a plain press, not a
    hold, because Ctrl or Cmd+Z brings the slide back, and the AI's reply
    after a delete says so.
  - The generator menu folds to icons while the Studio is open.
  - **Slides can be added, duplicated, deleted and moved** (Garreth,
  2026-09-17, D6 round three, approved the same day). Until this pass the AI's draft
    set the slide count and nothing on the screen could change it: the tool
    strip added a text box or an image cell to a slide, never a slide.
    - A dashed **Add slide** slot the size of a slide sits after the last one
      on the canvas, at the type's size; pressing it adds a slide at the end.
      On the desktop, hovering the gap between two slides shows a plus that
      inserts a slide there. The phone has no hover, so it has the slot and
      the menu only.
    - Each slide's caption carries a menu (three dots, shown on hover and on
      the selected slide; always shown on the phone) with **Duplicate**,
      **Move left**, **Move right** and **Delete**. Move left is unavailable
      on the first slide and Move right on the last. The menu is a solid
      surface, like the versions list.
    - **A new slide takes the layout of the slide before it** (its boxes,
      cells and styles), and the writer (DEV-08) writes that one slide's line
      to fit between its neighbours under the current direction. While it
      writes, the new slide's text boxes pulse, the top strip reads
      **Writing slide 4** and the conversation says what it is doing; when
      the line lands the AI says what it did. A **duplicate** keeps the text
      too and asks the writer for nothing. Regenerate sample still rewrites
      the whole deck. The design draws no failure state for the one-slide
      write; until it does, treat it like the draft call failing (F8: the
      error in the conversation, with Retry).
    - **A carousel keeps at least two slides**: at two, Delete is unavailable
      with **Keep at least two slides** under it.
    - **Layered decks (D11) have the same controls**: a new slide copies the
      layers of the slide before it, and a duplicate copies its copy too
      (Garreth, 2026-09-17).
    - **The slide count in the top strip follows** ("Slide 4 of 7"), and each
      slide's own settings, images and **Rendered** mark travel with it when
      it moves, so they belong to the slide and not to its position.
    - **The conversation can do the same**: "Make it eight slides" adds two
      and the canvas follows. The buttons and the chat are two doors to the
      same edit operations on the template object, the way images already
      work.
    - **In edit mode a changed slide count saves a new version** (DEV-24),
      like a changed slide size.
    - **Not decided: the most slides a carousel may have.** Instagram allows
      twenty; the design sets no cap. Open question 6 at the end of this
      document. Until it is answered, build without a cap and keep the number
      in one place so it is a one-line change.
- **Tests:** unit tests for the edit operations on the template object
  (move, restyle, change set) and that the result still validates. **Added
  for round three** (Garreth, 2026-09-17, D6 round three, approved the same day): add at
  the end, insert after a slide, duplicate, delete and move each leave the
  template valid; a new slide copies the layout of the slide before it and a
  duplicate copies its text as well; delete refuses at two slides; moving a
  slide carries its settings, images and Rendered mark with it; undo after a
  delete puts the slide back in its old place with its copy; the slide count
  read back is right after every operation.
- **Done when:** the Glow Up template opens and edits in the Studio, and the
  canvas matches D6 at desktop. **And for round three** (Garreth,
  2026-09-17, D6 round three, approved the same day): a slide added after slide 3 of
  Glow Up arrives with slide 3's layout and a freshly written line, Delete on
  a two-slide deck is unavailable, a moved slide keeps its Rendered mark, and
  after a delete Ctrl or Cmd+Z brings the slide back — seen on the canvas and
  in the saved draft row, by query.

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
    library's sets, a direction note) as structured output, validated with
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

### DEV-25. Writing conversation

- **Size:** M.
- **Depends on:** DEV-19b.
- **Flows:** F6 (Phase 3 steps). **Plan:** §6.4.
- **Build:** a conversation beside the writing on the Writing tab, ported
  from `direction-chat.js` onto Claude: proposes a revised direction, cites
  accepted rules from `content_knowledge_base` by `rule_key`, asks at most one
  question, says plainly when direction cannot change something. The proposal
  shows as a difference against the active text. **Save version** saves it,
  recording the cited rule keys; the bot never saves. A failed call shows
  under the message with Retry.
- **From the approved D13b (Garreth, 2026-09-22) — a type with nothing
  written:**
  - **The empty panel fills its card**, in `EmptyState`'s shape: a muted
    circle, the line *Nothing written for this type yet.*, and under it one
    **secondary** button, **Write a first draft**, with *from the active
    template and its n slides* beneath. Secondary matters: Save version is
    the tab's only accent.
  - **The offer sends one prompt** built from the type's active template and
    its slides — how many there are, their size, and what each box is for —
    and the answer lands in the editor **unsaved**, under the same **Not
    saved** pill DEV-19b draws for the Studio's note. The same code path, so
    a Studio-made type and any other type end in the same state. Save version
    stays a person's press, so the Writing requirement does not move.
  - **The box has two placeholders**, on whether a version has ever been
    saved: *What should this type sound like?* before the first, *What should
    change?* after. One input, no new control.
  - **The offer's own failure** is the existing failed shape — the message
    with **Retry** — and the editor is left empty.
  - **On the phone** the conversation is a sheet behind the floating button,
    so the same offer also renders under the empty editor, above the
    text-box names. One wording in both places. The button's dot means
    something new is waiting in the conversation, a suggestion or a first
    draft.
- **From the approved D17 (Garreth, 2026-09-22):** the conversation's box
  takes the same mentions as the editor. A pill dropped or pressed there
  inserts exactly what it inserts in the editor — there is no second
  behaviour — and `@` opens the same menu. **The reply uses the mentions
  back**, so the exchange and the Writing read alike and *make @hook shorter*
  is a question about a box rather than about a word. On the phone the
  conversation is a sheet, so the pill row is carried inside the sheet too;
  otherwise the names are out of reach exactly where they are being discussed,
  which is the shape of problem D13b already solved by putting its offer in
  two places.
- **Done when:** a direction change proposed in the chat is saved as a new
  version with its cited rules, by query; a mention put into the box by drag,
  press and `@` reaches the model resolved, and the reply names the same box
  the person did; and a type with no Writing reaches
  a saved first version through the offer alone, on desktop and on a phone,
  without the field ever being filled by anything but a person's press.

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

### DEV-28. Go Live tab

- **Size:** M.
- **Depends on:** DEV-27, DEV-10, approved D7.
- **Designs:** D7 Go Live tab (renamed by D13). **Flows:** F11.
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
- **Build:** **New library** as a tile at the end of the grid, with a name
  and an empty state that fills the page; **New set**, which makes a folder at
  the level you are on and nests one deep; **Upload**, which lands images in
  the library and into a set only if someone puts them there, with a Failed
  tile and Retry per upload; the image modal, with background removal, black
  and white, an AI edit that waits for Keep, Make cover and Move to another
  set; **Retire image** as a hold. A retired image drops out of
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
- **Build:** the **Generate images** form (prompt; base image, optional —
  one or more of the library's own images or one uploaded; how many, up to 8;
  shape: portrait, tall or square). **It never picks a set** (Garreth,
  2026-09-16): what it makes lands in the library. Generating tiles, then the
  review row with **Keep** and **Discard**. A kept image joins the library
  with its prompt, shape, base images and who kept it recorded, and stays
  **untagged** until it is read. One failed image shows Retry; out of credits
  shows the reason on every waiting tile.
- **Done when:** eight images are generated into a new library, some kept and
  some discarded, and only the kept ones are available to a template.

### DEV-41. Image details: AI vision reads a library

Numbered out of sequence because it was added after D8 was approved
(2026-09-16), and it belongs here beside the other library work. It carried
the number DEV-36 until 2026-09-17, when the reopened D10 took DEV-36 to
DEV-40 for the Trends feed; renumbered here so that no two tickets share a
number. The D8 note in the design tickets records the same renumbering.

- **Size:** M.
- **Depends on:** DEV-19c, DEV-29.
- **Designs:** D8. **Flows:** F7 steps 7 and 8.
- **Why:** this is what makes a sequence hang together. The picker (DEV-06)
  chooses by set and by the template's rules; the details are what let it, and
  the Studio's AI, tell one Before photo from another.
- **Build:**
  - Write the details onto `carousel_images` — **its own columns, not new
    ones**: `content` (a written description), `emotion`, `subject`,
    `setting`, `framing`, `color_palette`, `image_type`, `arc_roles` (a list:
    Hook, Before, After, Stack, Reveal, Payoff, Confession), `pillar`, `tags`,
    `quality_score` and `has_subject`. Read from Supabase on 2026-09-16; 79
    rows already carry them, so the vocabulary is set by the live data, not
    invented.
  - **Tag with AI** on a library: asks which images (only the ones not read
    yet, or all) and whether to file them into sets at the same time, then
    runs a Claude vision pass per image, with progress and a Stop.
  - One image can be read on its own from its modal, and read again.
  - **Nothing is read automatically** (Garreth, 2026-09-16): an uploaded or
    generated image arrives untagged and keeps its amber dot until someone
    reads it.
  - The details show in the image modal as metadata, and the unread count
    shows on the library's board.
- **Watch:** a vision pass over a full library is the expensive part. Cost per
  image and a sane batch size are worth measuring on one library before it is
  offered over a bank of hundreds.
- **Tests:** a run over a small library fills every column; a failed image
  keeps its dot and does not stop the run; re-reading replaces rather than
  appends.
- **Done when:** a library is tagged from the screen, the details match a
  direct query, and DEV-06's picker can read them back.

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

**Reopened 2026-09-17 (Garreth).** D10 was approved on 2026-09-16 with two
tabs, Digests and Knowledge base. It has been reopened and redesigned in
place — the same design ticket, the same build file, the same canvas pages;
**there was no D12 for it** (D12 is Auto mode, added 2026-09-21). The Trends page now opens on a **Feed** of the carousel
library with a search bar over it, and Digests and Knowledge base become the
second and third tabs, unchanged in substance. DEV-34 and DEV-35 below are
rewritten for that, and DEV-36 to DEV-40 are new. These tickets are written
now, in parallel with the design rather than after it, at Garreth's request,
so the screen wording here follows the brief the design is being drawn from.

**Round three, 2026-09-19 (Garreth approved D10's third round that day).**
The developer handover's frontend addendum (2026-09-17) was read against the
page, and then the page was checked against the live database, which changed
more than the document did. **DEV-34 is rewritten** for the page as it now
is; **DEV-35, DEV-36, DEV-37 and DEV-39 are amended**; and **DEV-42 to DEV-47
are new**: the details window, the filters, the votes, the unseen feed,
analysis on demand, and the query embedding the search function needs.
(DEV-41 is the image-details ticket in Phase 4, so the new numbers start at
42.) What was found in the database is written into the tickets that depend
on it, with the date it was read.

**Build order inside this phase (round three, 2026-09-19):** DEV-32 → DEV-33
as before, then **DEV-36 → DEV-45 → DEV-37 → DEV-44 → DEV-34 → DEV-42 →
DEV-47 → DEV-39 → DEV-43 → DEV-38 → DEV-35 → DEV-46 → DEV-40**. The feed's
order, what has been seen, saves and votes exist before the page that shows
them; the details window comes with the page; the search needs its embedding
before it is wired, and its filters after; analysis on demand is last because
it is the one piece that reaches into the pipeline outside this repo.

**Build order as it stood after round two (Garreth, 2026-09-17), kept for the
record:** DEV-32 → DEV-33 as
before, then **DEV-36 → DEV-37 → DEV-34 (amended) → DEV-39 → DEV-38 →
DEV-35 → DEV-40**. The feed's order and its Save both exist before the page
that shows them; the two searches are wired after the cards they render into.
The tickets below are listed by number, not in that order.

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
  **Only carousels are kept for the page** (D10, approved 2026-09-16): filter
  on `references_unified.format`, not on the address — a TikTok carousel and a
  TikTok video share the `/video/<id>` shape, so the format is the only thing
  that tells them apart. A link already in the library is kept or dropped at
  once; a new one is queued and joins the digest's carousels only if it turns
  out to be one. The pattern pass still reads a video's analysis where one
  exists: a video can support a rule without being shown. Store the digest's
  **carousel count** as well, since that is what the page shows.
- **Watch:** analysis of new links depends on the external worker whose owner
  is still unknown (plan §10, item 3). If it is down, links stay Queued, which
  the page shows; the ticket is not blocked by it.
- **Tests:** link extraction over real digest bodies, including shortened and
  tracking-parameter URLs.
- **Done when:** a real digest is analysed, its new links appear as references
  within the bridge's five-minute cycle, and a re-analysis picks them up.

### DEV-34. Trends page: the feed, the search bar, Saved, digests and the knowledge base

*Rewritten 2026-09-19 for D10's third round. Round two's text is in git
history; everything it decided that still holds is restated here.*

- **Size:** L.
- **Depends on:** DEV-33, DEV-36, DEV-45, DEV-37, DEV-44. D10 approved
  2026-09-16, redesigned in place 2026-09-17 (round two) and 2026-09-18/19
  (round three, approved 2026-09-19).
- **Designs:** D10, on its own canvases since 2026-09-18 (the how-to lists
  them). **Flows:** F15, F16, F12, F13.
- **Build:** `/carousel-generator/trends`. **Four sections on a vertical rail
  of buttons down the left of the page**: **Feed** first and open by default,
  then **Digests**, **Knowledge** (the table behind it is still
  `content_knowledge_base`) and **Saved**. **No section carries a count.** On
  a phone the rail is a floating bar along the bottom of the screen.
  - **Only the posts scroll** (Garreth, 2026-09-17). Build it as a fixed page
    frame with one scrolling region, not a scrolling document: the title and
    the search box, the rail and the Recent saves panel are pinned. The
    scroller spans the whole section, the posts centred inside it by padding,
    so a wheel over the empty space either side scrolls the feed too.
  - **Widths.** Posts and search box **500px** on the desktop; rail **200px**;
    Recent saves panel **300px**; the column centred **between them, not on
    the page** (76px either side on a 1440px screen).
  - **Header.** The title **Trends** and one search box as wide as the posts.
    **Inside the box, at its right, the search-type picker** — Meaning (the
    default), Exact words, How it's built, How it looks, Comments — and **just
    outside it a round filter button** carrying a small count when filters are
    on (DEV-43). The format lives in the placeholder; there is no instruction
    text anywhere. Nothing runs until Enter or the search icon. **On a phone**
    the box sits beside the title on the same row with the filter button after
    it, and the search type is the first group of the filter sheet, the box
    being too short for it.
  - **The post**, top to bottom: header row (platform mark, handle, the date
    **only when it is known**, **View Post** at the top right, opening
    `references_unified.source_url` in a new tab with `rel="noopener
    noreferrer"`); a muted line of topic tags; the slides at 4:5 as **a
    horizontal scroll-snap track**, with the counter, the arrows on hover and
    the dots; **a row with thumb up and thumb down at the left (DEV-44) and
    Copy to Studio (DEV-35) and View Details (DEV-42) at the right**; **the
    numbers on a line of their own**; then the hook as the caption with the
    handle in bold. **A number that is null is left off the line — never
    printed as 0** (the handover's rule; build the line from the parts that
    exist). Posts run down the column with a thin divider and no card box.
    **Every button on a post is a quiet grey outline; the Feed has no accent
    action** (Garreth, 2026-09-17). **A post has no Save** (Garreth,
    2026-09-18): Save is in the details window. Pressing the handle shows that
    creator's carousels (DEV-38). On a phone the image runs edge to edge.
  - **What the feed holds, and its ends** (DEV-45 supplies the lists): the
    carousels this person has **not seen**, best-scored first; **No more new
    carousels** and a quiet **See older carousels** after the last of them,
    carrying on into the seen ones, most recently seen first; **That's every
    carousel** at the end of those. With nothing new at launch, a small **No
    new carousels** line over the last ones seen, which scroll on into the
    older ones without a button. When new ones land while the page is open, a
    quiet **"n new carousels"** button at the top brings them in; **the feed
    never reorders itself under the reader**. Twenty to a page, the next
    post's outline and the busy icon while a page loads.
  - **Saved** is **a grid three tiles across** (Garreth, 2026-09-19), the same
    component as the search results: each tile the post's **cover**, the
    carousel mark, an `n slides` badge, newest saved first (DEV-37). A tile
    opens the details window. Empty: **Nothing saved yet**.
  - **Recent saves**, desktop only: the last five saves to the right of the
    feed — thumbnail, handle, views and likes — each **opening the details
    window**, with **View all saves**. The phone has no panel.
  - **Search results replace the feed in place**: the results line
    (`14 carousels for "under-eye serum" · best match first`; **"The 25 best
    matches for …" when the page is full**, because the search returns 25 at
    most and a total was never asked for; **Nothing matches "…"** when there
    are none), then **the filters the search ran with as chips, each with an X,
    and Clear all when there is more than one** (DEV-43), then the accounts
    that match as a short list (DEV-38), then **the grid**: three across, each
    tile **the slide that matched** (DEV-39 returns its image), with the
    carousel mark and the `n slides` badge. **A tile opens the details window
    on that slide** (DEV-42); closing it leaves the grid where it was. The X
    on the search box clears the search. Searching from any other section
    switches to Feed.
  - **A search on its way:** the results line reads **Searching for "…"** with
    the busy icon, over six skeleton tiles. **A search that failed:** **The
    search timed out** with **Retry**, where the results would be — never the
    "nothing matches" state, which means something else.
  - **A slide whose image has gone** shows a muted frame reading **Image
    gone**. The post and its buttons stay.
  - **Empty states.** **No carousels yet** fills the screen only when the
    library itself is empty. **Nothing in the library matches** sits inline
    where the grid would have been.
  - **Layers.** The shell's page glow sits above the page content. Anything
    that must cover the page — the details window, the phone's filter sheet —
    has to sit above the glow, or the glow washes over it (found in the design
    build, 2026-09-19).
  - **Digests**, unchanged in substance: a narrow column of dates newest
    first, the open one beside it — its body readable in place, the rules it
    proposed, then the **carousels** it read with their slides and **Copy to
    Studio**. Queued links show when they were queued. **Analyse** sits only
    on the newest digest nothing has been run on; it is the page's one accent.
    A digest is counted in **carousels, not links** (DEV-33).
  - **Knowledge**, unchanged: pending rules first, filterable by type and
    confidence, with **Accept** and **Reject** (see *Proposed defaults*, item
    4), then the rules already accepted. Adds Trends to the menu.
- **Watch:** the design's own build script proved that an icon handed over as
  a template value renders as escaped text. Icons belong in the markup.
- **Done when:** the page opens on Feed with only unseen carousels and scrolls
  them **with the title, the search box, the rail and the Recent saves panel
  staying put**; the end of the new ones offers the older ones; a search shows
  its searching state, then its accounts and a grid of tiles with the filters
  it ran with as chips; a tile, a post's View Details, a Saved tile and a
  recent save all open the same details window; a timed-out search says so;
  a post with a null number prints the others and no 0; **View Post** opens
  the original on its platform; and a rule accepted on Knowledge is cited by
  the Writing conversation (DEV-25).

### DEV-35. Copy to Studio

- **Size:** S.
- **Depends on:** DEV-23, DEV-34.
- **Flows:** F9, reached from a feed card (F15) or from a digest's carousel
  list (F12).
- **Build:** **Copy to Studio** opens the Studio's reference variant
  (DEV-23) with that reference id. The button was called **Recreate this**,
  then **Use as reference**, both on 2026-09-17; it is **Copy to Studio**
  everywhere now (Garreth, 2026-09-17, second review of round two), on the
  screen, in the flows and in the designs. Same action, same destination — only
  the name changed.
  It is reached from **three places and lands in the same one** (round three,
  2026-09-19): the button row on a **feed post**, where it sits beside View
  Details; the foot of the **details window** (DEV-42); and a carousel in a
  **digest's** list. **The details window's Reusable pattern — what to keep,
  and its limits — is the part of a reading most worth handing to the Studio
  with the reference**; the Studio's reference variant (DEV-23) should read
  `reference_analysis.inferred->'reusable_pattern'` where it exists. This is
  where the link gets aimed: the design prototype lands on the deck picked
  since 2026-09-17 (it opened the Studio at its start before, because the
  Studio took a type's name and character rather than a reference). Only carousels
  carry it — videos never reach the page (DEV-40), and the Studio drafts a
  template from slides.
- **Done when:** the button opens the Studio from a feed post, from the
  details window **and** from a digest's carousel list, all on the same
  reference, and the draft saves as a
  type with `source_reference_id` set.

### DEV-36. Feed ranking and paging

- **Size:** M.
- **Depends on:** nothing new. The reference tables are already full: 4,293
  rows in `references_unified`, of which 1,246 are carousels, checked live on
  2026-09-17.
- **Designs:** D10 (reopened 2026-09-17).
- **Build:** one tracked migration adding `carousel_feed_page(after_score,
  after_id, limit)`, the order the Feed is drawn from.
  - Reads `references_unified` where `format` is carousel, ordered by
    `total_score` descending, then `views_normalized` descending, then `id`.
    Paging is **keyset**: the caller hands back the last card's score and id
    instead of an offset, so a card cannot be shown twice or skipped while
    the workers keep writing. `limit` is twenty for the page. **There is no
    `topic` parameter**: the feed is one list, because the chip row that would
    have filtered it by type is gone (Garreth, 2026-09-17, first review of
    round two).
  - Returns what a card shows, straight from `references_unified`:
    `creator_handle`, `platform`, `hook_text`, `views`, `likes`, `saves`,
    `source_url`, `published_at` and `thumbnail_url`. Slides come from
    `reference_beats` by `source_reference_id` in position order
    (`position`, `visual`, `media`), falling back to `thumbnail_url` when a
    reference has no beats. The topic and hook-family pills come from
    `reference_analysis.topic` and `.hook_family`, filtered to the
    `perez-slides-v1` run.
  - **What "Trending" means here** (Garreth, 2026-09-17): the library's own
    ranking, not what is trending on TikTok this week. `published_at` is null
    on every carousel in the library today, so there is no recency to rank
    by. **The screen no longer says so** — the "Trending in the library"
    caption went in the second review of round two — so the order is worth
    knowing here even though the page never names it. When real dates arrive,
    a recency term is added inside this function, not on the page.
  - The search schema was provisioned outside this repo, so
    `supabase/migrations/` holds none of it today. This function and the
    other new pieces (DEV-37, DEV-38) go in as **tracked migrations** here,
    with execute revoked from `public`, `anon` and `authenticated` by name
    and `proacl` read back.
  - **Round three (2026-09-19):** the feed no longer shows the whole library
    in this order; it shows what the signed-in person **has not seen**, in
    this order. This function stays the library's ranking, and **DEV-45**
    wraps it with the person and the seen list. Counted 2026-09-18: 1,252
    carousels; **every one has `views`, and `published_at` is still null on
    all of them**. A null `likes` or `saves` must reach the page as null, not
    0 (DEV-34 leaves a null number off the line).
- **Tests:** paging from the top to the end returns each reference id exactly
  once.
- **Done when:** the Feed scrolls the whole library in pages of twenty, with
  no card repeated and none missed, in the order this function sets.

### DEV-37. Favourites: Save on a card

- **Size:** S.
- **Depends on:** DEV-36.
- **Build:**
  - A tracked migration for `reference_favourites`: `id`, `reference_id`
    (bigint, references `references_unified`), `saved_by` (text, the session
    email), `saved_at`. **Unique on `(reference_id, saved_by)`** so a double
    press cannot save the same carousel twice.
  - RLS on, with a policy that only ever matches rows whose `saved_by` is the
    signed-in email, and grants named to `authenticated` only — nothing to
    `anon` or `public`. This is the one new table the browser may read as
    itself; everything else stays service-role.
  - A route handler toggles it, starting with `requireSession()` and writing
    through the server helper with `auditLog()`. **Who saved it comes from
    the session, never from the request body.**
  - **Favourites are personal** (Garreth, 2026-09-17): a save belongs to the
    email that made it, newest saved first. The table is shaped so that a
    shared team view later is a change of filter, not a new table.
  - **The Saved section** (Garreth, 2026-09-17, second review of round two,
    answering open question 5): the rail's second button lists
    `reference_favourites` for the **session email**, joined to
    `references_unified` for what a card shows, **newest `saved_at` first**,
    and drawn in the feed's own layout (DEV-34). Empty, it reads **Nothing
    saved yet**.
  - **The Recent saves panel** on the desktop takes the **last five** rows of
    that same query, with the thumbnail, the handle, views and likes — one
    small query, not a second table.
  - **Round three (2026-09-19):** **Save is pressed in the details window**
    (DEV-42), not on a feed post, which carries View Details in its place.
    **The Saved section is a grid**, three across, each tile the carousel's
    cover (its first `reference_beats.media`, falling back to
    `thumbnail_url`) with its slide count — the search results' own tile
    component — and a tile opens the details window, which is also where a
    carousel is unsaved. A **Recent saves** row opens the details window too,
    rather than the Saved section.
- **Done when:** pressing Save twice leaves one row, the saved state survives
  a reload, and a carousel saved on the Feed appears at the top of Saved and
  in the Recent saves panel.

### DEV-38. Account search

- **Size:** S.
- **Depends on:** DEV-36, DEV-34.
- **Build:**
  - A tracked migration adding `search_creators(q)`: `creator_handle` matched
    case-insensitively over `references_unified` where `format` is carousel,
    unioned with `creators.handle`; it returns the handle, the platform, how
    many carousels that handle has in the library, and its top views. Execute
    revoked by name, as DEV-36 says.
  - **There is no Accounts scope any more** (Garreth, 2026-09-17, second
    review of round two): this function stays exactly as written, but it is
    called from the **same one route handler** as the carousel search
    (DEV-39), for the same query, and its answers are drawn **above** the
    carousel results. A result is a
    compact row — handle, platform mark, carousel count, top views — and
    pressing one shows that creator's carousels as ordinary feed cards with
    the handle pinned as a chip (DEV-34). Pressing a card's **handle** lands
    in the same place, which is how a person reaches the original creator now
    that the card has no link out.
  - There were 1,005 distinct creators in the library on 2026-09-17, so this
    is a small, fast list, nothing like the carousel search.
- **Done when:** typing `ari` and pressing Enter returns `ari.adoree` with her
  carousel count above the carousel results, and pressing her row fills the
  feed with her carousels.

### DEV-39. Carousel search wiring

- **Size:** M.
- **Depends on:** DEV-34.
- **Build:**
  - `POST /api/carousel-generator/search`, **one route handler for the one
    search box**: it takes a single query and runs **both** database functions
    on the server — **`search_carousel_library`** for the carousels and
    **`search_creators`** (DEV-38) for the accounts — and returns **both
    lists**, the accounts to be drawn above the carousels (Garreth,
    2026-09-17, second review of round two). There is no scope parameter,
    because the search box has no scope switch.
    `search_carousel_library` is already live and works: it merges a word search and a
    meaning search (embeddings) over `carousel_search_documents`, 25,113 rows
    on 2026-09-17, and blends the two rankings.
  - Called with mode hybrid, channel meaning, limit 25, and **no reranking in
    v1**: the handover measured 13 to 33 seconds with reranking on, and this
    bar is meant to answer in a few seconds (Garreth, 2026-09-17).
  - It returns ranked reference ids with the slide that matched and a short
    excerpt, and **the matched slide's image with it** (Garreth, 2026-09-17,
    fourth review of round two): its `reference_beats.media` for that
    position, falling back to `references_unified.thumbnail_url`, plus the
    reference's slide count for the **`n slides`** badge. The page draws the
    carousels as **a grid of 4:5 tiles, three across** (DEV-34), each tile
    that matched slide, and opens the post alone in the feed's own layout when
    a tile is pressed.
  - The handover's hosted `/v1/search` HTTP API was never deployed and is not
    needed — the app calls the database function through its own server, so
    no key ever reaches the browser. Every excerpt and every line of
    reference text renders as **plain text**.
  - **Round three (2026-09-19), read from the live function on 2026-09-18.**
    Its arguments are `p_query, p_embedding, p_channel, p_mode, p_limit,
    p_reference_ids, p_creator, p_topic, p_audience, p_status, p_date_from,
    p_date_to, p_exact, p_semantic_floor, p_keyword_weight,
    p_semantic_weight, p_embedding_model`.
    - **`p_embedding` is required** for hybrid and semantic searches on every
      channel but `literal`: the function raises *"An embedding is required"*
      without one. The handover's Node service made it; this app must
      (**DEV-47**). Until then only `p_mode = 'keyword'` works.
    - **`p_channel` comes from the search-type picker**: Meaning → `meaning`,
      Exact words → `literal` with `p_exact = true`, How it's built →
      `construction`, How it looks → `visual`, Comments → `comments`.
      Coverage differs by channel, because only one analysis run wrote some
      kinds of search document: `meaning`/`literal`/`construction` reach
      nearly all of the 1,143 searchable carousels, **`visual` about 834 and
      `comments` about 710**. The screen says nothing about it; a thin result
      on those two is expected, not a bug.
    - **What is searchable:** a carousel with enabled, non-empty
      `carousel_search_documents` rows whose `inspection_status` is not
      `blocked` — **1,143 of 1,252** on 2026-09-19 (84 unread, 24 blocked, one
      read but never indexed). The feed shows all 1,252, so a carousel can sit
      in the feed and never turn up in a search until it is read (DEV-46).
    - **Filter the results to carousels.** The function does not take a
      format; join the returned reference ids to `references_unified` and keep
      `format = 'carousel'` (DEV-40), asking for a few more than 25 so that a
      page is still full after the videos drop out.
    - **The count line:** the function returns at most `p_limit`. When 25 come
      back, the page says **"The 25 best matches for …"**; it never prints 25
      as though it were a total.
    - **Time out at 20 seconds** on the server and return a distinct error the
      page can tell from an empty result (DEV-34 draws them differently).
    - Topic, hook style and views filtering is **DEV-43**.
- **Watch:** the searchable documents are written by workers that are still
  running (the last index job was 12:16 UTC on 2026-09-17), so the count
  grows. That is fine; nothing here caches it.
- **Done when:** one real query comes back within a few seconds carrying both
  lists and a picture for every carousel it returns, and renders as the
  matching accounts above a grid of tiles in place of the
  feed, with the words-first count line above them.

### DEV-40. Videos stay out of the feed

- **Size:** S. A decision and the check that it holds.
- **Depends on:** DEV-36.
- **Build:** nothing new. **The feed shows carousels only** (Garreth,
  2026-09-17, carrying forward what D10 decided on 2026-09-16). DEV-36's
  format filter is what enforces it, and DEV-33 already filters a digest the
  same way, so the decision is written down once here and held in one place.
  - Filter on `references_unified.format`, **never on the address**: a TikTok
    carousel and a TikTok video share the `/video/<id>` shape, so the format
    is the only thing that tells them apart.
  - Revisit when video analysis lands. There were 235 `video_enrich` jobs
    queued on 2026-09-17 and nothing on this page reads them.
- **Done when:** the decision is recorded here, and a direct query of the feed
  function returns no row whose format is anything but carousel.

### DEV-42. The details window: details, analysis, transcription

- **Size:** L.
- **Depends on:** DEV-34, DEV-37, DEV-44.
- **Designs:** D10 round three. **Flows:** F16.
- **Build:** one window over the Trends page, opened from four places — a
  feed post's **View Details**, a search-results tile (on the slide that
  matched), a Saved tile, a Recent saves row — and closed by the **X at its
  upper right**, the scrim or Escape, back to exactly where it was opened
  from. `role="dialog"`, `aria-modal`, focus trapped inside and returned to
  the opener on close.
  - **Desktop:** 1040×720. The slides at the left at 4:5, the feed's own
    scroll-snap track with the arrows, the counter and the dots. At the right:
    platform mark, handle, the topic line (with "Matches on slide 3" from a
    search), then **three tabs — Details, Analysis, Transcription** — and
    along the foot **thumb up, thumb down (DEV-44), Save (DEV-37)** at the
    left and **View Post** and **Copy to Studio (DEV-35)** at the right. All
    quiet.
  - **Details:** Views, Likes, Saves as three cells; Posted, Platform, Slides
    as rows; the whole caption. **Null reads "Unknown", never 0.**
  - **Analysis** reads `reference_analysis` for the reference. **Groups that
    open and close**: Summary open when the tab opens, the rest shut; several
    can be open at once; **a header is its name and a caret, nothing else**
    (Garreth, 2026-09-19: no counts). Over them a label from
    `inspection_status` — **Complete**, **Partial**, **Blocked** — and "Read
    by the model · date".
    - *Summary*, two across: `topic`, `angle`, `hook_family`,
      `inferred->>'story_structure'`, `emotional_tone`, `visual_style`, and
      "First shown on slide n" from `inferred->>'first_product_slide'`.
      **These are code words in the table (`outcome_preview`,
      `list_with_introduction`); map them to plain words in one place**, with
      a fallback that turns underscores into spaces for a value the map has
      not met.
    - *How it works*, as sentences: `inferred->>'hook_mechanism'` (Why it
      hooks), `opener_treatment`, `inferred->'payoff'` (its `position` as
      "Slide n." before its `description`), `proof_placement`,
      `cta_structure` (with `inferred->>'first_explicit_cta_slide'`).
    - *Reusable pattern:* `inferred->'reusable_pattern'` — `invariants` as
      **Keep**, `limitations` as **Limits**.
    - *Audience response:* `inferred->'audience_response'` — `themes` as tags,
      `questions` as a list; when both are empty, **Too few comments to
      read** (the model says so in its own `limitations`).
    - **A row or a group with nothing behind it is left out, never drawn
      blank.** Two analysis runs exist (read 2026-09-19): `perez-slides-v1`
      (835 carousels) fills all of the above; `phase0-multiformat-v1` (309
      carousels) fills only `hook_family` and `cta_structure`, with
      `story_structure` in `reference_format_evaluations`. For those the tab
      has three rows and no pattern or audience group. The strength scores in
      `reference_format_evaluations` are **not shown**. Model bookkeeping in
      `observed` (cost, requests, providers) is not shown either.
  - **Transcription** reads `reference_beats` in `position` order: the slide
    number, `visible_copy`, `visual_description` as a muted line under it, and
    `narrative_role` as a tag (also a code word — same map). Slide 1 is
    labelled **Opening slide**. **An empty `visible_copy` reads "No words on
    this slide"**; nothing is invented (about 300 of 6,461 slides). Over the
    list: **"All n slides read"**, or **"m of n slides read"** from
    `observed->'coverage'` (`inspected_images` of `supplied_images`).
  - **Partial keeps every row.** All 167 partial analyses have every analysis
    column filled; what is short is the slides fetched. Show the whole
    analysis under a Partial label.
  - **States shared by the Analysis and Transcription tabs**, since one
    reading makes both: not read yet (DEV-46's button), on its way, **Blocked**
    ("The slides could not be fetched", **Try again**), failed ("The analysis
    failed", **Retry**).
  - **Phone:** the window fills the screen. **The slides are pinned under the
    header and do not scroll away; the tabs and their content are a sheet
    that rides up over the slides as the reader scrolls**, until a strip of
    the slide (and its counter) is left, and lets go on the way back down; a
    grab bar at the sheet's top does the same on a press (Garreth,
    2026-09-19). The header and the foot never move. Honour
    `prefers-reduced-motion`.
  - Every line of reference and model text renders as **plain text**.
- **Done when:** the window opens from all four places on the right slide and
  closes back to the same scroll position; a carousel from each analysis run
  shows its own rows with nothing blank; a part-read carousel shows its whole
  analysis with "m of n slides read"; a wordless slide says so; a null date
  reads Unknown; and on a phone the sheet covers the slides on scroll while
  the slide strip, the header and the foot stay put.

### DEV-43. Search filters: topic, hook style, views

- **Size:** M.
- **Depends on:** DEV-39.
- **Designs:** D10 round three. **Flows:** F15 steps 11 and 14.
- **Build:** the filter button opens a panel under the search box (a bottom
  sheet on a phone, which also carries the search type): **three dropdowns,
  each starting on Any and taking one value**, with **Clear all** and
  **Apply**. Apply runs the search again. The button shows a count when
  filters are on. The panel is nearly solid in dark mode and **solid in light
  mode** (light has no blur, so anything less showed the results through it).
  Apply is filled in the ordinary text colour, **not the accent**.
  - **Topic → `p_topic`**, the one filter `search_carousel_library` has built
    in: one value, matched with `= any(topics)` on the search documents. The
    options are a **fixed list served by the server**, not every tag that
    exists: wellness, skincare, lifestyle, weight_loss, eye_care, peptides,
    glp_1 (their counts on 2026-09-18: 474, 389, 298, 237, 208, 168, 114;
    they overlap). The main analysis picks topics **from a fixed list of
    nine**, so the list does not drift; the search documents' `topics` array
    also carries about 200 stray free-text tags from the visual scout
    (`typography:bold_sans_serif`), which must not reach the dropdown.
    **291 of the searchable carousels have no topic**, so choosing one hides
    them.
  - **Hook style and Views are not arguments of the function** — they were
    applied by the handover's never-hosted Node service — so **apply them in
    our route handler**: ask the function for more than a page, join the ids
    to `reference_analysis.hook_family` and `references_unified.views`, filter,
    then cut to 25. Hook style's options are a fixed short list (outcome
    preview, information gap, list, recognition, question, contradiction): the
    column is free text with **189 distinct values**, so a list of everything
    is not possible. Views is 10k, 100k or 1M and over; every carousel has
    `views`.
  - **Not built, and why:** **Visual style** (614 distinct values over 835
    carousels — "How it looks" searches it in words instead); **Standout posts
    only** (`account_relative_outlier` is true on 4 carousels, of 309 scored)
    until the scoring covers the library; creator (the account search does
    it), dates and freshness (`published_at` is null everywhere), audience
    (empty on every analysis).
  - **Filters narrow a search; they do not filter the plain feed** (open
    question 8).
  - **The filters a search ran with sit over its results as chips**, each with
    an **X** that removes that one and runs the search again, and **Clear
    all** when there is more than one. They show over an empty result too.
    The chip reads the value only ("Eye care"), not "Topic: Eye care".
- **Done when:** a search with Topic and Views set returns only carousels that
  carry both, shows both as chips, and taking one off widens the result
  without retyping the query.

### DEV-44. Votes: useful and not useful

- **Size:** S.
- **Depends on:** DEV-36.
- **Build:** a thumb up and a thumb down on every feed post and in the details
  window. Pressing one fills it; pressing it again takes the vote back;
  pressing the other swaps it.
  - A tracked migration for `reference_votes`: `reference_id` (bigint,
    references `references_unified`), `voted_by` (text, the session email),
    `vote` (`up` or `down`), `voted_at`, `query` (text, null unless the vote
    was cast from a search result, then the query that found it). **Unique on
    `(reference_id, voted_by)`.** RLS on, rows visible only to their own
    `voted_by`, grants named to `authenticated` only, as DEV-37 does.
  - **Why our own table and not the handover's `/v1/feedback`:** that
    endpoint only takes a vote tied to a logged search query id, and a feed
    post has no query behind it; nor is that service hosted. Ours keeps the
    query text when there is one, so the votes can still inform search later.
  - A vote **approves nothing**: it never touches `human_approved`,
    `internally_tested` or any creative flag (the handover's rule).
  - Who voted comes from the session, never from the request body; disable
    the control while a vote is saving.
- **Done when:** a vote survives a reload, pressing twice leaves no row,
  swapping leaves one, and no creative flag changes.

### DEV-45. The unseen feed

- **Size:** M.
- **Depends on:** DEV-36.
- **Flows:** F15 steps 4 to 8.
- **Build:**
  - A tracked migration for `reference_seen`: `reference_id`, `seen_by` (the
    session email), `seen_at`; unique on `(reference_id, seen_by)`; RLS and
    grants as DEV-37.
  - **Seen means the post has been on the screen for about a second**
    (Garreth, 2026-09-19): an IntersectionObserver at about half the post's
    height, held for a second, then queued; send the queue in batches (every
    few seconds, and on leaving the page with `sendBeacon`). A post loaded
    below the fold and never reached is not seen. Upsert, so a second sighting
    changes nothing.
  - `carousel_feed_unseen(viewer, after_score, after_id, limit)`: DEV-36's
    order, minus the viewer's `reference_seen` rows, keyset-paged.
    `carousel_feed_seen(viewer, before_seen_at, limit)`: the viewer's seen
    carousels, **most recently seen first** — the same table read back, no
    second one. Execute revoked by name, `proacl` read back.
  - **A seen post stays in place for the rest of the visit** and is gone at
    the next launch: the page holds its list in memory and only the next
    fetch from the top excludes it.
  - **New while open:** poll the count of unseen carousels newer than the top
    of the list every few minutes; when it is above zero show the quiet
    **"n new carousels"** button (DEV-34). Pressing it puts them at the top.
    Never insert on its own.
  - The library grows by a handful of carousels a day, so after the first
    pass through it "No new carousels" is the ordinary morning.
- **Done when:** a carousel scrolled past is absent after a reload and one
  only loaded below the fold is still there; the end of the unseen ones offers
  the seen ones, newest seen first; and a carousel added to the library while
  the page is open is announced by the button, not dropped into the list.

### DEV-46. Transcribe and analyse, on demand

- **Size:** M, and the one ticket here that reaches outside this repo.
- **Depends on:** DEV-42.
- **Flows:** F16 step 7.
- **Build:** a carousel with no `reference_analysis` row (84 on 2026-09-19)
  shows **Not transcribed or analysed yet** and one quiet button,
  **Transcribe and analyse**, on both the Analysis and Transcription tabs.
  **One button** — the pipeline reads and analyses a deck in a single pass.
  - Pressing it must start the reading **at once**, not wait for the workers'
    two-minute schedule. The pipeline is n8n's (*PM Carousel Shared Analysis
    and Search*, `yzDMPwIOrBJYXivh`, and the Content Analysis Pipeline,
    `m19op1GcjoGfkIxd`), fed by `content_pipeline_jobs`. **First find out how
    a job is enqueued and whether the image-analysis workflow can be called
    directly for one reference** (a webhook on it is the clean way); do not
    copy the prompts into this app — the handover is firm that the analysis
    is not reproduced anywhere else. Completed dedupe keys are not
    re-enqueued, so a retry needs a fresh key or the job's own retry path.
  - The route handler starts with `requireSession()`, writes through the
    server helper with `auditLog()`, and **rate-limits** the button (each
    press is model spend).
  - The tabs poll the reading while it runs: **"Reading slide 3 of 7"**, the
    transcription filling in slide by slide as `reference_beats` rows land.
  - **The result is the carousel's, for everyone** — it lands in
    `reference_beats`, `reference_analysis` and `carousel_search_documents`
    like any other reading, so the next person sees it at once and **the
    carousel becomes searchable** (DEV-39). Nothing is stored per person.
  - **Blocked** carousels (24): the tab reads **Blocked**, "The slides could
    not be fetched", with **Try again**, which asks for the media to be
    fetched afresh before the reading; the pipeline already refreshes expired
    Instagram and TikTok media. **Failed:** "The analysis failed", **Retry**.
- **Watch:** n8n saves a workflow change as a draft until it is published;
  compare `versionId` with `activeVersionId`. And do not switch off or alter
  the permanent collection workflows to make this work.
- **Done when:** an unread carousel pressed in the window is transcribed and
  analysed within a couple of minutes without anyone touching n8n, shows the
  same result to a second signed-in person, and turns up in a search for words
  on its slides.

### DEV-47. The query embedding for search

- **Size:** S.
- **Depends on:** nothing new. **Blocks DEV-39.**
- **Build:** `search_carousel_library` needs the query's embedding handed to
  it (`p_embedding`) for every hybrid or semantic search; it raises an
  exception without one (read from the live function, 2026-09-18). The
  documents were embedded with **`openai/text-embedding-3-small`** (the
  function's `p_embedding_model` default, and it only compares against rows
  of that model), through OpenRouter in the handover's service.
  - A server-only helper that embeds the query text with **the same model and
    dimensions**, called from DEV-39's route handler before the function.
    Confirm the dimension against the `embedding` column before writing it.
  - The key lives in a server-only environment variable, never `NEXT_PUBLIC_`.
  - Cache by the normalised query text for a short while; people repeat
    searches.
  - If the embedding call fails, fall back to `p_mode = 'keyword'` so the box
    still answers, and log that it did.
- **Done when:** a meaning search for "tired eyes" returns a carousel about
  under-eye bags that does not contain the words, and a failed embedding call
  still returns keyword results.

### DEV-60. Overview: Trending Carousels and Saved

- **Size:** M.
- **Depends on:** DEV-56, DEV-34, DEV-36, DEV-37, DEV-42.
- **Designs:** D16. **Flows:** F17 steps 6 and 7.
- **Why it is here and not in Phase 2:** these two sections read the reference
  library. Until Phase 5 the page is its three upper sections and nothing is
  missing from it — it is not a stub with two empty boxes.
- **Build:**
  - **Trending Carousels:** the top of what the library scraped **today**,
    best-scored first, four covers with the handle and the view count under
    each. When nothing was scraped today, show the **newest scrape** instead
    and say so beside the heading, with its date. A quiet day must never read
    as today's winners.
  - **Saved:** the viewer's own `reference_favourites`, newest saved first, as
    a small grid of covers. **Saved means saved references, never our own
    decks** (Garreth, 2026-09-17): there is no way to save one of ours, this
    ticket does not add one, and the word keeps one meaning across the app.
  - A cover opens the **details window** over Trends (DEV-42), at the post it
    came from. **All trends** opens Trends on the Feed, **All saved** on Saved.
  - Views read **Unknown**, never 0 — DEV-42's rule, and the same numbers.
  - **The two sections end level** (DEV-56): Saved keeps the 4:5 tiles Trends
    itself uses and sets the height; Trending fills its covers down to meet
    it, with a floor at its own 4:5 height so a short Saved cannot squash them.
    When Saved is the shorter — nothing saved yet — its empty box grows
    instead.
  - **Carousels only.** Videos never reach the feed and must not reach here;
    filter on `format`, never on the address (DEV-34's rule).
- **Done when:** a day with a scrape shows today's carousels and says so, a
  day without shows the newest and names its date, a saved cover opens the
  details window at that post, and the two sections end level in both
  directions in both themes.

---

## Phase 6 — Auto mode: a batch that runs itself to the sign-off

**Added 2026-09-21**, after Garreth approved **D12** the same day. Everything
here is one feature: a switch on the Generate form that lets a batch write,
deal with its own flagged decks, render and stop at **Approve (n) decks**,
which stays a person's press. It touches screens that already exist rather
than adding any, so each ticket below extends a Phase 2 one. D12's section in
the design tickets is the written record of the rules; the states are drawn on
the D1, D2, D3, D4, D5, D7 and D9 canvases and run in the prototype.

**The wait it removes** is the **Render (n) decks** press on the review screen
(D4). There has been no per-deck Approve between writing and rendering since
2026-09-14.

### DEV-48. Auto mode: the worker that keeps going with the tab closed

- **Size:** L.
- **Depends on:** DEV-11, DEV-12, DEV-18, approved D12. **Blocks DEV-49 to
  DEV-53.**
- **Designs:** D12 (D2, D3, D5). **Flows:** F1, F3.
- **Why it is the big one:** today the open tab drives the batch. The page
  asks for one deck, gets it, asks for the next; close the tab and the batch
  stops (that is what *Stopped* means in DEV-11). Auto mode promises the
  opposite — Garreth, 2026-09-21: **it keeps running with the dashboard
  closed** — so the loop has to move to the server.
- **Build:**
  - `auto_mode boolean not null default false` on the brief, set when the
    batch is created (DEV-50) and readable by everything below.
  - A **worker** that owns an Auto batch from creation to the finished state:
    write the next deck, run the gate, deal with what it flags (DEV-49),
    render the next deck, run the vision check, deal with what that flags,
    and stop at the finished batch. It calls the same services DEV-11 and
    DEV-12 already expose — no second copy of the writing or painting.
  - **One worker per batch, never two.** Claim the batch the way DEV-12
    claims a lane row; a second claim is a no-op. A worker that dies mid-deck
    leaves the batch resumable, and the stopped rule in DEV-11 (nothing for
    60 seconds) still applies, so a dead worker shows as *Stopped* rather
    than as a batch that silently stalls.
  - **The page becomes a viewer, not the driver.** An Auto batch's page polls
    its state and draws it; it never asks for the next deck. A manual batch
    keeps working exactly as DEV-16 and DEV-18 describe.
  - Every step audit-logged with the worker as the actor, not a person: the
    app names nobody (D9), and Auto is not somebody.
- **Open:** where the worker runs is not decided. A route the app pings, a
  scheduled job, or a queue are all possible; whatever is chosen has to
  survive the tab closing, which is the whole point.
- **Done when:** a 20-deck Auto batch started in the deployed preview finishes
  writing **and** rendering with the tab closed from the first deck onwards,
  and a query shows every lane row rendered with `approved = false` and
  `scheduler_ready = false` — waiting for its person, exactly like a manual
  batch that reached the finished screen.

### DEV-49. Auto mode: three tries, then the deck is dropped

- **Size:** M.
- **Depends on:** DEV-48, DEV-09, DEV-12.
- **Designs:** D12 (D3, D5). **Flows:** F2, F3.
- **Why:** in Auto nobody is standing by to fix a flagged deck, so the batch
  has to have another go by itself — and has to know when to stop trying.
- **Build:**
  - **Every kind of flag is retried, three times** (Garreth, 2026-09-21): a
    copy flag from the gate (score, compliance, the risk gate, too similar) is
    rewritten with the gate's own suggested fix as the feedback; a track that
    was not found has its lookup run again; a slide flagged by the vision
    check after rendering is rewritten and rendered again.
  - A deck being retried shows **Rewriting** or **Up next** with **Try (n) of
    3** beside it. The counter belongs to a deck still being worked on: it
    goes once the deck lands.
  - After the third try the deck is **Dropped**: it stays in the batch,
    dimmed, with its reason in a quiet pill, never rendered and never
    approved. **Regenerate (n) decks** on the finished batch takes it along
    with the flagged ones, and a person can still regenerate it by hand.
  - **What the counts say.** A dropped deck leaves the denominator and is
    named beside it: "18 of 18 rendered" with **2 dropped**, and "11 of 18
    written" with **2 dropped** while the copy is being written. Both screens
    count the decks the batch will actually finish (Garreth, 2026-09-21).
  - `auto_tries` on the draft, so a retry count survives a worker restart and
    a batch cannot quietly try forever.
- **Done when:** a batch whose gate flags two decks ends with one of them
  rewritten and rendered and the other Dropped after three tries; the finished
  batch reads "(n) of (n) rendered" with "2 dropped"; and **Regenerate (n)
  decks** picks up the dropped deck.

### DEV-50. Auto mode: the switch, and the type that remembers it

- **Size:** S.
- **Depends on:** DEV-15, DEV-48.
- **Designs:** D12 (D2). **Flows:** F1 step 3.
- **Build:**
  - One switch on the Generate form, **Auto mode**, off by default, its own
    label and nothing else: no instruction text (the screen's rule).
  - Generate with it on sets `auto_mode` on the brief and hands the batch to
    the worker.
  - **The switch remembers the type** (Garreth, 2026-09-21): a carousel type
    whose last batch was made in Auto opens its form with the switch already
    on. After that it is the person's — a flip is not remembered until the
    next Generate. Read it off the type's last brief rather than storing a
    preference.
- **Done when:** a type generated in Auto opens its form with the switch on
  the next time, and a type generated manually opens with it off.

### DEV-51. Pause auto and Resume auto

- **Size:** S.
- **Depends on:** DEV-48, DEV-16, DEV-18.
- **Designs:** D12 (D3, D5). **Flows:** F2, F3.
- **Why:** taking the batch back has to be one press, and what you get back
  has to be the app you already know.
- **Build:**
  - While an Auto batch runs, the progress line carries an **Auto** pill and a
    **Pause auto** button — secondary, not accent, and no new pill colour.
    Paused, the pill reads **Auto paused** and the button **Resume auto**.
  - **Pause puts the batch back to manual** (Garreth, 2026-09-21): writing
    carries on, flagged decks wait for a person and ring the bell as they do
    today, and the rendering waits for **Render (n) decks**. A deck already
    queued to render keeps rendering; nothing in flight is thrown away.
  - **Resume** hands it back to the worker, which picks up whatever is
    waiting — including decks flagged while it was paused.
  - Pause is not offered on a stopped batch: there is nothing running to take
    back.
- **Done when:** pausing an Auto batch mid-write leaves it behaving exactly
  like a manual one — flagged decks waiting, the bell ringing, the writing
  ending at **Render (n) decks** — and Resume takes it the rest of the way to
  the finished batch without a press.

### DEV-52. The bell: Batch written and Batch finished

- **Size:** M.
- **Depends on:** DEV-11, DEV-48.
- **Designs:** D12 (D3, D4, D5). **Flows:** F2, F3.
- **Why:** a batch that needs its person should say so wherever that person
  is, and a batch that needs nobody should stay quiet.
- **Build:** two new kinds on the existing bell (`src/lib/data/notifications.ts`,
  `notification_reads` for per-person read state), category **Carousel
  Generator**, neither of them an error, so neither is `critical`:
  - **Batch written** — a manual batch that has finished writing and waits for
    **Render (n) decks**. Body: "Before & After · 18 to render, 2 flagged".
    Opens the review screen (D4), the screen that holds the press.
  - **Batch finished** — any batch, Auto or not, waiting for **Approve (n)
    decks**. Body: "Before & After · 18 rendered, 2 dropped". Opens the
    finished batch (D5).
  - **In Auto a flagged deck does not ring the bell**, because nobody is being
    asked to do anything. A flagged deck still rings its own item in a manual
    or paused batch, as it does today.
  - Both are raised by the server, not the page, so closing the tab does not
    lose them.
- **Done when:** finishing a batch in Auto with the dashboard closed leaves
  one unread **Batch finished** item that opens the batch on its finished
  state, and a flagged deck in that same batch raised nothing.

### DEV-53. What a batch is waiting for, on every screen that lists batches

- **Size:** M.
- **Depends on:** DEV-14, DEV-19a, DEV-19b, DEV-52 (for the wording).
- **Designs:** D12 (D1, D7, D9). **Flows:** F4, F5, F6.
- **Why** (Garreth, 2026-09-21): a finished batch must not sit unnoticed on
  one screen while another calls it done.
- **Build:** the same two words everywhere, neutral, never red — **(n) to
  render** and **(n) to approve** — each opening the screen that holds the
  press:
  - **Carousel types** (D1): where *Last batch* sits, the type's card carries
    the count as a small button. **Generate stays** — a batch waiting for its
    sign-off does not hold up the next one, unlike a running batch, which
    swaps Generate for *Open running batch*.
  - **The type's page** (D7): the two words join the column that already
    carries *Writing 7 of 20* and *Stopped*, and a waiting row beats *(n)
    flagged* — *(n) flagged* is what a finished batch says once nothing is
    waiting on it.
  - **History** (D9): the same two words in the Status column, where such a
    batch used to read *Done*.
  - **A batch made in Auto** carries a small neutral **Auto** pill on its
    History row, running or done. Nothing else changes.
  - **The rule, and the trap in it.** A batch is waiting for Render when
    nothing has been rendered, and waiting for Approve when nothing has been
    approved — **a blank and a nought mean the same thing for the status**
    (Garreth, 2026-09-21, replacing the 2026-09-16 reading). A batch with
    *some* approvals is Done: what it did not approve is what the checks
    caught, which is what *(n) flagged* says. So the query must not report a
    count of 0 where it means "not yet" **for the numbers** in the columns —
    those still tell a real nought from a blank — while the status itself
    treats them alike.
- **Done when:** a batch that has rendered and approved nothing reads "(n) to
  approve" on all three screens and opens the finished batch from each; a
  batch with some approvals still reads Done; and pressing Approve clears the
  waiting words everywhere without a reload of the other screens' data being
  needed to make sense.

---

## Decisions, open questions and proposed defaults

### Decided (Garreth, 2026-09-14)

1. **The Generate form's How many starts at 50** for every carousel type, the
   batch cap. The plan's "14-day shortfall" default is dropped: nothing
   calculates a shortfall per carousel type (`inventory_check` counts per
   character, and must not change because the digest email reads it). DEV-15.

### Decided (Garreth, 2026-09-17)

On top of D10 as approved on 2026-09-16, and all about the Trends page.

1. **The feed shows carousels only**; videos stay filtered out. DEV-36,
   DEV-40.
2. **"Trending" in v1 is the library's own ranking** — `total_score`, then
   `views_normalized` — because `published_at` is null on every carousel
   today. It was labelled **Trending in the library** on the screen until
   item 11 below took the label off. A recency term is
   added when real dates arrive. DEV-36.
3. **Favourites are personal**, one row per carousel per session email, in a
   table shaped so that a shared team view later is a change of filter.
   DEV-37.
4. **Search results replace the feed in place**, under the same header,
   rather than opening a screen of their own. To be revisited once the first
   boards have been seen. DEV-34, DEV-39.
5. **Feed is the first and default section.** Digests and Knowledge base
   become the second and third, unchanged in substance. Since the first review
   of round two the sections are a **vertical rail of buttons on the left**, a
   floating bar at the bottom on a phone, rather than underline tabs. DEV-34.
6. **D10 got no new number.** It is reopened and redesigned in place — the same
   design ticket, the same build file, the same canvas pages — and these dev
   tickets are written in parallel with that design rather than after it.

**And in the second review of round two, the same day:**

7. **Saved is a fourth section** on the rail and on the phone's bar — this
   person's saves in the feed's layout, newest first, "Nothing saved yet" when
   there are none — with a desktop-only **Recent saves** panel of the last
   five beside the feed. This answers open question 5. DEV-37, DEV-34.
8. **A post has no Share and no Open source button.** The icon row is the
   numbers at the left and Copy to Studio beside Save at the right, with the
   handle and the caption under it. The **handle** is what opens that
   creator's carousels. *(The link back to the original post was answered the
   same day, in the fourth review: item 19 below, a **View Post** button.)*
   DEV-34, DEV-38.
9. **The button is called Copy to Studio**, after "Recreate this" and
   "Use as reference" earlier the same day. Same action, same destination. It
   was the lit one until item 16 below made it quiet. DEV-35.
10. **One search box, as wide as the posts, with no scope switch.** One query
    searches creators and carousels together and one route handler returns
    both lists, the accounts above the carousels. DEV-39, DEV-38, DEV-34.
11. **The feed carries no label.** The "Trending in the library" caption is
    gone, reversing item 2's honest label; the ranking is still `total_score`
    then `views_normalized`, the screen just does not say so. DEV-36, DEV-34.
12. **No counts on the rail**, for Digests or Knowledge base, on either size.
    DEV-34.

**And in the third review of round two, the same day:**

13. **Only the posts scroll.** The title and the search box, the left rail and
    the Recent saves panel are pinned; the column of posts is the one thing
    with a scroller. On a phone the same, the floating bar included. DEV-34.
14. **More space under the search box**, before the first post. DEV-34.
15. **The posts and the search box are 500px wide** on the desktop, where the
    third cut drew 450. DEV-34.
16. **Copy to Studio is not the accent.** It is a quiet grey outline button
    with no fill, its text and its icon in the ordinary text colour, beside
    Save, and **the Feed has no accent action at all** — reversing item 9's
    lit button. Analyse, on Digests, keeps the page's only accent. DEV-34,
    DEV-35.
17. **The posts are centred between the rail (200px) and the Recent saves
    panel (300px), not on the page**, so the gap either side of them is the
    same — 76px on a 1440px screen — and the search box is centred over the
    posts the same way. DEV-34.

**And in the fourth review of round two, the same day:**

18. **The slides swipe sideways on the desktop too.** A post's slide area is a
    **horizontal scroll-snap track**, one slide to a snap point, not a stacked
    fade: a trackpad swipe pages it the way a thumb does on a phone, and the
    dots and the hover arrows still page it. DEV-34.
19. **A "View Post" button**, quiet and grey-outlined — no fill, ordinary text
    colour — at the **top right of every post**, opposite the handle and the
    topic line. It opens the post on TikTok or Instagram in a new tab, from
    `references_unified.source_url`. This answers item 8's open note. DEV-34.
20. **"Knowledge base" is renamed "Knowledge"** on the rail, on the phone's
    bar and wherever the section is named on screen. The label only: the table
    is still `content_knowledge_base`. DEV-34.
21. **Carousel search results are a grid, three tiles across** — each tile the
    slide that matched, at 4:5, with a small carousel mark in the corner and
    an "n slides" badge, the way Instagram lays its search results out.
    Matching accounts stay as a short list above the grid. Pressing a tile
    opens that post alone in the column, in the feed's layout, with **Back to
    results** in the results line; Clear still returns to the feed. DEV-39
    returns the matched slide's image so a tile can show it. DEV-34, DEV-39.

### Decided (Garreth, 2026-09-18 and 2026-09-19)

D10's third round, approved 2026-09-19. It started from the developer
handover's frontend addendum and was then checked against the live database.

1. **The search box keeps its place and gains a search-type picker and a
   filter button** (Garreth chose this over a separate search page). This
   reverses round two's "no scope pills, no chips". DEV-34, DEV-39, DEV-43.
2. **Filters are Topic, Hook style and Views, each a dropdown that starts on
   Any and takes one value**, because the search function takes one topic and
   the other fields cannot carry a list of everything. Visual style and
   Standout posts only were drawn and then dropped when the data was read.
   DEV-43.
3. **The filters a search ran with sit over the results as chips with an X.**
   DEV-43.
4. **A post opens in one details window**, with Details, Analysis and
   Transcription as tabs; it replaces round two's "a tile opens the post alone
   with Back to results". DEV-42.
5. **Thumb up and thumb down** on every post and in the window, in a table of
   our own. DEV-44.
6. **On a post, View Details takes Save's place**; Save is in the window.
   **Saved is a grid.** DEV-34, DEV-37.
7. **The feed holds what the person has not seen; seen means on the screen for
   about a second.** Older ones are reached by **See older carousels**.
   DEV-45.
8. **Analysis is groups that open and close, Summary open, no counts on the
   headers; Transcription is its own tab.** DEV-42.
9. **One Transcribe and analyse button**, starting at once, its result kept on
   the carousel for everyone. DEV-46.
10. **On a phone the details are a sheet that rides up over pinned slides.**
    DEV-42.
11. **Every design ticket has its own canvas** (D6 and D10 one a theme), since
    2026-09-18. `docs/designs/README.md`.

### Open questions, to be answered

| # | Question | Holds up |
|---|---|---|
| 1 | **How does Wire add a new carousel type to the two master lists** (`unified_posts` and `v_scheduler_pool`), which the Smart Scheduler, the Posting Agent and Inventory read? **(a)** Each Wire takes the current list and adds one section for the new type: less work now, but every Wire rewrites the lists every live type posts from. **(b)** A one-time change rebuilds both lists so they are always generated from the registry, and Wire only adds the type there: more work now, touching how every live type is listed, but no hand-edited text is rewritten afterwards. | DEV-27, DEV-28 |
| 2 | If (b): **when is the one-time rebuild done**, and how are the older types whose columns differ from the standard shape handled in it? | DEV-27 |
| 3 | **Czedrick's sign-in email** for `ALLOWED_EMAILS`. Likely `czedrickjhake.cc@gmail.com`, unconfirmed (plan §10, item 5). | DEV-00 |
| 4 | **Who runs the external analysis worker** that analyses new references? If it stops, links from a digest stay Queued (plan §10, item 3). | DEV-33 working fully, not its build |
| 5 | **Where does a person find what they saved? Answered the same day** (Garreth, 2026-09-17, second review of round two): **a fourth section, Saved**, on the left rail and on the phone's floating bar, plus a **Recent saves** panel beside the feed on the desktop. Built in DEV-37 and drawn in DEV-34. | Nothing. Closed. |
| 6 | **How many slides may a carousel have at most?** Instagram allows twenty. D6 round three (Garreth, 2026-09-17, approved) lets a person add slides but sets no cap, and neither the flows nor the template model names one. | DEV-21's cap only, not the ticket |
| 7 | **Should a thinly analysed carousel offer "Analyse in full"?** 309 carousels were read by the newer run, which records only the hook, the story and the call to action; their Analysis tab has three rows and stays that way, because Transcribe and analyse is offered only where there is no reading at all. Offering it on these too costs model spend per press (raised 2026-09-19, not drawn). | Nothing; DEV-42 and DEV-46 work without it |
| 8 | **Should the filters also narrow the plain feed**, not only a search? Today they apply to a search; on the feed they would need `carousel_feed_unseen` to take a topic, a hook and a views floor (raised 2026-09-18). | Nothing; DEV-43 as written |
| 9 | **Who cleans the search index's topic tags?** The main analysis picks from a fixed list of nine, but the visual scout writes free-text tags (`typography:bold_sans_serif`, about 200 of them) into the same `topics` array, and `glp_1` comes from there too. The dropdown is a fixed list so none of it shows, but the index is another project's to tidy (found 2026-09-18). | Nothing |
| 10 | **Does the template model still need `image_direction`?** Plan §5.4 gives `carousel_templates` three direction columns — `copy_direction`, `caption_direction`, `image_direction` — while the live table `carousel_lane_directions` has a single `direction`. Images now come from the template's image slots and the library the type points at, so nothing reads an image direction; §6.4's rename to **Writing** (D13) makes the field's name wrong as well as unused. **Proposed: delete it**, and decide whether `caption_direction` folds into the one field or stays a named section inside it. Raised 2026-09-21, not answered. | DEV-01's schema, DEV-19b |

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
   Writing tab, as in the flows — §6.4 was rewritten to say so on D13's
   approval. DEV-19b, DEV-25.

### Checks built into tickets

- **The TikTok music lookup is unproven.** DEV-10 starts by finding three real
  matches; if it cannot, it stops and comes back to Garreth.
- **Higgsfield is connected to Claude, not to the app.** DEV-30 starts by
  confirming an API the deployed app can call; if there is none, it stops and
  comes back to Garreth.
