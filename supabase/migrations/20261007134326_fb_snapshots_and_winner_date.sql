-- PF-24 follow-up (Garreth, 2026-10-07: wire Facebook into the other workflows).
--
-- 1. fb_post_performance.winner_date, which the n8n Winner-Pattern Analysis
--    Engine stamps on each winning post, as it does on the TikTok and
--    Instagram tables.
-- 2. capture_post_view_snapshots (pg_cron, daily 09:30 ET) also keeps a daily
--    copy of each Facebook reel's numbers, beside Instagram and TikTok. Edited
--    in place from the live definition; the Instagram and TikTok blocks are
--    not touched.
alter table public.fb_post_performance add column winner_date date;

do $$
declare
  src text;
  fixed text;
begin
  select pg_get_functiondef('public.capture_post_view_snapshots()'::regprocedure) into src;
  fixed := replace(src,
$a$DECLARE v_ig int; v_tt int;$a$,
$a$DECLARE v_ig int; v_tt int; v_fb int;$a$);
  if fixed = src then raise exception 'capture_post_view_snapshots: declare not found'; end if;
  src := fixed;
  fixed := replace(src,
$a$  ) SELECT count(*) INTO v_tt FROM ins;
$a$,
$a$  ) SELECT count(*) INTO v_tt FROM ins;

  WITH src AS (
    SELECT post_id, account, 'facebook'::text AS platform, posted_at, views, likes, comments, shares, saves
    FROM fb_post_performance
    WHERE posted_at IS NOT NULL
      AND posted_at >= now() - interval '35 days'
      AND post_id IS NOT NULL
  ), ins AS (
    INSERT INTO post_view_snapshots (post_id, account, platform, posted_at, age_hours, views, likes, comments, shares, saves)
    SELECT post_id, account, platform, posted_at,
           GREATEST(0, (EXTRACT(epoch FROM (now() - posted_at)) / 3600)::int),
           views, likes, comments, shares, saves
    FROM src
    ON CONFLICT (post_id, capture_date) DO UPDATE
      SET views = EXCLUDED.views, likes = EXCLUDED.likes, comments = EXCLUDED.comments,
          shares = EXCLUDED.shares, saves = EXCLUDED.saves,
          age_hours = EXCLUDED.age_hours, captured_at = now()
    RETURNING 1
  ) SELECT count(*) INTO v_fb FROM ins;
$a$);
  if fixed = src then raise exception 'capture_post_view_snapshots: tiktok block not found'; end if;
  src := fixed;
  fixed := replace(src,
$a$    'tiktok_rows', v_tt,
    'total_rows', v_ig + v_tt$a$,
$a$    'tiktok_rows', v_tt,
    'facebook_rows', v_fb,
    'total_rows', v_ig + v_tt + v_fb$a$);
  if fixed = src then raise exception 'capture_post_view_snapshots: result not found'; end if;
  execute fixed;
end
$$;
