-- Two changes only, both in the `fleet` CTE and the line that uses it:
--   glp_week now reads scheduler_buckets.weekly_quota instead of quota_value
--   fil_week is new, and fil_week_cap falls back to it instead of a literal 10
-- Everything else is the view as it stood.

create or replace view public.v_scheduler_account_config as
 WITH fleet AS (
         SELECT max(scheduler_buckets.weekly_quota) FILTER (WHERE scheduler_buckets.bucket = 'glp'::text) AS glp_week,
            max(scheduler_buckets.weekly_quota) FILTER (WHERE scheduler_buckets.bucket = 'filler'::text) AS fil_week,
            max(scheduler_buckets.quota_value) FILTER (WHERE scheduler_buckets.bucket = 'filler'::text) AS fil_day,
            max(scheduler_buckets.max_posts_per_day_per_profile) AS day_cap,
            max(scheduler_buckets.min_gap_minutes) AS min_gap,
            max(scheduler_buckets.time_window_start) AS win_start,
            max(scheduler_buckets.time_window_end) AS win_end
           FROM scheduler_buckets
        ), acct AS (
         SELECT a.geelark_profile,
            a."character",
            a.platform,
            a.account_created_on
           FROM accounts a
          WHERE a.is_active IS TRUE AND a.posting_paused IS FALSE AND a."character" ~~ 'Character%'::text
        ), deliv AS (
         SELECT geelark_tasks.serial_name,
            count(*) FILTER (WHERE geelark_tasks.status = ANY (ARRAY[3, 4, 7])) AS attempts,
            count(*) FILTER (WHERE geelark_tasks.status = ANY (ARRAY[4, 7])) AS fails
           FROM geelark_tasks
          WHERE geelark_tasks.source_carousel_id IS NOT NULL AND geelark_tasks.created_at > (now() - '7 days'::interval)
          GROUP BY geelark_tasks.serial_name
        ), ov AS (
         SELECT scheduler_overrides.scope,
            scheduler_overrides.scope_key,
            scheduler_overrides.bucket,
            scheduler_overrides.weekly_cap,
            scheduler_overrides.daily_cap,
            scheduler_overrides.max_posts_per_day,
            scheduler_overrides.min_gap_minutes,
            scheduler_overrides.spacing_minutes,
            scheduler_overrides.window_start,
            scheduler_overrides.window_end,
            scheduler_overrides.bypass_guards,
            scheduler_overrides.only_content_types
           FROM scheduler_overrides
          WHERE scheduler_overrides.active IS TRUE
        ), base AS (
         SELECT x.geelark_profile,
            x."character",
            x.platform,
            x.account_created_on,
                CASE
                    WHEN x.account_created_on IS NULL THEN 0
                    ELSE GREATEST(0, (now() AT TIME ZONE 'America/New_York'::text)::date - x.account_created_on)
                END AS age_days,
            COALESCE(oa_g.weekly_cap, oc_g.weekly_cap, f.glp_week, 10) AS glp_week_cap,
            COALESCE(oa_f.weekly_cap, oc_f.weekly_cap, f.fil_week, 10) AS fil_week_cap,
            COALESCE(oa_f.daily_cap, oc_f.daily_cap, f.fil_day, 2) AS fil_day_cap,
            COALESCE(oa_n.max_posts_per_day, oc_n.max_posts_per_day, f.day_cap, 3) AS day_cap,
            COALESCE(oa_n.min_gap_minutes, oc_n.min_gap_minutes, f.min_gap, 120) AS min_gap_minutes,
            COALESCE(oa_n.spacing_minutes, oc_n.spacing_minutes, 30) AS spacing_minutes,
            COALESCE(oa_n.window_start, oc_n.window_start, f.win_start, '11:00:00'::time without time zone) AS window_start,
            COALESCE(oa_n.window_end, oc_n.window_end, f.win_end, '22:15:00'::time without time zone) AS window_end,
            COALESCE(oa_n.bypass_guards, oc_n.bypass_guards, false) AS bypass_guards,
            COALESCE(oa_n.only_content_types, oc_n.only_content_types) AS only_content_types
           FROM acct x
             CROSS JOIN fleet f
             LEFT JOIN ov oc_g ON oc_g.scope = 'character'::text AND oc_g.scope_key = x."character" AND oc_g.bucket = 'glp'::text
             LEFT JOIN ov oc_f ON oc_f.scope = 'character'::text AND oc_f.scope_key = x."character" AND oc_f.bucket = 'filler'::text
             LEFT JOIN ov oc_n ON oc_n.scope = 'character'::text AND oc_n.scope_key = x."character" AND oc_n.bucket IS NULL
             LEFT JOIN ov oa_g ON oa_g.scope = 'account'::text AND oa_g.scope_key = x.geelark_profile AND oa_g.bucket = 'glp'::text
             LEFT JOIN ov oa_f ON oa_f.scope = 'account'::text AND oa_f.scope_key = x.geelark_profile AND oa_f.bucket = 'filler'::text
             LEFT JOIN ov oa_n ON oa_n.scope = 'account'::text AND oa_n.scope_key = x.geelark_profile AND oa_n.bucket IS NULL
        ), ramped AS (
         SELECT b.geelark_profile,
            b."character",
            b.platform,
            b.account_created_on,
            b.age_days,
            b.glp_week_cap,
            b.fil_week_cap,
            b.fil_day_cap,
            b.day_cap,
            b.min_gap_minutes,
            b.spacing_minutes,
            b.window_start,
            b.window_end,
            b.bypass_guards,
            b.only_content_types,
                CASE
                    WHEN b.bypass_guards THEN b.day_cap
                    WHEN b.age_days < 9 THEN 0
                    WHEN b.age_days <= 15 THEN 1
                    WHEN b.age_days <= 22 THEN 2
                    ELSE b.day_cap
                END AS ramp_day_cap,
                CASE
                    WHEN b.bypass_guards THEN b.day_cap
                    WHEN b.age_days <= 15 THEN 0
                    WHEN b.age_days <= 22 THEN 1
                    ELSE b.day_cap
                END AS ramp_glp_cap,
                CASE
                    WHEN b.bypass_guards THEN NULL::integer
                    WHEN b.age_days < 9 THEN 0
                    WHEN b.age_days <= 15 THEN 1
                    WHEN b.age_days <= 22 THEN 2
                    ELSE NULL::integer
                END AS ramp_only_cap
           FROM base b
        ), resolved AS (
         SELECT r.geelark_profile,
            r."character",
            r.platform,
            r.account_created_on,
            r.age_days,
            r.glp_week_cap,
            r.fil_week_cap,
            r.fil_day_cap,
            r.day_cap,
            r.min_gap_minutes,
            r.spacing_minutes,
            r.window_start,
            r.window_end,
            r.ramp_day_cap,
            r.ramp_glp_cap,
            r.bypass_guards,
            r.only_content_types,
                CASE
                    WHEN r.bypass_guards THEN NULL::integer
                    ELSE NULLIF(LEAST(COALESCE(r.ramp_only_cap, 2147483647), COALESCE(p.max_posts_per_day, 2147483647)), 2147483647)
                END AS guard_cap,
            COALESCE(h.health, 'unknown'::text) AS health,
            p.health AS policy_hit,
            COALESCE(d.attempts, 0::bigint) AS deliv_attempts_7d,
            COALESCE(d.fails, 0::bigint) AS deliv_fails_7d,
                CASE
                    WHEN r.bypass_guards THEN r.ramp_day_cap
                    ELSE LEAST(r.ramp_day_cap, COALESCE(p.max_posts_per_day, r.ramp_day_cap))
                END AS eff_day_cap,
                CASE
                    WHEN r.bypass_guards THEN r.ramp_glp_cap
                    ELSE LEAST(r.ramp_glp_cap, COALESCE(p.max_glp_per_day, r.ramp_glp_cap))
                END AS eff_glp_cap
           FROM ramped r
             LEFT JOIN v_account_health_v3 h ON h.geelark_profile = r.geelark_profile
             LEFT JOIN scheduler_health_policy p ON p.health = h.health
             LEFT JOIN deliv d ON d.serial_name = r.geelark_profile
        )
 SELECT geelark_profile,
    "character",
    platform,
    account_created_on,
    age_days,
    health,
    glp_week_cap,
    fil_week_cap,
    eff_day_cap AS max_posts_per_day,
    LEAST(eff_glp_cap, eff_day_cap) AS max_glp_per_day,
    LEAST(fil_day_cap, eff_day_cap) AS max_filler_per_day,
    min_gap_minutes,
    spacing_minutes,
    (EXTRACT(hour FROM window_start) * 60::numeric + EXTRACT(minute FROM window_start))::integer AS window_start_min,
    (EXTRACT(hour FROM window_end) * 60::numeric + EXTRACT(minute FROM window_end))::integer AS window_end_min,
    deliv_attempts_7d,
    deliv_fails_7d,
    round(deliv_fails_7d::numeric / NULLIF(deliv_attempts_7d, 0)::numeric, 2) AS deliv_fail_rate_7d,
    COALESCE(NOT (deliv_attempts_7d >= 4 AND (deliv_fails_7d::numeric / NULLIF(deliv_attempts_7d, 0)::numeric) >= 0.80), true) AS can_deliver,
        CASE
            WHEN deliv_attempts_7d >= 4 AND (deliv_fails_7d::numeric / NULLIF(deliv_attempts_7d, 0)::numeric) >= 0.80 THEN ((('delivery: '::text || deliv_fails_7d) || '/'::text) || deliv_attempts_7d) || ' failed in 7d'::text
            WHEN bypass_guards THEN NULL::text
            WHEN age_days < 9 THEN 'ramp: under 9 days old'::text
            WHEN age_days <= 15 THEN 'ramp: 1/day until day 16'::text
            WHEN age_days <= 22 THEN 'ramp: 2/day until day 23'::text
            WHEN policy_hit IS NOT NULL THEN 'health: '::text || health
            ELSE NULL::text
        END AS throttle_reason,
    guard_cap AS guard_day_cap,
    only_content_types
   FROM resolved;