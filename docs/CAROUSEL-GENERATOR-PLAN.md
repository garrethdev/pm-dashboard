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

**Revised 2026-09-14 after Garreth widened the scope.** The Carousel Generator
is a pipeline with a front, a middle and a back. **Front:** an idea, either a
trending reference carousel or our own, is turned into a new carousel
**template** with an AI helper inside a sandbox canvas, where the copy styles
(font, weight, stroke, shadow, position), the image library it draws from
(chosen or made, then filled by upload or AI generation) and the directions for copy and captions are set by hand,
then saved as a new content type with a name and a character. **Middle:** a
content type generates decks in batches, each reviewed and approved before
rendering. **Back:** an approved new content type is wired into Supabase (its
own lane, registry row, views), captioned, and becomes visible to the Smart
Scheduler, the Unified Posting Agent and Inventory. The two lanes that are
live today, **Glow Up** (Character 2) and **Covered Eye** (Character 3), enter
this pipeline in the middle as the first two imported templates, because
nobody has made a new deck for either in 32 to 44 days and there are two
postable pieces left between them. **Phase 1 is flows and designs, finalised
and signed off, with nothing built.**

---

## 1. Requirements, organised

Garreth's notes, grouped and numbered so the phases in §9 can refer to them.
Groups G and H were added on 2026-09-14 when the scope widened to the front
and back of the pipeline.

### G. Create (the front of the pipeline)

| # | Requirement | Where it lands |
|---|---|---|
| G1 | Start from an idea: a reference carousel found in Trends, or our own | Studio entry (§6.6), "Recreate this" on Trends (§6.5) |
| G2 | With AI help, recreate the reference or draft a carousel from scratch as a new **template** for a content type | Studio, AI draft step (§4.6) |
| G3 | AI prepares the template on a sandbox canvas | Studio canvas (§4.7) |
| G4 | Move and experiment with hook and copy styles: font, weight, stroke, shadow, position | Studio canvas, text-box inspector |
| G5 | Direct which images to use: a library folder, or generate new ones with AI | Studio, image direction (§6.8, §6.6) |
| G6 | Give the AI directions for captions and copy | Studio, direction fields; same model as §6.4 |
| G7 | Save the result as a new content type: name, character; then generate in batch | Studio, "Save as content type" (§5.4) |

### H. Wire (the back of the pipeline)

| # | Requirement | Where it lands |
|---|---|---|
| H1 | Once a new content type is approved, wire it into Supabase as a new carousel lane | Wiring flow (§4.8) |
| H2 | Captioning | Same pass as generation (§4.4) |
| H3 | The Smart Scheduler, the Unified Posting Agent and Inventory can see it | Wiring flow, verified by `v_scheduler_pool` and `unified_posts` |

### A. Generate

| # | Requirement | Where it lands |
|---|---|---|
| A1 | A page of existing carousel lanes; pick one and generate | Carousel types page (§6.1) |
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
| E1 | A visual-bucket page of image folders | Library page (§6.8) |
| E2 | A generation session can point at a folder for its base images | The content type's image library, chosen in the Studio (§4.7), and confirmed or repointed on the Generate form (§6.2) |

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
`covered-eye-images/renders`. Nothing advances `gatekeep_status` from
`'pending'`: the nightly n8n Pre-Publish Gate (`[Content Audit] Daily
Scheduler` → `[Content Audit] Pre-Publish Gate` → `Content Risk Gate`) audits
only rows whose `gatekeep_status` is NULL, so `'pending'` rows are invisible to
it forever (73 of them on 2026-09-15, plus 48 marked `'pass'`, which the
scheduler does not read either). Also zero runs on record.

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
  image library in §6.8 should be this shape, not a third one.
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

**Wider than one workflow (found 2026-09-14, during the Phase 0 check).** The
`[Unified] Posting Agent` carries this project's legacy service-role key as
plain text in five of its HTTP nodes, and the `[Unified] Smart Scheduler`
carries a secret key in its code node (runbook §9 already noted that one).
Rotating a key before every workflow that uses it has moved to credentials
would stop posting, so the order is: sweep every workflow, move each to n8n
credentials, publish, and only then rotate.

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

## 3.5 The full pipeline

