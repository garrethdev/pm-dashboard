-- The degrade pass on AI-made library images (Degrade Pass Wiring Handover,
-- Garreth, 2026-10-12). An AI edit's picture is re-made as a phone-camera
-- JPEG before it is stored; these two columns record that it was, and the
-- seed it used, so a re-run reproduces the same file and a degraded picture
-- is never degraded twice.
--
-- Additive: every existing row reads degraded = false (there were none on
-- 2026-10-12), and the app names these columns only for a degraded image.
alter table public.image_library_images
  add column if not exists degraded boolean not null default false,
  add column if not exists degrade_seed text;
