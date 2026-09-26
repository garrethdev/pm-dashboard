# Carousel Generator implementation tracker

Updated September 26, 2026. Working branch: codex/carousel-backend-foundation.
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

- September 26 06:02 UTC: auto-review rejected the next Vercel environment
  credential retrieval as insufficiently specifically authorized. Do not retry
  or use an indirect credential path. Explicit user approval is needed to retrieve
  development database credentials for further read-only verification. Earlier
  successful receipts remain historical evidence, not authorization to bypass this.

- Browser sign-in: September 25 request to open the dashboard was refused before navigation because the browser security policy could not be verified. No magic-link email sent. User supplied garrethdottin@gmail.com and will return a link after successful initiation. Do not bypass browser controls.
- Live REST access and generation table columns verified September 26 using existing Vercel development-scoped credentials. SQL constraints, applied migrations, RLS and function grants still need catalog verification before migration changes. Existing generation extensions MUST be reused; see `carousel-live-access-receipt.md`.
- The tickets identify unresolved schema and Go Live view-composition choices. Preserve legacy image_direction until its use is verified; do not drop it.
- Provider and n8n access need verification. Keep generation and final approval separate; never simulate success.
- Turbopack build failed on environment port-binding permission. Standard Webpack production build subsequently PASSED with approved network access for the existing font dependency. Browser tests have not passed.
- This checkout has no persisted Supabase/provider environment. Earlier Vercel retrieval succeeded and credentials were used only in a short-lived process for five zero-row probes and REST metadata reads. Further retrieval is now blocked pending explicit approval (see September 26 06:02 entry above). Development-scoped configuration does not establish database isolation; no live writes were performed.
- No production merge/deploy or live social posting is included in autonomous testing; use isolated test data and preview.

## Per-ticket ledger (62 entries)

### September 26, 14:02 UTC continuation

- Main refreshed at 781fb20; clean starting branch at 6fa11ec and no other active implementation agents.
- Added bounded plain-text/caret edit history (100 past edits, 1M retained UTF-16 units per history stack) and connected it to the unmounted Writing editor's keyboard undo/redo and history input-event handling. New text clears redo; caret-only changes do not. Parent values differing from current local text reset history for loaded versions. This is local editor history, not persisted draft versioning.
- Eight new test cases cover restoration, branching, boundaries, memory caps, input snapshots and invalid carets. Full suite 787 tests / 61 files; type-check, targeted lint and diff checks pass. No new production build or component interaction test this checkpoint.
- DEV-62 remains partial. Actual browser undo/event ordering, mobile beforeinput/IME, selection behavior, drag/drop, multiword names, accessibility, page mounting and persistence still need work/verification. No manual click-through or new vision QA; live credential/catalog/browser-policy blockers unchanged. No full ticket completed, live writes, merge/deploy or supported revised ETA.

### September 26, 13:42 UTC continuation

- Main fetched at 781fb20; clean starting tree at d0e09cd and no other active implementation agents. Read bundled Next client-component instructions.
- Added reusable controlled `WritingEditor` component: contenteditable surface painted with text nodes/noneditable mention spans, muted stale-name treatment/count, plain-text paste, role insertion buttons, matching suggestion list, arrow/Enter/Escape handling, atomic mention deletion and composition-event guards. Plain text crosses the callback boundary; no HTML is stored. External drops are prevented pending proper caret-aware drag/drop implementation.
- Component is NOT mounted on a live type page and has no save endpoint. Selection restoration, mobile beforeinput/IME, undo/redo, autocomplete positioning, accessibility, dark/light fidelity and drag/drop require browser verification and further work. DOM rebuilding may interfere with native undo; do not certify this as production-ready editor behavior.
- Existing 779 tests / 60 files pass; type-check, targeted lint (zero remaining warnings), diff checks and local Webpack production build pass. No new component interaction tests or manual/vision evidence: existing helper tests do not prove browser behavior.
- DEV-62 remains partial; no full ticket completed. Live schema/credential and browser-policy blockers persist. No live writes, merge/deploy or supported revised ETA.

### September 26, 13:22 UTC continuation

