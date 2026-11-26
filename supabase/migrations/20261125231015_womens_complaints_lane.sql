-- Women's Complaints carousel (content type womens_complaints), Character 6, eight slide image carousel about one
-- complaint: belly, upper arms or double chin. Garreth, 2026-11-25: "Get everything setup including the render agent".
-- Modelled on camera_roll_story (wire_camera_roll_story) and story_wall_video. Wired at cadence 0, decks load on Hold,
-- so nothing is scheduled until he sets a cadence and lifts Hold.
create sequence if not exists public.womens_complaints_carousel_seq;
create table public.womens_complaints_carousel (
  id uuid primary key default gen_random_uuid(),
  carousel_id text unique not null default ('WC-' || lpad(nextval('womens_complaints_carousel_seq')::text, 4, '0')),
  content_id text generated always as (carousel_id) stored,
  batch text, "character" text default 'Character 6', pillar text default 'womens_complaints',
  complaint text check (complaint in ('belly','arms','chin')),
  story_id bigint, source_url text, writer_run text, deck jsonb, hook_text text,
  slide_1 text, slide_2 text, slide_3 text, slide_4 text, slide_5 text, slide_6 text, slide_7 text, slide_8 text,
  slide_1_url text, slide_2_url text, slide_3_url text, slide_4_url text, slide_5_url text, slide_6_url text, slide_7_url text, slide_8_url text,
  source_images jsonb, caption text, music text, music_library_id uuid,
  status text default 'scripted', render_status text default 'pending', render_error text, rendered_at timestamptz,
  risk_flag text, writer_problems jsonb,
  gatekeep_status text, gatekeep_notes text, gatekeep_reviewed_at timestamptz,
  quality_status text, quality_score integer, quality_notes text, quality_reviewed_at timestamptz,
  scheduler_ready boolean, geelark_profile text, platform text, posting_date timestamptz, posting_time time,
  posting_status text, scheduled_at timestamptz, geelark_task_id text, notion_page_id text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.womens_complaints_carousel enable row level security;
create policy "anon select womens_complaints_carousel" on public.womens_complaints_carousel for select to anon using (true);
create policy "anon insert womens_complaints_carousel" on public.womens_complaints_carousel for insert to anon with check (true);
create policy "anon update womens_complaints_carousel" on public.womens_complaints_carousel for update to anon using (true) with check (true);
create trigger set_updated_at_womens_complaints_carousel before update on public.womens_complaints_carousel
  for each row execute function public.set_updated_at();

insert into content_type_registry (
  content_type, display_name, source_table, source_id_column, source_profile_column, source_date_column, source_time_column,
  "character", quota_bucket, media_shape, needs_music, has_baked_audio, ig_endpoint, ig_params, tt_task_type, tt_params,
  cadence_per_week, cadence_ceiling_per_week, day_pattern, time_window_start, time_window_end,
  min_gap_minutes, max_posts_per_day, low_inventory_threshold_days, alert_min_posts, alert_window_days,
  active, unified_poster_active, lifecycle, lifecycle_note, audit_fields
) values (
  'womens_complaints', 'Women''s Complaints Carousel', 'womens_complaints_carousel', 'carousel_id', 'geelark_profile', 'posting_date', 'posting_time',
  'Character 6', 'glp', 'image_carousel', true, false, 'instagramPubReelsImages', '{"publishPost":false}'::jsonb, 3, '{"sameVideoVolume":100}'::jsonb,
  0, 7, 'every_day', '11:00:00', '22:15:00', 120, 1, 3, 3, 7,
  true, true, 'live', '2026-11-25: wired at cadence 0 and decks on Hold, so nothing is scheduled until Garreth sets a cadence. Writer n8n OUNkXW14hBlslnDg, renderer ~/womens-complaints/render_decks.py.',
  '{"caption":["caption"],"text_hook":["hook_text"],"transcript":[],"on_screen_text":["slide_1","slide_2","slide_3","slide_4","slide_5","slide_6","slide_7","slide_8"]}'::jsonb
);
update characters set allowed_content_types = array_append(allowed_content_types, 'womens_complaints'), updated_at = now()
where "character" = 'Character 6' and not (allowed_content_types @> array['womens_complaints']);

create or replace function public.trg_sr_womens_complaints_carousel() returns trigger language plpgsql as $function$
begin
  if coalesce(new.posting_status, '') <> 'Hold'
     and new.gatekeep_status = 'approved'
     and coalesce(new.quality_status, '') <> 'poor'
     and new.slide_1_url is not null and new.slide_2_url is not null
     and new.slide_3_url is not null and new.slide_4_url is not null
     and new.slide_5_url is not null and new.slide_6_url is not null
     and new.slide_7_url is not null and new.slide_8_url is not null
     and new.render_status = 'rendered'
     and new.caption is not null
     and new.music is not null
     and new.scheduler_ready is not true
  then new.scheduler_ready := true; end if;
  return new;
end $function$;
create trigger sr_autoset_womens_complaints_carousel before insert or update on public.womens_complaints_carousel
  for each row execute function public.trg_sr_womens_complaints_carousel();

do $$
declare v text;
begin
  select pg_get_viewdef('public.unified_posts'::regclass, true) into v;
  v := rtrim(v, E'; \n');
  if v ilike '%''womens_complaints''::text AS content_type%' then raise notice 'already present'; return; end if;
  v := v || E'\nUNION ALL\n SELECT ''womens_complaints''::text AS content_type,\n'
    || E'    t.carousel_id AS content_id,\n    t.geelark_profile,\n'
    || E'    lower(COALESCE(t.platform, ''''::text)) AS platform,\n'
    || E'    t.posting_date,\n    (t.posting_time)::text AS posting_time,\n    t.posting_status,\n'
    || E'    NULL::text AS media_url,\n'
    || E'    array_remove(ARRAY[t.slide_1_url, t.slide_2_url, t.slide_3_url, t.slide_4_url, t.slide_5_url, t.slide_6_url, t.slide_7_url, t.slide_8_url], NULL::text) AS media_urls,\n'
    || E'    t.caption,\n    t.music AS music_label\n'
    || E'   FROM womens_complaints_carousel t\n  WHERE (t.render_status = ''rendered''::text)';
  execute 'create or replace view public.unified_posts as ' || v;
end $$;

do $$
declare v text;
begin
  select pg_get_viewdef('public.v_scheduler_pool'::regclass, true) into v;
  v := rtrim(v, E'; \n');
  if v ilike '%''womens_complaints''::text AS content_type%' then raise notice 'already present'; return; end if;
  v := v || E'\nUNION ALL\n SELECT ''womens_complaints''::text AS content_type,\n'
    || E'    ''Character 6''::text AS "character",\n    ''glp''::text AS bucket,\n    count(*) AS pool_n\n'
    || E'   FROM womens_complaints_carousel t\n'
    || E'  WHERE COALESCE(t.posting_status, ''''::text) = ''''::text AND t.geelark_profile IS NULL AND t.scheduler_ready'
    || E' AND t.gatekeep_status = ''approved''::text AND COALESCE(t.quality_status, ''''::text) <> ''poor''::text'
    || E' AND t.slide_1_url IS NOT NULL AND t.caption IS NOT NULL';
  execute 'create or replace view public.v_scheduler_pool as ' || v;
end $$;