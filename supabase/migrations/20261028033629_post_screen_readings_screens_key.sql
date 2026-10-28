-- DA-06 fourth sitting (2026-10-27): the robot gave up waiting for the
-- dashboard's answer after 10 s and sent the same hand-off again, and every
-- send was stored (12 Instagram posts became 48 rows, 4 TikTok posts 8).
--
-- screens_key is a fingerprint of one post's screenshots (platform, account
-- and the bucket paths in order), written by src/server/screen-readings.ts
-- (screensKey). One fingerprint, one row: a resend finds the row already
-- there. Rows from before this have no key (NULL), and NULLs never clash.
alter table public.post_screen_readings add column if not exists screens_key text;

create unique index if not exists post_screen_readings_screens_key
  on public.post_screen_readings (screens_key);
