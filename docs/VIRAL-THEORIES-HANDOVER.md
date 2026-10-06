# Viral Theories carousels: where new batches go

For whoever writes and renders the Viral Theories carousels (Character 6, "Leanne").
Updated 2026-10-06.

## The one rule

**Every Viral Theories carousel goes into the Supabase table `viral_theories_carousel`.**
Do not create a new table, and do not write to `leanne_transformation_carousel`.

The posting system (the Smart Scheduler, the Posting Agent, the phone To-do list,
the Inventory page and the production sheet) reads `viral_theories_carousel` and
nothing else. A carousel saved anywhere else is invisible: it is never approved,
never counted as stock and never posted.

On 2026-10-06 the 40 existing carousels (`LEA-B1-01`…`LEA-B1-10`,
`LEA-B2-01`…`LEA-B2-30`) were copied from `leanne_transformation_carousel` into
`viral_theories_carousel`. The old table is kept as a record only and is marked
retired in Supabase.

Supabase project: `qlcmgxgwpzmiebzxflai`.

## What to fill in for each carousel

| Column | What to put | Example |
|---|---|---|
| `carousel_id` | A new, unique ID. Continue the pattern | `LEA-B3-01` |
| `batch` | The batch name | `LEA-B3` |
| `character` | Always this exact text | `Character 6` |
| `pillar` | Always this exact text | `viral_theories` |
| `angle` | The theme: `weight_loss`, `anti_aging` or `both` | `weight_loss` |
| `hook_type` | The hook style | `contrarian` |
| `hook_text` | The full hook as it appears on slide 1 | |
| `slide_1` … `slide_6` | The text of each slide | |
| `slots` | The full copy as JSON (same shape the writer already produces) | |
| `caption` | **The caption with the hashtags at the end, in one field.** This is exactly what gets posted | `the fat that matters after 40 is not the kind you can pinch #womenover40 #visceralfat` |
| `music` | The song, as `Artist - Title` | `Massive Attack - Angel` |
| `source_images` | The base photos used, as JSON | |
| `slide_1_url` … `slide_6_url` | The public link to each finished slide image. **All six are required** | `…/leanne-carousel-images/renders/LEA-B3-01/slide_01.jpg` |
| `status` | `rendered` once the six images are uploaded | `rendered` |
| `rendered_at` | When the images were made | |

The image bucket `leanne-carousel-images` can stay as it is. Only the table changes.

## What to leave empty

Leave these alone. The system fills them in, and a wrong value here blocks the
carousel for good:

- `gatekeep_status`: **leave it empty. Never write `pending`.** The approval check only
  looks at carousels where this is empty, so a carousel marked `pending` is skipped
  forever. All 40 old carousels had this problem.
- `scheduler_ready`: switches itself on once a carousel is approved and has all six
  slides and a caption.
- `geelark_profile`, `platform`, `posting_date`, `posting_time`, `posting_status`,
  `geelark_task_id`, `scheduled_at`: set by the scheduler when it gives the carousel
  to an account.
- `quality_status`: leave empty.

## Moving from the old table

If your writer or renderer still targets `leanne_transformation_carousel`, change it
to `viral_theories_carousel` and map the columns like this:

| Old column (`leanne_transformation_carousel`) | New column (`viral_theories_carousel`) |
|---|---|
| `carousel_id` | `carousel_id` |
| `pillar` (weight_loss / anti_aging / both) | `angle` |
| (none) | `pillar` = `viral_theories` |
| `character` (`char6`) | `character` = `Character 6` |
| `hook_shape` | `hook_type` |
| `hook_text` | `hook_text` |
| `slide_1` … `slide_6` | `slide_1` … `slide_6` |
| `slide_1_url` … `slide_6_url` | `slide_1_url` … `slide_6_url` |
| `caption` + `hashtags` | `caption` (caption, a space, then the hashtags) |
| `slots`, `source_images`, `music`, `batch`, `status`, `rendered_at` | same names |
| `gatekeep_status` = `pending` | `gatekeep_status` **left empty** |

Old columns with no place in the new table (`topic`, `topic_key`, `audience`,
`hook_sub`, `reveal_slide`, `peptide_slide`, `humanizer_score`, `copy_status` and the
like) do not need to be carried over.

The two places known to write the old table:

- the n8n workflow **Leanne Transformation Carousel Writer** (currently switched off);
- the renderer in `garrethdev/content-render-scripts`,
  `renderers/leanne_transformation/render_leanne_transformation.py`, when run with
  `--supabase --upload`.

Both need pointing at `viral_theories_carousel` before the next batch.

## Copy rules (or the approval check rejects it)

- Never mention GLP-1, glp1 or #glp1 anywhere: slides, caption or hashtags.
- No drug, molecule or brand names.
- No placeholders such as `[brand]`. The approval check reads the text as written.

## After a batch is finished

1. Make sure every carousel has all six images and a final caption. **The approval
   check looks at each carousel only once.** Copy changed after it has run is never
   checked again.
2. Ask Garreth to run the approval check (the n8n **Pre-Publish Gate**) for the
   content type `viral_theories`. Carousels that pass become stock on their own.
3. Check the production sheet. Within an hour, **Have** on the Viral Theories row goes
   up by the number that passed.

## How many to make

At full speed (9 Character 6 accounts posting twice a day) the lane uses
**63 carousels a week**. The production sheet's "Need to produce" column shows how
many are still needed for the next two weeks.

## 3-Slide Journey works the same way

The other Character 6 lane, 3-Slide Journey, lives in `journey_3slide_carousel`. Same
rule: no new tables, three slide images (`slide_1_url` … `slide_3_url`) plus a caption,
`render_status` set to `rendered` once the images are uploaded, and `gatekeep_status`
left empty.
