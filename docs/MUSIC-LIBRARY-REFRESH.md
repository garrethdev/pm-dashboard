# Weekly music list refresh

Garreth, 2026-11-18. Branch `garrethdev/Music-intergration-tokchart`.

## Why

Every post's song comes from `music_library`. Nothing was added to it between
2026-09-10 and this change, so posts were getting songs that had stopped
trending. The first fix, the TokChart picker (`docs/MUSIC-PICKER-PLAN.md`),
was shelved because TokChart's API costs about $148 a month. This refresh keeps
the list current using ScrapeCreators, which we already pay for, and free
public lists.

Decisions (Garreth, 2026-11-18):
- Old songs are never removed. A song that stops growing only loses its
  trending mark.
- The refresh runs weekly.

## What it does

Every Tuesday at 12:00 UTC (`vercel.json` → `/api/music-library/refresh`,
code in `src/server/music-trends.ts`):

1. **Reads the trend lists.**
   - Metricool's weekly "Trending TikTok Songs This Week" top 10, which is free
     and links each song's TikTok sound.
   - A fan-kept Spotify playlist, "trending tiktok songs … (updated weekly)",
     with about 160 songs. Reading it costs 1 credit per 50 songs.
   - Spotify's own Viral 50 charts can't be read, and TikTok took down its own
     song chart in September 2026.
2. **Measures each song on TikTok.**
   - Finds the song's TikTok sound once, with 1 ScrapeCreators search.
   - Reads how many videos use the sound, at 1 credit.
   - A week later the difference gives *new videos a day*, which is what
     TokChart would have sold us.
3. **Decides whether it's trending.** A song is trending when it gains at least
   1,000 new videos a day. On a song's first check there's no growth figure
   yet, so being in Metricool's top 10 that week counts instead. A Spotify-only
   song is added the following week, once it shows growth.
4. **Adds the trending songs.**
   - The AI checks that each one could sit under a Character 6 post. It turns
     down meme sounds, sound effects, game music, children's songs, and songs
     mainly about drugs or violence.
   - It also writes the same notes the list already carries: vibe, mood tags,
     tempo, genre and era. When it doesn't know a song, it guesses and the
     song's notes say so.
   - New songs fit every lane (`pillar_fit = universal`) and start at zero uses.
5. **Marks library songs.** Library songs are measured too. They gain or lose
   `is_trending` the same way.

## Which songs get picked

- **Carousel Generator writer** (`chooseTrack`): it already preferred the
  least-used songs, and now it picks among trending songs first.
- **Older n8n music selectors**: they don't know about the trending mark. New
  songs start at zero uses, so the selectors that favour least-used songs reach
  them first. Selectors that match on mood see them alongside everything else.
- **Yurie's To-do list**: no change. It shows whatever song the post carries.

## Cost

- **Credits per run:** stops at `credit_cap` (250).
- **How long a song is measured:** a song from a list is measured for 3 weeks
  after it first appears. After that it is only measured again if it shows up
  in Metricool's top 10. The Spotify playlist keeps old hits for months, so
  this stops them being measured forever.
- **Library songs:** measured every week while trending, otherwise every 4
  weeks.
- **Expected cost:** about 120 to 150 credits a week, so 500 to 600 a month.
  The AI review costs a few cents.

## The pieces

| Piece | What it is |
|---|---|
| `music_library` new columns | `is_trending`, `trending_since`, `tiktok_clip_id`, `tiktok_videos`, `tiktok_videos_per_day`, `trend_checked_at`, `added_by` |
| `music_trend_watch` | Every song the refresh knows: from a list (`watching`), in the library (`in_library`), or turned down by the AI (`rejected`, with the reason) |
| `music_trend_settings` | One row: Spotify playlists, Metricool on/off, 1,000 videos a day, credit cap, 21-day watch window, 28-day library recheck |
| `music_trend_runs` | One row per run with its full report |
| `/api/music-library/refresh` | The route. Needs CRON_SECRET. `?dry=1` does every lookup and writes nothing |

Migration: `supabase/migrations/20261118120000_music_trend_refresh.sql`.

## Checking on it

```sql
-- Last runs
select started_at, listed, measured, added, rejected, now_trending, credits, stopped_early, note
from music_trend_runs order by started_at desc limit 5;

-- What is trending now
select artist || ' - ' || title as song, tiktok_videos, tiktok_videos_per_day, trending_since, added_by
from music_library where is_trending order by tiktok_videos_per_day desc nulls last;
```

## If a list breaks

- **Metricool changes its page:** the run's `note` says "no songs in the
  expected place". The Spotify playlist still feeds the run.
- **The fan playlist stops updating:** swap its id in
  `music_trend_settings.spotify_playlists`. Several ids can be listed.
