-- Automatic holds on an account (Garreth, 2026-11-25).
--
-- Two rules the dashboard now applies on its own, after a tweet about keeping
-- TikTok accounts "active on a real phone" was checked against our own data:
--
--   zero_views       A TikTok account's last three posts got 0 views. Posting
--                    is paused and its warmups go to Yurie (Manual). Once she
--                    has finished both warmups on 2 days, it is put back the
--                    way it was.
--   zero_views_again The same thing again after a zero_views hold ended. The
--                    account stays paused and the bell asks for it to be
--                    retired. Never ended by the dashboard.
--   robot_failing    An Automated account went 2 working days without a
--                    finished warmup. Its warmups go to Yurie (Manual) until
--                    she finishes both on one day, then back to Automated.
--
-- One row per hold. It remembers what the account was set to before, so the
-- restore puts back exactly that and not a guess. An open hold has no
-- ended_at; there is at most one per account.
--
-- outcome when it ends:
--   restored    the dashboard put the account back
--   overridden  somebody changed the account by hand while it was held
--               (unpaused it, or set it back to Automated), so the dashboard
--               stepped aside
--   retired     the account was retired while held
create table if not exists public.account_auto_holds (
  id                  bigint generated always as identity primary key,
  account_id          bigint      not null references public.accounts (id) on delete cascade,
  geelark_profile     text        not null,
  rule                text        not null
    check (rule in ('zero_views', 'zero_views_again', 'robot_failing')),
  started_at          timestamptz not null default now(),
  -- The New York date the hold began; hand warmups count from this day on.
  start_day           date        not null,
  -- Days with both warmups finished needed before it is put back.
  -- Null for zero_views_again, which the dashboard never ends.
  days_needed         smallint,
  prev_posting_paused boolean,
  prev_warmup_mode    text,
  -- What set it off, for the account's history and the bell.
  evidence            jsonb,
  ended_at            timestamptz,
  outcome             text
    check (outcome is null or outcome in ('restored', 'overridden', 'retired')),
  constraint account_auto_holds_end_pair
    check ((ended_at is null) = (outcome is null))
);

create unique index if not exists account_auto_holds_one_open
  on public.account_auto_holds (account_id)
  where ended_at is null;

create index if not exists account_auto_holds_account
  on public.account_auto_holds (account_id, started_at desc);

-- Only the dashboard's server (service role) reads or writes this.
revoke all on public.account_auto_holds from anon, authenticated;
grant select, insert, update on public.account_auto_holds to service_role;

comment on table public.account_auto_holds is
  'Automatic holds the dashboard puts on an account: zero_views (pause + hand warmups for 2 days), zero_views_again (stays paused, retire asked), robot_failing (hand warmups for 1 day). One open hold per account. Garreth, 2026-11-25.';
