# Story bank: where the Story Research Agent puts its stories

For a Claude session that will **make pictures from scenes in these stories**.
Written 2026-11-21. The numbers below were read from the live database that day.

## The short version

- Every story the agent finds goes into **one Supabase table: `story_bank`**.
- Supabase project: **`qlcmgxgwpzmiebzxflai`** (use the Supabase MCP tool
  `execute_sql` with this project id).
- **Only rows with `status = 'new'` are usable stories** (1,319 on 2026-11-21).
  `rejected` rows were judged not good enough; `pending` rows have not been
  judged yet.
- **Only read. Do not insert, update or delete anything** in these tables, and
  do not call the database functions listed under "Do not touch" below.
- The stories are real posts by real people (Reddit, TikTok, a few Instagram).
  Use them for the *situation*, never to picture the actual person. Do not put
  their usernames, faces or exact identifying details into a picture.

## Who the pictures are for

Everything is **Character 6** only (all other characters were retired
2026-11-16). She is a US woman in her 40s, ordinary, not a model. The stories
were collected because their moments fit her life: a husband who stopped
noticing her, a mother-in-law's comment at dinner, a dress that finally zips, an
ex who wants her back. A story about a 26-year-old still gives a usable scene;
the picture should show *her*, at her age.

## How the agent works (enough to read the data)

The n8n workflow **"Story Research Agent"** (`iW82SsE2IcVucaZY`) runs **every day
at 07:00 New York time**. It searches Reddit, TikTok and Instagram for
first-person stories, saves each new one to `story_bank`, and a cheap AI judge
scores it 0 to 10. A score of 6 or more becomes `status = 'new'`; the rest become
`rejected`. The judge also fills in the tag columns described below, so you can
search by setting, emotion and so on instead of reading thousands of posts.

A second workflow, **"Story Lane Fit"** (`ChyrbxyPvYOppSfQ`), runs hourly and
scores how well each story fits each of our carousel types. Those scores go in
`story_lane_fit`.

## `story_bank`: the columns you need

| Column | What it holds |
|---|---|
| `id` | The story's number. Use it to refer to a story. |
| `status` | `new` = kept and usable. Ignore `rejected` and `pending`. |
| `judge_score` | 6 to 10. Higher = stronger story. Most are 7 or 8. |
| `summary` | **Start here.** The judge's 1 to 3 sentence retelling, in plain words. Present on almost every `new` row. |
| `text` | The full original post or comment (can be 2,500+ characters). Read it when you need the scene's details. |
| `title` | The post's title (Reddit posts). |
| `detail` | **The one concrete moment** the judge picked out, e.g. "Seat belt buckling easily at go-kart center." The best single prompt seed for a picture. |
| `best_line` | A line copied word for word from the post, or empty. |
| `setting` | Where it happens (see list below). |
| `emotion` | How she feels (see list below). |
| `action` | What happens (see list below). |
| `who_hurt_her` | Who the other person is: `husband`, `ex-husband`, `mother-in-law`, `friend`, `stranger`, `coworker`, `family`, `mother`, `sister`, `doctor`, or `none`. |
| `theme` | Broad topic: `husband_stopped_seeing`, `family_weight_comments`, `weight_loss_backlash`, `long_marriage_ends`, `divorce_glowup`, `husband_threatened`, `menopause_marriage`, `ex_sees_her_again`, `other`. |
| `story_format` | How the original was told (e.g. `scene_in_dialogue`, `message_reveal`, `paired_contrast`). Useful if you want the picture to match a carousel style. |
| `kind` | `post` (a whole post) or `comment` (a story someone told in the comments). |
| `platform`, `source_url`, `community` | Where it came from. `community` is the subreddit. |
| `media_type`, `slide_text`, `slide_images` | Only for TikTok photo carousels (about 40 kept ones): the text read off each slide and the original slide image links. Those images belong to other creators: look, don't reuse. |
| `reaction_summary`, `reaction_hot_moments`, `reaction_me_too` | What commenters said about the story, for stories with 20+ comments that have been read. `reaction_hot_moments` shows which moment people reacted to most: often the best scene to picture. |
| `created_at` | When the agent found it. |

### Tag values (with counts of `new` stories)

- **`setting`**: `home` 463, `phone_texts` 110, `shopping_fitting_room` 83,
  `work` 82, `bedroom` 77, `holiday_gathering` 74, `restaurant` 43,
  `dinner_table` 42, `car` 40, `vacation` 37, `doctor_office` 33,
  `wedding_or_party` 19, `court_or_lawyer` 16, `gym` 15, `kids_school_event` 7,
  `church` 1, `other` 33, empty 144.
