-- PF-24: Facebook counts toward health (Garreth, 2026-10-07).
--
-- fb_post_performance becomes a third source beside Instagram and TikTok in
-- the two health views, and in the health check's freshness report. Each view
-- keeps its exact text and gains one more UNION ALL branch, done by editing
-- the live definition rather than retyping it, so nothing else can drift.
-- A Facebook row only ever joins a Facebook account (the joins match handle
-- AND platform since 2026-09-23), so no TikTok or Instagram verdict moves.
do $$
declare
  d text;
  n text;
begin
  -- v_account_view_health: the per-post rows and the per-platform freshness.
  d := pg_get_viewdef('public.v_account_view_health'::regclass, true);
  n := replace(d,
$a$            'tiktok'::text AS pf
           FROM tt_post_performance
        ), fresh AS ($a$,
$a$            'tiktok'::text AS pf
           FROM tt_post_performance
        UNION ALL
         SELECT fb_post_performance.account,
            fb_post_performance.posted_at,
            fb_post_performance.views,
            fb_post_performance.ingested_at,
            'facebook'::text AS pf
           FROM fb_post_performance
        ), fresh AS ($a$);
  if n = d then raise exception 'v_account_view_health: perf branch not found'; end if;
  d := n;
  n := replace(d,
$a$            max(tt_post_performance.ingested_at) AS max
           FROM tt_post_performance
        )$a$,
$a$            max(tt_post_performance.ingested_at) AS max
           FROM tt_post_performance
        UNION ALL
         SELECT 'facebook'::text AS text,
            max(fb_post_performance.ingested_at) AS max
           FROM fb_post_performance
        )$a$);
  if n = d then raise exception 'v_account_view_health: fresh branch not found'; end if;
  execute 'create or replace view public.v_account_view_health as ' || n;

  -- v_account_health_v3: the last eight posts behind each verdict.
  d := pg_get_viewdef('public.v_account_health_v3'::regclass, true);
  n := replace(d,
$a$            'instagram'::text AS text
           FROM post_performance
        ), ranked AS ($a$,
$a$            'instagram'::text AS text
           FROM post_performance
        UNION ALL
         SELECT fb_post_performance.account,
            fb_post_performance.posted_at,
            fb_post_performance.views,
            'facebook'::text AS text
           FROM fb_post_performance
        ), ranked AS ($a$);
  if n = d then raise exception 'v_account_health_v3: perf branch not found'; end if;
  execute 'create or replace view public.v_account_health_v3 as ' || n;
end
$$;

-- run_account_health_check: report Facebook's freshness beside the others.
do $$
declare
  src text;
  fixed text;
begin
  select pg_get_functiondef('public.run_account_health_check()'::regprocedure) into src;
  fixed := replace(src,
    $a$union all select 'tiktok', max(ingested_at) from tt_post_performance) f)$a$,
    $a$union all select 'tiktok', max(ingested_at) from tt_post_performance
            union all select 'facebook', max(ingested_at) from fb_post_performance) f)$a$);
  if fixed = src then raise exception 'run_account_health_check: freshness block not found'; end if;
  execute fixed;
end
$$;
