# Carousel Generator implementation tracker

Updated September 25, 2026. Working branch: codex/carousel-backend-foundation.
Current main fetched directly from GitHub: 781fb20. Main contains no newer commits than the branch base; no duplicate implementation found on main.
Starting feature commit: ac45989.

## Completion standard

A ticket is complete only when its acceptance criteria have evidence. Code, mocked tests, deployed behavior and manual/visual validation are separate statuses. No full ticket is yet certified end-to-end complete in this tracker.

## Estimate and order

Initial planning estimate: **40–70 active engineering hours**, excluding waiting for external access, schema decisions, migrations and live scheduled-run proof. This is an estimate, not a guaranteed deadline; revise after the first complete generation path. The supplied tickets themselves size several renderer/Studio/integration items as week-sized for one developer.

1. Access and schema inventory, additive persistence and transactional batch functions.
2. Template validation, image picking, painter, writer/risk/music integration.
3. Types/Generate → Writing → Review → Render → human approval, History/Rows/Overview.
4. Studio, versioning and Writing editor/conversations.
5. Libraries, uploads, image generation/tagging and Go Live.
6. Trends/search/details/feed/saves/votes/digests/knowledge and ingestion connections.
7. Durable Auto processing, retries/leases, notifications.
8. Full manual click-through, vision comparison, concurrency/failure tests, preview proof and handover.

## Blockers (continue other work)

- Browser sign-in: September 25 request to open the dashboard was refused before navigation because the browser security policy could not be verified. No magic-link email sent. User supplied garrethdottin@gmail.com and will return a link after successful initiation. Do not bypass browser controls.
- Live DB schema, applied migrations and service credentials need read-only verification before applying additive migrations. Do not duplicate existing generation tables or move vector extensions.
- The tickets identify unresolved schema and Go Live view-composition choices. Preserve legacy image_direction until its use is verified; do not drop it.
- Provider and n8n access need verification. Keep generation and final approval separate; never simulate success.
- Turbopack build failed on environment port-binding permission. Standard Webpack production build subsequently PASSED with approved network access for the existing font dependency. Browser tests have not passed.
- This checkout has no configured Supabase/provider environment, and the corresponding keys are absent from the process. Verify secure existing deployment configuration before live data/provider tests; do not paste keys into source.
- No production merge/deploy or live social posting is included in autonomous testing; use isolated test data and preview.

## Per-ticket ledger (62 entries)

