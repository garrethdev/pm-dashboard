-- Inventory counts a new content type's priority week (Garreth, 2026-10-19).
--
-- WHY. Smart Scheduler 1.3.0 (n8n, live 2026-10-19) puts a NEW content type
-- first for its first 7 days: every account gets one of it each working day,
-- ahead of the normal share. "What to make next" still gave it the normal
-- share (Divorce Recovery: 4 of Character 6's 14, about 7 a week across its
-- three live accounts), so in that week it asked for far less than the
-- scheduler takes (18), and for too much of the sister types.
--
-- WHAT.
--   * v_content_type_priority: the content types in their priority week, by
--     the same rule as the scheduler. Set up (registry created_at) in the last
--     30 days, and either never scheduled yet or first scheduled (Ready /
--     Posted / Failed, not Canceled) under 7 days ago. The week runs from the
--     first scheduled day; until then it has not started (days_left = 7).
--     The scheduler still carries its own copy of the rule in n8n; it can be
--     pointed at this view later so the two cannot drift.
--   * inventory_lane_demand_fleet: weekly_demand now follows the scheduler.
--     A priority type takes one a working day per account (held to the
--     type's weekly ceiling and the account's own weekly cap; the newest type
--     first when there are two). What is left is shared between the other
--     types as before. An account's total does not change, so the character
--     totals (inventory_rollup_fleet) are unchanged. New column
--     normal_weekly_demand keeps the plain share.
--   * scheduler_production_order_fleet: new columns normal_weekly_demand,
--     is_new, priority_until (null until the first piece is scheduled) and
--     current_rate_days: how many more days weekly_demand holds before the
--     normal share returns. For a new type that is its own days left; for its
--     sister types it is the longest days left of their character's new
--     types, since they are only squeezed while one is. Days of cover and
--     status use the current rate (the normal one if the current is zero);
--     "to make for 21 days" uses the current rate for current_rate_days and
--     the normal rate after.
--
-- Both functions change their return type, so they are dropped and created
-- again, and their grants (service role only) are re-applied. inventory_check,
-- inventory_rollup and v_scheduler_production_order (the emails) are not
-- touched.

create or replace view public.v_content_type_priority as
with today as (
  select (now() at time zone 'America/New_York')::date as d
),
lanes as (
  select r.content_type, r."character", r.created_at,
         (r.created_at at time zone 'America/New_York')::date as set_up_on,
         (select min(u.posting_date::date)
            from unified_posts u
           where u.content_type = r.content_type
             and u.posting_status in ('Ready', 'Posted', 'Failed')) as first_scheduled
  from content_type_registry r
  where r.active is true
    and r.quota_bucket = 'glp'
    and r.created_at is not null
)
select l.content_type,
       l."character",
       l.created_at,
       l.set_up_on,
       l.first_scheduled,
       l.first_scheduled + 6 as priority_until,
       case when l.first_scheduled is null then 7
            else (l.first_scheduled + 6) - t.d + 1 end as days_left
from lanes l
cross join today t
where t.d - l.set_up_on <= 30
  and (l.first_scheduled is null or t.d - l.first_scheduled < 7);

comment on view public.v_content_type_priority is
  'Content types in their priority week: set up in the last 30 days and first '
  'scheduled under 7 days ago (or not yet). Same rule as Smart Scheduler 1.3.0 '
  '(Garreth, 2026-10-19).';

revoke all on public.v_content_type_priority from public, anon, authenticated;
grant select on public.v_content_type_priority to service_role;

drop function if exists public.scheduler_production_order_fleet(text);
drop function if exists public.inventory_lane_demand_fleet(text);

create function public.inventory_lane_demand_fleet(p_fleet text default 'all')
 returns table(geelark_profile text, "character" text, content_type text, bucket text,
               weekly_demand numeric, normal_weekly_demand numeric)
 language sql
 stable