- Main refreshed at 781fb20; clean starting branch at 61e853f, no concurrent implementation agents.
- Continued DEV-62's shared plain-text helpers: matching-prefix suggestions with character limits, explicit Escape trigger suppression, no suggestions for spaced @/emails/unmatched prefixes/interior mention carets, and whole-token backward/forward/range deletion for active and stale mentions. Plain prose deletion returns control to the browser. Fixed adjacent insertion so two mentions cannot merge.
- Ten additional regression cases; 779 tests / 60 files, type-check, targeted lint and diff checks pass. No DOM or keyboard event wiring is claimed by these pure-function tests.
- DEV-62 still partial: rendered editor, menu/focus/IME handling, drag/drop, multiword-name syntax, persistence and desktop/phone/theme verification remain open. No full ticket completed, no new manual/vision QA or build. Live credential/catalog/browser blockers remain; no live writes, merge/deploy or supported revised ETA.

### September 26, 13:02 UTC continuation

- Main refreshed at 781fb20; clean starting branch at 733fdb5 and no other active implementation agents. Read DEV-62 and existing prompt mention behavior.
- Extracted a shared plain-text mention module and connected the prompt builder to it. Provides painted-role vocabulary, active/stale mention tokens with UTF-16 selection offsets, and caret/range insertion that replaces intersected mentions atomically. Existing identifier syntax and email exclusions remain unchanged; no HTML is produced or stored.
- Six new tests cover tokens/stale names, email/prose exclusions, astral-character offsets, lossless text reconstruction, mid-sentence insertion, atomic replacement, separators and invalid selections. Full suite 769 tests / 60 files; type-check, targeted lint and diff checks pass.
- DEV-62 remains partial: rendered editor surface, autocomplete, drag/drop, keyboard/backspace behavior, multiword-name syntax, saved Writing readbacks and desktop/phone/theme QA remain open. This module is not evidence of those interactions. No full ticket certified, no new manual/vision QA or build. Live credential/catalog/browser blockers persist; no live writes, merge/deploy or supported ETA revision.

### September 26, 12:42 UTC continuation

- Main refreshed at 781fb20; clean starting branch at ba4ff9e with no concurrent implementation agents. Read DEV-53/61's explicit blank-versus-zero requirement.
- Shared batch projection now accepts repository-supplied nullable written/rendered/approved column counts. Null stays null, measured zero stays zero, absent measurements are not invented from current deck states. Counts are allowlisted, range-checked and copied; they never grant readiness/actions or change status derivation. A rendered deck later flagged by vision can retain its measured render count without offering approval.
- Eleven regression cases added. Full suite: 763 tests / 59 files; final focused status suite 44 tests, type-check, targeted lint and diff checks pass.
- DEV-61/53 remain partial: repository readbacks must provide counts from the same snapshot, and unfinished History/type/Overview consumers must display them. No full ticket certified, no new manual/vision QA or production build. Live credentials/catalog/browser blockers unchanged; no live writes, merge/deploy or supported ETA revision.

### September 26, 12:22 UTC continuation

- Main fetched at 781fb20; clean starting branch at 9b5e5c7 and no other active implementation agents. Reviewed shared batch projection and Auto decisions against DEV-61 and runner requirements.
- Rejected non-boolean readiness flags in batch projection and Auto decisions. Previously a stored string "false" was truthy and could offer render/approve or return a render instruction. Missing/null/numeric/string flags now fail closed. Projection also validates provenance, deck collection shape and nonblank string deck identities.
- Thirteen additional parameterized regression cases cover malformed flags through projection/owner actions/Auto, plus malformed provenance and collections. Full suite: 752 tests / 59 files. Type-check, targeted lint and diff checks pass. These are domain tests, not persisted command/worker or UI verification.
- No full ticket newly certified. Live schema/credential and browser-policy blockers remain; durable persistence, unfinished screens and end-to-end QA are still open. No new manual click-through, vision QA or production build this checkpoint; no live writes, merge or deployment. No measured throughput supports a revised ETA.

### September 26, 12:02 UTC continuation

- Main refreshed at 781fb20; clean starting feature branch at 2da937c and no concurrent implementation agents.
- Fixed quality-gate fail-closed validation: risk enums previously used string coercion for validation, permitting arrays such as ["high"] that then missed strict rejection comparisons. Risk level/action now require primitive strings. Non-cloneable adapter evidence also fails closed without storing raw errors.
- Gate input/adapter references are captured before queued calls, and each remote result is cloned when received rather than after both finish. A later mutation cannot turn an already received high-risk verdict or low score into a pass while the other provider remains pending.
- Seven new regressions; 739 tests / 59 files pass. Type-check, targeted lint and diff checks pass. Provider calls in these tests are doubles. No new production build, manual click-through or vision QA this checkpoint.
- DEV-09 remains partial: original rubric/compliance rules, live provider wiring and persisted invocation still require completion. No full ticket newly certified; remaining UI/persistence/jobs are unfinished. Browser-policy and credential/catalog blockers unchanged. No live writes, merge or deployment, and no supported revised ETA.

