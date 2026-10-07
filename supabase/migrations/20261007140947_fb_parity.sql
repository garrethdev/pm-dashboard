-- PF-24 parity (Garreth, 2026-10-07: "full parity" with TikTok and Instagram).
--
-- 1. content_type_stats_fleet (Content types page) counts Facebook reels in
--    each lane's figures. instagram_posts now counts Instagram only; before,
--    it counted "everything that is not TikTok", which would have swallowed
--    Facebook. The return shape is unchanged.
-- 2. v_dashboard_last5_views (the accounts list's median of the last five
--    posts) gains a Facebook branch.
-- 3. v_fb_weekly_outliers / v_fb_latest_outliers: each Facebook account's top
--    three and bottom three reels per week, the same shape as the TikTok
--    views, for the weekly report's AI brief. Facebook posts are not judged,
--    so the judge columns are empty. week_of on Facebook is the Monday of the
--    posting week (TikTok's is its ingest date). Service role only.
-- Edited in place from the live definitions, as health_reads_facebook.
do $$
declare
  src text;
  fixed text;
begin
  select pg_get_functiondef('public.content_type_stats_fleet(integer, text)'::regprocedure) into src;
  fixed := replace(src,
$a$  select account, carousel_id, posted_at, views, total_engagement, 'instagram'::text
    from post_performance
),$a$,
$a$  select account, carousel_id, posted_at, views, total_engagement, 'instagram'::text
    from post_performance
  union all
  select account, carousel_id, posted_at, views, total_engagement, 'facebook'::text
    from fb_post_performance
),$a$);
  if fixed = src then raise exception 'content_type_stats_fleet: perf_all not found'; end if;
  src := fixed;
  fixed := replace(src,
$a$count(*) filter (where f.platform <> 'tiktok') as instagram_posts$a$,
$a$count(*) filter (where f.platform = 'instagram') as instagram_posts$a$);
  if fixed = src then raise exception 'content_type_stats_fleet: instagram_posts not found'; end if;
  execute fixed;

  src := pg_get_viewdef('public.v_dashboard_last5_views'::regclass, true);
  fixed := replace(src,
$a$          WHERE post_performance.views IS NOT NULL AND post_performance.posted_at IS NOT NULL
        )
 SELECT 'tiktok'::text AS platform,$a$,
$a$          WHERE post_performance.views IS NOT NULL AND post_performance.posted_at IS NOT NULL
        ), fb_ranked AS (
         SELECT fb_post_performance.account,
            fb_post_performance.views,
            row_number() OVER (PARTITION BY fb_post_performance.account ORDER BY fb_post_performance.posted_at DESC) AS rn
           FROM fb_post_performance
          WHERE fb_post_performance.views IS NOT NULL AND fb_post_performance.posted_at IS NOT NULL
        )
 SELECT 'tiktok'::text AS platform,$a$);
  if fixed = src then raise exception 'v_dashboard_last5_views: ranked CTEs not found'; end if;
  src := fixed;
  fixed := replace(src,
$a$  GROUP BY ig_ranked.account;$a$,
$a$  GROUP BY ig_ranked.account
UNION ALL
 SELECT 'facebook'::text AS platform,
    fb_ranked.account,
    percentile_cont(0.5::double precision) WITHIN GROUP (ORDER BY (fb_ranked.views::double precision)) AS median_views_last5,
    count(*) AS posts_counted
   FROM fb_ranked
  WHERE fb_ranked.rn <= 5
  GROUP BY fb_ranked.account;$a$);
  if fixed = src then raise exception 'v_dashboard_last5_views: instagram branch end not found'; end if;
  execute 'create or replace view public.v_dashboard_last5_views as ' || fixed;
end
$$;

create view public.v_fb_weekly_outliers as
 WITH ranked AS (
         SELECT p.account,
            p.post_id,
            p.post_url,
            p.posted_at,
            p.format,
            p.caption_snippet,
            p.views,
            p.likes,
            p.comments,
            p.shares,
            p.saves,
            p.total_engagement,
            p.week_of,
            p.carousel_id,
            row_number() OVER (PARTITION BY p.account, p.week_of ORDER BY p.views DESC) AS rank_top,
            row_number() OVER (PARTITION BY p.account, p.week_of ORDER BY p.views) AS rank_bottom,
            count(*) OVER (PARTITION BY p.account, p.week_of) AS posts_in_week
           FROM fb_post_performance p
          WHERE p.week_of IS NOT NULL
        )
 SELECT account,
    week_of,
    post_id,
    post_url,
    posted_at,
    format,
    caption_snippet,
    views,
    likes,
    comments,
    shares,
    saves,
    total_engagement,
    carousel_id,
    false AS judged,
    NULL::numeric AS judge_score,
        CASE
            WHEN rank_top <= 3 THEN 'top_outlier'::text
            WHEN rank_bottom <= 3 AND posts_in_week > 3 THEN 'bottom_outlier'::text
            ELSE 'mid'::text
        END AS outlier_class,
        CASE
            WHEN rank_top <= 3 THEN rank_top
            ELSE rank_bottom
        END AS rank,
    NULL::text AS judge_breakdown
   FROM ranked
  WHERE rank_top <= 3 OR rank_bottom <= 3 AND posts_in_week > 3
  ORDER BY week_of DESC, account, views DESC;

create view public.v_fb_latest_outliers as
 SELECT *
   FROM public.v_fb_weekly_outliers
  WHERE week_of = (SELECT max(o.week_of) FROM public.v_fb_weekly_outliers o);

revoke all on public.v_fb_weekly_outliers, public.v_fb_latest_outliers from public, anon, authenticated;
grant select on public.v_fb_weekly_outliers, public.v_fb_latest_outliers to service_role;