as $function$
with wd as (
  -- Working days in a week: seven less the days off.
  select greatest(7 - coalesce((
    select cardinality(array(select distinct x from unnest(w.days_off) x))
      from work_week w limit 1), 0), 1)::numeric as n
),
acct as (
  select c.geelark_profile, c."character", c.only_content_types,
    least(coalesce(c.glp_week_cap, 0),
          coalesce(c.max_glp_per_day, 0) * w.n,
          coalesce(c.max_posts_per_day, 0) * w.n)::numeric as glp_week,
    least(coalesce(c.fil_week_cap, 0),
          coalesce(c.max_filler_per_day, 0) * w.n)::numeric as fil_week,
    (coalesce(c.max_posts_per_day, 0) * w.n)::numeric as all_week
  from v_scheduler_account_config c
  cross join wd w
  where c.max_posts_per_day > 0 and c.can_deliver
    and (p_fleet is not distinct from 'all' or exists (
          select 1 from accounts f
          where f.geelark_profile = c.geelark_profile
            and f.delivery_mode = case p_fleet when 'physical' then 'manual' else 'geelark' end))
),
-- The content types the planner may give each account: its character's (or
-- everyone's), allowed for it, and inside an "only these" override if set.
lanes as (
  select a.geelark_profile, a."character", r.content_type, r.quota_bucket as bucket,
         coalesce(r.cadence_per_week, 0)::numeric as cad,
         -- One a working day, held to the type's weekly ceiling (10 when
         -- unset, as in the scheduler).
         least((select n from wd), coalesce(r.cadence_ceiling_per_week, 10))::numeric as prio_cap,
         (p.content_type is not null and r.quota_bucket = 'glp') as is_prio,
         r.created_at
  from acct a
  join content_type_registry r
    on r.active is true
   and r.quota_bucket in ('glp', 'filler')
   and (r."character" = a."character" or r."character" = 'All')
   and (a.only_content_types is null or a.only_content_types @> array[r.content_type])
  left join v_content_type_priority p on p.content_type = r.content_type
  where exists (
    select 1 from accounts_with_content_types w
    where w.geelark_profile = a.geelark_profile
      and w.allowed_content_types @> array[r.content_type])
),
normal as (
  select l.*,
    (case l.bucket
       when 'glp' then a.glp_week
       -- Filler gets what the day cap leaves after GLP.
       else least(a.fil_week, greatest(a.all_week - a.glp_week, 0))
     end)
    * case when sum(l.cad) over (partition by l.geelark_profile, l.bucket) > 0
           then l.cad / sum(l.cad) over (partition by l.geelark_profile, l.bucket)
           else 1.0 / count(*) over (partition by l.geelark_profile, l.bucket)
      end as normal_weekly_demand,
    a.glp_week
  from lanes l
  join acct a on a.geelark_profile = l.geelark_profile
),
-- Priority types fill the account's GLP week first, newest first, each up to
-- its cap; this is how many are already taken by newer priority types.
prio as (
  select n.*,
    coalesce(sum(case when n.is_prio then n.prio_cap else 0 end) over (
      partition by n.geelark_profile, n.bucket
      order by n.is_prio desc, n.created_at desc, n.content_type
      rows between unbounded preceding and 1 preceding), 0) as taken_before,
    bool_or(not n.is_prio) over (partition by n.geelark_profile, n.bucket) as has_normal
  from normal n
),
alloc as (
  select p.*,
    case when p.is_prio then greatest(0, least(p.prio_cap, p.glp_week - p.taken_before)) end as prio_alloc
  from prio p
),
left_over as (
  select a.*,
    greatest(0, a.glp_week - coalesce(sum(a.prio_alloc) over (partition by a.geelark_profile, a.bucket), 0)) as rest,
    sum(case when a.is_prio then 0 else a.cad end) over (partition by a.geelark_profile, a.bucket) as rest_cad,
    count(*) filter (where not a.is_prio) over (partition by a.geelark_profile, a.bucket) as rest_n,
    bool_or(a.is_prio) over (partition by a.geelark_profile, a.bucket) as any_prio
  from alloc a
)
select o.geelark_profile, o."character", o.content_type, o.bucket,
  case
    -- Filler, accounts with no priority type, and accounts whose every type is
    -- a priority one (nothing to move) keep the plain share.
    when o.bucket <> 'glp' or not o.any_prio or not o.has_normal then o.normal_weekly_demand
    when o.is_prio then o.prio_alloc
    when o.rest_cad > 0 then o.rest * o.cad / o.rest_cad
    else o.rest / o.rest_n
  end as weekly_demand,
  o.normal_weekly_demand
from left_over o;
$function$;

revoke all on function public.inventory_lane_demand_fleet(text) from public, anon, authenticated;
grant execute on function public.inventory_lane_demand_fleet(text) to service_role;

