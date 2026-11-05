-- Wire the Character 6 Jealousy Carousel lane (jealousy_carousels) into the
-- registry, the character's allowed list, unified_posts and the cached stock
-- view, and rebalance Character 6's weekly mix to 5+5+4+4 (Garreth, 2026-11-05).
-- All one transaction: the scheduler reads the registry directly, so a registry
-- row without the unified_posts branch would book decks that never post.

-- Table shape: the id the other lanes have, and no two decks sharing one.
alter table public.jealousy_carousels
  add column content_id text generated always as (carousel_id) stored;
create unique index jealousy_carousels_carousel_id_key
  on public.jealousy_carousels (carousel_id);

-- Ready switch: every slide, not only the first and last.
create or replace function public.trg_sr_jealousy_carousels()
returns trigger language plpgsql as $function$
begin
  new.updated_at := now();
  if coalesce(new.posting_status, '') <> 'Hold'
     and new.gatekeep_status = 'approved'
     and coalesce(new.quality_status, '') <> 'poor'
     and new.slide_1_url is not null and new.slide_2_url is not null
     and new.slide_3_url is not null and new.slide_4_url is not null
     and new.slide_5_url is not null and new.slide_6_url is not null
     and new.music is not null
     and new.scheduler_ready is not true
     and new.caption is not null
     and new.render_status = 'rendered'
  then new.scheduler_ready := true; end if;
  return new;
end $function$;

-- Registry: same routing, timing and limits as divorce_recovery.
insert into public.content_type_registry (
  content_type, display_name, source_table, source_id_column,
  source_profile_column, source_date_column, source_time_column,
  "character", quota_bucket, media_shape, needs_music, has_baked_audio,
  ig_endpoint, ig_params, tt_task_type, tt_params,
  cadence_per_week, cadence_ceiling_per_week,
  day_pattern, time_window_start, time_window_end,
  min_gap_minutes, max_posts_per_day, low_inventory_threshold_days,
  alert_min_posts, alert_window_days,
  active, unified_poster_active, lifecycle, audit_fields)
select
  'jealousy_carousel', 'Jealousy Carousel', 'jealousy_carousels', source_id_column,
  source_profile_column, source_date_column, source_time_column,
  "character", quota_bucket, media_shape, needs_music, has_baked_audio,
  ig_endpoint, ig_params, tt_task_type, tt_params,
  5, cadence_ceiling_per_week,
  day_pattern, time_window_start, time_window_end,
  min_gap_minutes, max_posts_per_day, low_inventory_threshold_days,
  alert_min_posts, alert_window_days,
  active, unified_poster_active, lifecycle,
  '{"caption":["caption"],"text_hook":["hook_text"],"transcript":[],"on_screen_text":["slide_1","slide_2","slide_3","slide_4","slide_5","slide_6"]}'::jsonb
from public.content_type_registry where content_type = 'divorce_recovery';

-- Character 6's weekly mix: 5+5+4+4 = 18 (the two newest lanes get the 5s).
update public.content_type_registry set cadence_per_week = 5 where content_type = 'divorce_recovery';
update public.content_type_registry set cadence_per_week = 4 where content_type in ('viral_theories', 'journey_3slide');

update public.characters
set allowed_content_types = array_append(allowed_content_types, 'jealousy_carousel'), updated_at = now()
where "character" = 'Character 6' and not (allowed_content_types @> array['jealousy_carousel']);

-- unified_posts: appended to its own definition.
do $$
declare v text;
begin
  v := rtrim(pg_get_viewdef('public.unified_posts'::regclass, true), E'; \n');
  if v ilike '%''jealousy_carousel''::text AS content_type%' then raise exception 'already in unified_posts'; end if;
  v := v || E'\nUNION ALL\n SELECT ''jealousy_carousel''::text AS content_type,\n'
    || E'    t.carousel_id AS content_id,\n    t.geelark_profile,\n'
    || E'    lower(COALESCE(t.platform, ''''::text)) AS platform,\n'
    || E'    t.posting_date,\n    t.posting_time::text AS posting_time,\n    t.posting_status,\n'
    || E'    NULL::text AS media_url,\n'
    || E'    array_remove(ARRAY[t.slide_1_url, t.slide_2_url, t.slide_3_url, t.slide_4_url, t.slide_5_url, t.slide_6_url], NULL::text) AS media_urls,\n'
    || E'    t.caption,\n    t.music AS music_label\n'
    || E'   FROM jealousy_carousels t\n  WHERE t.render_status = ''rendered''::text';
  execute 'create or replace view public.unified_posts as ' || v;
end $$;

-- Cached stock view: build a second copy with the new branch, point the public
-- view at it, drop the old copy, rename. No cascade anywhere.
do $$
declare v text;
begin
  v := rtrim(pg_get_viewdef('cache.v_scheduler_pool'::regclass, true), E'; \n');
  if v ilike '%''jealousy_carousel''::text AS content_type%' then raise exception 'already in v_scheduler_pool'; end if;
  v := v || E'\nUNION ALL\n SELECT ''jealousy_carousel''::text AS content_type, ''Character 6''::text AS "character", ''glp''::text AS bucket, count(*) AS pool_n\n'
    || E'   FROM jealousy_carousels t\n'
    || E'  WHERE COALESCE(t.posting_status, ''''::text) = ''''::text AND t.geelark_profile IS NULL AND t.scheduler_ready'
    || E' AND t.gatekeep_status = ''approved''::text AND COALESCE(t.quality_status, ''''::text) <> ''poor''::text'
    || E' AND t.slide_1_url IS NOT NULL AND t.caption IS NOT NULL';
  execute 'create materialized view cache.v_scheduler_pool_next as ' || v;
  create unique index v_scheduler_pool_next_key on cache.v_scheduler_pool_next (content_type, "character", bucket);
  grant select on cache.v_scheduler_pool_next to service_role;
  create or replace view public.v_scheduler_pool as
    select content_type, "character", bucket, pool_n from cache.v_scheduler_pool_next;
  drop materialized view cache.v_scheduler_pool;
  alter materialized view cache.v_scheduler_pool_next rename to v_scheduler_pool;
  alter index cache.v_scheduler_pool_next_key rename to v_scheduler_pool_key;
end $$;

-- Batch record.
insert into public.content_batches (batch_id, content_type, notes)
values ('jealousy_v2_2026_11_04', 'jealousy_carousel', 'First 25 Character 6 Jealousy Carousel decks')
on conflict do nothing;
