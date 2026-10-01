-- Set up a new character from the Accounts page (Garreth, 2026-10-01).
--
-- One transaction: the `characters` row and the character's scheduler
-- overrides land together, so a half-made character can never be planned for.
--
-- CONTENT TYPES ARE NOT SET HERE (Garreth's choice, 2026-10-01). A content
-- type belongs to exactly one character in content_type_registry, so a new
-- character starts with none and gets its own later, when its lanes are built
-- (the wire-new-content-type routine). allowed_content_types starts empty.
--
-- POSTING AMOUNTS ARE OPTIONAL. Left out, the character is written with a
-- daily cap of 0, so the planner gives its accounts nothing at all and logs no
-- shortfall for them ("no daily capacity"). Given, they are written as the
-- character's own caps. Either way filler is 0: the planner only has filler
-- pools for Characters 2, 3 and 4, so a filler cap on a new character would
-- only produce a daily "pool empty" alarm.
--
-- Until the character owns a content type its accounts get no posts whatever
-- the amounts say, because the planner only offers a character its own lanes.

create or replace function public.setup_character(
  p_character   text,
  p_notes       text,
  p_max_per_day integer,
  p_week        integer,
  p_user_email  text
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_name text := btrim(coalesce(p_character, ''));
  v_note text := to_char(now() at time zone 'America/New_York', 'YYYY-MM-DD') || ' '
                 || coalesce(p_user_email, 'dashboard') || ': set up from the Accounts page';
begin
  if p_user_email is null or btrim(p_user_email) = '' then
    raise exception 'Who is setting it up is required';
  end if;
  -- The planner only reads accounts whose character starts "Character".
  if v_name !~ '^Character [1-9][0-9]{0,2}$' then
    raise exception 'A character is named "Character" and a number';
  end if;
  if exists (select 1 from characters where character = v_name) then
    raise exception '% already exists', v_name;
  end if;
  if (p_max_per_day is null) <> (p_week is null) then
    raise exception 'Give both posting amounts, or neither';
  end if;
  if p_max_per_day is not null and (p_max_per_day < 1 or p_max_per_day > 10) then
    raise exception 'Posts a day must be between 1 and 10';
  end if;
  if p_week is not null and (p_week < 1 or p_week > 70) then
    raise exception 'Posts a week must be between 1 and 70';
  end if;
  if p_week is not null and p_week > p_max_per_day * 7 then
    raise exception 'Posts a week cannot be more than % (posts a day for seven days)', p_max_per_day * 7;
  end if;

  insert into characters (character, allowed_content_types, is_active, notes)
  values (v_name, '{}', true, nullif(btrim(coalesce(p_notes, '')), ''));

  insert into scheduler_overrides
    (scope, scope_key, bucket, weekly_cap, daily_cap, max_posts_per_day, active, bypass_guards, note)
  values
    ('character', v_name, null,     null,                     null, coalesce(p_max_per_day, 0), true, false, v_note),
    ('character', v_name, 'glp',    coalesce(p_week, 0),      null, null,                       true, false, v_note),
    ('character', v_name, 'filler', 0,                        0,    null,                       true, false, v_note);

  insert into dashboard_audit_log (user_email, action, target, old_value, new_value)
  values (
    p_user_email,
    'character_setup',
    v_name,
    null,
    jsonb_build_object(
      'notes', nullif(btrim(coalesce(p_notes, '')), ''),
      'max_posts_per_day', coalesce(p_max_per_day, 0),
      'glp_week', coalesce(p_week, 0),
      'filler_week', 0
    )
  );

  return jsonb_build_object('character', v_name);
end;
$$;

-- Service role only. "revoke from public" alone leaves anon and authenticated
-- granted by name on this project, so they are named.
revoke all on function public.setup_character(text, text, integer, integer, text) from public, anon, authenticated;
grant execute on function public.setup_character(text, text, integer, integer, text) to service_role;
