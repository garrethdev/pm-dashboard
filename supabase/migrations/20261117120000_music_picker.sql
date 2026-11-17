-- Music picker (TokChart): give each upcoming Character 6 post a song that is
-- trending on TikTok AND fits the post's story, before the post reaches the
-- To-do list. Garreth, 2026-11-17. Plan: docs/MUSIC-PICKER-PLAN.md.
--
-- The n8n workflow "[Music] Trending Song Picker" does the fetching and the AI
-- calls. Every rule (which posts, which songs qualify, no repeats, the daily
-- cap, never touching a post already on the To-do list, dry run) lives here,
-- so the rules are in git and the workflow stays thin.
--
-- Starts in dry run with a sample chart: nothing on any post changes until
-- music_picker_settings.dry_run is set to false.
--
-- Service-role only like the rest: RLS on, no policies, public roles revoked.

-- ---------------------------------------------------------------- settings
create table public.music_picker_settings (
  id smallint primary key default 1 check (id = 1),
  -- true: picks are logged as 'would_apply' and no post is changed.
  dry_run boolean not null default true,
  -- 'sample' until the TokChart subscription; then 'tokchart'.
  chart_source text not null default 'sample' check (chart_source in ('sample', 'tokchart')),
  country text not null default 'US',
  characters text[] not null default array['Character 6'],
  -- a song qualifies when at least this many new TikTok videos use it a day
  min_videos_per_day integer not null default 1000,
  -- how many of the day's qualifying songs the AI chooses from
  candidate_limit integer not null default 40,
  -- an account does not get the same song twice within this many days
  repeat_days integer not null default 7,
  -- no song goes on more than this many posts for the same posting day
  max_uses_per_day integer not null default 3,
  -- how far ahead posts are picked for (the planner plans 3 days)
  days_ahead integer not null default 3,
  updated_at timestamptz not null default now()
);
insert into public.music_picker_settings (id) values (1);

