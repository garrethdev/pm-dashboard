-- PF-09: the health detector answers "did this post go out?" from BOTH fleets.
--
-- THE PROBLEM. Every delivery fact the account-health chain uses is read from
-- `geelark_tasks`: a cloud phone was told to post, and it reported back. A real
-- iPhone reports nothing. Since PF-05 (2026-09-22) the Physical fleet's answer
-- is a row in `post_deliveries` instead — `queued` when the post is handed to a
-- person, `posted` when they tick it off, `failed` when it could not go up.
--
-- Left alone, an account on a real phone reads as an account that has stopped
-- working: no tasks fired, no failures, nothing posted, ever. The exact
-- "quieter than it is" failure mode the poller blind spot had.
--
-- WHAT CHANGES. Two views underneath the verdict, and NOT the verdict itself:
--
--   v_account_view_health  — the fired / failed delivery counters
--   v_account_last_post    — when this account last posted, and last posted OK
--
-- `v_account_health_v3` is deliberately NOT touched. Every rule it applies
-- (the delivery brake `deliv_ok`, the `warming` rule, the `% of deliveries
-- failed` caveat) reads those two views, so once they answer for both fleets
-- the verdict does too, by the same arithmetic, with no new branch to keep in
-- step. That is the whole point: a manual account is judged by the SAME rules,
-- not by a parallel set of them.
--
-- WHAT DELIBERATELY DOES NOT CHANGE. `v_dashboard_task_errors_7d` still reads
-- Geelark only. It feeds the `system error` verdict, and "system error" means
-- the posting MACHINERY is broken — it is matched against Geelark fail-code
-- meanings ("captcha", "account banned") that a hand-posted row has no
-- equivalent of. A person who could not post something is a failed delivery,
-- which the delivery brake above already says. Folding it into `system error`
-- would put a red infrastructure verdict on a human typo.
--
-- PARITY. `post_deliveries` is empty (0 rows) and no account is on the Physical
-- fleet (0 rows with delivery_mode = 'manual'), so both views return exactly
-- what they returned before this ran. That was proven by recomputing each new
-- body inline and diffing it against the live view with EXCEPT in both
-- directions: 0 rows each way. The new source only ever ADDS rows, once hand
-- posting actually starts.
--
-- NOT PROVEN WITH REAL WORK: no post has ever been handed to a person, so the
-- manual half of both views has never had a real row flow through it. It was
-- exercised against a synthetic delivery row in a read-only query instead, and
-- that is a rehearsal, not a live run.


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. The delivery counters read both fleets.
--
-- `fired_7d` / `fired_28d` = how many posts this account was ASKED to make in
-- the window, and `deliv_fail_7d` = how many of those could not be delivered.
-- The ratio between them is the "delivery brake": above 15% failed,
-- v_account_health_v3 stops trusting the view numbers and says so on screen.
--
-- The only edit is the `fired` CTE, which used to read geelark_tasks alone and
-- now reads a UNION of the two delivery sources. Everything below it is
-- untouched, so the classifier, the cohorts and the age bands all still work
-- off the same columns they always did.
--
-- HOW THE TWO SIDES LINE UP:
--
--   Geelark   one task row. Fired at `schedule_at`. Counted as a delivery
--             failure when its fail_code is one of the eight codes the
--             scheduler team classes as a genuine delivery failure.
--   Manual    one post_deliveries row. Fired when the person was handed it
--             (created_at) or, once they have finished with it, when they
--             finished (done_at) — `coalesce(done_at, created_at)`, so a post
--             handed out on Monday and posted on Wednesday counts against
--             Wednesday, the day the work actually happened. Counted as a
--             delivery failure when its status is 'failed'.
--
-- KEYED ON geelark_profile, because that is what this view has always been
-- keyed on and what v_account_health_v3 joins to. post_deliveries is keyed on
-- accounts.id, so the accounts row is what carries one to the other. An account
-- with no geelark_profile at all would be invisible here — every account has
-- one today, and that is the same question PF-04 left open for PF-16, when
-- Geelark goes and this key stops meaning anything.
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
             LEFT JOIN perf p ON ((p.account = a.username)))
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

