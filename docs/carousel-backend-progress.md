# Carousel backend implementation

Branch: `codex/carousel-backend-foundation`, updated to GitHub main `781fb20` on September 24.
This is local, unmerged work. API routes now exist in code; no database migration, workflow or deployment is activated.

## September 24 integration pass

- DEV-39/47 groundwork: POST `/api/carousel-generator/search` calls the existing
  `search_carousel_library` RPC directly. Uses the existing embedding model at
  512 dimensions, a five-minute/128-entry process cache, a 20-second total timeout,
  no reranking, and an explicit keyword fallback if embedding fails.
- DEV-42 groundwork: GET `/api/carousel-generator/carousels/:id` and
  `/api/carousel-generator/sources/:id` return persisted reference, ordered beats,
  analysis and indexed evidence. No duplicate scraping or analysis pipeline.
- DEV-43 groundwork: GET `/api/carousel-generator/facets` supplies saved topic and
  hook-family options. Hook/views filtering is not implemented yet.
- DEV-03 groundwork: structural template validation and split-column row loader,
  with fixture and malformed-input tests. Historical Glow Up 3:4 and imported
  `gatekeep_status=pending` remain readable, but cannot pass generation validation.
  No historic fixture or production table was rewritten.
- All four routes start with the existing session gate. Environment keys stay
  server-side. No anonymous endpoint or alternate hosted search service is needed.

### Frontend integration contract (implemented, not deployed)

Search accepts `{query, channel?, mode?, exact?, limit?, filters?}`. Channel is
meaning/literal/construction/visual/comments; mode is hybrid/keyword/semantic;
limit is 1–25. Filters currently support creator/topic/audience only. Reranking
must be false and offset must be zero if supplied. This is best-match retrieval,
not the feed; it scans 50 candidates and returns up to 25 carousel matches.
Responses contain `requested_mode`, actual `mode`, `fallback`, `results` and
`pagination` with `total:null` and `exhaustive:false`. Each result retains the RPC
match, a reference object, matched media, thumbnail fallback and slide count.
Use plain-text rendering for excerpts and analysis. Errors contain code/message:
400 invalid input, 401 no session, 404 absent reference, 413 oversized request,
422 read bound, 502 upstream failure, 503 missing config, 504 total timeout.

### Still required — none of these tickets is marked end-to-end complete

Live schema readback must confirm RPC signature, vector dimensions and beat media
columns; a real semantic query and forced embedding-failure test remain release
gates. Account search (DEV-38), hook/views filters, paged unseen feed, per-user
saves/votes, authenticated write auditing and on-demand ingestion remain open.
Generation persistence, batch routes, writer/gates/music, image picking, painter,
render queue, human approval, Go Live, Studio/versioning, library mutations,
digest learning, Auto workers and all live-proof tickets also remain open.
Template style validation is structural, not full renderer parity or layered
Studio support. The old UUID batch DTO has not been reconciled to the lane schema.

Verification this pass: 277 unit/transport tests in 24 files pass. All provider
and database responses in those tests are mocked; this is not a live-service proof.

## Implemented first slice

- New isolated `src/server/carousel/` domain module. No existing application source replaced.
- Batch-create input parsing: explicit pinned version IDs, 1–50 requested decks, bounded text, no client identity/approval/table injection.
- Shared batch status projection (DEV-61 / BE-07 foundation) covering unaccounted items, ready/blocked counts, terminal outcomes and allowed actions.
- Owner/revision/human-command checks designed to run within the eventual database transaction. Worker calls cannot approve.
- Unit tests include the prior 50-requested/5-saved failure mode, interrupted/stopped batches, stale commands, duplicate IDs, flags, Auto and second viewers.

## Integration boundaries and remaining work

These are pure domain functions, not a running batch API or persistence implementation. The DTO uses UUID IDs for proposed new generator entities, not bigint source-reference IDs; confirm generator schema against live inventory before freezing that contract. Boolean readiness must be derived by trusted repositories from current-version checks, never browser input. Actual concurrency/one-active-batch constraints, idempotency, leases, actor authentication and transaction enforcement still require database/service implementation and integration tests.

The state projection deliberately requires explicit finish before Done. A stopped batch retains its slot and Finish must account for each remaining item with a disposition. Owner and revision checks must run under lock with the mutation; a UI capability response alone is not authorization. Auto workers need separate fenced advancement commands and cannot call human commands.

Next: read-only live schema/legacy-lane inventory; additive persistence proposal; transactional create/status API; template validator against both repository fixtures. Applied migrations must remain byte-preserved. No production writes until the schema proposal and integration checks are ready.

## Preservation

Implementation adds this document, `src/server/carousel/**`, `src/lib/carousel/**`
and new `/api/carousel-generator/**` routes, plus unmerged changelog entries and
an empty OpenRouter environment placeholder. Existing API/auth, scheduler,
calendar, UI, dependencies and applied migrations remain unchanged. Do not copy
the stale local Story Finder snapshot over current GitHub files.

## Verification, September 24

- Repository test suite: 240 tests passed in 21 files, including 29 new carousel checks.
- `npm run typecheck`: passed, including Next route-type generation.
- Targeted ESLint for `src/server/carousel`: passed.
- `git diff --check`: passed. Tracked changes are limited to the changelog; implementation and progress files are additive.
- No live database, provider, render, queue, concurrency or deployment test has been run for this slice.
