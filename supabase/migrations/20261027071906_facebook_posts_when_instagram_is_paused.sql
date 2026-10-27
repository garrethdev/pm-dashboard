-- A paused Instagram account no longer stops its Facebook twin
-- (Garreth and Czedrick, 2026-10-27).
--
-- The two accounts are tied only for handing out posts: the Facebook account
-- posts what its Instagram twin is given. Otherwise they are separate, so a
-- pause on the Instagram account is not a pause on the Facebook one.
--
-- facebook_posts_when_instagram_is_banned (earlier the same day) let a Facebook
-- account be planned on its own while its twin is banned or retired. This adds
-- a paused twin to that list.
--
-- AND NO DOUBLE POSTS ON THE WAY BACK. While its twin is out, the Facebook
-- account is given its own posts, up to three days ahead. When the twin is
-- unpaused it goes back to copying, and for those days it would get its own
-- posts and the copies. So the copy trigger now skips a day on which the
-- Facebook account already has a post of its own handed out.

do $$
declare
  v_def  text := pg_get_viewdef('public.v_scheduler_account_config_all'::regclass, true);
  v_from text := $q$twin.is_active IS TRUE AND twin.banned_at IS NULL$q$;
  v_to   text := $q$twin.is_active IS TRUE AND twin.banned_at IS NULL AND twin.posting_paused IS NOT TRUE$q$;
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
     -- Planned on its own for that day while its twin was out.
     and not exists (
       select 1
         from post_deliveries own
        where own.account_id = m.id
          and own.mirror_of is null
          and (own.due_at at time zone 'America/New_York')::date
              = (new.due_at at time zone 'America/New_York')::date
     )
  on conflict (source_table, source_id, account_id) do nothing;

  return new;
end;
$$;

revoke all on function public.copy_delivery_to_mirrors() from public, anon, authenticated;