```
 IDEA                       STUDIO                      CONTENT TYPE
 a reference from Trends    AI drafts a template        saved with name +
 or our own idea     ──►    on a sandbox canvas;  ──►   character; standing
                            styles, images and          direction; template
                            directions set by hand      version 1
                                                              │
        ┌─────────────────────────────────────────────────────┘
        ▼
 BATCH                      REVIEW                      RENDER
 N decks of copy +   ──►    approve / redo per   ──►    generic painter
 caption + music            deck and per slide          paints the template
                                                              │
        ┌─────────────────────────────────────────────────────┘
        ▼
 WIRE (first batch of a new type only)          APPROVE
 lane table, registry row, unified_posts   ──►  Approve (n) decks on the finished
 and v_scheduler_pool blocks, character          batch, then Smart Scheduler, Posting
 allow-list, n8n media entry, cadence            Agent and Inventory see it
```

Glow Up and Covered Eye are already wired, so for them the pipeline starts at
BATCH: their layouts are imported into the studio as templates once (§4.6),
and everything after that is shared with studio-made types. The plan builds
the middle first for that reason (§9), so stock is refilled while the front is
being designed and built.

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

Three additions for the widened scope: a **template model** (§4.6) that every
content type, imported or studio-made, is expressed in; a **generic painter**
that renders any template, replacing per-lane painters; and a **wiring step**
(§4.8) that turns an approved studio-made type into a real lane.

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
2. **Scored and gated.** The quality-gate rubric (hook quality, content
   quality, 1 to 10), the regex compliance backstop (brand names, molecules,
   price, cure claims), and (Garreth, 2026-09-15) the same **Content Risk
   Gate** n8n runs nightly, called by webhook as soon as the deck's copy
   exists, with the hook, every slide's copy and the caption. Below 6.0, any
   compliance hit or a gate rejection shows as **Flagged** with the gate's
   own reason, and its suggested fix pre-filled in the Regenerate box; never
   auto-rejected. A flagged deck is never rendered. The gate reads text only,
   which is why it runs at writing, not after rendering.
3. **Approved.** A human clicks Approve on the card, or Approve all on the
   unflagged ones. Recorded with the email from the session; never a client
   field. **Approve means the generated copy is accepted, nothing more.**
4. **Rendered.** The painter has produced every slide and the URLs are on the
   lane row.
5. **Rendered, waiting for Approve.** The lane row exists with art, caption
   and music, `gatekeep_status` carrying the gate's verdict from step 2
   (`'approved'`, with its notes and review time) and `scheduler_ready =
   false`. **Never `'pending'`:** the nightly gate audits only NULL rows and
   ignores `'pending'` forever (§2.4), which is what stranded Covered Eye.
   Because the row already carries a verdict, the nightly gate leaves it
   alone. (This state was "Generated" under the 2026-09-14 decision that
   gatekeeping stays outside the app; that decision is replaced by step 6.)
6. **Approved.** (Garreth, 2026-09-15.) **Approve (n) decks** on the finished
   batch sets `scheduler_ready = true` and `approved = true` on every
   rendered, unflagged deck; the Smart Scheduler, the Posting Agent and
   Inventory see them from that moment. **Regenerate (n) decks** sends the
   flagged ones back with feedback. Approve works while flagged decks remain,
   so one stubborn deck never holds the rest. Pressing Approve is the human
   sign-off, batch by batch, with the full-size preview for the close look.
   It is the only Approve in the generator: the per-deck Approve on the review
   page was dropped on 2026-09-14, so there is one sign-off, here, on
   finished work. (Named Approve by Garreth, 2026-09-15; "Release" read as
   discarding.)
   Nothing in the pipeline signs off by hand any more; the nightly gate keeps
   running for the other content types, which still rely on it.

The Carousel types page still shows the postable count from `v_scheduler_pool`, so the
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

### 4.6 The template model and the generic painter

Every content type is described by one JSON document, the **template**, and
one painter renders any template. This is the "one brain, one painter" idea
from the Glow Up renderer taken one step further: the Director's manifest
already said which images and which text go where; the template also says
how they look.

A template holds:

