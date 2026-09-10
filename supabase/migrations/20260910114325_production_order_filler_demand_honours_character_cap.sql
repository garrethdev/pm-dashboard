-- The production order told you to make filler for a character that cannot
-- post filler.
--
-- Its GLP demand is resolved per character, straight off content_type_registry
-- cadence x account count. Filler was not: it read the FLEET weekly quota and
-- multiplied, never once looking at scheduler_overrides. So Character 5, whose
-- filler cap is 0 by design, produced a row reading
--
--   filler | pool 0 | demand 12/wk | days_cover 0 | EMPTY | produce 36
--
-- Twelve a week is 3 (the fleet quota) x 4 accounts. Every part of that row is
-- fiction, and the instruction at the end of it -- make 36 filler pieces -- is
-- work that could never be posted. Meanwhile the account config resolves the
-- same character to 0 filler a day and the scheduler correctly places none, so
-- the dashboard was contradicting the scheduler about the same character.
--
-- Two changes, both in the filler branch of the demand CTE:
--   1. the weekly figure resolves character override -> fleet, matching how
--      every other consumer of these caps resolves them;
--   2. a character whose resolved cap is 0 produces NO ROW AT ALL, rather than
--      a zero-demand row. A lane that does not exist should be absent from a
--      list of what to make, not present with a nought against it -- an EMPTY
--      status on a zero-demand row is exactly the false alarm this fixes.
--
-- Account overrides are deliberately not consulted. This view counts demand
-- per CHARACTER; a single account holding its own filler cap does not mean the
-- character stopped running a filler lane, and folding one account's exception
-- into the character's production target would understate what to make.
--
-- inventory_check is untouched and was already correct here: it reports a glp
-- row for Character 5 and no filler row. The Mon/Fri digest reads that view,
-- not this one, so the two now agree.
--
-- Nothing in the database reads v_scheduler_production_order -- verified via
-- pg_depend -- so this is the Inventory page only.

do $$
declare
  src text;
  patched text;
  anchor constant text := 'f.fil_week * a.n_accounts
           FROM accts a
             CROSS JOIN fleet f';
  replacement constant text := 'COALESCE(oc_f.weekly_cap, f.fil_week) * a.n_accounts
           FROM accts a
             CROSS JOIN fleet f
             LEFT JOIN scheduler_overrides oc_f
               ON oc_f.scope = ''character''::text
              AND oc_f.scope_key = a."character"
              AND oc_f.bucket = ''filler''::text
              AND oc_f.active
          WHERE COALESCE(oc_f.weekly_cap, f.fil_week) > 0';
begin
  src := pg_get_viewdef('public.v_scheduler_production_order'::regclass, true);
  if (length(src) - length(replace(src, anchor, ''))) / length(anchor) <> 1 then
    raise exception 'filler demand anchor is not unique in v_scheduler_production_order';
  end if;
  patched := replace(src, anchor, replacement);
  execute 'create or replace view public.v_scheduler_production_order as ' || patched;
end $$;
