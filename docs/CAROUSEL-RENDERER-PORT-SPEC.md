# Carousel renderer port specification

**Companion to `CAROUSEL-GENERATOR-PLAN.md`.** Written 2026-09-14 from the two
Python renderers Garreth's team sent as `covered_eye.zip` and `glowup.zip`
(byte-identical to `renderers/covered_eye/` and `renderers/glowup/` in
`garrethdev/content-render-scripts`), read against the live database. Line
numbers refer to the zip copies. Nothing here is built.

Path shorthand: `$CE` = the covered_eye folder, `$GU` = the glowup folder.

---

## 0. Headline findings

1. **Three generations of the Glow Up renderer exist and all three still have
   live rows in `glowup_decks`.** 53 decks (2026-07-09) from `render_glowup.py`;
   38 decks (2026-07-16 to 07-19) from `make_glowup_decks.py`; 102 decks
   (2026-07-31 to 08-01) from `paint_manifest.py` driven by a Director-built
   `manifest_v2`. **Port `paint_manifest.py`.**
2. **The Glow Up port would race the Mac painter on the exact value the plan
   first said to write.** `paint_manifest.py:136` selects `render_status =
   'ready'`. The plan now materialises with `'queued'` and claims rows
   atomically (§C.3).
3. **Covered Eye is fenced already, by luck.** `covered_eye_carousel.py:384`
   requires `approved = true`, and the generator never sets that.
4. **A live data problem found on the way:** the 2026-08-13 Covered Eye run
   used `--mark-rendered` without `--upload`, so `slide_N_url` on CE-181 to
   CE-240 points at **raw, un-captioned bank images**. 59 of those 60 rows
   are `posting_status = 'Posted'` (§C.6).
5. **Nothing is scheduled.** No cron, launchd, plist or schedule reference
   anywhere. Hand-run from the terminal.

---

## A. Run environment, from the code

### A.1 Covered Eye (`covered_eye_carousel.py`)

- **Imports:** Pillow (`Image, ImageDraw, ImageFont, ImageFilter, ImageOps`),
  `requests`; stdlib otherwise.
- **System fonts, both macOS-only:** `/System/Library/Fonts/SFNS.ttf` (variable
  SF Pro, "Bold" instance, `:72-73`, `:109-115`) and
  `/System/Library/Fonts/Apple Color Emoji.ttc` at 160 px (`:128`, `:134-149`).
- **Local paths:** secrets from `~/.config/peptide-secrets/.env` (`:79`,
  `:349-360`, real env wins `:359`); output to `os.getcwd()/out/<carousel_id>/`
  as `slide_01.jpg` to `slide_06.jpg` plus `filmstrip.jpg` (`:544`, `:557`,
  `:571`, `:577`).
- **Env vars:** `CAROUSEL_SUPABASE_PROJECT` (optional) and
  `CAROUSEL_SUPABASE_SECRET_KEY` (required, service role) (`:365-371`).
- **Supabase:** reads `covered_eye_carousel` (`carousel_id, hook_text,
  hook_type, caption, slide_1..6, slide_1_url..6_url`, `:381-395`); writes
  `slide_N_url` (`:460-471`), `rendered_at`, `status` (`:398-407`); reads
  `covered_eye_image_bank` (`pool, public_url, is_cover` where
  `status='active'`, `:410-424`); uploads to bucket `covered-eye-images` at
  `renders/<carousel_id>/slide_NN.jpg` with `x-upsert` (`:475-502`). No RPCs.
- **External APIs:** none in the renderer. The sibling bank scripts call
  fal.ai `gpt-image-2` / `gpt-image-2/edit` via `fal_client` (`FAL_KEY`), all
  writing under `~/Claude/jessicas-aesthetic/`.
- **Trigger:** argv only (`:595-628`): `--supabase [--render-set X] [--batch X]
  [--carousel CE-002] [--all] [--mark-rendered] [--upload]
  [--include-unapproved]`, a local `spec.json` mode, and `--one`.