comment on view public.v_account_view_health is
  'Per-account posting and view statistics behind the health verdict. Delivery counters (fired_7d, fired_28d, deliv_fail_7d, last_fired_at) read BOTH fleets since PF-09: Geelark tasks and the post_deliveries rows handed to a person by hand.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. "Last post" means the last post on either fleet.
--
-- This view answers two different questions with two different pairs of
-- columns, and they must stay different (see supabase/migrations/README.md):
--
--   last_post_at / days_since_post        was posting ATTEMPTED at all
--   last_success_at / days_since_success  did a post actually GO OUT
--
-- The accounts table shows the success-only pair; the `warming` rule in
-- v_account_health_v3 deliberately reads the any-outcome pair, because it needs
-- to know whether anything was tried. Both are added to here; neither is
-- merged into the other.
--
-- WHY IT MATTERS FOR PF-09. Without this, an account on a real phone has
-- days_since_post = NULL for ever. That is not a cosmetic gap: the `warming`
-- rule fires on "warmed up in the last 7 days AND never posted", so an account
-- posting perfectly well by hand every day would sit on the Accounts page
-- reading `warming` — a brand-new account that has not started yet — with no
-- Last Post date beside it, indefinitely.
--
-- THE MANUAL SIDE, column by column:
--   attempted  coalesce(done_at, created_at). Handed out is an attempt, the
--              same way a Geelark task row is an attempt before it resolves;
--              once the person has finished with it, the day they finished is
--              the truer date. done_at is never earlier than created_at, so
--              last_post_at can never end up behind last_success_at.
--   succeeded  done_at where status = 'posted'. Not 'skipped' (a decision, not
--              a post) and not 'failed'.
create or replace view public.v_account_last_post as
 WITH attempts AS (
         SELECT geelark_tasks.serial_name AS geelark_profile,
            geelark_tasks.created_at AS at,
            (geelark_tasks.status = 3) AS ok
           FROM geelark_tasks
          WHERE (geelark_tasks.source_carousel_id IS NOT NULL)
        UNION ALL
         SELECT a.geelark_profile,
            COALESCE(d.done_at, d.created_at) AS at,
            (d.status = 'posted'::text) AS ok
           FROM (post_deliveries d
             JOIN accounts a ON ((a.id = d.account_id)))
          WHERE (a.geelark_profile IS NOT NULL)
        )
 SELECT geelark_profile,
    max(at) AS last_post_at,
    (((now() AT TIME ZONE 'America/New_York'::text))::date - (max((at AT TIME ZONE 'America/New_York'::text)))::date) AS days_since_post,
    max(at) FILTER (WHERE ok) AS last_success_at,
    (((now() AT TIME ZONE 'America/New_York'::text))::date - (max((at AT TIME ZONE 'America/New_York'::text)) FILTER (WHERE ok))::date) AS days_since_success
   FROM attempts
  GROUP BY geelark_profile;

comment on view public.v_account_last_post is
  'When each account last posted, and last posted successfully — reading Geelark posting tasks and the post_deliveries rows posted by hand as one thing (PF-09). Two pairs on purpose: the any-outcome pair says posting was attempted, the success-only pair says a post went out. Do not merge them.';


-- ─────────────────────────────────────────────────────────────────────────────
-- GRANTS: nothing to do, and that is deliberate.
--
-- Both statements above are CREATE OR REPLACE on an EXISTING view, which
-- preserves the existing ACL. The rule in supabase/migrations/README.md is that
-- a migration which CREATES an object names anon and authenticated in its
-- revoke, and a migration which REPLACES one leaves the grants exactly alone —
-- narrowing a view's exposure inside an unrelated fix makes the open-anon-key
-- audit in BACKLOG.md stop matching its own counts. Read the ACLs back after
-- applying and expect them unchanged:
--
--   select c.relname, array_to_string(c.relacl,' | ')
--     from pg_class c join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname = 'public'
--      and c.relname in ('v_account_view_health','v_account_last_post');
