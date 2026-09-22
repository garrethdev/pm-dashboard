-- PF-04: one row per warmup session on a real phone.
--
-- On the Geelark fleet, "this account was warmed up" is a `geelark_tasks` row
-- with `task_category = 'warmup'` and `task_type = 42` — a cloud phone ran the
-- RPA and reported back. A real iPhone reports nothing, so on the Physical
-- fleet the proof is a row in this table: written by a person through the log
-- form (design ticket P3), or later by the warmup script on the MacBook Air
-- (PF-13).
--
-- Two sessions a day per account (Garreth, 2026-09-19), and a manual session
-- is about 15 to 20 minutes. `session_no` says which of the day's two a row
-- counts toward.
--
-- SEVERAL ROWS CAN MAKE ONE SESSION. The log form shows the target and what is
-- already logged for that session, so somebody who does ten minutes, puts the
-- phone down and comes back for another eight logs twice and the session is
-- done. That is why there is no unique index over (account, day, session): the
-- minutes ADD UP, and a second row is the ordinary case rather than the
-- duplicate it would be in `post_deliveries`.
create table if not exists public.warmup_sessions (
  id          bigint generated always as identity primary key,

  account_id  bigint      not null references public.accounts (id) on delete restrict,
  -- The phone it was done on. Kept on the row rather than read back through
  -- accounts.device_id, the same reasoning post_deliveries uses: history stays
  -- true after an account moves phones. NULL when the account is not on one.
  device_id   bigint               references public.devices  (id) on delete restrict,

  -- When the warming started, and — for the script only — when its run ended.
  -- A manual session has no finished-at: the person logs it afterwards and the
  -- minutes are what say how long it took.
  started_at  timestamptz not null default now(),
  finished_at timestamptz,

  minutes     integer     not null,
  -- Which of the day's two sessions this counts toward.
  session_no  smallint    not null default 1,
  -- Who did it: a person, or the script on the Air.
  mode        text        not null default 'manual',
  note        text,
  -- For the record only. Nobody is named on screen; the screens say what
  -- happened, not who did it — the same rule post_deliveries.done_by follows.
  logged_by   text,

  created_at  timestamptz not null default now(),

  constraint warmup_sessions_mode_check
    check (mode in ('manual', 'script')),
  constraint warmup_sessions_session_no_check
    check (session_no in (1, 2)),
  -- A session of no length is not a session. The cap is a typo guard: 600
  -- minutes is ten hours, far past any real warmup, and catches a stray zero
  -- pasted onto the end of a number on a phone keyboard.
  constraint warmup_sessions_minutes_check
    check (minutes > 0 and minutes <= 600),
  -- A run cannot end before it began.
  constraint warmup_sessions_finished_after_started_check
    check (finished_at is null or finished_at >= started_at)
);

comment on table public.warmup_sessions is
  'PF-04: one row per warmup session on a real phone. The Physical fleet''s proof that an account was warmed, standing in for geelark_tasks (task_category = warmup, task_type = 42). Several rows can add up to one session; minutes are summed per (account, local day, session_no).';

comment on column public.warmup_sessions.device_id is
  'The phone the warmup was done on. Kept on the row so it stays true after the account moves phones.';
comment on column public.warmup_sessions.session_no is
  'Which of the day''s two sessions this counts toward (Garreth, 2026-09-19).';
comment on column public.warmup_sessions.finished_at is
  'When a scripted run ended (PF-13). Always NULL for a session logged by hand.';
comment on column public.warmup_sessions.minutes is
  'How long the warming lasted. A manual session counts as done once the minutes logged for it reach 15 (Garreth, 2026-09-19).';

-- The two reads this table gets: an account's own history, and a phone's.
-- Both newest first, which is how the device page and the account page show
-- them.
create index if not exists idx_warmup_sessions_account
  on public.warmup_sessions (account_id, started_at desc);

create index if not exists idx_warmup_sessions_device
  on public.warmup_sessions (device_id, started_at desc) where device_id is not null;

