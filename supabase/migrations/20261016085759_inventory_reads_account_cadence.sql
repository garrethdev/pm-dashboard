-- Inventory reads each account's own cadence (Garreth, 2026-10-16).
--
-- WHY. Garreth: "shouldn't the inventory page compute based on the number of
-- posts per week I set on each account if I am using the custom cadence?" It
-- did not. Both Inventory calculations took demand from the content types'
-- listed weekly amounts (content_type_registry.cadence_per_week, 7 + 7 for
-- Characters 5 and 6) times the number of accounts, so:
--   * an account set to 6 a week at 1 a day was counted as 14 a week;
--   * inventory_rollup_fleet also counted Facebook accounts, which only copy
--     their Instagram twin's posts and never take content of their own;
--   * both counted seven working days a week, though nothing is scheduled on
--     the day off (work_week, Sunday).
-- On 2026-10-16 that read Character 5 as needing 168 posts in 14 days (make 62)
-- when its four content-taking accounts can post 48 (make 0).
--
-- WHAT. One helper, inventory_lane_demand_fleet, gives every account's weekly
-- demand per content type from v_scheduler_account_config: the view the Smart
-- Scheduler plans from, so paused accounts, Facebook copies, per-account and
-- per-character overrides, the age ramp and health throttles are already in
-- it. Weekly demand is the account's weekly cap, held to its daily cap times
-- the working days in a week, shared between its content types in proportion
-- to their listed weekly amounts (7 + 7 = half each). Both _fleet functions
-- now read it; a window counts only its working days.
--
-- THE PAIR IS BROKEN ON PURPOSE. inventory_rollup / v_scheduler_production_order
-- / inventory_check are NOT changed: the Mon/Fri digest and the Monday
-- production-order email read them. Garreth decided on 2026-09-04 that once
-- per-account caps existed the dashboard would read them and the emails would
-- be allowed to disagree, because the dashboard is replacing the emails. So
-- p_fleet = 'all' no longer reproduces the originals.
--
-- Same signatures and return types as before, so grants are untouched.

create or replace function public.inventory_lane_demand_fleet(p_fleet text default 'all')
 returns table(geelark_profile text, "character" text, content_type text, bucket text, weekly_demand numeric)
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
         coalesce(r.cadence_per_week, 0)::numeric as cad
  from acct a
  join content_type_registry r
    on r.active is true
   and r.quota_bucket in ('glp', 'filler')
   and (r."character" = a."character" or r."character" = 'All')
   and (a.only_content_types is null or a.only_content_types @> array[r.content_type])
  where exists (
    select 1 from accounts_with_content_types w
    where w.geelark_profile = a.geelark_profile
      and w.allowed_content_types @> array[r.content_type])
)
select l.geelark_profile, l."character", l.content_type, l.bucket,
  (case l.bucket
     when 'glp' then a.glp_week
     -- Filler gets what the day cap leaves after GLP.
     else least(a.fil_week, greatest(a.all_week - a.glp_week, 0))
   end)
  * case when sum(l.cad) over (partition by l.geelark_profile, l.bucket) > 0
         then l.cad / sum(l.cad) over (partition by l.geelark_profile, l.bucket)
         else 1.0 / count(*) over (partition by l.geelark_profile, l.bucket)
    end as weekly_demand
from lanes l
join acct a on a.geelark_profile = l.geelark_profile;
$function$;

revoke all on function public.inventory_lane_demand_fleet(text) from public, anon, authenticated;
grant execute on function public.inventory_lane_demand_fleet(text) to service_role;

create or replace function public.inventory_rollup_fleet(
  p_days integer default 14,
  p_new_accounts integer default 0,
  p_new_character text default null,
  p_fleet text default 'all'
)
 returns table("character" text, bucket text, target bigint, scheduled_in_window bigint, pool_available numeric, shortfall bigint, new_acct_add bigint, grand_total bigint, days_of_cover numeric, window_start text, window_end text)
 language sql
 stable