### A.2 Glow Up (`paint_manifest.py`, `make_glowup_decks.py`, `render_glowup.py`)

- **Imports:** Pillow only; all HTTP via stdlib `urllib.request`. `grade.py`
  shells out to `ffmpeg` (asset prep, not the render path).
- **System font:** `/System/Library/Fonts/Supplemental/Arial Bold.ttf` in all
  three. No emoji font; emoji would render as tofu.
- **Local paths:** `~/Claude/glowup-render/out2/<deck_key>/slide<n>.png`
  (`paint_manifest.py:21,147,151`); `~/Claude/peptide-renderers` is a git clone
  pulled at the start of every run (`:23`, `:128-131`); `.venv/` beside the
  scripts (`render_glowup.py:5`).
- **Env vars:** `CAROUSEL_SUPABASE_SECRET_KEY` only; project ref hardcoded.
- **Supabase:** reads `glowup_decks` (`deck_key, render_manifest`,
  `paint_manifest.py:137`); writes `slide_1_url..slide_7_url` and
  `render_status` (`:158-159`); `make_glowup_decks.py` also reads
  `glowup_image_bank` (`:100`) and `music_library` (`:116`) and writes
  `suggested_sound`, `after_line` (`:162`); source bucket `glowup-image-bank`
  (public); output bucket `glowup-renders/<deck_key>/slide<n>.png`, PNG,
  `x-upsert`, three attempts (`:104-107`, `:152-157`).
- **External APIs:** none. The music pick is a local heuristic over
  `music_library`, **not** the n8n Music Recommender.
- **Trigger:** hand-run. `paint_manifest.py` takes raw PostgREST filter strings
  as argv and appends `&render_status=eq.ready` unless overridden
  (`:133-137`). `make_glowup_decks.py` defaults to `render_status IS NULL OR
  'pending'` (`:141-145`). `render_glowup.py` takes no arguments.

### A.3 Who runs it (evidence from the zips)

The compiled bytecode in `covered_eye/__pycache__/covered_eye_carousel.cpython-314.pyc`
embeds `/Users/garrethdottin/Claude/peptide-renderers/renderers/covered_eye/covered_eye_carousel.py`.
Python 3.14. Script mtimes cluster Jul 9 to Aug 1 2026; newest rendered
output in `out/` is CE-240 at 2026-08-14 02:22. Both renderers run **by hand
on Garreth's Mac**, from Claude Code sessions in `~/Claude/`. Two
`render_status = 'ready'` Glow Up rows have sat unpainted since 2026-08-01,
which a scheduled painter would have picked up.

---

## B. Layout contracts

### B.1 Covered Eye

**Canvas** 1080 × 1920 (`:74`). **Fit:** EXIF transpose, RGB, `ImageOps.fit`
LANCZOS centred (`:118-121`) = CSS `object-fit: cover; object-position: center`.

**Caption box** (W=1080, H=1920):

| Quantity | Formula | Slides 1 to 4, 6 (scale 1.0) | Slide 5 (scale 0.9) |
|---|---|---|---|
| font size | `max(12, int(H*0.038*scale))` (`:98`, `:201`) | 72 px | 65 px |
| wrap width | `W - 2*int(W*0.06)` (`:203-204`) | 952 px | 952 px |
| line height | `int(font*1.12)` (`:207`) | 80 px | 72 px |
| stroke width | `max(2, int(font*0.10))` (`:206`) | 7 px | 6 px |
| block top, "top" | `int(H*0.055)` (`:214-215`) | 105 px | — |
| block top, "bottom" | `H - int(H*0.055) - block_h` (`:216-217`) | — | 1815 − block_h |
| shadow offset | `int(H*0.003)` (`:224`) | 5 px x and y | 5 px |
| shadow blur | `max(1, int(H*0.010))` (`:240`) | 19 px Gaussian | 19 px |
| shadow colour | `(0,0,0,170)` (`:231`) | | |
| emoji height | `int(font*1.0)` (`:210`) | 72 px | 65 px |

