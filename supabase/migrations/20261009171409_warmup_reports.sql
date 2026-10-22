-- The warmup robot's report on each warmup (Garreth, 2026-10-09).
--
-- WHY. The first live scheduled warmup (maya_journey8, 2026-10-09 12:41 ET)
-- stopped after a minute with `device_lost`, and nobody could see why without
-- fetching a log file off the MacBook Air. So after every warmup that reached
-- the phone, finished or stopped, the robot (garrethdev/warmup-runner) now
-- sends one report: what it did (the counts), how it ended, its full diary
-- (its own JSON log lines) and, when it stopped, a picture of the screen.
-- The account's page lists them the way Geelark's task history does, and a row
-- opens the diary so it can be read, or copied into a chat with Claude.
--
-- NOT warmup_runs. A run is the Running record, and only exists once the robot
-- said "Running". A warmup can stop before that (feed_not_loading,
-- wrong_account) and still needs its report.
--
-- Named like a run: the account, which of the day's two warmups, and the
-- instant it started. Unique on that triple, so a report sent twice (a retry
-- after a timeout) lands once.
--
-- KEEPING. The summary is kept for good, like Geelark's history. The diary and
-- the screenshot are the heavy part, so they are cleared after 30 days: the
-- dashboard does it whenever a new report arrives (no scheduled job), and
-- stamps `cleared_at` so the page can say the diary was cleared rather than
-- never sent.
create table if not exists public.warmup_reports (
  id             bigint generated always as identity primary key,

  account_id     bigint      not null references public.accounts (id) on delete restrict,
  -- The phone it ran on, kept on the row so it stays true after the account
  -- moves, as warmup_runs and warmup_sessions do.
  device_id      bigint      not null references public.devices  (id) on delete restrict,
  session_no     smallint    not null,
  -- The run's start (the same instant as its warmup_runs row) when Running was
  -- said; otherwise when the warmup began on the phone.
  started_at     timestamptz not null,
  ended_at       timestamptz not null,
  outcome        text        not null,
  -- The robot's short stop reason (warmup-runner HANDOVER section 16). NULL
  -- when it finished.
  note           text,
  -- Whole minutes recorded. 0 is allowed here: a warmup that stopped in its
  -- first minute still has a report.
  minutes        integer     not null,

  -- What the robot did.
  videos         integer     not null default 0,
  -- Photo posts, which count as the feed too.
  posts          integer     not null default 0,
  -- How many times it asked Claude whether a video was on topic, and how many
  -- of those were.
  claude_checks  integer     not null default 0,
  on_topic       integer     not null default 0,
  likes          integer     not null default 0,
  saves          integer     not null default 0,
  follows        integer     not null default 0,

  -- The diary: the robot's own JSON log lines for this warmup, one per line,
  -- with keys already scrubbed on the Air. Cleared after 30 days.
  log            text,
  -- The screen when it stopped, as a base64 PNG. Cleared after 30 days.
  screenshot     text,
  -- Whether there is a diary and a screenshot, so the list can say so without
  -- reading either (they can be megabytes).
  has_log        boolean     generated always as (log is not null) stored,
  has_screenshot boolean     generated always as (screenshot is not null) stored,
  -- When the 30-day clear-out emptied log and screenshot. NULL until then.
  cleared_at     timestamptz,

  created_at     timestamptz not null default now(),

  constraint warmup_reports_session_no_check
    check (session_no in (1, 2)),
  constraint warmup_reports_outcome_check
    check (outcome in ('finished', 'stopped')),
  constraint warmup_reports_ended_after_started_check
    check (ended_at >= started_at),
  constraint warmup_reports_minutes_check
    check (minutes >= 0),
  constraint warmup_reports_counts_check
    check (videos >= 0 and posts >= 0 and claude_checks >= 0 and on_topic >= 0
           and likes >= 0 and saves >= 0 and follows >= 0),
  constraint warmup_reports_log_size_check
    check (log is null or char_length(log) <= 1000000),
  constraint warmup_reports_screenshot_size_check
    check (screenshot is null or char_length(screenshot) <= 3000000),
  constraint warmup_reports_one_per_start
    unique (account_id, session_no, started_at)
);

comment on table public.warmup_reports is
  'One report per warmup the robot on the Air ran on a phone, finished or stopped (Garreth, 2026-10-09). Written only through POST /api/warmup-runner/reports. The summary is kept for good; log and screenshot are cleared after 30 days.';
comment on column public.warmup_reports.log is
  'The robot''s own JSON log lines (pino) for this warmup, newline-separated, keys scrubbed. Up to 1,000,000 characters. Cleared after 30 days.';
comment on column public.warmup_reports.screenshot is
  'Base64 PNG of the screen when the warmup stopped, or NULL. Up to 3,000,000 characters. Cleared after 30 days.';
comment on column public.warmup_reports.cleared_at is
  'When the 30-day clear-out emptied log and screenshot. NULL while they are kept, or when none was sent.';

-- The account's page reads one account's reports, newest first.
create index if not exists idx_warmup_reports_account_started
  on public.warmup_reports (account_id, started_at desc);

-- Service role only, as warmup_runs, devices, accounts and warmup_sessions are.
-- The revoke names anon and authenticated, because Supabase's default
-- privileges grant both by name and "revoke from public" leaves those grants
-- standing.
alter table public.warmup_reports enable row level security;
revoke all on table public.warmup_reports from anon, authenticated;