-- ---------------------------------------------------------------- lane map
-- Which lanes the picker serves, and which columns hold each lane's story.
-- A new lane is one row here, not a workflow change.
create table public.music_picker_lanes (
  content_type text primary key,
  story_columns text[] not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.music_picker_lanes (content_type, story_columns) values
  ('jealousy_carousel',   array['hook_text','slide_1','slide_2','slide_3','slide_4','slide_5','slide_6','caption']),
  ('journey_3slide',      array['hook_type','hook_text','caption']),
  ('divorce_recovery',    array['hook_text','his_text','slide_1','slide_2','slide_3','slide_4','slide_5','slide_6','slide_7','slide_8','slide_9','caption']),
  ('comparison_carousel', array['topic','hook_text','slide_1','slide_2','slide_3','slide_4','slide_5','slide_6','slide_7','slide_8','open_question','answer','caption']),
  ('viral_theories',      array['angle','hook_text','slide_1','slide_2','slide_3','slide_4','slide_5','slide_6','caption']);

-- ---------------------------------------------------------------- song key
-- The same matching the Posting Agent and the To-do list use: lower-cased,
-- spaces collapsed.
create function public.music_song_key(s text) returns text
language sql immutable
set search_path = public
as $$ select nullif(lower(regexp_replace(trim(coalesce(s, '')), '\s+', ' ', 'g')), '') $$;

-- ---------------------------------------------------------------- the chart
-- One row per sound per chart day, as TokChart reported it.
create table public.trending_songs (
  id bigint generated always as identity primary key,
  chart_date date not null,
  country text not null,
  sound_id text not null,
  chart_index integer,
  -- "Artist - Title", the label a post carries. Null for an original sound.
  song text,
  song_key text generated always as (public.music_song_key(song)) stored,
  title text,
  artists text[],
  content_type text,
  -- a released song (TikTok matched it to a real track), not someone's original sound
  is_released_song boolean not null default false,
  tokchart_score integer,
  ugc_videos_total bigint,
  ugc_videos_per_day integer,
  ugc_videos_acceleration integer,
  genres text[],
  tiktok_url text,
  spotify_url text,
  -- true for the stand-in chart used before the subscription
  is_sample boolean not null default false,
  raw jsonb,
  fetched_at timestamptz not null default now(),
  unique (chart_date, country, sound_id)
);
create index trending_songs_day on public.trending_songs (country, is_sample, chart_date desc);

-- What a song feels like and is about, written once per song by the AI.
create table public.song_notes (
  song_key text primary key,
  song text not null,
  mood text,
  themes text[],
  story_fit text,
  model text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- the log
-- Every decision the picker makes, applied or not, with its reason.
create table public.music_picks (
  id bigint generated always as identity primary key,
  picked_at timestamptz not null default now(),
  -- applied: written onto the post. would_apply: dry run, nothing changed.
  -- kept: the post keeps its song. skipped: the post was not touched.
  outcome text not null check (outcome in ('applied', 'would_apply', 'kept', 'skipped')),
  dry_run boolean not null,
  test_run boolean not null default false,
  content_type text not null,
  source_table text not null,
  content_id text not null,
  geelark_profile text,
  platform text,
  posting_date date,
  old_song text,
  new_song text,
  reason text,
  chart_date date,
  song_stats jsonb,
  choices jsonb,
  model text
);
create index music_picks_profile on public.music_picks (geelark_profile, posting_date);
create index music_picks_post on public.music_picks (source_table, content_id, picked_at desc);
create index music_picks_song_day on public.music_picks (posting_date, new_song);

alter table public.music_picker_settings enable row level security;
alter table public.music_picker_lanes enable row level security;
alter table public.trending_songs enable row level security;
alter table public.song_notes enable row level security;
alter table public.music_picks enable row level security;
revoke all on public.music_picker_settings, public.music_picker_lanes, public.trending_songs,
  public.song_notes, public.music_picks from anon, authenticated;

-- ---------------------------------------------------------------- the pool
-- Today's songs that pass the virality test and have their notes written:
-- released songs, used by at least min_videos_per_day new videos a day, and
-- not slowing down. Empty when the newest chart is more than 2 days old, so
-- a broken chart pull means posts keep their songs instead of stale picks.
create function public.music_pick_pool()
returns table (
  song text, song_key text, chart_date date, chart_index integer, tokchart_score integer,
  ugc_videos_per_day integer, ugc_videos_acceleration integer, ugc_videos_total bigint,
  genres text[], mood text, themes text[], story_fit text
)
language sql stable
set search_path = public
as $$
  with s as (select * from music_picker_settings where id = 1),
  d as (
    select max(t.chart_date) as cd
    from trending_songs t, s
    where t.country = s.country and t.is_sample = (s.chart_source = 'sample')
  ),
  best as (
    select distinct on (t.song_key) t.*
    from trending_songs t, s, d
    where t.chart_date = d.cd
      and d.cd >= (now() at time zone 'America/New_York')::date - 2
      and t.country = s.country
      and t.is_sample = (s.chart_source = 'sample')
      and t.is_released_song
      and t.song_key is not null
      and coalesce(t.ugc_videos_per_day, 0) >= s.min_videos_per_day
      and coalesce(t.ugc_videos_acceleration, 0) >= 0
    order by t.song_key, t.tokchart_score desc nulls last, t.ugc_videos_per_day desc nulls last
  )
  select b.song, b.song_key, b.chart_date, b.chart_index, b.tokchart_score,
         b.ugc_videos_per_day, b.ugc_videos_acceleration, b.ugc_videos_total,
         b.genres, n.mood, n.themes, n.story_fit
  from best b
  join song_notes n on n.song_key = b.song_key
  order by b.tokchart_score desc nulls last, b.ugc_videos_per_day desc nulls last
  limit (select candidate_limit from s)
$$;

-- Released songs on the newest chart that have no notes yet.
create function public.music_pick_songs_to_describe()
returns table (song text, song_key text, genres text[])
language sql stable
set search_path = public
as $$
  with s as (select * from music_picker_settings where id = 1),
  d as (
    select max(t.chart_date) as cd
    from trending_songs t, s
    where t.country = s.country and t.is_sample = (s.chart_source = 'sample')
  )
  select distinct on (t.song_key) t.song, t.song_key, t.genres
  from trending_songs t, s, d
  where t.chart_date = d.cd
    and t.country = s.country
    and t.is_sample = (s.chart_source = 'sample')
    and t.is_released_song
    and t.song_key is not null
    and not exists (select 1 from song_notes n where n.song_key = t.song_key)
  order by t.song_key
  limit 80
$$;

-- ---------------------------------------------------------------- recent songs
-- Songs an account has, or will have, within repeat_days of a posting day:
-- what its posts carry, plus dry-run picks (so a dry run spreads songs the
-- way a live run would).
create function public.music_pick_recent_songs(p_profile text, p_day date, p_exclude_content_id text)
returns text[]
language sql stable
set search_path = public
as $$
  with s as (select * from music_picker_settings where id = 1)
  select coalesce(array_agg(distinct k) filter (where k is not null), '{}')
  from (
    select music_song_key(up.music_label) as k
    from unified_posts up, s
    where up.geelark_profile = p_profile
      and up.content_id is distinct from p_exclude_content_id
      and (up.posting_date)::date between p_day - s.repeat_days and p_day + s.repeat_days
    union all
    select music_song_key(mp.new_song)
    from music_picks mp, s
    where mp.geelark_profile = p_profile
      and mp.outcome in ('applied', 'would_apply')
      and mp.content_id is distinct from p_exclude_content_id
      and mp.posting_date between p_day - s.repeat_days and p_day + s.repeat_days
  ) x
$$;

-- ---------------------------------------------------------------- candidates
-- Upcoming posts that need a song: Character 6 (per settings), on an active,
-- unpaused account posted by a person, in an enabled lane, dated today to
-- today + days_ahead (New York), status ready, not yet on the To-do list and
-- not looked at in the last 20 hours.
--
-- p_test_days > 0 is for dry-run testing only: it also takes posts from the
-- last p_test_days days whatever their status or To-do state. A test run can
-- never change a post (music_pick_apply refuses a test outside dry run).
create function public.music_pick_candidates(p_test_days integer default 0)
returns table (
  content_type text, source_table text, content_id text, geelark_profile text, platform text,
  posting_date date, posting_time text, current_song text, story text, handed_out boolean,
  recent_songs text[]
)
language plpgsql stable
set search_path = public
as $$
declare
  s music_picker_settings;
  l record;
  today date := (now() at time zone 'America/New_York')::date;
  test boolean := coalesce(p_test_days, 0) > 0;
begin
  select * into s from music_picker_settings where id = 1;
  if test and not s.dry_run then
    raise exception 'test runs are only allowed in dry run';
  end if;

  for l in
    select ml.content_type, ml.story_columns, r.source_table, r.source_id_column
    from music_picker_lanes ml
    join content_type_registry r on r.content_type = ml.content_type
    where ml.enabled and r.active and r.needs_music and not r.has_baked_audio
  loop
    return query execute format($q$
      select x.* , music_pick_recent_songs(x.geelark_profile, x.posting_date, x.content_id)
      from (
        select %L::text, %L::text, t.%I::text, t.geelark_profile, t.platform,
               (t.posting_date at time zone 'UTC')::date, t.posting_time::text, t.music,
               (select string_agg(to_jsonb(t) ->> u.k, E'\n' order by u.o)
                  from unnest(%L::text[]) with ordinality as u(k, o)
                 where coalesce(to_jsonb(t) ->> u.k, '') <> ''),
               exists (select 1 from post_deliveries d
                        where d.source_table = %L and d.source_id = t.%I::text)
        from %I t
        join accounts a on a.geelark_profile = t.geelark_profile
        where a.is_active and not a.posting_paused and a.delivery_mode = 'manual'
          and a.character = any(%L::text[])
          and (t.posting_date at time zone 'UTC')::date between %L::date and %L::date
          and (%L::boolean or lower(coalesce(t.posting_status, '')) = 'ready')
      ) x(content_type, source_table, content_id, geelark_profile, platform,
          posting_date, posting_time, current_song, story, handed_out)
      where (%L::boolean or not x.handed_out)
        and (%L::boolean or not exists (
              select 1 from music_picks mp
               where mp.source_table = x.source_table and mp.content_id = x.content_id
                 and mp.picked_at > now() - interval '20 hours'))
      order by x.posting_date, x.posting_time
    $q$,
      l.content_type, l.source_table, l.source_id_column, l.story_columns,
      l.source_table, l.source_id_column, l.source_table, s.characters,
      case when test then today - p_test_days else today end, today + s.days_ahead,
      test, test, test);
  end loop;
end;
$$;

-- ---------------------------------------------------------------- apply
-- Takes the AI's ranked choices for one post and applies the first that
-- passes every rule: on today's pool, not used by this account within
-- repeat_days, under max_uses_per_day for that posting day. Live: writes the
-- song onto the post (only if it is still ready and not on the To-do list).
-- Dry run: logs what it would do. No passing choice: the post keeps its song.
-- Always writes one music_picks row and returns it.
create function public.music_pick_apply(
  p_content_type text,
  p_content_id text,
  p_choices jsonb,
  p_model text default null,
  p_no_fit_reason text default null,
  p_test boolean default false
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  s music_picker_settings;
  lane record;
  post record;
  handed boolean;
  recent text[];
  ch jsonb;
  k text;
  p record;
  uses integer;
  n_updated integer;
  rejected text[] := '{}';
  v_outcome text;
  v_reason text;
  v_new text;
  v_stats jsonb;
  v_chart date;
  rec music_picks;
begin
  select * into s from music_picker_settings where id = 1;
  if p_test and not s.dry_run then
    raise exception 'test runs are only allowed in dry run';
  end if;

  select ml.content_type, r.source_table, r.source_id_column into lane
  from music_picker_lanes ml
  join content_type_registry r on r.content_type = ml.content_type
  where ml.content_type = p_content_type and ml.enabled;
  if not found then
    raise exception 'music picker: % is not an enabled lane', p_content_type;
  end if;

  execute format(
    'select t.geelark_profile, t.platform, (t.posting_date at time zone ''UTC'')::date as posting_date,
            t.music, t.posting_status from %I t where t.%I::text = $1',
    lane.source_table, lane.source_id_column)
  into post using p_content_id;
  if post is null then
    raise exception 'music picker: no % row %', lane.source_table, p_content_id;
  end if;

  handed := exists (select 1 from post_deliveries d
                     where d.source_table = lane.source_table and d.source_id = p_content_id);

  if not p_test and (handed or lower(coalesce(post.posting_status, '')) <> 'ready') then
    v_outcome := 'skipped';
    v_reason := case when handed then 'already on the To-do list' else 'post is no longer ready' end;
  else
    recent := music_pick_recent_songs(post.geelark_profile, post.posting_date, p_content_id);
    for ch in select value from jsonb_array_elements(coalesce(p_choices, '[]'::jsonb)) loop
      k := music_song_key(ch ->> 'song');
      select * into p from music_pick_pool() pp where pp.song_key = k;
      if not found then
        rejected := rejected || format('%s: not on today''s chart', ch ->> 'song');
        continue;
      end if;
      if k = music_song_key(post.music) then
        v_outcome := 'kept';
        v_reason := 'already carries this trending song';
        v_chart := p.chart_date;
        exit;
      end if;
      if k = any(recent) then
        rejected := rejected || format('%s: this account had it within %s days', p.song, s.repeat_days);
        continue;
      end if;
      select count(*) into uses from music_picks mp
       where mp.posting_date = post.posting_date
         and mp.outcome in ('applied', 'would_apply')
         and music_song_key(mp.new_song) = k
         and mp.test_run = p_test;
      if uses >= s.max_uses_per_day then
        rejected := rejected || format('%s: already on %s posts that day', p.song, uses);
        continue;
      end if;

      v_new := p.song;
      v_chart := p.chart_date;
      v_reason := ch ->> 'reason';
      v_stats := jsonb_build_object(
        'chart_index', p.chart_index, 'tokchart_score', p.tokchart_score,
        'videos_per_day', p.ugc_videos_per_day, 'acceleration', p.ugc_videos_acceleration,
        'videos_total', p.ugc_videos_total, 'genres', p.genres);
      if s.dry_run then
        v_outcome := 'would_apply';
      else
        execute format(
          'update %I t set music = $1 where t.%I::text = $2 and lower(coalesce(t.posting_status, '''')) = ''ready''
              and not exists (select 1 from post_deliveries d where d.source_table = %L and d.source_id = $2)',
          lane.source_table, lane.source_id_column, lane.source_table)
        using v_new, p_content_id;
        -- EXECUTE does not set FOUND; ROW_COUNT says whether the row was still eligible.
        get diagnostics n_updated = row_count;
        if n_updated > 0 then
          v_outcome := 'applied';
        else
          v_outcome := 'skipped';
          v_reason := 'reached the To-do list while the song was being picked';
          v_new := null;
        end if;
      end if;
      exit;
    end loop;

    if v_outcome is null then
      v_outcome := 'kept';
      v_reason := coalesce(p_no_fit_reason, 'no song on today''s chart fit the story');
    end if;
    if array_length(rejected, 1) > 0 then
      v_reason := coalesce(v_reason, '') || ' | passed over: ' || array_to_string(rejected, '; ');
    end if;
  end if;

  insert into music_picks (outcome, dry_run, test_run, content_type, source_table, content_id,
                           geelark_profile, platform, posting_date, old_song, new_song, reason,
                           chart_date, song_stats, choices, model)
  values (v_outcome, s.dry_run, p_test, p_content_type, lane.source_table, p_content_id,
          post.geelark_profile, post.platform, post.posting_date, post.music, v_new, v_reason,
          v_chart, v_stats, p_choices, p_model)
  returning * into rec;

  return to_jsonb(rec);
end;
$$;

-- ---------------------------------------------------------------- grants
revoke all on function public.music_song_key(text) from public, anon, authenticated;
revoke all on function public.music_pick_pool() from public, anon, authenticated;
revoke all on function public.music_pick_songs_to_describe() from public, anon, authenticated;
revoke all on function public.music_pick_recent_songs(text, date, text) from public, anon, authenticated;
revoke all on function public.music_pick_candidates(integer) from public, anon, authenticated;
revoke all on function public.music_pick_apply(text, text, jsonb, text, text, boolean) from public, anon, authenticated;
grant execute on function public.music_song_key(text) to service_role;
grant execute on function public.music_pick_pool() to service_role;
grant execute on function public.music_pick_songs_to_describe() to service_role;
grant execute on function public.music_pick_recent_songs(text, date, text) to service_role;
grant execute on function public.music_pick_candidates(integer) to service_role;
grant execute on function public.music_pick_apply(text, text, jsonb, text, text, boolean) to service_role;
