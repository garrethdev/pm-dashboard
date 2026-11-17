# Trending Song Picker (TokChart)

Garreth, 2026-11-17. Branch `garrethdev/Music-intergration-tokchart`.

## What it is for

Each Character 6 post carries a song name ("Artist - Title"). Yurie's To-do
list shows it with a copy button and she picks that sound in the app. Until
now the song was chosen when a batch was written, from a music library that
has not grown since 2026-09-10.

The picker gives each upcoming post a song that passes **two tests**:

1. **Viral.** The song is on today's US TikTok chart, used by a lot of new
   videos a day, and still growing (not fading).
2. **Fits the story.** An AI reads the post's slides and caption and picks the
   song whose mood and themes match it.

Nothing on Yurie's side changes. The To-do list reads the post's `music`
column live (through the `unified_posts` view), so writing that column is the
whole hookup. Geelark is out of scope.

Decisions (Garreth, 2026-11-17): all Character 6 lanes at once, no trial lane;
pick at hand-out time, overwriting the batch song; the old music selectors
stay (they give each post its starting song, which is the backup); build now,
subscribe to TokChart afterwards.

## How it runs

One n8n workflow, **[Music] Trending Song Picker** (`w0O0tg8cToEeemcu`), with
two timers. All rules live in Supabase so they are in git; the workflow only
fetches, asks the AI and hands the answers to the database.

```
00:30 ET  Chart pull    today's US chart → trending_songs; new songs described once → song_notes
01:00 ET  Planner       (Smart Scheduler, unchanged) plans the next 3 days
01:05 ET  Song picker   each upcoming post: AI ranks up to 3 fitting songs → music_pick_apply
01:15 ET  Hand-out      (Posting Agent, unchanged) posts reach the To-do list with the new song
09:50 ET  Song picker   again, for posts planned by a daytime re-run, before the 10:00 hand-out
```

### The database (migrations `20261117120000_music_picker.sql`, `20261117123000_music_picker_test_days.sql`, `20261117130000_music_picker_test_isolation.sql`)

| Piece | What it does |
|---|---|
| `music_picker_settings` | One row of switches: `dry_run`, `chart_source` (`sample` / `tokchart`), country, characters, thresholds, `test_days` |
| `music_picker_lanes` | Which lanes are served and which columns hold each lane's story. A new lane is one row |
| `trending_songs` | The chart, one row per sound per day, with TokChart's numbers |
| `song_notes` | Each song's mood, themes and what it suits, written once by the AI |
| `music_picks` | Every decision with its reason: applied, would_apply (dry run), kept, skipped |
| `music_pick_candidates()` | Posts that need a song: Character 6, active unpaused account posted by a person, enabled lane, dated today to +3 days, ready, not on the To-do list, not looked at in 20 hours |
| `music_pick_pool()` | Today's qualifying songs: released (not an "original sound"), at least `min_videos_per_day` new videos a day, not slowing down, described. Empty if the newest chart is over 2 days old |
| `music_pick_apply()` | Takes the AI's ranked choices and applies the first that passes every rule (see below). Live: writes `music`. Dry run: only logs |

### The rules `music_pick_apply` enforces

- The song must be on today's pool.
- The account must not have had it within `repeat_days` (7) of that posting day.
- No song on more than `max_uses_per_day` (3) posts for the same posting day.
- A post already on the To-do list, or no longer ready, is never touched,
  checked again at the moment of writing.
- No choice passes, or the AI failed: the post keeps its song.
- Facebook posts that mirror an Instagram twin read the same row, so they
  follow the twin's new song with no extra step.

### AI

OpenRouter, `qwen/qwen3.8-flash` with `deepseek/deepseek-v4.1-flash` as the
fallback, reasoning off. About 15–55 posts a planning night plus a handful of
new songs a day: a few cents a night.

## Status

- **Built, dry run, sample chart (2026-11-17).** The sample chart is real
  songs with made-up numbers, saved with `is_sample = true`. The picker logs
  what it would pick in `music_picks` and changes no post.
- **Tested 2026-11-17** on 48 real Character 6 posts from the last 3 days
  (`test_days = 3`, dry run): 45 picks, 3 kept, under 3 minutes, every rule
  held, no post changed. The test picks stay in `music_picks` with
  `test_run = true` and do not count against real picks. `test_days` is back
  to 0.
- The workflow is **not switched on** yet (it runs only when started by hand).

## When the TokChart subscription is active

1. In n8n, create a credential **TokChart API** (Bearer token) and attach it
   to the node **Fetch TokChart chart**.
2. Check the first live reply matches what `Shape chart rows` expects (an
   `items` list with `sound_id`, `matched_song`, `ugc_videos_per_day`,
   `ugc_videos_acceleration`, `tokchart_score`). The shape comes from their
   docs; confirm it on the real thing.
3. `update music_picker_settings set chart_source = 'tokchart', test_days = 0;`
4. Switch the workflow on. Leave `dry_run` on for a day or two and read
   `music_picks` together.
5. `update music_picker_settings set dry_run = false;` Yurie starts seeing
   trending songs.

## Reading the log

```sql
select picked_at, content_type, platform, posting_date, outcome, old_song, new_song, reason
from music_picks order by picked_at desc limit 50;
```

## Not built / later

- Whether trending songs earn more views: the `music_picks` log plus post
  analytics can answer it once there are a few weeks of live picks.
- Instagram's own trending list: the TokChart API has none (the website does).
- A dashboard screen for the log or the switches.
