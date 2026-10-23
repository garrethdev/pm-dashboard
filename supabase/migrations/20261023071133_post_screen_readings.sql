-- DA-08: the numbers read off each app's own analytics screen, one row per
-- reading of one post (docs/DEEP-ANALYTICS-TICKETS.md; Czedrick, 2026-10-09).
-- The screens are what DA-05 found on them (Yurie's screenshots, 2026-10-23):
-- TikTok videos, Instagram Reels and carousels, Facebook Reels. Photo posts
-- may add a column later.
--
-- A post can be read more than once (the robot reads every post from the
-- past week each Friday), so there is no unique key; the newest reading per
-- post is the one the dashboard shows.
--
-- EMPTY IS NOT 0. A number the screen did not show ("--", "not enough data",
-- "shown when this video reaches 100 views") stays null. 0 means the screen
-- said 0.
--
-- Written by the dashboard's screen reader (src/server/screen-readings.ts)
-- with the service key; nothing else writes it.
create table if not exists public.post_screen_readings (
  id                 bigserial    primary key,
  platform           text         not null check (platform in ('tiktok', 'instagram', 'facebook')),
  -- The account's username on that platform, as the performance tables name it.
  account            text         not null,
  post_url           text,
  post_id            text,
  -- 'video' | 'photo' | 'carousel'. Instagram Reels are 'video', as the ingest stores them.
  format             text,
  posted_at          timestamptz,
  caption_snippet    text,
  read_at            timestamptz  not null default now(),
  -- 'manual' = screenshots a person took; 'robot' = DA-06.
  read_by            text         not null default 'manual' check (read_by in ('manual', 'robot')),
  -- Paths in the post-screens storage bucket, in the order they were read.
  screenshots        text[],

  -- Counts on the screen.
  views              integer,
  -- Instagram splits a crossposted post's views by app.
  views_instagram    integer,
  views_facebook     integer,
  -- Different people who saw it ("Viewers" on Instagram and TikTok).
  viewers            integer,
  likes              integer,
  comments           integer,
  shares             integer,
  saves              integer,
  reposts            integer,
  new_followers      integer,
  profile_visits     integer,

  -- How long people watched (videos and Reels only).
  avg_watch_s        numeric,
  total_watch_s      numeric,
  -- TikTok "Watched full video".
  watched_full_pct   numeric,
  -- TikTok "On average, viewers watched N% of your video".
  retention_avg_pct  numeric,
  -- TikTok "Most viewers stopped watching at 0:01", in seconds.
  drop_off_s         numeric,
  -- Instagram's skip rate: % who swiped away in the first 3 seconds.
  skip_rate_pct      numeric,
  -- Points read off the retention graph, approximate: [{"s": 0, "pct": 100}, ...].
  retention_curve    jsonb,

  -- Who watched.
  followers_pct      numeric,
  -- TikTok only: % of viewers who had not seen the account before.
  new_viewers_pct    numeric,
  -- {"Reels tab": 71.9, "Explore": 18.2, ...}; null when the screen hid them.
  traffic_sources    jsonb,
  audience_age       jsonb,
  audience_country   jsonb,
  audience_gender    jsonb,
  -- Instagram "What impacts your views": {"skip": {"pct": 57, "vs_typical": "lower"}, ...}.
  rate_signals       jsonb,

  -- TikTok's "not eligible for recommendation in the For You feed" banner:
  -- true when it was on the screen, false when the Overview tab was read and
  -- it was not, null when that tab was not among the screenshots.
  fyp_restricted     boolean,

  -- What the reader could not read, in words.
  notes              text,
  model              text,
  input_tokens       integer,
  output_tokens      integer,
  cost_usd           numeric,
  -- The AI's full reply, for checking a wrong read against the screenshots.
  raw                jsonb
);

create index if not exists post_screen_readings_post_idx
  on public.post_screen_readings (platform, account, read_at desc);

alter table public.post_screen_readings enable row level security;
-- Named, because "revoke from public" leaves anon and authenticated granted.
revoke all on table public.post_screen_readings from public, anon, authenticated;
revoke all on sequence public.post_screen_readings_id_seq from public, anon, authenticated;

comment on table public.post_screen_readings is
  'DA-08: numbers read off each app''s own analytics screen, one row per '
  'reading of one post. Empty is not 0: null means the screen did not show '
  'it. Written by the dashboard''s screen reader with the service key.';
