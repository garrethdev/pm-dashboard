-- PF-08 follow-up: a performance row is matched on handle AND platform.
--
-- THE PROBLEM. Each real phone carries one character's Instagram and Facebook,
-- and the two accounts can share a handle. Four objects matched the view
-- tables (tt_post_performance = TikTok, post_performance = Instagram) to
-- `accounts` on the handle alone:
--
--   v_account_view_health   an account's own view counts and medians
--   v_account_health_v3     its last-8-posts escalation (`recent` CTE)
--   analytics_rollup        per-account, per-character, per-content-type rows
--   analytics_rollup_fleet  the same three joins (its fleet gate was already
--                           handle AND platform, since PF-17)
--
-- So a Facebook row sharing its character's Instagram handle would borrow that
-- Instagram account's posts and medians in both health views, and in both
-- rollups each Instagram post would be joined to two accounts rows and counted
-- twice in the character and content-type totals. Found 2026-09-18 and logged
-- under PF-08 in BACKLOG.md; nothing was wrong live, because no handle sits on
-- two rows and no Facebook account exists yet.
--
-- WHAT CHANGES. Each of those joins also requires the platform to match. The
-- health views' performance stream now carries a platform literal per branch
-- (v_account_view_health already had one, `pf`; v_account_health_v3's is new).
-- Facebook views are not collected at all, so a Facebook account now gets no
-- views from either table, which is the truth.
--
-- WHY REPLACED IN PLACE, NOT ADDED BESIDE. v_account_health_v3 is read by the
-- n8n View-Collapse Detector and, through v_scheduler_account_config_all, by
-- the Smart Scheduler; run_account_health_check reads v_account_view_health.
-- An object beside them would leave every one of those readers with the bug.
-- The rule allows an in-place change when the output is proven identical:
--
-- PARITY (2026-09-23, before applying). Each new body was built in a
-- throwaway schema and diffed against the live object in the same statement:
--   v_account_view_health   64 rows each, EXCEPT ALL both ways: 0 and 0
--   v_account_health_v3     64 rows each, EXCEPT ALL both ways: 0 and 0
--   analytics_rollup        7 / 14 / 30 days / all time x all / tiktok /
--                           instagram: 12 of 12 results identical
--   analytics_rollup_fleet  the same 4 ranges x 3 platforms x all / cloud /
--                           physical: 33 of 36 identical. The other 3
--                           (physical, all time) never finish on the LIVE
--                           function either — a pre-existing fault, see below —
--                           and have no rows for this change to touch: no
--                           account is on the Physical fleet.
-- Why none changed: every accounts row is platform 'tiktok' or 'instagram'
-- (54 + 10), no handle is on two rows, and no handle in either view table
-- matches an accounts row of the other platform (0 such pairs).
--
-- NOT CHANGED, and noticed while here: analytics_rollup_fleet with
-- p_fleet = 'physical' and p_days = null (Physical fleet, "All time") never
-- returns while the fleet has no posts — `slots` starts its series at
-- '-infinity'. Left for its own ticket.
--
-- The shape of every object is unchanged: same columns, same types, same
-- order, same arguments and return type.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. v_account_view_health. The only edit is the `perf` join in `agg`.

create or replace view public.v_account_view_health as
 WITH perf AS (
         SELECT post_performance.account,
            post_performance.posted_at,
            post_performance.views,
            post_performance.ingested_at,
            'instagram'::text AS pf
           FROM post_performance
        UNION ALL
         SELECT tt_post_performance.account,
            tt_post_performance.posted_at,
            tt_post_performance.views,
            tt_post_performance.ingested_at,
            'tiktok'::text AS pf
           FROM tt_post_performance
        ), fresh AS (
         SELECT 'instagram'::text AS pf,
            max(post_performance.ingested_at) AS last_ingest
           FROM post_performance
        UNION ALL
         SELECT 'tiktok'::text AS text,
            max(tt_post_performance.ingested_at) AS max
           FROM tt_post_performance
        ),
        -- One row per delivery ATTEMPTED, whichever fleet made it, reduced to
        -- the only two things the counters below need: when it happened and
        -- whether it failed to deliver.
        fired_src AS (
         SELECT t.serial_name AS geelark_profile,
            t.schedule_at AS at,
            COALESCE((t.fail_code = ANY (ARRAY['29996'::text, '29997'::text, '29998'::text, '29994'::text, '20208'::text, '20267'::text, '20116'::text, '20201'::text])), false) AS delivery_failed
           FROM geelark_tasks t
          WHERE (t.serial_name IS NOT NULL)
        UNION ALL
         SELECT a.geelark_profile,
            COALESCE(d.done_at, d.created_at) AS at,
            (d.status = 'failed'::text) AS delivery_failed
           FROM (post_deliveries d
             JOIN accounts a ON ((a.id = d.account_id)))
          WHERE (a.geelark_profile IS NOT NULL)
        ), fired AS (
         SELECT fired_src.geelark_profile,
            count(*) FILTER (WHERE ((fired_src.at >= (now() - '7 days'::interval)) AND (fired_src.at <= now()))) AS fired_7d,
            count(*) FILTER (WHERE ((fired_src.at >= (now() - '28 days'::interval)) AND (fired_src.at <= now()))) AS fired_28d,
            count(*) FILTER (WHERE ((fired_src.at >= (now() - '7 days'::interval)) AND (fired_src.at <= now()) AND fired_src.delivery_failed)) AS deliv_fail_7d,
            max(fired_src.at) FILTER (WHERE (fired_src.at <= now())) AS last_fired_at
           FROM fired_src
          GROUP BY fired_src.geelark_profile
        ), agg AS (
         SELECT a.id,
            a.username,
            a.geelark_profile,
            a.platform,
            a."character",
            a.is_active,
            a.account_created_on,
            COALESCE(f.fired_7d, (0)::bigint) AS fired_7d,
            COALESCE(f.fired_28d, (0)::bigint) AS fired_28d,
            COALESCE(f.deliv_fail_7d, (0)::bigint) AS deliv_fail_7d,
            f.last_fired_at,
            count(p.*) FILTER (WHERE (p.posted_at >= (now() - '7 days'::interval))) AS posts_7d,
            count(p.*) FILTER (WHERE (p.posted_at >= (now() - '28 days'::interval))) AS posts_28d,
            count(p.*) FILTER (WHERE ((p.posted_at >= (now() - '7 days'::interval)) AND (p.posted_at <= (now() - '48:00:00'::interval)))) AS mat_posts_7d,
            count(p.*) FILTER (WHERE ((p.posted_at >= (now() - '28 days'::interval)) AND (p.posted_at <= (now() - '48:00:00'::interval)))) AS mat_posts_28d,
            count(p.*) FILTER (WHERE ((p.posted_at >= (now() - '14 days'::interval)) AND (p.posted_at <= (now() - '48:00:00'::interval)))) AS mat_posts_14d,
            count(p.*) FILTER (WHERE ((p.posted_at >= (now() - '7 days'::interval)) AND (p.posted_at <= (now() - '48:00:00'::interval)) AND (p.views <= 10))) AS mat_le10_7d,
            count(p.*) FILTER (WHERE ((p.posted_at >= (now() - '14 days'::interval)) AND (p.posted_at <= (now() - '48:00:00'::interval)) AND (p.views <= 10))) AS mat_le10_14d,
            percentile_cont((0.5)::double precision) WITHIN GROUP (ORDER BY ((p.views)::double precision)) FILTER (WHERE ((p.posted_at >= (now() - '7 days'::interval)) AND (p.posted_at <= (now() - '48:00:00'::interval)))) AS median_7d,
            percentile_cont((0.5)::double precision) WITHIN GROUP (ORDER BY ((p.views)::double precision)) FILTER (WHERE ((p.posted_at >= (now() - '28 days'::interval)) AND (p.posted_at <= (now() - '48:00:00'::interval)))) AS median_28d,
            max(p.views) FILTER (WHERE ((p.posted_at >= (now() - '14 days'::interval)) AND (p.posted_at <= (now() - '48:00:00'::interval)))) AS max_14d,
            count(p.*) FILTER (WHERE ((p.posted_at >= (now() - '21 days'::interval)) AND (p.posted_at <= (now() - '48:00:00'::interval)) AND (p.views = 0))) AS zero_21d,
            max(p.posted_at) AS last_post_at,
            max(p.ingested_at) AS acct_last_ingest,
            count(p.*) FILTER (WHERE (p.posted_at >= (now() - '7 days'::interval))) AS perf_rows_7d
           FROM ((accounts a
             LEFT JOIN perf p ON (((p.account = a.username) AND (p.pf = a.platform))))
             LEFT JOIN fired f ON ((f.geelark_profile = a.geelark_profile)))
          GROUP BY a.id, a.username, a.geelark_profile, a.platform, a."character", a.is_active, a.account_created_on, f.fired_7d, f.fired_28d, f.deliv_fail_7d, f.last_fired_at
        ), banded AS (
         SELECT g.id,
            g.username,
            g.geelark_profile,
            g.platform,
            g."character",
            g.is_active,
            g.account_created_on,
            g.fired_7d,
            g.fired_28d,
            g.deliv_fail_7d,
            g.last_fired_at,
            g.posts_7d,
            g.posts_28d,
            g.mat_posts_7d,
            g.mat_posts_28d,
            g.mat_posts_14d,
            g.mat_le10_7d,
            g.mat_le10_14d,
            g.median_7d,
            g.median_28d,
            g.max_14d,
            g.zero_21d,
            g.last_post_at,
            g.acct_last_ingest,
            g.perf_rows_7d,
            round(((g.mat_le10_7d)::numeric / (NULLIF(g.mat_posts_7d, 0))::numeric), 2) AS suppressed_share_7d,
            round(((g.mat_le10_14d)::numeric / (NULLIF(g.mat_posts_14d, 0))::numeric), 2) AS suppressed_share_14d,
                CASE
                    WHEN (g.account_created_on IS NULL) THEN NULL::integer
                    ELSE (CURRENT_DATE - g.account_created_on)
                END AS account_age_days,
                CASE
                    WHEN (g.account_created_on IS NULL) THEN 'unknown'::text
                    WHEN ((CURRENT_DATE - g.account_created_on) < 9) THEN 'brand_new'::text
                    WHEN ((CURRENT_DATE - g.account_created_on) < 16) THEN 'tier1'::text
                    WHEN ((CURRENT_DATE - g.account_created_on) < 23) THEN 'tier2'::text
                    ELSE 'established'::text
                END AS age_band,
            ( SELECT fr.last_ingest
                   FROM fresh fr
                  WHERE (fr.pf = g.platform)) AS platform_last_ingest
           FROM agg g
        ), cohort AS (
         SELECT b_1."character" AS c_character,
            b_1.platform AS c_platform,
            b_1.age_band AS c_age_band,
            percentile_cont((0.5)::double precision) WITHIN GROUP (ORDER BY b_1.median_7d) AS cohort_median_7d,
            count(*) AS cohort_n
           FROM banded b_1
          WHERE (b_1.is_active AND (b_1.median_7d IS NOT NULL) AND (b_1.mat_posts_7d >= 2))
          GROUP BY b_1."character", b_1.platform, b_1.age_band
        )
 SELECT b.id,
    b.username,
    b.geelark_profile,
    b.platform,
    b."character",
    b.is_active,
    b.posts_7d,
    b.posts_28d,
    b.median_7d,
    b.median_28d,
    b.max_14d,
    b.zero_21d,
    b.last_post_at,
    round(b.median_7d) AS median_7d_r,
    round(b.median_28d) AS median_28d_r,
        CASE
            WHEN (b.is_active IS FALSE) THEN 'banned'::text
            WHEN ((b.fired_7d >= 2) AND ((b.perf_rows_7d = 0) OR (b.acct_last_ingest IS NULL) OR (b.acct_last_ingest < (now() - '4 days'::interval))) AND (b.platform_last_ingest IS NOT NULL) AND (b.platform_last_ingest >= (now() - '4 days'::interval))) THEN 'tracking broken'::text
            WHEN ((b.platform_last_ingest IS NULL) OR (b.platform_last_ingest < (now() - '4 days'::interval)) OR (b.posts_28d = 0)) THEN 'no data'::text
            WHEN (b.fired_7d = 0) THEN 'idle'::text
            WHEN (b.age_band = ANY (ARRAY['brand_new'::text, 'tier1'::text, 'tier2'::text])) THEN 'ramping'::text
            WHEN ((b.mat_posts_7d >= 4) AND (b.mat_posts_14d >= 6) AND ((b.deliv_fail_7d)::numeric <= (0.25 * (GREATEST(b.fired_7d, (1)::bigint))::numeric)) AND (((b.mat_le10_7d)::numeric / (NULLIF(b.mat_posts_7d, 0))::numeric) >= 0.40) AND (((b.mat_le10_14d)::numeric / (NULLIF(b.mat_posts_14d, 0))::numeric) >= 0.40)) THEN 'suspected_burn'::text
            WHEN ((b.mat_posts_7d >= 4) AND ((b.deliv_fail_7d)::numeric <= (0.25 * (GREATEST(b.fired_7d, (1)::bigint))::numeric)) AND (((b.mat_le10_7d)::numeric / (NULLIF(b.mat_posts_7d, 0))::numeric) >= 0.40)) THEN 'collapsing'::text
            WHEN ((b.mat_posts_7d >= 4) AND (b.median_28d IS NOT NULL) AND (b.median_28d > (0)::double precision) AND (COALESCE(b.median_7d, (0)::double precision) < ((0.25)::double precision * b.median_28d)) AND (c.cohort_median_7d IS NOT NULL) AND (c.cohort_n >= 3) AND (COALESCE(b.median_7d, (0)::double precision) < ((0.50)::double precision * c.cohort_median_7d))) THEN 'muted'::text
            WHEN ((b.mat_posts_7d >= 4) AND (c.cohort_median_7d IS NOT NULL) AND (c.cohort_n >= 3) AND (c.cohort_median_7d > (0)::double precision) AND (COALESCE(b.median_7d, (0)::double precision) < ((0.25)::double precision * c.cohort_median_7d))) THEN 'muted'::text
            WHEN ((b.mat_posts_7d >= 4) AND (((b.mat_le10_7d)::numeric / (NULLIF(b.mat_posts_7d, 0))::numeric) >= 0.25)) THEN 'watch'::text
            WHEN ((b.mat_posts_7d < 4) AND (b.posts_7d > 0)) THEN 'watch'::text
            WHEN ((b.median_28d IS NOT NULL) AND (b.median_28d > (0)::double precision) AND (COALESCE(b.median_7d, (0)::double precision) < ((0.5)::double precision * b.median_28d))) THEN 'watch'::text
            WHEN ((c.cohort_median_7d IS NOT NULL) AND (c.cohort_n >= 3) AND (c.cohort_median_7d > (0)::double precision) AND (COALESCE(b.median_7d, (0)::double precision) < ((0.5)::double precision * c.cohort_median_7d))) THEN 'watch'::text
            ELSE 'healthy'::text
        END AS view_health,
    b.mat_posts_7d,
    b.mat_posts_28d,
    b.account_created_on,
    b.account_age_days,
    b.age_band,
    b.fired_7d,
    b.fired_28d,
    b.last_fired_at,
    b.perf_rows_7d,
    c.cohort_median_7d,
    c.cohort_n,
    b.platform_last_ingest,
    ((b.platform_last_ingest IS NULL) OR (b.platform_last_ingest < (now() - '4 days'::interval))) AS data_stale,
    (b.mat_posts_7d >= 4) AS has_sample,
        CASE
            WHEN (b.mat_posts_7d >= 4) THEN 'high'::text
            ELSE 'low'::text
        END AS confidence,
    b.mat_posts_14d,
    b.deliv_fail_7d,
    b.suppressed_share_7d,
    b.suppressed_share_14d,
    b.acct_last_ingest
   FROM (banded b
     LEFT JOIN cohort c ON (((c.c_character = b."character") AND (c.c_platform = b.platform) AND (c.c_age_band = b.age_band))));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. v_account_health_v3. The `perf` CTE carries its platform, and `ranked`
--    joins on it. Nothing else in the view is touched.

create or replace view public.v_account_health_v3 as
  with perf as (
    select account, posted_at, views, 'tiktok'::text as pf from tt_post_performance
    union all
    select account, posted_at, views, 'instagram'::text from post_performance
  ), ranked as (
    select a.geelark_profile, p.views,
           row_number() over (partition by a.geelark_profile order by p.posted_at desc) as rn
      from accounts a
      join perf p on p.account = a.username and p.pf = a.platform
  ), recent as (
    select geelark_profile,
           count(*)::integer as recent_n,
           max(views)::integer as recent_best,
           percentile_cont(0.5::double precision) within group (order by views::double precision) as recent_med,
           (count(*) filter (where views > 100))::integer as recent_hits_100
      from ranked
     where rn <= 8
     group by geelark_profile
  ), base as (
    select
      v.*,
      a.banned_at,
      a.status_note,
      a.posting_paused,
      w.days_since_warmup,
      lp.days_since_post,
      -- success-only, task-truth. Used ONLY by the new system-error clause.
      lp.days_since_success as days_since_ok_post,
      coalesce(e.posting_errors, 0::bigint) as posting_errors_7d,
      coalesce(e.posting_errors, 0::bigint) + coalesce(e.warmup_errors, 0::bigint) as geelark_errors_7d,
      fc.meaning as latest_fail_meaning,
      coalesce(r.recent_n, 0) as recent_n,
      r.recent_best,
      r.recent_med,
      coalesce(r.recent_hits_100, 0) as recent_hits_100,
      v.deliv_fail_7d::numeric <= 0.15 * greatest(v.fired_7d, 1)::numeric as deliv_ok,
      v.mat_posts_7d >= 8 as sample_ok,
      coalesce(v.max_14d, 0::bigint) < 300 as no_recent_hit
    from v_account_view_health v
    join accounts a on a.geelark_profile = v.geelark_profile
    left join v_account_warmup_health w on w.geelark_profile = v.geelark_profile
    left join v_account_last_post lp on lp.geelark_profile = v.geelark_profile
    left join v_dashboard_task_errors_7d e on e.serial_name = v.geelark_profile
    left join geelark_fail_codes fc on fc.code = e.latest_fail_code
    left join recent r on r.geelark_profile = v.geelark_profile
  ), scored as (
    select base.*,
      case
        when base.view_health = 'banned' and (base.banned_at is not null or base.status_note ~* 'ban') then 'banned'
        when base.view_health = 'banned' and base.username is not null then 'inactive'
        when base.view_health = 'banned' then 'no data'
        when base.view_health = 'suspected_burn' and base.sample_ok and base.deliv_ok and base.no_recent_hit
             and coalesce(base.suppressed_share_7d, 0::numeric) >= 0.40
             and coalesce(base.suppressed_share_14d, 0::numeric) >= 0.40 then 'shadowbanned'
        when base.view_health = 'suspected_burn' then 'watch'
        when base.view_health = any (array['no data', 'tracking broken'])
             and coalesce(base.geelark_errors_7d, 0::bigint) >= 3
             and coalesce(base.latest_fail_meaning, '') !~* '(account banned|captcha|ban precursor|restricted)' then 'system error'
        -- Posting has persistently failed and nothing has landed in a week.
        -- No view_health gate: the view verdict is stale precisely because
        -- nothing is getting through, so it cannot be the thing that decides.
        when base.posting_errors_7d >= 3
             and (base.days_since_ok_post is null or base.days_since_ok_post > 7)
             and coalesce(base.latest_fail_meaning, '') !~* '(account banned|captcha|ban precursor|restricted)' then 'system error'
        when base.view_health = 'muted' then 'collapsing'
        when base.days_since_warmup is not null and base.days_since_warmup <= 7
             and (base.posting_paused is true or base.days_since_post is null) then 'warming'
        when base.view_health = 'ramping' then
          case
            when base.sample_ok and base.mat_posts_14d >= 6 and base.deliv_ok and base.no_recent_hit
                 and coalesce(base.suppressed_share_7d, 0::numeric) >= 0.40
                 and coalesce(base.suppressed_share_14d, 0::numeric) >= 0.40 then 'shadowbanned'
            when base.sample_ok and base.deliv_ok
                 and coalesce(base.suppressed_share_7d, 0::numeric) >= 0.40 then 'collapsing'
            when base.mat_posts_7d >= 4 and base.median_28d > 0::double precision
                 and coalesce(base.median_7d, 0::double precision) < 0.25::double precision * base.median_28d
                 and base.cohort_median_7d is not null and base.cohort_n >= 3
                 and base.cohort_median_7d > 0::double precision
                 and coalesce(base.median_7d, 0::double precision) < 0.50::double precision * base.cohort_median_7d then 'collapsing'
            when base.mat_posts_7d >= 4 and base.cohort_median_7d is not null and base.cohort_n >= 3
                 and base.cohort_median_7d > 0::double precision
                 and coalesce(base.median_7d, 0::double precision) < 0.25::double precision * base.cohort_median_7d then 'collapsing'
            when base.mat_posts_7d >= 4
                 and coalesce(base.suppressed_share_7d, 0::numeric) >= 0.25 then 'watch'
            when base.mat_posts_7d < 4 and base.posts_7d > 0 then 'watch'
            when base.median_28d > 0::double precision
                 and coalesce(base.median_7d, 0::double precision) < 0.50::double precision * base.median_28d then 'watch'
            when base.cohort_median_7d is not null and base.cohort_n >= 3
                 and base.cohort_median_7d > 0::double precision
                 and coalesce(base.median_7d, 0::double precision) < 0.50::double precision * base.cohort_median_7d then 'watch'
            else 'healthy'
          end
        when base.view_health = 'tracking broken' and coalesce(base.mat_posts_7d, 0::bigint) = 0
             and coalesce(base.posts_28d, 0::bigint) = 0 then 'no data'
        else base.view_health
      end as base_health
    from base
  ), finalised as (
    select scored.*,
      scored.recent_n >= 5 and scored.recent_best <= 100
        and scored.base_health = any (array['watch', 'healthy']) as escalated,
      case
        when scored.recent_n >= 5 and scored.recent_best <= 100
             and scored.base_health = any (array['watch', 'healthy']) then 'collapsing'
        when scored.base_health = 'shadowbanned' and scored.recent_hits_100 >= 2
             and (scored.cohort_median_7d is null
                  or scored.recent_med >= 0.4::double precision * scored.cohort_median_7d) then 'watch'
        else scored.base_health
      end as health
    from scored
  )
  select
    id, username, geelark_profile, platform, "character", is_active,
    posts_7d, posts_28d, median_7d, median_28d, max_14d, zero_21d, last_post_at,
    median_7d_r, median_28d_r, view_health, mat_posts_7d, mat_posts_28d,
    account_created_on, account_age_days, age_band, fired_7d, fired_28d,
    last_fired_at, perf_rows_7d, cohort_median_7d, cohort_n, platform_last_ingest,
    data_stale, has_sample, confidence, mat_posts_14d, deliv_fail_7d,
    suppressed_share_7d, suppressed_share_14d, acct_last_ingest, banned_at,
    status_note, posting_paused, days_since_warmup, days_since_post,
    geelark_errors_7d, latest_fail_meaning, health, base_health,
    recent_n, recent_best, recent_med, recent_hits_100, sample_ok, deliv_ok, no_recent_hit,
    case
      when health <> all (array['collapsing', 'shadowbanned', 'watch']) then null::text
      when escalated then 'no post cleared 100 views in the last ' || recent_n || ' posts'
      when health = 'watch' and base_health = 'shadowbanned'
        then 'held at watch: ' || recent_hits_100 || ' recent posts over 100 views'
      when coalesce(suppressed_share_7d, 0::numeric) >= 0.40
        then (round(suppressed_share_7d * 100::numeric) || '% of recent posts under 10 views')
             || case
                  when coalesce(suppressed_share_14d, 0::numeric) >= 0.40
                       and coalesce(mat_posts_14d, 0::bigint) >= 4 then ' (sustained over 14d)'
                  else ''
                end
      when median_28d > 0::double precision
           and coalesce(median_7d, 0::double precision) < 0.25::double precision * median_28d
        then 'median views down ' || round((1::double precision - median_7d / median_28d) * 100::double precision)
             || '% against its own 28-day baseline'
      when cohort_median_7d is not null and cohort_median_7d > 0::double precision and cohort_n >= 3
           and coalesce(median_7d, 0::double precision) < 0.50::double precision * cohort_median_7d
        then 'median views ' || round((1::double precision - median_7d / cohort_median_7d) * 100::double precision)
             || '% below similar accounts'
      when coalesce(suppressed_share_7d, 0::numeric) >= 0.25
        then round(suppressed_share_7d * 100::numeric) || '% of recent posts under 10 views'
      else 'flagged by the view-health classifier'
    end as health_reason,
    nullif(concat_ws('; ',
      case
        when not sample_ok and coalesce(mat_posts_7d, 0::bigint) > 0 and health <> 'no data'
          then 'only ' || mat_posts_7d || case when mat_posts_7d = 1 then ' post sampled' else ' posts sampled' end
        else null::text
      end,
      case
        when not deliv_ok
          then round(100.0 * deliv_fail_7d::numeric / greatest(fired_7d, 1)::numeric) || '% of deliveries failed'
        else null::text
      end), '') as health_caveat
  from finalised;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. analytics_rollup, the fleet-wide original. The three accounts joins
--    (acct, chars, ct) match on handle AND platform.

create or replace function public.analytics_rollup(
  p_days integer default 7,
  p_platform text default 'all'
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
u as (
  select 'tiktok'::text as platform, account, posted_at, views, likes, comments, shares,
         saves, total_engagement, carousel_id, ingested_at from tt_post_performance
  union all
  select 'instagram', account, posted_at, views, likes, comments, shares,
         saves, total_engagement, carousel_id, ingested_at from post_performance
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
  from f left join accounts a on a.username = f.account and a.platform = f.platform group by f.account
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
  from f left join accounts a on a.username = f.account and a.platform = f.platform group by 1
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
  left join accounts a on a.username = f.account and a.platform = f.platform
  -- live lanes only
  where coalesce(r.active, false) and coalesce(r.unified_poster_active, false)
  group by 1, up.content_type, r.display_name
)
select jsonb_build_object(
  'range_days', p_days, 'bucket', (select bucket from params),
  'last_ingest', (select max(ingested_at) from u),
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. analytics_rollup_fleet, its pair (README: change one, change the other).
--    The same three joins; the fleet gate was already correct.

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
  from f left join accounts a on a.username = f.account and a.platform = f.platform group by f.account
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
  from f left join accounts a on a.username = f.account and a.platform = f.platform group by 1
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
  left join accounts a on a.username = f.account and a.platform = f.platform
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

-- ─────────────────────────────────────────────────────────────────────────────
-- GRANTS: nothing to do, and that is deliberate.
--
-- All four statements are CREATE OR REPLACE on an existing object, which keeps
-- its ACL, and the rule in supabase/migrations/README.md is that a replace
-- leaves the grants alone. Read back after applying, unchanged:
--
--   v_account_view_health, v_account_health_v3
--     {postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,
--      authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}
--   analytics_rollup(integer, text)
--     {=X/postgres,postgres=X/postgres,anon=X/postgres,
--      authenticated=X/postgres,service_role=X/postgres}
--   analytics_rollup_fleet(integer, text, text)
--     {postgres=X/postgres,service_role=X/postgres}
