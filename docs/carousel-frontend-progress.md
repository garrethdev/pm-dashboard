# Carousel frontend implementation — September 25

Branch: `codex/carousel-backend-foundation`.

## Implemented in this increment

- D1: replaces the section stub with responsive type cards, character pills, expandable details, retired grouping, loading, error/retry and empty states.
- D2: type-specific Generate route; 1–50 deck count controls, optional note, Auto switch and mobile bottom action bar. Default count is 20 from the handover, not the sample value 50 in some screenshots.
- Session-protected `GET /api/carousel-generator/types`, documented in Swagger, reading explicitly selected carousel-only registry fields through the existing paginated Supabase adapter.
- UI components, browser-safe contract and server repository are separate modules. Existing dashboard screens and shared shell are unchanged.

Design reference: September 25 `carousel-generator-designs` export, particularly D1-WaitingApproval and D2-NoWriting. Reuses existing theme tokens and shell; this is not a claim of full screenshot parity.

## Deliberate integration boundaries

The registry identifies posting lanes. It does **not** establish generator template versions, image-library bindings, Writing readiness or running batch state. These fields are not invented. D1 opens the configuration form; D2 submission is disabled with an explicit integration message. The form's draft state is in memory only and is not saved. New type creation is also disabled until Studio persistence exists.

No batches, provider requests, database writes or deployments are initiated by these screens. Generation is **not** end-to-end complete. Overview, batch workflow, Studio, libraries, History and Trends UI remain outstanding. No dummy types or mock successful generation are inserted.

## Verification

Unit coverage includes registry filtering and ordering, string identifiers, count boundaries, session enforcement before repository access, no-store responses and sanitized database failures. Live Supabase readback and browser screenshot comparison still need verification. Test/build results are reported with this change rather than assumed from the design export.