| Ticket | Work | Status |
|---|---|---|
| DEV-00 | Keys, access and dependencies | Open |
| DEV-01 | Database: the generation record, templates, directions, libraries | Open |
| DEV-02 | Materialise and render claims as database functions | Open |
| DEV-03 | Template types and validator | Partial foundation; acceptance still open |
| DEV-04 | Painter: text | Open |
| DEV-05 | Painter: images, composition and upload | Open |
| DEV-06 | Image picking and the persisted manifest | Pure picker tested; database adapter and persistence open |
| DEV-07 | Parity check against the Python painters | Open |
| DEV-08 | Copy writer | Prompt/output contract and bounded length retry tested; provider, lane seeds, hardening and persistence open |
| DEV-09 | Quality gate | Fail-closed coordinator and writer integration tested; original rubric/patterns, similarity and live adapters open |
| DEV-10 | Music lookup (F14) | Open |
| DEV-11 | Batch service and routes | Partial foundation; acceptance still open |
| DEV-12 | Render service and vision check | Open |
| DEV-61 | What a batch is waiting for, worked out in one place | Partial foundation; acceptance still open |
| DEV-13 | Generator components | Partial foundation; acceptance still open |
| DEV-14 | Carousel types screen | Partial foundation; acceptance still open |
| DEV-15 | Generate form | Partial foundation; acceptance still open |
| DEV-16 | Batch page: writing and resuming | Open |
| DEV-17 | Batch page: review, and send it to the painter | Open |
| DEV-18 | Batch page: render and finish | Open |
| DEV-19a | History | Open |
| DEV-19b | The type page: Overview and the Writing tab | Open |
| DEV-62 | The Writing editor becomes a surface that can hold a mention | Open |
| DEV-19c | Image libraries, read-only | Open |
| DEV-54 | The Rows tab: what is sitting in the lane | Open |
| DEV-55 | A row's drawer, and the way back to its deck | Open |
| DEV-56 | Overview becomes the landing, and Carousel types moves | Open |
| DEV-57 | Overview: Running Tasks, Today, and the Carousel types section | Open |
| DEV-20 | Phase 2 live proof | Open |
| DEV-21 | Studio canvas, slides and inspector | Open |
| DEV-22 | Render preview and Regenerate sample | Open |
| DEV-23 | AI template drafting | Open |
| DEV-24 | Save as carousel type, versions, edit mode | Open |
| DEV-25 | Writing conversation | Open |
| DEV-26 | First batches for types that are not wired | Open |
| DEV-27 | The lane-creation database function | Open |
| DEV-28 | Go Live tab | Open |
| DEV-29 | Libraries: new, upload, retire | Open |
| DEV-30 | Higgsfield image generation | Open |
| DEV-41 | Image details: AI vision reads a library | Open |
| DEV-31 | Keys out of n8n before any rotation | Open |
| DEV-32 | Capture the study digest | Open |
| DEV-33 | Analyse a digest | Open |
| DEV-34 | Trends page: the feed, the search bar, Saved, digests and the knowledge base | Search/details UI partial; feed and other sections open |
| DEV-35 | Copy to Studio | Open |
| DEV-36 | Feed ranking and paging | Open |
| DEV-37 | Favourites: Save on a card | Open |
| DEV-38 | Account search | Open |
| DEV-39 | Carousel search wiring | Partial foundation; acceptance still open |
| DEV-42 | The details window: details, analysis, transcription | Partial foundation; acceptance still open |
| DEV-43 | Search filters: topic, hook style, views | Partial foundation; acceptance still open |
| DEV-44 | Votes: useful and not useful | Open |
| DEV-45 | The unseen feed | Open |
| DEV-46 | Transcribe and analyse, on demand | Open |
| DEV-47 | The query embedding for search | Partial foundation; acceptance still open |
| DEV-60 | Overview: Trending Carousels and Saved | Open |
| DEV-48 | Auto mode: the worker that keeps going with the tab closed | Pure runner primitives; durable worker open |
| DEV-49 | Auto mode: three tries, then the deck is dropped | Pure decision rules tested; persisted attempts open |
| DEV-50 | Auto mode: the switch, and the type that remembers it | Open |
| DEV-51 | Pause auto and Resume auto | Open |
| DEV-52 | The bell: Batch written and Batch finished | Open |
| DEV-53 | What a batch is waiting for, on every screen that lists batches | Open |

## Visual and manual QA

Vision agent inspected 20 reference screenshots across D16/D1/D2/D3/D4/D5/D10 and reviewed the new source. This is reference analysis, not a live UI pass. Findings: missing Overview and batch screens; D1 needs template/slide/batch facts; D2 needs real library/Writing/template bindings; D4 needs mobile Render footer without per-deck approve; D5 needs per-slide failures and review/approval. Awaiting approval must not prevent starting another batch. D10 fixes made after review: Apply/Enter for filters, visible applied-filter chips, clear hidden filters on clearing search, three-column phone grid, focusable detail panel, larger slide controls, and unknown metrics instead of fake zeros. Phone detail-sheet parity and full structured analysis presentation remain open.

Every implemented screen needs desktop 1440 and phone 390 checks, light/dark, keyboard/focus, empty/loading/error/retry states, navigation/back behavior and persisted readback where applicable.

## Reporting

### September 26, 03:01 UTC continuation

- Main refreshed at 781fb20, clean starting branch, no active worker agents.
- Added accessible slide dots with a bounded seven-control window for long decks, actual saved-position labels and 44px controls. Desktop backdrop dismissal now requires both pointer start and click outside the dialog rectangle, preventing an inside-to-outside drag from closing it. Focus restoration uses preventScroll to retain the search position; explicit aria-modal added.
- Ten navigation/geometry tests added; full suite 491 tests across 38 files passes, type-check and targeted lint pass. These are not browser interaction tests.
- Retried manual browser access after inspecting existing tabs: dashboard navigation is still denied because the admin-enforced security policy cannot be verified. No sign-in email sent, no manual click-through or live visual proof obtained. No workaround attempted.
- DEV-42 remains partial, including scroll-driven phone-sheet behavior and full live acceptance. Database/provider blockers unchanged. No merge or deployment, no newly certified full ticket and no supported ETA reduction.