**Per-slide overrides** (`:507-508`): slide 5 is `"bottom"` at scale 0.9 so the
product screenshot's quiz and logo stay visible; all others `"top"` at 1.0.

**Draw order** (`:221-262`): (1) empty RGBA layer; (2) every line's text and
emoji silhouettes at `(x+5, y+5)` in black alpha 170; (3) Gaussian blur 19,
composite over the photo; (4) crisp pass: white fill, black stroke, emoji
bitmaps.

**Line layout:** `y = y0 + i*line_h`; `x = (W - line_width)/2` where line
width sums text runs plus `emoji.width + 6` per emoji (`:165-174`,
`:227-228`). Emoji pasted at `x+3`, `y + int((line_h - emoji_h)*0.3)` (`:261`).

**Wrapping:** greedy on whitespace, no hyphenation, **no auto-fit**
(`:177-193`). `text.split()` collapses all whitespace, including newlines. An
over-wide word overflows.

**Emoji:** each grapheme drawn at 160 px into 240×240, cropped, scaled to
`emoji_h` by height (`:124-149`). U+FE0F stripped (`:158`). ZWJ sequences
break into components (pre-existing limitation).

**Quotes:** slide 1 only, curly quotes, only when `hook_type` is `Jealous
Friend` (`:280-281`, `:511`, `:516`, `:525`). Live: 33 of 240 rows.

**Image selection** (`assign_images`, `:427-457`): PRNG seeded with the
`carousel_id` string (`:551`). Pools (`:88-95`): slide 1 `slide1_selfie`
cover-only; slides 2, 3, 4 `food` in one distinct-group; slide 5 `product`;
slide 6 `body`. Cover-only filters `is_cover = true`, silently falling back to
the whole pool (`:443-445`). Distinct-group excludes URLs already used in the
group, allowing a repeat if that empties the set (`:446-449`). A slot whose
`slide_N_url` is already set is never touched (`:441`). Live bank: selfie 20
(10 covers), food 29, product **1**, body 5.

**Writes back** (`:580-591`): with `--upload`, `slide_N_url` = the captioned
render URL, `rendered_at = now()`, `status = 'rendered'`. With
`--mark-rendered` only, `slide_N_url` = **the raw bank URL it picked**. **The
port must always do the upload equivalent.**

**Idempotency:** selects `approved = true` and `rendered_at IS NULL`
(`:375-395`); `gatekeep_status` is never read or written.

**Bug to fix, not port:** `row_to_slides` skips slots with no image
(`:519-521`) and the caller re-numbers from 1 (`:561`), so a missing slide 3
puts slide 4's render in `slide_03.jpg` and `slide_3_url`. Key everything off
the original slide number.

### B.2 Glow Up (port `paint_manifest.py` + `deck_rules.json`)

**Canvas** 1080 × 1440 (`:22`, `deck_rules.json:4`).

**Collage grid** `quad()` (`:91-95`): background `RGB(12,10,9)`; four cells
exactly 540 × 720, cover-fit, at TL, TR, BL, BR in manifest order; **zero
gap**, no border, no rounding. `single()` (`:98-99`) is cover-fit to the full
canvas.

**Caption** `cap()` (`:69-79`): Arial Bold at the manifest size; wrap width
`W*0.86` = 928.8 px; greedy whitespace wrap, no auto-fit; line height
`size*1.2`; **`yc` is the vertical centre of the block**: `y = H*yc -
(size*1.2)*lines/2`; each line centred; shadow is a **hard offset copy** in
black at `(x+2, y+3)` (`:76`), then white fill with 3 px black stroke (`:77`).

**Datestamp** `datestamp()` (`:82-88`): Arial Bold 60 px; string split on
`\n`; each part right-aligned at `x = 1080 - width - 46`, `y = 40 + i*66`;
same shadow and stroke.

**Per-slide layout** `paint_slide()` (`:110-123`):