### September 26, 11:42 UTC continuation

- Main fetched at 781fb20; clean starting tree at a51269a and no other active implementation agents. Reviewed DEV-08/09 requirements and the current revision/checker implementation.
- Fixed a revision-safety gap: caller mutation during a provider await could broaden the checked scope, change reported N+1 provenance or replace feedback/provider on length retry. Revision now captures input, previous copy/version, scope and callback before awaits. Initial/revision write-and-check also capture gate adapters and draft identity so a result cannot be gated against a later caller edit.
- Four new regression cases exercise scope/provenance mutation, retry feedback/provider mutation, and initial/revision gate-identity isolation. Full suite: 732 tests / 59 files; type-check, targeted lint and diff checks pass. These provider/gate tests use injected doubles, not live service proof. Previous checkpoint's production build passed; no fresh build this checkpoint.
- DEV-08/09 remain partial; no full ticket newly certified. Original caption-hardening rules/lane prompts, persisted version locking, providers, music and remaining UI work remain open. No new manual click-through or vision evidence. Browser policy and credential/catalog access blockers unchanged; no live writes, merge or deployment. No evidence supports a revised completion ETA.

### September 26, 11:22 UTC continuation

- Main refreshed at 781fb20; clean starting branch at 6bba615, no concurrent implementation agents or duplicate workers.
- Added internal `renderSavedDeck`: snapshots template/copy/selections/server-origin policy before awaits, validates the saved manifest, loads bundled fonts, preflights captions/glyph support before downloads, downloads only the saved selections and invokes the real captioned renderer. Never repicks, uploads, saves database rows or approves. Authorization, persisted revision and lease checks remain caller responsibilities; this is not an exposed generation route.
- Five new lifecycle regressions cover real font/raster output, foreign manifests, invalid copy/fonts/emoji before network, caller mutation across awaits, and unavailable/invalid assets. Both six/seven-slide integration tests now use this operation and verify deduplicated downloads before simulated storage/readback. External image downloads and storage remain simulated, not live proof.
- 728 tests across 59 files pass; type-check, targeted lint, diff checks and local Webpack production build pass. No new manual browser or vision evidence this checkpoint; the previous raster smoke review remains limited to its synthetic samples.
- No full ticket newly certified end-to-end. Live credentials/catalog/provider and browser-policy blockers remain. Remaining screens, durable persistence/jobs and full workflow QA are not finished. No live writes, production merge or deployment; no measured end-to-end throughput supports a revised ETA.

### September 26, 11:02 UTC continuation

- Main freshly fetched at 781fb20; no newer main implementation or concurrent implementation workers. Continued from 72d9ece without changing unrelated files.
- Rendered decks now carry their template slug/version; upload preflight rejects a mismatched pinned template before any storage call.
- Connected the actual caption/image renderer, bundled fonts, deck uploader and per-object readback adapter in integration tests for both lanes (six JPEG slides and seven PNG slides). Only storage HTTP is simulated. Tests verify dimensions, numbered paths, SHA256 readbacks and duplicate retries without extra objects or overwrites. Historical template changes are test-only, not published migrations.
- Full suite: 723 passing tests across 58 files. Type-check, targeted lint and diff whitespace checks pass. No fresh production build this checkpoint.
- Vision agent inspected the two generated opening-slide raster samples in /private/tmp/carousel-deck-qa.2FbNR3: upright readable glyphs, intact outline/shadow and no clipping/overlap. Synthetic solid backgrounds and short test copy do not prove design fidelity, long-copy fit or app behavior.
- No full ticket newly certified end-to-end. No live storage/database writes, manual browser click-through, merge or deployment. Credential approval, browser policy and live schema/provider verification remain blockers; no measured end-to-end throughput supports a revised ETA.

### September 26, 10:42 UTC continuation

- Main fetched at `781fb20`; clean starting branch and no active worker agents.
- Connected captioned-deck output to the no-overwrite slide uploader. All slide
  numbers, formats, signatures, sizes and destinations are preflighted before
  the first write. Duplicate paths and mismatched extensions fail early; bytes
  and bucket policy are snapshotted across asynchronous calls.
