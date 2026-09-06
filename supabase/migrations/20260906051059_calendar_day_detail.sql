-- Content Calendar, one day expanded: every scheduled post with the account
-- it belongs to. A day is ~70 rows, so this returns flat and the app groups
-- per account.
--
-- posting_time is TEXT and holds two formats — 3,499 rows as 'HH:MM[:SS]' and
-- 1,044 as 'H:MM AM/PM'. Sorting it as text would interleave 9 PM before 10 AM,
-- so a minute-of-day is computed with the same rule the Smart Scheduler's
-- toMin() uses, and the raw string is returned alongside for display.
create or replace function public.calendar_day_detail(p_day date)
returns table (
  geelark_profile text,
  username text,
  "character" text,
  platform text,
  health text,
  is_active boolean,
  posting_paused boolean,
  content_type text,
  bucket text,
  registry_lane boolean,
  posting_time text,
  minute_of_day integer,
  posting_status text,
  content_id text
)
language sql
stable
as $function$
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