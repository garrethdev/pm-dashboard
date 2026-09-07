-- Per-person "I have seen this" for the bell, stored server-side.
--
-- It lived in localStorage, which is keyed by scheme+host+port: the Local and
-- Network URLs `next dev` prints are two separate stores, so read state was
-- lost by opening the other one, by a port fallback to 3001, by clearing site
-- data, or by using a second machine. With more of the team about to use the
-- dashboard that is not a per-browser fact any more.
--
-- Keyed by email rather than auth.uid(): the app already identifies people by
-- allowlisted email (actingUserEmail(), dashboard_audit_log.user_email), and a
-- second identity scheme for one table would be the odd one out.
--
-- notification_key is the id the API already emits — "stored:15",
-- "warmup_fail:29997:a1b2c3d4" — so recomputed alerts that have no row of
-- their own can still be marked read.
--
-- No RLS, matching every other table here: only the service role touches these
-- (auth is enforced in the route handlers), and a lone RLS table would imply a
-- boundary that does not exist.
create table if not exists public.notification_reads (
  user_email       text        not null,
  notification_key text        not null,
  read_at          timestamptz not null default now(),
  primary key (user_email, notification_key)
);

-- The feed only ever asks "what has this person read", so the PK's leading
-- column already serves it. This index is for pruning by age.
create index if not exists idx_notification_reads_read_at
  on public.notification_reads (read_at);

comment on table public.notification_reads is
  'Per-user read state for the dashboard bell. One row per (person, notification). Prune rows older than ~90d; the notifications themselves age out of the feed after 7d.';