| `layout` | Rendering |
|---|---|
| `quad` | `cap(quad(cells), text, font)` centred at y=720 |
| `quiz` | `cap(cap(single(cells[0]), text, font, 0.13), cta, cta_font or 40, 0.9)`: question centred at y=187, CTA at y=1296 |
| `single` | `cap(single(cells[0]), text, font)` |

**The manifest the port emits** (verified against all 102 live `manifest_v2` decks):

| n | layout | font | cells | extra |
|---|---|---|---|---|
| 1 | quad | 56 | 4 | |
| 2 | single | 48 | 1 | |
| 3 | quad | 50 | 4 | |
| 4 | quad | 48 | 4 | |
| 5 | quiz | 44 | 1 | `cta` = `comment the word QUIZ and I will send you the link`; no `cta_font` (default 40) |
| 6 | quad | 50 | 4 | |
| 7 | single | 42 | 1 | `datestamp` |

Top-level keys: `deck_key`, `hook`, `canvas`, `slides`, `model: "manifest_v2"`.

**The datestamp is per batch, not fixed.** Live values: `July\n2026` (60),
`Oct\n2025` (13), `Aug\n2026` (9), `Nov\n2025` (6), `June\n2026` (6),
`May\n2026` (5), `Sep\n2025` (3). Take it from the draft.

**Fixed copy is per batch too.** `glowmax-reframe-2026-07-31-A` used the
rules file's `before_line` / `after_line` on all 50 rows;
`glowmax-ydiw-2026-07-31-A` used AI-written lines on all 50.

**Image selection** (rebuild in the route handler from `make_glowup_decks.py`):

| n | pools (`deck_rules.json:6-12`) |
|---|---|
| 1 | `cover` × 4, distinct (`random.sample`) |
| 2 | `cover` |
| 3 | body `feature:face` + evidence `evidence:water` |
| 4 | body `feature:stomach`, `feature:waist`, `body:abs` + evidence `evidence:protein`, `evidence:eggs`, `evidence:greens`, `evidence:meal_prep` |
| 5 | `quiz` |
| 6 | body `feature:waist`, `body:abs`, `body:gym` + evidence `evidence:steps`, `evidence:measure` |
| 7 | `after`, `body:gym` |

Live active counts: cover 19, after 4, quiz 1, feature:face 8,
feature:stomach **1**, feature:waist 2, body:abs 5, body:gym 7, evidence:water
7, evidence:protein 2, evidence:eggs 2, evidence:greens 2, evidence:meal_prep 2,
evidence:steps 3, evidence:measure **1**. Pool-exhausted branches are live paths.

**2+2 diagonal rule** (`make_glowup_decks.py:118-131`): two evidence cells via
`matched_pair(evidence, key=category)`, two body cells via
`matched_pair(body)`; ordered `[b0, e0, e1, b1]` or `[e0, b0, b1, e1]` with
probability 0.5, so each matching pair sits on a diagonal, never a top row
over a bottom row.

**`matched_pair` brightness matching** (`:77-92`): fewer than 2 candidates
duplicates the one you have; pick a random anchor; keep candidates within
luminance tolerance 40; if none, take the nearest anyway; with a key, prefer a
different category among in-tolerance candidates. Brightness is the hard
rule, category variety the tiebreak.

**Luminance source:** read `glowup_image_bank.luminance` (numeric, populated
on 69 of 69 active rows, range 6.1 to 178.6). The old script measured it by
downloading each image; the rules file says use the stored column. Ignore
`brightness` (text) and `pair_group` (null everywhere).

**Seeding:** Python's string-seeded Mersenne Twister is not reproducible in
JavaScript and does not need to be. Stability comes from **persisting the
manifest** on the row, as `ARCHITECTURE.md` intends. Any deterministic PRNG
seeded from `deck_key` is fine.

**Writes back** (`paint_manifest.py:158-159`): `slide_1_url..slide_7_url` =
`.../glowup-renders/<deck_key>/slide<i>.png`, `render_status = 'rendered'`.
Does not write `rendered_at`, which no Python script writes, so the in-app
painter can own that column.