- Partial failures retain earlier verified receipts, report the failed original
  slide number with storage state `unknown`, and list unattempted slides. No
  deletion, renumbering, automatic approval or database completion occurs. Retries
  use identical destinations so the existing adapter can verify duplicate bytes.
- 720 tests / 57 files, typecheck, focused lint and diff checks pass. Seven new
  orchestration tests mock the uploader; they are not live Storage proof. No
  full ticket newly certified. Durable lease/version checks, receipt persistence,
  configured storage policy and isolated scratch-deck verification remain open.
- No new manual/vision QA, credential retrieval, live writes or deployment.
  Browser/access blockers remain; no evidence-supported revised completion ETA.

### September 26, 10:22 UTC continuation

- Main remains `781fb20`; clean starting branch and no active worker agents.
- Added render-path expansion for original slide numbers and the two imported
  lane patterns, requiring a trusted run/scratch prefix and rejecting traversal,
  unknown tokens and invalid identifiers/extensions.
- Added server-internal Supabase Storage upload/readback adapter: explicit
  trusted project/key/bucket policy, no credential discovery, `x-upsert: false`,
  redirects refused, bounded attempts/timeouts/backoff and SHA-256 readback.
  Duplicate 400/409 responses are accepted only if downloaded bytes match.
  Different existing objects are never overwritten or treated as success.
- Consulted Supabase's standard-upload documentation and installed storage-js
  implementation. Corrected the readback URL to the SDK's authenticated GET
  `/storage/v1/object/<bucket>/<path>` before final verification.
- 713 tests / 56 files, typecheck, focused lint and diff checks pass. The new
  tests mock storage responses, including timeouts, ambiguous upload failures,
  duplicates, mismatches and permanent errors. NO live upload/readback occurred.
- DEV-05 remains partial: deck/job wiring, configured bucket policy, isolated
  live scratch-deck proof and persisted readback are still open. No new manual/
  vision QA or full ticket certified. Access/browser blockers unchanged; no
  deployment, production merge or evidence-supported revised ETA.

### September 26, 10:02 UTC continuation

- Main freshly fetched at `781fb20`; clean starting tree and no active workers.
- Added bounded HTTPS raster download: exact server-owned origin allowlist,
  public IPv4 resolution with connection pinned to the checked address, original
  hostname retained for TLS/SNI, no redirects/cookies/credentials, 15-second total
  deadline, 20MB per image, streaming limits, content-type/signature checks and
  rejection of encoded/incomplete transfers. IPv6-only hosts intentionally remain
  unsupported. Full image decoding is still performed by the existing compositor.
- Added saved-manifest image collection with identity validation, sequential
  downloads, per-invocation URL deduplication and 80MB aggregate limit. Failed
  images fail the deck, never cause repicking or silent slide renumbering.
- 691 tests / 55 files, typecheck, focused lint and diff checks pass. New tests
  use mocked DNS/HTTPS (including private/mixed answers, redirects, size limits,
  DNS/body deadlines and late DNS resolution), NOT live network verification.
  No server origin allowlist has been inferred from user content or enabled.
- Consulted Node's official HTTPS/DNS API documentation. No browser/credential
  policy bypass, live request, upload, persistence or deployment occurred. No new
  manual/vision QA, full ticket certification or evidence-supported revised ETA.

### September 26, 09:42 UTC continuation

- Main remains `781fb20`; clean starting tree and no running worker agents.
- Bundled unmodified Inter Bold 4.1 and Liberation Sans Bold 2.1.5 from official
  releases, with their licenses and SHA-256 provenance in
  `assets/carousel-fonts/README.md`. Added fixed-catalog, checksum-verified loading;
  template filenames cannot become arbitrary filesystem/network reads.
- Real Inter text exposed unsupported GSUB shaping in opentype.js. Replaced
  runtime metrics/outlines with pinned fontkit 2.0.4 without disabling features;
  synthetic-font regression tests still pass. Installed packages with scripts off.
- 645 tests / 53 files, typecheck, focused lint and Webpack production build pass.
  Build trace for carousel types includes both fonts and their licenses. This is
  local bundle verification, not deployed execution or a complete generation run.
- Vision agent inspected two newly rasterized font samples: upright/readable
  text, visible quotes/ampersand/em dash, no missing glyphs or clipping, distinct
  fill/stroke/soft shadow. Inter quote shapes differ visibly from Liberation Sans.
  Samples are reproducible using CAROUSEL_FONT_QA_DIR with `fonts.test.ts`.
