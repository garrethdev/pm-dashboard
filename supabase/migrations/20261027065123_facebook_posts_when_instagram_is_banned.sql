-- A Facebook account keeps posting when its Instagram twin is banned
-- (Garreth, 2026-10-27).
--
-- Since 2026-10-01 a Facebook account posts what its Instagram twin posts: it
-- is left out of the planner, and every post handed to the Instagram account is
-- copied to it. So when the Instagram account was banned or retired, nothing
-- was planned for it any more, nothing was copied, and the Facebook account
-- stopped too. Profile 81 has had nothing since Profile 65 was banned on
-- 2026-10-19.
--
-- WHAT CHANGES:
--   * The planner takes a mirroring account back as an account of its own
--     while its twin is banned (banned_at set) or retired (is_active false).
--     It is planned for like any other account of its character, and the
--     Smart Scheduler (1.4.0, same day) stamps its rows 'Facebook'.
--   * The copy trigger no longer copies a post onto a banned Facebook account,
--     so a banned Facebook account cannot hold up its Instagram twin's list.
--     It also carries the post's due_at across (20261027120000).
--
-- A PAUSED twin is not a banned one: pausing an Instagram account still pauses
-- its Facebook copies, as it did before. Un-banning a twin hands the Facebook
-- account back to copying; posts already planned for it stay planned.

-- The planner's account list. Rewritten from the live definition rather than
-- retyped, so the only change is the one line; it refuses to run if that line
-- is not where it was on 2026-10-01.
do $$
declare
  v_def  text := pg_get_viewdef('public.v_scheduler_account_config_all'::regclass, true);
  v_from text := $q$WHERE a.is_active IS TRUE AND a."character" ~~ 'Character%'::text AND a.mirrors_account_id IS NULL$q$;
  v_to   text := $q$WHERE a.is_active IS TRUE AND a."character" ~~ 'Character%'::text AND (a.mirrors_account_id IS NULL OR NOT (EXISTS ( SELECT 1 FROM accounts twin WHERE twin.id = a.mirrors_account_id AND twin.is_active IS TRUE AND twin.banned_at IS NULL)))$q$;
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

  insert into post_deliveries (content_type, source_table, source_id, account_id, device_id, mirror_of, due_at)
  select new.content_type, new.source_table, new.source_id, m.id, m.device_id, new.id, new.due_at
    from accounts m
   where m.mirrors_account_id = new.account_id
     and m.is_active is true
     and m.banned_at is null
     and m.delivery_mode = 'manual'
     and m.posting_paused is not true
  on conflict (source_table, source_id, account_id) do nothing;

  return new;
end;
$$;

revoke all on function public.copy_delivery_to_mirrors() from public, anon, authenticated;
