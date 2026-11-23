-- Three zero-view posts in a row = collapsing (Garreth, 2026-11-23).
--
-- Why: Yurie saw accounts getting 0 views on post after post while the
-- Accounts page still said "watch". The detector only counts posts at least
-- two days old and judges the share of a whole week's posts under 10 views,
-- so a fresh run of zeros was watered down by the older good posts and named
-- 2 to 5 days late. Garreth: "We want to see immediately if an account has 0
-- views 3 times in a row to flag it as collapsing."
--
-- What: v_account_health_v3 gains one rule. If an account's three newest
-- recorded posts all read exactly 0 views, and the verdict would otherwise be
-- "watch" or "healthy", it becomes "collapsing" with the reason "last 3 posts
-- got 0 views". No age filter on the posts (the point is to be immediate);
-- view counts are re-read on every analytics pull for 7 days, so a post that
-- picks up views clears the flag on the next pull. Every other verdict
-- (banned, shadowbanned, system error, idle, warming, no data) is untouched.
-- The column list is unchanged, so the app, the Smart Scheduler's config view
-- and the review view need nothing.
--
-- Side effect, on purpose: scheduler_health_policy caps a "collapsing"
-- account at 2 posts a day.
--
-- How: the cached copy is rebuilt from the definition the database holds,
-- with each edit checked to land exactly once, then swapped in under the same
-- name (same pattern as wire_camera_roll_story for cache.v_scheduler_pool).

do $$
declare
  d text;
  p text;
  n int;
  edits text[][] := array[
    -- 1. the recent-posts summary counts zeros among the newest three
    array['count(*) FILTER (WHERE ranked.views > 100)::integer AS recent_hits_100',
          'count(*) FILTER (WHERE ranked.views > 100)::integer AS recent_hits_100,' || E'\n' ||
          '            count(*) FILTER (WHERE ranked.rn <= 3 AND ranked.views = 0)::integer AS recent_zero_3'],
    -- 2-4. carried through base, scored and finalised
    array['COALESCE(r.recent_hits_100, 0) AS recent_hits_100,',
          'COALESCE(r.recent_hits_100, 0) AS recent_hits_100,' || E'\n' ||
          '            COALESCE(r.recent_zero_3, 0) AS recent_zero_3,'],
    array['base.recent_hits_100,',
          'base.recent_hits_100,' || E'\n' || '            base.recent_zero_3,'],
    array['scored.recent_hits_100,',
          'scored.recent_hits_100,' || E'\n' || '            scored.recent_zero_3,'],
    -- 5. the flag, beside the existing escalation flag
    array['AS escalated,',
          'AS escalated,' || E'\n' ||
          '            scored.recent_zero_3 >= 3 AND (scored.base_health = ANY (ARRAY[''watch''::text, ''healthy''::text])) AS zero_streak,'],
    -- 6. the verdict: checked first, ahead of the no-post-over-100 escalation
    array['WHEN scored.recent_n >= 5 AND scored.recent_best <= 100 AND (scored.base_health = ANY (ARRAY[''watch''::text, ''healthy''::text])) THEN ''collapsing''::text',
          'WHEN scored.recent_zero_3 >= 3 AND (scored.base_health = ANY (ARRAY[''watch''::text, ''healthy''::text])) THEN ''collapsing''::text' || E'\n' ||
          '                    WHEN scored.recent_n >= 5 AND scored.recent_best <= 100 AND (scored.base_health = ANY (ARRAY[''watch''::text, ''healthy''::text])) THEN ''collapsing''::text'],
    -- 7. the reason shown on the pill
    array['WHEN escalated THEN',
          'WHEN zero_streak THEN ''last 3 posts got 0 views''::text' || E'\n' ||
          '            WHEN escalated THEN']
  ];
  i int;
begin
  d := rtrim(pg_get_viewdef('cache.v_account_health_v3'::regclass, true), E'; \n');

  if position('recent_zero_3' in d) > 0 then
    raise exception 'cache.v_account_health_v3 already has the zero-streak rule';
  end if;

  for i in 1 .. array_length(edits, 1) loop
    n := (length(d) - length(replace(d, edits[i][1], ''))) / length(edits[i][1]);
    if n <> 1 then
      raise exception 'edit % expected its anchor once, found % times: %', i, n, edits[i][1];
    end if;
    d := replace(d, edits[i][1], edits[i][2]);
  end loop;

  execute 'create materialized view cache.v_account_health_v3_new as ' || d;
  execute 'create unique index v_account_health_v3_key_new on cache.v_account_health_v3_new (id)';
  execute 'revoke all on cache.v_account_health_v3_new from anon, authenticated';
  execute 'grant select on cache.v_account_health_v3_new to service_role';

  p := rtrim(pg_get_viewdef('public.v_account_health_v3'::regclass, true), E'; \n');
  if position('FROM cache.v_account_health_v3' in p) = 0 then
    raise exception 'public.v_account_health_v3 no longer reads cache.v_account_health_v3';
  end if;
  p := replace(p, 'FROM cache.v_account_health_v3', 'FROM cache.v_account_health_v3_new v_account_health_v3');
  execute 'create or replace view public.v_account_health_v3 as ' || p;

  execute 'drop materialized view cache.v_account_health_v3';
  execute 'alter materialized view cache.v_account_health_v3_new rename to v_account_health_v3';
  execute 'alter index cache.v_account_health_v3_key_new rename to v_account_health_v3_key';
end
$$;
