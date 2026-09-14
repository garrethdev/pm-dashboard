# Carousel Generator — plan

**Status:** planning only. Nothing in this document is built. Written 2026-09-14
from Garreth's notes, the carousel-search developer handover, the
`carousel-agent` and `content-render-scripts` repos, the n8n instance, the live
Supabase database, and a look at five commercial carousel tools.
**Read this before starting any build session on the generator.**

Every number below was pulled live on 2026-09-14. Re-run the queries in
§11 before acting on them; inventory moves daily.

---

## 0. The one-paragraph version

Three carousel lanes are live and posting every day, and **nobody has made a
new carousel for any of them in 32 to 44 days.** Across all three there are
**two** postable pieces left. Posting works, rendering works, the images
exist, the performance is fine. The supply stopped. The generator's first job
is to restart the supply for the two lanes that matter most, **Glow Up**
(Character 2) and **Covered Eye** (Character 3), with a human approving copy
before anything renders. Everything else in Garreth's notes (per-lane AI
direction, history and rerun, the trend knowledge base, image folders) hangs
off that spine and is phased in behind it.

---

## 1. Requirements, organised

Garreth's notes, grouped and numbered so the phases in §9 can refer to them.

### A. Generate

| # | Requirement | Where it lands |
|---|---|---|
| A1 | A page of existing carousel lanes; pick one and generate | Lanes page (§6.1) |
| A2 | Start with one or two lanes, the most-used or best-performing, then add the rest | Glow Up then Covered Eye (§3) |
| A3 | While a batch generates, show the copy it will use, with Redo or Approve per carousel | Batch review (§6.2) |
| A4 | Use the carousel-command-center app as the baseline for how carousels are made; keep the generation scripts, redo the UI | §4 and §5 |

### B. Direct

| # | Requirement | Where it lands |
|---|---|---|
| B1 | An AI bot where we set the direction and instructions for each carousel type | Directions page (§6.4) |

### C. Remember

| # | Requirement | Where it lands |
|---|---|---|
| C1 | History of batch generations | History page (§6.3) |
| C2 | Rerun a past batch | History page, "Run again" |

### D. Learn

| # | Requirement | Where it lands |
|---|---|---|
| D1 | A trend page that reads the daily study digest (from Virlo), finds patterns, and appends them to a knowledge base | Trends page (§6.5) |
| D2 | That knowledge base is used when developing a new content type | Directions page reads it; Trends page writes it |

### E. Assets

| # | Requirement | Where it lands |
|---|---|---|
| E1 | A visual-bucket page of image folders | Library page (§6.6) |
| E2 | A generation session can point at a folder for its base images | Generate form, "Images from" (§6.2) |

### F. Constraints carried over from the dashboard

- Anyone who can sign in to the dashboard can generate. Access is the existing
  `ALLOWED_EMAILS` list, which needs Czedrick added (Garreth, 2026-09-14). No
  separate generator role.
- Secrets stay on the server. The browser never sees an Anthropic, Supabase
  service-role, or storage key.
- Every write is audit-logged (`dashboard_audit_log`), same as pause and retire.
- Dark is the designed mode; light mode resolves the same tokens. No hex in
  components.
- One `CtaButton` per screen. Destructive steps are a `HoldButton` with no
  warning text. No instruction copy on screens. (`docs/DESIGN-TOKENS.md` §10
  already reserves the rules for this feature.)
- Every landed change gets a `CHANGELOG.md` entry in the same pass.

---

## 2. What exists today (the facts the plan stands on)

### 2.1 The carousel lanes

Six carousel lanes are registered. Three are live.

| Lane | Character | Table | Live | Posts/wk | Renderer today | Image bank |
|---|---|---|---|---|---|---|
| Glow Up `glowup` | 2 | `glowup_decks` | yes | 4 | Python, by hand on Garreth's Mac (`paint_manifest.py`) | `glowup_image_bank`, 100 images |
| Covered Eye `covered_eye_carousel` | 3 | `covered_eye_carousel` | yes | 2 | Python, by hand on Garreth's Mac (`covered_eye_carousel.py`) | `covered_eye_image_bank`, 55 images |
| Char2 Slideshow `char2_slideshow` | 2 | `char2_slideshow` | yes | 3 | unknown, one batch ever | none |
| Rich Life `rich_life_carousel` | 2 | `rich_life_carousel_posts` | retired | | Vercel `carousel-command-center` | `rich-life-images/bg/lavish` |
| BA Journey `ba_journey` | 2 | `ba_journey_carousel` | off | | | |
| BA Evidence `ba_evidence` | 2 | `before_after_evidence_carousel` | off | | n8n builder | |

All six share one posting contract in the registry: TikTok task type 3, the
Instagram image-reel endpoint, music required, max 3 posts a day. So the
generator writes into a posting path that already works. What differs per lane
is the copy, the images and the table columns.

### 2.2 Supply and stock, 2026-09-14

| Lane | Posted last 28d | Rows made last 28d | Last row made | Postable now |
|---|---|---|---|---|
| Glow Up | 124 | **0** | 2026-08-01 | **2** |
| Covered Eye | 98 | **0** | 2026-08-13 | **0** |
| Char2 Slideshow | 26 | **0** | 2026-08-09 | **0** |

"Postable" means it passes every gate the Smart Scheduler checks: unposted,
unassigned, `scheduler_ready`, `gatekeep_status = 'approved'`, has a slide-1
image, has a caption. The rows that fall out do so mostly at **caption** and
**gatekeeping**, not at rendering: Covered Eye has 27 finished decks with art,
15 of them captioned, none gatekept. Glow Up has 17 with art, 4 captioned.

The Inventory digest's 14-day view says Character 3 has a 220-post hole with a
GLP pool of zero, and Character 2 is 96 short. Covered Eye is Character 3's
only carousel lane.

### 2.3 Performance, last 90 days

