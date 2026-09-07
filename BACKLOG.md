# Backlog

Open items that were deliberately deferred, with enough context to pick each
one up cold. Newest first.

---

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
