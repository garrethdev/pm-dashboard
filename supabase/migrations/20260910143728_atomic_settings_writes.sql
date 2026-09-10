-- Settings writes become one statement each, instead of a sequence that can
-- stop halfway.
--
-- Three dashboard actions each wrote several rows in a row, with no transaction
-- around them, so a failure partway through left the database in a state no
-- operator asked for:
--
--   1. Saving an account or character override DELETEd the existing rows and
--      then INSERTed replacements. A failed insert left the delete standing --
--      the settings were simply gone, and the helper reported the account as
--      "now on scheduler defaults". That is real data loss on a failed save.
--   2. Saving the cadence mix PATCHed each lane one at a time, then the two
--      bucket rows. A failure midway left some lanes on the new mix and the
--      rest on the old one, which does not add up to anyone's allocation.
--   3. A lifecycle change rebalanced the character's other lanes and then
--      flipped the target. Same shape: a half-applied allocation.
--
-- A PostgREST call cannot span statements, so the fix has to live in the
-- database. Each function below runs in its own transaction: it either applies
-- completely or not at all, and the caller's error message stops having to
-- explain which half survived.
--
-- The second thing these add is ROW-COUNT VERIFICATION. A PostgREST PATCH whose
-- filter matches nothing returns a perfectly happy 204, so a write aimed at a
-- lane that does not exist -- a typo, a retired content type, a character sent
-- from the browser that no longer owns that lane -- succeeded and did nothing.
-- Every update below asserts it touched exactly the rows it meant to.

-- ---------------------------------------------------------------------------
-- 1. Replace one owner's scheduler_overrides rows, atomically.
--
-- Delete-then-insert rather than upsert is kept deliberately: the unique index
-- is on an expression (coalesce(bucket,'')), which PostgREST's on_conflict
-- cannot target. Inside a function that is no longer a problem, because the
-- delete and the insert are the same transaction.
--
-- An empty p_rows is legal and means "clear back to inherit" -- that is how a
-- field is reset to the fleet default.
-- ---------------------------------------------------------------------------
create or replace function public.replace_scheduler_override(
  p_scope text,
  p_scope_key text,
  p_rows jsonb
)
returns integer
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_inserted integer;
  v_foreign integer;
begin
  if p_scope is null or p_scope not in ('account', 'character') then
    raise exception 'replace_scheduler_override: unsupported scope %', p_scope;
  end if;
  if p_scope_key is null or btrim(p_scope_key) = '' then
    raise exception 'replace_scheduler_override: scope_key is required';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'replace_scheduler_override: p_rows must be a JSON array';
  end if;

  -- A row naming a different owner would delete one key's settings and write
  -- them under another. Refuse the whole call rather than half of it.
  select count(*) into v_foreign
    from jsonb_to_recordset(p_rows) as r(scope text, scope_key text)
   where (r.scope is not null and r.scope is distinct from p_scope)
      or (r.scope_key is not null and r.scope_key is distinct from p_scope_key);
  if v_foreign > 0 then
    raise exception
      'replace_scheduler_override: % row(s) do not belong to %/%',
      v_foreign, p_scope, p_scope_key;
  end if;

  delete from public.scheduler_overrides
   where scope = p_scope and scope_key = p_scope_key;

  insert into public.scheduler_overrides (
    scope, scope_key, bucket, weekly_cap, daily_cap, max_posts_per_day,
    min_gap_minutes, spacing_minutes, window_start, window_end,
    active, note, bypass_guards, only_content_types
  )
  select
    p_scope, p_scope_key, r.bucket, r.weekly_cap, r.daily_cap, r.max_posts_per_day,
    r.min_gap_minutes, r.spacing_minutes, r.window_start, r.window_end,
    coalesce(r.active, true), r.note, coalesce(r.bypass_guards, false),
    r.only_content_types
  from jsonb_to_recordset(p_rows) as r(
    bucket text, weekly_cap integer, daily_cap integer, max_posts_per_day integer,
    min_gap_minutes integer, spacing_minutes integer,
    window_start time, window_end time,
    active boolean, note text, bypass_guards boolean, only_content_types text[]
  );

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Write the whole cadence mix and the fleet defaults, atomically.
--
-- Lanes are addressed by (content_type, character_name). content_type is the
-- registry's primary key on its own, so the character is a GUARD, not part of
-- the address: it is supplied by the browser, and matching on it means a lane
-- claimed for the wrong character updates zero rows and raises here instead of
-- silently succeeding.
-- ---------------------------------------------------------------------------
create or replace function public.save_cadence_mix(
  p_lanes jsonb,
  p_fleet jsonb
)
returns integer
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_lane   record;
  v_hit    integer;
  v_lanes  integer := 0;
