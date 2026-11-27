-- Robot updates (2026-11-27, branch RPA-Patch-Feature): the warmup robot's
-- update packages, kept in the dashboard so Yurie downloads them from
-- Settings -> Robot updates instead of being sent them on WhatsApp with a
-- Word guide. On 2026-11-27 the Air was found still on the 26 November
-- version after the 27 November one had been sent.
--
-- One row per package. Claude publishes them (scripts/publish-robot-update.mjs,
-- with Garreth's or Czedrick's go): it builds the package from
-- garrethdev/warmup-runner main, uploads it to the private bucket below and
-- writes this row. The newest published_at is the version the Air should run.
create table if not exists public.robot_updates (
  -- The package's name without .tar.gz, exactly what "Update the robot"
  -- writes to INSTALLED-VERSION and every warmup report starts with.
  version       text         primary key
                check (version ~ '^warmup-runner-\d{4}-\d{2}-\d{2}-[0-9a-f]{7,40}$'),
  -- The warmup-runner commit it was built from (full hash).
  commit_sha    text         not null check (commit_sha ~ '^[0-9a-f]{40}$'),
  -- A few words for the list, e.g. 'Friday analytics in robot hours'.
  label         text         not null check (length(label) between 1 and 80),
  -- What changed, in plain words for Yurie.
  what_changed  text         not null,
  -- The steps this version needs on top of the usual ones, done while the
  -- robot is stopped: [{"do": "...", "expect": "..."}]. Empty for most.
  extra_steps   jsonb        not null default '[]'::jsonb check (jsonb_typeof(extra_steps) = 'array'),
  -- Anything she does differently afterwards. Optional.
  afterwards    text,
  -- The file in the robot-updates bucket, its size and SHA-256.
  file_path     text         not null unique,
  file_bytes    bigint       not null check (file_bytes > 0),
  sha256        text         not null check (sha256 ~ '^[0-9a-f]{64}$'),
  published_at  timestamptz  not null default now(),
  -- Who gave the go ('garreth' or 'czedrick').
  published_by  text         not null
);

create index if not exists robot_updates_newest_idx
  on public.robot_updates (published_at desc);

alter table public.robot_updates enable row level security;
-- Named, because "revoke from public" leaves anon and authenticated granted.
revoke all on table public.robot_updates from public, anon, authenticated;

comment on table public.robot_updates is
  'Warmup robot update packages, newest published_at = what the Air should run. '
  'Files in the private robot-updates bucket. Written by scripts/publish-robot-update.mjs '
  'with the service key only.';

-- Private bucket for the packages (~64 MB each). 100 MB cap, the same as
-- video-library. The app hands out short-lived download links.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('robot-updates', 'robot-updates', false, 104857600,
        array['application/gzip', 'application/x-gzip', 'application/octet-stream'])
on conflict (id) do nothing;

-- Which robot version wrote each warmup report: the "version" field of the
-- report's first log line (warmup-runner src/session.ts, since 2026-11-25).
-- Its own column because the log is emptied after 30 days, and so the newest
-- version is one small read rather than a megabyte of log.
alter table public.warmup_reports add column if not exists robot_version text;

-- Filled by the database on insert, so it works for every report whatever
-- version of the dashboard received it.
create or replace function public.warmup_reports_set_robot_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.robot_version is null and new.log is not null then
    new.robot_version := (regexp_match(left(new.log, 4000), '"version":"([^"]+)"'))[1];
  end if;
  return new;
end;
$$;
revoke all on function public.warmup_reports_set_robot_version() from public, anon, authenticated;

drop trigger if exists trg_warmup_reports_robot_version on public.warmup_reports;
create trigger trg_warmup_reports_robot_version
  before insert on public.warmup_reports
  for each row execute function public.warmup_reports_set_robot_version();

create index if not exists warmup_reports_robot_version_idx
  on public.warmup_reports (started_at desc)
  where robot_version is not null;
