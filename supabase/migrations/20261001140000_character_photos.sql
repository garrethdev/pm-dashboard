-- A profile photo for each character (Garreth, 2026-10-01), uploaded from the
-- Characters sheet on the Accounts page.
--
-- The picture is the persona's face, so it is kept the way phone proof
-- screenshots are: a PRIVATE bucket written with the service key, shown only
-- through short-lived signed links. The browser shrinks it to a 256px square
-- JPEG before sending it, so 2 MB is generous.
--
-- photo_path is the path inside the bucket. Each upload gets a new path and
-- the old file is removed afterwards, so a cached copy of the old picture can
-- never stand in for the new one.

alter table public.characters
  add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('character-photos', 'character-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
