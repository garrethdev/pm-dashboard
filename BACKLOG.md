# Backlog

Two separate lists. Check which one you are in before picking something up —
they have different bars for "done".

- **[V1 — open work](#v1--open-work)** is the shipping product. Bugs, unverified
  fixes and decisions still owed. These block or degrade what is live now.
- **[V2 — deferred features](#v2--deferred-features)** is work that was
  understood, costed and consciously postponed. Nothing here is broken; none of
  it is blocked on discovery. Do not start one of these while a V1 item is open.

Newest first within each list.

---

# V1 — open work

## Verify the TikTok ingest fix on a real run

**When:** Monday 2026-09-07, after 08:30 ET (20:30 Manila the same day) — the next scheduled run of
`[TikTok Analytics] Engine — ScrapeCreators` (`84bcYyXfCgtLB7y4`, cron
`0 30 8 * * 0,1,3,5` = Sun/Mon/Wed/Fri 08:30 ET). Waiting for real new data
rather than firing a manual run, which would re-ingest everything and trigger
the AI judging leg for nothing.

**What changed (2026-09-06, published).** On the `Upsert tt_post_performance`
node only:

| | before | after |
|---|---|---|
| `options.batching.batch.batchSize` | 50 (n8n default) | 1 |
| `options.batching.batch.batchInterval` | — | 200 ms |
| `options.timeout` | 300 s (instance default) | 60 s |

The upserts were already batched at 10 rows per request; that was never the
problem and `CHUNK = 10` in the Normalize node is still correct — it is sized
for the per-row `match_content_id` trigger (~46 ms/row). The problem was that
all ~35 chunks left in the same second and queued against PostgREST's shared
pool.

**Correction (2026-09-07).** An earlier version of this note said the node's
HTTP timeout defaulted to 10 s and that n8n abandoned and retried each slow
insert. Wrong: execution data shows this instance sends `timeout: 300000` when
a node sets none, so nothing was abandoned client-side. The ~99 requests for
~35 chunks came from the gateway answering **504 after ~150 s**, which the node
treats as a failure and retries (`retryOnFail`, `maxTries: 3`). Lowering the
timeout to 60 s is still right — it fails fast instead of holding a connection
for five minutes — but it was not the original fault.

**What to check after the run:**

1. **No gateway timeouts.** Expect zero `504`s where there were 65:
   ```sql
   -- Supabase logs, source = 'edge_logs'
   select log_attributes['response.status_code'] as status, count() as n,
          round(avg(toFloat64OrNull(log_attributes['response.origin_time'])), 0) as avg_ms
   from logs
   where source = 'edge_logs'
     and log_attributes['request.path'] = '/rest/v1/tt_post_performance'
   group by status;
   ```
   Baseline on 2026-09-06: `504` x65 avg 160 s, `200` x20 avg 80 s, `201` x14 avg 73 s.
   Target: only `200`/`201`, avg well under 5 s.

2. **Requests are spread, not simultaneous.** Group by second — on 2026-09-06,
   35 requests shared one timestamp. They should now be ~200 ms apart.

3. **The execution succeeds.** It has failed 4 of its last 15 runs. Check
   `search_workflow_executions` for `84bcYyXfCgtLB7y4`; the run should also
   finish in well under the 10-18 minutes it has been taking.

4. **No rows were lost.** `select count(*) from tt_post_performance` should
   climb by roughly the number of posts scraped, and
   `select max(ingested_at) from tt_post_performance` should be that morning.

5. **The dashboard stayed responsive during the window** — the real point of
   the fix. Nothing in the app should log `502 operation aborted due to
   timeout` around 08:30-08:40 ET.

If it regresses, the next lever is PostgREST's pool size rather than the
workflow. See `tt-ingest-concurrency-storm` and `tt-upsert-trigger-timeout` in
the assistant's project memory.

---

## Also open

- **Service-role JWTs are hardcoded** into six HTTP nodes in
  `84bcYyXfCgtLB7y4` (`Upsert tt_post_performance`, `Read TT Outliers`,
  `Read TikTok Accounts`, `Read Final Scores`, `Query This Week Stats`,
  `Query All Time Stats`). n8n flags them as `HARDCODED_CREDENTIALS`. They
  should move to a stored credential. Not touched — it is a credential
  rotation, not a code change.

- ~~That ingest fails ~1 run in 4.~~ **Diagnosed 2026-09-07 — same root cause,
  no separate fix needed.** All four failures are Supabase going unreachable at
  a READ node immediately after the upsert storm, never at the upsert itself:

  | run | failing node | error |
  |---|---|---|
  | Aug 16 | `Read TT Outliers` | Cloudflare **502** `origin_bad_gateway` ("origin is overloaded"), then 300 s timeout |
  | Aug 24 | `Query This Week Stats` | Cloudflare **521** `origin_down` ("connection refused") |
  | Aug 31 | `Read TT Outliers` | **300 s timeout** (`ECONNABORTED`) |
  | Sep 6 | `Upsert tt_post_performance` | 65 x **504** at the gateway |

  Aug 31 is the clearest: the upsert node ran for **595 s** and its own output
  carries a 300 s timeout error, and the very next Supabase read then died. The
  storm did not just slow the upsert — it starved whatever queried Supabase
  next. So the batching fix should close all four; if a run still fails at a
  read node after 2026-09-07, that is a genuinely separate fault.

- **Two content lanes are collapsing.** `jealousy_quotes` (Char 3, score 17,
  67% suppressed, pool empty, 7 slots missed three days running) and
  `conspiracy_kitchen` (Char 4, score 15, 39% suppressed, pool empty, 4/wk —
  the character's largest allocation). Scheduler shortfalls ran 4 -> 7 -> 11 ->
  14 over four days. Both surface with a red Retire button on /content-types.
  This is a content decision, not a code one.

- ~~Today's calendar has no outage fallback.~~ **Done 2026-09-06** — the last
  successful payload per live key is kept and served when a live read fails,
  with its real timestamp and a notice saying what is missing. Still per server
  instance and lost on restart, so a cold-start outage is not covered.

---

# V2 — deferred features

Each of these is deliberately parked, not unfinished. Every one records why it
was deferred and what is already confirmed, so it can start from evidence rather
than from a fresh investigation.

## Renew proxies and phone numbers without leaving the dashboard

**Deferred 2026-09-07 (Garreth).** V1 ships with links out to each provider's
own panel. Nothing here is blocked: the endpoints are confirmed and the UI is
small. It waits because it writes to a billing API, not because anything about
it is unclear.

**Why a link cannot do the job.** proxy-cheap's panel takes a
`?modal=<ns>.<action>` parameter — `?modal=account.billing.topUp` on the root,
`?modal=proxies.period.extend` on `/proxies/{id}` — and it cannot be opened from
outside. Proven by test: reloading such a URL restores the modal, but pasting the
identical URL into a fresh tab does not. The only difference is per-tab
`sessionStorage`, so the panel writes modal state into the URL for show and
restores it from storage the reload preserved. TextVerified is the contrast that
proves the fault is theirs and not ours — its `?open=true` opens the card form
from an external link through the same anchor markup. So today the Extend and
Top up buttons land on the right page and the modal is one more click. Do not
spend another round trying to deep-link proxy-cheap.

**What to build instead — drive the renewal toggle directly.**

| Provider | Endpoint | Body |
|---|---|---|
| proxy-cheap | `POST /proxies/{id}/auto-extend/enable` | none |
| proxy-cheap | `POST /proxies/{id}/auto-extend/disable` | none |
| TextVerified | `POST /api/pub/v2/reservations/rental/renewable/{id}` | `{ includeForRenewal: true }` |

Both are confirmed, not guessed. The `disable` halves already run in production
inside `[Ops] Post-Ban System` (`WmichajTDXL0pT1z`, "Process External" node);
`enable` exists on the same route (302 unauthenticated where a fake path 404s);
the TextVerified call is in their published swagger at
`https://www.textverified.com/swagger/v2/swagger.json`.

Flipping that toggle is the actual fix for most of what the Extend button flags:
a proxy expiring in five days with auto-extend off renews itself once it is on,
and the same for a rental excluded from its next cycle. No immediate charge and
fully reversible.

**Two limits to state in the UI.** It renews at cycle end rather than extending
now, and it cannot help an already-expired proxy — that needs a paid
reactivation proxy-cheap's API does not expose. Those rows keep the link.

**Shape.** A write route beside `/api/accounts/pause`, a confirmation naming the
proxy or number, and an optimistic toggle on the Auto-renew column already in
`proxies-table.tsx`. Destinations and the row-level rules live in
`src/lib/provider-links.ts`.

**Related:** an immediate paid renewal is a separate, larger job. TextVerified
supports it (`/reservations/rentals/extensions`, `/billing-cycles/{id}/renew`,
`/reservations/rental/{id}/reactivate` with a `GET` cost quote first);
proxy-cheap has no paid extend endpoint at all — `/proxies/{id}/extend` 404s.
