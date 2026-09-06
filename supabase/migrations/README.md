# Migrations

SQL applied to the Supabase project (`qlcmgxgwpzmiebzxflai`) for this dashboard.
Each file is byte-identical to what actually ran — verified by comparing every
file's MD5 against `supabase_migrations.schema_migrations`.

## Read this before you trust the folder

**This is not a from-scratch history.** The project had ~340 migrations before
the dashboard existed — the content pipelines, `accounts`, `unified_posts`,
`geelark_tasks`, the health views, the Smart Scheduler tables. Those live only
in Supabase. Running this folder against an empty database will fail.

What it does give you: a record of every schema change the dashboard itself
depends on, from 2026-09-04 onward, in the order it was applied.

Migrations belonging to other work on the same project (e.g. `create_cleora_hooks`,
applied 2026-09-06) are deliberately not here.

## What is in here

| Date | Migration | Why |
|---|---|---|
| 09-04 | `scheduler_overrides_bypass_and_content_types` | `bypass_guards` + `only_content_types` columns for the per-account posting modal |
| 09-04 | `scheduler_config_guard_day_cap` | exposes `guard_day_cap` so the UI can say how high a daily cap could go |
| 09-04 | `scheduler_config_bypass_guards_and_content_types` | makes `bypass_guards` actually lift the age ramp and health throttle |
| 09-06 | `calendar_month_rollup` | month grid, one row per (day, content type) |
| 09-06 | `calendar_day_detail` | one day expanded, per account |
| 09-06 | `calendar_month_days` | day totals — a distinct account count cannot be derived from per-type rows |
| 09-06 | `calendar_exclude_canceled` | Canceled rows never reach a phone, so they stop being counted |
| 09-06 | `calendar_day_detail_delivery_truth` | delivery read from `geelark_tasks`, not `posting_status` |
| 09-06 | `geelark_tasks_source_carousel_index` | index for the join those two RPCs now do |
| 09-06 | `calendar_month_delivery_truth` | same treatment for the month, so grid and day panel agree |
| 09-06 | `scheduler_buckets_weekly_quota` | a real fleet home for the filler weekly cap |
| 09-06 | `scheduler_config_fleet_weekly_quota` | account-config view reads `weekly_quota` for both buckets |
| 09-06 | `content_type_lifecycle` | live / paused / retired on the registry, with `active` kept in step by a trigger |
| 09-06 | `content_type_thumbnails` | one stored preview frame per content type |
| 09-06 | `content_type_stats` | per-lane performance driven off the registry, so paused lanes keep their numbers |
| 09-06 | `scheduler_pool_honours_lifecycle` | the pool view stops counting a paused lane as available supply |
| 09-06 | `content_type_stats_scheduled_ahead_date_fix` | `scheduled_ahead` compared a UTC-midnight timestamp in ET and lost a day |

## Two things worth knowing

**Views are replaced whole.** `v_scheduler_account_config` is rewritten in full
by three files here; only the last one reflects the live definition. When
changing it, snapshot and diff first:

```sql
create table _cfg_snapshot as select * from v_scheduler_account_config;
-- ... apply the change ...
select count(*) from (
  (select * from v_scheduler_account_config except select * from _cfg_snapshot)
  union all
  (select * from _cfg_snapshot except select * from v_scheduler_account_config)
) d;   -- 0 means the rewrite changed no behaviour
drop table _cfg_snapshot;
```

**`active` is the one gate.** The Smart Scheduler, `unified_posts_due` (the
poster), `inventory_check_detail`, `inventory_type_breakdown` and
`v_scheduler_production_order` all read `content_type_registry.active`. The
lifecycle column added on 09-06 does not become a second gate that each of them
would have to learn — a trigger derives `active` from it, in both directions, so
flipping either one by hand still lands in a coherent state.

**Snapshot tables are cleaned up.** The 09-04 guard-day-cap migration creates
`_cfg_before_20260904` and does not drop it, so the file reads as though the
table is still there. It is not — it was removed after that change was
verified, and no `_cfg_*` table exists in the database today. Anyone replaying
these files should drop the snapshot once they have diffed it.