begin
  if p_lanes is null or jsonb_typeof(p_lanes) <> 'array' then
    raise exception 'save_cadence_mix: p_lanes must be a JSON array';
  end if;
  if jsonb_array_length(p_lanes) = 0 then
    raise exception 'save_cadence_mix: refusing to save an empty mix';
  end if;

  -- The same lane twice would pass a client-side sum check and then be
  -- overwritten by whichever copy is applied last.
  select count(*) into v_hit
    from (
      select r.content_type, r.character_name
        from jsonb_to_recordset(p_lanes) as r(content_type text, character_name text)
       group by r.content_type, r.character_name
      having count(*) > 1
    ) dupes;
  if v_hit > 0 then
    raise exception 'save_cadence_mix: % lane(s) listed more than once', v_hit;
  end if;

  for v_lane in
    select r.content_type, r.character_name, r.cadence_per_week
      from jsonb_to_recordset(p_lanes)
        as r(content_type text, character_name text, cadence_per_week integer)
  loop
    if v_lane.cadence_per_week is null or v_lane.cadence_per_week < 0 then
      raise exception 'save_cadence_mix: lane % has no usable cadence', v_lane.content_type;
    end if;

    update public.content_type_registry
       set cadence_per_week = v_lane.cadence_per_week,
           updated_at = now()
     where content_type = v_lane.content_type
       and "character"  = v_lane.character_name;

    get diagnostics v_hit = row_count;
    if v_hit <> 1 then
      raise exception
        'save_cadence_mix: lane % for % matched % registry rows, expected 1',
        v_lane.content_type, v_lane.character_name, v_hit;
    end if;
    v_lanes := v_lanes + 1;
  end loop;

  if p_fleet is not null and p_fleet <> 'null'::jsonb then
    -- Both bucket rows carry the same fleet values because the account-config
    -- view resolves them with max(); leaving one behind lets the stale row win.
    update public.scheduler_buckets
       set max_posts_per_day_per_profile = (p_fleet ->> 'max_posts_per_day')::integer,
           min_gap_minutes               = (p_fleet ->> 'min_gap_minutes')::integer,
           time_window_start             = (p_fleet ->> 'window_start')::time,
           time_window_end               = (p_fleet ->> 'window_end')::time,
           weekly_quota = case bucket
                            when 'glp'    then (p_fleet ->> 'glp_per_week')::integer
                            when 'filler' then (p_fleet ->> 'filler_per_week')::integer
                          end,
           updated_at = now()
     where bucket in ('glp', 'filler');

    get diagnostics v_hit = row_count;
    if v_hit <> 2 then
      raise exception
        'save_cadence_mix: expected both scheduler_buckets rows, updated %', v_hit;
    end if;
  end if;

  return v_lanes;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Flip a lane's lifecycle and rebalance its character's mix, atomically.
