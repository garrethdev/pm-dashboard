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
| 09-10 | `account_last_post_success_only` | "Last Post" counted a task that failed; adds success-only columns without touching the pair `v_account_health_v3` reads |
| 09-10 | `health_v3_posting_failure_is_system_error` | a persistently failing account could read as `warming`; system error no longer gated on `view_health` |
| 09-10 | `scheduler_account_config_all_for_paused_preflight` | ramp/resolution moved into a base view so paused accounts can be previewed without the scheduler ever seeing them |
| 09-10 | `ramp_glp_fills_the_slot_when_a_character_has_no_filler` | the 9-15d slot is filler-only; a character with no filler lane posted nothing, so GLP may take it |
| 09-10 | `production_order_filler_demand_honours_character_cap` | filler demand read the fleet quota, telling you to make 36 filler for a character with no filler lane |
| 09-09 | `content_intelligence_engine` | the seven Virlo/knowledge tables — **reconstructed, not replayed; see the note below** |
| 09-10 | `atomic_settings_writes` | override / cadence / lifecycle saves become one transaction each, with row-count checks |
| 09-10 | `atomic_settings_writes_revoke_anon` | the revoke above missed `anon`/`authenticated` — see below |

## `revoke ... from public` on a function is never enough here

`atomic_settings_writes` created three functions and ended with
`revoke all on function ... from public`, which looked like it closed them off.
It did not. **Supabase ships `ALTER DEFAULT PRIVILEGES` granting EXECUTE on new
public functions to `anon` and `authenticated` by name**, and a grant made to a
named role is untouched by revoking from PUBLIC. Reading `pg_proc.proacl` back
straight after applying showed all three still carrying `anon=X` and
`authenticated=X` — live on the anon key's PostgREST surface. The follow-up
migration revokes the two roles explicitly.

**So: whenever a migration here creates a function, name `anon` and
`authenticated` in the revoke, and read the ACL back afterwards.**

```sql
select p.proname, array_to_string(p.proacl,' | ') as acl
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = '<your function>';
-- want: postgres=X/postgres | service_role=X/postgres  (and nothing else)
```

The three functions were smoke-tested after applying, since none had ever run.
Confirmed: a failed insert rolls its DELETE back (the old code's data-loss
case), an empty rows array clears correctly, a row naming another owner is
refused, a duplicate lane is refused, and a lane sent for the wrong character
raises instead of silently updating nothing. For the lifecycle function, a
failure after the allowed-list widening rolls that widening back too.

**These two files carry fuller comments than the statements recorded in
`schema_migrations`** — the explanatory prose was added when they were written
to disk. Behaviour is identical; only the comments differ. That is the one place
the byte-identical rule at the top of this file is relaxed, besides the
reconstructed migration below.

## The one file that is not a replay## The one file that is not a replay

`20260909123000_content_intelligence_engine.sql` breaks the byte-identical rule
at the top of this file, and is listed out of date order because it was found
late.

Those seven tables (`reference_analysis`, `reference_beats`, `angle_blueprints`,
`carousel_briefs`, `carousel_drafts`, `carousel_draft_slides`, `search_chunks`)
were applied by hand in the SQL editor and never landed in
`supabase_migrations.schema_migrations`, so there is no stored statement list to
copy from. The committed file was reconstructed from the live catalog on
2026-09-10 and verified against `pg_constraint`, `pg_indexes` and
`information_schema.columns`. It matches the database; it just cannot be
MD5-checked like the rest.

**All seven are empty** — 0 rows each, against 3,468 in `references_unified`.
The schema exists, nothing writes to it, and the ingestion worker is V2 work.
Do not read "the tables are there" as "the pipeline runs".

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

**Display truth and classifier truth are different columns.** `v_account_last_post`
and `v_account_warmup_health` each expose two pairs: an any-outcome pair
(`last_post_at` / `days_since_post`, `last_warmup_at` / `days_since_warmup`) and
a success-only pair (`last_success_at` / `days_since_success`). The accounts
table shows the success-only pair -- a failed upload is not a post. The
`warming` rule in `v_account_health_v3` deliberately keeps reading the
any-outcome pair, because it needs to know whether posting was ATTEMPTED, not
whether it worked; pointing it at the success-only pair inverts it and makes a
broken account look like a new one. Do not "tidy" the two into one.

**`v_scheduler_account_config_all` is display only.** It is the same view
without the `posting_paused IS FALSE` filter, and `v_scheduler_account_config`
is now a thin filter over it, so the age ramp and the
account -> character -> fleet chain exist in exactly one place. Nothing that
plans or posts may read `_all`: paused accounts would start being scheduled.

**Snapshot tables are cleaned up.** The 09-04 guard-day-cap migration creates
`_cfg_before_20260904` and does not drop it, so the file reads as though the
table is still there. It is not — it was removed after that change was
verified, and no `_cfg_*` table exists in the database today. Anyone replaying
these files should drop the snapshot once they have diffed it.
