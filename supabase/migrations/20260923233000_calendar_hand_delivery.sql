-- P11 (Garreth approved the design 2026-09-23): the Physical calendar says
-- what the To-do list says about a post made by hand.
--
-- Two additions, nothing else:
--
--   calendar_day_detail_fleet gains `hand` and `post_url`. `hand` is the
--   hand-out's own status in the To-do list's words: queued, posted,
--   postedNoLink (ticked posted, link not pasted yet), failed, skipped. NULL
--   for a Geelark post and for a Physical post not handed out yet. `post_url`
--   is the link, only on a posted row. `delivery` is unchanged: it still folds
--   these into posted / failed / pending, and a skipped one still reads
--   pending there.
--
--   calendar_month_days_fleet gains `link_needed`: posts ticked posted whose
--   link is still owed, so the month grid can say "N links needed".
--
-- Adding output columns changes the return type, which `create or replace`
-- cannot do, so each is dropped and created again inside this one migration.
-- Only the app calls them (through the service key), and every column they
-- returned before comes back identical: proven by fingerprinting both
-- functions over 2026-09-02..24 for all three fleets before and after.
--
-- The originals (calendar_day_detail, calendar_month_days) are untouched.
-- They are Geelark-only and never read post_deliveries, so there is nothing
-- for them to match: the pair rule in README.md is about the fleet gate,
-- which is unchanged here.

drop function public.calendar_month_days_fleet(date, date, text);

create function public.calendar_month_days_fleet(
  p_start date,
  p_end date,
  p_fleet text default 'all'
)
 returns table(day date, live_n bigint, dead_n bigint, failed_n bigint, accounts bigint, off_registry boolean, link_needed bigint)
 language sql
 stable
as $function$
  with physical_profiles as (
    select a.geelark_profile
      from accounts a
     where a.delivery_mode = 'manual'
       and a.geelark_profile is not null
  ),
  t as (
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
      and (p_fleet = 'all'
           or (p_fleet = 'physical' and exists (
                 select 1 from physical_profiles pp
                  where pp.geelark_profile = u.geelark_profile))
           or (p_fleet = 'cloud' and not exists (
                 select 1 from physical_profiles pp
                  where pp.geelark_profile = u.geelark_profile)))
  ),
  tagged as (
    select t.*, coalesce(gt.any_fail, false) as failed,
           coalesce(gt.need_link, false) as need_link
    from t
    left join lateral (
      select bool_or(s.fail) and not coalesce(bool_or(s.ok), false) as any_fail,
             bool_or(s.need_link) as need_link
      from (
        select (g.status = 3) as ok, (g.status in (4, 7)) as fail,
               false as need_link
          from geelark_tasks g
         where g.source_carousel_id = t.content_id::text
           and g.serial_name = t.geelark_profile
        union all
        select (d.status = 'posted') as ok, (d.status = 'failed') as fail,
               (d.status = 'posted' and nullif(btrim(d.post_url), '') is null) as need_link
          from post_deliveries d
          join accounts a on a.id = d.account_id
         where d.source_id = t.content_id::text
           and d.content_type = t.content_type
           and a.geelark_profile = t.geelark_profile
      ) s
    ) gt on true
  )
  select
    x.day,
    count(*) filter (where x.is_live and not x.failed)     as live_n,
    count(*) filter (where not x.is_live and not x.failed) as dead_n,
    count(*) filter (where x.failed)                       as failed_n,
    count(distinct x.geelark_profile)
      filter (where x.is_live and not x.failed)            as accounts,
    bool_or(r.content_type is null and x.is_live and not x.failed) as off_registry,
    count(*) filter (where x.need_link and not x.failed)   as link_needed
  from tagged x
  left join content_type_registry r
         on r.content_type = x.content_type and r.active
  group by 1
  order by 1;
$function$;

comment on function public.calendar_month_days_fleet(date, date, text) is
  'PF-19: calendar_month_days limited to one fleet, and reading delivery from both geelark_tasks and post_deliveries (PF-09). P11: link_needed counts hand-made posts ticked posted whose link is still owed. The original is untouched.';

