-- PF-15: move several accounts onto real phones in one go, all or nothing.
--
-- The batch dialog in Settings (design ticket P10) plans which phone each
-- account goes on. Saving it as one PostgREST call per account would stop
-- halfway on the first refusal and leave part of a character on Physical and
-- the rest on Cloud -- the half-move P10 exists to prevent. So the whole batch
-- is one call, and this function is its transaction: every account moves, or
-- none does and the exception names the account that stopped it.
--
-- SAME RULES AS THE SINGLE MOVE (PF-03, /api/accounts/delivery-mode), so the
-- two can never disagree:
--   * refused: an account that does not exist, is retired (is_active false),
--     or is no longer on Cloud (delivery_mode <> 'geelark');
--   * refused: a phone that does not exist or is switched off;
--   * written: delivery_mode 'manual', device_id, moved_to_device_at,
--     the status_note line (passed in by the app, which also writes it for the
--     single move), updated_at;
--   * never touched: posting_paused, is_active;
--   * one dashboard_audit_log row per account, action delivery_mode_change,
--     with the same old/new values the single move records.
-- No limit on accounts per phone (Garreth, 2026-09-22).
--
-- The audit rows are inside the transaction here, where the single move
-- writes its row afterwards and best-effort. A batch is the move whose history
-- would be hardest to piece back together, so it is not allowed to land
-- without its rows.
--
-- The accounts and phones are locked while they are checked, so nothing can
-- switch a phone off or move an account between the check and the write.
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
      select r.profile
        from jsonb_to_recordset(p_moves) as r(profile text, device_id bigint)
       group by r.profile
      having count(*) > 1
    ) d;
  if v_dupes > 0 then
    raise exception 'The same account is listed more than once';
  end if;

  -- Check everything first, under lock, before writing anything. Raising here
  -- rolls back nothing because nothing has been written yet; raising later
  -- would roll the writes back too, so either way no account moves alone.
  for v_move in
    select r.ord, r.profile, r.device_id
      from jsonb_to_recordset(p_moves) with ordinality as r(profile text, device_id bigint, ord bigint)
     order by r.ord
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
    select r.ord, r.profile, r.device_id
      from jsonb_to_recordset(p_moves) with ordinality as r(profile text, device_id bigint, ord bigint)
     order by r.ord
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
