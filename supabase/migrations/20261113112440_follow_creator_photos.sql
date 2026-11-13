-- Profile photos on Creators to follow (Garreth, 2026-11-13: "i only see
-- initials").
--
-- The platforms' own photo links are signed and stop working within a day or
-- two, so each creator's photo is copied once into the private
-- `creator-photos` bucket and the page shows it through a signed link, the
-- way character photos are kept. `photo_path` is NULL when no photo was
-- copied; the card then shows her initial.
--
-- Private bucket, no policies for the public roles: written and signed with
-- the service key only.

alter table public.follow_creators
  add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('creator-photos', 'creator-photos', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
