-- scheduled_ahead lost a day.
--
-- unified_posts.posting_date is a timestamptz pinned to UTC midnight, so
-- `(posting_date at time zone 'America/New_York')::date` walks it back to 20:00
-- the previous day and the cast drops a day. The comparison therefore meant
-- "from tomorrow" and today's scheduled posts were not counted — filler read 14
-- when it was 46, and six lanes read 0 while holding scheduled rows.
--
-- The calendar RPCs already compare `posting_date::date` directly; this matches
-- them. Only the `ahead` CTE changes; the rest is re-stated because a function
-- body is replaced whole.

drop function if exists content_type_scheduled_ahead_probe();

create or replace function content_type_stats(p_days integer default 28)
returns table (
  content_type text,
  display_name text,
  character_name text,
  quota_bucket text,
  media_shape text,
  lifecycle text,
  lifecycle_changed_at timestamptz,
  lifecycle_note text,
  cadence_per_week integer,
  cadence_ceiling_per_week integer,
  cadence_before_pause integer,
  unified_poster_active boolean,
  posts bigint,
  views bigint,
  avg_views integer,
  median_views integer,
  best_views bigint,
  engagement bigint,
  eng_rate numeric,
  pct_dead integer,
  pct_ge500 integer,
  med_recent integer,
  med_prior integer,
  momentum_pct integer,
  score integer,
  tier text,
  confidence text,
  tiktok_posts bigint,
  instagram_posts bigint,
  last_posted_at timestamptz,
  -- Rows already on the calendar for this lane. Pausing a lane stops these
  -- too: unified_posts_due joins the registry on active, so a scheduled post
  -- of a paused type is quietly skipped rather than posted.
  scheduled_ahead bigint,
  thumb_url text,
  thumb_content_id text,
  thumb_captured_at timestamptz
)
language sql
stable
as $$
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
-- carousel_id -> unified_posts.content_id is the deterministic attribution
-- join; posts without a content id are untyped and correctly excluded.
f as (
  select up.content_type,
         coalesce(x.views, 0) as v,
         coalesce(x.total_engagement, 0) as eng,
         x.posted_at,
         x.platform
    from perf x
    join unified_posts up on up.content_id = x.carousel_id
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
       t.captured_at
  from content_type_registry r
  left join agg a on a.content_type = r.content_type
  left join scored s on s.content_type = r.content_type
  left join ahead h on h.content_type = r.content_type
  left join content_type_thumbnails t on t.content_type = r.content_type
 order by r."character", coalesce(s.score, -1) desc, r.content_type;
$$;