- **`emotion`**: `relief` 189, `betrayal` 146, `quiet_satisfaction` 133,
  `humiliation` 115, `anger` 109, `invisibility` 100, `pride` 95, `defiance` 87,
  `shame` 69, `grief` 54, `envy` 19, `dread` 18, `loneliness` 11, empty 174.
- **`action`**: `she_changed` 295, `dismissed` 186, `body_comment` 182,
  `confrontation` 83, `she_left` 77, `compared` 54, `confession` 52,
  `ignored` 51, `sabotaged` 51, `cheated_or_left` 48, `caught_out` 41,
  `excluded` 34, `ex_reacts` 20, `message_received` 16, empty 129.

Stories found before 2026-11-13 (the agent's first version) have no `summary`
and no tags; read their `text`.

## Finding stories that suit a scene

Pick the strongest stories with a clear, visual moment:

```sql
select id, judge_score, setting, emotion, action, who_hurt_her,
       detail, summary
from story_bank
where status = 'new'
  and setting = 'restaurant'          -- or any setting above
  and detail is not null
order by judge_score desc, id desc
limit 20;
```

Then read one story in full:

```sql
select id, title, text, best_line, summary, detail,
       reaction_summary, reaction_hot_moments
from story_bank
where id = 10936;
```

Ask for the columns you need, not `select *`: `text`, `slide_images` and the
reaction arrays are long.

### Stories matched to a carousel type

If the pictures are for a particular kind of carousel, use the fit scores (0 to
10; 7 or more is a good match):

```sql
select b.id, f.fit, f.reason, b.detail, b.summary
from story_lane_fit f
join story_bank b on b.id = f.story_id
where f.lane = 'camera_roll_story'
  and f.fit >= 7
  and b.status = 'new'
order by f.fit desc, b.judge_score desc
limit 20;
```

The carousel types (`lane`) and how many stories fit each at 7+:

| `lane` | Name | Fits at 7+ | What it is about |
|---|---|---|---|
| `camera_roll_story` | Camera Roll Story | 337 | One small everyday body moment: hiding from a camera, a seat belt, a dress that zips, a chair, a stranger's comment. The most picture-friendly lane. |
| `journey_3slide` | 3-Slide Journey | 236 | One bold line about her weight; slides 2 and 3 are before and after photos. |
| `comparison_carousel` | Comparison | 198 | Someone close watches or compares her body or eating. |
| `viral_theories` | Viral Theories | 165 | A quiet moment where how she sees her body clashes with what she is told. |
| `divorce_recovery` | Divorce Recovery | 150 | She rebuilds after divorce while the ex still wants something. |
| `jealousy_carousel` | Jealousy | 95 | As she changed, someone close turned jealous or cutting. |

Each lane's full brief is in `story_lanes.brief`.

### Stories already turned into carousels

When a writer uses a story, it is recorded in `story_uses` with the carousel's
ID in `deck_ref` (e.g. `DRC-0229`). Use this if the pictures must match a deck
that already exists:

```sql
select u.lane, u.deck_ref, u.used_at, b.id, b.detail, b.summary
from story_uses u
join story_bank b on b.id = u.story_id
where u.status = 'used'
order by u.used_at desc;
```

Only `status = 'used'` rows are real; `released` means the writer reserved the
story and then gave it back.

## Other tables, for reference only

- `story_reactions`: the individual comments read under a story (`story_id`,
  `text`, `likes`). No usernames are stored.
- `hook_library`: opening lines drafted from stories (`story_id`, `hook`,
  `status`). Not needed for pictures.

## Do not touch

- **Do not call `next_story`, `record_story_use`, `release_story_use` or
  `finish_story_run`.** These are how the carousel writers reserve a story.
  Calling `next_story` takes a story away from the writers until it is released.
- Do not change `status` on `story_bank` rows or write to `story_lane_fit`,
  `story_uses` or `story_lanes`.
- The tables are readable only with the service key (the database's admin key).
  The Supabase MCP tool has that access; the public "anon" key will see nothing.
  Do not try to work around that.

## Where existing Character 6 pictures live

Not part of the story bank, but useful for matching the look:

- Supabase Storage bucket **`rich-life-images`**, folder **`character-6/`**:
  `before-basis/` (her "before" photos) and `carousel-basis/2026-09-20/` (200
  "after" photos). Catalogue table: `carousel_images`.
- The dashboard's **Generate images** (Carousel Generator library page) makes
  pictures through the Higgsfield account connected on Settings.
- **Do not overwrite or upload into `character-6/`** without Garreth saying so:
  carousels already link to those exact files.

Ask Garreth where new pictures should be saved before saving any.