as $function$
with win as (
  select (now() at time zone 'America/New_York')::date as ws,
         greatest(coalesce(p_days, 14), 1) as d
),
off as (
  select coalesce((select days_off from work_week limit 1), '{}'::smallint[]) as days_off
),
wd as (
  select greatest(7 - cardinality(array(select distinct x from unnest((select days_off from off)) x)), 1)::numeric as per_week
),
-- The working days in the window, as offsets from its first day.
wdays as (
  select g.i
  from generate_series(0, (select d from win) - 1) g(i)
  cross join off o
  where extract(dow from (select ws from win) + g.i)::smallint <> all (o.days_off)
),
ld as (
  select * from inventory_lane_demand_fleet(p_fleet)
),
targets as (
  select ld."character", ld.bucket,
         sum(ld.weekly_demand) / (select per_week from wd) * (select count(*) from wdays) as target_exact
  from ld
  group by ld."character", ld.bucket
),
scheduled as (
  select ab."character", ab.bucket, count(*) as n
  from (select distinct ld.geelark_profile, ld."character", ld.bucket from ld) ab
  join unified_posts u on u.geelark_profile = ab.geelark_profile
  join content_type_registry r on r.content_type = u.content_type and r.quota_bucket = ab.bucket
  where u.posting_date is not null
    and u.posting_date::date >= (select ws from win)
    and u.posting_date::date <= ((select ws from win) + ((select d from win) - 1))
    and lower(coalesce(u.posting_status, '')) <> all (array['canceled','hold','failed'])
  group by ab."character", ab.bucket
),
pool as (
  select "character", bucket, sum(pool_n) as pool_n
  from v_scheduler_pool
  -- Unassigned content is Physical's supply; Cloud no longer posts.
  where p_fleet is distinct from 'cloud'
  group by "character", bucket
),
-- What-if: a new account gets its character's caps (or the fleet's), and grows
-- into them: filler from day 9, GLP from day 16, at most 1 a day until day 23.
newcfg as (
  select
    least(coalesce(og.weekly_cap, f.glp_week, 10),
          coalesce(onn.max_posts_per_day, f.day_cap, 3) * (select per_week from wd))::numeric as glp_week,
    least(coalesce(ofl.weekly_cap, f.fil_week, 10),
          coalesce(ofl.daily_cap, f.fil_day, 2) * (select per_week from wd))::numeric as fil_week
  from (
    select max(weekly_quota) filter (where bucket = 'glp') as glp_week,
           max(weekly_quota) filter (where bucket = 'filler') as fil_week,
           max(quota_value) filter (where bucket = 'filler') as fil_day,
           max(max_posts_per_day_per_profile) as day_cap
    from scheduler_buckets
  ) f
  left join scheduler_overrides og on og.active and og.scope = 'character'
       and og.scope_key = p_new_character and og.bucket = 'glp'
  left join scheduler_overrides ofl on ofl.active and ofl.scope = 'character'
       and ofl.scope_key = p_new_character and ofl.bucket = 'filler'
  left join scheduler_overrides onn on onn.active and onn.scope = 'character'
       and onn.scope_key = p_new_character and onn.bucket is null
),
new_demand as (
  select b.bucket,
    coalesce(p_new_accounts, 0)::numeric * coalesce(sum(
      case b.bucket
        when 'filler' then
          case when w.i < 9  then 0::numeric
               when w.i < 23 then least(1::numeric, n.fil_week / (select per_week from wd))
               else n.fil_week / (select per_week from wd) end
        else
          case when w.i < 16 then 0::numeric
               when w.i < 23 then least(1::numeric, n.glp_week / (select per_week from wd))
               else n.glp_week / (select per_week from wd) end
      end), 0) as extra
  from (values ('glp'), ('filler')) b(bucket)
  cross join newcfg n
  cross join wdays w
  where p_new_character is not null
    and coalesce(p_new_accounts, 0) > 0
    -- New accounts are only ever added to Physical.
    and p_fleet is distinct from 'cloud'
  group by b.bucket
),
agg as (
  select
    t."character",
    t.bucket,
    ceil(t.target_exact)::bigint                 as target,
    coalesce(s.n, 0)::bigint                     as scheduled_in_window,
    coalesce(p.pool_n, 0)::numeric               as pool_available,
    case when t."character" = p_new_character
         then ceil(coalesce(nd.extra, 0)) else 0 end::bigint as new_acct_add
  from targets t
  left join scheduled s   on s."character" = t."character" and s.bucket = t.bucket
  left join pool p        on p."character" = t."character" and p.bucket = t.bucket
  left join new_demand nd on nd.bucket = t.bucket
)
select
  a."character",
  a.bucket,
  a.target,
  a.scheduled_in_window,
  a.pool_available,
  greatest(0, a.target - a.scheduled_in_window - a.pool_available)::bigint as shortfall,
  a.new_acct_add,
  (greatest(0, a.target - a.scheduled_in_window - a.pool_available) + a.new_acct_add)::bigint as grand_total,
  case when a.target > 0
       then round(a.pool_available * (select d from win)::numeric / a.target, 1)
       else (select d from win)::numeric end as days_of_cover,
  to_char((select ws from win)::timestamp, 'YYYY-MM-DD') as window_start,
  to_char(((select ws from win) + ((select d from win) - 1))::timestamp, 'YYYY-MM-DD') as window_end
from agg a
order by a."character", a.bucket desc;
$function$;

create or replace function public.scheduler_production_order_fleet(p_fleet text default 'all')
 returns table("character" text, content_type text, bucket text, usable_pool numeric, quarantined numeric, weekly_demand numeric, days_cover numeric, slots_missed_14d numeric, last_missed date, produce_to_reach_21d numeric, status text)
 language sql
 stable
as $function$
with demand as (
  -- Per week of seven calendar days, so days of cover stays in calendar days.
  select ld.content_type, ld."character", ld.bucket, round(sum(ld.weekly_demand), 1) as weekly_demand
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
)
select d."character", d.content_type, d.bucket,
       coalesce(p.pool_n, 0) as usable_pool,
       coalesce(q.quarantined, 0) as quarantined,
       d.weekly_demand,
       case when d.weekly_demand > 0 then round(coalesce(p.pool_n, 0) / (d.weekly_demand / 7.0), 1) else null end as days_cover,
       coalesce(s.missed_14d, 0) as slots_missed_14d,
       s.last_missed,
       case when d.weekly_demand > 0 then greatest(0, ceil(d.weekly_demand * 3 - coalesce(p.pool_n, 0))) else 0 end as produce_to_reach_21d,
       case when d.weekly_demand = 0 then 'inactive'
            when coalesce(p.pool_n, 0) = 0 then 'EMPTY'
            when (coalesce(p.pool_n, 0) / (d.weekly_demand / 7.0)) < 7 then 'CRITICAL'
            when (coalesce(p.pool_n, 0) / (d.weekly_demand / 7.0)) < 14 then 'low'
            else 'ok' end as status
from demand d
left join pool p on p.content_type = d.content_type and p."character" = d."character"
left join quar q on q.content_type = d.content_type and q."character" = d."character"
left join short s on s.content_type = d.content_type and s."character" = d."character";
$function$;
