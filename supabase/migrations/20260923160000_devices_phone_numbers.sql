-- P6 (Garreth, 2026-09-23): a real phone records the numbers of the accounts on
-- it, so Proxies & numbers can match each one to its TextVerified rental. Until
-- now the only copy of an account's number was on its Geelark phone, and it
-- vanished when that phone was deleted.
--
-- Plain text, one number per line, the way the form holds it: the app parses
-- it, and nothing else reads it. Added beside what exists; nothing altered.
alter table public.devices add column if not exists phone_numbers text;

comment on column public.devices.phone_numbers is
  'Numbers of the accounts on this phone, one per line (P6, 2026-09-23).';
