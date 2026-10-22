-- The days off (Garreth, 2026-10-16): six working days a week.
--
-- WHY. Warmups and posting ran seven days a week. From now on nothing is
-- scheduled on the day off: the Smart Scheduler plans no posts, the To-do list
-- asks for no warmups or posts, and the warmup robot is given no accounts.
-- Work left over on the day before comes back on the next working day
-- (Saturday's on Monday).
--
-- ONE ROW for the whole business, so the dashboard, the Smart Scheduler (n8n)
-- and the warmup robot (through the dashboard) all read the same days. It is
-- changed on the dashboard's Settings page. Sunday to start with; Saturday,
-- or two days, is a change of this one row, no code.
--
-- Days are numbered as Postgres's extract(dow) and JavaScript's getDay():
-- 0 = Sunday … 6 = Saturday, always New York days.
create table if not exists public.work_week (
  -- Always true: there is exactly one row.
  id          boolean     primary key default true check (id),
  days_off    smallint[]  not null default '{0}',
  updated_at  timestamptz not null default now(),
  constraint work_week_days_are_days check (days_off <@ '{0,1,2,3,4,5,6}'::smallint[]),
  constraint work_week_leaves_a_working_day check (cardinality(days_off) < 7)
);

insert into public.work_week (id, days_off) values (true, '{0}')
on conflict (id) do nothing;

-- Read and written with the service key only (the dashboard's server, n8n).
alter table public.work_week enable row level security;

comment on table public.work_week is
  'The days off: nothing scheduled on them (no warmups, no posts). One row. '
  'days_off: 0 = Sunday … 6 = Saturday, New York days. Changed on the '
  'dashboard''s Settings page (Garreth, 2026-10-16).';

-- setup_character: posts a week can be at most posts a day times the WORKING
-- days (6 with Sunday off), not times seven. Otherwise unchanged from the live
-- definition (20261001121000_setup_character.sql).
create or replace function public.setup_character(
  p_character text, p_notes text, p_max_per_day integer, p_week integer, p_user_email text
)
returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_name text := btrim(coalesce(p_character, ''));
  v_note text := to_char(now() at time zone 'America/New_York', 'YYYY-MM-DD') || ' '
                 || coalesce(p_user_email, 'dashboard') || ': set up from the Accounts page';
  v_working_days integer := 7 - coalesce(
    (select cardinality(array(select distinct unnest(days_off))) from work_week limit 1), 1);
begin
  if p_user_email is null or btrim(p_user_email) = '' then
    raise exception 'Who is setting it up is required';
  end if;
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
  if p_week is not null and p_week > p_max_per_day * v_working_days then
    raise exception 'Posts a week cannot be more than % (posts a day for % working days)',
      p_max_per_day * v_working_days, v_working_days;
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
$function$;
