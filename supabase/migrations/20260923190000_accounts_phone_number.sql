-- P14 (Garreth, 2026-09-23): phone numbers belong to accounts, not phones.
--
-- Each account signs up with its own number, and each number is its own
-- TextVerified rental, so the number lives on the account. Proxies stay on the
-- phone, because every account on a phone goes out through the same one.
--
-- This reverses P6's decision of the same morning, which put the numbers on
-- the phone (devices.phone_numbers). That column is left where it is and is no
-- longer read: it never held a real number, because no phone had been
-- registered yet. Added beside what exists; nothing altered.
alter table public.accounts add column if not exists phone_number text;

comment on column public.accounts.phone_number is
  'The account''s own phone number, the one it was signed up with (P14, Garreth 2026-09-23: numbers belong to accounts, proxies to phones). Replaces devices.phone_numbers, which is left in place and no longer read.';
