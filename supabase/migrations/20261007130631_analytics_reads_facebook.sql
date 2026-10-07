-- PF-24: the Analytics page reads Facebook.
--
-- analytics_rollup_fleet and analytics_top_content_fleet gain fb_post_performance
-- as a third platform, and the rollup's series gains facebook_views /
-- facebook_posts / facebook_avg_views beside the TikTok and Instagram ones.
-- Edited in place from the live definitions, like health_reads_facebook.
-- Facebook accounts are all on Physical (delivery_mode manual), so the Cloud
-- figures do not move; Physical's "All platforms" now includes Facebook.
-- The older fleet-less analytics_rollup / analytics_top_content are not used
-- by the app any more and are left alone.
do $$
declare
  src text;
  fixed text;
begin
  select pg_get_functiondef('public.analytics_rollup_fleet(integer, text, text)'::regprocedure) into src;
  fixed := replace(src,
$a$         saves, total_engagement, carousel_id, ingested_at from post_performance
),$a$,
$a$         saves, total_engagement, carousel_id, ingested_at from post_performance
  union all
  select 'facebook', account, posted_at, views, likes, comments, shares,
         saves, total_engagement, carousel_id, ingested_at from fb_post_performance
),$a$);
  if fixed = src then raise exception 'analytics_rollup_fleet: u_all not found'; end if;
  src := fixed;
  fixed := replace(src,
$a$               / nullif(count(f.*) filter (where f.platform = 'instagram'), 0)::numeric) as instagram_avg_views
$a$,
$a$               / nullif(count(f.*) filter (where f.platform = 'instagram'), 0)::numeric) as instagram_avg_views,
         coalesce(sum(f.views) filter (where f.platform = 'facebook'), 0) as facebook_views,
         count(f.*) filter (where f.platform = 'facebook')::int as facebook_posts,
         round(coalesce(sum(f.views) filter (where f.platform = 'facebook'), 0)
               / nullif(count(f.*) filter (where f.platform = 'facebook'), 0)::numeric) as facebook_avg_views
$a$);
  if fixed = src then raise exception 'analytics_rollup_fleet: series not found'; end if;
  -- Cloud has no Facebook accounts, so the Facebook robot's run time must not
  -- stand in for Cloud's "last updated" and hide a stalled TikTok read.
  src := fixed;
  fixed := replace(src,
$a$  'last_ingest', (select max(ingested_at) from u_all),$a$,
$a$  'last_ingest', (select max(ingested_at) from u_all where p_fleet <> 'cloud' or platform <> 'facebook'),$a$);
  if fixed = src then raise exception 'analytics_rollup_fleet: last_ingest not found'; end if;
  execute fixed;

  select pg_get_functiondef('public.analytics_top_content_fleet(integer, integer, text)'::regprocedure) into src;
  fixed := replace(src,
$a$         judge_score::numeric, judge_breakdown
    from post_performance
),$a$,
$a$         judge_score::numeric, judge_breakdown
    from post_performance
  union all
  select 'facebook', account, post_id, post_url, caption_snippet, format,
         views, total_engagement, likes, comments, shares, saves, posted_at,
         null::numeric, null::jsonb
    from fb_post_performance
),$a$);
  if fixed = src then raise exception 'analytics_top_content_fleet: u_all not found'; end if;
  execute fixed;
end
$$;
