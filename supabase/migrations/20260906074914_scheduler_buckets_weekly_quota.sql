-- The fleet's weekly caps had no home for filler.
--
-- glp_week_cap fell back to scheduler_buckets.quota_value, but fil_week_cap
-- fell back to a literal 10 written into the view — so there was no fleet-level
-- filler weekly setting at all, and content_type_registry.filler.cadence_per_week
-- (which looks like one) is read by nothing. The Adjust Cadence dialog was
-- writing to it and changing nothing.
--
-- weekly_quota gives both buckets one honest home. Seeded from what is in force
-- today so this migration changes no behaviour.

alter table public.scheduler_buckets
  add column if not exists weekly_quota integer;

update public.scheduler_buckets set weekly_quota = 10 where bucket = 'glp'    and weekly_quota is null;
update public.scheduler_buckets set weekly_quota = 10 where bucket = 'filler' and weekly_quota is null;

comment on column public.scheduler_buckets.weekly_quota is
  'Fleet weekly cap per account for this bucket. Overridden per character/account via scheduler_overrides.weekly_cap.';