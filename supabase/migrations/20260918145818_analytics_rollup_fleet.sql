-- PF-17: Analytics for one fleet at a time (Garreth, 2026-09-18).
--
-- The dashboard has two fleets: Cloud (accounts on Geelark) and Physical
-- (accounts on real iPhones), chosen per person with the switch at the top
-- right. Garreth's rule: an account's data follows the account, so a fleet's
-- numbers are simply the existing numbers limited to the accounts that are in
-- that fleet today. No move-date split.
--
-- This is analytics_rollup(p_days, p_platform) with one change: the post stream
-- `u` is limited to the fleet before anything is counted. analytics_rollup
-- itself is NOT altered; it stays the fleet-wide answer. If one of the two is
-- ever changed, change the other to match.
--
--   p_fleet = 'all'      every post, identical to analytics_rollup
--   p_fleet = 'physical' posts whose account (handle AND platform) is an
--                        accounts row with delivery_mode = 'manual'
--   p_fleet = 'cloud'    everything else, INCLUDING posts whose handle matches
--                        no accounts row. Those are Geelark-era leftovers, and
--                        putting them here is what makes cloud + physical add
--                        up to 'all' exactly.
--
-- The fleet match uses handle and platform together, not the handle alone, so
-- a Facebook or Instagram account sharing a handle can never pull another
-- platform's posts into its fleet. `last_ingest` deliberately ignores the
-- fleet: it answers "when did the feed last run", which is one fact for both.
create or replace function public.analytics_rollup_fleet(
  p_days integer default 7,
  p_platform text default 'all',
  p_fleet text default 'all'
)
 returns jsonb
 language sql
 stable
