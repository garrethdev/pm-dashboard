-- The age ramp could RAISE a character's daily cap above what was configured.
--
-- The ramp is meant to be a throttle: a ceiling that starts low on a new
-- account and lifts as it matures. At two of its tiers it returned a literal
-- number instead, ignoring the account's own resolved day cap entirely:
--
--   age <= 15  ->  1        age <= 22  ->  2        age 23+  ->  b.day_cap
--
-- Character 5 is configured for 1 post a day. Profiles 64 and 65 are 20 days
-- old, so they resolved to max_posts_per_day = 2 -- a limit nobody set, and
-- one that only deferred to the real cap on day 23.
--
-- It has not over-posted, because the bucket caps happen to bind first:
-- 1 GLP/day + 0 filler/day = 1 placement. That masking is exactly why this is
-- worth fixing rather than leaving. The two bucket caps are each clamped to
-- the day cap INDIVIDUALLY in the output --
--
--   LEAST(eff_glp_cap, eff_day_cap), LEAST(fil_day_cap, eff_day_cap)
--
-- -- but their SUM is not, so the real ceiling on placements is eff_day_cap.
-- Give Character 5 a filler lane (GLP 6/wk + filler 1/wk saves cleanly: the
-- only arithmetic check is weekly, GLP + filler <= day_cap x 7 = 7) and
-- fil_day_cap falls back to the fleet's 2. The account would then place 1 GLP
-- + 1 filler = 2 posts a day against a stated cap of 1, with nothing in the UI
-- or the API objecting, because 7 a week was never exceeded -- it just arrived
-- as 2+2+2+1 instead of 1 a day.
--
-- LEAST() makes the ramp able only to lower a cap, never to lift one above the
-- configured value. Characters on the fleet cap of 2 are unaffected at every
-- tier: LEAST(1,2) = 1 and LEAST(2,2) = 2, exactly as before.
--
-- ramp_only_cap is deliberately NOT clamped, and carries the same tier numbers
-- one CASE below this one -- which is why the anchor here runs to the end of
-- the expression. It feeds guard_day_cap, whose documented job is to answer
-- "how high could this account go if the override were raised", ignoring the
-- override on purpose. Clamping it to the current cap would make it always
-- equal that cap and destroy the only signal the UI has for which direction a
-- change is possible.

do $$
declare
  src text;
  patched text;
  anchor constant text := '                    WHEN b.age_days <= 15 THEN 1
                    WHEN b.age_days <= 22 THEN 2
                    ELSE b.day_cap
                END AS ramp_day_cap,';
  replacement constant text := '                    WHEN b.age_days <= 15 THEN LEAST(1, b.day_cap)
                    WHEN b.age_days <= 22 THEN LEAST(2, b.day_cap)
                    ELSE b.day_cap
                END AS ramp_day_cap,';
begin
  src := pg_get_viewdef('public.v_scheduler_account_config_all'::regclass, true);
  if (length(src) - length(replace(src, anchor, ''))) / length(anchor) <> 1 then
    raise exception 'ramp_day_cap anchor is not unique in v_scheduler_account_config_all';
  end if;
  patched := replace(src, anchor, replacement);
  execute 'create or replace view public.v_scheduler_account_config_all as ' || patched;
end $$;

-- Re-stated so replaying this folder in order cannot leave the pair out of step.
create or replace view public.v_scheduler_account_config as
  select c.*
  from public.v_scheduler_account_config_all c
  join accounts a on a.geelark_profile = c.geelark_profile
  where a.posting_paused is false;
