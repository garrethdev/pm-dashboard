-- PF-18: Inventory for one fleet at a time (Garreth, 2026-09-18).
--
-- Two additive functions. inventory_rollup, v_scheduler_production_order and
-- inventory_check are NOT altered: the Mon/Fri digest and the Monday production
-- order email read them, and they stay fleet-wide until those emails are
-- retired. If one of the originals is ever changed, change its sibling to match.
--
-- The rules, as Garreth set them:
--   * An account's data follows the account. A fleet's demand, and the posts
--     already scheduled for it, are those of the accounts in that fleet today
--     (accounts.delivery_mode: 'geelark' = Cloud, 'manual' = Physical).
--   * Cloud accounts will not post any more, so content that has not been given
--     to any account is Physical's supply. Cloud therefore sees a pool of zero.
--     No content row carries a fleet label and the Smart Scheduler is unchanged.
--   * p_fleet = 'all' reproduces the original exactly.
--
-- NOT PROVEN AGAINST LIVE DEMAND YET. On 2026-09-18 every account is paused, so
-- both originals return no rows and "cloud + physical = all" is 0 = 0. The only
-- differences from the originals are the lines marked PF-18 below. Re-run the
-- parity check in supabase/migrations/README.md once accounts are unpaused.

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
-- PF-18: the delivery_mode this fleet means; null = every account.
fl as (
  select case p_fleet when 'physical' then 'manual' when 'cloud' then 'geelark' else null end as mode
),
eligible_pairs as (
  select distinct a.geelark_profile, a."character", a.account_created_on,
         r.quota_bucket as bucket
  from accounts_with_content_types a
  cross join content_type_registry r
  where a.is_active = true
    and a.posting_paused = false
    and a.geelark_profile is not null
    and r.active = true
    and r.quota_bucket is not null
    and a.allowed_content_types @> array[r.content_type]
    -- PF-18: only this fleet's accounts create demand.
    and ((select mode from fl) is null or exists (
          select 1 from accounts f
          where f.geelark_profile = a.geelark_profile
            and f.delivery_mode = (select mode from fl)))
),
bucket_quotas as (
  select b.bucket, ch."character",
    coalesce(
      (select sum(r.cadence_per_week)::integer
         from content_type_registry r
        where r.active
          and r.quota_bucket = b.bucket
          and r.cadence_per_week is not null
          and (r."character" = ch."character" or r."character" = 'All')),
      case when b.quota_period = 'week' then b.quota_value
           when b.quota_period = 'day'  then b.quota_value * 7
           else null end
    ) as weekly_quota
  from scheduler_buckets b
  cross join (select distinct "character" from characters where is_active) ch
),
aged as (
  select ep.geelark_profile, ep."character", ep.bucket, ep.account_created_on,
         ((select ws from win)) - ep.account_created_on as age_days
  from eligible_pairs ep
),
-- Flat: age frozen at window_start, exactly as inventory_check_detail does.
targets as (
  select a.geelark_profile, a."character", a.bucket,
    (case when a.account_created_on is null then 0
     when a.bucket = 'filler' then
       case when a.age_days < 9  then 0
            when a.age_days < 23 then least(bq.weekly_quota, 7)
            else bq.weekly_quota end
     when a.bucket = 'glp' then
       case when a.age_days < 16 then 0
            when a.age_days < 23 then least(bq.weekly_quota, 7)
            else bq.weekly_quota end
     else bq.weekly_quota end)::numeric
    * ((select d from win)::numeric / 7.0) as target_exact
  from aged a
  join bucket_quotas bq on bq.bucket = a.bucket and bq."character" = a."character"
),
scheduled as (
  select u.geelark_profile, r.quota_bucket as bucket, count(*) as n
  from unified_posts u
  join content_type_registry r on r.content_type = u.content_type
  join accounts acc on acc.geelark_profile = u.geelark_profile
       and acc.is_active = true and acc.posting_paused = false
       -- PF-18: a scheduled post counts for the fleet its account is in.
       and ((select mode from fl) is null or acc.delivery_mode = (select mode from fl))
  where u.posting_date is not null
    and u.posting_date::date >= (select ws from win)
    and u.posting_date::date <= ((select ws from win) + ((select d from win) - 1))
    and lower(coalesce(u.posting_status, '')) <> all (array['canceled','hold','failed'])
  group by u.geelark_profile, r.quota_bucket
),
pool as (
  select "character", bucket, sum(pool_n) as pool_n
  from v_scheduler_pool
  -- PF-18: unassigned content is Physical's supply; Cloud no longer posts.
  where p_fleet is distinct from 'cloud'
  group by "character", bucket
),
-- Ramp integral: a new account is age 0 and grows into its quota.
new_demand as (
  select bq."character", bq.bucket,
    (coalesce(p_new_accounts, 0)::numeric * (
      select coalesce(sum(
        case
          when bq.bucket = 'filler' then
            case when gs.d < 9  then 0::numeric
                 when gs.d < 23 then least(bq.weekly_quota, 7)::numeric
                 else bq.weekly_quota::numeric end
          else
            case when gs.d < 16 then 0::numeric
                 when gs.d < 23 then least(bq.weekly_quota, 7)::numeric
                 else bq.weekly_quota::numeric end
        end / 7.0), 0::numeric)
      from generate_series(0, (select d from win) - 1) gs(d)
    )) as extra
  from bucket_quotas bq
  where p_new_character is not null
    and coalesce(p_new_accounts, 0) > 0
    and bq."character" = p_new_character
    -- PF-18: new accounts are only ever added to Physical.
    and p_fleet is distinct from 'cloud'
),
agg as (
  select
    t."character",
    t.bucket,
    ceil(sum(t.target_exact))::bigint          as target,
    coalesce(sum(s.n), 0)::bigint              as scheduled_in_window,
    coalesce(max(p.pool_n), 0)::numeric        as pool_available,
    ceil(coalesce(max(nd.extra), 0))::bigint   as new_acct_add
  from targets t
  left join scheduled s   on s.geelark_profile = t.geelark_profile and s.bucket = t.bucket
  left join pool p        on p."character" = t."character" and p.bucket = t.bucket
  left join new_demand nd on nd."character" = t."character" and nd.bucket = t.bucket
  group by t."character", t.bucket
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

-- v_scheduler_production_order as a function of the fleet. Same columns.
create or replace function public.scheduler_production_order_fleet(p_fleet text default 'all')
 returns table("character" text, content_type text, bucket text, usable_pool numeric, quarantined numeric, weekly_demand numeric, days_cover numeric, slots_missed_14d numeric, last_missed date, produce_to_reach_21d numeric, status text)
 language sql
 stable
as $function$
with fleet as (
  select coalesce(max(weekly_quota) filter (where bucket = 'filler'), 10)::numeric as fil_week
  from scheduler_buckets
),
accts as (
  select c."character", count(*)::numeric as n_accounts
  from v_scheduler_account_config c
  where c.max_posts_per_day > 0 and c.can_deliver
    -- PF-18: only this fleet's accounts create demand.
    and (p_fleet is not distinct from 'all' or exists (
          select 1 from accounts f
          where f.geelark_profile = c.geelark_profile
            and f.delivery_mode = case p_fleet when 'physical' then 'manual' else 'geelark' end))
  group by c."character"
),
demand as (
  select r.content_type, r."character", 'glp'::text as bucket,
         coalesce(r.cadence_per_week, 0)::numeric * a.n_accounts as weekly_demand
  from content_type_registry r
  join accts a on a."character" = r."character"
  where r.active is true and r.quota_bucket = 'glp'
  union all
  select 'filler'::text, a."character", 'filler'::text,
         coalesce(oc_f.weekly_cap::numeric, f.fil_week) * a.n_accounts
  from accts a
  cross join fleet f
  left join scheduler_overrides oc_f on oc_f.scope = 'character' and oc_f.scope_key = a."character"
       and oc_f.bucket = 'filler' and oc_f.active
  where coalesce(oc_f.weekly_cap::numeric, f.fil_week) > 0
),
pool as (
  select content_type, "character", bucket, sum(pool_n) as pool_n
  from v_scheduler_pool
  -- PF-18: unassigned content is Physical's supply; Cloud no longer posts.
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

revoke all on function public.inventory_rollup_fleet(integer, integer, text, text) from public, anon, authenticated;
grant execute on function public.inventory_rollup_fleet(integer, integer, text, text) to service_role;
revoke all on function public.scheduler_production_order_fleet(text) from public, anon, authenticated;
grant execute on function public.scheduler_production_order_fleet(text) to service_role;