create function public.scheduler_production_order_fleet(p_fleet text default 'all')
 returns table("character" text, content_type text, bucket text, usable_pool numeric, quarantined numeric,
               weekly_demand numeric, days_cover numeric, slots_missed_14d numeric, last_missed date,
               produce_to_reach_21d numeric, status text,
               normal_weekly_demand numeric, is_new boolean, priority_until date,
               current_rate_days integer)
 language sql
 stable
as $function$
with demand as (
  -- Per week of seven calendar days, so days of cover stays in calendar days.
  select ld.content_type, ld."character", ld.bucket,
         round(sum(ld.weekly_demand), 1) as weekly_demand,
         round(sum(ld.normal_weekly_demand), 1) as normal_weekly_demand
  from inventory_lane_demand_fleet(p_fleet) ld
  group by ld.content_type, ld."character", ld.bucket
),
pool as (
  select content_type, "character", bucket, sum(pool_n) as pool_n
  from v_scheduler_pool
  -- Unassigned content is Physical's supply; Cloud no longer posts.
  where p_fleet is distinct from 'cloud'
  group by content_type, "character", bucket
),
quar as (
  select cq.content_type, r."character", count(*)::numeric as quarantined
  from content_quarantine cq
  join content_type_registry r on r.content_type = cq.content_type
  where cq.released_at is null and r.quota_bucket = 'glp'
  group by cq.content_type, r."character"
  union all
  select 'filler'::text, initcap(replace(f."character", '-', ' ')), count(*)::numeric
  from content_quarantine cq
  join filler_contents f on f.content_id = cq.content_id
  where cq.released_at is null and cq.source_table = 'filler_contents'
  group by 1, 2
),
short as (
  select "character", content_type, sum(slots_missed)::numeric as missed_14d, max(date) as last_missed
  from scheduler_shortfalls
  where date > (current_date - 14)
  group by "character", content_type
),
-- The longest priority week still running per character: its other types
-- keep their reduced share until then.
char_prio as (
  select "character", max(days_left) as days_left
  from v_content_type_priority
  group by "character"
),
rate as (
  select d.*, pr.content_type is not null as is_new, pr.priority_until,
         coalesce(pr.days_left, cp.days_left) as current_rate_days,
         -- A sister type squeezed to nothing for a few days is not inactive:
         -- cover and status fall back to its normal rate.
         case when d.weekly_demand > 0 then d.weekly_demand
              else d.normal_weekly_demand end as cover_rate
  from demand d
  left join v_content_type_priority pr on pr.content_type = d.content_type and d.bucket = 'glp'
  left join char_prio cp on cp."character" = d."character" and d.bucket = 'glp'
)
select d."character", d.content_type, d.bucket,
       coalesce(p.pool_n, 0) as usable_pool,
       coalesce(q.quarantined, 0) as quarantined,
       d.weekly_demand,
       case when d.cover_rate > 0 then round(coalesce(p.pool_n, 0) / (d.cover_rate / 7.0), 1) else null end as days_cover,
       coalesce(s.missed_14d, 0) as slots_missed_14d,
       s.last_missed,
       -- 21 days: the current rate while a priority week runs, the normal
       -- rate after.
       greatest(0, ceil(
         d.weekly_demand * least(21, coalesce(d.current_rate_days, 21)) / 7.0
         + d.normal_weekly_demand * greatest(0, 21 - coalesce(d.current_rate_days, 21)) / 7.0
         - coalesce(p.pool_n, 0))) as produce_to_reach_21d,
       case when d.cover_rate = 0 then 'inactive'
            when coalesce(p.pool_n, 0) = 0 then 'EMPTY'
            when (coalesce(p.pool_n, 0) / (d.cover_rate / 7.0)) < 7 then 'CRITICAL'
            when (coalesce(p.pool_n, 0) / (d.cover_rate / 7.0)) < 14 then 'low'
            else 'ok' end as status,
       d.normal_weekly_demand,
       d.is_new,
       d.priority_until,
       d.current_rate_days
from rate d
left join pool p on p.content_type = d.content_type and p."character" = d."character"
left join quar q on q.content_type = d.content_type and q."character" = d."character"
left join short s on s.content_type = d.content_type and s."character" = d."character";
$function$;

revoke all on function public.scheduler_production_order_fleet(text) from public, anon, authenticated;
grant execute on function public.scheduler_production_order_fleet(text) to service_role;