- **Canvas:** width and height (1080×1350, 1080×1440, 1080×1920 today).
- **Slides:** an ordered list, each with a `layout` (`single`, `quad`,
  `quiz`, or a free layout of positioned cells), its **image slots** (each
  with a role such as `cover`, `food`, `evidence:water`, and the set of
  the content type's image library it draws from), and its **text
  boxes** (each with a `copy_role` such as `hook`, `beat_2`, `cta`, and a
  style: font family, weight, size, line height, wrap width, alignment,
  position, stroke width and colour, shadow offset, blur and colour, quote
  wrapping rule).
- **Copy contract:** the list of copy roles the writer must fill, with
  length limits per role, so the AI copy step knows what to produce.
- **Directions:** the standing copy direction, the caption direction and the
  image direction the batch step reads.
- **Provenance:** `source_reference_id` when the template was recreated from
  a reference, the model and prompt version that drafted it, and the version
  number.

The port spec's numbers (`docs/CAROUSEL-RENDERER-PORT-SPEC.md` §B) are the
first two templates, written down as data instead of Python: Glow Up is a
1080×1440 template of seven slides with `quad`, `single` and `quiz` layouts,
Liberation Sans Bold, 3 px stroke and a 2/3 px offset shadow; Covered Eye is
a 1080×1920 template of six slides with one text box per slide, 7 px stroke,
a 19 px blurred shadow, and slide 5 pinned to the bottom at 0.9 scale. Their
image-selection rules (pools, distinct sets, brightness matching, the
diagonal rule) become template settings on the image slots.

The painter takes a template, one deck's copy and one deck's image
assignments and produces the slides: cover-fit the images into their cells,
draw each text box as an SVG text layer with stroke, rasterise and composite
with sharp, upload. It knows nothing about lanes.

### 4.7 The studio canvas

The studio is where a template is made and changed. Two ways in: **from a
reference** (a Trends result or any reference id: the AI reads the reference's
beats and visual notes from the library, runs a vision pass over its slides,
and drafts a template with matching slide count, layouts, text placement and a
style guess, plus a direction note describing the construction), or **from
scratch** (Garreth describes the idea; the AI drafts a template and asks at
most one clarifying question, in the manner of the recovered direction-chat
endpoint).

The canvas shows one slide at a time at true aspect ratio, with the other
slides as a filmstrip. Text boxes and image cells are selectable and
draggable; the inspector on the right edits the selected box's style (font,
weight, size, stroke, shadow, alignment, wrap width) with the change visible
at once. Sample copy fills the boxes so the styles can be judged; a
"Regenerate sample" action asks the AI for fresh sample copy under the
current direction. The template points at one **image library** (§6.8),
asked for when the Studio opens: an existing library or a new one. Each image
slot draws from a set in that library, and the Generate form can repoint
it to another library (§6.2; Garreth, 2026-09-14). New images are not made in the
Studio; they are uploaded or generated inside a library, independent of any
content type. AI images are generated with **Higgsfield** (Garreth's decision, 2026-09-14),
which the dashboard already has connected; its character and reference
features cover the likeness-anchored generation the Covered Eye bank was
built with on fal.ai.

**Fidelity rule.** The canvas is an HTML preview built from the same template
JSON the painter reads, and the fonts are the same bundled files, so
positions and wraps match closely. A **Render preview** action runs the real
painter on the current slide and shows the exact output, because the
browser's text layout and the server's are never identical to the pixel.
Design sign-off happens on the rendered preview, not the HTML one.

**Save as content type** asks for a name, a character and a content-type slug,
snapshots the template as version 1 pointing at its image library, and
creates the standing direction. The
type then appears on the Carousel types page as "not wired", and its first batch can
be generated and reviewed before anything touches the database schema.

### 4.8 Wiring a new content type

The runbook `WIRE-NEW-CONTENT-TYPE.md` (workspace root) lists what a lane
needs before the rest of the system can see it: a source table in the
standard shape, a `content_type_registry` row, the character's
`allowed_content_types`, the `scheduler_ready` trigger, a block in the
`unified_posts` view, a block in `v_scheduler_pool`, the n8n MEDIA entry, and a
cadence rebalance. Skipping any of them does not make the lane disappear; it
makes the lane report zeros, which is worse.

**Decision needed (§10, item 12): one table per type, or one shared table.**

- **Option A, one table per type**, exactly as the runbook and every existing
  lane do it. Each new type creates a table plus two view blocks. This is
  DDL run from an app, which the dashboard has never done; it needs a
  reviewed migration each time.
- **Option B, one shared table** `studio_carousel_posts` with a
  `content_type` column and slots for up to 12 slides. A new type then needs
  a registry row, the allow-list entry and one view block that filters on
  `content_type`, all of which are data or small view edits, not new tables.
  It breaks the "one table per lane" convention, so `inventory_check`,
  `v_scheduler_pool` and the Posting Agent need checking for anything that
  assumes a table is one lane.

**Garreth's decision, 2026-09-14: Option A, one table per content type**, so
each type keeps its own identity and can be paused, unpaused or retired on
its own. For the record: a shared table can keep identity too, because a
lane's identity is its `content_type_registry` row and every downstream tool
keys on `content_type`, not the table; and a middle path exists (one physical
table, one small view per type registered as that type's `source_table`).
Both are noted here only in case the per-type migrations become a burden
later. The wiring flow therefore generates a per-type migration from the
runbook's standard shape (`content_id`, `slide_1_url` to `slide_12_url`,
`caption`, `music`, the twelve required posting columns, the `scheduler_ready`
trigger) plus the two view blocks, and the wiring flow in the app shows what
it is about to do (the generated SQL or the registry values),
requires a `HoldButton` to run it, writes an audit-log entry, and then
verifies itself by reading `unified_posts` and `v_scheduler_pool` back and
showing the new lane's row count. The n8n MEDIA entry and the cadence
rebalance stay human steps, with the cadence editor that already exists in the
dashboard linked from the wiring screen.

**Verified 2026-09-14 (Phase 1).** Option A was checked by reading the live
definitions of everything downstream. Nothing assumes a fixed list of tables
except the two hand-wired views and the Smart Scheduler's media map, all of
which the runbook already covers:

- `unified_posts` (22 content types) and `v_scheduler_pool` (17) are
  hand-written, one block per lane table. A new table needs one block in each.
- `inventory_check` reads only `v_scheduler_pool` and `v_new_account_demand`.
  `inventory_rollup`, `v_scheduler_production_order` and `content_type_score`
  read the registry and those views. None reads a lane table directly (the
  production order also reads `filler_contents`, for filler only).
- The Posting Agent reads `unified_posts_due` (built on `unified_posts`, the
  registry and `accounts`) and writes back to whichever `source_table` and
  `source_id_column` the registry names. It is fully registry-driven.
- The Smart Scheduler reads the registry and queries each `source_table` by
  name. Its only hardcoded lists are `MEDIA` and `CAPCOL` (runbook §9).

So one table per type works with no change to any consumer beyond the
runbook's steps. The flow is F11 in `docs/CAROUSEL-GENERATOR-FLOWS.md`.

**Decided 2026-09-14 (Garreth):** the app creates a lane through a reviewed
database function that builds the standard shape, never through a direct
database connection. Wiring also confirms every first-batch track's TikTok
and Instagram sources (flow F14) before any deck is written to the new table.

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
(content_type), `count`, `image_library`, `direction_version`, `note`, and
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

Glow Up row from a draft (checked against the live rows 2026-09-14; the exact
mapping is `lane` and `copy_contract` in `docs/carousel-templates/glowup.v1.json`):
`carousel_id` (`GU-<n>`; the highest today is `GU-153`), `deck_key`, `hook`,
`hook_text`, `before_line`, `after_line`, `tip_face`, `tip_stomach`,
`tip_waist`, `quiz_line`, `caption`, `music` (`transition_line` and the
`slide_1..6` text columns are drawn on no slide; see
`docs/CAROUSEL-TEMPLATE-MODEL.md` §4), `pillar =
'glowup_carousel'`, `character = 'char2'`, `batch`, `render_set`,
`render_manifest`, `render_status = 'queued'` (**not** `'ready'`: the Mac
painter selects `'ready'`, and `'queued'` is a value no Python script reads,
see the port spec §C.3), `quality_score`, `quality_status`,
`gatekeep_status` = the Content Risk Gate's verdict with `gatekeep_notes`
and `gatekeep_reviewed_at` (never `'pending'`, §4.4 step 5), `approved =
false`, `scheduler_ready = false`. The lane row's `approved` and
`scheduler_ready` flip together, only at Approve (§4.4 step 6).

Covered Eye row: `carousel_id`, `hook_text`, `hook_type`, `peptide_angle`,
`slide_1..6`, `caption`, `music`, `pillar`, `batch`, `render_set`, `status =
'scripted'`, `quality_score`, `quality_status`, `gatekeep_status` = the
gate's verdict (never `'pending'`), `approved = false`, `scheduler_ready =
false`.

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

**`image_libraries`** — the image libraries (E1). A library holds images of a
character, a place and anything else a carousel needs, and belongs to no
content type (Garreth, 2026-09-14).

| Column | Purpose |
|---|---|
| `id`, `name` | one library |
| `bucket`, `prefix` | where the files live in Storage |
| `sets text[]` | the sets a template's image cells draw from, e.g. `cover`, `food`, `before`, `after` (today's pools). Sets nest one level, so a cell may name a set inside a set |
| `is_active`, `created_by`, `created_at` | |

A content type points at one library through its template
(`carousel_templates.image_library_id`, so repointing is a new template
version); several content types may point at the same library. Phase 2 seeds
two libraries from the existing banks (`glowup_image_bank`,
`covered_eye_image_bank`) as read-only, each pointed at by its content type,
with the banks' pools as sets. Those images stay in the bank tables. Images
in new libraries go in `image_library_images`, the same bank shape (§2.5) plus
`library_id` and, for generated images, the prompt, shape and likeness images.
A view `v_image_assets` unions both into `{library_id, public_url, is_cover,
set_name, subset_name}` — named that way because `SET` is a SQL keyword.
New libraries, uploading, generating and tagging are Phase 4.

### 5.4 Templates

**`carousel_templates`** — one row per template version.

| Column | Purpose |
|---|---|
| `id`, `slug`, `version` | one row per saved version; `active` marks the current one |
| `name`, `character`, `content_type` (nullable until saved as a type) | |
| `canvas` jsonb, `slides` jsonb, `copy_contract` jsonb | the template model of §4.6 |
| `image_library_id` | the image library this version draws from |
| `copy_direction`, `caption_direction`, `image_direction` text | |
| `source_reference_id` bigint (nullable) | the reference it was recreated from |
| `generation_metadata` jsonb | model, prompt version, drafting inputs |
| `status` | `draft`, `active`, `retired` |
| `created_by`, `created_at` | |

`carousel_briefs` gains `template_id` so every batch records the exact
template version it was rendered with. The two imported lanes get their
templates inserted by the Phase 2 migration, from the port spec's numbers.

### 5.5 Row-level security

The seven knowledge tables have RLS on with zero policies; service role only.
Keep it that way for every new table. The browser never queries them; route
handlers do, with the service role, after `requireSession()`.

---

## 6. Pages

All under `/carousel-generator`. The way in is the sidebar's **Generate**
item, first in the *Content* group above Content calendar and Content types:
`/generate` shows one card per kind of content the dashboard can generate
(only Carousel today), and the Carousel card opens Carousel types (Garreth,
2026-09-14). Inside, the generator has its own left menu instead of the
dashboard's, topped by **← Dashboard** back to `/generate`; the items and the
rules for them are in `CAROUSEL-GENERATOR-FLOWS.md` §1. Both routes exist
already; `/carousel-generator` is a placeholder until Phase 2. Sub-pages use the same shell; the Topbar breadcrumb shows where you are.

### 6.1 Carousel types — `/carousel-generator`

One card per carousel lane, live lanes first, retired ones in a collapsed
group. Each card: display name and character, postable count with days of
cover (from `v_scheduler_pool` and cadence), last batch date, 28-day median
views, a **Generate** button. Lanes without a renderer or copy schema (Char2
Slideshow) show the card with the button absent and the pill "Not wired",
never a disabled button with no explanation. Every card's Generate is the same
accent button, none singled out (Garreth, 2026-09-14). The card itself is the
name, neutral pills for the character and slide count, a folded **View
details** section, then Generate with the last batch date opposite it, or the
status in the date's place when there is one.

### 6.2 Generate — `/carousel-generator/generate?lane=glowup`, then `/carousel-generator/batches/[id]`

**Form** (before the batch exists): lane (pre-filled), how many (a number
the user types, pre-filled with 50 and capped at 50 per batch, Garreth's
decisions 2026-09-14), the image library (the
one the content type points at, with Change to repoint it, or a required
choice when it points at none; a repoint is saved as a new template version
and the batch records the library it used, Garreth 2026-09-14), the active direction shown
read-only with a link to edit it, and a one-off note field. **Generate** is the
CTA. Submitting creates the brief and redirects to the batch page.

**Batch page** while generating: a grid of deck cards, one per requested deck,
filling in as each returns. A card shows the hook large, the slides as a
numbered list of copy, the caption, the music suggestion, and the gate pill
(Written / Flagged with the reason / Approved / Rendered / Generated). A progress
line at the top: "7 of 20 written". No spinner per card; the empty card is the
loading state, and the copy arriving is the feedback.

**Per card:** Approve, Redo (whole deck, becomes version 2, the previous
version stays reachable), and Redo on a single slide (regenerates that slide
with the rest as context). Approve and Redo are pressed dozens of times per
batch, so they do not animate. Discard is a `HoldButton`.

**Batch actions:** Regenerate batch, Render. Render is the CTA and takes
every written, unflagged deck. Rendering fills in slide thumbnails on the
card as they land. When every unflagged deck is rendered, the finished line
counts rendered and flagged decks and offers **Approve (n) decks** (the
accent) and **Regenerate (n) decks** (Garreth, 2026-09-15; §4.4 step 6).
There is no link to Inventory: until Approve, Inventory would not count
these decks.

**Empty and failed:** the three empty states from the design system (first
run, no results, all clear) apply as documented. A deck whose model call
failed shows the error on the card with Retry; the batch does not stop.

**Resume:** a batch that stopped part-way (closed tab, failed call, deploy)
reopens from History with a Continue action that picks up the unfinished
decks. This applies only to batches the generator created. Decks that existed
before the generator shipped are not adopted or backfilled (Garreth's
decision, 2026-09-14).

### 6.3 History — `/carousel-generator/history`

A table of briefs: date, carousel type, requested, written, rendered,
approved, and a status, plus a **Run again** action that clones the brief
(same type, count, note) under the current direction version and image library
and opens the new batch page. Rows open the batch page in read mode. Filters
are pills by type and a Dropdown for date range, matching the accounts table.

The counts follow the batch as it runs, so **approved is the last of them**:
since the text gate moved into writing (§4.2, F3), the one sign-off is Approve
on the finished batch, and that count is what the Smart Scheduler can see.
This column was called "ready" here until 2026-09-16, which clashed with
`posting_status = 'Ready'` (*scheduled for today*) elsewhere in the dashboard,
and "generated" in the tickets, which was retired with the model change.
There is **no "who ran it"** column: the app shows nobody's name anywhere
(Garreth, 2026-09-16, approving D9). The status takes that place — Done,
Writing 7 of 20, Stopped, Not wired — and a status meaning something went
wrong is red.

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
Every reference the analysis links to shows its slides and carries a
**Recreate this** action that opens the Studio with that reference (§6.6).
Analysis extracts candidate patterns: a proposed rule, the evidence lines from
the digest, a confidence, and which lanes it applies to. **Knowledge base:**
`content_knowledge_base` browsable by lane and confidence, with proposed rules
shown as pending until accepted. Accepting appends the rule with
`source_digest_id` and the session email. Rejecting records nothing.
The Directions bot reads accepted rules; it never reads raw digests.

### 6.6 Studio — `/carousel-generator/studio` and `/carousel-generator/studio/[template]`

The canvas of §4.7. Entry points: "New from idea" on the Carousel types page, "Recreate
this" on a Trends result, and "Edit template" on a lane card. Three regions:
the filmstrip of slides on the left, the canvas in the middle, the inspector
on the right, with the AI conversation collapsible under the inspector. The
screen's one accent action is **Save as content type** for a new template or
**Save version** for an existing one; Render preview, Regenerate sample and
Discard are secondary, and Discard is a `HoldButton`. Every saved version is
listed and can be made active again.

### 6.7 Content types — `/carousel-generator/types/[slug]`

One page per content type, imported or studio-made: the active template
version and its history, the standing direction (the Directions page of §6.4
folds into this page as a tab), the batches run under it, and the wiring
status with the wiring flow of §4.8 when the type is not yet a lane. The
Carousel types page (§6.1) becomes the index of this page.

### 6.8 Library — `/carousel-generator/library`

A grid of image libraries, each showing a cover image, the image count, its
sets and the content types pointing at it. Opening a library shows its sets
as folders, with whatever is in no set below them and `is_cover` marked. A
library starts with no sets at all, and images in no set are ordinary. A
library belongs to no content type:
it holds images of a character, a place and anything else a carousel needs,
and any content type can be pointed at it (Garreth, 2026-09-14). Phase 2 is
read-only over the existing banks. Phase 4 adds New library, upload into a
set, retiring an image (a `HoldButton`, since a retired image may be
referenced by an unrendered manifest), and **generating images with
Higgsfield**, which depends on no content type: a prompt, what it shows
a base image to work from (optional), a count, a shape — and never a set
the library's own images of that character as the likeness reference.
Generated images wait for a person to keep them before they join the
library, and stay untagged until AI vision reads them.
Flow F7 in `docs/CAROUSEL-GENERATOR-FLOWS.md`.
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
cards never animate from scale zero. Dropdowns and the library picker use the
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

Each phase ships on its own and leaves the app working. The order builds the
middle of the pipeline before the front, so stock is refilled early and the
painter and review loop are proven on real lanes before the studio depends on
them. Garreth confirms or changes this order in §10, item 11.

### Phase 0 — decisions and prerequisites (no code)

- Answers to the open items in §10.
- Confirm secrets available to the deployed app: Anthropic key, Supabase
  service role (already there).
- Add Czedrick's email to `ALLOWED_EMAILS` on Vercel and in `.env.local`.
- Move the two hardcoded service keys in the bridge workflow into n8n
  credentials and rotate them (§2.6).

**Status, checked 2026-09-14.** Nothing in Phase 0 was changed; these are the
findings for Garreth to act on.

| Item | Finding |
|---|---|
| Anthropic key | **Not in `.env.local`.** Vercel's variables could not be read from this Mac (no Vercel CLI). No Anthropic library is installed yet, which is expected before Phase 2. |
| Supabase service role | Present in `.env.local`. |
| Czedrick in `ALLOWED_EMAILS` | Not added. The likely address is the one the Smart Scheduler already emails its alerts to, `czedrickjhake.cc@gmail.com`; confirm it is the address Czedrick signs in with. |
| Hardcoded keys | Wider than the bridge: the Posting Agent and the Smart Scheduler carry keys too (§2.6). Sweep, move, publish, then rotate. |
| Open questions | §10 items 3 (analysis worker), 4 (keys) and 5 (email) are still open. Item 1c (music) was answered the same day. |

### Phase 1 — flows and designs, finalised (no feature code)

Garreth's instruction, 2026-09-14: nothing is developed until the flows and
designs are final.

- **Flows.** One document, `docs/CAROUSEL-GENERATOR-FLOWS.md`, with every user
  journey step by step: recreate from a reference, create from scratch, edit
  a template, generate a batch, review and approve, render, wire a new type,
  resume a stopped batch, rerun a batch, analyse a digest, accept a rule,
  manage an image library. Each flow names its screens, its one accent action, its
  destructive steps, its empty states and its failure states.
- **Screens.** Every page in §6 designed with the dashboard's own components,
  in dark and light mode (dark designed first, light from the same tokens;
  Garreth, 2026-09-14), at desktop and phone widths, including the studio canvas
  and inspector. **Designed in Claude Design** (Garreth's decision,
  2026-09-14), whose project already holds the tokens and twenty components,
  with the round trip kept open: a screen can be captured into a **new**
  Figma file for iteration (the design-system Figma file stays frozen), read
  back into Claude Code with the Figma tools, and pushed to Claude Design
  again with the scripts in `scripts/claude-design/`. Canvases drift on
  fonts and glass effects, so Figma iterations are for layout and flow, and
  final sign-off is on the Claude Design or in-app version.
- **The template model, written down.** The JSON shape of §4.6 with the two
  imported lanes expressed in it, reviewed against the port spec, so the
  painter and the studio are built to the same contract.
- **The wiring decision verified.** Option A or B of §4.8, checked against
  `inventory_check`, `v_scheduler_pool` and the Posting Agent by reading their
  definitions, before any code depends on it.
- **Review passes.** `ui-ux-pro-max` for the UX rules and
  `emil-design-eng` for interaction and motion decisions during design;
  `web-design-guidelines` as the accessibility and best-practice review on
  every screen before sign-off.
- **Done when:** Garreth has signed off every flow and every screen, and the
  template JSON for Glow Up and Covered Eye reproduces the port spec.

**Progress, 2026-09-14.**

| Deliverable | State |
|---|---|
| Flows | Drafted: `docs/CAROUSEL-GENERATOR-FLOWS.md`, 13 flows and the screen inventory. Awaiting sign-off; its §4 lists the answers needed. |
| Template model | Written: `docs/CAROUSEL-TEMPLATE-MODEL.md` and `docs/carousel-templates/*.v1.json`. `scripts/carousel-templates/verify.mjs` confirms both reproduce their Python painters (134 checks). Four questions in its §5. |
| Wiring decision | Verified; see §4.8. |
| Screens | Not started. They are designed from the flows once the flows are signed off. |

### Phase 2 — the middle: templates, generic painter, batch generation

- Migrations: the brief columns and status additions (§5.1),
  `carousel_templates` (§5.4), `carousel_lane_directions`, `image_libraries`,
  `v_image_assets`; the two imported templates inserted from the port spec.
- The generic painter (§4.6): SVG text layer with stroke, sharp composition,
  bundled fonts (Liberation Sans Bold, Inter Bold, Noto Color Emoji), atomic
  row claims (port spec §C.3), upload retries, a vision QA pass before Generated.
- Carousel types and content-type pages (§6.1, §6.7), Generate and batch review
  (§6.2), History with Run again and Continue (§6.3), Library read-only over
  the two banks (§6.8), the standing direction as a plain editor.
- Only for lanes that are healthy, performing and frequently used (Garreth,
  2026-09-14). Glow Up qualifies outright. Covered Eye is frequently used and
  the healthiest lane in the system but not a performer; it stays in this
  phase because it is Character 3's only carousel lane and that pool is zero;
  **Garreth confirmed it qualifies, 2026-09-14.** Each lane ends with a
  batch that the Smart Scheduler assigns and the Posting Agent posts,
  confirmed live.
- Ten decks per lane rendered side by side against their Python originals
  before the in-app painter is trusted.

### Phase 3 — the front: the studio

- Studio canvas and inspector (§4.7, §6.6): select, drag, style, sample copy,
  Render preview, versions.
- AI template drafting from scratch and from a reference (vision pass over
  the reference's slides, plus its beats and visual notes from the library).
- Directions conversation with versions and knowledge-rule citations (§6.4),
  now inside the content-type page.
- Save as content type, appearing on Carousel types as "not wired"; a first batch can
  be generated and reviewed before wiring.

### Phase 4 — the back: wiring, and AI images

- The wiring flow (§4.8): preview, hold to run, audit log, self-verification
  against `unified_posts` and `v_scheduler_pool`, links to the cadence editor
  and the n8n MEDIA step.
- Caption and music in the batch pass for studio-made types, identical to the
  imported lanes.
- New image libraries, and AI image generation with Higgsfield inside a
  library, independent of any content type (Garreth, 2026-09-14; the fal.ai
  prompt-maker scripts are the reference for how the banks were built), plus
  upload and retiring in the Library (§6.8).

### Phase 5 — learning, and the rest

- `study_digests` table; one insert node added to the n8n "Daily Study Digest
  Email" workflow (remember: `update_workflow` saves a draft,
  `publish_workflow` makes it live); the Trends page with Analyse, proposed
  rules and Recreate this (§6.5); accepted rules read by the directions
  conversation.
- Remaining lanes: Rich Life, BWC and Strong Informational only if
  reactivated, as imported templates of the Vercel renderer's layout; BA
  Evidence as a compositing template. Char2 Slideshow is out of scope
  (Garreth, 2026-09-14).

## 10. Decisions and open questions

Answered by Garreth on 2026-09-14, and applied above:

| # | Question | Decision |
|---|---|---|
| 2 | Is Approve the final human check? | **No** (2026-09-14): Approve accepts the generated copy; gatekeeping stays outside the app. **Revised 2026-09-15:** the text gate runs inside writing and **Approve (n) decks** on the finished batch is the human sign-off (§4.4 steps 2 and 6). |
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
1b. **The 60 Covered Eye decks from Aug 13 (CE-181 to CE-240)** point at raw
   bank photos without captions, and 59 are marked Posted. **Parked by
   Garreth, 2026-09-14: not to be dealt with now.** The captioned renders are
   in the zip's `out/` folder if it is ever picked up.
1c. **Music for Glow Up.** The Python painter picked music with a local
   heuristic over `music_library` (prefer Sade-tagged tracks for emotionally
   loaded hooks), not the n8n Music Recommender the plan assumed. Confirm the
   generator should call the recommender for both lanes.
   **Answered by Garreth, 2026-09-14:** neither. The writer chooses any track
   available on TikTok or Instagram. A track not in `music_library` has its
   TikTok video and Instagram reel found first and is added to the library
   before the deck is handed off, because the Posting Agent attaches music
   only from the library. Flow F14 in `docs/CAROUSEL-GENERATOR-FLOWS.md`,
   including a live test of the lookup.
2. **The `carousel-command-center` source** is recovered and reference-only
   (§2.4); nothing further needed.
3. **Who runs the Phase 0 analysis worker?** The `media_enrich`,
   `visual_analyze` and `video_analyze` jobs in `content_pipeline_jobs` are
   processed by something that is not in n8n and not on Czed's Mac, and it
   was active on 2026-09-13. Most likely the `search-worker.mjs` from the
   developer handover, run by whoever wrote it. The Trends page depends on it
   staying up; if it stops, new sources queue but are never analysed.
4. **Move the hardcoded service keys** into n8n credentials and rotate them:
   the bridge workflow's code node, and also the Posting Agent and the Smart
   Scheduler (found 2026-09-14, §2.6). Move all of them before rotating.
5. **Czedrick's sign-in email** for `ALLOWED_EMAILS`. The Smart Scheduler
   emails its alerts to `czedrickjhake.cc@gmail.com`, the likely one; confirm
   before adding.

Added 2026-09-14 with the widened scope:

Decided by Garreth on 2026-09-14:

| # | Question | Decision |
|---|---|---|
| 11 | Build order | **Middle first, after Phase 1**, and only for lanes that are healthy, performing and frequently used (§9 Phase 2). |
| 12 | One table per type or shared | **One table per content type** (§4.8), for per-type pause, unpause and retirement. Shared-table and view-per-type alternatives noted there. |
| 13 | Design medium | **Claude Design**, with the Figma round trip kept open for iterations in a new file (§9 Phase 1). |
| 14 | AI image provider | **Higgsfield** (§4.7). |
| 15 | Studio fidelity | **Yes**: live HTML canvas for editing, rendered preview per slide for sign-off. |

| 16 | Does Covered Eye qualify for Phase 2? | **Yes** (Garreth, 2026-09-14). |

Nothing else is open before Phase 1 starts.

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
