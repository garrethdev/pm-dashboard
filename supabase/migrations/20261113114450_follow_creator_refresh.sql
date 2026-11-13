-- Monthly refresh of Creators to follow (Garreth, 2026-11-13: "set up the
-- monthly refresh").
--
-- The list was a snapshot. Once a month the dashboard now re-checks every
-- creator on it (followers, name, photo, still there, still public, still
-- posting) and takes off the ones that no longer fit, then finds new ones
-- when a platform's list is short. Two parts, each its own scheduled call, so
-- each fits the five-minute limit: `recheck`, then `topup`.
--
-- follow_creators gains:
--   checked_at       when the refresh last looked her up.
--   missed_checks    lookups in a row that found nothing. One empty answer can
--                    be ScrapeCreators having a bad moment; two in a row
--                    retires her.
--   retired_reason   why she came off the list, in words.
--   twin_checked_at  on a TikTok creator: when we last looked for her
--                    Instagram, so the same lookup is not paid for monthly.
--   source           'initial' (the 2026-11-13 list) or 'refresh'.
--
-- follow_creator_runs: one row per run, what it checked, took off, added and
-- spent, so a quiet month can be told apart from a broken one.
--
-- Service-role only like the rest: RLS on, no policies, public roles revoked.

alter table public.follow_creators
  add column if not exists checked_at      timestamptz,
  add column if not exists missed_checks   smallint not null default 0,
  add column if not exists retired_reason  text,
  add column if not exists twin_checked_at timestamptz,
  add column if not exists source          text not null default 'initial';

alter table public.follow_creators
  drop constraint if exists follow_creators_source_check;
alter table public.follow_creators
  add constraint follow_creators_source_check check (source in ('initial', 'refresh'));

create table if not exists public.follow_creator_runs (
  id               bigint generated always as identity primary key,
  part             text        not null,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  checked          integer     not null default 0,
  retired          integer     not null default 0,
  added_tiktok     integer     not null default 0,
  added_instagram  integer     not null default 0,
  credits          integer     not null default 0,
  -- True when it stopped before the five-minute limit with work left; the
  -- next month carries on where it left off (oldest checks first).
  stopped_early    boolean     not null default false,
  dry              boolean     not null default false,
  note             text,
  constraint follow_creator_runs_part_check check (part in ('recheck', 'topup'))
);

alter table public.follow_creator_runs enable row level security;
revoke all on public.follow_creator_runs from anon, authenticated;