--
-- The application used to write the target LAST on purpose: every automation
-- gates on `active`, which the lifecycle trigger derives, so writing it first
-- left a window where the lane was off and its slots had not been handed on.
-- That reasoning is now moot -- inside one transaction there is no window at
-- all, and nothing outside sees a partially applied change. The order below is
-- kept only because it reads well.
-- ---------------------------------------------------------------------------
create or replace function public.set_content_type_lifecycle(
  p_content_type         text,
  p_character            text,
  p_lifecycle            text,
  p_cadence_per_week     integer,
  p_cadence_before_pause integer,
  p_note                 text,
  p_reallocation         jsonb,
  p_manage_allowed       boolean
)
returns integer
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_lane  record;
  v_hit   integer;
  v_moved integer := 0;
  v_list  text[];
begin
  if p_lifecycle is null or p_lifecycle not in ('live', 'paused', 'retired') then
    raise exception 'set_content_type_lifecycle: unsupported lifecycle %', p_lifecycle;
  end if;

  -- Widen the character's allowed list BEFORE the lane goes live, so inventory
  -- can already see it.
  if p_manage_allowed and p_lifecycle = 'live' then
    select allowed_content_types into v_list
      from public.characters where "character" = p_character for update;
    if not found then
      raise exception 'set_content_type_lifecycle: % is not in the characters table', p_character;
    end if;
    if not (coalesce(v_list, '{}') @> array[p_content_type]) then
      update public.characters
         set allowed_content_types = coalesce(v_list, '{}') || p_content_type,
             updated_at = now()
       where "character" = p_character;
    end if;
  end if;

  if p_reallocation is not null and jsonb_typeof(p_reallocation) = 'array' then
    for v_lane in
      select r.content_type, r.cadence_per_week
        from jsonb_to_recordset(p_reallocation)
          as r(content_type text, cadence_per_week integer)
    loop
      update public.content_type_registry
         set cadence_per_week = v_lane.cadence_per_week,
             updated_at = now()
       where content_type = v_lane.content_type;

      get diagnostics v_hit = row_count;
      if v_hit <> 1 then
        raise exception
          'set_content_type_lifecycle: rebalance lane % matched % rows, expected 1',
          v_lane.content_type, v_hit;
      end if;
      v_moved := v_moved + 1;
    end loop;
  end if;

  update public.content_type_registry
     set lifecycle           = p_lifecycle,
         cadence_per_week    = p_cadence_per_week,
         cadence_before_pause = p_cadence_before_pause,
         lifecycle_note      = p_note,
         updated_at          = now()
   where content_type = p_content_type;

  get diagnostics v_hit = row_count;
  if v_hit <> 1 then
    raise exception
      'set_content_type_lifecycle: % matched % registry rows, expected 1',
      p_content_type, v_hit;
  end if;

  -- Narrow the allowed list AFTER the lane is off, so demand is never computed
  -- for something already switched off.
  if p_manage_allowed and p_lifecycle = 'retired' then
    select allowed_content_types into v_list
      from public.characters where "character" = p_character for update;
    if not found then
      raise exception 'set_content_type_lifecycle: % is not in the characters table', p_character;
    end if;
    if coalesce(v_list, '{}') @> array[p_content_type] then
      update public.characters
         set allowed_content_types = array_remove(v_list, p_content_type),
             updated_at = now()
       where "character" = p_character;
    end if;
  end if;

  return v_moved;
end;
$$;

-- These are dashboard-operator actions carried out with the service-role
-- credential. Postgres grants EXECUTE to PUBLIC by default, which would put all
-- three on the anon key's PostgREST surface -- so take that back explicitly.
revoke all on function public.replace_scheduler_override(text, text, jsonb) from public;
revoke all on function public.save_cadence_mix(jsonb, jsonb) from public;
revoke all on function public.set_content_type_lifecycle(text, text, text, integer, integer, text, jsonb, boolean) from public;

grant execute on function public.replace_scheduler_override(text, text, jsonb) to service_role;
grant execute on function public.save_cadence_mix(jsonb, jsonb) to service_role;
grant execute on function public.set_content_type_lifecycle(text, text, text, integer, integer, text, jsonb, boolean) to service_role;
