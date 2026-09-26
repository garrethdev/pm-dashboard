-- Carousel Generator foundation (DEV-01, plus the per-person Trends tables from
-- DEV-37, DEV-44, DEV-45 and the digest table from DEV-32).
--
-- Additive only: new tables, new columns on the three existing draft tables
-- (which held zero rows on 2026-09-25), widened status checks, one view and
-- the seed rows the generator needs on day one. Every new table has RLS on
-- with no policies, so only the service role can reach it. Nothing here
-- touches a lane table, the registry or the scheduler.

-- ── Templates ───────────────────────────────────────────────────────────
create table if not exists public.image_libraries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  -- The two seeded libraries read the existing banks through this and are
  -- read-only; a library made in the app has no source bank.
  source_bank text,
  read_only boolean not null default false,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.carousel_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  character text not null,
  content_type text references public.content_type_registry(content_type) on delete set null,
  lane jsonb,
  library_id uuid references public.image_libraries(id) on delete set null,
  source_reference_id bigint references public.references_unified(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carousel_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.carousel_templates(id) on delete cascade,
  version integer not null check (version > 0),
  template jsonb not null,
  active boolean not null default false,
  created_by text,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);
create unique index if not exists carousel_template_versions_one_active
  on public.carousel_template_versions (template_id) where active;

-- ── Writing (the Writing tab; the column keeps its old name) ────────────
create table if not exists public.carousel_lane_directions (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  version integer not null check (version > 0),
  direction text not null,
  cited_rule_keys text[] not null default '{}',
  active boolean not null default false,
  created_by text,
  created_at timestamptz not null default now(),
  unique (content_type, version)
);
create unique index if not exists carousel_lane_directions_one_active
  on public.carousel_lane_directions (content_type) where active;