| Lane | Posts | Median views | ≤10 views | ≥500 views | Score (parked `content_type_score`) |
|---|---|---|---|---|---|
| Glow Up | 144 | **226** | 13% | 6% | 71, tier A, second-best lane in the business |
| Char2 Slideshow | 29 | 181 | 17% | 7% | 61, tier B |
| Covered Eye | 128 | 126 | **2%** | 1% | 54, tier C |
| Rich Life | 84 | 98 | 7% | 2% | retired |

Covered Eye's 2% dead rate is the lowest of any lane in the system. It never
gets suppressed; it just has a low ceiling.

### 2.4 How copy and images get made today

There is no single carousel pipeline. There are four, built at different times.

**Glow Up.** An n8n workflow ("Glow-Up Writer / Hook Maker") reads seeds from
`machine_hooks`, builds a 7-slide deck with Claude Sonnet 4.6 (cover hook,
before-2023, face tip, stomach tip, peptide-plus-quiz, waist tip, after-2026),
scores it inline, and inserts a `glowup_decks` row. A separate n8n "Director"
writes a `render_manifest` (which images go in which cell of which slide,
following `deck_rules.json`). A Python "painter" on a Mac reads the manifest,
paints the slides, uploads to the `glowup-renders` bucket and sets
`render_status = 'rendered'`. Music comes from the "Universal Music
Recommender" webhook. **Zero runs of the writer are on record in n8n**, so the
existing decks were most likely made from a Claude desktop session.

**Where the two painters run (answered 2026-09-14).** Garreth's team sent the
renderer folders as `covered_eye.zip` and `glowup.zip`. They are byte-identical
to the GitHub repo. The compiled bytecode inside embeds the path
`/Users/garrethdottin/Claude/peptide-renderers/...`, so both run **by hand on
Garreth's own MacBook Pro** under Python 3.14, from Claude Code sessions, with
no cron or launchd. The newest rendered output is Covered Eye CE-240 on
2026-08-14; two Glow Up rows have sat at `render_status = 'ready'` since
2026-08-01 because nobody ran the painter. The full port specification,
including the exact layout numbers and the race guard, is in
`docs/CAROUSEL-RENDERER-PORT-SPEC.md`.

**Covered Eye.** An n8n scriptwriter reads rows that have a hook but no slide 2,
writes slides 2 to 6 with Claude Sonnet 5 in a fixed five-beat arc (judgment,
truth, confession, discovery with the brand named once, resolution), and sets
`status = 'scripted'`, `gatekeep_status = 'pending'`. A Python renderer on a
Mac picks images from the bank by pool (slide 1 mirror selfie, slides 2 to 4
food, 5 product, 6 body), burns the captions on, uploads to
`covered-eye-images/renders`. Nothing in n8n advances `gatekeep_status`; that
is done by hand. Also zero runs on record.

**Rich Life, BWC, Strong Informational (retired).** Three near-identical n8n
workflows: an Opus "hookmaker" writes 15 hooks from 12 seeds, a Haiku
scriptwriter writes slides 2 to 6, a Haiku "humanizer" tightens them, the
"Universal Carousel Quality Gate" scores the row every 15 minutes, a human
sets `vote = up` somewhere outside n8n, then the "Unified Renderer" posts the
slide text to `https://carousel-command-center.vercel.app/api/render-carousel`,
which burns captions onto character-locked background photos from
`rich-life-images/bg/<pillar>/<character>/` using Satori and sharp, and
uploads to `carousel-renders/<carousel_id>/`. This is the only renderer that
runs in the cloud.

**Char2 Slideshow.** No n8n workflow, no renderer in any repo, no slide-text
columns in its table (up to 12 image URLs, caption, music, angle). The copy is
baked into the images somewhere upstream and never lands in the database.

**The Carousel Command Center itself** (recovered from Vercel on 2026-09-14
into `carousel-command-center/` next to this repo; it had never been in Git).
Two static pages behind a Basic-auth password, talking to Supabase from the
browser with the public key, plus four serverless functions:

| Piece | What it does |
|---|---|
| `index.html` | Tabs: Carousels (vote up or down on `carousel_copy`, bulk downvote), Batches (grouped by `batch`, with a `batch_briefs.batch_feedback` editor), Hook Injector, Research, Filler Clips. Fires the n8n render and digest webhooks. |
| `orchestrator.html` | "Batch Orchestrator": pick lanes, chat a direction, set counts, fire. Built against the July design below; the runner it needs was never written. |
| `api/render-carousel.js` | The Satori + sharp renderer (identical to the mirror). |
| `api/direction-chat.js` | **A working first version of requirement B1.** A chat that converges on a short direction note per batch, with per-lane notes describing what direction can and cannot change, returning `{reply, direction}`. Runs on DeepSeek via OpenRouter; writes nothing. |
| `api/hook-variations.js` | Paste one proven hook, get N variations, insert them as seeds into `machine_hooks`. |
| `api/sourcing-status.js` | Fresh-versus-used source counts per story lane, cached a week at the CDN. |
| `carousel-vision-qa.mjs` | A Claude Code workflow script that montages rendered slides and has a vision model flag cut-off, overflow and unreadable text. |
| `ORCHESTRATOR_DESIGN.md` | July 2026 design (v2) for one-button batch generation. Not built. Its shape was "dashboard queues a row, a Python runner on the Mac fires n8n webhooks and local renderers" because the renderers only existed on that Mac. §4 of this plan removes that constraint by porting the renderers, so the runner is not needed; its lessons are kept in §4.5. |

Two existing tables it leans on that this plan now reuses: `batch_briefs`
(per-batch steering: `pillar`, `topic`, `angle`, `hook_guidance`, `avoid`,
`target_count`, `voice_profile`, `voice_dims`, `batch_feedback`,
`brief_status`; 2 rows, last touched 2026-07-19; the Glow-Up Writer reads
`batch_feedback`) and `content_batches` (`batch_id`, `content_type`, `notes`;
37 rows, still written as recently as 2026-09-11, naming convention
`{type}-{YYYY-MM-DD}-{letter}`).

### 2.5 The pieces worth keeping

- **`render-carousel.js`** (mirror in `content-render-scripts/renderers/carousel/`).
  Satori plus sharp, no local dependencies beyond bundled fonts, already shaped
  as a request handler. This is the base for an in-app renderer.
