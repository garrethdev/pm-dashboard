-- The month grid now agrees with the day panel: both resolve delivery from
-- geelark_tasks rather than trusting posting_status.
--
-- Counting rules, chosen so a future day still reads correctly:
--   live_n   rows that are Ready/Posted AND did not fail. A row nothing has
--            attempted yet (delivery 'none') is still a post the scheduler
--            intends to make, so tomorrow shows its ten, not zero.
--   failed_n every row Geelark could not deliver, whatever posting_status says.
--            Kept separate from live_n rather than subtracted silently, so the
--            cell can show "51 posts · 14 failed" instead of an unexplained dip.
--   dead_n   held or otherwise not-live rows that did NOT fail — a failed Hold
--            row belongs to failed_n and must not be counted twice.

drop function if exists public.calendar_month_rollup(date, date);
drop function if exists public.calendar_month_days(date, date);

create function public.calendar_month_rollup(p_start date, p_end date)
returns table(day date, content_type text, "character" text, bucket text,
              registry_lane boolean, live_n bigint, dead_n bigint,
              failed_n bigint, accounts bigint)
language sql stable as $function$
  with t as (
    select
      u.posting_date::date as day,
      u.content_type,
      u.geelark_profile,
      u.content_id,
      u.posting_status,
      (u.posting_status in ('Ready','Posted')) as is_live
    from unified_posts u
    where u.posting_date is not null
      and u.posting_date::date between p_start and p_end
      and u.posting_status is distinct from 'Canceled'
  ),
  tagged as (
    select t.*,
      coalesce(gt.any_fail, false) as failed
    from t
    left join lateral (
      select bool_or(g.status in (4, 7)) and not coalesce(bool_or(g.status = 3), false) as any_fail
      from geelark_tasks g
      where g.source_carousel_id = t.content_id::text
        and g.serial_name = t.geelark_profile
    ) gt on true
  )
  select
    x.day,
    x.content_type,
    coalesce(a."character", '—') as "character",
    r.quota_bucket as bucket,
    -- A type with no ACTIVE registry row is posting outside the scheduler's
    -- accounting: it takes a time slot but no daily-cap slot, so an account
    -- can quietly exceed its cap. Surfaced rather than silently folded in.
    (r.content_type is not null) as registry_lane,
    count(*) filter (where x.is_live and not x.failed)      as live_n,
    count(*) filter (where not x.is_live and not x.failed)  as dead_n,
    count(*) filter (where x.failed)                        as failed_n,
    count(distinct x.geelark_profile)
      filter (where x.is_live and not x.failed)             as accounts
  from tagged x
  left join accounts a on a.geelark_profile = x.geelark_profile
  left join content_type_registry r
         on r.content_type = x.content_type and r.active
  group by 1, 2, 3, 4, 5
  having count(*) > 0
  order by 1, 6 desc, 2;
$function$;

create function public.calendar_month_days(p_start date, p_end date)
returns table(day date, live_n bigint, dead_n bigint, failed_n bigint,
              accounts bigint, off_registry boolean)
language sql stable as $function$
  with t as (
    select
      u.posting_date::date as day,
      u.content_type,
      u.geelark_profile,
      u.content_id,
      (u.posting_status in ('Ready','Posted')) as is_live
    from unified_posts u
    where u.posting_date is not null
      and u.posting_date::date between p_start and p_end
      and u.posting_status is distinct from 'Canceled'
  ),
  tagged as (
    select t.*, coalesce(gt.any_fail, false) as failed
    from t
    left join lateral (
      select bool_or(g.status in (4, 7)) and not coalesce(bool_or(g.status = 3), false) as any_fail
      from geelark_tasks g
      where g.source_carousel_id = t.content_id::text
        and g.serial_name = t.geelark_profile
    ) gt on true
  )
  select
    x.day,
    count(*) filter (where x.is_live and not x.failed)     as live_n,
    count(*) filter (where not x.is_live and not x.failed) as dead_n,
    count(*) filter (where x.failed)                       as failed_n,
    count(distinct x.geelark_profile)
      filter (where x.is_live and not x.failed)            as accounts,
    bool_or(r.content_type is null and x.is_live and not x.failed) as off_registry
  from tagged x
  left join content_type_registry r
         on r.content_type = x.content_type and r.active
  group by 1
  order by 1;
$function$;