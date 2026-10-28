-- Precomputed dashboard reads (Garreth, 2026-10-27).
--
-- Why: every dashboard visit recomputed the account-health, warm-up, scheduler
-- pool and analytics-freshness reports from scratch, and the bell asked for
-- warm-up health every two minutes from every open tab (24,078 calls in the
-- database's own statistics, two hours of CPU in all). On a small database
-- those bursts ran 11 to 30 seconds, were cancelled by the statement timeout,
-- and starved everything else, including the Carousel Studio's tiny reads, so
-- the Studio showed no libraries at all. Measured on production the same day.
--
-- What: the nine heavy views become materialized copies in a `cache` schema,
-- refreshed every five minutes by pg_cron, and the public views of the same
-- names now read the copy. Nothing in the app changes: the names, columns and
-- column order are identical (each copy is built from the live definition the
-- database holds, not pasted here). The two heavy report functions keep their
-- names and signatures too; the live computations are renamed `_live` and the
-- public names return the last refreshed result, falling back to the live
-- computation when nothing has been cached yet.
--
-- Kept live on purpose: `v_scheduler_account_config_all` and
-- `v_account_health_review_latest`. Settings and reviews written on the
-- dashboard must read back at once, and both views are cheap once the health
-- view beneath them is cached. The Smart Scheduler reads its config through
-- the first of these, so it sees caps and overrides immediately; the account
-- health it joins in is at most five minutes old.
--
-- Known lag: anything that reads the cached views sees the world as of the
-- last refresh, up to five minutes ago. `select public.refresh_dashboard_caches()`
-- refreshes everything at once if a page ever needs it sooner.

create schema if not exists cache;
grant usage on schema cache to service_role;

-- ── 1. The views, copied in dependency order ───────────────────────────────
-- Each copy is created from the live definition, a unique index is added so
-- the refresh can run without blocking readers, and the public view is then
-- pointed at the copy. CREATE OR REPLACE VIEW keeps the dependent views
-- (config_all, review_latest, inventory_check, v_scheduler_production_order)
-- and the view's grants untouched, because the column list is identical.
do $$
declare
  v record;
begin
  for v in
    select *
    from (values
      ('v_account_warmup_health',       'geelark_profile',                  1),
      ('v_account_last_post',           'geelark_profile',                  2),
      ('v_dashboard_task_errors_7d',    'serial_name',                      3),
      ('v_account_view_health',         'id',                               4),
      ('v_account_health_v3',           'id',                               5),
      ('v_scheduler_pool',              'content_type, character, bucket',  6),
      ('v_dashboard_latest_login',      'profile_name',                     7),
      ('v_dashboard_last5_views',       'platform, account',                8),
      ('v_dashboard_failed_deliveries', 'task_id',                          9)
    ) as t(name, key, ord)
    order by ord
  loop
    execute format(
      'create materialized view cache.%I as %s',
      v.name,
      rtrim(pg_get_viewdef(('public.' || quote_ident(v.name))::regclass, true), E'; \n')
    );
    execute format('create unique index %I on cache.%I (%s)', v.name || '_key', v.name, v.key);
    execute format('grant select on cache.%I to service_role', v.name);
    execute format('revoke all on cache.%I from anon, authenticated', v.name);
    execute format('create or replace view public.%I as select * from cache.%I', v.name, v.name);
  end loop;
end
$$;

-- ── 2. The two report functions ────────────────────────────────────────────

-- analytics_freshness_check(): five max() scans and a pass over the cron run
-- log, 5.4 s on average. The live body keeps working under a new name; the
-- public name hands back the last refreshed JSON.
alter function public.analytics_freshness_check() rename to analytics_freshness_check_live;

create table cache.dashboard_results (
  key         text primary key,
  value       jsonb not null,
  computed_at timestamptz not null default now()
);
alter table cache.dashboard_results enable row level security;
grant select on cache.dashboard_results to service_role;

create or replace function public.analytics_freshness_check()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, cache
as $$
declare
  cached jsonb;
begin
  select value into cached from cache.dashboard_results where key = 'analytics_freshness_check';
  if cached is null then
    return public.analytics_freshness_check_live();
  end if;
  return cached;
end
$$;

-- content_type_stats_fleet(p_days, p_fleet): the per-lane performance table
-- behind Content types and the Carousel Generator's type catalogue. The live
-- body is renamed; the public name returns the refreshed rows for the window
-- and fleet asked for, in the live function's own order, and computes live
-- for any combination the refresh does not cover.
alter function public.content_type_stats_fleet(integer, text) rename to content_type_stats_fleet_live;

create table cache.content_type_stats as
  select 0::integer as p_days, ''::text as p_fleet, 0::integer as ord, now() as computed_at, s.*
  from public.content_type_stats_fleet_live(28, 'all') s
  with no data;
create unique index content_type_stats_key on cache.content_type_stats (p_fleet, (coalesce(p_days, -1)), content_type);
alter table cache.content_type_stats enable row level security;
grant select on cache.content_type_stats to service_role;

create or replace function public.content_type_stats_fleet(p_days integer default 28, p_fleet text default 'all')
returns table(
  content_type text, display_name text, character_name text, quota_bucket text, media_shape text,
  lifecycle text, lifecycle_changed_at timestamptz, lifecycle_note text, cadence_per_week integer,
  cadence_ceiling_per_week integer, cadence_before_pause integer, unified_poster_active boolean,
  posts bigint, views bigint, avg_views integer, median_views integer, best_views bigint,
  engagement bigint, eng_rate numeric, pct_dead integer, pct_ge500 integer, med_recent integer,
  med_prior integer, momentum_pct integer, score integer, tier text, confidence text,
  tiktok_posts bigint, instagram_posts bigint, last_posted_at timestamptz, scheduled_ahead bigint,
  thumb_url text, thumb_content_id text, thumb_captured_at timestamptz, last_ingest timestamptz
)
language plpgsql
stable
security definer
set search_path = public, cache
as $$
begin
  if exists (select 1 from cache.content_type_stats c where c.p_fleet = $2 and c.p_days is not distinct from $1) then
    return query
      select c.content_type, c.display_name, c.character_name, c.quota_bucket, c.media_shape,
             c.lifecycle, c.lifecycle_changed_at, c.lifecycle_note, c.cadence_per_week,
             c.cadence_ceiling_per_week, c.cadence_before_pause, c.unified_poster_active,
             c.posts, c.views, c.avg_views, c.median_views, c.best_views,
             c.engagement, c.eng_rate, c.pct_dead, c.pct_ge500, c.med_recent,
             c.med_prior, c.momentum_pct, c.score, c.tier, c.confidence,
             c.tiktok_posts, c.instagram_posts, c.last_posted_at, c.scheduled_ahead,
             c.thumb_url, c.thumb_content_id, c.thumb_captured_at, c.last_ingest
      from cache.content_type_stats c
      where c.p_fleet = $2 and c.p_days is not distinct from $1
      order by c.ord;
  else
    return query select * from public.content_type_stats_fleet_live($1, $2);
  end if;
end
$$;

-- ── 3. The refresh, every five minutes ─────────────────────────────────────
-- Dependency order matters: health_v3 reads the warm-up, last-post, task-error
-- and view-health copies, so those go first. The stats table is rebuilt for
-- the windows the Content types page offers (7, 14, 30 days, all time) on
-- both fleets, which is also what the Carousel Generator asks for (30, cloud).
create or replace function public.refresh_dashboard_caches()
returns void
language plpgsql
security definer
set search_path = public, cache
as $$
declare
  d integer;
  f text;
begin
  refresh materialized view concurrently cache.v_account_warmup_health;
  refresh materialized view concurrently cache.v_account_last_post;
  refresh materialized view concurrently cache.v_dashboard_task_errors_7d;
  refresh materialized view concurrently cache.v_account_view_health;
  refresh materialized view concurrently cache.v_account_health_v3;
  refresh materialized view concurrently cache.v_scheduler_pool;
  refresh materialized view concurrently cache.v_dashboard_latest_login;
  refresh materialized view concurrently cache.v_dashboard_last5_views;
  refresh materialized view concurrently cache.v_dashboard_failed_deliveries;

  insert into cache.dashboard_results (key, value, computed_at)
  values ('analytics_freshness_check', public.analytics_freshness_check_live(), now())
  on conflict (key) do update set value = excluded.value, computed_at = excluded.computed_at;

  -- Rebuilt inside this one transaction, so a reader never sees a half-empty table.
  delete from cache.content_type_stats;
  foreach f in array array['cloud', 'physical'] loop
    foreach d in array array[7, 14, 30, -1] loop
      insert into cache.content_type_stats
        select nullif(d, -1), f, row_number() over (), now(), s.*
        from public.content_type_stats_fleet_live(nullif(d, -1), f) s;
    end loop;
  end loop;
end
$$;
revoke all on function public.refresh_dashboard_caches() from public, anon, authenticated;
grant execute on function public.refresh_dashboard_caches() to service_role;

select public.refresh_dashboard_caches();

select cron.schedule('refresh-dashboard-caches', '*/5 * * * *', 'select public.refresh_dashboard_caches()');

-- PostgREST caches the function signatures it exposes; tell it to look again.
notify pgrst, 'reload schema';
