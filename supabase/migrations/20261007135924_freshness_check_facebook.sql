-- PF-24, after deploy (2026-10-07): the daily [Health] Analytics Freshness
-- Alarm (n8n, via analytics_freshness_check) also watches the Facebook robot,
-- so it emails if Facebook numbers stop arriving. 48 hours, as TikTok: the
-- robot runs every day. Edited in place from the live definition.
do $$
declare
  src text;
  fixed text;
begin
  select pg_get_functiondef('public.analytics_freshness_check()'::regprocedure) into src;
  fixed := replace(src,
$a$           (SELECT max(ingested_at) FROM tt_post_performance), 48
$a$,
$a$           (SELECT max(ingested_at) FROM tt_post_performance), 48
    UNION ALL
    SELECT 'Facebook analytics', 'Facebook robot (dashboard, daily)',
           (SELECT max(ingested_at) FROM fb_post_performance), 48
$a$);
  if fixed = src then raise exception 'analytics_freshness_check: TikTok feed not found'; end if;
  execute fixed;
end
$$;
