-- A paused account resolves no caps at all, so a paused CHARACTER is invisible.
--
-- v_scheduler_account_config filters `a.posting_paused IS FALSE` inside its
-- acct CTE, and v_scheduler_production_order reads it, so the whole chain drops
-- a paused account. That is correct for the scheduler -- a paused account must
-- never be planned for -- but it means Character 5, whose four accounts are all
-- paused until Garreth un-pauses them, shows up nowhere in the dashboard. The
-- first time anyone would see its real numbers is the moment it starts posting.
--
-- Splitting rather than copying. The obvious fix is a second view with the
-- filter removed, but that duplicates the age ramp and the whole
-- account -> character -> fleet resolution chain, and two copies of a ramp
-- drift. Instead the resolution lives once, in the new _all view, and
-- v_scheduler_account_config becomes a thin filter over it. The scheduler's
-- view keeps its exact column list and its exact contents.
--
-- The base view is built by patching the live definition rather than by
-- retyping it: the only intended change is the removal of one predicate, and a
-- hand-copied 9KB view is a much better way to introduce an accident than a
-- string replace that raises if its anchor has moved. `posting_paused` occurs
-- exactly once in the definition, so the anchor is unambiguous.
--
-- Verified on apply: v_scheduler_account_config and v_scheduler_production_order
-- both diff to 0 rows against a snapshot taken beforehand.
--
-- _all is for DISPLAY ONLY. Nothing that plans or posts may read it, or paused
-- accounts start getting scheduled -- which is the exact bug this works around.

do $$
declare
  src text;
  patched text;
begin
  src := pg_get_viewdef('public.v_scheduler_account_config'::regclass, true);
  patched := replace(src, ' AND a.posting_paused IS FALSE', '');
  if patched = src then
    raise exception
      'anchor " AND a.posting_paused IS FALSE" not found in v_scheduler_account_config';
  end if;
  execute 'create or replace view public.v_scheduler_account_config_all as ' || patched;
end $$;

comment on view public.v_scheduler_account_config_all is
  'Display only. Same resolution as v_scheduler_account_config but WITHOUT the '
  'posting_paused filter, so the dashboard can show what a paused account would '
  'resolve to once un-paused. Never read this from anything that plans or posts.';

-- Identical to the previous definition: the base already filters is_active and
-- character, geelark_profile is unique in accounts, so this reproduces the old
-- row set exactly while keeping the ramp logic in one place.
create or replace view public.v_scheduler_account_config as
  select c.*
  from public.v_scheduler_account_config_all c
  join accounts a on a.geelark_profile = c.geelark_profile
  where a.posting_paused is false;
