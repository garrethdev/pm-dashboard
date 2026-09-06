-- Day-level totals for the calendar. Separate from calendar_month_rollup
-- because a distinct account count cannot be derived from per-type rows: an
-- account posting two types would be counted twice by a sum, and taking the
-- max across types undercounts. Postgres also disallows COUNT(DISTINCT) as a
-- window function, so this is its own small aggregate.
create or replace function public.calendar_month_days(p_start date, p_end date)
returns table (
  day date,
  live_n bigint,
  dead_n bigint,
  accounts bigint,
  off_registry boolean
)
language sql
stable
as $function$
  select
    u.posting_date::date as day,
    count(*) filter (where u.posting_status in ('Ready','Posted'))     as live_n,
    count(*) filter (where u.posting_status not in ('Ready','Posted')) as dead_n,
    count(distinct u.geelark_profile)
      filter (where u.posting_status in ('Ready','Posted'))            as accounts,
    bool_or(r.content_type is null and u.posting_status in ('Ready','Posted')) as off_registry
  from unified_posts u
  left join content_type_registry r
         on r.content_type = u.content_type and r.active
  where u.posting_date is not null
    and u.posting_date::date between p_start and p_end
  group by 1
  order by 1;
$function$;