-- Story Wall video (content type story_wall_video), Character 6. Garreth, 2026-11-25.
--
-- An 8 second loop of one of her kitchen clips (quote_video_clips) with one whole story from
-- story_bank on screen as a single paragraph, over a light dark shade. The text and shade go
-- for the last second, so the video ends on just her. Silent file; the song is a name in
-- `music`, added at posting like Kitchen Quote Video.
--
-- Wired the same way as kitchen_quote_video (2026-11-24): a live branch on the public stock
-- view, a branch on unified_posts, the ready-switch trigger, and the clip use counter.
-- Cadence 3 a week, taken from camera_roll_story 4->3, divorce_recovery 3->2,
-- jealousy_carousel 3->2 (Garreth's pick), so Character 6 stays at 18.

-- 1. The table ---------------------------------------------------------------------------
create table public.story_wall_posts (
  id                   uuid primary key default gen_random_uuid(),
  content_id           text not null unique,
  batch                text,
  "character"          text not null default 'Character 6',
  pillar               text not null default 'story_wall_video',
  story_id             bigint references public.story_bank(id),
  story_text           text not null,          -- the words on screen, one paragraph
  hook_text            text,                   -- first sentence of story_text, for the content check
  clip_no              integer references public.quote_video_clips(clip_no),
  shirt_color          text,
  shade_pct            integer,                -- strength of the shade behind the text, 22 to 38
  video_url            text,
  render_status        text,
  rendered_at          timestamptz,
  render_error         text,
  caption              text,
  music                text,
  gatekeep_status      text,
  gatekeep_notes       text,
  gatekeep_reviewed_at timestamptz,
  quality_status       text,
  quality_score        integer,
  quality_notes        text,
  quality_reviewed_at  timestamptz,
  scheduler_ready      boolean not null default false,
  geelark_profile      text,
  platform             text,
  posting_date         timestamptz,
  posting_time         time,
  posting_status       text,
  scheduled_at         timestamptz,
  geelark_task_id      text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
alter table public.story_wall_posts enable row level security;   -- service key only, like quote_video_posts

create trigger set_updated_at before update on public.story_wall_posts
  for each row execute function public.set_updated_at();

-- A clip's use counter goes up when a post first gets a posting date (shared with Kitchen Quote).
create trigger count_clip_use before insert or update on public.story_wall_posts
  for each row execute function public.trg_quote_video_posts_count_use();

-- 2. Ready switch (also the media guard) -------------------------------------------------
create or replace function public.trg_sr_story_wall_posts()
returns trigger language plpgsql as $function$
begin
  if coalesce(new.posting_status, '') <> 'Hold'
     and new.gatekeep_status = 'approved'
     and coalesce(new.quality_status, '') <> 'poor'
     and new.video_url is not null
     and new.render_status = 'rendered'
     and new.caption is not null
     and new.music is not null
     and new.scheduler_ready is not true
  then new.scheduler_ready := true; end if;
  return new;
end $function$;

create trigger sr_autoset_story_wall_posts before insert or update on public.story_wall_posts
  for each row execute function public.trg_sr_story_wall_posts();

-- 3. Content-type list row ---------------------------------------------------------------
insert into public.content_type_registry (
  content_type, display_name, source_table, source_id_column,
  source_profile_column, source_date_column, source_time_column,
  "character", quota_bucket, media_shape, needs_music, has_baked_audio,
  ig_endpoint, ig_params, tt_task_type, tt_params,
  cadence_per_week, cadence_ceiling_per_week,
  day_pattern, time_window_start, time_window_end,
  min_gap_minutes, max_posts_per_day, low_inventory_threshold_days,
  alert_min_posts, alert_window_days,
  active, unified_poster_active, lifecycle, lifecycle_note, audit_fields
)
select
  'story_wall_video', 'Story Wall', 'story_wall_posts', 'content_id',
  'geelark_profile', 'posting_date', 'posting_time',
  'Character 6', 'glp', 'video', true, false,
  ig_endpoint, ig_params, tt_task_type, tt_params,           -- same posting settings as Kitchen Quote
  3, 7,
  day_pattern, time_window_start, time_window_end,
  min_gap_minutes, 1, low_inventory_threshold_days,
  alert_min_posts, alert_window_days,
  true, true, 'live',
  'Wired 2026-11-25: 3/wk, taken from camera_roll_story (4->3), divorce_recovery (3->2) and jealousy_carousel (3->2). Song added at posting.',
  '{"caption":["caption"],"text_hook":["hook_text"],"transcript":[],"on_screen_text":["story_text"]}'::jsonb
from public.content_type_registry where content_type = 'kitchen_quote_video';

-- 4. Story bank lane (story_uses needs it; it must come after the list row). Off until a writer picks stories for it.
insert into public.story_lanes (lane, display_name, brief, slide_count, min_score, fallback_score, min_fit, active)
values ('story_wall_video', 'Story Wall',
  'The whole story is shown on screen as one paragraph over an 8 second clip of her in the kitchen, so it must read well in one go and be about 125 words or fewer (a longer story is cut to fit). Fits a first-person story by a woman in her late 30s to 50s: a small win with her body, a husband or ex who let her down, a remark from family, a kindness she never forgot. Keep stories that name no weight-loss drug or medication and give no weights in numbers.',
  1, 8, 7, 7, false);

-- 5. Character 6 allowed list and weekly mix ----------------------------------------------
update public.characters
set allowed_content_types = array_append(allowed_content_types, 'story_wall_video'), updated_at = now()
where "character" = 'Character 6' and not (allowed_content_types @> array['story_wall_video']);

update public.content_type_registry set cadence_per_week = 3 where content_type = 'camera_roll_story';
update public.content_type_registry set cadence_per_week = 2 where content_type = 'divorce_recovery';
update public.content_type_registry set cadence_per_week = 2 where content_type = 'jealousy_carousel';

-- 6. Posting view ------------------------------------------------------------------------
do $$
declare v text;
begin
  select pg_get_viewdef('public.unified_posts'::regclass, true) into v;
  v := rtrim(v, E'; \n');
  if v ilike '%''story_wall_video''::text AS content_type%' then raise notice 'already present'; return; end if;
  v := v || E'\nUNION ALL\n SELECT ''story_wall_video''::text AS content_type,\n'
    || E'    t.content_id,\n    t.geelark_profile,\n'
    || E'    lower(COALESCE(t.platform, ''''::text)) AS platform,\n'
    || E'    t.posting_date,\n    t.posting_time::text AS posting_time,\n    t.posting_status,\n'
    || E'    t.video_url AS media_url,\n    NULL::text[] AS media_urls,\n'
    || E'    t.caption,\n    t.music AS music_label\n'
    || E'   FROM story_wall_posts t\n  WHERE t.video_url IS NOT NULL AND t.render_status = ''rendered''::text';
  execute 'create or replace view public.unified_posts as ' || v;
end $$;

-- 7. Stock view (live branch on the public view, as comparison_carousel and kitchen_quote_video)
do $$
declare v text;
begin
  select pg_get_viewdef('public.v_scheduler_pool'::regclass, true) into v;
  v := rtrim(v, E'; \n');
  if v ilike '%''story_wall_video''::text AS content_type%' then raise notice 'already present'; return; end if;
  v := v || E'\nUNION ALL\n SELECT ''story_wall_video''::text AS content_type,\n'
    || E'    ''Character 6''::text AS "character",\n    ''glp''::text AS bucket,\n    count(*) AS pool_n\n'
    || E'   FROM story_wall_posts\n'
    || E'  WHERE COALESCE(story_wall_posts.posting_status, ''''::text) = ''''::text'
    || E' AND story_wall_posts.geelark_profile IS NULL AND story_wall_posts.scheduler_ready'
    || E' AND story_wall_posts.gatekeep_status = ''approved''::text'
    || E' AND COALESCE(story_wall_posts.quality_status, ''''::text) <> ''poor''::text'
    || E' AND story_wall_posts.video_url IS NOT NULL AND story_wall_posts.caption IS NOT NULL';
  execute 'create or replace view public.v_scheduler_pool as ' || v;
end $$;
