-- Weekly music list refresh (Garreth, 2026-11-18): TokChart is too expensive,
-- so music_library keeps up with TikTok trends by itself. A weekly job reads
-- free trend lists (Metricool's weekly top 10, a fan-kept Spotify playlist),
-- measures each song's TikTok video count with ScrapeCreators, and adds the
-- songs that are growing. Old songs are never removed: a song that stops
-- growing only loses its trending mark (Garreth, 2026-11-18).
-- Code: src/server/music-trends.ts. Plan: docs/MUSIC-LIBRARY-REFRESH.md.

alter table public.music_library
  add column if not exists is_trending boolean not null default false,
  add column if not exists trending_since date,
  add column if not exists tiktok_clip_id text,
  add column if not exists tiktok_videos bigint,
  add column if not exists tiktok_videos_per_day integer,
  add column if not exists trend_checked_at timestamptz,
  add column if not exists added_by text;

comment on column public.music_library.is_trending is
  'Growing on TikTok as of the last weekly check (music trend refresh). Pickers prefer these.';
comment on column public.music_library.tiktok_videos_per_day is
  'New TikTok videos a day using the song, between the last two weekly checks.';

-- One row per song the refresh knows about: songs seen on a trend list, and
-- every song already in the library (so their trend can be measured too).
create table public.music_trend_watch (
  id uuid primary key default gen_random_uuid(),
  song_key text not null unique,
  artist text not null,
  title text not null,
  sources text[] not null default '{}',
  first_listed date,
  last_listed date,
  tiktok_clip_id text,
  tiktok_title text,
  clip_searched_at timestamptz,
  videos bigint,
  checked_at timestamptz,
  prev_videos bigint,
  prev_checked_at timestamptz,
  videos_per_day integer,
  status text not null default 'watching'
    check (status in ('watching', 'in_library', 'rejected')),
  reason text,
  library_id uuid references public.music_library(id) on delete set null,
  created_at timestamptz not null default now()
);
comment on table public.music_trend_watch is
  'Songs the weekly music refresh watches: from trend lists, plus the library. status in_library = added (or already there).';

create table public.music_trend_settings (
  id integer primary key default 1 check (id = 1),
  spotify_playlists text[] not null default '{62ig8eE5yc8KzMAwmGtQ1d}',
  use_metricool boolean not null default true,
  min_videos_per_day integer not null default 1000,
  credit_cap integer not null default 250,
  listed_window_days integer not null default 21,
  library_recheck_days integer not null default 28,
  updated_at timestamptz not null default now()
);
insert into public.music_trend_settings (id) values (1);
comment on table public.music_trend_settings is
  'Switches for the weekly music refresh. spotify_playlists: fan-kept "trending TikTok songs" playlists (Spotify''s own charts cannot be read).';

create table public.music_trend_runs (
  id bigserial primary key,
  started_at timestamptz not null,
  finished_at timestamptz,
  dry boolean not null default false,
  listed integer not null default 0,
  measured integer not null default 0,
  added integer not null default 0,
  rejected integer not null default 0,
  now_trending integer not null default 0,
  credits integer not null default 0,
  stopped_early boolean not null default false,
  note text,
  report jsonb
);

-- Library songs get their watch rows from the refresh itself (one song-key
-- rule, in src/server/music-trends-rules.ts).

alter table public.music_trend_watch enable row level security;
alter table public.music_trend_settings enable row level security;
alter table public.music_trend_runs enable row level security;
revoke all on public.music_trend_watch, public.music_trend_settings, public.music_trend_runs from anon, authenticated;
revoke all on sequence public.music_trend_runs_id_seq from anon, authenticated;
