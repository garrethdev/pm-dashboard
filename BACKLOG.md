# Backlog

Three separate lists. Check which one you are in before picking something up —
they have different bars for "done".

- **[V1 — open work](#v1--open-work)** is the shipping product. Bugs, unverified
  fixes and decisions still owed. These block or degrade what is live now.
- **[V2 — deferred features](#v2--deferred-features)** is work that was
  understood, costed and consciously postponed. Nothing here is broken; none of
  it is blocked on discovery. Do not start one of these while a V1 item is open.
- **[V3 — architecture](#v3--architecture)** is structural work on how the
  automations are built, not on what the dashboard shows. Nothing here changes a
  screen. These are safe to do in any order and none of them block a release.

Newest first within each list.

---

# V1 — open work

## The rest of the 2026-09-09 external code review

**Two findings from the first outside review of this codebase
(`PM-CODEBASE-REVIEW-2026-09-09.md`) that are still open.** Its high-severity
items — silent monitoring failures, retirement claiming unproven success, and
non-atomic settings writes — were fixed on 2026-09-10 and are in `CHANGELOG.md`.
These are what is left.

Two notes before picking one up. The review was done against a ZIP snapshot, not
this repo, so **every source link in it is dead** (they point into a deleted
`/private/tmp/pm-review.*` folder) and it cannot tell fixed from broken. And its
line numbers are close but no longer exact. Re-confirm before trusting any of it.

**1. Refresh does not refresh everything (the review's #5).** `DATA_TAGS` in
`cache.ts` omits the analytics range keys, the account-analytics family, the
inventory-rollup ranges and the incident-history ranges. There is a second
layer underneath: Calendar, Analytics, Content Types, Demand/Supply and Incident
History all seed local state from server props, and `router.refresh()` leaves
that state alone — so those views need an explicit reload for their current
slice. Shortening TTLs does not touch the second problem.

**2. What is left of the cadence finding (the review's #6).** Two of its three
parts are now closed: `42af79f` made the route reject a lane belonging to
another character, and `save_cadence_mix()` raises when a lane matches zero
registry rows, so a silent no-op PATCH is no longer possible. Still true:
`parseLanes()` does not reject **duplicate lane identities** before the
client-side sum check — the database now refuses the save, but the error is a
late and clumsy way to say "you sent the same lane twice" — and a lane's
`character` still arrives from the browser rather than being read from
`content_type_registry`. Derive the allowed mix from the database.

**Also flagged, smaller, all confirmed still true:**

- **The profile-card lookup ignores platform.** `account_profile_cards` *has* a
  `platform` column, but `account-detail.ts:233` filters on `username` alone, so
  the same handle on both platforms returns whichever row comes back first. Same
  family as the account-analytics cache key fixed on 09-10, and about as small.
- `getSchedulerOverrides` (`scheduler-overrides.ts`) shares `ACCOUNTS_TAG` as
  its cache key while returning a different shape. It has **no call sites** —
  give it its own key before wiring it to a screen.
- Account performance reads and all-time totals do not paginate and will
  silently truncate at PostgREST's row cap as the corpus grows.
- The ScrapeCreators health probe reports "ok" when the key merely exists, and
  still counts toward successful probes.
- The filler lifecycle modal's `canSave` needs a peer or a resumed self, so a
  fleet-wide filler lane with no GLP peers cannot be paused or retired there.
- No test suite and no CI. The passing build cannot catch any of the above.

**Settled, no action:** the review's "registry identity inconsistency" caution.
`content_type_registry`'s primary key is `content_type` **alone** (checked live
2026-09-10), so patching by it is correct and cross-character collisions cannot
happen. Only the code comments describing `(content_type, character)` as the
identity were wrong. Do not "fix" the joins on the strength of those comments.

**Done when:** each of the two has either landed or been moved to V2 with a
reason. Do not close this by agreeing with the review — it is wrong in places.

## Verify Character 5's first scheduled run

**Un-paused 2026-09-10 at ~07:31 ET — an hour after that day's 06:30 run had
already fired, so nothing was placed on the 10th.** The first run that sees the
character is **06:30 ET on 2026-09-11**. Until it has been checked once, the
whole Character 5 wiring is unverified in the only way that counts.

**Expect four placements: one `cleora` each on Profiles 64, 65, 70 and 72.**

Four is the number to hold onto. It would have been two before 2026-09-10 —
Profiles 70 and 72 are 10 days old, and the 9–15 day ramp tier grants one slot a
day but zero GLP, because that slot is meant for filler and Character 5 has no
filler lane. The ramp now lets GLP take the slot where there is no filler, so
they post from day one instead of waiting until 2026-09-16. **If only 64 and 65
are placed, that change did not take.**

```sql
-- 1. the placements themselves
select geelark_profile, content_type, content_id, posting_time, posting_status
from unified_posts
where posting_date::date = (now() at time zone 'America/New_York')::date
  and geelark_profile in ('Profile 64','Profile 65','Profile 70','Profile 72');

-- 2. must be EMPTY. A 'Character 5 / filler / pool empty' row means something
--    is still reading the fleet filler quota instead of the character's 0.
select * from scheduler_shortfalls
where date = (now() at time zone 'America/New_York')::date and "character" = 'Character 5';

-- 3. resolved caps. max_posts_per_day must be 1 for all four -- 2 would mean
--    the age ramp is raising the cap above the character's own again.
select geelark_profile, age_days, health, max_posts_per_day,
       max_glp_per_day, max_filler_per_day, throttle_reason
from v_scheduler_account_config where "character" = 'Character 5';
```

Also worth a look on the first run, since neither has been seen live yet: the
posts should land inside 11:00–22:15 ET, and `geelark_tasks` should show them
succeeding rather than failing at upload — Profiles 70, 71 and 72 all failed
their first post attempt on 2026-09-09 with the same network upload error, which
is what surfaced the Last Post bug in the first place.

**Done when:** four posts placed, no shortfall row, caps reading 1/day, and at
least one post confirmed delivered rather than merely scheduled.

## Migrate the cache layer off `unstable_cache`

**Found 2026-09-07 in a backend review, then spiked the same day.** Next 16's
docs are explicit that "`unstable_cache` is replaced by the `use cache`
directive". Nothing is broken — it still ships and works in 16.3.3 — but the
whole of `src/lib/data/cache.ts` is built on it.

**Spiked on `perf/cache-components` and backed out. Read this before starting
again; the shape of the job is not what it looks like.**

`use cache` does nothing without `cacheComponents: true`, and that flag turns on
instant-navigation validation across every route. The spike enabled it and
worked through the failures in order:

1. **`/login`** blocked on `await searchParams` at the top of the page. Fixed
   properly — the card and logo prerender, only the branch reading the query
   string suspends. **Kept.**
2. **`/accounts/[profile]`** blocked on `params`. Streaming it behind a skeleton
   built and looked right, but **reverted**: `notFound()` then runs inside a
   Suspense boundary, after the shell has streamed and the status is already
   committed, so a missing profile served the not-found UI with **HTTP 200
   instead of 404**. Anything converting a route whose data can 404 has to solve
   that first — the status has to be decided before the shell is sent.
3. **Every dashboard route** blocked on the shell: `usePathname()` in both
   `sidebar.tsx` and `topbar.tsx`, plus the session read in the `(dashboard)`
   layout. Next's own auth guide says to set `export const instant = false` on
   the layout and convert one route at a time, which cleared all ten at once.
4. **`/automation` still failed**, and this is the wall. From the migration
   guide: "Calls like `new Date()`, `Date.now()`, `Math.random()`... during
   prerender throw a build error **that `instant = false` does not clear**, so a
   route that uses them won't build until you address it, opt-out or not."

**There are 23 such calls across 12 modules** in `src/lib` — automation,
calendar, incidents, accounts, proxies, pulse, notifications, top-posts,
account-detail, account-analytics, writes and cache itself. Every one needs
`await connection()` inside a `<Suspense>` boundary, or to move into a client
component. That is not a long tail, it is the job, and it cannot be deferred
behind the escape hatch the way the auth and pathname blockers can.

This dashboard is time-relative by nature — overdue, days left, freshness, "ET
today" — so those clock reads are not incidental and cannot simply be deleted.

**If you pick this up:** budget for the whole data layer, not the cache helper.
Use Next's adoption skill
(`npx skills add vercel/next.js --skill next-cache-components-adoption`) in
incremental mode. Steps 1-3 above are already solved and documented here, so
start at the clock reads and decide route by route which need request-time
freshness and which can be cached.

**Two things that will not map cleanly even after that:**

1. **`bypass`.** Ours reads live for unsettled days and falls back to the last
   good payload, because stale-while-revalidate served the pre-scheduler state
   for hours and read as "the scheduler never fired" (2026-09-06). Whatever
   replaces it must keep that behaviour and keep marking the payload `stale` so
   the UI still says so on screen.
2. **`lastGood`.** A module-level Map, per instance, lost on cold start —
   deliberately, and documented as covering an outage that starts mid-session
   rather than a cold one. `use cache` defaults to in-memory storage with the
   same lifetime, so check whether `use cache: remote` or a cache handler makes
   this redundant before porting it across.

Also note `cachedFetcher`'s own shape does not survive: `use cache` derives its
key from arguments, so a higher-order function taking `fn` as a parameter cannot
be cached. Each of the ~20 fetchers becomes its own `'use cache'` function, and
the shared `fetchedAt` / `stale` / `bypass` machinery needs rebuilding around
that.

**There is no deadline pressure.** The docs are explicit that existing `fetch`
and `unstable_cache` caching keeps working as a separate layer once the flag is
on, so nothing breaks on the day it is enabled and nothing breaks while it is
not.
---

## Concurrent reads make the app say "Supabase unreachable"

**Seen twice on 2026-09-08, from two unrelated directions.** Same root cause,
and the app blames the wrong thing both times.

**What happened.** Garreth saved the fleet cadence at 07:04:49 UTC. Saving
expires every cached figure on purpose so the new numbers show at once, so the
dashboard rebuilt all of its panels simultaneously:

```
07:03   65 requests   avg   318ms     normal
07:04  173 requests   avg   936ms     the save
07:05  177 requests   avg 3,513ms     every panel refetching at once
07:07                 avg   ~1s       recovered
```

**Nothing failed.** Zero 5xx across the whole window — every request eventually
returned 200. But `sbRest` gives up after 10s (`src/lib/data/supabase.ts:11`
and `:32`; writes use 8s in `writes.ts:24`), and eight reads crossed that line:

| path | slowest |
|---|---|
| `viral_filler_content` | **28.2s** |
| `v_scheduler_pool` | 18.7s |
| `v_scheduler_account_config` | 17.0s |
| `filler_library` | 15.0s |
| `scheduler_overrides` | 13.5s |
| `content_type_registry` | 12.9s |
| `post_thumbnails` | 12.7s |

Those panels showed **"Supabase unreachable"** while the database was still
working and answered seconds later. It was reachable and it was slow — the copy
asserts a cause it has not established, and sent Garreth looking for an outage
that never happened.

**Same shape as the TikTok ingest.** That entry describes ~30 upserts firing
together and each taking 30-60s. This is ~180 reads firing together and taking
3-28s. Neither is really an ingest problem or a dashboard problem: this database
degrades sharply under concurrency, and both features happen to create bursts.
Two entries, one cause.

**Three levers, cheapest first:**

1. **Fix the message.** A timeout is not unreachability. "Supabase is taking
   longer than 10s — it is still responding, try Refresh" is honest and costs a
   string. Do not raise the timeout to hide it.
2. **Stagger the post-save refetch.** Expiring every tag at once is what creates
   the burst. Expiring only what the write actually changed, or refetching
   panels in sequence, removes the spike without touching the database.
3. **PostgREST's connection pool** — already named in the ingest entry as the
   next lever there. If it is the shared constraint, one change fixes both.

**Worth measuring before choosing.** `viral_filler_content` and `filler_library`
were the two worst, which is suspicious while a filler cull is in progress — it
may be table-specific (a missing index, a row-count spike) rather than purely
concurrency. Check those two on their own before assuming the pool is the answer.

---

## The mobile web version needs fixing

**Raised by Garreth 2026-09-08. Picked up 2026-09-09** — he asked for this
to be the next session's work, so it jumps the queue ahead of the other V1
items. No specific screen named — the survey below
was taken from the code, not from a phone, so treat it as where to look first
rather than the whole list. Someone should open the deployed app on a real
handset and add what actually hurts.

**The shell is the main problem, and nothing else can be judged until it is
fixed.** `src/app/(dashboard)/layout.tsx` is `flex min-h-screen` with the
sidebar as a permanent flex child, and `sidebar.tsx` has **no breakpoint
handling at all** — it is `w-60` expanded, `w-16` collapsed, and always
present. On a 375px phone the expanded sidebar takes 64% of the width and the
collapsed one still takes 17%. There is no drawer, no off-canvas, nothing
hidden below a breakpoint. The collapse toggle is a desktop preference stored
in `localStorage`, not a mobile answer.

**The breakpoint spread says the same thing.** Across `src/`:

```
sm:  17    md:  2    lg:  5    xl:  49    2xl: 5
```

`xl:` outnumbers `md:` and `lg:` together by seven to one. Layouts were drawn
wide and collapse to a single column; the 640-1024px range in the middle has
had almost no attention, and that is most phones in landscape and every small
tablet.

**One outright bug.** `content-type-cards.tsx` is the only table in
`src/components` with no `overflow-x-auto` wrapper — every other one has it.
It will push the page sideways on a narrow screen instead of scrolling inside
its own card. Cheap fix, worth doing regardless of the wider work.

**Known wide content that will need a decision, not just a wrapper:**

| where | width | today |
|---|---|---|
| `demand-supply-card.tsx` | `min-w-[880px]` table | scrolls in a wrapper |
| `content-calendar.tsx` | `min-w-[46rem]` (736px) grid | scrolls in a wrapper |
| `accounts-table.tsx` | ~14 columns | scrolls in a wrapper |
| `analytics-charts.tsx` | account table, 11 columns | scrolls in a wrapper |

These are handled in the sense that they scroll rather than break the page, but
a 880px table on a 375px screen is a poor experience even when it scrolls. The
real question is which columns matter on a phone — a design decision, and one
this entry cannot make.

**Suggested order:** the missing overflow wrapper first, since it is a bug and
costs minutes. Then the shell — the sidebar needs to become a drawer or hide
below `md:`, because every other judgement about mobile is distorted while it
is eating the width. Only then is it worth going screen by screen.

---

## Three pages still have no loading state, blocked on the 404

**Found 2026-09-08 while adding loading states to the rest of the nav.**
Garreth's report was that page changes feel slow on the deployed app and that
opening an individual account is slow too. Eight routes were fixed; these three
were not, and the reason is a real defect rather than an oversight.

**Missing:** `/accounts`, the dashboard home `/`, and `/accounts/[profile]`.

**Why.** A `loading.tsx` covers every nested route that has no loading.tsx of
its own, and `/accounts/[profile]` calls `notFound()`. With a boundary above it
the shell streams and the status is committed before the page decides the
profile is missing. Measured both ways against a running dev server rather than
reasoned about:

```
no loading.tsx                /accounts/9999 -> 404   correct
(dashboard)/loading.tsx       /accounts/9999 -> 200   wrong
accounts/loading.tsx          /accounts/9999 -> 200   wrong
both reverted                 /accounts/9999 -> 404   correct
```

Either file alone is enough to break it. `npm run build` passes in every one of
those states, so **only checking the status code catches this** — it is
invisible to the build, to tsc and to eslint.

This is the same wall the cache-components spike hit (see that entry, step 2).
Two entries now block on one defect.

**The fix is on the profile page, not on the skeletons.** That route has to
settle whether the profile exists before its shell is sent — resolve the lookup
above the boundary, or give the segment a route handler that can 404 early.
Once a missing profile still returns 404 with a boundary above it, all three
pages can have a loading.tsx and the cache-components migration loses its
step-2 blocker at the same time.

**Do not skip the check when picking this up.** `curl -o /dev/null -w "%{http_code}"`
against a real profile and a made-up one, with the dev server running and
`AUTH_BYPASS=true`. Production redirects to login before the page renders, so
the live site cannot answer this.

**Worth knowing about the rest of the work:** the eight routes that did get a
loading state are at `src/app/(dashboard)/*/loading.tsx`, sharing
`TableSkeleton` (40px row pitch, matching `py-2.5` on `text-sm`) and, for
analytics, `AnalyticsSkeleton`, which the view also uses during a range switch.
Anything added for these three pages should reuse both rather than start again.

---

## Light mode does not hold up

**Raised by Garreth 2026-09-08: "as of now it doesn't look good."** No specific
screen named yet — treat the survey below as a starting point, not the scope.

The tokens themselves are complete. `globals.css` defines a full light palette
(`--bg #eef0f2`, card, sunken, raised, border, text) and the theme toggle
already works. So this is not missing plumbing; it is that the design language
was drawn for dark and light was derived from it.

**What light mode switches off, all at once:**

```
--glow-a / --glow-b      transparent
--glow-blur              0px
--glow-rail(-bottom)     none
--glass-blur             none
--overlay-blur           none
--glass-highlight        0 0 #0000
--dot-opacity            0
```

Every one of those is deliberate — glow and glass on a light ground read as
smudge, not depth. But together they are the whole visual identity, so the
light theme is not the dark theme lit differently, it is flat grey cards with
no texture, no depth cue and no rim. That is the likeliest reason it reads as
unfinished. Light needs its own device doing the job glow does in dark —
shadow, a hairline, tighter borders — rather than the dark one turned off.

**One outright bug, cheap to fix.** Four hardcoded whites survive the swap and
are near-invisible on `#eef0f2`:

```
analytics-charts.tsx:100      CartesianGrid  stroke rgba(255,255,255,0.055)
analytics-charts.tsx:118      Tooltip cursor stroke rgba(255,255,255,0.28)
account-analytics-view.tsx:181  CartesianGrid  same
account-analytics-view.tsx:211  Tooltip cursor same
```

Both charts lose their gridlines and hover cursor in light mode. These are the
only hardcoded colours left in `src/components` — everything else already goes
through tokens — so the fix is four lines pointing at a token instead.

**The accent differs between themes:** `#22d3ee` dark, `#0e7490` light. That is
correct — the dark cyan would glare on a light ground — but it means "the cyan
accent is locked" only pins the dark value, and the light one has had far less
scrutiny.

**Suggested order:** the four chart colours first, since they are a real bug and
cost minutes. Then ask Garreth which screens look worst and what "good" means
here, because replacing glow with a light-mode equivalent is a design decision
and this entry cannot make it for him.

---

## TikTok ingest — storm fixed, run still fails

**Checked 2026-09-08 against the 2026-09-07 12:30 UTC run (execution `147426`).**
Four of the five checks pass. The item stays open because the run still
errors, for a different and much smaller reason than before.

| check | before (09-06) | after (09-07) | verdict |
|---|---|---|---|
| gateway timeouts | `504` x65, avg 160s | **zero** | pass |
| total requests | 99 for ~35 chunks | **31** — one try each | pass |
| spread | 35 in one second | peak 4/sec over ~12s | pass |
| dashboard during window | 65 gateway failures | 2 errors project-wide | pass |
| run succeeds | error, 10-18 min | **error, 4 min** | fail |

**Where it failed.** Not at a read node, which is what this entry predicted.
The last database call of the run is a single **`520`** on the upsert itself
at 12:32:58 (2.0s), and the execution stops at 12:33:59. One request, no
storm behind it. Reconstructed from `edge_logs` rather than n8n's own error
text: `get_workflow_execution` with `includeData: true` expires the MCP
session every time while metadata-only works, so the node's message was
never readable. Worth another attempt from a fresh session.

**The thread underneath.** Batching stopped the upserts fighting each other,
but each one is still slow — 59s, 51.7s, 41.4s, 35.9s in that run, against
this entry's own "well under 5s" target, averaging 12-21s. A request held
open for a minute is a request exposed to exactly the transient gateway
error that ended this run. So the batching fix treated the symptom and the
per-write cost is untouched.

**Next.** Wednesday **2026-09-09, 08:30 ET / 12:30 UTC** is the next
scheduled run, and that is the same day the mobile work is planned — check
this before starting, it costs one query and the log window is only 24h.
The run is the free test: succeed and this was a flake and
the item closes; fail at the upsert again and it is a pattern. Two levers if
so — PostgREST's pool size, already named below, and the per-row
`match_content_id` trigger that makes each write expensive in the first
place (~46 ms/row, see `tt-upsert-trigger-timeout` in project memory).

**Rows did land:** 44 written, latest ingest 12:36:11 that morning, 2,248
total. Note that 12:36 is after the execution stopped at 12:33:59 — either
another workflow writes this table or a retry landed late. Unexplained, low
stakes, worth a glance if someone is in here anyway.

<details>
<summary>Original plan and the five checks, kept for the next run</summary>

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

</details>

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

## Fill the content-intelligence tables — the carousel generator's backend

**Deferred 2026-09-10 (Garreth): this lands with the carousel generator app,
which is a V2 build in its own right and will be integrated into this
dashboard.** Nothing here is blocked and nothing is broken. It is parked because
the thing that consumes it does not exist yet.

**The state, checked live on 2026-09-10 rather than assumed.** All seven tables
exist in `qlcmgxgwpzmiebzxflai` with the correct `bigint` source keys, and every
one of them holds **zero rows**:

| Table | Rows |
|---|---|
| `references_unified` (existing catalog) | **3,468** |
| `reference_analysis` | 0 |
| `reference_beats` | 0 |
| `angle_blueprints` | 0 |
| `carousel_briefs` | 0 |
| `carousel_drafts` | 0 |
| `carousel_draft_slides` | 0 |
| `search_chunks` | 0 |

So there are 3,468 collected sources and no analysis of any of them. The schema
landed; the pipeline was never built. **Creating the tables did not enqueue
anything** — the migration is DDL with no seed and no backfill, and no worker
writes to them today.

**Read `supabase/migrations/20260909123000_content_intelligence_engine.sql`
first.** It is the reconstructed-from-live copy of that schema and carries the
constraints in full. Four things in it will bite whoever builds the worker:

- **`search_chunks` has two different uniqueness rules,** enforced by two
  partial indexes: `(source_reference_id, kind)` when `beat_id IS NULL`, and
  `(source_reference_id, beat_id, kind)` when it is not. One generic PostgREST
  upsert will not serve both — pick the conflict target per scope.
- **There is no chunk position field.** Multiple transcript segments for one
  source cannot all be source-level `kind = 'transcript'`. Decide the grouping
  before writing the first chunk, not after.
- **`updated_at` defaults to `now()` and never updates itself.** No trigger
  exists. Either the worker maintains it or a migration adds a trigger — until
  then it is a creation timestamp wearing the wrong name, and cannot be used to
  measure processing freshness.
- **`analysis_version` is a label, not a history.** `source_reference_id` is
  unique on `reference_analysis`, so a re-analysis overwrites; it does not keep
  the previous one.

**Tested, output seen and human-approved are three separate facts, and the
schema only half-covers them** — `reference_analysis` has approval but no
internal-test or output-seen field; `angle_blueprints` has
`internal_test_status` but no approval record. Watching a creator's video is not
an internal production test. Decide those fields or a provenance table before
building any reporting on top, and default both to "No" until there is
evidence. Do not count JSON-can-hold-it as covered.

**RLS is on for all seven with zero policies** — service-role workers only,
confirmed live. An empty result from an ordinary client key is not evidence the
table is empty. Do not disable RLS or put a service key in browser code.

**Also worth knowing:** the two source pointers on `carousel_draft_slides` are
individually constrained but nothing enforces that the beat belongs to that
source, and `selected_reference_ids` is a plain `bigint[]` with no FK — neither
existence nor cleanup is enforced. The worker validates these or a later
migration does.

**Done when:** a source can be traced end to end — reference to analysis to
beats to chunks, and a brief to drafts to slides — with real creator
provenance, and a failed video retrieval stays visible as a failed work item
instead of vanishing from the corpus.

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

---

## Set up new accounts from inside the dashboard

**Deferred at plan time, 2026-08-28 (Garreth)** — recorded in
`PM_DASHBOARD_V1_PLAN.md` §12, the v2 parking lot, under the heading "recorded
per Garreth's instruction — do not build". Moved here 2026-09-09 so the
deferred list is in one place; §12 is still the original record.

Today, provisioning an account means driving n8n by hand. The point of this
entry is to front that from the app.

**The dashboard does not re-implement provisioning.** Same delegation pattern as
the post-ban button (plan §9.4): the chain already exists and already works.

| stage | workflow | what it does |
|---|---|---|
| intake | `[Ops] Provision Intake` (`R83SqVUQLs59y3If`) | single or bulk-CSV kickoff into `provision_queue` |
| orchestration | `[Ops] Provision Orchestrator` (`3ydBlv6JhPgG5NT8`) | one row at a time; calls Create Geelark Profile / Factory Reset / Account Setup / Play-Store-region sub-workflows |
| writeback | `[Ops] Write Back TikTok Account` (`GhBGyWnbJ67qEWv0`) | post-signup writeback |

**Dashboard scope.** An intake form (character, platform, count, signup path),
queue submission, and a **progress board over `provision_queue` +
`orchestrator_runs`** showing each account's stage.

**The part that is easy to get wrong.** Two stages the SOP requires are
*manual*: the Google login on the google path, and creating the TikTok account
itself. The board has to surface those as "waiting on human" states with a clear
hand-back. It must not present them as automated — a progress bar that appears
to be running while it is actually waiting on a person is worse than no board.

**Already accounted for in v1.** The accounts detail page's data layer was
designed knowing provisioning states will eventually sit alongside live
accounts. Nothing was built for it, but the shape should not fight this.

---

# V3 — architecture

Structural work on how the automations are built. Nothing here changes a screen,
and none of it blocks a release.

**Context, established 2026-09-09.** Garreth asked whether the n8n automations
should be replaced by scripts. The answer was **no wholesale migration, extract
selectively** — the entries below are that shortlist. Two findings shaped it and
are worth keeping:

1. **The dashboard is not coupled to n8n.** It reads Supabase; n8n writes
   Supabase. The only direct contact is the post-ban webhook and the live
   provider APIs the app calls itself. So automations can be replaced **one at a
   time** and the dashboard will not notice. No cutover is needed, ever.
2. **Migrating would not fix the current bugs.** The TikTok ingest failure and
   the "Supabase unreachable" entry in V1 are both database-side — the per-row
   `match_content_id` trigger (~46 ms/row) and PostgREST's pool under burst. A
   script firing the same writes hits the same wall. Do not start any of this
   expecting those to close.

**Scale, measured against the live instance on 2026-09-09:** 340 workflows
total, 103 active among the 200 most recently updated. The instance is shared
with unrelated projects (Hamming, YC GTM Hunter, Healtsy, Cleora, Virlo,
LinkedIn), so the Peptide Miracles share is roughly 40-60 live workflows — still
far too many to rewrite, which is the whole reason this list is a shortlist.

**What should stay in n8n regardless.** All GeeLark device provisioning and
warmup. Long-running, heavy external-API glue, and genuinely human-in-the-loop
(the Google login and the TikTok signup itself). Maximum effort, minimum gain.

## Extract the Smart Scheduler's logic into version-controlled code

**The highest-value item on this list.** The context doc says it plainly: the
Smart Scheduler's *entire* logic lives in one Code node, "Plan Day + Apply", in
`[Unified] Smart Scheduler` (`Jaf78Yt9XAuj9PNJ`) — to the point that the doc
tells you to read that node rather than its own description.

That is the brain of the business sitting in an unversioned text box. No diff,
no review, no tests, and no way to tell what changed when a scheduling rule
starts behaving differently.

**Shape.** Move the logic into a real repo with tests and have n8n call it over
HTTP. n8n keeps doing what it is good at — cron, retries, credentials, execution
history. Nothing around the node has to change, which is what makes this safe.

## Rewrite the TikTok ingest as a script — the pilot

`[TikTok Analytics] Engine — ScrapeCreators` (`84bcYyXfCgtLB7y4`). The right
first candidate, for reasons that have nothing to do with it being broken:

- **Pure data pipeline** — fetch, normalize, upsert. No devices, no humans.
- **Isolated.** Nothing else depends on how it runs, only on the rows it lands.
- **It already needs work** (see its V1 entry), and its remaining fixes —
  batching, backoff, chunk sizing — are things you express far better in code
  than in node parameters.

Treat the result as evidence for whether the rest of this list is worth doing,
not as a commitment to migrate anything else. **Read the V1 entry first** — the
per-write cost is a database problem and a rewrite does not solve it.

## Put the critical workflows under version control

**Most of what "move to scripts" was really asking for.** The wanted thing is
version control, review and testability — not a different runtime. Exporting the
critical workflows' JSON to git, and lifting their Code nodes into tested
modules that n8n calls, delivers that without a rewrite and without giving up
the scheduler, the retries or the credential store.

Worth doing before either entry above, since it makes both reviewable.

**Related, already tracked:** the six hardcoded service-role JWTs in
`84bcYyXfCgtLB7y4` are in V1 under "Also open". Worth doing regardless of which
direction any of this goes.