### September 26, 02:41 UTC continuation

- Main refreshed at 781fb20; clean starting tree, no active agents.
- Investigated phase0 story fallback: reference_format_evaluations is named in DEV-42 but has no tracked schema definition in this checkout. Did not invent its join/filter columns; live schema verification is required before that query can be authored safely.
- Hardened the detail HTTP boundary against null/malformed slides, documents, analysis, reference and reading flags; aborted responses no longer update the viewer. Invalid responses follow the existing error/retry UI rather than crashing during rendering.
- Added adapter regressions for both saved analysis versions, partial status, coverage selection and empty visible copy, plus malformed response tests. Full suite: 481 tests in 37 files; type-check and targeted lint pass.
- DEV-42 remains partial. These tests use supplied responses, not live database proof. No new manual/vision QA, migrations, merge or deployment. Existing access blockers remain; no full ticket newly certified or supported ETA reduction.

### September 26, 02:21 UTC continuation

- Main refreshed at 781fb20; clean starting tree, no active worker agents.
- Detail query now selects documented analysis fields/inferred/coverage and narrative roles, and accepts either perez-slides-v1 or phase0-multiformat-v1, choosing the latest saved row. Column definitions checked against the tracked intelligence-engine migration; live shape remains unverified.
- Added explicit allow-listed presentation and native disclosure groups: Summary (initially open), How it works, Reusable pattern, Audience response. Empty rows/groups omitted; partial analysis preserved; model bookkeeping not rendered. Code words receive one centralized plain-word conversion. Transcription adds saved coverage, opening-slide label, visual descriptions and narrative tags. Only a complete inspected wordless slide is called wordless; uninspected missing copy remains unknown.
- Nine projection tests added; 472 tests pass across 37 files, plus type-check and targeted lint. Native disclosures are implementation, not browser QA proof.
- DEV-42 remains partial: phase0 story lookup in reference_format_evaluations, full caption, empty-audience explanation, read/retry actions, save/vote/Studio and all-entry-point/live verification remain. No new manual or vision pass, live database reads or deployment. No full ticket certified; ETA still unverified.

### September 26, 02:01 UTC continuation

- Main fetched at 781fb20; no conflicting work. Used the user-requested vision agent for read-only reference review of D10-PhoneDetailsLight and D10-PhoneAnalysisUpLight; this is not live QA.
- Updated existing real-data detail view: fullscreen phone modal, creator/close header, overlaid navigation/count, collapsed/expanded information sheet, accessible expansion control, automatic expansion for analysis/transcription, internally scrolling panel, fixed footer with safe-area spacing, background scroll lock/restoration, keyboard slide navigation and Platform metadata. Desktop retains its grid/modal layout.
- Type-check, targeted lint and all 463 tests pass. No new browser interaction tests; actual responsive rendering, focus, scroll and touch behavior still require browser verification.
- DEV-42 remains partial. Structured analysis accordions, pagination dots, caption availability, saves/votes and Copy to Studio remain separate gaps; no decorative fake controls added. Database/provider access blockers remain and no production merge/deploy occurred. No new end-to-end ticket certification or supported ETA reduction.

### September 26, 01:41 UTC continuation

- Main refreshed at 781fb20; clean starting tree and no concurrent agents. Rechecked tool availability and local configuration rather than assuming the earlier access blocker was unchanged.
- No database/Vercel/n8n connector or `psql`/`vercel` command found. SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, N8N_API_KEY and VERCEL_TOKEN are absent from this process. Saved September 12 audit receipts contain workflow/credential-reference metadata, not a configured connection; no secret values were printed.
- Added documented read-only `probeGenerationAccess`, using zero-row GETs against five existing relations, fixed server configuration, timeout and no redirects. It never reports an inaccessible object as absent or certifies schema. Missing configuration makes no requests.
- Five tests added; full suite passes 463 tests in 36 files; type-check and targeted lint pass. The actual local probe returned configured=false with no checks, not a successful database verification.
- Persistence remains blocked on securely configured database access and live catalog readback. No migrations, production writes, manual click-through or new vision QA occurred. No additional ticket is end-to-end complete; ETA remains unvalidated while integration access is absent.

