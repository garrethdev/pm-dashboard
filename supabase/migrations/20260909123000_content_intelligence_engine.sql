-- Content intelligence engine (backend only)
--
-- Keeps references_unified as the canonical, append-only source catalog.
-- The tables below hold inspection output, reusable content structures,
-- copy drafts, and searchable chunks without changing the dashboard UI.
--
-- ---------------------------------------------------------------------------
-- READ THIS BEFORE REPLAYING. This file is the one exception to the rule in
-- README.md that every migration here is byte-identical to what ran.
--
-- These seven tables were applied by hand in the SQL editor on 2026-09-09 and
-- were never recorded in supabase_migrations.schema_migrations, so there is no
-- stored statement list to copy. The file was instead RECONSTRUCTED from the
-- live catalog on 2026-09-10 -- every table, column, check, foreign key, unique
-- constraint and index below was read back out of pg_constraint / pg_indexes /
-- information_schema and matches the database as it stands. It is accurate, but
-- it is a reconstruction rather than a replay, and its MD5 will not match
-- anything upstream.
--
-- It is committed because the alternative is worse: the live database was
-- carrying seven tables the repository had no record of at all.
--
-- STATUS AT TIME OF COMMIT: all seven tables exist and ALL SEVEN ARE EMPTY,
-- against 3,468 rows in references_unified. This migration is DDL only -- it
-- has no seed data and no backfill. Nothing writes to these tables yet; the
-- ingestion worker is V2 work. Creating the schema did not start the pipeline.
-- ---------------------------------------------------------------------------

create table if not exists public.reference_analysis (
  id uuid primary key default gen_random_uuid(),
  source_reference_id bigint not null unique references public.references_unified(id) on delete cascade,
  analysis_version text not null default 'v1',
  inspection_status text not null default 'pending'
    check (inspection_status in ('pending', 'complete', 'partial', 'blocked')),
  topic text,
  angle text,
  hook_family text,
  emotional_tone text,
  visual_style text,
  opener_treatment text,
  proof_placement text,
  cta_structure text,
  video_recreation_complexity text,
  target_audiences text[] not null default '{}',
  content_types text[] not null default '{}',
  observed jsonb not null default '{}'::jsonb,
  inferred jsonb not null default '{}'::jsonb,
  user_tags text[] not null default '{}',
  human_approved boolean not null default false,
  approved_at timestamptz,
  approved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((human_approved = false) or approved_at is not null)
);

create table if not exists public.reference_beats (
  id uuid primary key default gen_random_uuid(),
  source_reference_id bigint not null references public.references_unified(id) on delete cascade,
  position integer not null check (position > 0),
  kind text not null check (kind in ('slide', 'video_beat')),
  inspection_status text not null default 'pending'
    check (inspection_status in ('pending', 'complete', 'partial', 'blocked')),
  narrative_role text,
  visible_copy text,
  visual_description text,
  motion_treatment text,
  observed boolean not null default true,
  source_timestamp_ms integer check (source_timestamp_ms is null or source_timestamp_ms >= 0),
  source_end_timestamp_ms integer check (source_end_timestamp_ms is null or source_end_timestamp_ms >= source_timestamp_ms),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_reference_id, position)
);

create table if not exists public.angle_blueprints (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  format text not null check (format in ('carousel', 'slideshow_video', 'short_video', 'mixed')),
  default_slide_count integer check (default_slide_count is null or default_slide_count between 1 and 20),
  opener_treatment text,
  slide_roles jsonb not null default '[]'::jsonb,
  default_asset_direction jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  internal_test_status text not null default 'untested'
    check (internal_test_status in ('untested', 'tested', 'validated', 'rejected')),
  times_used integer not null default 0 check (times_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carousel_briefs (
  id uuid primary key default gen_random_uuid(),
  title text,
  topic text,
  target_audience text,
  format text not null default 'carousel'
    check (format in ('carousel', 'slideshow_video', 'short_video', 'mixed')),
  blueprint_id uuid references public.angle_blueprints(id) on delete set null,
  selected_reference_ids bigint[] not null default '{}',
  objective text,
  constraints jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'ready_for_copy', 'in_review', 'approved', 'archived')),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carousel_drafts (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.carousel_briefs(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  variant_label text,
  hook text,
  caption text,
  cta text,
  generation_metadata jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'approved', 'rejected', 'rendered', 'posted')),
  human_approved boolean not null default false,
  approved_at timestamptz,
  approved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brief_id, version),
  check ((human_approved = false) or approved_at is not null)
);

create table if not exists public.carousel_draft_slides (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.carousel_drafts(id) on delete cascade,
  position integer not null check (position > 0),
  narrative_role text,
  copy text,
  visual_brief text,
  asset_query text,
  source_reference_id bigint references public.references_unified(id) on delete set null,
  source_beat_id uuid references public.reference_beats(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'rendered', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (draft_id, position)
);

-- Search chunks deliberately have no vector column yet. This avoids locking
-- the project to an embedding provider or dimension before the embedding
-- worker is selected. Keyword search is live immediately; add a vector column
-- and index in a later, provider-specific migration.
create table if not exists public.search_chunks (
  id uuid primary key default gen_random_uuid(),
  source_reference_id bigint not null references public.references_unified(id) on delete cascade,
  beat_id uuid references public.reference_beats(id) on delete cascade,
  kind text not null check (kind in ('reference', 'beat', 'hook', 'transcript', 'ocr', 'analysis')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  search_document tsvector generated always as (to_tsvector('english', content)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_reference_id, beat_id, kind)
);

create index if not exists reference_analysis_topic_idx on public.reference_analysis (topic);
create index if not exists reference_analysis_hook_family_idx on public.reference_analysis (hook_family);
create index if not exists reference_analysis_audiences_gin_idx on public.reference_analysis using gin (target_audiences);
create index if not exists reference_analysis_content_types_gin_idx on public.reference_analysis using gin (content_types);
create index if not exists reference_analysis_tags_gin_idx on public.reference_analysis using gin (user_tags);
create index if not exists reference_beats_reference_position_idx on public.reference_beats (source_reference_id, position);
create index if not exists carousel_briefs_blueprint_idx on public.carousel_briefs (blueprint_id);
create index if not exists carousel_drafts_brief_status_idx on public.carousel_drafts (brief_id, status);
create index if not exists carousel_draft_slides_draft_position_idx on public.carousel_draft_slides (draft_id, position);
create index if not exists search_chunks_reference_idx on public.search_chunks (source_reference_id);
create index if not exists search_chunks_document_gin_idx on public.search_chunks using gin (search_document);
create index if not exists search_chunks_metadata_gin_idx on public.search_chunks using gin (metadata);
create unique index if not exists search_chunks_reference_level_unique_idx
  on public.search_chunks (source_reference_id, kind) where beat_id is null;
create unique index if not exists search_chunks_beat_level_unique_idx
  on public.search_chunks (source_reference_id, beat_id, kind) where beat_id is not null;

-- Backend workers use the service-role credential; no public client access is
-- introduced by this migration. Confirmed live 2026-09-10: RLS is on for all
-- seven and none of them carries a policy. An empty result from an ordinary
-- client role is therefore NOT evidence that a table is empty -- check counts
-- with a privileged read. Do not disable RLS or ship a service key to the
-- browser to make a query work.
alter table public.reference_analysis enable row level security;
alter table public.reference_beats enable row level security;
alter table public.angle_blueprints enable row level security;
alter table public.carousel_briefs enable row level security;
alter table public.carousel_drafts enable row level security;
alter table public.carousel_draft_slides enable row level security;
alter table public.search_chunks enable row level security;
