-- PF-19: the Content Calendar and the Content Types page, one fleet at a time —
-- and both of them counting posts made by hand (PF-09).
--
-- Garreth's rule for every per-fleet number (2026-09-18): AN ACCOUNT'S DATA
-- FOLLOWS THE ACCOUNT. A fleet's numbers are simply the existing numbers
-- limited to the accounts that are in that fleet today. There is no move-date
-- split: move an account to a real phone and its whole history moves with it.
--
--   p_fleet = 'all'       every row, identical to the original function
--   p_fleet = 'physical'  rows whose account has delivery_mode = 'manual'
--   p_fleet = 'cloud'     everything else, INCLUDING rows whose profile matches
--                         no accounts row at all. Those are Geelark-era
--                         leftovers, and putting them here is what makes
--                         cloud + physical add up to 'all' exactly.
--
-- THE ORIGINALS ARE NOT TOUCHED. `calendar_month_rollup`, `calendar_month_days`,
-- `calendar_day_detail` and `content_type_stats` stay exactly as they are, the
-- same way PF-17 and PF-18 left `analytics_rollup` and `inventory_rollup`
-- alone. That is not tidiness: `content_type_stats` is executable by the anon
-- key and is one of the callers the open-anon-key audit in BACKLOG.md is
-- counting, and the calendar functions have been the fleet-wide answer since
-- 2026-09-06. If one of a pair is ever changed, change the other to match.
--
-- SECOND CHANGE, AND THE REASON THIS SHIPS WITH PF-09: all three calendar
-- functions answer "did this post actually go out?" from `geelark_tasks`
-- alone. A real iPhone reports nothing back, so on the Physical fleet the
-- answer is a `post_deliveries` row (PF-05) instead. Without that, Physical's
-- calendar would be a grid of posts that never read as delivered — technically
-- "pending" for ever. The new functions read BOTH sources; the originals still
-- read Geelark only.
--
-- PARITY. Proven before this was written, by running each new body inline with
-- literal arguments and diffing it against the live original with EXCEPT in
-- both directions:
--
--   month rollup   Sep + Oct 2026 grid, 'all' vs original: 0 rows each way
--   month days     same window, 'all' vs original: 0 rows each way
--   day detail     three separate days, 'all' vs original: 0 rows each way
--   content types  7d, 30d and all-time, 'all' vs original: 0 rows each way
--
-- and 'cloud' equalled 'all' everywhere, because no account is on the Physical
-- fleet yet (0 rows with delivery_mode = 'manual') and `post_deliveries` is
-- empty (0 rows). 'physical' correctly returned nothing.
--
-- NOT PROVEN WITH REAL WORK: nothing has ever been posted by hand, so the
-- manual half of the delivery join has never had a real row through it, and
-- the 'physical' branch has never had a real account to select. Both were
-- exercised against synthetic rows in a read-only query, which is a rehearsal,
-- not a live run. The first genuine test is the day the first account moves to
-- a phone.


-- ─────────────────────────────────────────────────────────────────────────────
-- The month grid: one row per (day, content type), for one fleet.
create or replace function public.calendar_month_rollup_fleet(
  p_start date,
  p_end date,
  p_fleet text default 'all'
)
 returns table(day date, content_type text, "character" text, bucket text, registry_lane boolean, live_n bigint, dead_n bigint, failed_n bigint, accounts bigint)
 language sql
 stable