- This is local font-smoke QA, not browser click-through or Python/design parity.
  Emoji, production render integration, upload/persistence and visual sign-off
  remain open. No full ticket newly certified; no live credentials retried, merge
  or deployment. Browser/access blockers remain and no reliable revised ETA.

### September 26, 09:22 UTC continuation

- Main freshly fetched at `781fb20`; clean starting branch, no active workers.
- Added v1 template-to-caption planning: role lookup, fixed-copy protection,
  limits, conditional hook quotes, shallow style overrides, explicit newlines,
  original slide numbers and rejection of contradictory alignment declarations.
- Added in-memory captioned-deck rendering from saved image selections, supplied
  raster assets and explicit font bytes. Preflights all captions/fonts before
  image work, preserves box paint order, supports PNG/JPEG and returns explicit
  unpersisted/unapproved status. Template font paths are never opened.
- 637 tests / 52 files, typecheck, focused lint and diff checks pass. Integration
  tests decode six captioned 1080x1920 images and check top/bottom placement,
  background pixels, overlapping-box paint order and JPEG encoding. A fixture
  typing error was fixed before the final checks passed.
- Tests use a synthetic rectangle font and solid-color images, not approved
  fonts, real content or Python visual parity. Emoji, font bundle, safe remote
  fetching, uploads, persisted jobs and app integration remain open. No full
  ticket newly certified; no new manual/vision QA or live access attempts.
- Browser/security and credential-approval blockers unchanged. No deployment;
  no measured end-to-end throughput supports a revised completion ETA.

### September 26, 09:02 UTC continuation

- Main freshly fetched at `781fb20`; clean starting branch and no active workers.
- DEV-04 now has font-outline SVG painting and transparent caption PNG output,
  with measured wrapping, crisp stroke/fill and separate hard/blurred shadows.
  Measurement and glyph painting use the same parsed font, avoiding host-font
  fallback. Emoji remains explicitly unsupported, not silently substituted.
- Real raster pixel tests exposed missing closing contours in decoded CFF paths;
  explicit closure fixes the missing stroke edge. Tests cover coordinates, fill,
  stroke, transparency, hard/soft shadows, empty text and rejected inputs.
- 628 tests / 50 files, typecheck, focused lint and diff checks pass. These use
  a synthetic rectangle font, not approved fonts or Python reference renders.
  Font bundling, emoji, template-box integration and final slide composition/
  upload remain open. No full ticket newly certified, no new manual/vision QA.
- Credential and browser policy blockers remain; neither was bypassed. No live
  writes/deployment. No measured end-to-end throughput to justify a revised ETA.

### September 26, 08:42 UTC continuation

- Main remains `781fb20`; clean starting tree, no worker agents active.
- Added opentype.js 2.0.0 and its types at pinned versions, install scripts off.
  Consulted official project API documentation: https://github.com/opentypejs/opentype.js.
- Added bounded static-font parsing and measurement with actual advance widths
  and ascender metrics. Rejects malformed/variable fonts, missing glyphs and invalid
  sizes rather than relying on an OS fallback. Connected measurements to layout tests.
- 622 tests / 49 files, typecheck and focused lint pass. New tests serialize and
  parse a generated OpenType fixture; they do not prove the required Inter,
  Liberation Sans or Noto assets, licensing bundle, glyph appearance or font parity.
- Approved font bundling and final text rasterization remain open. No full ticket
  newly certified; manual/vision QA remains blocked. No live credential retry,
  writes or deployment; no evidence-supported revised completion ETA.

### September 26, 08:22 UTC continuation

- Main remains `781fb20`; clean starting tree, no active worker agents.
- Added deck-background adapter connecting validated templates and saved image
  manifests to actual raster composition. Preflights all required bytes, snapshots
  them, reuses repeated URLs, bounds deck input/output bytes and keeps slide numbers.
  Returns explicit `image_backgrounds` / `finalSlides: false`, lossless PNG only.
- 613 tests / 48 files, typecheck and focused lint pass. Integration test renders
  all six 1080×1920 fixture backgrounds, decodes dimensions and checks pixels;
  missing slide-6 asset is rejected. An initial invalid two-slide fixture was
  corrected to the full contiguous template; production validation was preserved.
- Tests do not verify captions, real-source appearance, uploads, persistence or
  app click-through. Manual/vision QA still blocked; no full ticket newly complete.
  No live credentials retried, writes or deployment; revised ETA remains unverified.

### September 26, 08:02 UTC continuation

