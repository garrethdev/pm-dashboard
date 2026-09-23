-- PF-03: when an account moved off Cloud onto a real phone.
--
-- Written by the move in Settings (P10) in the same update that sets
-- delivery_mode and device_id, so the three always agree. It is the line the
-- before/after comparison (PF-10) splits an account's history on. Kept when an
-- account goes back to Cloud; a later move onto a phone overwrites it, and
-- dashboard_audit_log holds every move. A move from one phone to another is
-- not a move off Cloud and leaves it alone. Added beside what exists; nothing
-- altered.
alter table public.accounts add column if not exists moved_to_device_at timestamptz;

comment on column public.accounts.moved_to_device_at is
  'When this account last moved from Cloud (Geelark) onto a real phone (PF-03). NULL for an account that never has, including one created straight onto the Physical side. The before/after line for PF-10.';