- **`deck_rules.json`** and the "one brain, one painter" split from the Glow Up
  renderer: a Director decides everything and writes a manifest, a painter
  paints it literally. The generator should keep that split.
- **The prompts.** Covered Eye's five-beat arc, Glow Up's seven-slide grammar,
  the quality-gate rubric and its regex compliance backstop, the Caption Maker's
  voice rules and its "Harden Config" step that strips brand and molecule names
  no matter what the caller asked for. All quoted in the research notes; all
  portable.
- **`carousel-agent`** (the older TypeScript prototype): the plan-before-copy
  stage, the hook-only fast preview, "merge never overwrites what a human
  typed", and a narrative QA pass that checks the hook's promise is delivered.
  Its code is pure TypeScript and imports cleanly into Next.js.
- **The image-bank table shape** `{pool, category, character, public_url,
  is_cover, status, fact_tags[]}` used by both Glow Up and Covered Eye. The
  image library in §6.6 should be this shape, not a third one.
- **`api/direction-chat.js`**: the system prompt (converge fast, one
  clarifying question, at most two alternatives, be honest about what
  direction cannot change) and the per-lane notes. The Directions page in
  §6.4 is this endpoint with versions, persistence and citations added.
- **`carousel-vision-qa.mjs`**: the render QA rubric (cut-off, overflow past
  65% of height, contrast, missing glyphs). Phase 1 runs it, or an in-app
  equivalent, before a deck is marked Ready.

### 2.6 The knowledge layer is no longer empty

The 2026-09-10 note in `BACKLOG.md` and in memory that the seven
content-intelligence tables held zero rows is **out of date**. The
carousel-search worker ran:

| Table | Rows | Note |
|---|---|---|
| `carousel_search_documents` | 21,893 | hybrid search wired, every row embedded |
| `search_chunks` | 6,795 | |
| `reference_beats` | 5,591 | slide-by-slide beats |
| `references_unified` | 3,826 | 1,043 carousels, 92% analysed and indexed |
| `reference_analysis` | 1,073 | topic, hook family, visual style; **none human-approved** |
| `content_knowledge_base` | 121 | distilled rules: directive, rationale, confidence, support count |
| `angle_blueprints` | 206 | all still `draft`, all `format = 'mixed'`, no slide counts |
| `carousel_briefs` / `carousel_drafts` / `carousel_draft_slides` | **0** | the generator's own tables, designed and never used |

Topic coverage lines up with the two chosen lanes: 5,925 documents tagged
`eye_care` (Covered Eye), 11,029 `skincare` plus 5,245 `weight_loss` plus
2,168 `glp_1` (Glow Up).

One caution: `reference_analysis.hook_family` mixes a clean vocabulary from
the `perez-slides-v1` run with free text from an older run, and `topic` is a
comma-joined string, not an array. Filter to `perez-slides-v1` or normalise
before using either as a facet.

**How the library fills itself** (read from the two n8n workflows on
2026-09-14, after Garreth switched on their MCP access). It is a job queue,
`content_pipeline_jobs`, with five job types and three workers:

| Step | Job type | Who runs it | Cadence |
|---|---|---|---|
| Import Virlo slideshows into `references_unified`; turn `source_discovery_evidence` rows into references and queue `media_enrich` | (none) | n8n "[Virlo] References → Story Finder Bridge" `O8RNjCtOR77d8WvA` | every 5 min |
| Fetch media, transcript, images | `media_enrich` (243 done) | **a worker outside n8n, not on this Mac** | continuous, last run 2026-09-13 |
| Slide-by-slide analysis into `reference_analysis` and `reference_beats` | `visual_analyze` (132 done, policy "cheap-chinese-image"), `video_analyze` (100 done) | same external worker | same |
| Build and embed search documents into `carousel_search_documents` | `index_publish` (231 done) | n8n "PM Carousel Shared Analysis and Search" `yzDMPwIOrBJYXivh` | every minute |
| Cluster story structure and opening layout into `angle_blueprints`, mark a blueprint replicated at 5 sources from 3 creators | `pattern_match` (217 done) | same n8n workflow | every 10 min |

`source_discovery_evidence` is the front door: 247 rows so far (122 Virlo
carousels, 100 Virlo short videos, 25 legacy backfill), every one linked to a
reference. Anything inserted there with a `source_url`, `platform`,
`source_format` and a `provider` becomes a reference and gets analysed
without touching n8n. That is the hook the Trends page uses (§6.5).

**A security finding from reading the bridge.** Its "Import Virlo References"
code node carries the service-role keys of **both** Supabase projects as
plain text in the script, rather than as n8n credentials. The developer
handover admitted this in general terms; the specific node is now known. Any
n8n editor can read them. They should move to n8n credentials (the other
nodes in the same workflow already use one) and then be rotated. Not done in
this session; it is a change to a live workflow and a key rotation, both
Garreth's call.

### 2.7 The study digest is an email, not data