as $function$
  with physical_profiles as (
    select a.geelark_profile
      from accounts a
     where a.delivery_mode = 'manual'
       and a.geelark_profile is not null
  ),
  t as (
    select
      u.posting_date::date as day,
      u.content_type,
      u.geelark_profile,
      u.content_id,
      u.posting_status,
      (u.posting_status in ('Ready','Posted')) as is_live
    from unified_posts u
    where u.posting_date is not null
      and u.posting_date::date between p_start and p_end
      and u.posting_status is distinct from 'Canceled'
      -- The fleet gate. `not exists` rather than `<> all`, so a post whose
      -- profile matches no account row (or has none at all) lands in Cloud
      -- instead of vanishing from both fleets.
      and (p_fleet = 'all'
           or (p_fleet = 'physical' and exists (
                 select 1 from physical_profiles pp
                  where pp.geelark_profile = u.geelark_profile))
           or (p_fleet = 'cloud' and not exists (
                 select 1 from physical_profiles pp
                  where pp.geelark_profile = u.geelark_profile)))
  ),
  tagged as (
    select t.*,
      coalesce(gt.any_fail, false) as failed
    from t
    left join lateral (
      -- BOTH DELIVERY SOURCES (PF-09). A Geelark task that ended 4 or 7, or a
      -- hand-posted delivery marked `failed`, is a failure; either kind
      -- succeeding cancels it, exactly as before.
      select bool_or(s.fail) and not coalesce(bool_or(s.ok), false) as any_fail
      from (
        select (g.status = 3) as ok, (g.status in (4, 7)) as fail
          from geelark_tasks g
         where g.source_carousel_id = t.content_id::text
           and g.serial_name = t.geelark_profile
        union all
        select (d.status = 'posted') as ok, (d.status = 'failed') as fail
          from post_deliveries d
          join accounts a on a.id = d.account_id
         where d.source_id = t.content_id::text
           and d.content_type = t.content_type
           and a.geelark_profile = t.geelark_profile
      ) s
    ) gt on true
  )
  select
    x.day,
    x.content_type,
    coalesce(a."character", '—') as "character",
    r.quota_bucket as bucket,
    -- A type with no ACTIVE registry row is posting outside the scheduler's
    -- accounting: it takes a time slot but no daily-cap slot, so an account
    -- can quietly exceed its cap. Surfaced rather than silently folded in.
    (r.content_type is not null) as registry_lane,
    count(*) filter (where x.is_live and not x.failed)      as live_n,
    count(*) filter (where not x.is_live and not x.failed)  as dead_n,
    count(*) filter (where x.failed)                        as failed_n,
    count(distinct x.geelark_profile)
      filter (where x.is_live and not x.failed)             as accounts
  from tagged x
  left join accounts a on a.geelark_profile = x.geelark_profile
  left join content_type_registry r
         on r.content_type = x.content_type and r.active
  group by 1, 2, 3, 4, 5
  having count(*) > 0
  order by 1, 6 desc, 2;
$function$;

comment on function public.calendar_month_rollup_fleet(date, date, text) is
  'PF-19: calendar_month_rollup limited to one fleet, and reading delivery from both geelark_tasks and post_deliveries (PF-09). The original is untouched and stays the fleet-wide, Geelark-only answer.';


-- ─────────────────────────────────────────────────────────────────────────────
-- Day totals for the grid, for one fleet.
--
-- A separate aggregate from the rollup above on purpose: a DISTINCT account
-- count cannot be recovered from the per-type rows without double-counting an
-- account that posts more than one type that day.
create or replace function public.calendar_month_days_fleet(
  p_start date,
  p_end date,
  p_fleet text default 'all'
)
 returns table(day date, live_n bigint, dead_n bigint, failed_n bigint, accounts bigint, off_registry boolean)
 language sql
 stable
as $function$
  with physical_profiles as (
    select a.geelark_profile
      from accounts a
     where a.delivery_mode = 'manual'
       and a.geelark_profile is not null
  ),
  t as (
    select
      u.posting_date::date as day,
      u.content_type,
      u.geelark_profile,
      u.content_id,
      (u.posting_status in ('Ready','Posted')) as is_live
    from unified_posts u
    where u.posting_date is not null
      and u.posting_date::date between p_start and p_end
      and u.posting_status is distinct from 'Canceled'
      and (p_fleet = 'all'
           or (p_fleet = 'physical' and exists (
                 select 1 from physical_profiles pp
                  where pp.geelark_profile = u.geelark_profile))
           or (p_fleet = 'cloud' and not exists (
                 select 1 from physical_profiles pp
                  where pp.geelark_profile = u.geelark_profile)))
  ),
  tagged as (
    select t.*, coalesce(gt.any_fail, false) as failed
    from t
    left join lateral (
      select bool_or(s.fail) and not coalesce(bool_or(s.ok), false) as any_fail
      from (
        select (g.status = 3) as ok, (g.status in (4, 7)) as fail
          from geelark_tasks g
         where g.source_carousel_id = t.content_id::text
           and g.serial_name = t.geelark_profile
        union all
        select (d.status = 'posted') as ok, (d.status = 'failed') as fail
          from post_deliveries d
          join accounts a on a.id = d.account_id
         where d.source_id = t.content_id::text
           and d.content_type = t.content_type
           and a.geelark_profile = t.geelark_profile
      ) s
    ) gt on true
  )
  select
    x.day,
    count(*) filter (where x.is_live and not x.failed)     as live_n,
    count(*) filter (where not x.is_live and not x.failed) as dead_n,
    count(*) filter (where x.failed)                       as failed_n,
    count(distinct x.geelark_profile)
      filter (where x.is_live and not x.failed)            as accounts,
    bool_or(r.content_type is null and x.is_live and not x.failed) as off_registry
  from tagged x
  left join content_type_registry r
         on r.content_type = x.content_type and r.active
  group by 1
  order by 1;