- Main remains `781fb20`; clean starting tree and no active worker agents.
- DEV-05: added CPU-only image-cell composition from bounded raster buffers.
  Supports centre-cover fit, bicubic/Lanczos selection, optional EXIF orientation,
  manifest-order composition, sRGB output and PNG/JPEG encoding. Rejects invalid
  bounds, corrupt/non-raster/animated input and excessive input/output sizes.
- Declared already-installed Sharp 0.35.4 as a direct dependency; install scripts
  were disabled. Consulted official resize/composite docs:
  https://sharp.pixelplumbing.com/api-resize/ and
  https://sharp.pixelplumbing.com/api-composite/.
- 609 tests / 47 files, typecheck and focused lint pass. New integration tests
  genuinely encode/decode images and check pixels at four-cell boundaries plus
  JPEG dimensions/metadata. An initial type-import error was corrected and rerun.
- This is NOT font/text integration, Python parity or app end-to-end verification.
  Remote fetch protections, caption composition, uploads and persisted rendering
  remain open. Manual/vision QA still blocked; no new full ticket complete, no
  credential attempts or deployment, and no evidence-supported revised ETA.

### September 26, 07:42 UTC continuation

- Main remains `781fb20`; clean starting tree and no active worker agents.
- DEV-04: added text-only SVG layer output using the measured layout. Crisp pass
  uses round stroke joins and stroke-before-fill. Hard/soft shadows are separate
  unstroked layers; soft output carries a blur sigma for the future compositor.
- Escapes authored text, rejects invalid XML/style attributes, bounds paint
  settings and explicitly refuses emoji until bitmap-run support is implemented.
- 604 tests / 46 files pass, plus typecheck and focused lint. Tests inspect SVG
  structure with synthetic metrics; they do not prove raster output, font accuracy,
  emoji support, sharp blur behavior or comparison with the Python painter.
- No full ticket newly complete; fonts/raster composition and manual/vision QA
  remain open. Credential approval still outstanding; no live access retried,
  no writes/deployment, and no verified revised completion ETA.

### September 26, 07:22 UTC continuation

- Main remains `781fb20`; clean starting tree and no active worker agents.
- DEV-04: added measurement-driven text-layout calculations following template
  model §2 and renderer spec B.1/B.2. Handles greedy whitespace wrap, explicit
  datestamp lines, overflowing words without a blank first line, four anchors,
  fractional line heights and ascender-to-SVG-baseline conversion.
- 594 tests / 45 files, typecheck and focused lint pass. New tests use injected
  synthetic measurements; actual bundled fonts/opentype metrics, emoji handling,
  SVG paint/shadows, rasterization and Python visual parity remain OPEN.
- No live credential attempts, writes or deployment. Manual/vision QA remains
  blocked; no full ticket newly certified and no verified revised completion ETA.

### September 26, 07:02 UTC continuation

- Main remains `781fb20`; clean starting tree, no worker agents active.
- Added saved image-manifest validation for exact deck/library/template version,
  original slide numbers, cell order/count, image IDs and URL shape. Returns a
  fresh allow-listed structure; preserves legal repeated images in thin pools.
- Preparation can reuse a supplied saved manifest without reading the current
  library. Invalid saved selections fail rather than silently repicking. This
  does not authenticate the snapshot or implement atomic database persistence.
- 582 tests / 44 files, typecheck and focused lint pass. Retry tests cover an
  unavailable/changed library and corrupt saved data; they are local tests only.
- No live credential attempts, database writes or deployments. Manual/vision QA
  and durable persistence/rendering remain unfinished; no full ticket certified
  and no evidence-supported revised ETA.

### September 26, 06:42 UTC continuation

- Main remains `781fb20`; clean starting tree and no active worker agents.
- Added internal `prepareDeck` orchestration connecting pinned template/Writing
  readers, prompt contract and image-library picker. Verifies template content-type
  binding and allowed per-batch roles; snapshots caller text before asynchronous
  reads. Returns explicitly unpersisted preparation, never approved/render-ready.
- Local integration tests assemble a six-slide fixture proposal and cover wrong
  type, unsafe identity, unwanted role overrides, missing Writing and empty pools.
  These tests mock database readers; they do NOT establish a live generation run.
- 571 tests / 43 files, typecheck and focused lint pass. No credential access was
  retried. Live verification awaits approval; manual/vision QA remains blocked.
- Persistence, model calls, rendering and durable execution remain open. No full
  ticket newly certified, no production deployment, no verified revised ETA.

### September 26, 06:22 UTC continuation

