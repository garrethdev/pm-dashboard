-- Hand Yurie all three planned days at once (Garreth and Czedrick, 2026-10-27).
--
-- The Smart Scheduler plans three days at a time (1.4.0). The Posting Agent
-- reads this view at 10:00 ET, and it held only today's posts, so the next two
-- days reached the To-do list on their own day. For an account posted by hand
-- it now also holds the next two days. Each hand-out carries its due_at, and
-- the To-do list files it under that day (deployed the same day, PR #80, which
-- had to be live first or all three days would have landed on today's list).
--
-- Robot (Geelark) accounts keep today only: the robot posts the moment it is
-- handed a post. A post is handed out once; the Posting Agent ignores one it
-- has already handed out, so the same post is not handed out again on the next
-- two mornings.
--
-- Rewritten from the live definition rather than retyped, so the only change is
-- the one line; it refuses to run if that line is not where it was.

do $$
declare
  v_def  text := pg_get_viewdef('public.unified_posts_due'::regclass, true);
  v_from text := $q$AND up.posting_date::date = (now() AT TIME ZONE 'America/New_York'::text)::date$q$;
  v_to   text := $q$AND (up.posting_date::date = (now() AT TIME ZONE 'America/New_York'::text)::date OR a.delivery_mode = 'manual'::text AND up.posting_date::date > (now() AT TIME ZONE 'America/New_York'::text)::date AND up.posting_date::date <= ((now() AT TIME ZONE 'America/New_York'::text)::date + 2))$q$;
begin
  if position(v_to in v_def) > 0 then
    return; -- already applied
  end if;
  if position(v_from in v_def) = 0 then
    raise exception 'unified_posts_due has changed shape; edit this migration by hand';
  end if;
  execute 'create or replace view public.unified_posts_due as ' || replace(v_def, v_from, v_to);
end;
$$;
