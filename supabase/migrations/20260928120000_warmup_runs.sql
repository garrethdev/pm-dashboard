-- PF-13: the warmup script's "Running" record, and a guard on its session rows.
--
-- WHY A TABLE OF ITS OWN (Garreth, 2026-09-25). A `warmup_sessions` row is only
-- written when a run ENDS, so a script that died halfway looked exactly like
-- one that had not started. The script now says when a run starts and checks
-- in once a minute; the dashboard calls the account Running while those
-- check-ins are fresh, and Stopped when they go quiet with no end behind them.
--
-- Not rows in `warmup_sessions`: that table's minutes are ADDED UP to decide
-- when a session is done, and it refuses a zero-minute row — a run that has
-- only just started has no minutes to give it.
--
-- One row per run. The script (garrethdev/warmup-runner) names a run by the
-- account, which of the day's two sessions it is, and the instant it started;
-- it never holds a row id. So that triple is unique, which also makes a
-- repeated "start" (a retry after a timeout) land on the same row.
create table if not exists public.warmup_runs (
  id           bigint generated always as identity primary key,

  account_id   bigint      not null references public.accounts (id) on delete restrict,
  -- Always set: the script only runs on a phone. Kept on the row, like
  -- warmup_sessions.device_id, so it stays true after the account moves.
  device_id    bigint      not null references public.devices  (id) on delete restrict,
  session_no   smallint    not null,
  started_at   timestamptz not null,

  -- The last time the dashboard heard from this run: the start, each
  -- once-a-minute check-in, and the close. Stamped with the DASHBOARD's clock,
  -- never the Air's, because "fresh" is judged against the dashboard's clock.
  last_seen_at timestamptz not null default now(),

  -- Set when the script closes the run, however it ended. NULL while it runs —
  -- or after the script died without closing it, which is the case this table
  -- exists to show.
  ended_at     timestamptz,
  -- The script's short reason when a run ended early (HANDOVER section 16),
  -- NULL when it finished normally.
  note         text,

  created_at   timestamptz not null default now(),

  constraint warmup_runs_session_no_check
    check (session_no in (1, 2)),
  constraint warmup_runs_ended_after_started_check
    check (ended_at is null or ended_at >= started_at),
  constraint warmup_runs_one_per_start
    unique (account_id, session_no, started_at)
);

comment on table public.warmup_runs is
  'PF-13: one row per run of the warmup script on the Air. Written only through /api/warmup-runner. Running while ended_at is NULL and last_seen_at is fresh; a NULL ended_at gone quiet means the script stopped without closing the run.';
comment on column public.warmup_runs.last_seen_at is
  'The dashboard''s clock at the start, each check-in and the close. Freshness is judged against this.';

-- The to-do list reads one New York day of runs at a time.
create index if not exists idx_warmup_runs_started
  on public.warmup_runs (started_at);

-- Service role only, as devices, accounts and warmup_sessions are. The revoke
-- names anon and authenticated, because Supabase's default privileges grant
-- both by name and "revoke from public" leaves those grants standing.
alter table public.warmup_runs enable row level security;
revoke all on table public.warmup_runs from anon, authenticated;


-- A scripted session is written once.
--
-- warmup_sessions deliberately has no unique rule, because a person logging
-- ten minutes and then eight more is two rows for one session. The script is
-- different: it writes exactly one row per run, and that row carries the run's
-- start instant. If the Air's request times out after the row landed, the
-- script retries — and without this the same run would count twice and could
-- mark a 9-minute session done. So one row per (account, session, start) for
-- script rows only; rows logged by hand are untouched.
create unique index if not exists warmup_sessions_script_once
  on public.warmup_sessions (account_id, session_no, started_at)
  where mode = 'script';