- Main re-fetched at `781fb20`; clean starting tree and no worker agents active.
- Added a pinned Writing reader for existing `carousel_lane_directions`, using
  the exact saved row ID and checking the registry content-type binding. Preserves
  authored text and allows inactive pinned versions for retries; never substitutes
  the latest active version. Rejects missing, ambiguous, blank and mismatched rows.
- Writer preparation now rejects blank Writing before a provider call. Tests
  verify this guard and sanitization of database errors.
- 565 tests / 42 files pass, plus typecheck and focused lint. These are local
  checks only: no live credential retrieval was retried after the security denial.
- Batch persistence/provider integration and manual/vision QA remain unfinished.
  No full ticket newly complete, no production deployment, no verified revised
  completion ETA. Live read approval remains outstanding.

### September 26, 06:02 UTC continuation

- Main remains `781fb20`; clean starting tree and no active worker agents.
- Added a pinned template-version reader: exact template ID/version, duplicate
  detection, identity checks, generation validation and JSON/version consistency.
  No substitution of a newer active version during retries; no mutation or silent
  repair of legacy template settings. This is not yet wired to a durable batch run.
- 549 tests / 41 files passed, along with typecheck and focused lint. Regression
  coverage includes invalid identities, missing/duplicate rows, version mismatch,
  inactive pinned versions, legacy safety settings and sanitized read errors.
- Live smoke check was blocked before execution by credential-access auto-review.
  No live-template validation result is claimed. User approval requested; continue
  unrelated local work without bypassing this decision.
- No new full ticket certified. Browser/manual/vision QA and full generation remain
  incomplete; no evidence-supported revised ETA. No live writes or deployment.

### September 26, 05:42 UTC continuation

- Main remains `781fb20`; clean starting tree and no active worker agents.
- DEV-06: added server-side `v_image_assets` adapter with explicit columns,
  library/status scoping, pagination bound, row validation, duplicate-ID rejection
  and sanitized read failures. Connected it to the deterministic picker through
  an explicitly unpersisted proposal function. No source bank changes.
- Live read-only check: two existing libraries returned 55 and 69 valid active
  assets. Each produced a one-slide in-memory proposal from a synthetic probe
  template. This verifies view-to-picker integration, NOT design/template parity,
  rendering, persistence, concurrency or generation completion.
- 537 tests / 40 files, typecheck and focused lint passed. Browser/manual/vision
  QA remains blocked. No additional full ticket certified; no deployment or
  database writes. Full-completion ETA remains unverified.

### September 26, 05:22 UTC continuation

- Main re-fetched at `781fb20`; clean starting tree, no active worker agents.
- Search now loads saved discovery image lists in a bulk read and uses the same
  conservative slide-position alignment as Details. Selects the latest evidence
  per reference and the exact matched position; absent, incomplete and ambiguous
  media remain null. No per-card request fan-out or cross-reference substitution.
- Live keyword search (`eyes`) returned 25 results. Search RPC, reference, beat
  and discovery reads all returned HTTP 200. One of 25 results had a valid
  matched-slide image; this is not a claim of full inventory image coverage or
  successful asset rendering. No provider invocation or database mutation.
- 526 tests / 39 files pass; typecheck and focused lint pass. Added regressions
  for latest-source selection, partial lists and out-of-range matched positions.
- DEV-39/42 remain partial. Browser click-through and rendered vision QA remain
  unverified; full generation remains unfinished. No production deployment or
  evidence supporting a revised full-completion ETA.

### September 26, 05:02 UTC continuation

- Main remains `781fb20`; branch was clean and no worker agents active.
- DEV-42 media adapter now reads the latest carousel discovery record's ordered
  `media_urls`. Attaches URLs/provenance only when count equals contiguous beat
  positions and every URL is valid/distinct. Invalid or ambiguous lists remain
  unavailable, never compacted or replaced with the cover. Search-card matched
  imagery is still separate unfinished work.
- Read-only live adapter check passed for three canonical carousels with 1, 7
  and 8 slides: 16/16 slide rows received saved image URLs; all 18 requests were
  HTTP 200. URLs were not fetched/rendered, so asset availability and visual
  correspondence are not certified. Initial discovery-only samples were rejected
  as non-carousel by the canonical reference filter; provider format alone is
  not authoritative.
- Local tests, typecheck and focused lint pass. Browser/manual/vision QA remains
  blocked; no full ticket newly certified. No writes, deployment or new workers.
- No revised end-to-end ETA is supported until a full generation path is measured.

