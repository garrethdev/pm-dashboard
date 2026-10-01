-- A Facebook account posts the same videos as its Instagram account
-- (Garreth, 2026-10-01).
--
-- Each phone carries one persona's Instagram and that persona's Facebook. The
-- Facebook account posts what the Instagram posts, but it is still its own
-- account: its own warmups, its own posting tasks, its own Posted / Failed.
--
-- HOW:
--   * accounts.mirrors_account_id names the account whose videos this one
--     posts. Set on the Facebook account, pointing at its Instagram.
--   * Whenever a post is handed to the Instagram account (the Posting Agent
--     inserts a post_deliveries row, PF-06), the same post is handed to every
--     account that mirrors it, as its own row. post_deliveries.mirror_of
--     says which row it copies.
--   * The daily planner (Smart Scheduler) never plans for a mirroring account:
--     it is taken out of v_scheduler_account_config_all, so it is never given
--     content of its own and never counted as demand by the production order.
--
-- A COPY NEVER TOUCHES THE CONTENT ROW. The content row belongs to the
-- Instagram post; the app skips closeContentRow for a row with mirror_of set,
-- and the release in move_account_to_cloud / retire_phone_account already
-- only frees content rows still assigned to the account's own profile.
--
-- A paused or retired mirroring account is skipped, the same as the Posting
-- Agent skips one: nothing lands on its list while it is not posting.

alter table public.accounts
  add column if not exists mirrors_account_id bigint
    references public.accounts(id) on delete set null;

alter table public.accounts
  drop constraint if exists accounts_mirrors_not_self;
alter table public.accounts
  add constraint accounts_mirrors_not_self check (mirrors_account_id is distinct from id);

create index if not exists idx_accounts_mirrors_account_id
  on public.accounts (mirrors_account_id) where mirrors_account_id is not null;

alter table public.post_deliveries
  add column if not exists mirror_of bigint
    references public.post_deliveries(id) on delete set null;

create or replace function public.copy_delivery_to_mirrors()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- A copy is never copied again, so two accounts pointing at each other
  -- cannot loop.
  if new.mirror_of is not null then
    return new;
  end if;

  insert into post_deliveries (content_type, source_table, source_id, account_id, device_id, mirror_of)
  select new.content_type, new.source_table, new.source_id, m.id, m.device_id, new.id
    from accounts m
   where m.mirrors_account_id = new.account_id
     and m.is_active is true
     and m.delivery_mode = 'manual'
     and m.posting_paused is not true
  on conflict (source_table, source_id, account_id) do nothing;

  return new;
end;
$$;

revoke all on function public.copy_delivery_to_mirrors() from public, anon, authenticated;

drop trigger if exists trg_copy_delivery_to_mirrors on public.post_deliveries;
create trigger trg_copy_delivery_to_mirrors
  after insert on public.post_deliveries
  for each row execute function public.copy_delivery_to_mirrors();

-- The planner's account list, minus mirroring accounts. Rewritten from the
-- live definition rather than retyped, so the only change is the one line;
-- it refuses to run if that line is not where it was on 2026-10-01.
do $$
declare
  v_def  text := pg_get_viewdef('public.v_scheduler_account_config_all'::regclass, true);
  v_from text := $q$WHERE a.is_active IS TRUE AND a."character" ~~ 'Character%'::text$q$;
  v_to   text := $q$WHERE a.is_active IS TRUE AND a."character" ~~ 'Character%'::text AND a.mirrors_account_id IS NULL$q$;
begin
  if position(v_to in v_def) > 0 then
    return; -- already applied
  end if;
  if position(v_from in v_def) = 0 then
    raise exception 'v_scheduler_account_config_all has changed shape; edit this migration by hand';
  end if;
  execute 'create or replace view public.v_scheduler_account_config_all as ' || replace(v_def, v_from, v_to);
end;
$$;