$function$;

comment on function public.calendar_month_days_fleet(date, date, text) is
  'PF-19: calendar_month_days limited to one fleet, and reading delivery from both geelark_tasks and post_deliveries (PF-09). The original is untouched.';


-- ─────────────────────────────────────────────────────────────────────────────
-- One day expanded, per account, for one fleet.
--
-- WHAT `delivery` MEANS, now that there are two sources:
--   'posted'   a Geelark task completed (status 3), OR the person ticked the
--              hand-posted delivery off as posted
--   'failed'   every attempt ended badly: Geelark 4/7, or the delivery was
--              marked failed
--   'pending'  something was handed out or scheduled and has not resolved yet
--   'none'     nothing was ever attempted for this row
--
-- A delivery somebody SKIPPED reads as 'pending'. Nothing in the app writes
-- that status today — there is no Skip button, only Posted, Failed, link and
-- undo — so this is a choice about a state that cannot yet occur. It reads as
-- still outstanding rather than as never-attempted, which is the safer of the
-- two wrong answers: the row stays visible instead of disappearing. When a
-- Skip button exists, decide it properly then.
--
-- `fail_desc` carries the note a person left when they marked a post failed,
-- in the same place Geelark's own message goes. `fail_code` stays NULL for a
-- hand-posted row: there is no code, and inventing one would put a made-up
-- number in front of the fail-code lookup table.
create or replace function public.calendar_day_detail_fleet(
  p_day date,
  p_fleet text default 'all'
)
 returns table(geelark_profile text, username text, "character" text, platform text, health text, is_active boolean, posting_paused boolean, content_type text, bucket text, registry_lane boolean, posting_time text, minute_of_day integer, posting_status text, content_id text, delivery text, fail_code text, fail_desc text)
 language sql
 stable
as $function$
  with physical_profiles as (
    select a.geelark_profile
      from accounts a
     where a.delivery_mode = 'manual'
       and a.geelark_profile is not null
  ),
  t as (
    select
      u.*,
      case when u.posting_time ~ '^\d{1,2}:\d{2}' then
        (split_part(u.posting_time, ':', 1))::int * 60
        + (substring(u.posting_time from '^\d{1,2}:(\d{2})'))::int
        + case
            when u.posting_time ~* 'PM' and (split_part(u.posting_time, ':', 1))::int < 12 then 720
            when u.posting_time ~* 'AM' and (split_part(u.posting_time, ':', 1))::int = 12 then -720
            else 0
          end
      end as mod_min
    from unified_posts u
    where u.posting_date is not null
      and u.posting_date::date = p_day
      and u.posting_status is distinct from 'Canceled'
      and (p_fleet = 'all'
           or (p_fleet = 'physical' and exists (
                 select 1 from physical_profiles pp
                  where pp.geelark_profile = u.geelark_profile))
           or (p_fleet = 'cloud' and not exists (
                 select 1 from physical_profiles pp
                  where pp.geelark_profile = u.geelark_profile)))
  )
  select
    t.geelark_profile,
    a.username,
    coalesce(a."character", '—') as "character",
    lower(coalesce(t.platform, a.platform, '')) as platform,
    coalesce(h.health, a.health_status) as health,
    a.is_active,
    a.posting_paused,
    t.content_type,
    r.quota_bucket as bucket,
    (r.content_type is not null) as registry_lane,
    t.posting_time,
    t.mod_min as minute_of_day,
    t.posting_status,
    t.content_id::text,
    case
      when gt.any_ok   then 'posted'
      when gt.any_fail then 'failed'
      when gt.n > 0    then 'pending'
      else 'none'
    end as delivery,
    gt.fail_code,
    gt.fail_desc
  from t
  left join accounts a on a.geelark_profile = t.geelark_profile
  left join v_account_health_v3 h on h.geelark_profile = t.geelark_profile
  left join content_type_registry r
         on r.content_type = t.content_type and r.active
  left join lateral (
    select
      bool_or(s.ok)   as any_ok,
      bool_or(s.fail) as any_fail,
      count(*)        as n,
      -- the most recent failure is the one worth showing, whichever fleet it
      -- came from
      (array_agg(s.fail_code order by s.at desc)
         filter (where s.fail_code is not null))[1] as fail_code,
      (array_agg(s.fail_desc order by s.at desc)
         filter (where s.fail_desc is not null))[1] as fail_desc
    from (
      select (g.status = 3) as ok, (g.status in (4, 7)) as fail,
             g.fail_code, g.fail_desc, g.created_at as at
        from geelark_tasks g
       where g.source_carousel_id = t.content_id::text
         and g.serial_name = t.geelark_profile
      union all
      select (d.status = 'posted') as ok, (d.status = 'failed') as fail,
             null::text as fail_code,
             case when d.status = 'failed' then d.note end as fail_desc,
             coalesce(d.done_at, d.created_at) as at
        from post_deliveries d
        join accounts a2 on a2.id = d.account_id
       where d.source_id = t.content_id::text
         and d.content_type = t.content_type
         and a2.geelark_profile = t.geelark_profile
    ) s
  ) gt on true
  -- A post with no parseable time is still a post; it sorts last rather than
  -- being dropped, so the day's total agrees with the month view.
  order by t.mod_min nulls last, t.geelark_profile;
