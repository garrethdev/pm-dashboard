-- The day view now reads delivery from geelark_tasks, not from posting_status.
--
-- posting_status is written optimistically by the poster and only corrected by
-- [Reconcile] Daily Failed Posts at 14:00 ET, so a post that fails during the
-- afternoon/evening window reads "Posted" until the NEXT day's reconcile. On
-- 2026-09-06 that was 12 rows in seven days, 9 of them from the day before.
--
-- The task table is polled per row (detail_polled_at is set on every task), so
-- it is the earliest honest answer available. Joined on BOTH content id and
-- serial_name: a carousel can be assigned to several profiles, and a task
-- belongs to exactly one of them.

drop function if exists public.calendar_day_detail(date);

create function public.calendar_day_detail(p_day date)
returns table(geelark_profile text, username text, "character" text, platform text,
              health text, is_active boolean, posting_paused boolean, content_type text,
              bucket text, registry_lane boolean, posting_time text, minute_of_day integer,
              posting_status text, content_id text,
              delivery text, fail_code text, fail_desc text)
language sql stable as $function$
  with t as (
    select
      u.*,
      case when u.posting_time ~ '^\d{1,2}:\d{2}' then
        (split_part(u.posting_time, ':', 1))::int * 60
        + (substring(u.posting_time from '^\d{1,2}:(\d{2})'))::int
        + case
            when u.posting_time ~* 'PM' and (split_part(u.posting_time, ':', 1))::int < 12 then 720
            when u.posting_time ~* 'AM' and (split_part(u.posting_time, ':', 1))::int = 12 then -720
            else 0
          end
      end as mod_min
    from unified_posts u
    where u.posting_date is not null
      and u.posting_date::date = p_day
      and u.posting_status is distinct from 'Canceled'
  )
  select
    t.geelark_profile,
    a.username,
    coalesce(a."character", '—') as "character",
    lower(coalesce(t.platform, a.platform, '')) as platform,
    coalesce(h.health, a.health_status) as health,
    a.is_active,
    a.posting_paused,
    t.content_type,
    r.quota_bucket as bucket,
    (r.content_type is not null) as registry_lane,
    t.posting_time,
    t.mod_min as minute_of_day,
    t.posting_status,
    t.content_id::text,
    -- 'posted'  a task for this row completed (Geelark status 3)
    -- 'failed'  every task for it ended 4 or 7
    -- 'pending' a task exists but has not resolved yet
    -- 'none'    no task was ever created — nothing has been attempted
    case
      when gt.any_ok   then 'posted'
      when gt.any_fail then 'failed'
      when gt.n > 0    then 'pending'
      else 'none'
    end as delivery,
    gt.fail_code,
    gt.fail_desc
  from t
  left join accounts a on a.geelark_profile = t.geelark_profile
  left join v_account_health_v3 h on h.geelark_profile = t.geelark_profile
  left join content_type_registry r
         on r.content_type = t.content_type and r.active
  left join lateral (
    select
      bool_or(g.status = 3)            as any_ok,
      bool_or(g.status in (4, 7))      as any_fail,
      count(*)                         as n,
      -- the most recent failure is the one worth showing
      (array_agg(g.fail_code order by g.created_at desc)
         filter (where g.fail_code is not null))[1] as fail_code,
      (array_agg(g.fail_desc order by g.created_at desc)
         filter (where g.fail_desc is not null))[1] as fail_desc
    from geelark_tasks g
    where g.source_carousel_id = t.content_id::text
      and g.serial_name = t.geelark_profile
  ) gt on true
  -- A post with no parseable time is still a post; it sorts last rather than
  -- being dropped, so the day's total agrees with the month view.
  order by t.mod_min nulls last, t.geelark_profile;
$function$;