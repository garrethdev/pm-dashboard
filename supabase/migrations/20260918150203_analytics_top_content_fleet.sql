-- PF-17: the analysis page's top content, for one fleet at a time.
--
-- analytics_top_content(p_days, p_limit) with the same fleet rule as
-- analytics_rollup_fleet: Physical is the posts of accounts on real phones
-- today (handle AND platform), Cloud is everything else, 'all' is identical to
-- the original. analytics_top_content itself is NOT altered; if one of the two
-- is ever changed, change the other to match.
create or replace function public.analytics_top_content_fleet(
  p_days integer default 7,
  p_limit integer default 12,
  p_fleet text default 'all'
)
 returns jsonb
 language sql
 stable
as $function$
with params as (
  select case when p_days is null then '-infinity'::timestamptz
              else now() - make_interval(days => p_days) end as from_ts
),
u_all as (
  select 'tiktok'::text as platform, account, post_id, post_url, caption_snippet, format,
         views, total_engagement, likes, comments, shares, saves, posted_at,
         nullif(judge_score::text, '')::numeric as judge_score,
         case when judge_breakdown ~ '^\s*\{' then judge_breakdown::jsonb end as jb
    from tt_post_performance
  union all
  select 'instagram', account, post_id, post_url, caption_snippet, format,
         views, total_engagement, likes, comments, shares, saves, posted_at,
         judge_score::numeric, judge_breakdown
    from post_performance
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
top as (
  select u.* from u, params p
  where u.posted_at >= p.from_ts and u.posted_at is not null
  order by u.views desc nulls last
  limit greatest(p_limit, 1)
)
select jsonb_build_object(
  'range_days', p_days,
  'judged',     (select count(*) from top where jb is not null),
  'posts', coalesce((
    select jsonb_agg(jsonb_build_object(
      'account',    account,
      'platform',   platform,
      'postId',     post_id,
      'url',        post_url,
      'caption',    caption_snippet,
      'mediaType',  coalesce(jb ->> 'media_type', format),
      'views',      coalesce(views, 0),
      'engagement', coalesce(total_engagement, 0),
      'likes',      coalesce(likes, 0),
      'comments',   coalesce(comments, 0),
      'shares',     coalesce(shares, 0),
      'saves',      coalesce(saves, 0),
      'engRate',    round(100.0 * coalesce(total_engagement, 0) / nullif(views, 0), 1),
      'postedAt',   posted_at,
      'score',      judge_score,
      'verdict',    jb ->> 'verdict_summary',
      'scores',     jb -> 'scores'
    ) order by views desc nulls last)
    from top), '[]'::jsonb)
)
$function$;

revoke all on function public.analytics_top_content_fleet(integer, integer, text) from public, anon, authenticated;
grant execute on function public.analytics_top_content_fleet(integer, integer, text) to service_role;