revoke all on function public.calendar_month_days_fleet(date, date, text) from public, anon, authenticated;
grant execute on function public.calendar_month_days_fleet(date, date, text) to service_role;


drop function public.calendar_day_detail_fleet(date, text);

create function public.calendar_day_detail_fleet(
  p_day date,
  p_fleet text default 'all'
)
 returns table(geelark_profile text, username text, "character" text, platform text, health text, is_active boolean, posting_paused boolean, content_type text, bucket text, registry_lane boolean, posting_time text, minute_of_day integer, posting_status text, content_id text, delivery text, fail_code text, fail_desc text, hand text, post_url text)
 language sql
 stable
as $function$
  with physical_profiles as (
    select a.geelark_profile
      from accounts a
     where a.delivery_mode = 'manual'
       and a.geelark_profile is not null
  ),
  t as (
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
      and (p_fleet = 'all'
           or (p_fleet = 'physical' and exists (
                 select 1 from physical_profiles pp
                  where pp.geelark_profile = u.geelark_profile))
           or (p_fleet = 'cloud' and not exists (
                 select 1 from physical_profiles pp
                  where pp.geelark_profile = u.geelark_profile)))
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
    case
      when gt.any_ok   then 'posted'
      when gt.any_fail then 'failed'
      when gt.n > 0    then 'pending'
      else 'none'
    end as delivery,
    gt.fail_code,
    gt.fail_desc,
    gt.hand,
    gt.post_url
  from t
  left join accounts a on a.geelark_profile = t.geelark_profile
  left join v_account_health_v3 h on h.geelark_profile = t.geelark_profile
  left join content_type_registry r
         on r.content_type = t.content_type and r.active
  left join lateral (
    select
      bool_or(s.ok)   as any_ok,
      bool_or(s.fail) as any_fail,
      count(*)        as n,
      -- the most recent failure is the one worth showing, whichever fleet it
      -- came from
      (array_agg(s.fail_code order by s.at desc)
         filter (where s.fail_code is not null))[1] as fail_code,
      (array_agg(s.fail_desc order by s.at desc)
         filter (where s.fail_desc is not null))[1] as fail_desc,
      (array_agg(s.hand order by s.at desc)
         filter (where s.hand is not null))[1] as hand,
      (array_agg(s.post_url order by s.at desc)
         filter (where s.post_url is not null))[1] as post_url
    from (
      select (g.status = 3) as ok, (g.status in (4, 7)) as fail,
             g.fail_code, g.fail_desc, g.created_at as at,
             null::text as hand, null::text as post_url
        from geelark_tasks g
       where g.source_carousel_id = t.content_id::text
         and g.serial_name = t.geelark_profile
      union all
      select (d.status = 'posted') as ok, (d.status = 'failed') as fail,
             null::text as fail_code,
             case when d.status = 'failed' then d.note end as fail_desc,
             coalesce(d.done_at, d.created_at) as at,
             case d.status
               when 'posted' then
                 case when nullif(btrim(d.post_url), '') is null
                      then 'postedNoLink' else 'posted' end
               else d.status
             end as hand,
             case when d.status = 'posted' then nullif(btrim(d.post_url), '') end as post_url
        from post_deliveries d
        join accounts a2 on a2.id = d.account_id
       where d.source_id = t.content_id::text
         and d.content_type = t.content_type
         and a2.geelark_profile = t.geelark_profile
    ) s
  ) gt on true
  -- A post with no parseable time is still a post; it sorts last rather than
  -- being dropped, so the day's total agrees with the month view.
  order by t.mod_min nulls last, t.geelark_profile;
$function$;

comment on function public.calendar_day_detail_fleet(date, text) is
  'PF-19: calendar_day_detail limited to one fleet, and reading delivery from both geelark_tasks and post_deliveries (PF-09). A hand-posted failure shows the note the person left as fail_desc. P11: hand is the hand-out''s To-do status (queued, posted, postedNoLink, failed, skipped) and post_url its link. The original is untouched.';

revoke all on function public.calendar_day_detail_fleet(date, text) from public, anon, authenticated;
grant execute on function public.calendar_day_detail_fleet(date, text) to service_role;
