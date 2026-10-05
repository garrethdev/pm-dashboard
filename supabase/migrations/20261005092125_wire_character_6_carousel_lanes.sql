-- Character 6's two carousel lanes, Viral Theories and 3-Slide Journey, wired so
-- the Smart Scheduler can give them to Profile 31 and the Posting Agent can put
-- them on Yurie's To-do list (Garreth, 2026-10-05). Steps 1-5 of
-- WIRE-NEW-CONTENT-TYPE.md (its steps 3, 4, 6, 7 and 8). The n8n MEDIA map entry
-- is done by hand in the n8n editor and is not part of this file.
--
-- Cadence: Character 6's GLP cap is 14 a week (scheduler_overrides), split 7 + 7,
-- so the cadence editor stays balanced. Each lane at most 1 a day, as Cleora.
--
-- The two view edits are textual appends to the LIVE definitions, guarded so a
-- re-run cannot double-append and an unexpected shape refuses rather than guesses.

-- 1. Registry rows ------------------------------------------------------------
insert into content_type_registry (
  content_type, display_name, source_table, source_id_column,
  source_profile_column, source_date_column, source_time_column,
  "character", quota_bucket, media_shape,
  needs_music, has_baked_audio,
  ig_endpoint, ig_params, tt_task_type, tt_params,
  cadence_per_week, cadence_ceiling_per_week,
  day_pattern, time_window_start, time_window_end,
  min_gap_minutes, max_posts_per_day, low_inventory_threshold_days,
  alert_min_posts, alert_window_days,
  active, unified_poster_active, lifecycle, audit_fields, notion_property_map, lifecycle_note
) values
(
  'viral_theories', 'Viral Theories', 'viral_theories_carousel', 'carousel_id',
  'geelark_profile', 'posting_date', 'posting_time',
  'Character 6', 'glp', 'image_carousel',
  true, false,
  'instagramPubReelsImages', '{"publishPost":false}'::jsonb, 3, '{"sameVideoVolume":100}'::jsonb,
  7, 7,
  'every_day', '11:00:00', '22:15:00',
  120, 1, 3,
  3, 7,
  true, true, 'live',
  '{"caption":["caption"],"text_hook":["hook_text"],"transcript":[],"on_screen_text":["slide_1","slide_2","slide_3","slide_4","slide_5","slide_6"]}'::jsonb,
  '{}'::jsonb,
  '2026-10-05: wired for the phone farm. Character 6, 7/wk of its 14.'
),
(
  'journey_3slide', '3-Slide Journey', 'journey_3slide_carousel', 'carousel_id',
  'geelark_profile', 'posting_date', 'posting_time',
  'Character 6', 'glp', 'image_carousel',
  true, false,
  'instagramPubReelsImages', '{"publishPost":false}'::jsonb, 3, '{"sameVideoVolume":100}'::jsonb,
  7, 7,
  'every_day', '11:00:00', '22:15:00',
  120, 1, 3,
  3, 7,
  true, true, 'live',
  '{"caption":["caption"],"text_hook":["hook_text"],"transcript":[],"on_screen_text":[]}'::jsonb,
  '{}'::jsonb,
  '2026-10-05: wired for the phone farm. Character 6, 7/wk of its 14.'
);

-- 2. Character 6 may post them ------------------------------------------------
update characters
set allowed_content_types = allowed_content_types
      || array(select s from unnest(array['viral_theories','journey_3slide']) s
               where not (allowed_content_types @> array[s])),
    updated_at = now()
where "character" = 'Character 6';

-- 3. The "ready" switch for Viral Theories (3-Slide Journey already has one) --
-- All six slides, as the journey trigger demands all three of its own.
create or replace function public.trg_sr_viral_theories_carousel()
returns trigger language plpgsql as $function$
begin
  if coalesce(new.posting_status, '') <> 'Hold'
     and new.gatekeep_status = 'approved'
     and coalesce(new.quality_status, '') <> 'poor'
     and new.slide_1_url is not null
     and new.slide_2_url is not null
     and new.slide_3_url is not null
     and new.slide_4_url is not null
     and new.slide_5_url is not null
     and new.slide_6_url is not null
     and new.scheduler_ready is not true
     and new.caption is not null
  then new.scheduler_ready := true; end if;
  return new;
end $function$;