**Bug to fix, not port:** the URL range is hardcoded to slides 1..7
(`range(1, 8)`) regardless of slide count (`:158`; corrected 2026-09-14, this
line first said 1..8). Write only the slides painted.

### B.3 Where the three Glow Up generations disagree

| Aspect | `render_glowup.py` | `make_glowup_decks.py` | `paint_manifest.py` |
|---|---|---|---|
| Slide count | 8 | 7 | manifest-driven, 7 live |
| Layout decided by | manifest `type` | the renderer | the Director's manifest |
| Fonts | by type: 56 / 46 / 50 | 56/48/50/48/44+40/50/42 | manifest, identical to middle |
| Quiz slide | one image, no CTA | text at 0.13 + CTA at 0.9 | same, driven by `cta` |
| Datestamp | none | hardcoded July 2026 | manifest, varies |
| Slide-3 evidence | | `water, facetool`, excluding `lemonwater_bw` | rules: `evidence:water` only |
| Luminance | | measured by download | stored column |
| Writes `slide_N_url` | no | yes | yes |
| Selector | `ready` | `NULL or pending` | `ready` |
| QUIZ CTA wording | | `comment "QUIZ" and I'll send you the link` | `comment the word QUIZ and I will send you the link` |

Port the rules-file wording; it is what the live rows carry.

### B.4 Which generation the live rows came from

| Cohort | Rows | Manifest shape | Verdict |
|---|---|---|---|
| 2026-07-09 | 53 | 8 slides, `{n, type, images}`, relative paths | built by `render_glowup.py`, re-painted by `make_glowup_decks.py` |
| 2026-07-16 to 07-19 | 38 | none | `make_glowup_decks.py` |
| 2026-07-31 to 08-01 | 102 (100 rendered, 2 still `ready`) | 7 slides, `manifest_v2`, absolute URLs | `paint_manifest.py` + n8n Director |

`ARCHITECTURE.md` (dated 2026-07-31) and `deck_rules.json` (versioned
2026-07-31) both match the newest cohort field for field.

---

## C. Risks in the port

### C.1 Fonts

| Python font | Lane | Problem | Bundle instead |
|---|---|---|---|
| SF Pro (variable, "Bold") | Covered Eye | macOS-only, variable, Apple-licensed | **Inter Bold** (static); expect wrap points to move |
| Apple Color Emoji | Covered Eye | macOS-only bitmap font | **Noto Color Emoji** or per-grapheme SVG; visibly different, needs sign-off |
| Arial Bold | Glow Up | macOS-only, not redistributable | **Liberation Sans Bold**, metric-compatible; wrap points survive |

Metric drift is the real risk: both painters wrap by measured width with no
auto-fit, so a font with different advances changes line count, block height
and (for Glow Up, which centres on `yc`) block position. Gate the Covered Eye
port with a side-by-side against ten already-rendered decks from `out/`.

### C.2 macOS dependencies

The three fonts; `git pull` at run start (moot once the code is in the app);
`~/.config/peptide-secrets/.env` (Vercel env vars); `ffmpeg` (only `grade.py`,
not needed); local output folders (render in memory, stream to storage).

### C.3 The race with the Mac painters, and the exact guard

**Glow Up.** `paint_manifest.py` and `render_glowup.py` select `render_status
= 'ready'`; `make_glowup_decks.py` selects `NULL` or `'pending'`. So:

1. **Materialise with `render_status = 'queued'`.** No Python script selects
   that value.
2. **Claim each row atomically before painting:**
   ```
   PATCH /rest/v1/glowup_decks?deck_key=eq.<key>&render_status=eq.queued
   Prefer: return=representation
   { "render_status": "rendering" }
   ```
   An empty array means someone else has it; skip. After a successful upload:
   `PATCH ...?deck_key=eq.<key>&render_status=eq.rendering` with the URLs,
   `render_status = 'rendered'`, `rendered_at = now()`.
