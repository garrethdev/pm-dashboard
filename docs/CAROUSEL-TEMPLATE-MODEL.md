# Carousel template model

**Status:** a Phase 1 deliverable of `CAROUSEL-GENERATOR-PLAN.md` (§9, "the
template model, written down"). Written 2026-09-14. Nothing reads these files
yet. The Phase 2 painter and the Phase 3 studio are both built to this
contract, so a change here is a change to both.

| File | What it is |
|---|---|
| `docs/carousel-templates/glowup.v1.json` | Glow Up, imported from `paint_manifest.py` and `deck_rules.json` |
| `docs/carousel-templates/covered-eye.v1.json` | Covered Eye, imported from `covered_eye_carousel.py` |
| `scripts/carousel-templates/verify.mjs` | Re-derives every layout number from the Python formulas and the live manifests, and fails if a template drifts. Run `node scripts/carousel-templates/verify.mjs`. |

---

## 1. What a template is

One JSON document describes everything needed to paint a content type and to
turn an approved deck into a lane row. One painter reads any template and
knows nothing about lanes. The Glow Up "one brain, one painter" split is kept:
the template is the brain's rulebook, the manifest persisted on each deck is
the brain's decision, the painter paints the manifest literally.

| Key | Holds |
|---|---|
| `schema`, `slug`, `version`, `status` | Identity. `schema` is `pm.carousel-template/1`. One file per version. |
| `name`, `character`, `content_type` | `character` uses the registry spelling (`Character 2`). `content_type` is null until the type is saved. |
| `canvas` | Width, height, and the background colour behind cells (Glow Up's collage ground). |
| `output` | File format, JPEG quality, bucket and path pattern. |
| `fit` | How an image fills a cell: cover, centred, the resampling filter, whether EXIF rotation is applied. |
| `text_origin` | Always `ascender` for the imported templates. See §2, rule 1. |
| `fonts` | Named font files, each recording the macOS font it stands in for. |
| `text_styles` | Named styles: fill, stroke, shadow, line height, wrap, alignment, emoji handling. |
| `image_sources` | Where images come from (today, the two bank tables). |
| `slides[]` | `n`, a `layout` label, `cells[]` as pixel rectangles, an `images` rule, and `text[]` boxes. A text box names a `role`, a `style`, a `size` and an `anchor`, and may override any field of its style. |
| `image_rules` | What each `images.rule` means, in words the painter's author implements. |
| `copy_contract[]` | Every role the writer fills: which lane columns it lands in, who writes it (`ai`, `fixed`, `per_batch`), and a length limit. |
| `not_painted` | Columns that exist on the lane table and are deliberately not drawn. |
| `directions` | Copy, caption and image directions. Null in the imports; Phase 2 copies them in from the existing prompts. |
| `music` | The column and the exact matching rule the Posting Agent applies. |
| `lane` | How an approved deck becomes a row: id format, values set on materialise, the atomic claim, what rendering writes back, the sweeper. Null for a studio-made type until it is wired. |
| `provenance` | What it was imported from and checked against, or the reference it was recreated from. |

**Length limits come from what has already posted.** Each `max_chars` is the
longest line of that role already painted and published, recorded next to its
p50 and p95 as `observed` (live query, 2026-09-14). The writer is held to what
is known to fit, not to a new guess.

---

## 2. Rules every painter follows

1. **Text is positioned by the top of its ascender, not its baseline.** Both
   Python painters call Pillow's `text()` with its default anchor, which puts
   the top of the font's ascender at `y`. SVG `<text y>` is the baseline, so
   the port adds the font's ascender at that size (`ascender / unitsPerEm ×
   size`). Getting this wrong moves every caption by roughly 0.9 of a line.
2. **Wrap is greedy on whitespace, measured in pixels, with no hyphenation
   and no auto-fit.** All whitespace, newlines included, collapses. A word
   wider than the wrap width overflows. The only exception is the Glow Up
   datestamp, which splits on `\n` and does not wrap.
3. **Shadow first, then the crisp text.** A `hard` shadow is a plain copy of
   the text in the shadow colour at `(dx, dy)`, with no stroke. A `soft`
   shadow is drawn on its own transparent layer at `(dx, dy)` and opacity,
   blurred by `blur` (Pillow's Gaussian radius), composited, and then the
   crisp pass is drawn: white fill with the stroke.
4. **Horizontal placement.** Centred lines sit at `(canvas width − measured
   line width) / 2`. The datestamp's lines sit at `canvas width − line width −
   right`.
5. **Vertical anchors.** Let `L` be the line height in pixels and `k` the
   number of wrapped lines.
   - `block_centre_y` (Glow Up): first line top = `canvas height × at − L × k / 2`.
   - `top` (Covered Eye): first line top = `y`.
   - `bottom` (Covered Eye slide 5): first line top = `canvas height − margin − L × k`.
   - `stack_right` (Glow Up datestamp): line `i` top = `top + i × L`.
6. **Line height** is `ratio × size` unrounded (Glow Up) or a whole number of
   pixels already truncated (Covered Eye). The template stores whichever the
   source used.
7. **Cells** are filled cover-style and centre-cropped, with zero gap and no
   rounding.
8. **Everything is keyed off the original slide number.** A slide without an
   image is an error shown on the card, never a silent renumber (the Covered
   Eye bug in port spec §B.1).
9. **Image picks are persisted before painting**, so a repaint gives the same
   deck.
10. **Materialise writes exactly `lane.set_on_materialise`.** The generator
    never writes `approved = true`, `gatekeep_status = 'approved'` or
    `scheduler_ready = true`.

---

## 3. Checked against the port spec and the source

The script checks every row below. The Python source was read from the two
zips rather than only from the port spec.

### 3.1 Glow Up

| Quantity | Port spec §B.2 | Template | Source |
|---|---|---|---|
| Canvas | 1080 × 1440 | same | `paint_manifest.py:22` |
| Collage ground | RGB(12,10,9) | `#0C0A09` | `:92` |
| Quad cells | 540 × 720, TL TR BL BR, no gap | same | `:93` |
| Wrap width | W × 0.86 = 928.8 | 928.8 | `:73` |
| Line height | size × 1.2 | ratio 1.2 | `:73` |
| Block position | centre at H × yc | `block_centre_y` | `:73` |
| Shadow | hard copy at (+2, +3) | hard, 2/3, no stroke | `:76` |
| Stroke | 3 px black | same | `:77` |
| Slide fonts | 56 48 50 48 44 50 42 | same | all 102 live `manifest_v2` decks |
| Quiz slide | text at 0.13, CTA 40 px at 0.9 | same | `:118` |
| Datestamp | 60 px, right 46, top 40, step 66 | same | `:83-85` |
| Pools per slide | §B.2 table | same | `deck_rules.json` |
| Diagonal rule, tolerance 40 | §B.2 | same | `deck_rules.json`, `make_glowup_decks.py` |
| Fixed copy | QUIZ CTA wording of the rules file | same, plus the fixed before and after lines | `deck_rules.json` `fixed_copy` |

### 3.2 Covered Eye

| Quantity | Port spec §B.1 | Template | Formula checked |
|---|---|---|---|
| Canvas | 1080 × 1920 | same | `DEFAULT_CANVAS` |
| Font size | 72, slide 5 65 | same | `max(12, int(H × 0.038 × scale))` |
| Line height | 80, slide 5 72 | same | `int(size × 1.12)` |
| Stroke | 7, slide 5 6 | same | `max(2, int(size × 0.10))` |
| Wrap width | 952 | same | `W − 2 × int(W × 0.06)` |
| Top / bottom margin | 105 | `top y 105` / `bottom margin 105` | `int(H × 0.055)` |
| Shadow | 5 px offset, 19 blur, alpha 170 | same | `int(H × 0.003)`, `max(1, int(H × 0.010))` |
| Emoji | height = size, +6 advance, +3 x, 0.3 y | same | `line_width`, `draw_caption` |
| Quotes | slide 1, `Jealous Friend` only | same | `QUOTED_HOOK_TYPES` |
| Pools | selfie (covers), food ×3 distinct, product, body | same | `SLIDE_POOLS` |
| Output | JPEG 92, `renders/<id>/slide_NN.jpg` | same | `JPEG_QUALITY`, `upload_render` |

---

## 4. What reading the source and the live rows found

These are facts from 2026-09-14, not proposals.

1. **Glow Up slide 7 has always shown the fixed closing line.** On all 102
   `manifest_v2` decks the painted slide 7 is the rules file's `after_line`.
   In batch `glowmax-ydiw-2026-07-31-A` (50 decks) and the 2 unbatched decks,
   the `after_line` column holds a different, AI-written line that was never
   drawn. The column is wrong on 52 rows; the posts are not.
2. **Glow Up slide 2 did vary by batch.** `glowmax-reframe` painted the fixed
   `before_line` on all 50; `glowmax-ydiw` painted AI-written lines. So
   `before_line` is `per_batch` in the template. `after_line` is `fixed`
   (Garreth, 2026-09-14), matching every posted deck.
3. **`transition_line` is never painted.** It is filled on all 102 decks and
   appears on no slide.
4. **Glow Up's `slide_1` to `slide_6` text columns are empty** on all 102
   decks. The painted copy lives in the named columns (`hook`, `tip_face` and
   so on). Plan §5.2 listed `slide_1..6` among the columns to write; the
   template writes the named columns only.
5. **Glow Up ids are `GU-<n>`**, highest `GU-153`, with 40 older rows on other
   formats. Plan §5.2 guessed `GLW-<batch>-<n>`; that is corrected. Covered
   Eye ids are `CE-<n>`, highest `CE-240`, all conforming.
6. **Batch names do not follow `{type}-{YYYY-MM-DD}-{letter}` strictly.** Live
   examples: `glowmax-reframe-2026-07-31-A`, `covered-eye-selflove-q-2026-08-13`.
   The generator can adopt the convention going forward without breaking
   anything, because nothing parses the name.
7. **Covered Eye `hook_text` equals `slide_1` on only 85 of 240 rows.**
8. **Port spec correction:** Glow Up's URL write-back is `range(1, 8)`, which
   is slides 1 to 7, not 1 to 8. It is still hardcoded regardless of slide
   count, so the "write only the slides painted" rule stands.
9. **Two resampling filters.** Glow Up resizes with Pillow's default
   (bicubic) and crops with integer division; Covered Eye uses Lanczos with
   EXIF rotation. Both recorded in `fit`.
10. **Glow Up wrap bug, not to port:** its wrapper starts from an empty line,
    so a first word wider than the wrap width produces a blank first line and
    shifts the block. It needs a word of about thirty characters at these
    sizes.
11. **Thin pools make repeats visible:** one active image each in Glow Up
    `quiz`, `feature:stomach` and `evidence:measure`, and in Covered Eye
    `product`. Every deck repeats those cells. The Library and AI images
    (Phase 4) are the fix; the templates record the rule, not the shortage.
12. **Music must match the library exactly.** The Posting Agent's Stage Rows
    node skips a carousel whose `music` is not an active `music_library` track
    written `artist - title` (lower-cased, spaces collapsed). A generated
    music suggestion that is not in the library is a deck that never posts.
    Of 76 active tracks, 50 have a real Instagram reel link; 15 hold a TikTok
    link where the Instagram link belongs, and 11 have no links at all.
13. **A TikTok caption does not tell you the sound.** A live lookup found a
    video captioned "Karma - Summer Walker" whose sound was "original sound -
    kvdysjams". Only the post's own sound data can confirm a track.

---

## 5. Decisions before Phase 2

**Decided by Garreth, 2026-09-14:**

1. **Glow Up closing line: always fixed**, as on every posted deck. The
   template marks `after_line` as `fixed`, the check script tests it, and the
   column will hold what was painted.
2. **Covered Eye slide 1 is the hook**, so `hook_text` is always written with
   slide 1's text.
3. **Music: the writer chooses any track available on TikTok or Instagram.**
   A track not in `music_library` has its TikTok video and Instagram reel found
   first, confirmed from each post's own sound data (findings 12 and 13), and
   is added to the library before the deck is handed off. The flow is F14 in
   `CAROUSEL-GENERATOR-FLOWS.md`. The Instagram lookup was tested end to end;
   the TikTok lookup has so far only been seen rejecting a re-upload.

**Still proposed:**

4. **Glow Up `transition_line`.** Stop writing it, since nothing draws it.

---

## 6. How a template becomes a row (Phase 2)

Plan §5.4 gives `carousel_templates` three jsonb columns. The mapping:

| Column | Template keys |
|---|---|
| `canvas` | `canvas`, `output`, `fit`, `text_origin`, `fonts`, `text_styles` |
| `slides` | `slides`, `image_sources`, `image_rules` |
| `copy_contract` | `copy_contract`, `not_painted`, `music` |
| `copy_direction`, `caption_direction`, `image_direction` | `directions` |
| `source_reference_id` | `provenance.source_reference_id` |
| `generation_metadata` | the rest of `provenance` |

`lane` has no home in §5.4. **Proposed:** add a nullable `lane jsonb` column,
so a studio-made type's template is complete before it is wired and becomes
wired by filling one column.