$function$;

comment on function public.calendar_day_detail_fleet(date, text) is
  'PF-19: calendar_day_detail limited to one fleet, and reading delivery from both geelark_tasks and post_deliveries (PF-09). A hand-posted failure shows the note the person left as fail_desc. The original is untouched.';


-- ─────────────────────────────────────────────────────────────────────────────
-- Per-lane performance, for one fleet.
--
-- This one needed the accounts join ADDED, not narrowed: `content_type_stats`
-- never joined accounts at all. It counts measured posts straight out of the
-- two performance tables, which are keyed on the account HANDLE.
--
-- THE HANDLE ALONE IS NOT A KEY. A handle is unique only within a platform, so
-- the fleet match is on handle AND platform together — the same rule
-- analytics_rollup_fleet follows and the same mistake the 09-11 profile-cards
-- migration had to fix. Matching on the handle alone would let a Facebook or
-- Instagram account with the same name pull another platform's posts into its
-- fleet.
--
-- TWO NUMBERS ARE FILTERED, ONE IS NOT:
--   posts / views / medians / score   per fleet, from the performance tables
--   scheduled_ahead                   per fleet, from unified_posts by profile
--   last_ingest                       NOT filtered. It answers "when did the
--                                     feed last run", which is one fact for
--                                     the whole database, not a per-fleet one.
--
-- Every registry lane still appears in both fleets. A lane is a lane whichever
-- phones are posting it; it simply shows zero numbers in a fleet that has not
-- posted it. That is what makes the Content Types page usable on Physical from
-- day one instead of empty.
create or replace function public.content_type_stats_fleet(
  p_days integer default 28,
  p_fleet text default 'all'
)
 returns table(content_type text, display_name text, character_name text, quota_bucket text, media_shape text, lifecycle text, lifecycle_changed_at timestamp with time zone, lifecycle_note text, cadence_per_week integer, cadence_ceiling_per_week integer, cadence_before_pause integer, unified_poster_active boolean, posts bigint, views bigint, avg_views integer, median_views integer, best_views bigint, engagement bigint, eng_rate numeric, pct_dead integer, pct_ge500 integer, med_recent integer, med_prior integer, momentum_pct integer, score integer, tier text, confidence text, tiktok_posts bigint, instagram_posts bigint, last_posted_at timestamp with time zone, scheduled_ahead bigint, thumb_url text, thumb_content_id text, thumb_captured_at timestamp with time zone, last_ingest timestamp with time zone)
 language sql
 stable
