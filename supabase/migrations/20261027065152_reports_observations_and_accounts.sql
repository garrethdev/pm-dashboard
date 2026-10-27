-- Reports: issues AND observations, tied to accounts and posts (Garreth,
-- Czedrick and Yurie, on a call, 2026-10-27).
--
-- The floating button used to send issues only. It now sends a report of one
-- of two kinds:
--
--   issue        something is broken and someone has to fix it. Has a status
--                (open / in_progress / fixed), as before.
--   observation  something someone noticed, e.g. "this manual-warmup account
--                is doing better than the others". Not a job, so no status.
--
-- A report can name the accounts it is about, and for each account one of its
-- posts. Those live in issue_accounts, one row per account. The point is that
-- a later analysis (a person or an AI) can read what the team saw next to the
-- numbers: v_reports below is the one place to read it from.
--
-- The table keeps the name `issues` so the live site, which reads it by that
-- name, kept working while this was built. Every row before this migration is
-- an issue, which is what the default gives it.

alter table public.issues
  add column if not exists kind text not null default 'issue';

alter table public.issues
  add constraint issues_kind_check check (kind in ('issue', 'observation'));

-- An observation has no status. The default stays 'open', so an insert that
-- names no kind is an open issue, exactly as before; an observation must send
-- status null, and this check refuses one that does not.
alter table public.issues alter column status drop not null;
alter table public.issues
  add constraint issues_status_by_kind check ((kind = 'issue') = (status is not null));

comment on table public.issues is
  'Reports sent from the dashboard''s floating button: issues (broken, has a status) and observations (noticed, no status). Accounts and posts a report is about are in issue_accounts; read both together through v_reports.';
comment on column public.issues.kind is 'issue = something broken to fix; observation = something noticed, no status.';
comment on column public.issues.status is 'open / in_progress / fixed for an issue; always null for an observation.';
comment on column public.issues.reported_by is 'Signed-in email of the person who sent it.';
comment on column public.issues.page_path is 'The dashboard page the reporter was on when they pressed the button.';

-- One row per account a report names. The account's Profile, handle and
-- platform are copied in at the moment of the report, so the row still reads
-- correctly if the account is later renamed or deleted (account_id then goes
-- null; the copy stays). The post is copied the same way: posts live in three
-- per-platform tables, so there is no single table to point at.
create table if not exists public.issue_accounts (
  id bigint generated always as identity primary key,
  issue_id bigint not null references public.issues (id) on delete cascade,
  account_id bigint references public.accounts (id) on delete set null,
  geelark_profile text not null,
  username text,
  platform text not null,
  post_id text,
  post_url text,
  posted_at timestamptz,
  unique (issue_id, geelark_profile),
  check (post_id is not null or (post_url is null and posted_at is null))
);

create index if not exists issue_accounts_account_id_idx on public.issue_accounts (account_id);

comment on table public.issue_accounts is
  'The accounts (and optionally one post per account) a report in issues is about. Profile, handle, platform and the post are copied at report time.';
comment on column public.issue_accounts.post_id is
  'The post''s id in the platform''s performance table (tt_post_performance, post_performance or fb_post_performance, by platform); null when the report names the account only.';

alter table public.issue_accounts enable row level security;
revoke all on public.issue_accounts from public, anon, authenticated;
grant all on public.issue_accounts to service_role;

-- Every report with its accounts, newest first: what the Reports page reads,
-- and the place to start for any later analysis. security_invoker, so the
-- view is no wider than the tables under it.
create or replace view public.v_reports with (security_invoker = true) as
select
  i.id,
  i.kind,
  i.reported_at,
  i.reported_by,
  i.category,
  i.description,
  i.status,
  i.status_changed_at,
  i.page_path,
  i.screenshot_path,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'profile', a.geelark_profile,
        'username', a.username,
        'platform', a.platform,
        'post_id', a.post_id,
        'post_url', a.post_url,
        'posted_at', a.posted_at
      )
      order by a.id
    ) filter (where a.id is not null),
    '[]'::jsonb
  ) as accounts
from public.issues i
left join public.issue_accounts a on a.issue_id = i.id
group by i.id;

comment on view public.v_reports is
  'Every report (issue or observation) with the accounts and posts it names, as a JSON array. Read this for analysis.';

revoke all on public.v_reports from public, anon, authenticated;
grant select on public.v_reports to service_role;