create trigger sr_autoset_viral_theories_carousel
before insert or update on public.viral_theories_carousel
for each row execute function public.trg_sr_viral_theories_carousel();

-- Let both triggers judge the rows already there.
update viral_theories_carousel set updated_at = now() where scheduler_ready is not true;
update journey_3slide_carousel set updated_at = now() where scheduler_ready is not true;

-- 4. unified_posts: what the Posting Agent and the To-do list read -------------
do $$
declare
  body text := pg_get_viewdef('public.unified_posts'::regclass, true);
begin
  if body ilike '%''viral_theories''::text%' or body ilike '%''journey_3slide''::text%' then
    raise exception 'unified_posts already has a Character 6 carousel branch';
  end if;
  execute 'create or replace view public.unified_posts as '
    || rtrim(body, E' ;\n')
    || $b$
UNION ALL
 SELECT 'viral_theories'::text AS content_type,
    t.carousel_id AS content_id,
    t.geelark_profile,
    lower(COALESCE(t.platform, ''::text)) AS platform,
    t.posting_date,
    t.posting_time::text AS posting_time,
    t.posting_status,
    NULL::text AS media_url,
    array_remove(ARRAY[t.slide_1_url, t.slide_2_url, t.slide_3_url, t.slide_4_url, t.slide_5_url, t.slide_6_url], NULL::text) AS media_urls,
    t.caption,
    t.music AS music_label
   FROM viral_theories_carousel t
  WHERE t.slide_1_url IS NOT NULL
UNION ALL
 SELECT 'journey_3slide'::text AS content_type,
    t.carousel_id AS content_id,
    t.geelark_profile,
    lower(COALESCE(t.platform, ''::text)) AS platform,
    t.posting_date,
    t.posting_time::text AS posting_time,
    t.posting_status,
    NULL::text AS media_url,
    array_remove(ARRAY[t.slide_1_url, t.slide_2_url, t.slide_3_url], NULL::text) AS media_urls,
    t.caption,
    t.music AS music_label
   FROM journey_3slide_carousel t
  WHERE t.render_status = 'rendered'::text$b$;
end $$;

-- 5. v_scheduler_pool: the stock the planner (and Inventory) counts ------------
do $$
declare
  body text := pg_get_viewdef('public.v_scheduler_pool'::regclass, true);
  marker text := E'\n        )\n SELECT raw.content_type,';
  branches text := $b$
        UNION ALL
         SELECT 'viral_theories'::text AS content_type,
            'Character 6'::text AS "character",
            'glp'::text AS bucket,
            count(*) AS pool_n
           FROM viral_theories_carousel
          WHERE COALESCE(viral_theories_carousel.posting_status, ''::text) = ''::text AND viral_theories_carousel.geelark_profile IS NULL AND viral_theories_carousel.scheduler_ready AND viral_theories_carousel.gatekeep_status = 'approved'::text AND COALESCE(viral_theories_carousel.quality_status, ''::text) <> 'poor'::text AND viral_theories_carousel.slide_1_url IS NOT NULL AND viral_theories_carousel.caption IS NOT NULL
        UNION ALL
         SELECT 'journey_3slide'::text AS content_type,
            'Character 6'::text AS "character",
            'glp'::text AS bucket,
            count(*) AS pool_n
           FROM journey_3slide_carousel
          WHERE COALESCE(journey_3slide_carousel.posting_status, ''::text) = ''::text AND journey_3slide_carousel.geelark_profile IS NULL AND journey_3slide_carousel.scheduler_ready AND journey_3slide_carousel.gatekeep_status = 'approved'::text AND COALESCE(journey_3slide_carousel.quality_status, ''::text) <> 'poor'::text AND journey_3slide_carousel.slide_1_url IS NOT NULL AND journey_3slide_carousel.caption IS NOT NULL$b$;
begin
  if body ilike '%''viral_theories''::text%' or body ilike '%''journey_3slide''::text%' then
    raise exception 'v_scheduler_pool already has a Character 6 carousel branch';
  end if;
  if (length(body) - length(replace(body, marker, ''))) / length(marker) <> 1 then
    raise exception 'v_scheduler_pool is not the expected shape; edit it by hand';
  end if;
  execute 'create or replace view public.v_scheduler_pool as '
    || rtrim(replace(body, marker, branches || marker), E' ;\n');
end $$;
