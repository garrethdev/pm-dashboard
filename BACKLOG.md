# Backlog

Five lists. Check which one you are in before picking something up — they have
different bars for "done".

- **[From the 2026-09-09 code review](#from-the-2026-09-09-external-code-review)**
  is what is still open from the first review of this codebase by someone
  outside the project. **Nearly all of it is now closed** — as of 2026-09-11
  only the anon-key hardening and the unmonitored Virlo pipeline remain. Grouped by where it came from rather than by tier, because it
  shares one set of caveats about how far to trust it. Each entry says which
  tier it would otherwise sit in.
- **[Phone farm — dashboard tickets](#phone-farm--dashboard-tickets)** is
  the move off Geelark onto real iPhones, as numbered tickets PF-01 to PF-16,
  each marked ready now or blocked by what. Czedrick's list; build order is
  the table order.
- **[V1 — open work](#v1--open-work)** is the shipping product. Bugs, unverified
  fixes and decisions still owed. These block or degrade what is live now — with
  one deliberate exception at the end of the list, the anon-key security
  finding, which degrades nothing visible and is held open by instruction.
- **[V2 — deferred features](#v2--deferred-features)** is work that was
  understood, costed and consciously postponed. Nothing here is broken; none of
  it is blocked on discovery. Do not start one of these while a V1 item is open.
- **[V3 — architecture](#v3--architecture)** is structural work on how the
  automations are built, not on what the dashboard shows. Nothing here changes a
  screen. These are safe to do in any order and none of them block a release.

Newest first within each list.

---

# From the 2026-09-09 external code review

`PM-CODEBASE-REVIEW-2026-09-09.md` — the first review of this codebase by
someone outside the project. **Read this before picking up anything below it.**

**Almost all of it is now closed.** Six of its eight numbered findings were
fixed by 2026-09-10; the remaining two, plus every one of its smaller cautions,
were fixed on 2026-09-11 — including the last one, "no test suite and no CI".
All of it is in `CHANGELOG.md`. **Two things are left**, and they are both
below.

**How far to trust the document.** It was written against a ZIP snapshot rather
than this repo, so:

- **Every source link in it is dead** — they point into a deleted
  `/private/tmp/pm-review.*` folder.
- **Its line numbers are close but no longer exact.**
- **It cannot tell fixed from broken.** It predates six migrations and several
  commits, and it was already wrong about one finding when it was written.

Re-confirm anything from it against the live code before acting. Do not close an
item here by agreeing with the review.

## Who can reach the database — answered, hardening open in V1

**The review's only genuine security finding, and the one thing from it still
open by instruction rather than by effort.**

**The answer, measured live 2026-09-11 against `qlcmgxgwpzmiebzxflai`:** the
review was right, and it is worse than a ZIP could show. 155 of the 180 tables
in `public` have row-level security off *and* grant `anon` full
`SELECT/INSERT/UPDATE/DELETE`. A `GET /rest/v1/content_type_registry` carrying
only the anon key returned `200` with live rows from the open internet.

**Nothing has been revoked, per Garreth's instruction 2026-09-11 — do not
revoke.** The full finding, the counts, the blast-radius question and the
hardening plan live in
[Close the anon-key hole on the database](#close-the-anon-key-hole-on-the-database),
**last in V1**.

**Why it moved rather than closed.** The dashboard itself is not the exposure —
the anon key never reaches the browser and every read already goes through the
service role. What is left is a database-side hardening pass across 155 tables
and 172 functions, held open by an explicit instruction rather than by
uncertainty about what to do.

**Standing rule while it is open:** a migration that touches an existing
function must leave its grants alone. `content_type_stats` was rewritten on
09-11 and its `anon`/`authenticated` EXECUTE grants were deliberately preserved
— hardening one function inside an unrelated fix would make the eventual audit
harder, not easier, because the count would no longer mean what it says here.

## The Virlo research pipeline is not monitored

**A caution from the review. V1. Not part of the 2026-09-11 batch — still
open.**

The automation card tracks a fixed list of 14 workflows by ID. The Virlo
research, analysis and bridge workflows are not in it, so if they stop, nothing
on the dashboard says so.

Two things to keep in mind while fixing it: the card's state is derived from n8n
executions, which is not evidence that expected rows arrived; and
`analytics_freshness_check()` may already cover some feeds, but its SQL is not
in the repo.

## Settled — no action

**The review's "registry identity inconsistency" caution.**

`content_type_registry`'s primary key is `content_type` **alone** — checked live
2026-09-10, re-confirmed 2026-09-11. Patching by it is correct, and
cross-character collisions cannot happen. Only the code comments describing
`(content_type, character)` as the identity were wrong; those were corrected on
2026-09-11, along with the `divorce_story` / `divorce_stories` story that was
cited as evidence for them and was never evidence of anything — they are two
different content types.

**Do not "fix" the joins on the strength of those comments.**

## Also from the review, parked in V2

[Fill the content-intelligence tables](#fill-the-content-intelligence-tables--the-carousel-generators-backend)
— the seven knowledge tables exist and are all empty against 3,468 collected
sources. Deferred with the carousel generator that will consume them.

---

# Phone farm — dashboard tickets

**Decided 2026-09-16 (Garreth); ticketed 2026-09-17 at his request.** Accounts
are being restricted and banned on Geelark cloud phones, so the fleet moves to
real iPhones that Yurie warms up and posts from, with warmup scripted later
from a MacBook Air beside the phones. Posting stays human. Czedrick owns every
ticket here. Plan of record: `docs/REAL-PHONE-MASTERPLAN.md`; what is borrowed
from iOS Farm and Kevs-IOS-Agents: `docs/PHONE-FARM-TOOLING.md`; the sheet
Yurie and Czedrick tick: `~/Documents/Geelark Exit Plan.xlsx` (outside the repo).

**Two facts before touching anything.** Geelark is only the hands in this
codebase: the Posting Agent (`lioNzkWRocyDvZS5`) is the one workflow that sends
a post to a phone, the warmup workflows (`QDUtABHSG4FMTrQX`, `3AsUAUOwUgXa60cy`)
are the only ones that warm one, and `geelark_tasks` is the only proof today
that either happened. The Smart Scheduler, the age ramp, the content gates, the
caption matching into `tt_post_performance` and Inventory never touch it. And
the whole migration hangs on one new column, `accounts.delivery_mode`, so
accounts still on Geelark keep working untouched and move one at a time. All 32
accounts are already `posting_paused` (2026-09-14).

**Status key.** *Ready now* = nothing in the way, start today. *Blocked by
PF-xx* = needs that ticket merged first. *Blocked by hardware* = needs the
phones or the Air in Yurie's hands. Order within the list is build order.

| # | Ticket | Phase | Status |
|---|---|---|---|
| PF-01 | `accounts.delivery_mode` switch | Immediate | Ready now |
| PF-02 | `devices` table + Devices page | Immediate | Ready now |
| PF-08 | Facebook as a platform | Immediate | Ready now |
| PF-03 | Move to phone button | Immediate | Blocked by PF-01, PF-02 |
| PF-04 | `warmup_sessions` + log form + health-dot union | Immediate | Blocked by PF-02 |
| PF-05 | `post_deliveries` table | Immediate | Blocked by PF-01, PF-02 |
| PF-06 | Posting Agent fork (n8n) | Immediate | Blocked by PF-05 |
| PF-07 | Posting To-Do page | Immediate | Blocked by PF-05 |
| PF-11 | Post-ban branch for manual accounts | Intermediate | Blocked by PF-01 |
| PF-09 | Health detector + Incidents read both delivery sources | Intermediate | Blocked by PF-05 |
| PF-12 | Morning reminder + stale-item alert (n8n) | Intermediate | Blocked by PF-05, PF-07 |
| PF-10 | Comparison view | Intermediate | Blocked by PF-03, PF-04, PF-05 |
| PF-13 | Write path for the warmup script | Long term | Blocked by PF-04 |
| PF-14 | Live view page on the Air, linked from the dashboard | Long term | Blocked by hardware (Air + WebDriverAgent installed) |
| PF-15 | Batch flips by character | Long term | Blocked by PF-03; optional |
| PF-16 | Retire Geelark: workflows, app code, keys | Long term | Blocked by the last account moving, and by the n8n credential move |

## PF-01 · `accounts.delivery_mode` — Ready now

`geelark` or `manual`, default `geelark`. Shown as a pill on the Accounts table,
editable on the account page, audit-logged like the pause toggle.
*Done when:* an account can be flipped from the app and the row in
`dashboard_audit_log` says who and when.

## PF-02 · `devices` table + Devices page — Ready now

One row per physical phone: name, model, iOS version, proxy, timezone,
whoer.net proof screenshot, `is_active`, notes. `accounts.device_id` nullable
FK. Rule enforced in the app: at most three accounts per device.
`geelark_profile` stays as-is for the old fleet.
*Done when:* Yurie can register a phone with its proof screenshot and see
which accounts it holds.

## PF-08 · Facebook as a platform — Ready now

`accounts.platform` and `content_type_registry` know only `tiktok` and
`instagram`; each phone carries one character's Instagram + Facebook, so
Facebook rows need to exist and show on the Accounts table, the Posting To-Do
page (PF-07) and the warmup log (PF-04). Performance ingest for Facebook is a
separate, later question and not part of this ticket.
*Done when:* a Facebook account row can be created, filtered and moved to a
phone like any other.

## PF-03 · Move to phone — Blocked by PF-01, PF-02

Button on the account page: pick a device, set `delivery_mode = manual`, record
`moved_to_device_at`, write an audit row. Does **not** unpause. That date is
what the comparison view (PF-10) splits on.
*Done when:* one click does all four and the account shows its phone.

## PF-04 · `warmup_sessions` + log form — Blocked by PF-02

Columns: `device_id`, `account_id`, `started_at`, `minutes`, `mode`
(`manual` | `script`), `note`. A quick log form on the device page and on the
account page. Point `v_account_warmup_health` at the union of Geelark
type-42/90 tasks and these rows so the green/yellow/red dot means the same
thing for both fleets.
*Done when:* a logged session turns a moved account's dot green.

## PF-05 · `post_deliveries` — Blocked by PF-01, PF-02

One row per post handed to a person: content row (source table + id, same
shape `content_type_registry` uses), `account_id`, `device_id`, `status`
(`queued` | `posted` | `failed` | `skipped`), `post_url`, `note`, `done_by`,
`done_at`. This becomes the "actually posted" signal that
`geelark_tasks.status = 3` is today.
*Done when:* the table exists with RLS matching the other app-written tables
and a row can be inserted and flipped from the app.

## PF-06 · Posting Agent fork — Blocked by PF-05

In `[Unified] Posting Agent` (`lioNzkWRocyDvZS5`): for
`delivery_mode = manual`, write a `queued` delivery row and leave the content
row `Ready`; do not call Geelark. Geelark accounts follow the existing path
unchanged. Save, compare `versionId` vs `activeVersionId`, **publish** — an
unpublished draft is the classic miss.
*Done when:* a manual-mode test account gets a queued row and no Geelark task,
on a real 10:00 ET run.

## PF-07 · Posting To-Do page — Blocked by PF-05

Built for a phone screen. Per account: today's queued items with a video
download button, a caption copy button, **Posted** (asks for the post link) and
**Failed** (asks why). Posted flips `posting_status` and stores the link, which
also closes the long-open gap that post URLs were never captured (ticket #227).
*Done when:* Yurie can complete a delivery from the iPhone's browser.

## PF-11 · Post-ban branch for manual accounts — Blocked by PF-01

`[Ops] Post-Ban System` (`WmichajTDXL0pT1z`) deletes a Geelark phone; for
`delivery_mode = manual` skip that and surface a checklist instead: sign out
on the device, release queued content, retire proxy and number. Same audit
trail.
*Done when:* dry-run on a manual account shows the checklist and touches no
Geelark endpoint.

## PF-09 · Health detector + Incidents read both sources — Blocked by PF-05

The delivery-failure guard in `v_account_health_v3` and the failed-deliveries
source in `src/lib/data/incidents.ts` read `geelark_tasks` only; add
`post_deliveries` beside it so a manual account is judged by the same rules and
never looks silent. Same "quieter than it is" failure mode as the poller blind
spot.
*Done when:* a manual account with two failed deliveries in 7 days shows the
same delivery-failure reason a Geelark account would.

## PF-12 · Morning reminder + stale-item alert — Blocked by PF-05, PF-07

n8n: the day's queued deliveries per device each morning; an alert when a
delivery sits `queued` past 24 h. A human queue strands more easily than a
robot.
*Done when:* one morning email received and one stale alert fired on a test
row.

## PF-10 · Comparison view — Blocked by PF-03, PF-04, PF-05

Each moved account before and after `moved_to_device_at`: views per post,
share under 10 views, warmup dot, restrictions and bans; plus the Geelark
cohort of the same character. This is what the week-6 review reads.
*Done when:* Garreth and Yurie can read one moved account's before/after on
one screen.

## PF-13 · Write path for the warmup script — Blocked by PF-04

The script lives on the Air, outside this repo. It needs a way to insert
`warmup_sessions` rows with `mode = 'script'`: a service-role key kept on the
Air, or a small authenticated endpoint. Nothing else in the app changes.
*Done when:* a row inserted from the Air shows on the dashboard within a
minute.

## PF-14 · Live view page — Blocked by hardware

Garreth, 2026-09-17: required, not optional. WebDriverAgent serves each phone's
screen as an MJPEG stream on its own port. A small page served from the Air
tiles every connected phone's live screen and passes tap/swipe back. Reachable
over Tailscale only (the Air sits on home Wi-Fi), so the dashboard links to it
rather than embedding it. Reference: iOS Farm's live-view panel
(github.com/Git-Agni/prod-FARM-IOS-Core, Apache-2.0); borrow the stream
handling, not the app. Blocked until the Air has Xcode signed in and the agent
installed on at least one phone.
*Done when:* Czedrick sees both phones live from his own Mac and can tap one.

## PF-15 · Batch flips — Blocked by PF-03; optional

Multi-select Move to phone by character, for when phones arrive in batches.
Not needed for the pilot.

## PF-16 · Retire Geelark — Blocked by the last account moving

In order: unpublish Warmup Scheduler, GPS drift, the Geelark branch of the
Posting Agent, Task Detail Poller, Wallet Guard (unpublish, do not delete; keep
`geelark_tasks` read-only for forensics). Then remove from the app:
`src/lib/data/geelark.ts` phone list, `wallet.ts`, `geelark-writes.ts`,
`/api/proxies/replace`, the Geelark probe in `/api/health`, the phones card on
the homepage. Then rotate the Geelark key and the inline Supabase keys. The
key rotation is also blocked by the plaintext keys in the Posting Agent, Smart
Scheduler and Virlo bridge — move those to n8n credentials first (see the n8n
credentials note in memory).
*Done when:* no live workflow or app route calls Geelark and the old key is
dead.

**Not tickets, but on the sheet:** Tailscale + Screen Sharing on the Air,
installing Xcode and the developer Apple ID (Yurie), installing WebDriverAgent
on the phones (Czedrick, remote), stopping a moved account's Geelark warmups on
move day, unpausing after the re-warm, and the warmup scripts themselves.

**Supersedes:** the V3 line "All GeeLark device provisioning and warmup should
stay in n8n regardless" (2026-09-09), and partly the V2 "Set up new accounts
from inside the dashboard" entry, since a real-phone account has no Geelark
profile to create.

---

# V1 — open work

## Move accounts off Geelark onto real iPhones

**Ticketed separately — see [Phone farm — dashboard tickets](#phone-farm--dashboard-tickets)
above.** Decided 2026-09-16 (Garreth); tickets PF-01 to PF-16 carry the
scope, the blockers and the done-whens. Plan of record:
`docs/REAL-PHONE-MASTERPLAN.md`; tooling decisions: `docs/PHONE-FARM-TOOLING.md`;
task sheet for Yurie and Czedrick: `~/Documents/Geelark Exit Plan.xlsx`.

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

**One extra thing to carry across, added 2026-09-11:** `cache.test.ts` reads the
source of `src/lib/data/` and checks that every cache family a fetcher asks for
is one the Refresh button knows how to clear. Whatever replaces `DATA_TAGS` has
to keep an equivalent check — the fault it catches (Refresh silently doing
nothing for a panel) has no error message and no type that can express it.

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

**Seen twice on 2026-09-08, from two unrelated directions, and by Garreth
"a couple of times" since.** Same root cause. The app used to blame the wrong
thing; as of 2026-09-11 the message is honest, but the slowdown causing it is
still here.

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

1. ~~**Fix the message.**~~ **Done 2026-09-11.** A timeout is not
   unreachability, and the copy no longer says it is: it now says the far end
   took too long and is probably still running, names the usual cause (several
   panels reloading at once) and points at Refresh. A far
   end that genuinely answered with an error quotes the status code instead.
   The timeout itself is unchanged at 10s — it was not raised to hide the
   problem, and raising it would only move the symptom. **This makes the screen
   honest; the slowdown below is untouched, so levers 2 and 3 still stand.**
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

**One outright bug — DONE 2026-09-12 (`178a12b`).** Four hardcoded whites used
to survive the swap and were near-invisible on `#eef0f2`: the `CartesianGrid`
and the `Tooltip` cursor, in both `analytics-charts.tsx` and
`account-analytics-view.tsx`. They now read `--chart-grid` and `--chart-cursor`,
whose dark values are byte-identical to what shipped and whose light values are
their own. Those were the last hardcoded colours in `src/components`.

Checked on `docs/design-system.html`, which carries the same token block under
the parity test — **not** in the running app in light mode, because headless
light-mode capture of the app does not complete. Still worth thirty seconds at
`/analytics` with the toggle flipped.

**The analytics charts need a light-mode design pass — not just visible lines.**
**Raised by Garreth 2026-09-12.** Tokens made the grid and cursor *present*; they
did not make the charts look *designed* on a pale ground, and that is the actual
ask. The chart language was drawn for dark and every device it leans on is
either switched off or weaker in light:

- **The gradient area fill under each line** was tuned to fade into a dark card.
  On `#eef0f2` a fade to transparent has much less to fade into, so the fill
  either barely registers or muddies the ground.
- **No glow, no rim, no dot grid.** In dark, those separate the plot from the
  card. In light the plot sits directly on flat grey with nothing framing it.
- **The two series colours are the platform and must stay legible as such** —
  cyan is always TikTok, blue always Instagram. The accent's light value
  (`#0e7490`) has had far less scrutiny than the dark one, and the pair has to
  stay distinguishable from each other *and* from the new grid on a pale ground.
- **Axis labels, tooltip surface and the empty/one-point states** were all read
  against a dark card and none has been looked at in light.

Chart rules live in §6 of `docs/DESIGN-TOKENS.md` and the Chart section of
`docs/design-system.html`; whatever is decided here updates `globals.css` first,
then both of those, or the parity test fails.

**The accent differs between themes:** `#22d3ee` dark, `#0e7490` light. That is
correct — the dark cyan would glare on a light ground — but it means "the cyan
accent is locked" only pins the dark value, and the light one has had far less
scrutiny.

**Suggested order:** the four chart colours are done. Next is the chart design
pass above — it is the one piece with a named owner and a clear surface, and
`/analytics` in light mode is the place to start looking. Then ask Garreth which
other screens look worst and what "good" means here, because replacing glow with
a light-mode equivalent is a design decision and this entry cannot make it for
him.

---

## TikTok ingest — storm fixed, run still fails

> **UPDATE 2026-09-11 — root cause found, headroom fix applied, structural fix
> still open.** "The thread underneath" below was right, and it is now measured.
> The failing node is the upsert, and it is a **Postgres `statement_timeout`**,
> not a gateway flake: 10-row chunks took 10–19s each and 17 crossed the 30s
> `service_role` ceiling between 12:16 and 12:18 UTC on 09-11, logging
> `canceling statement due to statement timeout`. PostgREST drops the connection
> and n8n renders it as *"connection was aborted, perhaps the server is
> offline"*, which is why three separate investigations blamed the network. The
> node's `onError: stopWorkflow` then ended the run, so the judging and report
> half never executed — the unjudged outliers were a symptom, not a cause.
>
> **The missing piece this entry never had:** `ON CONFLICT` does **not** spare
> the trigger. Postgres fires a BEFORE INSERT trigger for every row, including
> the ones that resolve to UPDATE, so refreshing 250 existing rows costs exactly
> as much as inserting 250 new ones. That is why per-write cost never improved.
>
> **Applied:** chunk 10 → 5 in both the engine and the new gap-day workflow
> (~5–9s per statement), plus the one missing prefix index
> (`cleora_content.caption`; 29/29 covered now, though at 44 rows it was never
> the cause). Both published and verified.
>
> **Still open, and this is the real fix:** stop doing caption attribution inside
> a per-row BEFORE INSERT trigger. `match_content_id` loops ~29 registered
> caption columns per row and retries all of them on a 60-char prefix when the
> first pass misses. Halving the chunk buys headroom; it does not reduce that
> cost, and the cost grows with every content type added to the registry. Move it
> to a batched post-insert pass, or skip it when the row already exists.
>
> **Also unexplained:** the gap-day workflow runs the identical upsert at the
> same chunk size and averaged 0.6s per chunk against the engine's 10–19s. Worth
> knowing before assuming the engine is fixed.

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

## Close the anon-key hole on the database

**The 2026-09-09 review's only genuine security finding, measured live
2026-09-11. Promoted to V1 by Garreth 2026-09-11 — it sits last in this list by
position, not by priority.**

Unlike the rest of V1 this is not a broken screen or an unverified fix: nothing
about it is visible in the product, and leaving it open degrades nothing a user
would notice. It is here because it is the only open item whose downside is
someone else's action rather than a defect of our own.

**Standing instruction, Garreth 2026-09-11: do not revoke anything for now.**
Everything below is written to be picked up later, in order. Nothing in it has
been applied.

### The findings

Measured against the live database (`qlcmgxgwpzmiebzxflai`), not inferred from
the review document:

| | count |
|---|---|
| Tables in `public` | 180 |
| **RLS off _and_ `anon` holds SELECT/INSERT/UPDATE/DELETE** | **155** |
| RLS on with **zero** policies — effectively locked, service role only | 16 |
| RLS on with policies — never reviewed | 9 |
| Functions in `public` executable by `anon` | 172 of 175 |

`anon` and `authenticated` each hold `SELECT, INSERT, UPDATE, DELETE, TRUNCATE,
REFERENCES, TRIGGER` on 231 objects. The two are identical, so signing in
changes nothing.

**Proven, not assumed:** a `GET /rest/v1/content_type_registry` sent over the
open internet carrying only the anon key returned `200` with live rows. Read,
write and delete on the operational data are available to anyone holding that
key.

**The 16 RLS-on/zero-policy tables are the correct shape.** RLS with no policy
denies every role except the service role, which bypasses it. That is the target
state for the other 155 — the fix is not "write 155 policies", it is "grant
nothing and turn RLS on".

### "It is an internal app" — what that does and does not cover

**Established by Garreth 2026-09-11.** The dashboard is for the team only. That
is real and it lowers the odds, but it is worth being precise about what it
protects, because the honest answer is "the app, and nothing else":

- **The app being internal does not make the database internal.** PostgREST sits
  on the public internet at `<project>.supabase.co/rest/v1/...` regardless of
  who the dashboard is for. The `200` recorded above was fetched from outside
  the network.
- **Public signup is enabled.** Checked live 2026-09-11:
  `GET /auth/v1/settings` returns `disable_signup: false` with the email
  provider on. Anyone holding the anon key can create an account against this
  project and confirm it from their own inbox. `ALLOWED_EMAILS` stops them at
  the dashboard's front door; it does not stop them getting a valid
  `authenticated` JWT.

**Today that escalates nothing**, because `anon` already holds everything
`authenticated` does — same precondition, same access. It matters for the *fix*,
and it is the reason the revoke below names both roles. See the warning in
step 2.

**Done when** (small, separable, and worth doing even while the revoke is
parked): decide whether signup should be open at all. If the team is a fixed
list, turning signup off in the Supabase dashboard costs nothing and removes a
whole class of future mistake.

### What is *not* wrong, and why the urgency is lower than the numbers suggest

Both verified 2026-09-11. Re-check both before acting, because if either stops
being true the tier changes:

- **The anon key never reaches the browser.** No `NEXT_PUBLIC_` anything in
  `src/` or in either env file; `.env.example` carries a comment saying to keep
  it that way.
- **The grants are not load-bearing for the dashboard.** `SUPABASE_ANON_KEY`
  appears in exactly three places — `proxy.ts`, `lib/supabase/server.ts`, and
  the health probe — and all three are auth-only (`auth.getUser()`, session
  cookie refresh). Every data read and write goes through the service role in
  `lib/supabase/admin.ts`.

So the exposure is a key that has not leaked, rather than an open door on the
public site. That is worth being honest about in both directions: it is why this
sat outside V1 until it was promoted, and it is also not a control. A Supabase anon key
is designed to be publishable, it is one static JWT for the whole project, it
cannot be rotated per-consumer, and this project is shared.

### The work, in order

**1. Establish the blast radius — this gates everything else.**

Six n8n credentials point at Supabase: `Supabase Service Role`, `Supabase`,
`Supabase Peptide Miracles`, `Supabase Peptide Miracles Production`, `Supabase
Research Agent`, `Supabase JobOps`. n8n never returns credential secrets, so
**which key each one holds is unknown** and the names are not evidence. If any
one of them carries the anon key, revoking breaks workflows silently across a
340-workflow instance.

Read the `role` claim out of each credential in the n8n UI, or apply the revoke
to a Supabase branch and run the workflows against it. Write down what each
credential holds — that list is worth having on its own.

**2. Revoke, naming both roles.**

**Do not revoke `anon` alone.** The instinct is that `authenticated` is "our
team" and can keep its grants — that is wrong here, because signup is open (see
above), so `authenticated` means anyone on the internet who bothered to register.
Revoking `anon` while keeping `authenticated` looks like a fix, closes nothing,
and is harder to spot the second time.

The 2026-09-10 `atomic_settings_writes` lesson applies exactly: `revoke … from
public` does **not** remove a grant Supabase made to `anon` and `authenticated`
by name, and a named grant survives a revoke from PUBLIC. That mistake shipped
once already.

```sql
-- per table, for the 155
revoke all on table public.<name> from anon, authenticated;
alter table public.<name> enable row level security;  -- no policy = deny all

-- and the default for anything created later
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
```

**3. Do the same pass on the 172 anon-executable functions.** A locked table is
still reachable through a `security definer` function that reads it. Step 2 on
its own is a half-fix.

**4. Review the 9 RLS-on-with-policies tables.** Never looked at. A permissive
policy (`using (true)`) is the same hole wearing a policy.

**5. Read the ACL back and re-run the request.** Do not trust the migration's
exit code — read `proacl`/`role_table_grants` back and confirm `anon` and
`authenticated` are gone. Reading the ACL back is what caught the 09-10 mistake.

**Done when:** every n8n credential's key is known and written down, the revoke
is applied, the ACL read-back shows both roles gone, and the same anon `GET`
that returned `200` on 2026-09-11 returns `401`.


# V2 — deferred features

Each of these is deliberately parked, not unfinished. Every one records why it
was deferred and what is already confirmed, so it can start from evidence rather
than from a fresh investigation.

## Trends feed and search — what v1 deliberately leaves out

**Deferred by Garreth on 2026-09-17**, deciding the second round of the Trends
screen (design ticket D10, reopened in place). The feed and the search are
being designed and their dev tickets written now; these five pieces were looked
at the same day and consciously left for later. Nothing here is broken.

**A real trending signal.** The Feed's first chip says **"Trending in the
library"** and means exactly that: the best-scoring carousels we hold, then the
most-viewed, and no sense of *this week*. That is not a shortcut, it is the only
honest thing the data supports — `published_at` is empty on every carousel in
`references_unified` (checked live 2026-09-17), so there is no date to measure
rising against. When posting dates start arriving, add a recency term to the
ranking and the label can stop hedging. Until then the screen must not say
"Trending this week".

**Videos in the feed.** The feed shows carousels only, the same call D10 made
for digests on 2026-09-16, and the format filter in the feed's ranking function
is what enforces it. The reason is that nothing has read the videos yet — 235
`video_enrich` jobs were still queued on 2026-09-17. Revisit when video analysis
lands and there is something to show beyond a thumbnail.

**Team-shared favourites.** Save is personal: your saves, by the email you
signed in with. The `reference_favourites` table is shaped for the other case
anyway — it keeps who saved each one — so showing the whole team's saves later
is a change of filter, not a rebuild.

**Reranked search.** The library search (`search_carousel_library`) merges a
word search and a meaning search and can then re-score the winners with a
second model. v1 runs **without** that last step, because the handover's own
tests measured **13 to 33 seconds** with it on. A person will not wait that long
for a search box. Turn it back on only behind something that sets expectations —
a "better results, slower" switch, or a background pass — and measure again.

**A taxonomy endpoint.** The topic and hook-family pills on a card come straight
from `reference_analysis`, and the type chips under the tabs are the carousel
types. There is no endpoint that lists the possible values, so the screen cannot
offer a tidy list of topics to filter by. Worth building when the filters grow
past chips.

**Also settled that day, so nobody re-opens it:** the Studio hand-off is called
**Use as reference** everywhere (it used to be "Recreate this"), and the search
runs **server-side** in the app's own route handler, never from the browser, so
the database keys stay out of the page.

## The generator has no idea what a carousel is about

**Deferred by Garreth on 2026-09-16**, during D8's review, to be picked up when
the Carousel Generator's own build starts. Nothing is broken; the generator is
not built yet. This is the shape it has to be built in.

### What is missing

The generator can reach two shelves today: the **pictures** (D8's image
libraries, 127 to 1,200-odd images a library, each tagged by AI) and the
**examples** (`carousel_search_documents`, 23,572 posts from around the
internet that teach it what a good hook sounds like).

There is no third shelf: **the subjects**. The actual material a content type
writes about. Without it, "generate 20 carousels" has a house style and a
pile of photographs but nothing to be about.

Every scriptwriter that runs today already starts from that shelf. Confirmed in
n8n on 2026-09-16:

| Workflow | Reads | Writes |
|---|---|---|
| `[Cleora ASMR] Scriptwriter` | `cleora_story_candidates` (319) | `cleora_asmr` |
| `Divorce Scriptwriter` | `hook_stories` (101) | `divorce_story_content` |
| `[Embarrassed Angle] Scriptwriter` | `embarrassed_angle_sources` (72) + `machine_hooks` (2,831) | `embarrassed_angle_content` |
| `Covered Eye — Scriptwriter` | `covered_eye_carousel` rows with `slide_2` empty | the same rows, slides 2 to 6 |
| `[Celeb Verdict] Text Hook Writer` | `celebrity_verdict` (105) | `text_hook`, `before_line`, `after_line` on the same row |
| `Celebrity Script Personalizer` | `celebrity_verdict` | `char_script` |

### What generalises, and what does not

Six source tables were read side by side on 2026-09-16. **Five things every one
of them has**, whatever the content type: one row per subject; a title you can
read in a list; where it came from (`source_url`, `origin`, `primary_doc`,
`curation_source`); a go/no-go state (`vet_status`, `status`, `usable_seed`,
`locked`, `record_status`); and a measure of how good it is (`excitement`,
`excitement_score`, `quality`, `tier`, `verdict_confidence`). Those five carry
the list screen, the filters and "give me the next 20 that are ready".

**The researched fields themselves share nothing at all, and should not.**
Cleora's stories carry `the_thing`, `the_fear`, `mechanism`, `burial`; Cooking
carries `story_body` and `seam_line`; Embarrassed Angle carries
`embarrassment_type` and `physical_intensity`; Celebrity carries
`peptide_named` and `went_badly`. So the app must never name one of those
columns in its own code. It shows whatever columns a table has, and the type
declares which column is the title, the status and the score — exactly the way
`content_type_registry` already tells the Posting Agent and the Smart Scheduler
which column holds the date, the time, the profile and the id for all 25 types.

**Two things that are easy to get wrong:**

- **A type can draw on more than one source, and a source can be shared.**
  Embarrassed Angle reads its own clips *and* the shared hook pool; Cooking
  joins its stories to hand-written openers. One-source-per-type is too narrow.
- **`celebrity_verdict` is the outlier, not the model.** 137 columns holding
  research, written copy, rendered slide URLs and posting status in one row.
  Every other type keeps research and finished content in separate tables. It
  is the type that proves the shelf is needed; it is not the shape to copy.

### Where it belongs: the Studio's AI conversation (Garreth, 2026-09-16)

Not a screen of its own. **Creating a content type through the Studio's
conversation is the step that should create its data set**, because that is the
only moment when what the type is about is being decided. The AI should:
research the subject matter, propose and create the type's data-set table, and
from that hand over the instructions for building the template — so the
template's text layers and the columns they quote are designed together rather
than one being retrofitted to the other.

This extends D6 and D11, which today create the lane table and the template but
nothing to write from.

### Four pieces, when it starts

1. The registry says where a type's material lives, alongside the
   `source_table` it already records.
2. A type's page (D7) gains a tab listing that material and its state.
3. Generate (D2) asks *which rows*, not only *how many*. A type with no data
   set keeps today's form.
4. A Studio text layer can be filled **from the row**, so a printed year is the
   researched year rather than one the AI invented.

**Do not build the fact-level editing as the standard.** Correcting a single
researched value before the writer quotes it matters for Celebrity Peptide,
where copy quotes research word for word (`before_year: 2022` becomes "2022.
Struggling before any of this started."). Cleora's writer paraphrases a whole
story; there is nothing equivalent to correct. The general behaviour is
reviewing a row and marking it good or not, which every one of those tables
already has a column for.

### Left behind in the designs — one job, and it is part of this work

A facts panel on an image set was designed on 2026-09-16 and **rejected by
Garreth the same day**: facts are columns on a data-set row, not a property of
a folder of pictures. The panel was taken back off the canvas at once.

**The documents were corrected on 2026-09-16** — `CAROUSEL-TEMPLATE-MODEL.md`
§7.3 and its layer table, `CAROUSEL-GENERATOR-FLOWS.md` F7 and F8, and D6's,
D8's and D11's ticket entries. §7.3 now carries the reasoning, and every one of
them points here.

**What is still wrong is the artwork, and it is deliberately still wrong.** On
the **(D6 pt. 2 Studio)** canvas
(https://claude.ai/artifact/DdWFJ1M8acjehQbj36Wtr5) the approved D11 boards
show a text layer whose source reads **Set** with a **Fact** under it, and the
AI offering to add "Name", "Before year" and "After year" to Red Carpet Sets.
The same wording is in `d6-studio.build.mjs`, which is the Studio the
Prototype runs, so the click-through shows it too.

Those boards were not patched, because the honest replacement — what a text
layer bound to a row actually looks like, and what the AI proposes when the
data set has no column for a value a template needs — *is this backlog item*.
**Re-draw them as part of this work, in one pass.** Patching the word "Set" to
"Row" beforehand would only move the fiction.

## Music postability — show when a song will silently stop a post

**Deferred 2026-09-12 (Garreth): "Remove the music postability for now."**
Nothing was built. Nothing is broken. It is parked because the failure it guards
against is not currently happening — see the evidence below, which is the whole
point of writing this down rather than re-investigating later.

**What it would be.** Two computed states per song in `music_library`, surfaced
on any content row carrying a `music_id` and as "N rows blocked by music" in
inventory:

- postable on Instagram — `is_active` and `same_style_url` is set
- postable on TikTok — `is_active` and `tiktok_ref_video_id` is set

**Why it was on the list.** The Unified Poster attaches sound by reading a row's
`music_id`, looking the song up, and taking the Instagram reel URL or the TikTok
video id. If the song is switched off, or the reference for that platform is
missing, **the row is skipped and nothing is logged anywhere**. The row stays in
the pool and never posts. Silence is the entire problem — there is no error to
find.

**What is already confirmed (live, 2026-09-12), so nobody has to re-derive it:**

- **Nothing in the dashboard touches music at all.** Zero mentions across `src/`.
  This is a build from scratch, not an extension.
- **Seven content tables carry a `music_id`**: `cleora_asmr`,
  `conspiracy_kitchen`, `dating_profile_ba`, `divorce_story_content`,
  `celebrity_verdict`, `char3_before_after`, `char3_influencer_lying`. So it is a
  fleet-wide feature, not a Character 5 one.
- **Thirteen live lanes have `needs_music = true` but only seven tables have the
  column**, so the rest must pick music another way. That gap is unexplained and
  is the first thing to establish if this is picked up.
- **11 of the 76 active songs have neither an Instagram nor a TikTok reference.**
  Any row mapped to one of those is a silent skip waiting to happen.
- **But there is no live failure right now.** The lane that looks worst,
  `dating_profile_ba`, has 13 of 25 rows on reference-less songs — and all 13
  have already posted. Its two unposted rows are both on songs that do have
  references. Checked row by row.
- **Cleora ASMR, the lane that prompted this, is clean**: all 50 rows have a
  `music_id`, every song is active, and both platform references are present.
  `v_scheduler_pool` additionally requires `music_id IS NOT NULL` for that lane,
  so a row with no song never even reaches the pool.

**What would make this urgent.** A new batch mapped to songs whose references
were never sourced, or someone switching a song off in `music_library` while rows
still point at it. Either shows up as content that sits in the pool and never
posts, with nothing on any screen explaining why.

**Source.** `HANDOVER-character-5-cleora-cadence.md` §5.4 called this "the single
most useful build for lane 2". That was written before the reference sourcing was
finished; it has since been done, which is why the urgency dropped.

## Fill the content-intelligence tables — the carousel generator's backend

**Update 2026-09-14: the generator now has a plan, and most of these tables
are no longer empty.** Read `docs/CAROUSEL-GENERATOR-PLAN.md` first. The
carousel-search worker ran between 09-10 and 09-12: `reference_analysis` holds
1,073 rows, `reference_beats` 5,591, `search_chunks` 6,795, and
`carousel_search_documents` 21,893. Only the three generator tables
(`carousel_briefs`, `carousel_drafts`, `carousel_draft_slides`) are still at
zero, and the plan uses them as the generation record. The row counts and the
"no worker writes to them" line below are a 09-10 snapshot and are stale; the
four schema cautions still hold.

**Update 2026-09-17 (checked live, project `qlcmgxgwpzmiebzxflai`): the tables
below are not empty, and the zeros are kept only so the starting point is still
readable.** `references_unified` holds 4,293 rows, of which 1,246 are carousels
by 1,005 different creators; `reference_analysis` 1,511; `reference_beats`
8,287; `angle_blueprints` 480; `carousel_search_documents` 25,113. The workers
are still running — the last indexing job finished at 12:16 UTC that day and 235
video jobs were queued. Only `carousel_briefs`, `carousel_drafts` and
`carousel_draft_slides` are still at zero, which is right: they are the
generator's own record and the generator is not built. **Searching those
examples works today** — the function `search_carousel_library` merges a word
search and a meaning search and returns ranked posts — but **nothing in the app
calls it yet, and there is no screen for it**: that screen is the Trends feed
and search, designed 2026-09-17 (D10, round two) and written up as dev tickets
the same day. There is also **no feed ranking function, no favourites table and
no creator search** yet, and the hosted search API the original handover
described was never deployed, so the app calls the function itself, server-side.
The search schema lives outside this repo's `supabase/migrations`, so anything
new goes in here as a tracked migration.

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

*2026-09-16: partly absorbed by "Move to phone" in the V1 Geelark-exit entry —
a real-phone account has no Geelark profile to create, so the provisioning chain
below only applies while accounts are still created on Geelark.*

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

**How it is reached — specified by Garreth, 2026-09-12.** An **Add new account**
button on the Accounts table, opening a **separate page** rather than a modal.
That page holds two things:

- **the setup history** — every account that has been through provisioning, in
  order, with the stage it reached;
- **what is provisioned but not finished** — the accounts whose phone exists
  but whose data has not been written back.

The second list is the reason the page exists. Someone setting up an account
has to be able to see, without asking anyone, that an earlier account is still
unfinished and therefore is not in the dashboard at all. Today that fact lives
nowhere: not on a screen, not in an alert, not in a report.

A page, not a modal, because this is a list people come back to and link to —
and because the unfinished list should be visible when nobody is adding an
account at all.

**Keep it wordless.** Per the house rule on new screens, the page carries no
instruction text. The states have to be self-evident from what each row says —
if a row needs a paragraph explaining what "provisioned, not written back"
means, the row is named wrong.

**The part that is easy to get wrong.** Two stages the SOP requires are
*manual*: the Google login on the google path, and creating the TikTok account
itself. The board has to surface those as "waiting on human" states with a clear
hand-back. It must not present them as automated — a progress bar that appears
to be running while it is actually waiting on a person is worse than no board.

**The half that actually breaks — finishing the account, not starting it.**
Added 2026-09-12 after Profile 73, and this is now the strongest argument for
the whole entry. Provisioning works. What has no owner is the step *after* the
human creates the TikTok account: writing the handle, the character and the
creation date back onto the `accounts` row and switching it active.

Nothing enforces that, nothing chases it, and nothing shows it is outstanding.
A half-finished account is not a visible "in progress" state — it is simply
absent. `is_active` defaults to false, which is the same flag that hides
retired accounts, so the row falls behind the **Show retired** toggle and off
the Accounts page altogether. The warmup scheduler queries `is_active=eq.true`,
so it never sees it either. The account exists on TikTok, the phone exists in
GeeLark, and the system behaves as though neither does.

Measured on 2026-09-12 — three rows were stuck, in **two different states**,
and the page has to tell them apart:

| profile | created | state | how long |
| --- | --- | --- | --- |
| Profile 73 | 2026-08-30 | **account created, never written back** — live on TikTok, nobody recorded the handle | 12 days |
| Profile 67 | 2026-08-20 | **phone ready, no account created yet** (Garreth, 2026-09-12) | 23 days |
| Profile 68 | 2026-08-20 | **phone ready, no account created yet** (Garreth, 2026-09-12) | 23 days |

The two states need different things and must not be shown as one "incomplete"
bucket. Profiles 67 and 68 are waiting on someone to *make* an account — the
next action is on a person, outside the app. Profile 73 was waiting on someone
to *record* one — the next action is a form in the app, and the account was
quietly doing nothing on TikTok the whole time.

Profile 73 also shows the second-order cost: twelve days with no warmup, because
the warmup scheduler only reads active accounts. By the time it was switched on
it was eleven days old by the calendar and completely cold — old enough for the
age ramp to let it post immediately, with no history behind it.

**So the progress board is not a nice-to-have on top of the intake form — it is
the point.** An account should be visible from the moment its row is created,
showing which stage it is in and what is waiting on a person, and the "finish
setup" step should be a form in the app that writes the handle, character and
creation date in one go. Profiles 67 and 68 should have been on that page for
23 days saying *phone ready, no account created* — instead they are invisible,
and the only record that they exist at all is a line in the GLP sheet.

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

**What should stay in n8n regardless.** ~~All GeeLark device provisioning and
warmup.~~ *Superseded 2026-09-16 — see "Move accounts off Geelark onto real
iPhones" in V1; Geelark is being retired.* All GeeLark device provisioning and
warmup, for as long as Geelark is in use. Long-running, heavy external-API glue, and genuinely human-in-the-loop
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
