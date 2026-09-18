-- PF-01: which hands post for this account.
--
-- The fleet is moving off Geelark cloud phones onto real iPhones (decided
-- 2026-09-16, Garreth). The whole migration hangs on this one column so
-- accounts still on Geelark keep working untouched and move one at a time:
-- 'geelark' = the Posting Agent sends the post to a cloud phone (today's path),
-- 'manual'  = a person posts it from a real phone.
--
-- Default 'geelark' so every existing row, and every row n8n provisioning
-- inserts without naming the column, behaves exactly as before.
alter table public.accounts
  add column if not exists delivery_mode text not null default 'geelark';

alter table public.accounts
  drop constraint if exists accounts_delivery_mode_check;
alter table public.accounts
  add constraint accounts_delivery_mode_check
  check (delivery_mode in ('geelark', 'manual'));

comment on column public.accounts.delivery_mode is
  'Who delivers posts: geelark (cloud phone, Posting Agent) or manual (a person on a real iPhone). Flipped from the dashboard, audit-logged as delivery_mode_change.';
