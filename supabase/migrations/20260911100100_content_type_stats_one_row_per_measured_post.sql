-- Lane performance counted a post once per place it was sent, not once.
--
-- From the 2026-09-09 external review, which raised this as an unproven
-- caution. It is proven now.
--
-- `unified_posts` holds one row per PLACEMENT: the same carousel scheduled to
-- five profiles is five rows sharing one `content_id`. `content_type_stats()`
-- joined measured performance rows straight to that table on
-- `up.content_id = x.carousel_id`, so every measured post was multiplied by
-- however many profiles its content had been placed on.
--
-- Measured live 2026-09-11. Two content ids have more than one placement row
-- (CAR-045 with 2, CAR-047 with 5). CAR-047 has one Instagram performance row,
-- and it was being counted five times. Over the all-time window that made
-- `rich_life_carousel` read:
--
--     posts    284   ->  280 true
--     views  62,684  ->  62,664 true
--     avg       221  ->  224 true
--
-- Small — 4 phantom posts — and on a lane that is retired, so no live decision
-- was made on it. It is still a wrong number, and it grows with exactly the
-- thing the calendar is designed to do more of: place one piece of content on
-- several profiles.
--
-- The fix collapses `unified_posts` to one row per content id before the join,
-- so a performance row can only ever match once. Everything else in the
-- function is unchanged, byte for byte.
--
-- NOT changed, deliberately: the `ahead` CTE still counts placement rows.
-- "Scheduled ahead" is a count of posts that will go out, and five profiles
-- posting the same carousel really is five posts. Only MEASURED performance
-- needed collapsing.
--
-- NOT changed, deliberately: this function's grants. It is currently executable
-- by `anon` and `authenticated`, which is part of the open anon-key finding in
-- BACKLOG.md — held open on Garreth's instruction of 2026-09-11, "do not
-- revoke". CREATE OR REPLACE preserves the existing ACL, so this migration
-- leaves that exactly as it found it rather than quietly hardening one function
-- inside an unrelated fix. Read it back after applying and expect it unchanged:
--   select p.proname, array_to_string(p.proacl,' | ')
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'content_type_stats';

CREATE OR REPLACE FUNCTION public.content_type_stats(p_days integer DEFAULT 28)
 RETURNS TABLE(content_type text, display_name text, character_name text, quota_bucket text, media_shape text, lifecycle text, lifecycle_changed_at timestamp with time zone, lifecycle_note text, cadence_per_week integer, cadence_ceiling_per_week integer, cadence_before_pause integer, unified_poster_active boolean, posts bigint, views bigint, avg_views integer, median_views integer, best_views bigint, engagement bigint, eng_rate numeric, pct_dead integer, pct_ge500 integer, med_recent integer, med_prior integer, momentum_pct integer, score integer, tier text, confidence text, tiktok_posts bigint, instagram_posts bigint, last_posted_at timestamp with time zone, scheduled_ahead bigint, thumb_url text, thumb_content_id text, thumb_captured_at timestamp with time zone, last_ingest timestamp with time zone)
 LANGUAGE sql
 STABLE
AS $function$
-- One row per measured post. The platform is a literal on each branch, not a
-- column: post_performance is the Instagram table and carries no platform
-- column at all, and tt_post_performance's is uniformly 'tiktok'.
with perf as (
  select carousel_id, posted_at, views, total_engagement, 'tiktok'::text as platform
    from tt_post_performance
  union all
  select carousel_id, posted_at, views, total_engagement, 'instagram'::text
    from post_performance
),
-- One row per CONTENT id, not per placement.
--
-- unified_posts is a placement table: the same carousel sent to five profiles
-- is five rows with one content_id. Joining performance to it directly fanned
-- each measured post out across its placements. Collapsing here means a
-- performance row can match at most once, whatever the calendar does.
--
-- content_type is a property of the content, so every row sharing a content_id
-- should agree on it — verified live 2026-09-11 for both duplicated ids. min()
-- makes the choice deterministic rather than whatever the planner reached
-- first, in case that ever stops being true.
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
-- about how fresh the numbers are.
ingest as (
  select greatest(
           coalesce((select max(ingested_at) from tt_post_performance), 'epoch'::timestamptz),
           coalesce((select max(ingested_at) from post_performance), 'epoch'::timestamptz)
         ) as at
),
-- Placement rows on purpose, NOT collapsed like `lane` above. This counts
-- posts that are going to go out, and one carousel placed on five profiles is
-- five posts.
ahead as (
  select up.content_type, count(*) as n
    from unified_posts up
   where lower(coalesce(up.posting_status, '')) in ('ready', 'scheduled', 'hold')
     and up.posting_date is not null
     -- posting_date is a timestamptz pinned to UTC midnight, so converting it
     -- to ET walks it back to 20:00 the previous day and ::date loses a day.
     -- Compare the stored date directly, the way the calendar RPCs do.
     and up.posting_date::date >= (now() at time zone 'America/New_York')::date
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