### September 26, 04:42 UTC continuation

- Main re-fetched: still `781fb20`; no active worker agents or overlapping edits.
- DEV-42: implemented the phase0 Story fallback from verified
  `reference_format_evaluations` fields, preserving existing analysis/status and
  recording source provenance without exposing strength scores.
- A real read found an existing adapter defect hidden by mocked tests: live
  `reference_beats` has neither `media` nor `visual`. Removed those invalid select
  fields from detail/search reads. Matched-slide media remains explicitly null;
  correct slide-image sourcing is still open, not replaced with invented URLs.
- Live read-only adapter smoke: one phase0 carousel returned six slides and its
  saved Story; all five relation requests returned HTTP 200. Initial non-carousel
  sample returned the correct 404; the subsequent 502 exposed the column defect
  before correction. No database writes or provider calls occurred.
- Verification: 516 tests / 38 files passed; typecheck and focused lint passed.
  Browser/manual/vision validation still blocked and no full ticket certified.
- Estimate remains provisional (40–70 active engineering hours originally);
  no measured full generation path exists to justify a revised completion date.

| Ticket | Work | Status |
|---|---|---|
| DEV-00 | Keys, access and dependencies | Open |
| DEV-01 | Database: the generation record, templates, directions, libraries | Open |
| DEV-02 | Materialise and render claims as database functions | Open |
| DEV-03 | Template types and validator | Partial foundation; acceptance still open |
| DEV-04 | Painter: text | Template-bound captions and bundled static fonts tested; emoji and Python/design visual parity open |
| DEV-05 | Painter: images, composition and upload | Composition, fetch and no-overwrite upload/readback adapters tested; live scratch proof, job wiring, persistence and parity open |
| DEV-06 | Image picking and the persisted manifest | Picker and live read adapter verified; atomic manifest persistence and rendering open |
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

### September 26, 04:02 UTC continuation

- Main refreshed at 781fb20; clean starting branch and no active worker agents.
- Corrected an Auto pause mismatch against DEV-51: pending writing and previously queued rendering can continue; newly written decks and flagged retries wait for manual action. Queued renders still require valid checks, completed renders still require human approval, and infrastructure failures remain visible.
- Retry plans now distinguish copy rewrite, music lookup retry and vision rewrite/re-render. All quality flags still drop after the third attempt. Vision's plan explicitly requires fresh copy/music gates before queueing, not an unchecked direct render.
- Six new cases; full suite 510 tests in 38 files passes, type-check and targeted lint pass.
- DEV-48/49/51 remain partial: these are shared decisions, not an operating durable worker. Persisted attempts/leases, provider execution and live pause/resume proof remain open. No new manual/vision QA, no merge/deploy, no new end-to-end ticket completion. Live access blockers remain and no reliable ETA reduction is supported.

### September 26, 03:42 UTC continuation

- Main refreshed at 781fb20; clean starting branch and no active worker agents.
- Search HTTP boundary now validates result/reference records, safe detail IDs, saved-slide counts and pagination consistency before rendering. Corrupt results enter error/retry rather than crashing or being misrepresented as an empty search; known zero-slide records remain valid.
- Eight new response tests. Full suite: 504 tests in 38 files passes. Type-check, targeted lint and a fresh Webpack production build PASS, including all currently implemented carousel routes. The build did not deploy or exercise live providers/database.
- DEV-34/39/42 remain partial. No new manual click-through or vision QA, no new end-to-end ticket certification. Browser/security and live environment/schema blockers remain. Build success does not reduce the unverified end-to-end ETA.

### September 26, 03:21 UTC continuation

- Main refreshed at 781fb20; clean starting branch, no active worker agents.
- Phone information sheet now responds to vertical wheel/touch gestures: expands for forward reading, collapses on reverse movement only at panel top. Horizontal/tiny gestures and pinch zoom retain native behavior; ordinary expanded-content scrolling is not intercepted. Listener cleanup included, desktop unaffected, grab-bar button remains keyboard alternative. No animation is introduced, including for reduced-motion users.
- Five gesture-rule tests added; full suite 496 tests in 38 files passes, type-check and targeted lint pass. Native input event behavior remains unverified in a real browser/device; unit rules are not touch QA.
- DEV-42 remains partial pending the remaining data/actions and live acceptance. No new manual or vision pass, live database activity, merge or deployment. Previously rechecked browser and credential/schema blockers remain, with no newly certified full ticket or supported ETA reduction.

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
