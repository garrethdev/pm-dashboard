-- One stored preview frame per content type, for the Content Types page.
--
-- The preview cannot point at the live content URL. Roughly a third of the
-- lanes render into PRIVATE buckets (char3-asmr-question, char3-before-after,
-- grandma-before-after), so unified_posts holds a signed URL with an embedded
-- token that expires — a card built on those would show broken images within
-- days. Instead a frame is captured once, written to a public bucket, and the
-- stable URL is stored here.
--
-- source_content_id records which post the frame came from, so a stale preview
-- can be traced back and re-captured.

create table if not exists content_type_thumbnails (
  content_type text primary key
    references content_type_registry (content_type) on delete cascade,
  thumb_url text not null,
  source_content_id text,
  source_media_url text,
  captured_at timestamptz not null default now()
);

comment on table content_type_thumbnails is
  'Stored preview frame per content type. Captured once by scripts/capture-content-type-thumbs.mjs; the live media URLs are unsuitable because several buckets are private and issue expiring signed URLs.';
