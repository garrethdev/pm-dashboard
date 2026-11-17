-- Music picker, after the first dry-run test (2026-11-17, 48 Character 6 posts):
-- 1. Test picks no longer count as an account's recent songs outside a test,
--    so the test log cannot hold back real picks.
-- 2. When the AI chose songs but every one was ruled out (account had it
--    recently, daily cap), the log now says so instead of "no song fit".

drop function public.music_pick_recent_songs(text, date, text);
create function public.music_pick_recent_songs(
  p_profile text, p_day date, p_exclude_content_id text, p_include_test boolean default false
)
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
      and (p_include_test or not mp.test_run)
      and mp.content_id is distinct from p_exclude_content_id
      and mp.posting_date between p_day - s.repeat_days and p_day + s.repeat_days
  ) x
$$;
revoke all on function public.music_pick_recent_songs(text, date, text, boolean) from public, anon, authenticated;
grant execute on function public.music_pick_recent_songs(text, date, text, boolean) to service_role;

create or replace function public.music_pick_candidates(p_test_days integer default null)
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
  n_test integer;
  test boolean;
begin
  select * into s from music_picker_settings where id = 1;
  n_test := coalesce(p_test_days, s.test_days, 0);
  test := n_test > 0;
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
      select x.* , music_pick_recent_songs(x.geelark_profile, x.posting_date, x.content_id, %L::boolean)
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
      test,
      l.content_type, l.source_table, l.source_id_column, l.story_columns,
      l.source_table, l.source_id_column, l.source_table, s.characters,
      case when test then today - n_test else today end, today + s.days_ahead,
      test, test, test);
  end loop;
end;
$$;

create or replace function public.music_pick_apply(
  p_content_type text,
  p_content_id text,
  p_choices jsonb,
  p_model text default null,
  p_no_fit_reason text default null,
  p_test boolean default null
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
  v_test boolean;
  v_outcome text;
  v_reason text;
  v_new text;
  v_stats jsonb;
  v_chart date;
  rec music_picks;
begin
  select * into s from music_picker_settings where id = 1;
  v_test := coalesce(p_test, s.test_days > 0);
  if v_test and not s.dry_run then
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

  if not v_test and (handed or lower(coalesce(post.posting_status, '')) <> 'ready') then
    v_outcome := 'skipped';
    v_reason := case when handed then 'already on the To-do list' else 'post is no longer ready' end;
  else
    recent := music_pick_recent_songs(post.geelark_profile, post.posting_date, p_content_id, v_test);
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
         and mp.test_run = v_test;
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
      v_reason := coalesce(
        p_no_fit_reason,
        case when array_length(rejected, 1) > 0
             then 'every song the AI chose was ruled out'
             else 'no song on today''s chart fit the story' end);
    end if;
    if array_length(rejected, 1) > 0 then
      v_reason := coalesce(v_reason, '') || ' | passed over: ' || array_to_string(rejected, '; ');
    end if;
  end if;

  insert into music_picks (outcome, dry_run, test_run, content_type, source_table, content_id,
                           geelark_profile, platform, posting_date, old_song, new_song, reason,
                           chart_date, song_stats, choices, model)
  values (v_outcome, s.dry_run, v_test, p_content_type, lane.source_table, p_content_id,
          post.geelark_profile, post.platform, post.posting_date, post.music, v_new, v_reason,
          v_chart, v_stats, p_choices, p_model)
  returning * into rec;

  return to_jsonb(rec);
end;
$$;

revoke all on function public.music_pick_candidates(integer) from public, anon, authenticated;
revoke all on function public.music_pick_apply(text, text, jsonb, text, text, boolean) from public, anon, authenticated;
grant execute on function public.music_pick_candidates(integer) to service_role;
grant execute on function public.music_pick_apply(text, text, jsonb, text, text, boolean) to service_role;