as $function$
-- The handles on real phones, with the platform each one belongs to.
with physical_handles as (
  select a.username, a.platform
    from accounts a
   where a.delivery_mode = 'manual'
     and a.username is not null
),
physical_profiles as (
  select a.geelark_profile
    from accounts a
   where a.delivery_mode = 'manual'
     and a.geelark_profile is not null
),
-- One row per measured post. The platform is a literal on each branch, not a
-- column: post_performance is the Instagram table and carries no platform
-- column at all, and tt_post_performance's is uniformly 'tiktok'.
-- `account` is the handle, and it is carried here only so the fleet gate
-- below can match on it. Nothing downstream reads it.
perf_all as (
  select account, carousel_id, posted_at, views, total_engagement, 'tiktok'::text as platform
    from tt_post_performance
  union all
  select account, carousel_id, posted_at, views, total_engagement, 'instagram'::text
    from post_performance
),
perf as (
  select perf_all.* from perf_all
  where p_fleet = 'all'
     or (p_fleet = 'physical' and exists (
           select 1 from physical_handles ph
            where ph.username = perf_all.account
              and ph.platform = perf_all.platform))
     or (p_fleet = 'cloud' and not exists (
           select 1 from physical_handles ph
            where ph.username = perf_all.account
              and ph.platform = perf_all.platform))
),
-- One row per CONTENT id, not per placement.
--
-- unified_posts is a placement table: the same carousel sent to five profiles
-- is five rows with one content_id. Joining performance to it directly fanned
-- each measured post out across its placements. Collapsing here means a
-- performance row can match at most once, whatever the calendar does.
lane as (
  select content_id, min(content_type) as content_type
    from unified_posts
   where content_id is not null
   group by content_id
),
-- carousel_id -> content_id is the deterministic attribution join; posts
-- without a content id are untyped and correctly excluded.
f as (
  select l.content_type,
         coalesce(x.views, 0) as v,
         coalesce(x.total_engagement, 0) as eng,
         x.posted_at,
         x.platform
    from perf x
    join lane l on l.content_id = x.carousel_id
   where p_days is null
      or x.posted_at >= now() - make_interval(days => p_days)
),
agg as (
  select f.content_type,
         count(*) as posts,
         sum(f.v)::bigint as views,
         round(avg(f.v))::int as avg_views,
         percentile_cont(0.5) within group (order by f.v)::int as median_views,
         max(f.v)::bigint as best_views,
         sum(f.eng)::bigint as engagement,
         round(100.0 * sum(f.eng) / nullif(sum(f.v), 0), 1) as eng_rate,
         round(100.0 * count(*) filter (where f.v <= 10) / count(*))::int as pct_dead,
         round(100.0 * count(*) filter (where f.v >= 500) / count(*))::int as pct_ge500,
         percentile_cont(0.5) within group (order by f.v)
           filter (where f.posted_at >= now() - make_interval(days => coalesce(p_days, 3650) / 2))::int
           as med_recent,
         percentile_cont(0.5) within group (order by f.v)
           filter (where f.posted_at < now() - make_interval(days => coalesce(p_days, 3650) / 2))::int
           as med_prior,
         count(*) filter (where f.platform = 'tiktok') as tiktok_posts,
         count(*) filter (where f.platform <> 'tiktok') as instagram_posts,
         max(f.posted_at) as last_posted_at
    from f
   group by f.content_type
),
-- Same definition analytics_rollup uses, so the two pages never disagree
-- about how fresh the numbers are. Deliberately NOT per fleet.
ingest as (
  select greatest(
           coalesce((select max(ingested_at) from tt_post_performance), 'epoch'::timestamptz),
           coalesce((select max(ingested_at) from post_performance), 'epoch'::timestamptz)
         ) as at
),
-- Placement rows on purpose, NOT collapsed like `lane` above. This counts
-- posts that are going to go out, and one carousel placed on five profiles is
-- five posts — so the fleet gate here is per placement, by profile.
ahead as (
  select up.content_type, count(*) as n
    from unified_posts up
   where lower(coalesce(up.posting_status, '')) in ('ready', 'scheduled', 'hold')
     and up.posting_date is not null
     -- posting_date is a timestamptz pinned to UTC midnight, so converting it
     -- to ET walks it back to 20:00 the previous day and ::date loses a day.
     -- Compare the stored date directly, the way the calendar RPCs do.
     and up.posting_date::date >= (now() at time zone 'America/New_York')::date
     and (p_fleet = 'all'
          or (p_fleet = 'physical' and exists (
                select 1 from physical_profiles pp
                 where pp.geelark_profile = up.geelark_profile))
          or (p_fleet = 'cloud' and not exists (
                select 1 from physical_profiles pp
                 where pp.geelark_profile = up.geelark_profile)))
   group by up.content_type
),
scored as (
  select a.content_type,
         -- % change in median views, second half of the window vs the first.
         case when a.med_prior is null or a.med_prior = 0 then null
              else round(100.0 * a.med_recent / a.med_prior)::int - 100 end as momentum_pct,
         round(
             0.30 * greatest(0, least(100, round(100 * ln(greatest(a.median_views, 1) / 10.0) / ln(30.0))))
           + 0.20 * greatest(0, least(100, 100 - 2 * a.pct_dead))
           + 0.20 * least(100, round(a.pct_ge500 * (100 / 15.0)))
           + 0.20 * least(100, round(coalesce(a.eng_rate, 0) * (100 / 6.0)))
           + 0.10 * (case when a.med_prior is null or a.med_prior = 0 then 50
                          else greatest(0, least(100, round(50.0 * a.med_recent / a.med_prior))) end)
         )::int as score
    from agg a
)
select r.content_type,
       r.display_name,
       r."character",
       r.quota_bucket,
       r.media_shape,
       r.lifecycle,
       r.lifecycle_changed_at,
       r.lifecycle_note,
       r.cadence_per_week,
       r.cadence_ceiling_per_week,
       r.cadence_before_pause,
       r.unified_poster_active,
       coalesce(a.posts, 0),
       coalesce(a.views, 0),
       a.avg_views,
       a.median_views,
       coalesce(a.best_views, 0),
       coalesce(a.engagement, 0),
       a.eng_rate,
       a.pct_dead,
       a.pct_ge500,
       a.med_recent,
       a.med_prior,
       s.momentum_pct,
       s.score,
       case when s.score >= 70 then 'A'
            when s.score >= 55 then 'B'
            when s.score >= 40 then 'C'
            when s.score is null then null
            else 'D' end,
       -- Under 8 posts a median is a coin flip; say so rather than ranking on it.
       case when coalesce(a.posts, 0) < 8 then 'low'
            when a.posts < 20 then 'medium'
            else 'high' end,
       coalesce(a.tiktok_posts, 0),
       coalesce(a.instagram_posts, 0),
       a.last_posted_at,
       coalesce(h.n, 0),
       t.thumb_url,
       t.source_content_id,
       t.captured_at,
       (select at from ingest)
  from content_type_registry r
  left join agg a on a.content_type = r.content_type
  left join scored s on s.content_type = r.content_type
  left join ahead h on h.content_type = r.content_type
  left join content_type_thumbnails t on t.content_type = r.content_type
 order by r."character", coalesce(s.score, -1) desc, r.content_type;