3. **Sweeper:** rows stuck in `rendering` for more than about ten minutes go
   back to `queued`.

**Covered Eye.** The Mac renderer filters `approved = true`, which the
generator never sets, so app rows are invisible to it unless someone passes
`--include-unapproved`. Do not rely on that alone; it has no status filter.
Claim with:
```
PATCH /rest/v1/covered_eye_carousel?carousel_id=eq.<id>&rendered_at=is.null&status=eq.scripted
Prefer: return=representation
{ "status": "rendering" }
```
`rendered_at` stays null until uploads succeed, so a failure leaves the row
re-renderable.

### C.4 Satori and sharp versus Pillow

| Pillow feature in use | Status | What to do |
|---|---|---|
| Text stroke (7 px Covered Eye, 3 px Glow Up) | **Satori has no text stroke** | Emit the caption as hand-written SVG `<text>` with `stroke`, `stroke-linejoin="round"`, `paint-order="stroke fill"`; rasterise with sharp; composite. Wrap with a metrics library (`opentype.js`) so the greedy algorithm ports line for line. |
| 19 px Gaussian shadow layer | Satori has no `filter` | Render the black text layer separately, `sharp().blur(19)` (sigma matches Pillow's radius), composite, then the crisp pass. |
| Emoji | Satori needs a per-grapheme asset callback | Bundle Noto Color Emoji or inline `<image>` in the SVG at Pillow's advance. Glow Up needs none. |
| Variable fonts | Satori needs static faces | Bundle static Bold. |
| `ImageOps.fit` LANCZOS | sharp `fit: 'cover', position: 'centre'` is the direct equivalent | Call `.rotate()` with no argument for EXIF. |
| Colour management | Pillow ignores ICC; sharp honours it | `.toColourspace('srgb')` and strip profiles, or colours drift from the archive. |
| Per-process image cache | serverless shares no memory | Cache bank images per request; bound concurrency (a Glow Up deck fetches up to 22 cells). |

**Recommendation:** Satori earns little for these two lanes. Both captions are
one centred, stroked, wrapped text block over a photo. A metrics-based wrapper
plus a generated SVG layer plus sharp composition matches Pillow far more
closely, and the missing stroke support is disqualifying. Keep Satori where it
already works (`render-carousel.js`, the retired Rich Life lane).

### C.5 Serverless budget

One request per deck. Glow Up: 22 fetches, 7 composites at 1080×1440. Covered
Eye: 6 fetches, 6 composites at 1080×1920 with a full-canvas RGBA blur. Both
fit a 1024 MB function; wall time is bank fetches. Build upload retries in
from day one; the Python code retries three times because "storage is flaky".

### C.6 CE-181 to CE-240 point at un-captioned images

| `slide_1_url` points at | Rows | `rendered_at` | Posted |
|---|---|---|---|
| `covered-eye-images/renders/...` (captioned) | 128 | 2026-07-12 to 07-30 | 98 |
| `covered-eye-images/<pool>/...` (**raw bank source**) | 60 | 2026-08-13 | **59** |
| null | 52 | | 0 |

The bank images carry no baked-in text by design, so 59 posted carousels in
that cohort most likely went out without their captions. This is inferred
from the URL shape and needs one spot-check of a posted TikTok. The captioned
renders for all 135 decks in `out/` are now on Czed's Mac (from the zip), so
the 60 rows could be repointed by uploading those files. The port's rule
either way: **always upload the captioned render and point `slide_N_url` at
it.**

---

## D. Bugs not to port, in one place

- Covered Eye slot re-numbering when a slide has no image (`:519-521`, `:561`).
- Covered Eye `--mark-rendered` writing raw bank URLs (`:588-591`).
- Glow Up URL range hardcoded to 1..7 (`paint_manifest.py:158`).
- Glow Up QUIZ CTA wording drift between `make_glowup_decks.py:17` and the
  rules file.
- Glow Up datestamp hardcoded in `make_glowup_decks.py:157`.