-- ── Libraries: sets and images ──────────────────────────────────────────
create table if not exists public.image_library_sets (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null references public.image_libraries(id) on delete cascade,
  parent_id uuid references public.image_library_sets(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists image_library_sets_unique_name
  on public.image_library_sets (library_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

create table if not exists public.image_library_images (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null references public.image_libraries(id) on delete cascade,
  set_id uuid references public.image_library_sets(id) on delete set null,
  storage_path text not null,
  public_url text,
  is_cover boolean not null default false,
  status text not null default 'active' check (status in ('active', 'retired')),
  luminance numeric,
  details jsonb,
  prompt text,
  kept_by text,
  created_at timestamptz not null default now()
);

create or replace view public.v_image_assets as
  select l.id as library_id, 'glowup:' || b.id::text as image_id, b.public_url,
         false as is_cover, b.pool as set_name, b.category as subset_name, b.luminance, b.status
    from public.glowup_image_bank b
    join public.image_libraries l on l.source_bank = 'glowup_image_bank'
  union all
  select l.id, 'covered_eye:' || b.id::text, b.public_url,
         b.is_cover, b.pool, b.category, null::numeric, b.status
    from public.covered_eye_image_bank b
    join public.image_libraries l on l.source_bank = 'covered_eye_image_bank'
  union all
  select i.library_id, i.id::text, i.public_url, i.is_cover,
         case when p.id is null then s.name else p.name end,
         case when p.id is null then null else s.name end,
         i.luminance, i.status
    from public.image_library_images i
    left join public.image_library_sets s on s.id = i.set_id
    left join public.image_library_sets p on p.id = s.parent_id;

-- ── Batches (carousel_briefs) ───────────────────────────────────────────
alter table public.carousel_briefs
  add column if not exists content_type text references public.content_type_registry(content_type) on delete set null,
  add column if not exists rerun_of uuid references public.carousel_briefs(id) on delete set null,
  add column if not exists template_id uuid references public.carousel_templates(id) on delete set null,
  add column if not exists template_version integer,
  add column if not exists image_library_id uuid references public.image_libraries(id) on delete set null,
  add column if not exists writing_version_id uuid references public.carousel_lane_directions(id) on delete set null,
  add column if not exists batch_name text,
  add column if not exists requested integer,
  add column if not exists auto_mode boolean not null default false,
  add column if not exists mode text not null default 'manual' check (mode in ('manual', 'auto')),
  add column if not exists note text,
  add column if not exists per_batch_text jsonb not null default '{}'::jsonb,
  add column if not exists revision integer not null default 0,
  add column if not exists last_movement_at timestamptz,
  add column if not exists render_requested_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists finished_at timestamptz;
alter table public.carousel_briefs drop constraint if exists carousel_briefs_status_check;
alter table public.carousel_briefs add constraint carousel_briefs_status_check
  check (status in ('draft', 'ready_for_copy', 'in_review', 'approved', 'archived',
                    'generating', 'rendering', 'stopped', 'failed', 'finished'));
-- One running batch per lane: the database enforces plan §4.5, not the page.
create unique index if not exists carousel_briefs_one_running_per_lane
  on public.carousel_briefs (content_type) where status in ('generating', 'rendering');
create index if not exists carousel_briefs_content_type_created
  on public.carousel_briefs (content_type, created_at desc);

-- ── Decks (carousel_drafts) ─────────────────────────────────────────────
alter table public.carousel_drafts
  add column if not exists position integer,
  add column if not exists auto_tries integer not null default 1,
  add column if not exists flag_kind text,
  add column if not exists flag_reason text,
  add column if not exists copy jsonb not null default '{}'::jsonb,
  add column if not exists music text,
  add column if not exists music_status text,
  add column if not exists score numeric,
  add column if not exists lane_row_id text,
  add column if not exists render_manifest jsonb,
  add column if not exists render_claimed_at timestamptz,
  add column if not exists rendered_at timestamptz,
  add column if not exists last_error text,
  add column if not exists feedback text;
alter table public.carousel_drafts drop constraint if exists carousel_drafts_status_check;
alter table public.carousel_drafts add constraint carousel_drafts_status_check
  check (status in ('draft', 'in_review', 'approved', 'rejected', 'rendered', 'posted',
                    'pending', 'writing', 'written', 'flagged', 'render_queued', 'rendering',
                    'failed', 'dropped', 'discarded'));
create unique index if not exists carousel_drafts_brief_position_version
  on public.carousel_drafts (brief_id, position, version);

alter table public.carousel_draft_slides
  add column if not exists image_url text,
  add column if not exists image_ids jsonb,
  add column if not exists rendered_url text,
  add column if not exists box_copy jsonb;

-- ── Trends: what one person saved, voted and saw ────────────────────────
create table if not exists public.reference_favourites (
  id bigserial primary key,
  reference_id bigint not null references public.references_unified(id) on delete cascade,
  saved_by text not null,
  saved_at timestamptz not null default now(),
  unique (reference_id, saved_by)
);
create table if not exists public.reference_votes (
  id bigserial primary key,
  reference_id bigint not null references public.references_unified(id) on delete cascade,
  voted_by text not null,
  vote text not null check (vote in ('up', 'down')),
  query text,
  voted_at timestamptz not null default now(),
  unique (reference_id, voted_by)
);
create table if not exists public.reference_seen (
  id bigserial primary key,
  reference_id bigint not null references public.references_unified(id) on delete cascade,
  seen_by text not null,
  seen_at timestamptz not null default now(),
  unique (reference_id, seen_by)
);
create table if not exists public.study_digests (
  id bigserial primary key,
  received_at timestamptz not null default now(),
  subject text,
  body text,
  analysis jsonb,
  analysed_at timestamptz,
  carousel_count integer
);
alter table public.content_knowledge_base
  add column if not exists source_digest_id bigint references public.study_digests(id) on delete set null,
  add column if not exists approved_by text;

-- ── RLS on, no policies: service role only ──────────────────────────────
alter table public.image_libraries enable row level security;
alter table public.carousel_templates enable row level security;
alter table public.carousel_template_versions enable row level security;
alter table public.carousel_lane_directions enable row level security;
alter table public.image_library_sets enable row level security;
alter table public.image_library_images enable row level security;
alter table public.reference_favourites enable row level security;
alter table public.reference_votes enable row level security;
alter table public.reference_seen enable row level security;
alter table public.study_digests enable row level security;

-- ── Seed: the two bank libraries, their sets, the two templates ─────────
insert into public.image_libraries (slug, name, source_bank, read_only) values
  ('glowup-bank', 'Glow Up bank', 'glowup_image_bank', true),
  ('covered-eye-bank', 'Covered Eye bank', 'covered_eye_image_bank', true)
on conflict (slug) do nothing;

insert into public.image_library_sets (library_id, parent_id, name)
  select l.id, null, p.pool from public.image_libraries l
  cross join (select distinct pool from public.glowup_image_bank where pool is not null) p
  where l.slug = 'glowup-bank'
on conflict do nothing;
insert into public.image_library_sets (library_id, parent_id, name)
  select l.id, s.id, c.category from public.image_libraries l
  join public.image_library_sets s on s.library_id = l.id and s.parent_id is null
  join (select distinct pool, category from public.glowup_image_bank where category is not null) c on c.pool = s.name
  where l.slug = 'glowup-bank'
on conflict do nothing;
insert into public.image_library_sets (library_id, parent_id, name)
  select l.id, null, p.pool from public.image_libraries l
  cross join (select distinct pool from public.covered_eye_image_bank where pool is not null) p
  where l.slug = 'covered-eye-bank'
on conflict do nothing;
insert into public.image_library_sets (library_id, parent_id, name)
  select l.id, s.id, c.category from public.image_libraries l
  join public.image_library_sets s on s.library_id = l.id and s.parent_id is null
  join (select distinct pool, category from public.covered_eye_image_bank where category is not null) c on c.pool = s.name
  where l.slug = 'covered-eye-bank'
on conflict do nothing;

insert into public.carousel_templates (slug, name, character, content_type, library_id, status)
  select 'glowup', 'Glow Up', 'Character 2', 'glowup', l.id, 'active' from public.image_libraries l where l.slug = 'glowup-bank'
on conflict (slug) do nothing;
insert into public.carousel_templates (slug, name, character, content_type, library_id, status)
  select 'covered-eye', 'Covered Eye', 'Character 3', 'covered_eye_carousel', l.id, 'active' from public.image_libraries l where l.slug = 'covered-eye-bank'
on conflict (slug) do nothing;

insert into public.carousel_template_versions (template_id, version, template, active)
  select t.id, 1, $glowup${
  "schema": "pm.carousel-template/1",
  "slug": "glowup",
  "version": 1,
  "status": "active",
  "name": "Glow Up",
  "character": "Character 2",
  "content_type": "glowup",

  "canvas": { "width": 1080, "height": 1440, "background": "#0C0A09" },
  "output": { "format": "png", "bucket": "glowup-renders", "path": "{deck_key}/slide{n}.png" },
  "fit": { "mode": "cover", "position": "centre", "resample": "bicubic", "exif_transpose": false },
  "text_origin": "ascender",

  "fonts": {
    "caption": { "family": "Liberation Sans", "weight": 700, "file": "LiberationSans-Bold.ttf", "replaces": "Arial Bold" }
  },

  "text_styles": {
    "caption": {
      "font": "caption",
      "fill": "#FFFFFF",
      "stroke": { "width": 3, "color": "#000000" },
      "shadow": { "kind": "hard", "dx": 2, "dy": 3, "blur": 0, "color": "#000000", "opacity": 1, "stroked": false },
      "line_height": { "ratio": 1.2 },
      "wrap": { "rule": "greedy_whitespace", "width": 928.8 },
      "align": "center",
      "emoji": null
    },
    "datestamp": {
      "font": "caption",
      "fill": "#FFFFFF",
      "stroke": { "width": 3, "color": "#000000" },
      "shadow": { "kind": "hard", "dx": 2, "dy": 3, "blur": 0, "color": "#000000", "opacity": 1, "stroked": false },
      "line_height": { "px": 66 },
      "wrap": { "rule": "explicit_newlines" },
      "align": "right",
      "emoji": null
    }
  },

  "image_sources": {
    "bank": {
      "table": "glowup_image_bank",
      "filter": { "status": "active" },
      "tag": "pool, or pool:category",
      "luminance_column": "luminance"
    }
  },

  "slides": [
    {
      "n": 1,
      "layout": "quad",
      "cells": [
        { "x": 0, "y": 0, "w": 540, "h": 720 },
        { "x": 540, "y": 0, "w": 540, "h": 720 },
        { "x": 0, "y": 720, "w": 540, "h": 720 },
        { "x": 540, "y": 720, "w": 540, "h": 720 }
      ],
      "images": { "rule": "distinct", "pools": ["cover"] },
      "text": [
        { "role": "hook", "style": "caption", "size": 56, "anchor": { "kind": "block_centre_y", "at": 0.5 } }
      ]
    },
    {
      "n": 2,
      "layout": "single",
      "cells": [{ "x": 0, "y": 0, "w": 1080, "h": 1440 }],
      "images": { "rule": "one", "pools": ["cover"] },
      "text": [
        { "role": "before_line", "style": "caption", "size": 48, "anchor": { "kind": "block_centre_y", "at": 0.5 } }
      ]
    },
    {
      "n": 3,
      "layout": "quad",
      "cells": [
        { "x": 0, "y": 0, "w": 540, "h": 720 },
        { "x": 540, "y": 0, "w": 540, "h": 720 },
        { "x": 0, "y": 720, "w": 540, "h": 720 },
        { "x": 540, "y": 720, "w": 540, "h": 720 }
      ],
      "images": {
        "rule": "diagonal_pairs",
        "body_pools": ["feature:face"],
        "evidence_pools": ["evidence:water"]
      },
      "text": [
        { "role": "tip_face", "style": "caption", "size": 50, "anchor": { "kind": "block_centre_y", "at": 0.5 } }
      ]
    },
    {
      "n": 4,
      "layout": "quad",
      "cells": [
        { "x": 0, "y": 0, "w": 540, "h": 720 },
        { "x": 540, "y": 0, "w": 540, "h": 720 },
        { "x": 0, "y": 720, "w": 540, "h": 720 },
        { "x": 540, "y": 720, "w": 540, "h": 720 }
      ],
      "images": {
        "rule": "diagonal_pairs",
        "body_pools": ["feature:stomach", "feature:waist", "body:abs"],
        "evidence_pools": ["evidence:protein", "evidence:eggs", "evidence:greens", "evidence:meal_prep"]
      },
      "text": [
        { "role": "tip_stomach", "style": "caption", "size": 48, "anchor": { "kind": "block_centre_y", "at": 0.5 } }
      ]
    },
    {
      "n": 5,
      "layout": "quiz",
      "cells": [{ "x": 0, "y": 0, "w": 1080, "h": 1440 }],
      "images": { "rule": "one", "pools": ["quiz"] },
      "text": [
        { "role": "quiz_line", "style": "caption", "size": 44, "anchor": { "kind": "block_centre_y", "at": 0.13 } },
        { "role": "quiz_cta", "style": "caption", "size": 40, "anchor": { "kind": "block_centre_y", "at": 0.9 } }
      ]
    },
    {
      "n": 6,
      "layout": "quad",
      "cells": [
        { "x": 0, "y": 0, "w": 540, "h": 720 },
        { "x": 540, "y": 0, "w": 540, "h": 720 },
        { "x": 0, "y": 720, "w": 540, "h": 720 },
        { "x": 540, "y": 720, "w": 540, "h": 720 }
      ],
      "images": {
        "rule": "diagonal_pairs",
        "body_pools": ["feature:waist", "body:abs", "body:gym"],
        "evidence_pools": ["evidence:steps", "evidence:measure"]
      },
      "text": [
        { "role": "tip_waist", "style": "caption", "size": 50, "anchor": { "kind": "block_centre_y", "at": 0.5 } }
      ]
    },
    {
      "n": 7,
      "layout": "single",
      "cells": [{ "x": 0, "y": 0, "w": 1080, "h": 1440 }],
      "images": { "rule": "one", "pools": ["after", "body:gym"] },
      "text": [
        { "role": "after_line", "style": "caption", "size": 42, "anchor": { "kind": "block_centre_y", "at": 0.5 } },
        { "role": "datestamp", "style": "datestamp", "size": 60, "anchor": { "kind": "stack_right", "right": 46, "top": 40 } }
      ]
    }
  ],

  "image_rules": {
    "distinct": "One image per cell, drawn without replacement from the pools. If the pools run out, repeat rather than leave a cell empty.",
    "one": "One image drawn from the union of the pools.",
    "diagonal_pairs": {
      "composition": "two body cells and two evidence cells",
      "orders": [
        ["body", "evidence", "evidence", "body"],
        ["evidence", "body", "body", "evidence"]
      ],
      "order_choice": "either order with probability 0.5, so each matching pair sits on a diagonal",
      "luminance_tolerance": 40,
      "pair_rule": "Pick a random anchor; keep candidates within the tolerance; if none, take the nearest. Fewer than two candidates duplicates the one available. For the evidence pair, prefer a different category among in-tolerance candidates. Brightness is the hard rule, category variety the tiebreak."
    },
    "seed": "Any deterministic PRNG seeded from deck_key. Stability comes from persisting the chosen URLs in render_manifest, not from the seed."
  },

  "copy_contract": [
    { "role": "hook", "columns": ["hook", "hook_text"], "writer": "ai", "max_chars": 65, "observed": { "p50": 32, "p95": 54, "max": 65 } },
    {
      "role": "before_line", "columns": ["before_line"], "writer": "per_batch",
      "fixed": "4 years stuck. i didn't give up a single thing.",
      "max_chars": 100, "observed": { "p50": 47, "p95": 76, "max": 100 }
    },
    { "role": "tip_face", "columns": ["tip_face"], "writer": "ai", "max_chars": 71, "observed": { "p50": 45, "p95": 57, "max": 71 } },
    { "role": "tip_stomach", "columns": ["tip_stomach"], "writer": "ai", "max_chars": 61, "observed": { "p50": 44, "p95": 58, "max": 61 } },
    { "role": "quiz_line", "columns": ["quiz_line"], "writer": "ai", "max_chars": 109, "observed": { "p50": 101, "p95": 101, "max": 109 } },
    { "role": "tip_waist", "columns": ["tip_waist"], "writer": "ai", "max_chars": 68, "observed": { "p50": 42, "p95": 63, "max": 68 } },
    {
      "role": "after_line", "columns": ["after_line"], "writer": "fixed",
      "decided": "Garreth, 2026-09-14: always the fixed closing line, as on every posted deck; the column holds what was painted",
      "fixed": "honestly the peptide was the cheat code. it helped me keep the weight off. But I wouldn't change a thing..",
      "max_chars": 113, "observed": { "p50": 106, "p95": 106, "max": 113 }
    },
    { "role": "quiz_cta", "columns": [], "writer": "fixed", "fixed": "comment the word QUIZ and I will send you the link" },
    { "role": "datestamp", "columns": [], "writer": "per_batch", "format": "{Month}\\n{YYYY}", "stored_in": "render_manifest" },
    { "role": "caption", "columns": ["caption"], "writer": "ai", "painted": false, "max_chars": 342, "observed": { "p50": 302, "p95": 331, "max": 342 } }
  ],

  "not_painted": {
    "transition_line": "Filled on all 102 manifest_v2 decks, drawn on no slide.",
    "slide_1..slide_6": "Empty on all 102 manifest_v2 decks. The painted copy lives in the named columns above."
  },

  "directions": {
    "copy": null,
    "caption": null,
    "image": null,
    "carried_from": "The Glow-Up Writer / Hook Maker n8n prompt and the Caption Maker's voice rules, copied in during Phase 2."
  },

  "music": {
    "column": "music",
    "writer": "ai, any track available on TikTok or Instagram (Garreth, 2026-09-14)",
    "if_missing": "Before the lane row is written, find a TikTok video and an Instagram reel that use the track, confirmed from each post's own sound data, checking up to 5 posts per platform, and add it to music_library. If none matches, flag the deck for a person and do not hand it off. Flow F14 in docs/CAROUSEL-GENERATOR-FLOWS.md.",
    "must_match": "An active music_library track, written as '{artist} - {title}'. The Posting Agent lower-cases and collapses spaces before matching.",
    "why": "The registry marks carousels needs_music; the Posting Agent skips a row whose music label is not found."
  },

  "lane": {
    "table": "glowup_decks",
    "id": { "column": "carousel_id", "format": "GU-{n}", "highest_on_2026_09_14": 153 },
    "render_key": { "column": "deck_key", "format": "glowup-{epoch_ms}-{k}" },
    "batch": { "column": "batch", "live_examples": ["glowmax-reframe-2026-07-31-A", "glowmax-ydiw-2026-07-31-A"] },
    "set_on_materialise": {
      "pillar": "glowup_carousel",
      "character": "char2",
      "render_set": "glowup_v1",
      "render_status": "queued",
      "gatekeep_status": "pending",
      "approved": false,
      "scheduler_ready": false
    },
    "manifest": { "column": "render_manifest", "model": "manifest_v2" },
    "claim": { "where": { "render_status": "queued" }, "set": { "render_status": "rendering" }, "key": "deck_key" },
    "on_rendered": {
      "url_columns": "slide_{n}_url, for the slides painted only",
      "set": { "render_status": "rendered" },
      "timestamp_column": "rendered_at"
    },
    "sweeper": { "from": "rendering", "to": "queued", "after_minutes": 10 }
  },

  "provenance": {
    "imported_from": "paint_manifest.py and deck_rules.json (version 2026-07-31), glowup.zip, 2026-09-14",
    "checked_against": ["docs/CAROUSEL-RENDERER-PORT-SPEC.md §B.2", "all 102 manifest_v2 rows in glowup_decks, 2026-09-14"],
    "source_reference_id": null
  }
}$glowup$::jsonb, true from public.carousel_templates t where t.slug = 'glowup'
on conflict (template_id, version) do nothing;
insert into public.carousel_template_versions (template_id, version, template, active)
  select t.id, 1, $coveredeye${
  "schema": "pm.carousel-template/1",
  "slug": "covered-eye",
  "version": 1,
  "status": "active",
  "name": "Covered Eye",
  "character": "Character 3",
  "content_type": "covered_eye_carousel",

  "canvas": { "width": 1080, "height": 1920, "background": null },
  "output": { "format": "jpeg", "quality": 92, "bucket": "covered-eye-images", "path": "renders/{carousel_id}/slide_{nn}.jpg" },
  "fit": { "mode": "cover", "position": "centre", "resample": "lanczos", "exif_transpose": true },
  "text_origin": "ascender",

  "fonts": {
    "caption": { "family": "Inter", "weight": 700, "file": "Inter-Bold.ttf", "replaces": "SF Pro (variable, Bold instance)" },
    "emoji": { "family": "Noto Color Emoji", "file": "NotoColorEmoji.ttf", "replaces": "Apple Color Emoji" }
  },

  "text_styles": {
    "caption": {
      "font": "caption",
      "fill": "#FFFFFF",
      "stroke": { "width": 7, "color": "#000000" },
      "shadow": { "kind": "soft", "dx": 5, "dy": 5, "blur": 19, "color": "#000000", "opacity": 0.6667, "stroked": false },
      "line_height": { "px": 80 },
      "wrap": { "rule": "greedy_whitespace", "width": 952 },
      "align": "center",
      "emoji": {
        "font": "emoji",
        "height_ratio": 1.0,
        "advance_extra": 6,
        "x_offset": 3,
        "y_offset_ratio": 0.3,
        "shadow_y_offset_ratio": 0,
        "strip": ["U+FE0F"]
      }
    }
  },

  "image_sources": {
    "bank": {
      "table": "covered_eye_image_bank",
      "filter": { "status": "active" },
      "tag": "pool",
      "cover_column": "is_cover"
    }
  },

  "slides": [
    {
      "n": 1,
      "layout": "single",
      "cells": [{ "x": 0, "y": 0, "w": 1080, "h": 1920 }],
      "images": { "rule": "one", "pools": ["slide1_selfie"], "prefer_cover": true },
      "text": [
        {
          "role": "slide_1", "style": "caption", "size": 72,
          "anchor": { "kind": "top", "y": 105 },
          "quote": { "when_hook_type": ["Jealous Friend"], "open": "“", "close": "”" }
        }
      ]
    },
    {
      "n": 2,
      "layout": "single",
      "cells": [{ "x": 0, "y": 0, "w": 1080, "h": 1920 }],
      "images": { "rule": "one", "pools": ["food"], "distinct_group": "food" },
      "text": [{ "role": "slide_2", "style": "caption", "size": 72, "anchor": { "kind": "top", "y": 105 } }]
    },
    {
      "n": 3,
      "layout": "single",
      "cells": [{ "x": 0, "y": 0, "w": 1080, "h": 1920 }],
      "images": { "rule": "one", "pools": ["food"], "distinct_group": "food" },
      "text": [{ "role": "slide_3", "style": "caption", "size": 72, "anchor": { "kind": "top", "y": 105 } }]
    },
    {
      "n": 4,
      "layout": "single",
      "cells": [{ "x": 0, "y": 0, "w": 1080, "h": 1920 }],
      "images": { "rule": "one", "pools": ["food"], "distinct_group": "food" },
      "text": [{ "role": "slide_4", "style": "caption", "size": 72, "anchor": { "kind": "top", "y": 105 } }]
    },
    {
      "n": 5,
      "layout": "single",
      "cells": [{ "x": 0, "y": 0, "w": 1080, "h": 1920 }],
      "images": { "rule": "one", "pools": ["product"] },
      "text": [
        {
          "role": "slide_5", "style": "caption", "size": 65,
          "line_height": { "px": 72 },
          "stroke": { "width": 6, "color": "#000000" },
          "anchor": { "kind": "bottom", "margin": 105 }
        }
      ]
    },
    {
      "n": 6,
      "layout": "single",
      "cells": [{ "x": 0, "y": 0, "w": 1080, "h": 1920 }],
      "images": { "rule": "one", "pools": ["body"] },
      "text": [{ "role": "slide_6", "style": "caption", "size": 72, "anchor": { "kind": "top", "y": 105 } }]
    }
  ],

  "image_rules": {
    "one": "One image drawn from the pools.",
    "prefer_cover": "Restrict to is_cover = true; if that leaves nothing, fall back to the whole pool.",
    "distinct_group": "Slides sharing a group never repeat an image within one deck, unless the pool is exhausted.",
    "seed": "Any deterministic PRNG seeded from carousel_id. Chosen URLs are persisted before painting.",
    "numbering": "Key everything off the original slide number. A slide with no image is an error on the card, never a silent renumber."
  },

  "copy_contract": [
    {
      "role": "slide_1", "beat": "hook", "columns": ["slide_1", "hook_text"], "writer": "ai",
      "decided": "Garreth, 2026-09-14: slide 1 is the hook, so hook_text always holds the same text",
      "max_chars": 86, "observed": { "p50": 50, "p95": 69, "max": 86 }
    },
    { "role": "slide_2", "beat": "judgment", "columns": ["slide_2"], "writer": "ai", "max_chars": 107, "observed": { "p50": 44, "p95": 87, "max": 107 } },
    { "role": "slide_3", "beat": "truth", "columns": ["slide_3"], "writer": "ai", "max_chars": 187, "observed": { "p50": 39, "p95": 135, "max": 187 } },
    { "role": "slide_4", "beat": "confession", "columns": ["slide_4"], "writer": "ai", "max_chars": 170, "observed": { "p50": 47, "p95": 129, "max": 170 } },
    { "role": "slide_5", "beat": "discovery, brand named once", "columns": ["slide_5"], "writer": "ai", "max_chars": 226, "observed": { "p50": 62, "p95": 196, "max": 226 } },
    { "role": "slide_6", "beat": "resolution", "columns": ["slide_6"], "writer": "ai", "max_chars": 128, "observed": { "p50": 31, "p95": 81, "max": 128 } },
    {
      "role": "hook_type", "columns": ["hook_type"], "writer": "ai", "painted": false,
      "values": ["Validation", "Question", "Jealous Friend", "POV", "Open Loop", "Reframe", "What I Eat"]
    },
    { "role": "peptide_angle", "columns": ["peptide_angle"], "writer": "ai", "painted": false },
    { "role": "caption", "columns": ["caption"], "writer": "ai", "painted": false, "max_chars": 1446, "observed": { "p50": 298, "p95": 1146, "max": 1446 } }
  ],

  "directions": {
    "copy": null,
    "caption": null,
    "image": null,
    "carried_from": "The Covered Eye n8n scriptwriter's five-beat prompt and the Caption Maker's voice rules, copied in during Phase 2."
  },

  "music": {
    "column": "music",
    "writer": "ai, any track available on TikTok or Instagram (Garreth, 2026-09-14)",
    "if_missing": "Before the lane row is written, find a TikTok video and an Instagram reel that use the track, confirmed from each post's own sound data, checking up to 5 posts per platform, and add it to music_library. If none matches, flag the deck for a person and do not hand it off. Flow F14 in docs/CAROUSEL-GENERATOR-FLOWS.md.",
    "must_match": "An active music_library track, written as '{artist} - {title}'. The Posting Agent lower-cases and collapses spaces before matching.",
    "why": "The registry marks carousels needs_music; the Posting Agent skips a row whose music label is not found."
  },

  "lane": {
    "table": "covered_eye_carousel",
    "id": { "column": "carousel_id", "format": "CE-{n}", "highest_on_2026_09_14": 240 },
    "batch": { "column": "batch", "live_examples": ["covered-eye-selflove-q-2026-08-13"] },
    "set_on_materialise": {
      "pillar": "covered_eye",
      "status": "scripted",
      "gatekeep_status": "pending",
      "approved": false,
      "scheduler_ready": false
    },
    "claim": {
      "where": { "status": "scripted", "rendered_at": null },
      "set": { "status": "rendering" },
      "key": "carousel_id"
    },
    "on_rendered": {
      "url_columns": "slide_{n}_url, always pointing at the captioned render",
      "set": { "status": "rendered" },
      "timestamp_column": "rendered_at"
    },
    "sweeper": { "from": "rendering", "to": "scripted", "after_minutes": 10 }
  },

  "provenance": {
    "imported_from": "covered_eye_carousel.py, covered_eye.zip, 2026-09-14",
    "checked_against": ["docs/CAROUSEL-RENDERER-PORT-SPEC.md §B.1", "covered_eye_carousel rows and covered_eye_image_bank, 2026-09-14"],
    "source_reference_id": null
  }
}$coveredeye$::jsonb, true from public.carousel_templates t where t.slug = 'covered-eye'
on conflict (template_id, version) do nothing;

-- Applied as a second step on 2026-09-25 (carousel_generator_assets_urls):
-- glowup_image_bank rows carry no public_url, only a storage path in the public
-- glowup-image-bank bucket, so the assets view builds the URL itself. Also a
-- column for the painter's preview markup on a slide.
create or replace view public.v_image_assets as
  select l.id as library_id, 'glowup:' || b.id::text as image_id,
         coalesce(b.public_url, 'https://qlcmgxgwpzmiebzxflai.supabase.co/storage/v1/object/public/glowup-image-bank/' || b.storage_path) as public_url,
         false as is_cover, b.pool as set_name, b.category as subset_name, b.luminance, b.status
    from public.glowup_image_bank b
    join public.image_libraries l on l.source_bank = 'glowup_image_bank'
  union all
  select l.id, 'covered_eye:' || b.id::text,
         coalesce(b.public_url, 'https://qlcmgxgwpzmiebzxflai.supabase.co/storage/v1/object/public/covered-eye-images/' || b.storage_path),
         b.is_cover, b.pool, b.category, null::numeric, b.status
    from public.covered_eye_image_bank b
    join public.image_libraries l on l.source_bank = 'covered_eye_image_bank'
  union all
  select i.library_id, i.id::text, i.public_url, i.is_cover,
         case when p.id is null then s.name else p.name end,
         case when p.id is null then null else s.name end,
         i.luminance, i.status
    from public.image_library_images i
    left join public.image_library_sets s on s.id = i.set_id
    left join public.image_library_sets p on p.id = s.parent_id;
alter table public.carousel_draft_slides add column if not exists rendered_svg text;

-- Applied as a third step on 2026-09-25 (carousel_drafts_version_per_position):
-- a deck's version counts per position, not per batch, so the old unique on
-- (brief_id, version) had to go. The three-column unique above stays.
alter table public.carousel_drafts drop constraint if exists carousel_drafts_brief_id_version_key;
