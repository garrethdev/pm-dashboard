-- PF-11 (design P8, approved by Garreth 2026-09-23): retiring a banned account
-- that lives on a REAL phone.
--
-- On Cloud the Post-Ban robot (n8n `[Ops] Post-Ban System`) does everything:
-- it deletes the Geelark phone, switches off the proxy's and the number's
-- renewals, hands the queued posts back and marks the account retired. A real
-- phone has no robot. The app does its own half at once — the queued posts go
-- back to the pool and the account is marked retired — and the phone half
-- becomes a checklist on the to-do list, ticked by hand.
--
-- Everything here is added beside what exists; nothing is altered. The robot
-- is never called for a real-phone account.

-- One row per step a person has to do on the phone after a ban.
create table if not exists public.ban_cleanup_steps (
  id          bigint generated always as identity primary key,
  account_id  bigint      not null references public.accounts (id) on delete restrict,
  -- The phone the account was on when it was retired. Kept on the row, the way
  -- post_deliveries keeps it, so the checklist stays on the right phone.
  device_id   bigint               references public.devices  (id) on delete restrict,
  kind        text        not null,
  -- What the step is about, as it was at the retire: the phone's name, the
  -- number, the proxy's host and port. A snapshot, so a later edit to the
  -- phone does not rewrite what was to be done.
  detail      text,
  -- Order on screen: sign out, number, proxy.
  position    smallint    not null,
  -- Who ticked it and when. Nobody is named on screen; this is for the record.
  done_by     text,
  done_at     timestamptz,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint ban_cleanup_steps_kind_check check (kind in ('signOut', 'number', 'proxy')),
  -- One of each step per account: a retire that is sent twice adds nothing.
  constraint ban_cleanup_steps_account_kind_key unique (account_id, kind)
);

comment on table public.ban_cleanup_steps is
  'PF-11: the steps a person does on a real phone after its account is retired as banned. The app''s own half (queued posts released, account retired) is not a step.';

-- The to-do list's own query: what is still open, by phone.
create index if not exists idx_ban_cleanup_steps_open
  on public.ban_cleanup_steps (device_id) where done_at is null;

-- Service role only, the same as accounts and devices.
alter table public.ban_cleanup_steps enable row level security;
revoke all on table public.ban_cleanup_steps from anon, authenticated;


-- How many content rows a retire would hand back to the pool.
--
-- A READ-ONLY MIRROR of release_profile_content(): the same tables, the same
-- profile column, the same rule that Posted and Posting rows are never
-- touched. The retire dialog shows this number before the hold, so it must
-- count exactly what the release will release. If release_profile_content
-- ever changes its rule, this has to change with it.
create or replace function public.profile_content_pending(p_profile text)
returns integer
language plpgsql
stable
set search_path = public
as $$
declare
  r record;
  v_sql text;
  v_count integer;
  v_total integer := 0;
  has_status boolean;
begin
  for r in
    select distinct ctr.source_table as tbl, ctr.source_profile_column as pcol
    from content_type_registry ctr
    where ctr.unified_poster_active is true
  loop
    if not exists (select 1 from information_schema.columns c
                   where c.table_schema = 'public' and c.table_name = r.tbl and c.column_name = r.pcol) then
      continue;
    end if;
    has_status := exists (select 1 from information_schema.columns c
                          where c.table_schema = 'public' and c.table_name = r.tbl and c.column_name = 'posting_status');

    v_sql := format('select count(*) from %I where %I = %L', r.tbl, r.pcol, p_profile);
    if has_status then
      v_sql := v_sql || ' and (posting_status is null or posting_status not in (''Posted'',''Posting''))';
    end if;
    execute v_sql into v_count;
    v_total := v_total + coalesce(v_count, 0);
  end loop;
  return v_total;
end;
$$;


-- Retire a real-phone account, all of it or none of it.
--
-- 1. The account is marked retired the way the robot marks it (inactive,
--    health "banned", a "post-ban cleanup" note — which is what the Accounts
--    table reads to show "Retired").
-- 2. Its content goes back to the pool (release_profile_content, the robot's
--    own function).
-- 3. Its open to-do posts are closed as skipped, so nobody is asked to post
--    for a banned account.
-- 4. The checklist steps are written, on the phone it was on.
--
-- The number and proxy details are worked out by the app, which already parses
-- the phone's fields for Proxies & numbers; this only stores them.
--
-- Sent twice for an account on a phone (a retry after a timeout whose first
-- attempt landed), it changes nothing and answers `already`.
create or replace function public.retire_phone_account(
  p_profile      text,
  p_retire_proxy boolean,
  p_number       text,
  p_proxy        text,
  p_by           text
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  a record;
  v_phone text;
  v_released integer := 0;
  v_closed integer := 0;
  v_steps integer := 0;
begin
  select id, device_id, delivery_mode, is_active
    into a
    from accounts
   where geelark_profile = p_profile
   for update;

  if not found then
    raise exception 'No account called %', p_profile;
  end if;
  if a.delivery_mode is distinct from 'manual' then
    raise exception '% is on Cloud. Retire it from the Cloud side', p_profile;
  end if;

  if exists (select 1 from ban_cleanup_steps where account_id = a.id) then
    return jsonb_build_object('already', true);
  end if;
  if a.is_active is false then
    raise exception '% is already retired', p_profile;
  end if;

  if a.device_id is not null then
    select name into v_phone from devices where id = a.device_id;
  end if;

  update accounts
     set is_active = false,
         health_status = 'banned',
         status_note = to_char(now() at time zone 'America/New_York', 'YYYY-MM-DD')
                       || ' — post-ban cleanup (real phone'
                       || coalesce(' ' || v_phone, '') || ')',
         updated_at = now()
   where id = a.id;

  select coalesce(sum(released), 0) into v_released
    from release_profile_content(p_profile);

  update post_deliveries
     set status = 'skipped',
         note = 'Account retired',
         done_by = p_by,
         done_at = now(),
         updated_at = now()
   where account_id = a.id
     and status = 'queued';
  get diagnostics v_closed = row_count;

  if a.device_id is not null then
    insert into ban_cleanup_steps (account_id, device_id, kind, detail, position, created_by)
    values (a.id, a.device_id, 'signOut', v_phone, 1, p_by),
           (a.id, a.device_id, 'number', nullif(p_number, ''), 2, p_by);
    v_steps := 2;
    if p_retire_proxy then
      insert into ban_cleanup_steps (account_id, device_id, kind, detail, position, created_by)
      values (a.id, a.device_id, 'proxy', nullif(p_proxy, ''), 3, p_by);
      v_steps := 3;
    end if;
  end if;

  return jsonb_build_object(
    'already', false,
    'released', v_released,
    'closedDeliveries', v_closed,
    'steps', v_steps,
    'phone', v_phone
  );
end;
$$;

-- Service role only. "revoke from public" alone leaves anon and authenticated
-- granted by name, so they are named.
revoke all on function public.profile_content_pending(text) from public, anon, authenticated;
revoke all on function public.retire_phone_account(text, boolean, text, text, text) from public, anon, authenticated;
grant execute on function public.profile_content_pending(text) to service_role;
grant execute on function public.retire_phone_account(text, boolean, text, text, text) to service_role;