### September 26, 01:21 UTC continuation

- Main refreshed at 781fb20; clean starting branch and no concurrent agents.
- Initial generation and revision now share one quality-check integration. New `reviseAndCheck` requires a different draft identity, preserves N+1 provenance, reruns compliance/scoring/risk even for track-only revisions, retains new copy when the gate fails, and stops at awaiting music. Invalid timeout settings are rejected before a writer request.
- Five new integration tests with injected adapters. Full suite: 458 passing tests in 35 files; type-check and targeted lint pass.
- This closes only the in-memory revision-to-checker gap. Persisted route enforcement, fresh music lookup, saved readbacks, rendering invalidation, original compliance/rubric and live workflow adapters remain outstanding. DEV-08/09 remain partial, with no new end-to-end completion claim.
- No new manual click-through or vision QA, no live calls/writes, no merge/deploy. Existing browser/security and environment/schema blockers remain. No evidence supports shortening the provisional estimate.

### September 26, 01:01 UTC continuation

- Main freshly verified at 781fb20; starting checkout clean and no agents running.
- Added isolated deck/slide/track rewrite preparation. Proposes N+1 with previous-version provenance, rejects stale expected versions and mismatched template roles before provider calls, preserves original copy, protects fixed/per-batch values and flags collateral edits outside the requested scope. Slide rewrite requires one AI role painted on exactly one slide. Full-deck revision can rewrite all AI copy.
- Seven new regression tests; full suite passes 453 tests in 35 files. Type-check and targeted lint pass.
- This is not persisted versioning: transaction/row-lock version checks, routes, refreshed risk/music checks for revisions, rendering invalidation and saved readbacks remain open. No approval or gate verdict is inherited by these returned copies. DEV-08 stays partial.
- No live provider calls, DB mutations, manual click-through or new vision QA. Browser/live-access blockers unchanged; no merge or deployment. No new end-to-end ticket completed and no validated ETA reduction.

### September 26, 00:41 UTC continuation

- Main refreshed at 781fb20; clean starting tree and no active agents.
- Added server-side OpenRouter JSON writer adapter, using the official API reference at https://openrouter.ai/docs/api_reference/overview. Captures an explicitly configured `CAROUSEL_WRITER_MODEL` for both attempts, reads the existing server API key, uses a fixed HTTPS endpoint with redirects forbidden, requests JSON with a token cap, aborts after 45 seconds, rejects truncated/refused/malformed completions and sanitizes errors. No automatic transport retries or default model. `.env.example` documents the new non-secret model setting.
- Thirteen adapter tests added. Full suite passes 446 tests across 34 files; type-check and targeted lint pass. Tests use a fake HTTP transport: no paid requests, live model capability proof, saved drafts or deployed route invocation occurred.
- DEV-08 remains partial: adapter exists but is not connected to a persisted batch route; lane seeds, caption hardening, versioned saves and live samples remain. DEV-09 original rubric/patterns and live risk mapping still need verification.
- No new browser/manual/vision evidence, no production merge/deployment. Access blockers and provisional estimate remain unchanged; no full ticket newly certified.

### September 26, 00:21 UTC continuation

- Main freshly fetched at 781fb20; no active agents, unrelated changes or duplicate workers.
- Added quality-gate coordinator with separately injected compliance/scoring/risk adapters. Compliance runs despite remote failures; score <6, high risk, delete/review, malformed evidence or timeout flag copy. Verdict reasons/suggestions are retained; raw provider errors are not. Timeouts abort provider requests and bound waiting even if an adapter ignores abort.
- Integrated validated writing with the coordinator for one draft-version identity. Hook must be a painted opening-slide role; on-screen text follows painted slide order. A passing copy stops at `awaiting_music`, never human approval or render readiness. Written copy is retained when gating fails.
- 23 additional tests; full suite 433 tests in 33 files passes, type-check and targeted lint pass. No live provider calls or database writes made.
- DEV-09 remains partial: original rubric and regex patterns were not found in the inspected source and were not guessed; same-batch similarity, exact workflow response mapping, live adapters, saved verdicts and mandatory invocation on every persisted version remain open. DEV-08 caption hardening/seeds/provider/persistence gaps remain.
- Browser/manual/vision and live schema/credential blockers unchanged. No new end-to-end ticket certification, no production merge or deployment. Planning ETA remains provisional rather than reduced on unit-test evidence.