"Daily Study Digest Email" in n8n is two nodes: a webhook and a Gmail send. It
holds no logic and writes to no table. The research is done by a scheduled
task **outside n8n** (its own description calls it the "daily-creator-study
scheduled task") which posts finished text to the webhook. One run is on
record, 2026-09-07. Nothing in Supabase stores a digest today. §6.5 depends on
changing that.

---

## 3. Which lanes first, and why

**Build Glow Up first, Covered Eye second.** Char2 Slideshow waits; the
retired lanes are not built.

Glow Up:

1. Best-performing carousel and second-best lane of any kind over 90 days, at
   high confidence, with the highest carousel throughput (124 posts in 28 days).
2. Completely out of stock (2 postable) against roughly 4 posts a day.
3. Its table already has named copy slots (`hook`, `before_line`,
   `transition_line`, `after_line`, `tip_face`, `tip_stomach`, `tip_waist`,
   `quiz_line`) that map one-to-one onto the `narrative_role` beats in the
   reference layer. No other lane has that.
4. Renderer and image bank exist; 19 of its 21 unposted rows are already
   rendered. The generator's first job is copy, not pixels.
5. Fully compliant with the `WIRE-NEW-CONTENT-TYPE` column shape.

Covered Eye:

1. Character 3's only carousel lane, and Character 3's GLP pool is zero.
2. Most reliable lane in the system (2% dead posts).
3. Best-served by the reference corpus (`eye_care`).
4. Simplest deck shape (six flat `slide_N` and `slide_N_url` columns); the
   cheapest second lane once the first works.
5. Its bottleneck is exactly what a generator with a review step fixes:
   finished art, missing captions, nothing gatekept.

Char2 Slideshow scores well (61, tier B) but has nowhere to put copy, a
non-standard plural `geelark_profiles` column, one lifetime batch and 29 posts
of history. It comes back in Phase 5 with a schema change.

---

## 4. Architecture

### 4.1 Shape

```
Browser (Next.js pages under /carousel-generator)
   │  session cookie, ALLOWED_EMAILS
   ▼
Next.js route handlers (the only holder of secrets)
   ├── Anthropic API ............ copy, per-slide redo, quality gate, caption, trend analysis
   ├── Supabase (service role) .. briefs / drafts / slides / lane tables / knowledge base
   ├── Supabase Storage ......... image banks in, rendered slides out
   ├── Satori + sharp ........... the in-app painter (ported from render-carousel.js)
   └── n8n webhooks ............. Music Recommender (call), Posting Agent (leave alone)
```

The generator **replaces** the n8n writers, the 15-minute quality gate and the
caption webhook for the lanes it owns. It **calls** the music recommender and
writes rows the existing Posting Agent already understands. It **leaves alone**
the Posting Agent, the Smart Scheduler, the Virlo intake, and the
carousel-search worker.

### 4.2 Long-running work without a queue

A batch of 20 decks is 20 to 60 model calls plus 120 to 140 slide renders. That
does not fit in one serverless request. Rather than add a queue and a worker on
day one:

- **One request per deck for copy.** The browser asks for deck 1, gets it back
  in 10 to 20 seconds, asks for deck 2. Progress is real, not simulated, and a
  failure affects one deck.
- **One request per deck for rendering.** Six or seven slides at 1080 wide
  through Satori and sharp is a few seconds.
- **Every result is written to Supabase the moment it exists.** Close the tab
  mid-batch and the batch page reloads with what was done and a button to
  continue. Nothing lives only in browser memory.
- **No two people run the same batch at once.** The batch row carries
  `status` and `updated_at`; a second session sees "in progress" and reads
  instead of writes.

If batches grow past what this tolerates (a few hundred decks at a time), the
same route handlers become a worker later. The tables do not change.

### 4.3 Models

Follow the `claude-api` skill when wiring this; do not pin from memory. The
intent: the strongest available Claude for the copy pass (today's workflows
use Sonnet-class models for copy and Haiku-class for scoring), a small fast
model for the gate score and caption, and the same small model for the trend
pattern pass, which is text summarisation. Every call records its model id,
prompt version and the direction version it ran under, in `generation_metadata`.

### 4.4 The gates, in order

Each deck passes through, and each is visible as a pill on its card:

1. **Written.** Copy exists for every slide, caption and music suggestion
   included. A deck without a caption never becomes postable, so the caption is
   generated in the same pass, not later.
2. **Scored.** The quality-gate rubric (hook quality, content quality, 1 to 10)
   plus the regex compliance backstop (brand names, molecules, price, cure
   claims). Below 6.0 or any compliance hit shows as **Flagged**, never
   auto-rejected. A human still sees it and may Redo.
3. **Approved.** A human clicks Approve on the card, or Approve all on the
   unflagged ones. Recorded with the email from the session; never a client
   field. **Approve means the generated copy is accepted, nothing more.**
4. **Rendered.** The painter has produced every slide and the URLs are on the
   lane row.
5. **Handed off.** The lane row exists with art, caption and music, with
   `gatekeep_status = 'pending'` and `scheduler_ready = false`. Gatekeeping
   and everything after it happen outside this app, exactly as today
   (Garreth's decision, 2026-09-14). The generator never writes
   `gatekeep_status = 'approved'` or `scheduler_ready = true`.

The Lanes page still shows the postable count from `v_scheduler_pool`, so the
team can see decks waiting at the gate as a separate number from decks
waiting to be generated.

### 4.5 Lessons carried over from the July orchestrator design

The unbuilt `ORCHESTRATOR_DESIGN.md` went through three critique passes.
What still applies once the renderers live in the app:

- **Every batch is one row with a status that moves forward and never
  silently back.** Progress must be observable from the database, not from a
  toast that guessed.
- **Rows carry data, never commands.** A forged row can at worst trigger a
  predefined lane.
- **Attribute rows to the batch at creation.** The old n8n writers ignored the
  request body and named their own batches, which is why batch tracking
  drifted. The generator writes `batch` on every lane row it materialises and
  inserts the matching `content_batches` row.
- **One active run per lane.** Two runs on the same lane at once cannot be
  told apart afterwards.
- **Approval columns differ per table.** `carousel_copy` uses `vote`, Covered
  Eye's old renderer reads `approved = true`, Glow Up reads `render_status`.
  The materialise step writes what each lane's downstream actually reads.
- **Votes on `carousel_copy` expire after 140 hours** in the Unified Renderer.
  Irrelevant to the two chosen lanes; relevant if the retired lanes return.

---

## 5. Data model

### 5.1 Reuse the three empty tables as the generation record

They were designed for this and match Garreth's requirements almost exactly.

| Table (exists, empty) | Used as | Key columns |
|---|---|---|
| `carousel_briefs` | **one generation batch** | `title`, `topic`, `target_audience`, `blueprint_id`, `selected_reference_ids`, `objective`, `constraints` (jsonb), `status`, `created_by` |
| `carousel_drafts` | **one carousel in the batch**, one row per version (Redo = version+1) | `brief_id`, `version`, `variant_label`, `hook`, `caption`, `cta`, `generation_metadata` (jsonb), `status`, `human_approved`, `approved_at`, `approved_by` |
| `carousel_draft_slides` | **one slide of one draft** | `draft_id`, `position`, `narrative_role`, `copy`, `visual_brief`, `asset_query`, `source_reference_id`, `source_beat_id`, `status` |

`constraints` on the brief holds what the form captured: `lane`
(content_type), `count`, `image_folder`, `direction_version`, `note`, and
`rerun_of` (the brief this was cloned from). Creating a brief also inserts the
matching `content_batches` row under the existing
`{type}-{YYYY-MM-DD}-{letter}` convention, so the digest and inventory tooling
that already reads `batch` keeps working. `generation_metadata` on the draft
holds `model`, `prompt_version`, `direction_version`, `score`, `gate_notes`,
`compliance_hits`, `music_suggestion`.

Two columns need adding by migration, because `constraints` is the wrong place
for things the History page filters on:

- `carousel_briefs.content_type text references content_type_registry`
- `carousel_briefs.rerun_of uuid references carousel_briefs`

And the `status` check on `carousel_briefs` gains `'generating'`, `'rendering'`
and `'failed'`; on `carousel_drafts` it gains `'flagged'`.

### 5.2 Materialise on Approve

Approving a draft writes **one row into the lane table** and stores the lane
row's id back on the draft (`generation_metadata.lane_row_id`). The lane row is
what the scheduler, poster, inventory and analytics already read. Nothing
downstream learns about briefs or drafts.

Glow Up row from a draft: `carousel_id` (`GLW-<batch>-<n>`, same convention as
today's rows, verify against the last batch first), `hook`, `hook_text`,
`before_line`, `transition_line`, `after_line`, `tip_face`, `tip_stomach`,
`tip_waist`, `quiz_line`, `slide_1..6`, `caption`, `music`, `pillar =
'glowup_carousel'`, `character = 'char2'`, `batch`, `render_set`,
`render_manifest`, `render_status = 'queued'` (**not** `'ready'`: the Mac
painter selects `'ready'`, and `'queued'` is a value no Python script reads,
see the port spec §C.3), `quality_score`, `quality_status`,
`gatekeep_status = 'pending'`, `approved = false`, `scheduler_ready = false`.
The generator's own approval lives on `carousel_drafts.human_approved`; the
lane row's `approved` and `gatekeep_status` belong to the gatekeeping step
outside the app.

Covered Eye row: `carousel_id`, `hook_text`, `hook_type`, `peptide_angle`,
`slide_1..6`, `caption`, `music`, `pillar`, `batch`, `render_set`, `status =
'scripted'`, `quality_score`, `quality_status`, `gatekeep_status = 'pending'`,
`approved = false`, `scheduler_ready = false`.

Rendering claims the row first with one conditional update (`queued` to
`rendering`, or for Covered Eye `scripted` to `rendering` while `rendered_at`
is null); an empty response means another process has it. On success it fills
`slide_N_url`, `rendered_at` and `render_status = 'rendered'`. A sweeper
returns rows stuck in `rendering` for more than ten minutes to `queued`. The
old painters can still be pointed at these rows by hand if the in-app one is
down; they simply never pick them up on their own.

### 5.3 New tables

**`carousel_lane_directions`** — the per-lane instruction the AI bot maintains
(B1). Versioned, never overwritten. This is the *standing* direction for a
lane. The *per-batch* note stays on the brief. `batch_briefs` already holds a
richer per-batch shape (`topic`, `angle`, `hook_guidance`, `avoid`,
`voice_profile`, `voice_dims`); the generator reads any active `batch_briefs`
row for its lane as extra context but does not write there, because the n8n
writers that consumed it are being replaced.

| Column | Purpose |
|---|---|
| `id`, `content_type`, `version` | one row per saved version per lane |
| `direction` text | the instruction the copy prompt is built from |
| `rationale` text | why this version changed |
| `knowledge_rule_keys text[]` | rules from `content_knowledge_base` this version cites |
| `created_by`, `created_at` | |
| `active` boolean | exactly one active per lane |

**`study_digests`** — where the daily study lands (D1).

| Column | Purpose |
|---|---|
| `id`, `received_at`, `digest_date` | |
| `subject`, `body` text | what the scheduled task emailed |
| `source` text | `daily-creator-study` |
| `analysed_at`, `analysis` jsonb | what the Trends page extracted |

Captured by adding one Supabase insert node to the existing n8n "Daily Study
Digest Email" workflow, before its Gmail node. The scheduled task that
produces the digest does not change; the email keeps going out; the row lands
whether or not the dashboard is up. (Garreth asked for the recommendation,
2026-09-14; this is it, because that workflow is the one place every digest
already passes through.)

**Analysing the videos and carousels a digest points at.** A digest body
carries links. When a digest lands, the Trends page's Analyse step:

1. Extracts every TikTok and Instagram link from the body.
2. Checks each against `references_unified.source_url`. A link already in the
   library has slide-level or beat-level analysis waiting in
   `reference_analysis` and `reference_beats`. A link that is new is inserted
   into `source_discovery_evidence` with `provider = 'study_digest'` and the
   digest id in `raw_evidence`; within five minutes the bridge workflow turns
   it into a reference and queues `media_enrich`, the external worker
   analyses it (carousels slide by slide, short videos already supported), and
   the indexer publishes it to search (§2.6 table).
3. Runs the pattern pass over the digest text plus the analyses of its linked
   posts, not over the text alone, and stores the result in
   `study_digests.analysis` with the reference ids it drew on.

So the digest, the posts it cites, and the rules proposed from them are all
linked and re-readable. Long-form video (transcript plus frame sampling with a
vision model) is not in the library worker today; it is a Phase 3 add on the
same path once the carousel and short-video route is proven.

**`content_knowledge_base`** already exists (121 rows) with `rule_key`,
`directive`, `rule_text`, `rationale`, `confidence`, `support_count`. The
Trends page appends to it. Two columns to add: `source_digest_id` and
`approved_by`, so a rule can say which digest proposed it and who accepted it.

**`image_folders`** — the visual buckets (E1).

| Column | Purpose |
|---|---|
| `id`, `name`, `content_type` (nullable) | a folder, optionally tied to a lane |
| `bucket`, `prefix` | where the files live in Storage |
| `role_tags text[]` | e.g. `cover`, `food`, `before`, `after`, `evidence` |
| `is_active`, `created_by`, `created_at` | |

Phase 1 seeds it from the two existing banks (`glowup_image_bank` pools,
`covered_eye_image_bank` pools) as read-only folders. Uploading into folders
is Phase 4. Images themselves stay in the existing bank tables; a view
`v_image_assets` unions them into `{folder_id, public_url, is_cover, tags}`.

### 5.4 Row-level security

The seven knowledge tables have RLS on with zero policies; service role only.
Keep it that way for every new table. The browser never queries them; route
handlers do, with the service role, after `requireSession()`.

---

## 6. Pages

All under `/carousel-generator`, added to `PIPELINE_ITEMS` in the sidebar
under the *Content* group (replacing the disabled placeholder) once Phase 1
ships. Sub-pages use the same shell; the Topbar breadcrumb shows where you are.

### 6.1 Lanes — `/carousel-generator`

One card per carousel lane, live lanes first, retired ones in a collapsed
group. Each card: display name and character, postable count with days of
cover (from `v_scheduler_pool` and cadence), last batch date, 28-day median
views, a **Generate** button. Lanes without a renderer or copy schema (Char2
Slideshow) show the card with the button absent and the pill "Not wired",
never a disabled button with no explanation. The screen's one `CtaButton` is
Generate on the lane with the least cover; the others are secondary.

### 6.2 Generate — `/carousel-generator/generate?lane=glowup`, then `/carousel-generator/batches/[id]`

**Form** (before the batch exists): lane (pre-filled), how many (a number
the user types, defaulting to the lane's 14-day shortfall, capped at 50 per
batch, Garreth's decision 2026-09-14), images from (a folder
picker showing only folders tagged for this lane), the active direction shown
read-only with a link to edit it, and a one-off note field. **Generate** is the
CTA. Submitting creates the brief and redirects to the batch page.

**Batch page** while generating: a grid of deck cards, one per requested deck,
filling in as each returns. A card shows the hook large, the slides as a
numbered list of copy, the caption, the music suggestion, and the gate pill
(Written / Flagged with the reason / Approved / Rendered / Ready). A progress
line at the top: "7 of 20 written". No spinner per card; the empty card is the
loading state, and the copy arriving is the feedback.

**Per card:** Approve, Redo (whole deck, becomes version 2, the previous
version stays reachable), and Redo on a single slide (regenerates that slide
with the rest as context). Approve and Redo are pressed dozens of times per
batch, so they do not animate. Discard is a `HoldButton`.

**Batch actions:** Approve all unflagged, Render approved. Render is the CTA
once anything is approved. Rendering fills in slide thumbnails on the card
as they land. When every approved deck is Ready, the page says how many
pieces went into the pool and links to Inventory.

**Empty and failed:** the three empty states from the design system (first
run, no results, all clear) apply as documented. A deck whose model call
failed shows the error on the card with Retry; the batch does not stop.

**Resume:** a batch that stopped part-way (closed tab, failed call, deploy)
reopens from History with a Continue action that picks up the unfinished
decks. This applies only to batches the generator created. Decks that existed
before the generator shipped are not adopted or backfilled (Garreth's
decision, 2026-09-14).

### 6.3 History — `/carousel-generator/history`

A table of briefs: date, lane, requested, approved, rendered, ready, who ran
it, and a **Run again** action that clones the brief (same lane, count, folder,
note) under the current direction version and opens the new batch page.
Rows open the batch page in read mode. Filters are pills by lane and a
Dropdown for date range, matching the accounts table.

### 6.4 Directions — `/carousel-generator/directions`

Left: the lanes. Right: the active direction for the selected lane, its
version and date, and a conversation panel. The bot's job is narrow: propose
a revised direction from what Garreth types plus the knowledge rules it cites,
show the diff, and save a new version only when Garreth presses **Save
version**. It never edits silently. Past versions are listed and can be made
active again. Every batch records the direction version it used, so History
can answer "which instruction produced this".

### 6.5 Trends — `/carousel-generator/trends`

Two panes. **Digests:** the `study_digests` list, newest first, with the body
readable in place and an **Analyse** action per digest (or for the last N).
Analysis extracts candidate patterns: a proposed rule, the evidence lines from
the digest, a confidence, and which lanes it applies to. **Knowledge base:**
`content_knowledge_base` browsable by lane and confidence, with proposed rules
shown as pending until accepted. Accepting appends the rule with
`source_digest_id` and the session email. Rejecting records nothing.
The Directions bot reads accepted rules; it never reads raw digests.

### 6.6 Library — `/carousel-generator/library`

A grid of folders, each showing a cover image, the count, the lane and role
tags. Opening a folder shows its images as a grid with `is_cover` marked. Phase
1 is read-only over the existing banks. Phase 4 adds upload into a folder,
tagging, and retiring an image (a `HoldButton`, since a retired image may be
referenced by an unrendered manifest).

---

## 7. Design and UX rules for the build

These come from the dashboard's own design system, from the `ui-ux-pro-max`
UX guideline set and from Emil Kowalski's design-engineering rules
(`emil-design-eng`), applied to this feature. `web-design-guidelines` is the
review pass to run on every page before it merges, not a design input.

**From `docs/DESIGN-TOKENS.md` §10, binding:** a slide is a card; the one being
edited is the same card with `.glass`. Counts and character limits use
`.tnum`. Generate is the one accent action. Regenerate, discard, reorder are
secondary pills. Draft, generating, approved, failed map to the existing pill
tones; no new colour for a new state word. Destructive steps are a
`HoldButton` with no paragraph above it.

**Feedback for long waits** (ui-ux-pro-max, Feedback and Performance): show
real progress ("7 of 20 written"), reserve the space for content before it
arrives so nothing jumps, use the empty card as the skeleton, and never a
flashing spinner for a sub-second step. Every failure carries a Retry on the
thing that failed.

**Review flow** (ui-ux-pro-max, Forms and Feedback): confirm before destructive
actions (the hold does this), offer undo for bulk actions (Approve all gets a
5-second Undo toast), keep the error next to the thing that failed, and put
the caution in the affordance rather than in prose.

**Frequency decides motion** (emil-design-eng): Approve and Redo are pressed
tens of times per batch, so they get the 100 to 160 ms press feedback and
nothing else. Cards arriving in a batch may stagger in at 30 to 50 ms each;
cards never animate from scale zero. Dropdowns and the folder picker use the
existing 150 to 250 ms ease-out. Anything keyboard-driven does not animate.
Respect `prefers-reduced-motion`.

**Accessibility, non-negotiable:** every icon-only control has a label; focus
rings stay; tab order matches visual order; the batch progress line is an
`aria-live="polite"` region announced as a full phrase; slide copy renders as
plain text, never as HTML (the handover is explicit: source and model text are
untrusted).

**Not an app for a phone**, but it must not break on one: the deck grid drops
to one column, the batch actions become a bottom bar, nothing scrolls
sideways.

---

## 8. What was learned from the commercial tools

Fastlane, SlideFarm, ViralBaby, SlidesCockpit and ReelFarm were looked at.
They split into "feed the machine" autopilots and "batch then approve" tools.
The patterns that transfer to an internal batch generator for many accounts:

- Batch-generate, then a fast approve loop (Fastlane's swipe review). Our
  card grid with Approve and Redo is the desktop form of that.
- Publish-to-draft as the safe default (SlideFarm, ViralBaby). Our version is
  the gate: nothing reaches the scheduler without a human approving.
- Image collections decoupled from generation (ReelFarm). Our Library and the
  "images from" picker.
- A real trend library beats manual scouting (Fastlane). Our Trends page and
  knowledge base.
- Per-lane recipes running side by side (ReelFarm). Our per-lane directions.

Anti-patterns to avoid, both seen in third-party reviews: batch volume without
real variation (28 "variants" that were three ideas repeated), and approval
only at the whole-deck level. Per-slide Redo and a variation check in the
quality gate address both.

---

## 9. Phases

Each phase ships on its own and leaves the app working. Nothing in a later
phase is needed for an earlier one to be useful.

### Phase 0 — decisions and prerequisites (no code)

- Answers to the questions in §10.
- Locate the `carousel-command-center` repo (it is not under Garreth's GitHub
  account; check the Vercel project's Git settings).
- Turn on MCP access for the two n8n workflows that could not be read ("PM
  Carousel Shared Analysis and Search", "[Virlo] References → Story Finder
  Bridge"), so the plan does not fight a worker it cannot see.
- Confirm secrets available to the deployed app: Anthropic key, Supabase
  service role (already there).
- Add Czedrick's email to `ALLOWED_EMAILS` on Vercel and in `.env.local`.
- Migrations: the two brief columns, the status additions,
  `carousel_lane_directions`, `image_folders`, `v_image_assets`. Commit the
  reconstructed content-intelligence migration alongside so the repo matches
  the live schema.

### Phase 1 — Glow Up, end to end

- Lanes page (§6.1) with live numbers.
- Generate form and batch page (§6.2) for `glowup`: copy, caption, music
  suggestion, gate score, Approve, Redo, per-slide Redo, materialise into
  `glowup_decks`.
- The in-app painter for Glow Up, to the letter of
  `docs/CAROUSEL-RENDERER-PORT-SPEC.md`: port `paint_manifest.py`'s `quad`,
  `single`, `quiz` layouts and `deck_rules.json`; the Director step that builds
  `render_manifest` (pools per slide, brightness matching on the bank's
  `luminance` column, the 2+2 diagonal rule, per-batch datestamp and fixed
  copy) moves into the route handler. Captions are drawn as an SVG text layer
  with stroke and composited with sharp, not through Satori, which cannot
  stroke text. Bundle Liberation Sans Bold in place of Arial Bold. Rows are
  claimed atomically before painting (port spec §C.3). Before it ships, ten
  decks are rendered side by side against their Python originals.
- History page (§6.3) with Run again.
- A plain textarea version of Directions for `glowup` (the bot comes in Phase 2)
  so the batch always records a direction version.
- Library page (§6.6) read-only over `glowup_image_bank`.
- Audit log entries for approve, render, discard.
- Tests: prompt builders, gate scoring and compliance regex, manifest builder,
  `carousel_id` numbering, materialise mapping. CI stays green.
- Sidebar item goes live.

**Done when:** a batch of 20 Glow Up decks generated from the dashboard appears
in `v_scheduler_pool`, the Smart Scheduler assigns them, and the Posting Agent
posts one, confirmed live.

### Phase 2 — Covered Eye, and the Directions bot

- Covered Eye copy (five-beat arc), image assignment by pool (seeded by
  `carousel_id` as today), caption-on-image painter for 1080×1920 per the port
  spec §B.1: slide-5 bottom placement at 0.9 scale, the blurred shadow layer,
  quotes on Jealous Friend hooks only. Inter Bold replaces SF Pro and Noto
  Color Emoji replaces Apple Color Emoji, which is a visible change Garreth
  signs off on a side-by-side. Always upload the captioned render and point
  `slide_N_url` at it (the Aug 13 batch did not, port spec §C.6).
- Directions page with the conversation panel, versions, and knowledge-rule
  citations (§6.4).
- Library reads `covered_eye_image_bank` too.

**Done when:** Character 3's GLP pool is non-zero from dashboard-made decks and
one has posted.

### Phase 3 — Trends and the knowledge base

- `study_digests` table; one insert node added to the n8n "Daily Study Digest
  Email" workflow (remember: `update_workflow` saves a draft, `publish_workflow`
  makes it live).
- Trends page (§6.5): read digests, Analyse, propose rules, accept into
  `content_knowledge_base` with provenance.
- Directions bot reads accepted rules.

**Done when:** a rule proposed from a digest is cited by a saved direction
version, and a batch records that version.

### Phase 4 — Library management

- Upload into a folder, tag, mark cover, retire. Folder-to-lane assignment.
- Generation reads folders through `v_image_assets` only.

### Phase 5 — The remaining lanes

- Char2 Slideshow: **out of scope** (Garreth, 2026-09-14). Nobody knows where
  its copy is written. Revisit only if someone claims the lane.
- Rich Life, BWC, Strong Informational: only if reactivated. Their renderer is
  the Vercel function; either lift it into the app or call it.
- BA Evidence: a compositing step, not a writer; low priority.

---

## 10. Decisions and open questions

Answered by Garreth on 2026-09-14, and applied above:

| # | Question | Decision |
|---|---|---|
| 2 | Is Approve the final human check? | **No.** Approve accepts the generated copy. Gatekeeping and everything after stay outside the app (§4.4). |
| 3 | Batch size | User types the count; **cap 50** per batch (§6.2). |
| 4 | Daily spend ceiling | **None for now.** |
| 5 | Who can generate | **Anyone with dashboard access.** Add Czedrick to `ALLOWED_EMAILS` (§1.F, Phase 0). |
| 6 | Study digest capture | One insert node in the existing n8n mailer; Analyse step links cited posts to the reference library and analyses them there (§6.5). |
| 7 | Finish unfinished work | **Resume applies only to generator-made batches.** No backfill of decks from before the generator (§6.2). |
| 8 | Char2 Slideshow | **Discarded** for now (§9, Phase 5). |
| 10 | Commit | Commit and push once the answers are folded in. |

Still open:

1. **Who runs the Glow Up and Covered Eye painters?** Answered 2026-09-14:
   Garreth's own Mac, by hand (§2.4). The in-app painter replaces them; the
   race guard in the port spec §C.3 covers the case where someone runs the old
   script anyway.
1b. **Should the 60 Covered Eye decks from Aug 13 (CE-181 to CE-240) be
   repaired?** Their `slide_N_url` columns point at raw bank photos without
   captions, and 59 of them are marked Posted. One spot-check of a posted
   TikTok settles whether they went out captionless. The captioned renders for
   all of them are in the zip's `out/` folder, now on Czed's Mac, so repointing
   the rows is an upload, not a re-render. Garreth's call; not part of the
   generator build.
1c. **Music for Glow Up.** The Python painter picked music with a local
   heuristic over `music_library` (prefer Sade-tagged tracks for emotionally
   loaded hooks), not the n8n Music Recommender the plan assumed. Confirm the
   generator should call the recommender for both lanes.
2. **The `carousel-command-center` source** is recovered and reference-only
   (§2.4); nothing further needed.
3. **Who runs the Phase 0 analysis worker?** The `media_enrich`,
   `visual_analyze` and `video_analyze` jobs in `content_pipeline_jobs` are
   processed by something that is not in n8n and not on Czed's Mac, and it
   was active on 2026-09-13. Most likely the `search-worker.mjs` from the
   developer handover, run by whoever wrote it. The Trends page depends on it
   staying up; if it stops, new sources queue but are never analysed.
4. **Move the two hardcoded service keys** in the bridge workflow's code node
   into n8n credentials and rotate them (§2.6).
5. **Czedrick's sign-in email** for `ALLOWED_EMAILS`. The address the n8n
   digests go to is the likely one; confirm before adding.

---

## 11. Re-run before acting

The ranking queries live in the research notes for this plan and are
reproduced here so the numbers can be refreshed.

**Postable now, per lane:**

```sql
select content_type, "character", pool_n
from v_scheduler_pool
where content_type in ('glowup', 'covered_eye_carousel', 'char2_slideshow');
```

**Is anyone producing?**

```sql
select 'glowup' as lane, count(*) filter (where created_at >= now() - interval '28 days') as made_28d,
       max(created_at)::date as last_made from glowup_decks
union all
select 'covered_eye_carousel', count(*) filter (where created_at >= now() - interval '28 days'),
       max(created_at)::date from covered_eye_carousel;
```

**Performance, same join as the Analytics page:**

```sql
with u as (
  select posted_at, views, total_engagement, carousel_id from tt_post_performance
  union all
  select posted_at, views, total_engagement, carousel_id from post_performance
)
select up.content_type, count(*) as posts,
       percentile_cont(0.5) within group (order by coalesce(x.views,0))::int as median_views,
       round(100.0 * count(*) filter (where coalesce(x.views,0) <= 10) / count(*))::int as pct_dead
from u x
join unified_posts up on up.content_id = x.carousel_id
join content_type_registry r on r.content_type = up.content_type
where r.media_shape = 'image_carousel' and x.posted_at >= now() - interval '90 days'
group by 1 order by median_views desc;
```

**Parked composite score:** `select * from content_type_score(90) order by score desc;`

---

## 12. Sources

- Garreth's notes, 2026-09-14 (this session).
- `Peptide_Miracles_Carousel_Search_Developer_Handover.docx`, 2026-09-11: the
  carousel search API contract (not yet hosted), the reference library, and
  the rule that source and model text are untrusted.
- `github.com/garrethdev/carousel-agent`: the older TypeScript generator
  prototype (last commit 2026-01-31).
- `carousel-command-center/` (recovered 2026-09-14 from Vercel deployment
  `dpl_7Uou7pf7NedqZKB6eLPDPK2ZpPd6`): the live command center, its four
  functions, and `ORCHESTRATOR_DESIGN.md`.
- `covered_eye.zip` and `glowup.zip` (Garreth's team, 2026-09-14): the
  renderer folders as they sit on the Mac that runs them, including 135
  rendered Covered Eye decks. Analysed in `docs/CAROUSEL-RENDERER-PORT-SPEC.md`.
- `github.com/garrethdev/content-render-scripts`: every renderer, including
  the mirrored `render-carousel.js`.
- n8n instance `czed.app.n8n.cloud`, read-only, 2026-09-14.
- Supabase project `qlcmgxgwpzmiebzxflai`, read-only, 2026-09-14.
- Fastlane, SlideFarm, ViralBaby (search snippets only; site blocked),
  SlidesCockpit, ReelFarm, 2026-09-14.
