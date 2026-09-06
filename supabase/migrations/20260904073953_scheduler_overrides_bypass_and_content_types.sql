-- Per-account scheduler overrides, phase 1 (additive only).
-- Nothing reads these columns yet; v_scheduler_account_config and the Smart
-- Scheduler are updated in a later step. Safe to apply while the table is empty.

alter table public.scheduler_overrides
  add column if not exists bypass_guards boolean not null default false,
  add column if not exists only_content_types text[];

comment on column public.scheduler_overrides.bypass_guards is
  'When true, this override skips the age ramp and the health throttle in '
  'v_scheduler_account_config. The delivery brake (>=4 attempts / >=80% failing '
  'in 7d) is NOT bypassed - it is a mechanical fact, not a judgement. Set by a '
  'human from the dashboard; the health detector recommends, the human decides.';

comment on column public.scheduler_overrides.only_content_types is
  'Restricts an account to a subset of its character''s active content types. '
  'NULL = no restriction (scheduler uses every active type for the character). '
  'Always a subset within the character - never a route to another character''s '
  'content. Include ''filler'' to keep filler posting; omit it to stop filler.';

-- One active override row per (scope, scope_key, bucket): the dashboard upserts
-- the glp / filler / null-bucket rows for an account as a unit.
create unique index if not exists scheduler_overrides_scope_key_bucket_uidx
  on public.scheduler_overrides (scope, scope_key, coalesce(bucket, ''));