-- RLS on with no policies, exactly as devices, accounts and post_deliveries
-- are: only the service role (the app's route handlers) reads or writes. The
-- revoke names anon and authenticated, because Supabase's default privileges
-- grant both by name and "revoke from public" leaves those grants standing —
-- the mistake that needed its own follow-up migration on 2026-09-10.
alter table public.warmup_sessions enable row level security;
revoke all on table public.warmup_sessions from anon, authenticated;


-- Who warms this account up: a person, or the script on the Air.
--
-- Warmup starts manual and moves to the script later, account by account
-- (Garreth, 2026-09-18). Default 'manual' so every existing row, and every row
-- n8n provisioning inserts without naming the column, needs no backfill. The
-- column only has meaning for accounts on the Physical fleet
-- (delivery_mode = 'manual'); a Geelark account is warmed by the Geelark RPA
-- whatever this says, and the switch that sets it is shown in Physical only.
alter table public.accounts
  add column if not exists warmup_mode text not null default 'manual';

alter table public.accounts
  drop constraint if exists accounts_warmup_mode_check;
alter table public.accounts
  add constraint accounts_warmup_mode_check
  check (warmup_mode in ('manual', 'script'));

comment on column public.accounts.warmup_mode is
  'Who warms this account: manual (a person, warmups appear on the to-do list) or script (the warmup script on the Air logs its own, PF-13). Only meaningful for delivery_mode = manual accounts. Flipped from the Accounts page in Physical, audit-logged as warmup_mode_change.';


-- The health dot means the same thing on both fleets.
--
-- This view has been keyed on `geelark_profile` since it was written, and
-- three things read it that way: `notifications.ts`, `accounts.ts`, and
-- `v_account_health_v3`, which joins it on that column. Re-keying it on
-- account id would mean rewriting all three, so instead the manual sessions
-- are joined IN through `accounts.geelark_profile` and every existing column
-- keeps its name, its type and its position. All 64 accounts have a profile
-- and they are unique, so nothing is lost today; an account provisioned
-- straight onto a real phone with no Geelark profile at all would be invisible
-- here, which is a thing to settle when Geelark is retired (PF-16) and this
-- key stops meaning anything.
--
-- NOT INCLUDING TYPE 90. The backlog wrote this ticket as "the union of
-- Geelark type-42/90 tasks and these rows". Type 90 is `device-warmup`, the
-- phone BOOTING, not the account being scrolled and liked — conflating the two
-- is exactly the bug that made a phone bootup read as a warmup on the account
-- page, and it was fixed by telling them apart. So the Geelark half is left
-- exactly as it was, reading account warmups only, and nothing about an
-- existing account's dot changes.
create or replace view public.v_account_warmup_health as
with w as (
  select
    geelark_tasks.serial_name,
    geelark_tasks.schedule_at,
    geelark_tasks.status,
    geelark_tasks.fail_code,
    geelark_tasks.fail_desc
  from geelark_tasks
  where geelark_tasks.task_category = 'warmup'
    and geelark_tasks.task_type = 42
    and geelark_tasks.status is not null
), resolved as (
  select
    w_1.serial_name,
    w_1.schedule_at,
    w_1.status,
    w_1.fail_code,
    w_1.fail_desc,
    row_number() over (partition by w_1.serial_name order by w_1.schedule_at desc) as rn_resolved
  from w w_1
), geelark_side as (
  select
    serial_name as geelark_profile,
    max(schedule_at) as last_warmup_at,
    max(schedule_at) filter (where status = 3) as last_success_at,
    (select r.status
       from resolved r
      where r.serial_name = w.serial_name and r.rn_resolved = 1) as last_resolved_status,
    (select r.fail_code
       from resolved r
      where r.serial_name = w.serial_name and r.rn_resolved = 1) as last_resolved_fail_code,
    (select r.fail_desc
       from resolved r
      where r.serial_name = w.serial_name and r.rn_resolved = 1) as last_resolved_fail_desc,
    (select count(*)
       from resolved r
      where r.serial_name = w.serial_name and r.status = 4 and r.rn_resolved <= 2) as recent_resolved_failures
  from w
  group by serial_name
-- One row per session actually attempted on a real phone: the day it happened
-- (New York, the day the rest of this database counts in), which of the two
-- sessions it was, and the minutes logged against it added up.
), sessions as (
  select
    a.geelark_profile,
    (s.started_at at time zone 'America/New_York')::date as local_day,
    s.session_no,
    sum(s.minutes) as minutes,
    max(coalesce(s.finished_at, s.started_at)) as at
  from public.warmup_sessions s
  join public.accounts a on a.id = s.account_id
  where a.geelark_profile is not null
  group by 1, 2, 3
), manual_side as (
  select
    geelark_profile,
    max(at) as last_warmup_at,
    -- A session counts as DONE once its minutes reach 15 (Garreth,
    -- 2026-09-19: a manual session is about 15 to 20 minutes, so 15 is the
    -- done line). A session still short of it is a warmup that happened but
    -- did not finish — the same distinction the Geelark side draws between a
    -- task that ran and a task that ran and returned status 3.
    max(at) filter (where minutes >= 15) as last_success_at
  from sessions
  group by 1
), combined as (
  select
    coalesce(g.geelark_profile, m.geelark_profile) as geelark_profile,
    -- GREATEST ignores NULLs in Postgres, so an account with only one of the
    -- two kinds of warmup behind it reads from whichever it has.
    greatest(g.last_warmup_at, m.last_warmup_at)   as last_warmup_at,
    greatest(g.last_success_at, m.last_success_at) as last_success_at,
    g.last_resolved_status,
    g.last_resolved_fail_code,
    g.last_resolved_fail_desc,
    -- Left at 0 rather than NULL for a Physical-only account: there is no such
    -- thing as a failed manual warmup. A session that did not happen simply is
    -- not there, so nothing here should ever report a failure for it.
    coalesce(g.recent_resolved_failures, 0) as recent_resolved_failures
  from geelark_side g
  full outer join manual_side m on m.geelark_profile = g.geelark_profile
)
select
  geelark_profile,
  last_warmup_at,
  (now() at time zone 'America/New_York')::date
    - (last_warmup_at at time zone 'America/New_York')::date as days_since_warmup,
  last_success_at,
  (now() at time zone 'America/New_York')::date
    - (last_success_at at time zone 'America/New_York')::date as days_since_success,
  last_resolved_status,
  last_resolved_fail_code,
  last_resolved_fail_desc,
  recent_resolved_failures
from combined;

comment on view public.v_account_warmup_health is
  'When each account was last warmed up, and when it was last warmed up successfully — reading Geelark account-warmup tasks (task_type 42) and the warmup_sessions logged on real phones as one thing (PF-04). Keyed on geelark_profile, which is what v_account_health_v3 joins on.';
