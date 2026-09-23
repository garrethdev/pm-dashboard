-- PF-15 fix, the same day: the batch move failed on its first real run.
--
-- `move_accounts_onto_devices` read the batch with
-- `jsonb_to_recordset(...) WITH ORDINALITY AS r(<column list>)`, which Postgres
-- refuses ("WITH ORDINALITY cannot be used with a column definition list").
-- PL/pgSQL only checks a query when it first runs, so the function was created
-- without complaint and failed when the practice batch pressed Move. Nothing
-- was written: the error came before the first update.
--
-- Same function, same rules, same signature; the batch is now read with
-- jsonb_array_elements, which does allow WITH ORDINALITY. The order is kept so
-- a refusal names the first account in the list that cannot move.
--
-- CREATE OR REPLACE keeps the existing ACL; the revoke is repeated anyway so
-- the file says what the function's grants are, and proacl is read back.
create or replace function public.move_accounts_onto_devices(
  p_moves jsonb,
  p_user_email text,
  p_note text
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_move    record;
  v_acct    record;
  v_dev     record;
  v_now     timestamptz := now();
  v_dupes   integer;
  v_done    jsonb := '[]'::jsonb;
begin
  if p_moves is null or jsonb_typeof(p_moves) <> 'array' or jsonb_array_length(p_moves) = 0 then
    raise exception 'No accounts to move';
  end if;
  if p_user_email is null or btrim(p_user_email) = '' then
    raise exception 'Who is moving them is required';
  end if;

  select count(*) into v_dupes
    from (
      select e.elem ->> 'profile' as profile
        from jsonb_array_elements(p_moves) as e(elem)
       group by 1
      having count(*) > 1
    ) d;
  if v_dupes > 0 then
    raise exception 'The same account is listed more than once';
  end if;

  -- Check everything first, under lock, before writing anything. Raising here
  -- rolls back nothing because nothing has been written yet; raising later
  -- would roll the writes back too, so either way no account moves alone.
  for v_move in
    select e.ord, e.elem ->> 'profile' as profile, (e.elem ->> 'device_id')::bigint as device_id
      from jsonb_array_elements(p_moves) with ordinality as e(elem, ord)
     order by e.ord
  loop
    select a.id, a.is_active, a.delivery_mode
      into v_acct
      from public.accounts a
     where a.geelark_profile = v_move.profile
       for update;
    if not found then
      raise exception '% no longer exists', v_move.profile
        using detail = v_move.profile;
    end if;
    if not v_acct.is_active then
      raise exception '% is retired, and a retired account cannot be moved', v_move.profile
        using detail = v_move.profile;
    end if;
    if v_acct.delivery_mode is distinct from 'geelark' then
      raise exception '% is no longer on Cloud. Someone may have just moved it; refresh and look again', v_move.profile
        using detail = v_move.profile;
    end if;

    select d.name, d.is_active
      into v_dev
      from public.devices d
     where d.id = v_move.device_id
       for share;
    if not found then
      raise exception 'The phone chosen for % no longer exists', v_move.profile
        using detail = v_move.profile;
    end if;
    if not v_dev.is_active then
      raise exception '% is switched off. Switch it back on before moving accounts onto it, or choose another phone for %',
        v_dev.name, v_move.profile
        using detail = v_move.profile;
    end if;
  end loop;

  for v_move in
    select e.ord, e.elem ->> 'profile' as profile, (e.elem ->> 'device_id')::bigint as device_id
      from jsonb_array_elements(p_moves) with ordinality as e(elem, ord)
     order by e.ord
  loop
    select a.device_id as old_device_id, d.name as device_name
      into v_acct
      from public.accounts a
      join public.devices d on d.id = v_move.device_id
     where a.geelark_profile = v_move.profile;

    update public.accounts
       set delivery_mode      = 'manual',
           device_id          = v_move.device_id,
           moved_to_device_at = v_now,
           status_note        = coalesce(status_note, '') || coalesce(p_note, ''),
           updated_at         = v_now
     where geelark_profile = v_move.profile
       and delivery_mode = 'geelark';
    if not found then
      -- Cannot happen under the lock above; kept so a future edit that drops
      -- the lock fails loudly instead of moving part of the batch.
      raise exception '% was just moved by someone else. Refresh and look again', v_move.profile
        using detail = v_move.profile;
    end if;

    insert into public.dashboard_audit_log (user_email, action, target, old_value, new_value)
    values (
      p_user_email,
      'delivery_mode_change',
      v_move.profile,
      jsonb_build_object('delivery_mode', 'geelark', 'device_id', v_acct.old_device_id),
      jsonb_build_object(
        'delivery_mode', 'manual',
        'device_id', v_move.device_id,
        'device_name', v_acct.device_name,
        'moved_to_device_at', v_now,
        'batch', true
      )
    );

    v_done := v_done || jsonb_build_object('profile', v_move.profile, 'device_id', v_move.device_id);
  end loop;

  return jsonb_build_object('moved', v_done, 'moved_to_device_at', v_now);
end;
$$;

-- A service-role operator action. On this project `revoke ... from public`
-- alone leaves anon and authenticated granted by name (see README), so both
-- are named.
revoke all on function public.move_accounts_onto_devices(jsonb, text, text) from public, anon, authenticated;
