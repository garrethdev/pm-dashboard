-- Content Calendar, month view. One row per (day, content_type) so a month
-- costs ~1 small result instead of the ~2,000 raw posts behind it.
--
-- "Live" mirrors what the Smart Scheduler itself reads: Ready + Posted. The
-- retired rich_life_carousel lane left ~460 Canceled shells lying around
-- (some dated into 2027), so counting by date alone shows posts that will
-- never happen. Cancelled/held/failed are returned separately rather than
-- dropped, so the page can offer them without a second round trip.
create or replace function public.calendar_month_rollup(p_start date, p_end date)
returns table (
  day date,
  content_type text,
  "character" text,
  bucket text,
  registry_lane boolean,
  live_n bigint,
  dead_n bigint,
  accounts bigint
)
language sql
stable
as $function$
  select
    u.posting_date::date as day,
    u.content_type,
    coalesce(a."character", '—') as "character",
    r.quota_bucket as bucket,
    -- A type with no ACTIVE registry row is posting outside the scheduler's
    -- accounting: it takes a time slot but no daily-cap slot, so an account
    -- can quietly exceed its cap. Surfaced rather than silently folded in.
    (r.content_type is not null) as registry_lane,
    count(*) filter (where u.posting_status in ('Ready','Posted'))          as live_n,
    count(*) filter (where u.posting_status not in ('Ready','Posted'))      as dead_n,
    count(distinct u.geelark_profile)
      filter (where u.posting_status in ('Ready','Posted'))                 as accounts
  from unified_posts u
  left join accounts a on a.geelark_profile = u.geelark_profile
  left join content_type_registry r
         on r.content_type = u.content_type and r.active
  where u.posting_date is not null
    and u.posting_date::date between p_start and p_end
  group by 1, 2, 3, 4, 5
  having count(*) > 0
  order by 1, 6 desc, 2;
$function$;