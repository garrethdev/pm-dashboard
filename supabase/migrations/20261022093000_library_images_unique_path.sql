-- Linked libraries become writable (Garreth, 2026-10-22). A picture that
-- lives in a linked folder gets a row here on first touch (retire, cover,
-- AI edit, Read with AI), found by its path, so a path may appear once per
-- library. Additive: the three rows on 2026-10-22 already obey it.
create unique index if not exists image_library_images_library_path
  on public.image_library_images (library_id, storage_path);
