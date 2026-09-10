-- The 9-15 day ramp slot is filler-only. A character with no filler lane got
-- nothing at all, so it sat idle for a week instead of ramping.
--
-- The tier was never really "one post a day". It was "one post a day, and it
-- must not be GLP" -- deliberate: GLP is the converting content and a
-- nine-day-old account is the wrong place to spend it, so the slot is filled
-- with disposable filler instead. That rule quietly assumed every character
-- HAS filler to fall back on.
--
-- Character 5 is the first that does not (filler weekly cap 0, by design). Its
-- TikTok pair, Profiles 70 and 72, resolved to ramp_day_cap 1 and
-- ramp_glp_cap 0: one slot a day, nothing allowed to fill it. Six days of
-- deliberate silence that looked exactly like a broken lane.
--
-- Garreth's call, 2026-09-10: if there is no filler, GLP may take the slot.
-- The volume ramp is untouched -- one post a day is still one post a day. Only
-- the "not GLP" half is lifted, and only where it cannot be honoured.
--
-- Deliberately keyed on fil_week_cap = 0, which is the character's RESOLVED
-- filler cap (account override -> character override -> fleet). That is the
-- lane-level statement "this character does not do filler". It is NOT the same
-- as an empty filler pool: a character that has a filler lane but has run out
-- of stock still waits, because that is a supply problem to fix, not a reason
-- to spend GLP early.
--
-- The under-9-day tier is now spelled out rather than inherited from the
-- <= 15 branch. It resolved to 0 before and still does; being explicit stops
-- the new inner CASE from ever applying to an account too young to post.
--
-- Scope, verified before applying: Character 5 is the only character whose
-- resolved filler cap is 0. Characters 2 and 4 each have an account inside the
-- same 9-15 day tier WITH filler, and both must be unmoved by this.
--
-- Patched rather than retyped, same as the migration that created this view:
-- the anchor occurs exactly once, and the DO block raises if it has moved.

do $$
declare
  src text;
  patched text;
  anchor constant text := '                    WHEN b.age_days <= 15 THEN 0
';
  replacement constant text := '                    WHEN b.age_days < 9 THEN 0
                    WHEN b.age_days <= 15 THEN
                        CASE WHEN COALESCE(b.fil_week_cap, 0) = 0 THEN 1 ELSE 0 END
';
begin
  src := pg_get_viewdef('public.v_scheduler_account_config_all'::regclass, true);
  if (length(src) - length(replace(src, anchor, ''))) / length(anchor) <> 1 then
    raise exception 'ramp_glp_cap anchor is not unique in v_scheduler_account_config_all';
  end if;
  patched := replace(src, anchor, replacement);
  execute 'create or replace view public.v_scheduler_account_config_all as ' || patched;
end $$;

-- v_scheduler_account_config is a thin filter over the base view and picks the
-- change up automatically; it is re-stated here only so that replaying this
-- folder in order cannot leave the two out of step.
create or replace view public.v_scheduler_account_config as
  select c.*
  from public.v_scheduler_account_config_all c
  join accounts a on a.geelark_profile = c.geelark_profile
  where a.posting_paused is false;
