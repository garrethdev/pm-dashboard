-- PF-03 follow-up (Garreth, 2026-09-23): moving an account back to Cloud
-- releases the posts it was still holding on Physical.
--
-- On Physical the Posting Agent hands a manual account a `queued`
-- post_deliveries row and leaves the content row assigned to it at Ready
-- (PF-06). Until now the move back to Cloud only flipped the fleet, so those
-- rows stayed on the account: still on somebody's to-do list for an account
-- nobody was posting for by hand, and the content still held by it.
--
-- A ban already has an answer for this (PF-11, retire_phone_account), and the
-- move now gives the same one, so "back in the pool" means one thing:
--   * the content row behind each queued delivery goes back to the pool by
--     release_profile_content()'s rule, applied to that row only;
--   * the queued delivery is closed as `skipped`, with a note saying why.
-- Finished deliveries (posted, failed, skipped) are history and untouched.
--
-- ONLY THE ROWS BEHIND QUEUED DELIVERIES. A ban releases everything the
-- profile holds, because a banned account will post nothing again. A moved
-- account carries on posting on Cloud, so the content planned for it but not
-- yet handed to a person stays with it and the robot posts it as usual.
--
-- All of it is one transaction with the fleet flip and the audit row, so a
-- move cannot land with its posts still stranded on the account, or release
-- posts from an account that did not move. The flip is guarded on the account
-- still being on Physical, under lock, so two people moving it at once cannot
-- both win: the second is refused.
--
-- THE RELEASE RULE IS A COPY. release_profile_content() (the Post-Ban robot's
-- own function, also called by retire_phone_account) is per profile and has
-- no way to name one row, so its rule is repeated here for single rows: the
-- same registry lanes (unified_poster_active), the same columns cleared
-- (profile, posting_status, the lane's date and time, scheduled_at), the same
-- scheduler_ready = true, the same refusal to touch Posted or Posting rows.
-- profile_content_pending() is a copy of the same rule. If
-- release_profile_content ever changes, all three have to change with it.

create or replace function public.move_account_to_cloud(
  p_profile    text,
  p_user_email text,
  p_note       text
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  a           record;
  d           record;
  v_phone     text;
  v_now       timestamptz := now();
  v_sql       text;
  v_set       text;
  v_count     integer;
  v_released  integer := 0;
  v_closed    integer := 0;
begin
  if p_user_email is null or btrim(p_user_email) = '' then
    raise exception 'Who is moving it is required';
  end if;

  select id, is_active, delivery_mode, device_id
    into a
    from accounts
   where geelark_profile = p_profile
     for update;

  if not found then
    raise exception '% no longer exists', p_profile;
  end if;
  if not a.is_active then
    raise exception '% is retired, and a retired account cannot be moved', p_profile;
  end if;
  if a.delivery_mode is distinct from 'manual' then
    raise exception '% was just moved by someone else. Refresh and look again', p_profile;
  end if;

  if a.device_id is not null then
    select name into v_phone from devices where id = a.device_id;
  end if;

  -- 1. The content behind each queued delivery goes back to the pool.
  for d in
    select pd.source_table as tbl,
           pd.source_id,
           r.source_id_column as idcol,
           r.source_profile_column as pcol,
           r.source_date_column as dcol,
           r.source_time_column as tcol
      from post_deliveries pd
      join content_type_registry r
        on r.content_type = pd.content_type
       and r.source_table = pd.source_table
     where pd.account_id = a.id
       and pd.status = 'queued'
       and r.unified_poster_active is true
       for update of pd
  loop
    if d.idcol is null
       or not exists (select 1 from information_schema.columns c
                      where c.table_schema = 'public' and c.table_name = d.tbl and c.column_name = d.idcol)
       or not exists (select 1 from information_schema.columns c
                      where c.table_schema = 'public' and c.table_name = d.tbl and c.column_name = d.pcol) then
      continue;
    end if;

    v_set := format('%I = NULL', d.pcol);
    if exists (select 1 from information_schema.columns c
               where c.table_schema = 'public' and c.table_name = d.tbl and c.column_name = 'posting_status') then
      v_set := v_set || ', posting_status = NULL';
    end if;
    if d.dcol is not null and exists (select 1 from information_schema.columns c
               where c.table_schema = 'public' and c.table_name = d.tbl and c.column_name = d.dcol) then
      v_set := v_set || format(', %I = NULL', d.dcol);
    end if;
    if d.tcol is not null and exists (select 1 from information_schema.columns c
               where c.table_schema = 'public' and c.table_name = d.tbl and c.column_name = d.tcol) then
      v_set := v_set || format(', %I = NULL', d.tcol);
    end if;
    if exists (select 1 from information_schema.columns c
               where c.table_schema = 'public' and c.table_name = d.tbl and c.column_name = 'scheduled_at') then
      v_set := v_set || ', scheduled_at = NULL';
    end if;
    if exists (select 1 from information_schema.columns c
               where c.table_schema = 'public' and c.table_name = d.tbl and c.column_name = 'scheduler_ready') then
      v_set := v_set || ', scheduler_ready = true';
    end if;

    -- Only while the row is still this account's, and never a posted or
    -- in-flight one.
    v_sql := format('update %I set %s where %I = %L and %I = %L',
                    d.tbl, v_set, d.idcol, d.source_id, d.pcol, p_profile);
    if exists (select 1 from information_schema.columns c
               where c.table_schema = 'public' and c.table_name = d.tbl and c.column_name = 'posting_status') then
      v_sql := v_sql || ' and (posting_status is null or posting_status not in (''Posted'',''Posting''))';
    end if;
    execute v_sql;
    get diagnostics v_count = row_count;
    v_released := v_released + v_count;
  end loop;

  -- 2. The queued deliveries come off the to-do list, the way a retire
  --    closes them.
  update post_deliveries
     set status = 'skipped',
         note = 'Account moved to Cloud',
         done_by = p_user_email,
         done_at = v_now,
         updated_at = v_now
   where account_id = a.id
     and status = 'queued';
  get diagnostics v_closed = row_count;

  -- 3. The move itself: the same columns the app's single move wrote.
  --    moved_to_device_at is kept (PF-10 splits on it).
  update accounts
     set delivery_mode = 'geelark',
         device_id     = null,
         status_note   = coalesce(status_note, '') || coalesce(p_note, ''),
         updated_at    = v_now
   where id = a.id
     and delivery_mode = 'manual';
  if not found then
    -- Cannot happen under the lock above; kept so a future edit that drops
    -- the lock fails loudly instead of releasing posts for a move that did
    -- not happen.
    raise exception '% was just moved by someone else. Refresh and look again', p_profile;
  end if;

  -- 4. The audit row, inside the transaction as the batch move does, with
  --    the count of posts that went back.
  insert into dashboard_audit_log (user_email, action, target, old_value, new_value)
  values (
    p_user_email,
    'delivery_mode_change',
    p_profile,
    jsonb_build_object('delivery_mode', 'manual', 'device_id', a.device_id)
      || case when v_phone is not null then jsonb_build_object('device_name', v_phone) else '{}'::jsonb end,
    jsonb_build_object(
      'delivery_mode', 'geelark',
      'device_id', null,
      'released', v_released,
      'closed_deliveries', v_closed
    )
  );

  return jsonb_build_object(
    'released', v_released,
    'closedDeliveries', v_closed,
    'phone', v_phone
  );
end;
$$;

-- Service role only. "revoke from public" alone leaves anon and authenticated
-- granted by name on this project, so they are named.
revoke all on function public.move_account_to_cloud(text, text, text) from public, anon, authenticated;
grant execute on function public.move_account_to_cloud(text, text, text) to service_role;
