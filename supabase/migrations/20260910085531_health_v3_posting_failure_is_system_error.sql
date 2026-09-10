-- "system error" no longer hides behind view_health, so a persistent posting
-- failure cannot read as "warming".
--
-- Garreth's call, 2026-09-10: an account that should already be posting but is
-- erroring is NOT warming, and once the errors persist it is a system error.
--
-- Two things were in the way.
--
-- 1. The existing system-error clause is gated on
--    view_health IN ('no data','tracking broken'). An account failing every
--    post but still carrying a 'watch' / 'healthy' / 'ramping' view verdict
--    skipped that clause entirely and, if it had warmed in the last 7 days,
--    landed on 'warming' via the posting_paused branch -- broken, but labelled
--    as if it were still coming up. This adds a second system-error clause
--    with no view_health gate.
--
-- 2. The warming clause keeps reading days_since_post (ANY outcome) on
--    purpose. Pointing it at the new success-only column would have inverted
--    it: an account whose posts all fail has no successful post, which reads
--    as "has not started yet" => 'warming', exactly backwards. The accounts
--    table reads the success-only columns for DISPLAY; the classifier reads
--    the any-outcome ones to decide whether posting has been ATTEMPTED. That
--    split is deliberate -- see the account_last_post_success_only migration.
--
-- Persistence threshold is >= 3 posting errors in 7d, matching the existing
-- clause, AND nothing landed in the last 7 days. That second guard is what
-- keeps high-volume accounts out: on 2026-09-10 Profiles 8, 9, 20 and 36 each
-- had 7-15 posting errors in the window but were posting fine (last success
-- 1-3 days ago), and none are flagged. days_since_success comes from
-- geelark_tasks, NOT from the analytics ingest, so an OAuth token lapsing
-- cannot manufacture a false "nothing landed".
--
-- Verified before applying, against a snapshot of the previous view: identical
-- column contract, and 0 differing rows over all 54 columns x 59 accounts. The
-- only account the new clause selects is Profile 21, which clause 1 already
-- called 'system error'. This closes a hole rather than reclassifying anyone
-- today. v_scheduler_account_config and v_account_health_review_latest both
-- read this view, which is why the column list is pinned.
--
-- Known edge, deliberately NOT changed here: an account whose persistent
-- failures carry a ban-ish fail reason is excluded from BOTH system-error
-- clauses (that exclusion is pre-existing policy -- a ban is not a system
-- error) and, without banned_at / status_note evidence to trip the ban clause,
-- can still land on 'warming'. Routing that case is a ban-policy decision, not
-- a display fix.
--
-- Column list, types and order are IDENTICAL to the previous definition. The
-- CTEs now use v.* / base.* / scored.* instead of re-listing every column by
-- hand -- the final SELECT still enumerates the contract explicitly, so the
-- view's shape is pinned there and the body cannot drift from it.

create or replace view public.v_account_health_v3 as
  with perf as (
    select account, posted_at, views from tt_post_performance
    union all
    select account, posted_at, views from post_performance
  ), ranked as (
    select a.geelark_profile, p.views,
           row_number() over (partition by a.geelark_profile order by p.posted_at desc) as rn
      from accounts a
      join perf p on p.account = a.username
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
