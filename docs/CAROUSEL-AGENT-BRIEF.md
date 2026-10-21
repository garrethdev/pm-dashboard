# Carousel Generator — brief for a coding agent

**Read this first** before changing anything under the Carousel Generator. It
is written for an agent that starts with no memory of the project (OpenCode
with DeepSeek, Codex, or a fresh Claude session). Written 2026-10-21 from the
code on `main`, the live database and the session notes. Every count is dated;
re-check before relying on one.

`CLAUDE.md` still applies: changelog entry in the same pass, short commit
messages, plain English for Garreth, who is not a developer.

## 1. What the app is

The Carousel Generator lives inside the dashboard at `/carousel-generator`,
with its own left menu. It makes carousel decks for the content lanes the
phones post. The journey:

Content type → Generate form → batch written deck by deck → compliance gate and
music lookup per deck → Render → finished batch → **Approve (n) decks**.

On `main` today the journey ends there: Approve marks the decks approved and
the batch finished (`approveBatch` in `services/runner.ts`). **No row is
written into a lane table yet**, so nothing the generator makes reaches the
Smart Scheduler. That write belongs to the JPEG painter, which is still on
the unported Codex branch (section 4). Do not "fix" this by adding a lane
write elsewhere; it is the painter's job and the tickets say so (DEV-05).

Three facts that older documents get wrong:

- **There is one approval**, on the finished batch after rendering. The
  per-deck Approve, its undo and "Approve all unflagged" were dropped on
  2026-09-14. Anything written before 2026-09-21 may still describe them.
- **Auto mode** (DEV-48) lets the runner carry on from writing to rendering
  without the Render press. It retries a flagged deck three times, drops what
  it cannot save, and never approves.
- **The design step is closed.** Screens D1–D17 are approved and listed in
  `docs/designs/README.md`. Build to them; do not invent controls.

## 2. Where the code lives

| Path | What |
|---|---|
| `src/app/(carousel-generator)/carousel-generator/` | Pages: types, batches, library, trends, details |
| `src/app/(carousel-studio)/carousel-generator/` | The Studio canvas (template editor) |
| `src/app/api/carousel-generator/` | API routes |
| `src/server/carousel/repo/` | Database and storage access (`db.ts`, `storage.ts`, `libraries.ts`, `trends.ts`) |
| `src/server/carousel/services/` | `writer.ts` + `llm.ts` (copy), `gate.ts` (compliance), `music.ts`, `painter.ts` (SVG preview), `runner.ts` (the batch loop), `studio.ts`, `library-images.ts`, `degrade.ts`, `figma.ts`, `slide-copies.ts` |
| `src/lib/carousel/` | Shared: `template/validate.ts`, `picking/pick.ts`, `writer/`, `trends/client.ts`, `openapi.ts` |
| `docs/carousel-templates/*.v1.json` | The two seeded templates; contract in `docs/CAROUSEL-TEMPLATE-MODEL.md` |
| `supabase/migrations/20260925120000_carousel_generator_foundation.sql` | Tables below |
| `supabase/migrations/20261005092125_wire_character_6_carousel_lanes.sql` | Character 6's two lanes wired to the scheduler |
| `supabase/migrations/20261012100055_library_images_degraded.sql` | The `degraded` flag on library images |

Tables: `image_libraries`, `image_library_sets`, `image_library_images`, view
`v_image_assets` (unions the two seeded banks with uploads),
`carousel_templates` and `carousel_template_versions`,
`carousel_lane_directions`, `study_digests`, `reference_favourites`,
`reference_votes`, `reference_seen`, `reference_slide_images`,
`reference_media_refresh`. The generation record reuses three older tables:
`carousel_briefs` (one per batch), `carousel_drafts` (one per deck; a redo is
version + 1) and `carousel_draft_slides` (one per slide). The plan names a
database function `carousel_materialise_draft`; it was never created (checked
live 2026-10-21), so the plan's description of Approve is the design, not the
code.

## 3. Images: where they live

Supabase Storage, project `qlcmgxgwpzmiebzxflai`. Counts are live on
2026-10-21.

