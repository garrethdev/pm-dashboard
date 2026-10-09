-- Facebook photo posts (carousels) have no view count (Czedrick, 2026-10-09:
-- most content will be carousels).
--
-- The Facebook robot now stores photo posts with likes and comments and views
-- left empty: Facebook shows a photo post's views to nobody but the owner. Every
-- view-based figure below read an empty view count as 0, which would have
-- scored each carousel as a dead post. Each now skips posts with no view
-- count; counts of posts and totals of likes still include them.
--
-- No TikTok or Instagram row has an empty view count (checked 2026-10-09:
-- 0 of 2,428 and 0 of 955), so their figures do not move. Edited in place from
-- the live definitions, as health_reads_facebook.
do $$
declare
  d text;
  n text;
  w text;
begin
  -- 1. v_account_view_health: the "matured posts" counts are the denominators
  --    of the suppressed share, so they count posts with a view count only.
  --    posts_7d / posts_28d / perf_rows_7d still count every post, so a
  --    carousel-only account reads as posting, not as "tracking broken".
  d := pg_get_viewdef('public.v_account_view_health'::regclass, true);
  foreach w in array array['7', '28', '14'] loop
    n := replace(d,
      format($a$count(p.*) FILTER (WHERE p.posted_at >= (now() - '%s days'::interval) AND p.posted_at <= (now() - '48:00:00'::interval)) AS mat_posts_%sd$a$, w, w),
      format($a$count(p.views) FILTER (WHERE p.posted_at >= (now() - '%s days'::interval) AND p.posted_at <= (now() - '48:00:00'::interval)) AS mat_posts_%sd$a$, w, w));
    if n = d then raise exception 'v_account_view_health: mat_posts_%d not found', w; end if;
    d := n;
  end loop;
  execute 'create or replace view public.v_account_view_health as ' || d;

  -- 2. v_account_health_v3: "the last eight posts" are the last eight with views.
  d := pg_get_viewdef('public.v_account_health_v3'::regclass, true);
  n := replace(d,
$a$            'facebook'::text AS text
           FROM fb_post_performance
        ), ranked AS ($a$,
$a$            'facebook'::text AS text
           FROM fb_post_performance
          WHERE fb_post_performance.views IS NOT NULL
        ), ranked AS ($a$);
  if n = d then raise exception 'v_account_health_v3: facebook branch not found'; end if;
  execute 'create or replace view public.v_account_health_v3 as ' || n;

  -- 3. v_fb_weekly_outliers: top and bottom by views, so posts with views only.
  d := pg_get_viewdef('public.v_fb_weekly_outliers'::regclass, true);
  n := replace(d,
    $a$WHERE p.week_of IS NOT NULL$a$,
    $a$WHERE p.week_of IS NOT NULL AND p.views IS NOT NULL$a$);
  if n = d then raise exception 'v_fb_weekly_outliers: filter not found'; end if;
  execute 'create or replace view public.v_fb_weekly_outliers as ' || n;
end
$$;

do $$
declare
  src text;
  fixed text;
  pair text[];
begin
  -- 4. analytics_rollup_fleet (Analytics page): averages, medians, the
  --    suppressed share and engagement rates over posts with a view count.
  select pg_get_functiondef('public.analytics_rollup_fleet(integer, text, text)'::regprocedure) into src;
  foreach pair slice 1 in array array[
    -- suppressed share first: its text contains the plainer pattern below
    array[$a$count(*) filter (where coalesce(f.views, 0) <= 10) / nullif(count(*), 0), 0)$a$,
          $a$count(*) filter (where f.views <= 10) / nullif(count(f.views), 0), 0)$a$],
    array[$a$count(*) filter (where coalesce(f.views, 0) <= 10) as suppressed$a$,
          $a$count(*) filter (where f.views <= 10) as suppressed$a$],
    array[$a$coalesce(sum(f.views), 0) / nullif(count(*), 0)::numeric$a$,
          $a$coalesce(sum(f.views), 0) / nullif(count(f.views), 0)::numeric$a$],
    array[$a$/ nullif(count(f.*)$a$,
          $a$/ nullif(count(f.views)$a$],
    array[$a$percentile_cont(0.5) within group (order by coalesce(f.views, 0)::float8)$a$,
          $a$percentile_cont(0.5) within group (order by f.views::float8)$a$],
    array[$a$coalesce(sum(f.total_engagement), 0) / nullif(sum(f.views), 0)$a$,
          $a$coalesce(sum(f.total_engagement) filter (where f.views is not null), 0) / nullif(sum(f.views), 0)$a$],
    array[$a$coalesce(sum(views), 0) / nullif(count(*), 0)::numeric$a$,
          $a$coalesce(sum(views), 0) / nullif(count(views), 0)::numeric$a$],
    array[$a$coalesce(sum(total_engagement), 0) / nullif(sum(views), 0)$a$,
          $a$coalesce(sum(total_engagement) filter (where views is not null), 0) / nullif(sum(views), 0)$a$]
  ] loop
    fixed := replace(src, pair[1], pair[2]);
    if fixed = src then raise exception 'analytics_rollup_fleet: % not found', pair[1]; end if;
    src := fixed;
  end loop;
  execute src;

  -- 5. analytics_top_content_fleet: top by views, so posts with views only.
  select pg_get_functiondef('public.analytics_top_content_fleet(integer, integer, text)'::regprocedure) into src;
  fixed := replace(src,
$a$  where u.posted_at >= p.from_ts and u.posted_at is not null
  order by u.views desc nulls last$a$,
$a$  where u.posted_at >= p.from_ts and u.posted_at is not null and u.views is not null
  order by u.views desc nulls last$a$);
  if fixed = src then raise exception 'analytics_top_content_fleet: top filter not found'; end if;
  execute fixed;

  -- 6. content_type_stats_fleet (Content types page): its rows are "measured
  --    posts", scored on views; a post with no view count is not measured.
  select pg_get_functiondef('public.content_type_stats_fleet(integer, text)'::regprocedure) into src;
  fixed := replace(src,
$a$  select account, carousel_id, posted_at, views, total_engagement, 'facebook'::text
    from fb_post_performance
),$a$,
$a$  select account, carousel_id, posted_at, views, total_engagement, 'facebook'::text
    from fb_post_performance
   where views is not null
),$a$);
  if fixed = src then raise exception 'content_type_stats_fleet: facebook branch not found'; end if;
  execute fixed;
end
$$;