as $function$
with params as (
  select case when p_days is null then '-infinity'::timestamptz
              else now() - make_interval(days => p_days) end as from_ts,
         case when p_days is null or p_days > 31 then 'week' else 'day' end as bucket
),
u_all as (
  select 'tiktok'::text as platform, account, posted_at, views, likes, comments, shares,
         saves, total_engagement, carousel_id, ingested_at from tt_post_performance
  union all
  select 'instagram', account, posted_at, views, likes, comments, shares,
         saves, total_engagement, carousel_id, ingested_at from post_performance
),
physical_handles as (
  select username, platform from accounts
  where delivery_mode = 'manual' and username is not null
),
u as (
  select u_all.* from u_all
  where p_fleet = 'all'
     or (p_fleet = 'physical' and exists (
           select 1 from physical_handles ph
           where ph.username = u_all.account and ph.platform = u_all.platform))
     or (p_fleet = 'cloud' and not exists (
           select 1 from physical_handles ph
           where ph.username = u_all.account and ph.platform = u_all.platform))
),
f as (
  select u.* from u, params p
  where u.posted_at >= p.from_ts and u.posted_at is not null
    and (p_platform = 'all' or u.platform = p_platform)
),
prev_f as (
  select u.* from u, params p
  where p_days is not null
    and u.posted_at >= p.from_ts - make_interval(days => p_days)
    and u.posted_at <  p.from_ts
    and (p_platform = 'all' or u.platform = p_platform)
),
acct as (
  select f.account, min(f.platform) as platform, max(a.character) as character,
         max(a.geelark_profile) as geelark_profile,
         bool_or(coalesce(a.is_active, false)) as is_active,
         count(*) as posts, coalesce(sum(f.views), 0) as views,
         coalesce(sum(f.likes), 0) as likes, coalesce(sum(f.comments), 0) as comments,
         coalesce(sum(f.shares), 0) as shares, coalesce(sum(f.saves), 0) as saves,
         coalesce(sum(f.total_engagement), 0) as engagement,
         round(coalesce(sum(f.views), 0) / nullif(count(*), 0)::numeric) as avg_views,
         coalesce(percentile_cont(0.5) within group (order by coalesce(f.views, 0)::float8), 0)::int as median_views,
         count(*) filter (where coalesce(f.views, 0) <= 10) as suppressed,
         round(100.0 * count(*) filter (where coalesce(f.views, 0) <= 10) / nullif(count(*), 0), 0) as suppressed_pct,
         round(100.0 * coalesce(sum(f.total_engagement), 0) / nullif(sum(f.views), 0), 1) as eng_rate
  from f left join accounts a on a.username = f.account group by f.account
),
slots as (
  select generate_series(
           date_trunc(p.bucket, greatest(p.from_ts, (select min(posted_at) from f))),
           date_trunc(p.bucket, now()) - (case when p.bucket = 'week' then interval '7 days' else interval '1 day' end),
           (case when p.bucket = 'week' then interval '7 days' else interval '1 day' end)
         ) as slot, p.bucket
  from params p
),
series as (
  select to_char(s.slot, 'YYYY-MM-DD') as bucket_key,
         count(f.*) as posts, coalesce(sum(f.views), 0) as views,
         round(coalesce(sum(f.views), 0) / nullif(count(f.*), 0)::numeric) as avg_views,
         coalesce(sum(f.total_engagement), 0) as engagement,
         round(100.0 * coalesce(sum(f.total_engagement), 0) / nullif(sum(f.views), 0), 2) as engagement_rate,
         coalesce(sum(f.views) filter (where f.platform = 'tiktok'), 0) as tiktok_views,
         coalesce(sum(f.views) filter (where f.platform = 'instagram'), 0) as instagram_views,
         count(f.*) filter (where f.platform = 'tiktok')::int as tiktok_posts,
         count(f.*) filter (where f.platform = 'instagram')::int as instagram_posts,
         round(coalesce(sum(f.views) filter (where f.platform = 'tiktok'), 0)
               / nullif(count(f.*) filter (where f.platform = 'tiktok'), 0)::numeric) as tiktok_avg_views,
         round(coalesce(sum(f.views) filter (where f.platform = 'instagram'), 0)
               / nullif(count(f.*) filter (where f.platform = 'instagram'), 0)::numeric) as instagram_avg_views
  from slots s left join f on date_trunc(s.bucket, f.posted_at) = s.slot
  group by s.slot
),
chars as (
  select coalesce(a.character, 'unassigned') as character,
         count(distinct f.account) as accounts, count(*) as posts,
         coalesce(sum(f.views), 0) as views,
         round(coalesce(sum(f.views), 0) / nullif(count(*), 0)::numeric) as avg_views
  from f left join accounts a on a.username = f.account group by 1
),
ct as (
  select coalesce(a.character, 'unassigned') as character, up.content_type,
         coalesce(r.display_name, up.content_type) as display_name,
         count(*) as posts, coalesce(sum(f.views), 0) as views,
         round(coalesce(sum(f.views), 0) / nullif(count(*), 0)::numeric) as avg_views,
         coalesce(percentile_cont(0.5) within group (order by coalesce(f.views, 0)::float8), 0)::int as median_views,
         max(f.views) as best_views, coalesce(sum(f.total_engagement), 0) as engagement,
         round(100.0 * coalesce(sum(f.total_engagement), 0) / nullif(sum(f.views), 0), 1) as eng_rate
  from f
  join unified_posts up on up.content_id = f.carousel_id
  join content_type_registry r on r.content_type = up.content_type
  left join accounts a on a.username = f.account
  -- live lanes only
  where coalesce(r.active, false) and coalesce(r.unified_poster_active, false)
  group by 1, up.content_type, r.display_name
)
select jsonb_build_object(
  'range_days', p_days, 'bucket', (select bucket from params),
  'last_ingest', (select max(ingested_at) from u_all),
  'typed_posts', (select count(*) from f
                    join unified_posts up on up.content_id = f.carousel_id
                    join content_type_registry r on r.content_type = up.content_type
                   where coalesce(r.active,false) and coalesce(r.unified_poster_active,false)),
  'summary', (select jsonb_build_object('posts', count(*), 'views', coalesce(sum(views), 0),
      'avg_views', round(coalesce(sum(views), 0) / nullif(count(*), 0)::numeric),
      'engagement', coalesce(sum(total_engagement), 0),
      'engagement_rate', round(100.0 * coalesce(sum(total_engagement), 0) / nullif(sum(views), 0), 2),
      'accounts', count(distinct account)) from f),
  'previous', (select case when count(*) = 0 then null else jsonb_build_object(
      'posts', count(*), 'views', coalesce(sum(views), 0),
      'avg_views', round(coalesce(sum(views), 0) / nullif(count(*), 0)::numeric),
      'engagement', coalesce(sum(total_engagement), 0),
      'engagement_rate', round(100.0 * coalesce(sum(total_engagement), 0) / nullif(sum(views), 0), 2),
      'accounts', count(distinct account)) end from prev_f),
  'best_account', (select to_jsonb(x) from (
      select account, platform, views, posts, avg_views, median_views, eng_rate, geelark_profile
      from acct where is_active order by median_views desc, views desc nulls last limit 1) x),
  'series', coalesce((select jsonb_agg(to_jsonb(s) order by s.bucket_key) from series s), '[]'::jsonb),
  'accounts', coalesce((select jsonb_agg(to_jsonb(a2) order by a2.median_views desc) from acct a2), '[]'::jsonb),
  'characters', coalesce((select jsonb_agg(to_jsonb(c) order by c.character) from chars c), '[]'::jsonb),
  'content_types', coalesce((select jsonb_agg(to_jsonb(t) order by t.character, t.median_views desc) from ct t), '[]'::jsonb)
)
$function$;

-- Same exposure as analytics_rollup: the app calls it with the service role.
-- Named explicitly, because "from public" alone leaves anon and authenticated
-- granted on this project.
revoke all on function public.analytics_rollup_fleet(integer, text, text) from public, anon, authenticated;
grant execute on function public.analytics_rollup_fleet(integer, text, text) to service_role;
