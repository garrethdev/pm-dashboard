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
| DEV-08 | Copy writer | Open |
| DEV-09 | Quality gate | Open |
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
