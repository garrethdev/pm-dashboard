-- Geelark no longer runs anything, so its task feed can never be fresh and the
-- alarm fired every day. The feed is dropped from the check; the other feeds and
-- the database-job check are unchanged. (Garreth, 2026-11-06)
CREATE OR REPLACE FUNCTION public.analytics_freshness_check_live()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE feeds jsonb; cronfail jsonb; stale_ct int;
BEGIN
  WITH f AS (
    SELECT 'Instagram analytics'::text AS feed,
           'Analysis Engine (Sun/Mon/Wed/Fri 8am PT)'::text AS source,
           (SELECT max(ingested_at) FROM post_performance) AS last_write,
           96 AS max_age_hours
    UNION ALL
    SELECT 'TikTok analytics', 'TikTok Analytics Engine',
           (SELECT max(ingested_at) FROM tt_post_performance), 48
    UNION ALL
    SELECT 'Facebook analytics', 'Facebook robot (dashboard, daily)',
           (SELECT max(ingested_at) FROM fb_post_performance), 48
    UNION ALL
    SELECT 'View snapshots', 'pg_cron capture-post-view-snapshots (daily 09:30 ET)',
           (SELECT max(captured_at) FROM post_view_snapshots), 36
  )
  SELECT jsonb_agg(jsonb_build_object(
           'feed', feed, 'source', source, 'last_write', last_write,
           'age_hours', CASE WHEN last_write IS NULL THEN NULL
                             ELSE round(EXTRACT(epoch FROM (now() - last_write)) / 3600) END,
           'max_age_hours', max_age_hours,
           'stale', (last_write IS NULL OR last_write < now() - make_interval(hours => max_age_hours))
         ) ORDER BY feed)
  INTO feeds FROM f;

  SELECT count(*) INTO stale_ct FROM jsonb_array_elements(feeds) e WHERE (e->>'stale')::boolean;

  SELECT coalesce(jsonb_agg(jsonb_build_object('job', command, 'consecutive_failures', fails, 'last_message', msg)), '[]'::jsonb)
  INTO cronfail
  FROM (
    SELECT d.command,
           count(*) FILTER (WHERE d.status <> 'succeeded') AS fails,
           max(d.return_message) FILTER (WHERE d.status <> 'succeeded') AS msg
    FROM (
      SELECT command, status, return_message,
             row_number() OVER (PARTITION BY jobid ORDER BY start_time DESC) rn
      FROM cron.job_run_details
    ) d
    WHERE d.rn <= 3
    GROUP BY d.command
    HAVING count(*) FILTER (WHERE d.status <> 'succeeded') >= 2
  ) x;

  RETURN jsonb_build_object(
    'checked_at', now(), 'feeds', feeds, 'stale_count', stale_ct,
    'cron_failures', cronfail,
    'alert', (stale_ct > 0 OR jsonb_array_length(cronfail) > 0)
  );
END;
$function$;
