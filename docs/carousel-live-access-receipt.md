# Carousel live access receipt — September 26, 2026

Read-only investigation during the 04:22 UTC implementation heartbeat. This is
access/schema-discovery evidence, not end-to-end completion or a SQL catalog audit.

## Verified

- The previously supplied Vercel access credential can read project `pm-dashboard`.
- Existing development-scoped Supabase configuration can be retrieved and used
  in memory. No credential values were saved in source, receipts or environment files.
- Zero-row GET probes returned HTTP 200 for `carousel_briefs`, `carousel_drafts`,
  `carousel_draft_slides`, `content_batches` and `content_type_registry`.
- Supabase REST OpenAPI metadata returned HTTP 200. Its definitions already expose:
  `carousel_templates`, `carousel_template_versions`, `carousel_lane_directions`,
  `image_libraries`, `v_image_assets` and `carousel_render_runs`.
- `carousel_briefs` already includes template/version, image library, Writing
  version, requested count, Auto mode, mode, revision and movement/approval timestamps.
- `carousel_drafts` already includes position, Auto tries, copy, music, score,
  flag fields, lane row, render manifest/claim timestamps, feedback and last error.
- Template versions expose `template_id`, `version`, `template` and `active`.
  Lane directions expose `content_type`, `version`, `direction`, `cited_rule_keys`
  and `active`. Libraries expose `slug`, `name`, `source_bank` and `read_only`.
- `reference_format_evaluations` exposes `source_reference_id`, `story_structure`,
  `evaluated_at` and other assessment fields. A future detail fallback can be based
  on these verified fields instead of guessing names.
- The returned REST schema lists `search_carousel_library` and
  `save_carousel_visual_review` among carousel/batch/render/lane/template RPC names.
  No generation transaction RPC was advertised by that filtered inventory.

## Not established

REST visibility does not establish uniqueness, indexes, constraints, RLS, grants,
function implementation, migration history or the absence of non-exposed functions.
The development configuration may point at a shared/production database. No
application writes, migrations, workflow executions, deployments or provider
generation calls were made during this investigation.

The browser policy failure remains separate: no authenticated manual click-through
or rendered vision QA is claimed. No magic-link email has been sent.

## Next integration gate

Compare the existing objects against the read-only SQL catalog preflight and
establish an isolated test target before modifying persistence. Do not create
replacement tables just because this checkout lacks their migration history.
Inspect existing writer/gate workflow definitions read-only before porting their
business logic. Earlier reports of missing local configuration must not be treated
as proof that authorized deployment access is unavailable.