| Bucket | Public | Files | What it holds |
|---|---|---|---|
| `image-libraries` | yes | 3 | **The app's own bucket** for pictures people upload to a library (`LIBRARY_BUCKET` in `repo/storage.ts`). Paths: `<library_id>/<uuid>.jpg` or `.png`; `<library_id>/incoming/` for a raw upload; `<library_id>/pending/` for an AI edit nobody has kept yet. Server-only, service-role key; the browser gets a one-time signed link to PUT one file. |
| `rich-life-images` | yes | 2,292 | Character 6's photo bank under `character-6/`: `carousel-basis/2026-09-20` (200 "after" or first-image photos; the library **Character 6** links to this folder live), `before-basis/2026-09-26` and `before-basis/2026-10-02` (64 "before" photos for 3-Slide Journey), `divorce-recovery-covers` (out of scope). Also `bg/<pillar>/<character>/` backgrounds of the retired Rich Life lane. Catalogued in table `carousel_images`. On 2026-10-20 Garreth replaced every Character 6 source photo in place under the same filename, so links held; decks already rendered keep the old pictures until re-rendered. |
| `carousel-renders` | yes | 4,901 | Finished slide JPEGs. A Studio template outputs to `carousel-renders/<type-slug>/<deck_id>/slide_<nn>.jpg`; older lanes wrote `<carousel_id>/slide_<nn>.jpg`. |
| `glowup-image-bank` / `glowup-renders` | yes | 101 / 1,337 | Glow Up lane: the source bank (table `glowup_image_bank`, read-only library "Glow Up bank") and its rendered decks. |
| `covered-eye-images` | yes | 848 | Covered Eye lane: the source bank (table `covered_eye_image_bank`, read-only library "Covered Eye bank") and `renders/`. |
| `reference-slides` | yes | 12,134 | Copies of other creators' slides for the Trends feed (`slide-copies.ts`, table `reference_slide_images`), kept because TikTok's signed links expire. |
| `leanne-carousel-images`, `celeb-covers`, `lavish-approved`, `darkened-images`, `universal-images`, `before-after-images` | yes | small | Assets of older or outside lanes. The generator does not touch them. |

Libraries in `image_libraries` on 2026-10-21:

| Library | Source | Read-only | Used by a type |
|---|---|---|---|
| Glow Up bank | table `glowup_image_bank` | yes | 1 |
| Covered Eye bank | table `covered_eye_image_bank` | yes | 1 |
| Character 6 | live link to `rich-life-images/character-6/carousel-basis` | yes | 0 |
| Viral Theories Library | own uploads (none yet) | no | 0 |
| test | own uploads (3) | no | 0 |

Rules Garreth decided (2026-10-08): deleting a library is refused while a type
draws from it; the two seeded banks cannot be deleted; removing a link never
touches the folder in the bucket. Pinning a picture is per slide, never per
deck or per type.

## 4. Images: how they are made

Everything is in `src/server/carousel/services/library-images.ts`. The rule
throughout: **everything made from an image is a new file beside the
original; nothing is overwritten.**

1. **Upload.** The browser PUTs the file to a signed link under
   `incoming/`. `takeUpload` reads it, decodes HEIC if needed, turns it the
   right way up, shrinks it to a 2,400 px longest edge, strips metadata,
   stores it as JPEG (or PNG when transparency is kept), measures its
   brightness (the painter uses that to pick a text colour) and writes an
   `image_library_images` row. The incoming file is removed either way.
2. **Black and white copy.** `blackAndWhite` makes a new image beside the
   original, recorded as derived from it.
3. **AI edit.** `aiEdit` sends the photo (JPEG, at most 1,536 px) to
   OpenRouter's chat completions endpoint with the model in
   `CAROUSEL_IMAGE_MODEL` (default `google/gemini-3.1-flash-image`) and a
   plain prompt. The returned picture goes through **`removeSynthId()`** first
   (the hosted SynthID removal API, `synthid.ts`), then **`degrade()`** (see
   `docs/DEGRADE-PASS.md`: re-made as a phone-camera JPEG, which removes
   C2PA, EXIF and the rest), and is stored under `pending/` until the person
   keeps it. HTTP 402 from OpenRouter means the account is out of credit.

Not built: **"Generate with AI"** from nothing is a disabled button in the
Studio and on the library page. Higgsfield is not connected (DEV-30). The app
does not create pictures from scratch today.

**Picking** (`src/lib/carousel/picking/pick.ts`) chooses which library
pictures land in which cell of which slide, following the template.

**Painting.** `painter.ts` draws each slide as SVG at the template's true
canvas size, for the preview on the batch page. **The step that rasterises
to JPEG, uploads to `carousel-renders` and writes the lane row is not on
`main`.** It lives on the unmerged branch `codex/carousel-backend-foundation`
(44 commits, last 2026-09-26, 11 files in conflict with `main`; bringing it
over is a port, not a merge). Templates name `.ttf` font files that this
painter must have on disk; the browser preview loads the same ten fonts from
Google.

## 5. Copy: how it is written

