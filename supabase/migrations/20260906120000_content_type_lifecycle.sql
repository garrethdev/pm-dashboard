-- Content types get an explicit lifecycle: live / paused / retired.
--
-- Every automation already gates on content_type_registry.active — the Smart
-- Scheduler, unified_posts_due (the poster), inventory_type_breakdown (the
-- Inventory Monitor) and v_scheduler_production_order all read it. So the
-- lifecycle does NOT become a second gate that those would have to learn:
-- `active` stays the one switch, and `lifecycle` records WHY it is off.
--
-- The trigger keeps the two in step in both directions, so flipping `active`
-- by hand in the Supabase table editor still lands in a coherent state.

alter table content_type_registry
  add column if not exists lifecycle text not null default 'live',
  add column if not exists lifecycle_changed_at timestamptz,
  add column if not exists lifecycle_note text,
  -- What the lane was posting per week before it was paused, so resuming can
  -- offer to give it back what it had rather than guessing.
  add column if not exists cadence_before_pause integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.content_type_registry'::regclass
      and conname = 'content_type_registry_lifecycle_check'
  ) then
    alter table content_type_registry
      add constraint content_type_registry_lifecycle_check
      check (lifecycle in ('live', 'paused', 'retired'));
  end if;
end $$;

-- Rows that are already off were switched off for good, not parked: the
-- dashboard has been calling them "retired" since the cadence page shipped.
update content_type_registry
   set lifecycle = case when active then 'live' else 'retired' end
 where lifecycle = 'live' and not active;

create or replace function content_type_lifecycle_sync()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.lifecycle is distinct from 'live' then
      new.active := (new.lifecycle = 'live');
    else
      new.lifecycle := case when new.active then 'live' else 'retired' end;
    end if;
    return new;
  end if;

  if new.lifecycle is distinct from old.lifecycle then
    new.active := (new.lifecycle = 'live');
    new.lifecycle_changed_at := now();
  elsif new.active is distinct from old.active then
    -- Someone flipped `active` directly. Infer the lifecycle rather than
    -- leaving a row that says 'live' while every automation skips it.
    new.lifecycle := case when new.active then 'live' else 'retired' end;
    new.lifecycle_changed_at := now();
  end if;

  return new;
end $$;

drop trigger if exists trg_content_type_lifecycle_sync on content_type_registry;
create trigger trg_content_type_lifecycle_sync
  before insert or update on content_type_registry
  for each row execute function content_type_lifecycle_sync();
