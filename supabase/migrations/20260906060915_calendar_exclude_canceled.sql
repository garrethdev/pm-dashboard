-- Canceled rows never reach a phone, so the Content Calendar stops counting
-- and stops showing them (Garreth 2026-09-06). Excluded at the source rather
-- than in the component so the month grid and the day panel cannot disagree.
-- "dead" now means Hold or Failed: a post that was meant to go out and did not.

create or replace function public.calendar_month_rollup(p_start date, p_end date)
returns table(day date, content_type text, "character" text, bucket text,
              registry_lane boolean, live_n bigint, dead_n bigint, accounts bigint)
language sql stable as $function$
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
    and u.posting_status is distinct from 'Canceled'
  group by 1, 2, 3, 4, 5
  having count(*) > 0
  order by 1, 6 desc, 2;
$function$;

create or replace function public.calendar_month_days(p_start date, p_end date)
returns table(day date, live_n bigint, dead_n bigint, accounts bigint, off_registry boolean)
language sql stable as $function$
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
    and u.posting_status is distinct from 'Canceled'
  group by 1
  order by 1;
$function$;

create or replace function public.calendar_day_detail(p_day date)
returns table(geelark_profile text, username text, "character" text, platform text,
              health text, is_active boolean, posting_paused boolean, content_type text,
              bucket text, registry_lane boolean, posting_time text, minute_of_day integer,
              posting_status text, content_id text)
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
    t.content_id::text
  from t
  left join accounts a on a.geelark_profile = t.geelark_profile
  left join v_account_health_v3 h on h.geelark_profile = t.geelark_profile
  left join content_type_registry r
         on r.content_type = t.content_type and r.active
  -- A post with no parseable time is still a post; it sorts last rather than
  -- being dropped, so the day's total agrees with the month view.
  order by t.mod_min nulls last, t.geelark_profile;
$function$;