### September 26, 00:01 UTC continuation

- Fresh main fetch remains 781fb20; no concurrent agents or unrelated edits found.
- Added `src/lib/carousel/writer/contract.ts`: generation-safe template validation; AI-role prompt contract; fixed/per-batch text assembly; active painted-role mention resolution and stale-mention metadata; strict structured-output validation; exactly one length correction attempt before flagging; sanitized provider failure state; model/prompt/direction/template provenance. Unicode limits count code points, not UTF-16 units. This is an injected provider interface, not an enabled production provider call.
- Twelve new tests cover supplied text immutability, stale mentions, email preservation, missing batch choices, malformed output, bounded retry, provider failure and rejection of unsafe historical templates before a call. Full suite: 410 tests in 31 files pass; type-check passes.
- DEV-08 remains partial. Outstanding: port exact lane prompts/direction seeds, caption brand/molecule hardening, real provider adapter, versioned draft persistence and redo operations, quality/music gates and three live decks per lane for human review. No copy result grants approval or render readiness.
- Browser/security and live credential/schema blockers unchanged; no new manual click-through or live vision QA evidence. No production merge/deployment. Initial estimate remains provisional pending a verified end-to-end batch.

### September 25, 23:41 UTC continuation

- Fresh main fetch still resolves to 781fb20. No concurrent agents or pre-existing edits were found; the previous committed checkpoint was b0110b2, with no intervening implementation commits.
- DEV-61 shared projection now returns the specified flagged/Done wording, neutral versus stopped-danger tone, logical screen destination, effective target and a separate dropped-deck label. Writing excludes dropped/discarded decks from its denominator. Explicit persistence finalization remains separate from display completion.
- Added nine presentation-contract tests; full suite passes 398 tests in 30 files. This is a partial DEV-61 implementation, not certification: persisted readbacks, nullable column-count semantics and consumers across unfinished screens remain open.
- Retried dashboard browser access after checking existing tabs. It is still denied before navigation because the admin-enforced security policy cannot be verified. No magic-link email was sent and no manual click-through or live vision QA was completed.
- Initial 40–70 active-hour estimate has not been validated by end-to-end throughput; no reliable completion-time reduction is justified.

Automation carousel-implementation-20-minute-progress is active. Report actual changes, completed versus partial tickets, tests, manual/vision evidence and blockers every 20 minutes. Do not count files or artboards as finished tickets. Continue unblocked work; pause the automation only after verified completion or the user's request.

## September 25 implementation pass after main audit

- Trends search page now uses the existing search/detail APIs; handles submission, stale-request cancellation, loading, no results, errors/retry, fallback disclosure and a details dialog with slide navigation, saved analysis and transcription. Feed/saves/votes/digests/knowledge/account search remain open; do not certify DEV-34/42 complete.
- Template validator checks effective styles, fonts, wrapping, shadows, image rules and materialization flags. Historical imports are unchanged.
- Batch create DTO accepts text registry keys. Status projection releases the type slot while waiting for review/approval but retains stopped/active work. Pure runner naming/stalling/three-attempt Auto rules added; no durable worker exists yet.
- Read-only schema preflight SQL and runbook added. It has NOT been executed. Existing briefs/drafts/slides must be extended, not duplicated. Old draft UNIQUE(brief_id,version) must be safely replaced when adding deck positions.
- Deterministic image picker now handles library/status fences, named/nested sets, no-set whole-library picks, cover fallback, distinctness/exhaustion, original slide numbers, Glow Up diagonal brightness matching and stable seeded ordering. Rejects invalid/credential-bearing URLs and duplicate active-library image IDs. Fetch host/redirect safety and persistence remain separate required adapters.
- Latest completed full suite: 389 tests passed. Webpack build passed. Browser sign-in and manual UI verification still blocked. No full ticket is marked end-to-end complete based on these unit tests.