`llm.ts` calls OpenRouter with `CAROUSEL_WRITER_MODEL` (default
`anthropic/claude-sonnet-4.6`). `gate.ts` checks compliance, `music.ts` finds
a track for each deck as it is written and inserts a new track into
`music_library` before hand-off. `CAROUSEL_FIXTURE_WRITER` swaps in a fixture
for tests.

## 6. Keys and environment

| Variable | Used for |
|---|---|
| `OPENROUTER_API_KEY` | The writer and the AI image edit. Missing on Vercel until 2026-10-08, which showed as "Api key not set" on every AI feature. |
| `SYNTHID_API_KEY` | The SynthID removal (the AI watermark remover, hosted on Modal). Missing → every AI edit fails with "not connected". `SYNTHID_API_URL` overrides the base URL (defaults to the Modal address). |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Server-side database and storage. Vercel marks the service key Sensitive, so `vercel env pull` returns `[SENSITIVE]`. |
| `CAROUSEL_WRITER_MODEL`, `CAROUSEL_IMAGE_MODEL` | Model overrides, see above. |
| `FIGMA_TOKEN` | Importing a Figma frame as a template. Built, but only ever run against a fixture. |
| `CRON_SECRET` | Maintenance routes; a new cron route must also be exempted in `src/proxy.ts` or production redirects it to `/login`. |

The public anon key can list and overwrite `rich-life-images` and
`carousel-renders` (they have anon update policies); `covered-eye-images`,
`glowup-renders` and `leanne-carousel-images` have no anon policies at all.
Never paste a key into a chat; if one lands there, rotate it.

## 7. The lanes the generator feeds

| Lane | Character | Table | Pictures from |
|---|---|---|---|
| Glow Up | 2 | `glowup_decks` | `glowup_image_bank` |
| Covered Eye | 3 | `covered_eye_carousel` | `covered_eye_image_bank` |
| Viral Theories | 6 | `viral_theories` | `rich-life-images/character-6/carousel-basis` (`source_images`) |
| 3-Slide Journey | 6 | `journey_3slide` | `rich-life-images/character-6/before-basis` (`before_image_url`) |

Character 6's two lanes were wired to the scheduler on 2026-10-05 for Profile
31. Gatekeeping stays outside the app: the nightly n8n gate only audits rows
whose `gatekeep_status` is NULL, so a row marked `'pending'` never posts
without a human. Wiring a new lane follows the `wire-new-content-type` skill
(installed under `~/.claude/skills`, which OpenCode reads as well); the
Character 6 migration above is a worked example.

## 8. What is open on 2026-10-21

The authoritative list is `BACKLOG.md`, sections "Carousel Generator — issues
found before merging PR #31" (its "Still open" part) and "Carousel Generator
— round two (2026-10-08)". In short: the Figma token, Generate with AI,
a per-library degrade switch for uploads, the paused backfill of the 498
stored images (36 done), copies of degraded images not marked as degraded,
and the unported JPEG painter.

## 9. Which document answers what

| Question | Read |
|---|---|
| What are the repo rules | `CLAUDE.md` |
| What is open and what Garreth decided | `BACKLOG.md` |
| What actually shipped, and how it was verified | `CHANGELOG.md`, entries from 2026-09-29 onward that mention the Carousel Generator |
| Why the app is shaped this way | `docs/CAROUSEL-GENERATOR-PLAN.md` (1,890 lines, written 2026-09-14; §2 facts, §4 architecture, §5 data model; stale on approval) |
| What each ticket asks for | `docs/CAROUSEL-GENERATOR-DEV-TICKETS.md` (DEV-00 to DEV-53) |
| How a person moves through the screens | `docs/CAROUSEL-GENERATOR-FLOWS.md` (F1 to F16) |
| The template contract | `docs/CAROUSEL-TEMPLATE-MODEL.md` and `docs/carousel-templates/` |
| Exact layout numbers of the Python painters being ported | `docs/CAROUSEL-RENDERER-PORT-SPEC.md` |
| The degrade pass | `docs/DEGRADE-PASS.md` |
| The API | `docs/CAROUSEL-API.md` |
| The approved screens | `docs/designs/README.md` |
| State of the Codex branch (historical, 2026-09-25) | `docs/carousel-implementation-tracker.md`, `docs/carousel-backend-progress.md`, `docs/carousel-frontend-progress.md` |

## 10. Working rules for this area

- Both themes: every screen works dark and light.
- A read-only screen stays read-only. Find a gap, say it in a line, do not add controls.
- Any picture a model makes passes `degrade()` before it is stored or shown.
- Never post live from a test. Use isolated test data.
- Never modify `inventory_check`, and never pause a content type to solve a problem; pausing the account is the lever (dashboard-wide rules).
- A change that is not in `CHANGELOG.md` did not happen.