$function$;

comment on function public.content_type_stats_fleet(integer, text) is
  'PF-19: content_type_stats limited to one fleet. The accounts join it never had, matching handle AND platform. Every registry lane still appears in both fleets, with zero numbers where that fleet has not posted it. last_ingest is deliberately fleet-wide. The original is untouched.';


-- ─────────────────────────────────────────────────────────────────────────────
-- GRANTS. Four functions CREATED, so anon and authenticated are named
-- explicitly: Supabase ships ALTER DEFAULT PRIVILEGES granting EXECUTE on new
-- public functions to both by name, and "revoke from public" leaves a grant
-- made to a named role standing. That is the mistake that needed its own
-- follow-up migration on 2026-09-10; see supabase/migrations/README.md.
--
-- The originals keep the grants they have — including content_type_stats,
-- which anon can still execute. Narrowing that here would make the counts
-- recorded in BACKLOG.md stop meaning what they say.
revoke all on function public.calendar_month_rollup_fleet(date, date, text) from public, anon, authenticated;
revoke all on function public.calendar_month_days_fleet(date, date, text)   from public, anon, authenticated;
revoke all on function public.calendar_day_detail_fleet(date, text)         from public, anon, authenticated;
revoke all on function public.content_type_stats_fleet(integer, text)       from public, anon, authenticated;

grant execute on function public.calendar_month_rollup_fleet(date, date, text) to service_role;
grant execute on function public.calendar_month_days_fleet(date, date, text)   to service_role;
grant execute on function public.calendar_day_detail_fleet(date, text)         to service_role;
grant execute on function public.content_type_stats_fleet(integer, text)       to service_role;

-- Read the ACLs back after applying. Want exactly:
--   postgres=X/postgres | service_role=X/postgres
--
--   select p.proname, array_to_string(p.proacl,' | ') as acl
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and p.proname in ('calendar_month_rollup_fleet','calendar_month_days_fleet',
--                        'calendar_day_detail_fleet','content_type_stats_fleet');
