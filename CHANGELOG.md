# Changelog

What changed in this dashboard, newest first, in plain language.

Started 2026-09-10, when the codebase got its first review from someone outside
the project. Everything before that date was reconstructed from the git history
and is summarised rather than itemised — the commit messages are the detail.

## How to read this

- **Dates are when the change landed**, ET.
- **Every entry says where it came from** — a review finding, a bug seen in
  production, or a decision. That provenance is the reason this file exists: the
  next external review should be able to see what its predecessor caused.
- **A change is listed here only once it is in the repo.** Work that was
  considered and deferred belongs in `BACKLOG.md`, not here. If an entry says
  something is fixed, it compiled and it is on `main`.
- **Fixes that cannot be verified from a desk say so.** "Confirmed live" means a
  query or a run; anything else is a code change awaiting its first real use.

---

## 2026-09-11 (later) — "Supabase unreachable" was usually a lie

**From Garreth, after being told the code-style checker had 32 flags: "can we
do item 1", and — importantly — "I've encountered `Supabase unreachable` a
couple of times already".** That second remark changed what this was worth
doing. The flags were a tidy-up; the message they sat next to was misinforming
him.

### Fixed: panels blamed the database for something it had not done

Every panel that cannot load its data says so instead of going blank. They all
said the same thing: **"Supabase unreachable"**.

That was rarely true. On 2026-09-08 the database answered **every single
request with a success code** — no failures at all — but saving the cadence
expired every cached figure at once, 180 panels all went to fetch at the same
moment, and the database slowed to as much as 28 seconds. The dashboard gives
up waiting after 10. So the screen reported "unreachable" about a database that
was working fine, and sent Garreth looking for an outage that had never
happened.

**A timeout means we stopped waiting. It does not mean the other end is gone** —
if anything it means the opposite, since something genuinely down refuses
instantly. The three cases are now told apart:

- **We gave up waiting:** *"Supabase took too long to answer — it is probably
  still running. This usually happens when several panels reload at once. Press
  Refresh."*
- **It answered with an error:** *"Supabase answered with an error (503). Press
  Refresh to try again."*
- **Anything else:** the raw reason, claiming nothing.

**This makes the screen honest; it does not stop the slowdown.** The two
remaining fixes for that — not expiring every cache at once after a save, and
the database's connection limit — are still open in `BACKLOG.md`.

### Fixed: the safety net was wrapped around too much

**The review's finding, and the reason the message above could also have been
wrong in a second way.**

Those panels wrapped their safety net around two things at once: fetching the
data, *and* drawing the screen. It is only meant to catch the first. Anything
going wrong while **drawing** would have been caught by the same net and
reported as a data problem — telling you the database was unreadable when the
database was never asked.

Eight files now guard only the fetch. No visible change when everything works.

### Changed: the accounts table no longer takes a timestamp it ignored

Both places that show the accounts table worked out a "last updated" time,
formatted it, passed it in — and the table dropped it.

**Garreth's call: don't start showing it, delete it.** The "as of" on Analytics
and Content Types earns its place, because it reports when the numbers were last
collected *from TikTok and Instagram*, which can be a day or two ago. This one
only said when the server last read our own database — never more than 60
seconds, because that is how long the cache lives. A line permanently reading
"as of a few seconds ago" is clutter that answers nothing.

### Changed: the code-style checker now blocks a merge

It was reporting-only this morning, because 32 pre-existing flags would have
meant a permanently red build. **All 32 are gone**, so it blocks from now on:

- **26** were the safety-net shape above.
- **1** was the unused timestamp.
- **6** were pages that render once and immediately correct themselves. All six
  are correct as written — the light/dark switch is the clearest, since the
  server cannot know which theme you chose, so it must draw one and fix it the
  instant it reaches your browser. Each now carries a written reason on the
  line.

**None of them were cleared by switching a rule off**, which was the tempting
option and the one that would have made the check worthless. The workflow file
says so, for whoever meets a red build next.

---

## 2026-09-11 — six of the review's open findings, and the first tests

**From the 2026-09-09 external code review's remaining backlog, picked up by
Garreth on 2026-09-11.** Six items closed in one pass: the Refresh button, the
last of the cadence validation, unpaged performance reads, the platform-blind
profile card, double-counted lane performance, and the five smaller notes —
including the one the review put last, that there was no test suite.

Two things were **not** touched, deliberately. The anon-key database hardening
stays open on Garreth's instruction. The unmonitored Virlo pipeline was not part
of this batch and is still in `BACKLOG.md`.

### Fixed: Refresh did not refresh the page you were looking at

Pressing **Refresh** on Calendar, Analytics, Content Types, Demand/Supply or
Incident History did nothing visible, and had not for as long as those pages
have had range pickers. Two separate faults, stacked:

**The server never forgot four families of data.** Refresh works by naming the
caches it wants thrown away. Analytics, top content, the Demand/Supply rollup
and incident history each store one copy *per window you pick*, and none of them
had a name Refresh knew — so it threw away nothing for them, however many times
it was pressed. They now do, and so do the proxy-cheap and TextVerified
balances, which had simply been left off the list.

**The page ignored the new data even when it arrived.** These pages load their
first view from the server and then fetch every later window themselves. Refresh
re-ran the server half, which those pages are no longer listening to — so the
numbers on screen stayed exactly as they were. Each of them now reloads *the
window it is actually showing*, Demand/Supply keeping any what-if you have
applied. The spinner stays up until they have all finished, so when it stops the
figures under it really have been re-read.

**Also fixed while in there:** saving a cadence change left the Content Types
cards and the Demand/Supply demand figures showing the old allocation for up to
a minute, and a pause or retire left Demand/Supply showing pre-change targets.
Both now clear along with everything else the change moves.

### Fixed: the cadence editor was checking the browser against itself

Two-thirds of this was closed on 09-10. The rest:

**Sending the same lane twice got through.** Two entries for one content type
passed the "does it add up" check — 2 + 3 reads the same as 5 — and were caught
only by the database, as a failed save. The editor now says *"glowup is in the
list twice"* before anything is written.

**Which character a lane belonged to was taken from the browser.** The
request said "this lane is Character 4's", and the check compared that against
the character *the same request* had named — so it could never disagree. Every
lane's owner is now read from `content_type_registry`, which is where it has
always actually lived. A request that misnames a lane's character no longer
changes what happens; it just gets refused.

An unknown content type is now refused by name instead of quietly saving
nothing.

### Fixed: an account's totals would have started silently under-counting

Supabase answers at most 1000 rows per request and gives no sign when it has cut
you off — it looks exactly like an account that only ever had 1000 posts.
Nothing is wrong today: the busiest account has 203 rows, measured live. But
"Total views", "Highest" and the All-time analytics were one plain request each,
so the day an account crossed that line they would have quietly stopped growing
and nothing on screen would have said so. They now read through in pages.

**Not urgent when it was raised, and still not — this is a trap being closed
years early.** At current posting rates an account reaches 1000 posts somewhere
around 2029.

### Fixed: profile cards were stored under the handle alone

The avatar, display name and follower count for an account were looked up by
handle with no regard for platform, and — worse than the review could see from a
snapshot — *stored* that way too. The same handle on TikTok and Instagram are
two different accounts, but they shared one row: whichever refreshed last
overwrote the other, and the read could hand either one's picture to the other.

Nothing was actually broken, because no handle in the fleet is currently on both
platforms (checked live: 59 accounts, 56 handles). Both halves are fixed anyway
— the lookup now asks for the platform, and the stored row is keyed by handle
*and* platform so the two can coexist. Fixing only the lookup would have made
things worse: it would have missed the row every time and paid a ScrapeCreators
credit on every page load.

### Fixed: one lane's numbers counted a post once per profile it went to

**Raised by the review as a caution it could not prove. It was real, and it is
measured now.** When the same piece of content is scheduled onto several
profiles, the Content Types page counted its views once *per profile* rather
than once. Live, this affected exactly one lane — `rich_life_carousel`, which
read **284 posts and 62,684 views** against a true **280 and 62,664**, and
scored 44 where it should have scored 46.

Small, and on a lane that is retired, so nothing was decided on it. It is fixed
because it grows with precisely the thing the calendar is built to do more of:
put one piece of content on several accounts. A performance row can now only be
counted once, whatever the calendar does.

**"Scheduled ahead" deliberately still counts per profile.** That column answers
"how many posts are going out", and one carousel on five profiles really is five
posts.

### Fixed: five smaller things the review flagged

- **The credential check claimed ScrapeCreators was working without asking it.**
  It reported "ok" because the key existed, admitted as much in its own detail
  line, and then counted itself among the working credentials anyway. It now
  makes a real call. As a bonus it reports the **credits remaining** — 9,819 at
  the time of writing — which is worth seeing before it reaches zero, since
  every avatar and follower count on the site is paid for out of it.
- **The filler lane could be brought back but never taken out.** Pause and
  Retire were permanently greyed out on it, with nothing on screen saying why:
  the dialog insisted the freed weekly slots go somewhere, and filler — being
  one fleet-wide lane — has no siblings to give them to. It has no slots to
  hand out either, so it is no longer asked to.

  **The dialog now also says how far the change reaches.** Pausing or retiring
  filler there stops it for *every* character, because there is only one filler
  lane in the system. Stopping it for one character is a different screen —
  that character's own filler cap in Adjust Cadence, which is how Character 5
  has run no filler since 2026-09-10 while everyone else keeps theirs. Garreth
  went looking for that on Content Types first, which is a fair place to look,
  so the dialog now reads: *"This stops filler for every character. To stop it
  for one, use Adjust Cadence."*
- **The thumbnail capture script had no limits.** No timeout and no size cap on
  a download, no timeout on the frame extraction; one slow or oversized file
  could hang the whole run indefinitely. Now bounded at 60 seconds and 64MB
  each. It also exited reporting success even when every single capture had
  failed — it now exits with an error if any did.
- **Two caches were sharing one entry.** A scheduler-overrides read and the
  accounts read used the same cache name while returning entirely different
  shapes. It has its own name now, while still being cleared whenever the
  accounts data is.
- **The misleading comment about content type identity** has been corrected
  rather than acted on. It claimed a content type needed its character to
  identify it, citing two lanes that are simply different content types. Left
  uncorrected it was an invitation to "fix" joins that are already right.

### Added: a test suite and CI

**The review's last note: "no test suite and no CI — the passing build cannot
catch any of the above."**

**57 tests**, covering the rules the review actually found bugs in: cadence
validation (duplicate lanes, registry ownership, the weekly arithmetic), the
paging that stops Supabase's row cap truncating a total, the Refresh button's
list of caches, and the account-health ordering and colours.

They are unit tests over pure logic — no browser, no database, no network. That
is a deliberate limit: every bug the review found was a rule that could be
checked without leaving the process, and a fast suite that runs on every push
beats a slow one that gets switched off.

One of them is unusual and worth knowing about: it reads the source of the data
layer and checks that every cache a page asks for is one the Refresh button
knows how to clear. That fault has no error message and no wrong type — the
button just silently does nothing — so there is no other way to catch it.

**CI runs on every push and pull request**: typecheck, tests, and a real build.

**Lint runs but does not block, on purpose.** There are 32 pre-existing lint
errors in the codebase, none of them quick. Making them a blocker on day one
would mean either a permanently red build or switching the rules off to get a
green tick, and a check that has been quietened down to pass is worth nothing.
It reports the count instead, and clearing them is now a backlog item.

### Housekeeping

`@types/node` was moved from version 20 to 24. It described a version of Node
four releases older than the one this is developed on, and the test runner
refused to install against it.

### How much of this has actually been proven

Being precise, because "fixed" covers three different levels of confidence here.

**Confirmed against the live database:**

- The lane double-count. The function's output was captured before and after and
  compared column by column: exactly one lane moved, by exactly the predicted
  amount, and "scheduled ahead" was unchanged everywhere.
- The profile-card key. Read back after the change; all 29 stored cards intact.
- No handle exists on both platforms today (59 accounts, 56 handles).
- The 1000-row cap is real and silent — a request for a 2,357-row table returned
  exactly 1000 rows and a success code.
- The ScrapeCreators probe. Called with the real key and with a deliberately
  wrong one (401), so "ok" now means something. Through the running app the
  credential screen now reads **"9,777 credits remaining"** where it used to say
  "key present".
- **The cadence rules, all four refusals, against the live endpoint.** A
  duplicated lane is refused by name. A lane sent as Character 2's, which the
  registry says is Character 4's, is refused with *"lane divorce_stories belongs
  to Character 4, not Character 2"* — the request said one thing, the database
  said another, and the database won, which is the whole point of the change. An
  invented content type is refused by name. Every one of them was a rejection,
  so nothing was written; the cadence numbers were read back afterwards to
  confirm it.
- **The Refresh button, both halves.** The server half expires 21 caches where
  it expired 15, and 23 on an account page. The client half was **confirmed by
  Garreth in the running app on 2026-09-11** — the pages re-read their data on
  Refresh, which is the bar the backlog set for this ("pressing Refresh on each
  of those five pages demonstrably re-reads what is on screen").
- Every page touched renders, with no errors in the server log.

**Still unexercised, both small:** the filler lane's Pause and Retire buttons —
greyed out before, should now be clickable on /content-types — and the thumbnail
capture script's new time and size limits, which have not been run since.

---

## 2026-09-11 — the day the fleet posted nothing, and why the dashboard looked stale

**From a question about one card: why Profile 54's "Last 5 posts" still ended at
September 8 when the account had clearly posted since.** No dashboard code
changed. The card was right and the data behind it was late — but chasing the
lateness turned up a silent posting outage, so both are recorded here.

**The card was late by design, not broken.** "Last 5 posts" reads
`tt_post_performance` directly. Nothing refreshes on page load — if a post is not
in that table, the card cannot show it. The table is filled by an n8n workflow
that runs **Sunday, Monday, Wednesday and Friday at 8:30am ET**, while posting
happens in an 11:00–23:00 ET window. Every post therefore goes live *after* that
morning's read, so no post is ever captured the same day. Realistic lag is
**21 to 46 hours**. Profile 54's two missing videos went up Wednesday afternoon,
hours after Wednesday's read; the next read was Friday. The `as of <date>` line
beside the range picker is the honest marker — inside two days the card is
waiting, beyond two days something is wrong.

**Confirmed live.** A manual run at 12:14 UTC pulled both missing posts in with
42 and 59 views, matching TikTok exactly.

**The real problem: nothing posted on September 10, across all 24 accounts.** The
Posting Agent ran on time and reported **success**. Its first step asks Geelark
for the list of phones, and Geelark answered `{"code":40011,"msg":"only for paid
user"}`. With no phones it staged zero rows, finished in **4 seconds**, and
logged a clean run. A normal run takes 2.5–4 minutes. Nothing alerted.

It was not a billing lapse — the wallet held **$44.11** — and Geelark answered
normally again the next morning (35 phones listed). A transient API failure with
no retry and no zero-row alarm. **The tell is run duration, not status.**

**25 pieces of content were stranded and have been released.** `unified_posts_due`
only ever looks at *today's* date, so a missed day's rows are never retried. The
25 rows (6 two-slide BA, 6 Glow Up, 11 filler, 2 Character-2 slideshow) were
backed up to `_backup_sept10_release_20260911`, then had their profile, date,
time and status cleared so they fall back into the schedulable pool. They were
deliberately *not* re-dated to today, which would have pushed several accounts
over their daily cap. The Smart Scheduler will place them on its next run and its
own caps — 3 a day, 10+10 a week, 120-minute gap, 11:00–23:00 — decide where they
land. **Confirmed live:** all 25 re-tested against the exact conditions
`v_scheduler_pool` uses, and all 25 qualify.

### New: the card is now refreshed on the three gap days too

**Garreth's call, after asking whether the lag could be closed cheaply.** A new
n8n workflow, **`[TikTok] Recent Posts Refresh — gap days`**, runs Tue/Thu/Sat at
8:30am ET — the three days the analytics engine does not. It reads the same
active-TikTok-account list, fetches **one page per account with pagination turned
off**, and upserts into `tt_post_performance`. Nothing else: no outlier judging,
no report, no email. **Worst-case staleness drops from ~46 hours to under 24.**

**Why one page is enough, measured not assumed:** a single response carries 10
videos, which spans 3.9 days for accounts posting 2–3 a day. A one-day gap cannot
overflow it.

**Cost, measured on a real run:** 26 calls, one per account, no pagination, all
200s, 16 seconds end to end. That is 26 credits a gap day against ~48 for a full
paginated run — about **1,170 credits a month** all-in, versus ~835 today and
~1,460 if the whole engine had simply been moved to daily.

**It does not feed the health detector young data.** Every metric in
`v_account_view_health` filters `posted_at <= now() - '48:00:00'` — the `mat_`
prefix means matured. A post read 9 hours old counts toward nothing until it is
two days old. The one place without that guard is the `recent` CTE in
`v_account_health_v3` (last 8 posts, feeding the `recent_best <= 100` escalation);
the effect there is a timing shift of about a day, not a new false positive.

**Built as a separate workflow on purpose.** The analytics engine errors on every
run right now; folding gap days into it would have meant 7 red executions a week
instead of 4 and no way to tell which half broke. It also would have required
making the page cap conditional on which trigger fired — and if that expression
ever misfired toward "one page" on a full day, the main ingest would silently
truncate from 7 days to 4.

**Two traps deliberately avoided:** the workflow timezone is pinned to
`America/New_York` (this n8n instance defaults to Asia/Manila, which would have
fired the cron 12 hours off), and the upsert keeps `batchSize 1` with a 60-second
timeout (a burst of parallel upserts starved PostgREST fleet-wide once before).

**Known wart:** the two Supabase nodes carry the service-role key in plain header
values, mirroring the existing engine. n8n flags this. It is not a new exposure —
the same key is already hardcoded across the sibling workflow — but converting
both to a stored credential is worth doing in one pass.

**It is on the Automation page.** Added to `TRACKED_WORKFLOWS` as "Recent Posts
Refresh", expected Tue/Thu/Sat 08:30 ET, so the overdue check covers it. Not
marked `key`, so it stays off the homepage card — it is a supporting job, not one
of the six. Tracking it also routes its failures into the incident feed, which
only surfaces errored executions for workflows in that list; without it a silent
stop would leave the card quietly stale while every other pill stayed green.

### Found: the analytics engine fails on a database timeout, in the upsert

**Garreth opened the failed execution in the n8n UI after remote inspection kept
dying.** The failing node is **`Upsert tt_post_performance`** — the ingest step
itself. Two earlier theories, including one recorded in an earlier draft of this
entry, were wrong and are corrected here.

**The chain, measured in the Postgres logs:**

1. Each 10-row chunk upsert takes **10–19 seconds** (observed: 10.4s, 10.6s,
   11.1s, 11.8s, 12.2s, 13.1s, 16.0s, 19.0s).
2. `service_role` has a **30-second `statement_timeout`**.
3. Chunks that tip past 30s log `canceling statement due to statement timeout`.
   Seventeen fired between 12:16 and 12:18 UTC.
4. PostgREST drops the connection, and n8n renders that as **"The connection was
   aborted, perhaps the server is offline"** — a message that points at the
   network and hides a database timeout. That is what sent two investigations
   down the wrong path.
5. After 3 retries the node's `onError: stopWorkflow` ends the run.

**The 132 unjudged outliers were a symptom, not a cause.** The run stops at the
upsert, so Route-and-Judge, the report and the email never execute at all. The
judging service is fine — a POST to it returned a clean
`400 {"detail":"outliers must be a non-empty list"}` in 0.69s.

**Why the upsert is slow.** `trg_fill_filler_carousel_tt` is a **BEFORE INSERT**
trigger, and on an `ON CONFLICT` upsert it fires for *every* row — including the
~250 that only resolve to an UPDATE. Each call runs `match_content_id`, which
loops ~29 (source table, caption column) pairs and retries all of them on a
60-char prefix when the first pass finds nothing. That is up to ~580 dynamically
planned queries per 10-row chunk.

**Not yet explained:** the new gap-day workflow uses the identical upsert and
chunk size and completed 26 chunks in 16 seconds — roughly 0.6s per chunk against
the engine's 10–19s. The difference is not accounted for, so **the clean gap-day
test is not proof it is immune**; it may simply have run while the database was
quiet.

**One real gap found along the way:** `cleora_content.caption` is the only one of
29 registry caption columns with no `text_pattern_ops` prefix index. At 44 rows
it cannot explain a 30-second timeout, so it is **not** the root cause — but it
is a seq scan inside a per-row trigger that grows as that table fills.

### Fixed: chunk size halved, and the last missing prefix index added

**Garreth's go-ahead, same session.** Two changes, both small and reversible.

**Chunk size 10 → 5**, in the Normalize node of *both* the analytics engine and
the new gap-day workflow. Nothing else about the upsert changed. Halving the rows
per statement halves the per-statement time, putting a chunk at roughly 5–9s
against the 30-second ceiling instead of 10–19s. It is a headroom fix, not a cure:
the per-row trigger cost is unchanged, so the real remedy is still to stop doing
caption attribution inside a BEFORE INSERT trigger. That is logged in
`BACKLOG.md`, not done here.

Both workflows were **published**, not just saved — an n8n update alone leaves a
draft, and `versionId` was checked against `activeVersionId` on each.

**The missing index** shipped as
`20260911140000_cleora_content_caption_prefix_index.sql`, following the #227
naming convention. **Confirmed live:** all 29 registry caption columns now have a
`text_pattern_ops` prefix index, 0 missing.

---

## 2026-09-11 — the database access audit, answered

**From the 2026-09-09 external review's only genuine security finding.** No code
or grants changed — this entry records an answer, because the answer is the kind
of thing the next reviewer should not have to rediscover.

**Who can reach the database directly: anyone holding the anon key.** Measured
live, not inferred. 155 of the 180 tables in `public` have row-level security
off *and* grant `anon` full `SELECT/INSERT/UPDATE/DELETE`; `authenticated` holds
exactly the same, so signing in changes nothing. 172 of 175 functions are
executable by `anon`. A plain `GET /rest/v1/content_type_registry` carrying only
the anon key returned `200` with live rows from the open internet.

**What is genuinely safe, and it is worth knowing why.** The anon key never
reaches the browser — there is no `NEXT_PUBLIC_` anything in the app — and the
key is used in only three places, all of them auth-only. Every data read and
write already goes through the service role. So the grants are not load-bearing:
removing them should not affect the dashboard at all. 16 tables have RLS on with
no policy at all, which denies everyone except the service role — that is the
shape the other 155 need.

**Nothing revoked — Garreth's instruction, same day.** The hardening is written
up in `BACKLOG.md` as "Close the anon-key hole on the database" with the counts,
the ordered steps and the revoke SQL, to be picked up later. Filed in V3 at
first and **promoted to V1 the same day** — it sits last in that list by
position, not by priority.

The blocking unknown is recorded there too: six n8n credentials point at
Supabase and n8n will not reveal which key each one holds. If one carries the
anon key, revoking breaks workflows silently across a 340-workflow instance.
That has to be read out of the n8n UI, or tested on a Supabase branch, before
anything is revoked.

**Also established, same day:** the dashboard is internal-team-only (Garreth).
That lowers the odds but covers less than it sounds like — PostgREST is on the
public internet whatever the app is for, and public signup is **enabled**
(`disable_signup: false`), so `ALLOWED_EMAILS` gates the dashboard's front door
while anyone with the anon key can still register and hold an `authenticated`
token. It escalates nothing today, since `anon` already has everything
`authenticated` does. It is recorded because it makes one tempting half-fix —
revoking `anon` and leaving `authenticated` — useless.

**Carried forward from 2026-09-10:** `revoke … from public` will not do this
job. Supabase grants to `anon` and `authenticated` **by name**, and a named
grant survives a revoke from PUBLIC. Name both roles and read the ACL back.

## 2026-09-11 — two bugs found by testing the day before

Neither came from the 09-10 changes; both are older faults that the checklist
walked straight into. Found by Garreth on Profile 9.

### Changed: three follow-ups from the Profile 9 zero incident

**Garreth's decisions**, taken after the zero-cap incident during testing.

- **Max posts / day can no longer reach 0.** The − button stops at 1, and a
  typed 0 clamps to 1 the same way a typed value already clamped to the ceiling
  — the button guard is worthless if a keystroke walks around it. No error
  message: the number simply cannot go there. **0 stays legal for GLP and
  filler**, where "none" is a real setting — Character 5 runs filler 0 on
  purpose. What made posts/day different is that 0 there is not a cap at all,
  it is an off switch, and there is already a Posting switch above it.
- **"Custom schedule" is now "Custom Cadence"** on the per-account posting
  modal.
- **Adjust posting cadence refuses to save with filler and GLP both 0.** That
  is not a cadence, it is an off switch for every account under that scope, and
  nothing afterwards would say so. Under-allocating one bucket is still allowed.

**Deliberately not done:** adding a "Use fleet default" control to the
per-account modal, to match the cadence modal. Garreth's call — that modal
already has two ways back to the defaults (the Custom Cadence toggle and Reset
to defaults), so a third would be clutter. The zero trap that prompted the idea
is closed by the floor above instead.

### Verified: all five settings-save paths, end to end

The checklist that came out of the atomic-writes work is complete. It existed
because the database-side tests used JSON I wrote by hand, while the application
builds its own — and `jsonb_to_recordset` ignores any key not in its column
list, so a wrong key name lands as `null` rather than as an error. That fault
class is now ruled out on every path.

| Path | Result |
|---|---|
| Account override, set | 3 rows, one identical `created_at` to the microsecond — one transaction, not three writes. Audit row written, which also confirms the `auditLog` status-check fix |
| Character override, created | Exactly **one** row — no GLP or filler row, so "write only what differs from inherit" held |
| Character override, cleared | Row **deleted**, not left stale; other characters untouched. This is the empty-list path whose early return was the bug caught while writing the fix |
| Fleet cadence | Both `scheduler_buckets` rows moved together on one timestamp, each keeping its own `weekly_quota` (3 and 11) rather than being flattened. Wrote all 13 lane rows in the same transaction |
| Content-type pause | `gym_asmr` → paused, `active` followed via the trigger, its 1 weekly slot moved to `dating_genre`, character still totals 11, and `allowed_content_types` was **not** touched — correct, only live/retired change it |

`replace_scheduler_override`, `save_cadence_mix` and `set_content_type_lifecycle`
have each now run against real data as well as their rejection tests.

### Changed: Adjust posting cadence uses the app's own pill selector

**Garreth's call.** The Fleet default / Char 2 / Char 3 … tabs were a pill row
built inside that modal. They now use `FilterPills`, the segmented control the
Accounts and Analytics filters already use, so the modal stops having a
one-off control of its own.

`FilterPills` gained one optional field, `marked`, to keep the dot that flags a
character already sitting off the fleet — additive, and every existing caller is
untouched. The dot switches to its own text colour on the selected pill, because
amber vanishes against the accent fill.

That dot matters more than it used to: the strip that explained it was removed
in the same pass, so it is now the only sign that a fleet change will not move
that character.

### Removed: two lines of copy that only restated success

**Garreth's rule: say nothing when it is right, speak up when a decision is
needed.**

- *"Every slot allocated: 3 filler and 11 GLP a week, per account."* — the badge
  beside the section title already reads `14 / 14 per week` in green.
- The subtitle beside **Advanced settings** ("which content types make up
  Character 3's 11 a week").

Both problem states keep their copy, because each asks for a decision: over
budget, and slots left idle. The **needs attention** pill beside Advanced
settings also stays — it is what says the lane mix does not add up and Save will
refuse until it does.

### Removed: the explainer strip on Adjust posting cadence

**Garreth's call.** The grey line under the scope tabs is gone — both its
character version ("Only Character 3. Anything left on fleet default keeps
following the fleet…") and its fleet version.

Most of what it said the modal now shows rather than tells: an inherited field
sits in a dashed box reading "11 /wk — fleet default", and the link above it
says "Use fleet default" or "Override". That is the same fact, in the place the
decision is made.

**One thing did go with it,** and it was not redundant: in fleet scope the strip
named which characters have their own cadence and so will not follow a fleet
change. The scope tabs still mark those characters with an amber dot, so the
information is on screen — but nothing now says what the dot means. If a fleet
change ever appears not to take effect on a character, that dot is the reason.
Worth a tooltip or a legend if it bites.

### Changed: scrollbars are hidden everywhere

**Garreth's call.** Every scrollable region — pages, panels, tables, modals,
the sidebar drawer, the horizontal card rows — now scrolls without drawing a
track or thumb.

Two declarations in `globals.css`, both needed: `scrollbar-width: none` covers
Firefox and Chromium 121+, `::-webkit-scrollbar { display: none }` covers Safari
and older Chromium, which ignore the standard property. `overflow` is untouched,
so nothing changed about *what* scrolls — only whether the bar is visible.
Wheel, trackpad, touch, keyboard and the overlay indicator phones draw while a
finger is down all behave exactly as before.

The `.no-scrollbar` utility is now redundant and was kept on purpose: it marks
the handful of places that wanted a bare scroll edge on their own merits, so
they keep that treatment if the global rule is ever narrowed.

**Worth watching.** A scrollbar is also the only passive hint that a region
scrolls at all. Where that hint mattered, the content now has to imply it — a
card row cut off mid-card, a table that visibly continues. Any panel that ends
on a clean edge will now look complete when it is not.

### Fixed: "Using defaults" sat above numbers that were not the defaults

Switching **Custom schedule** off leaves the stored caps in place on purpose —
that is the difference between switching an override off and deleting it. But
the modal went on showing those switched-off numbers in the fields, only dimmed.
Dimming reads as "you can't edit this", not as "these don't apply". So the card
said *Using defaults* directly above **1 / 6 / 1** while the scheduler was
really running the account at **2 a day**.

The fields now go blank when the toggle is off, which lets each one's
placeholder — the real fleet or character default — show through. Every number
derived below them follows the same rule, so the warnings underneath describe
the caps actually in force. The typed values are only hidden, never cleared:
flipping the toggle back on brings them straight back.

### Fixed: you could save a weekly cap the account can never reach

Lower **Max posts/day** to 1, leave GLP and filler alone, and the modal saved
without complaint — committing the account to 14 posts a week into 7 available
slots. The scheduler would silently plan the smaller number.

Two independent causes, both now closed:

- **The modal only warned about the opposite mistake.** Its comment reasoned
  that over-allocation was unreachable because both steppers stop at the
  ceiling — true, but only for *raising* GLP or filler. **Lowering posts/day
  shrinks the ceiling underneath a pair that is already set**, and the steppers
  have no say in that. Over-allocation is now flagged and blocks the save.
- **The server check treated a blank field as zero.** The rule was there and
  correct, but `?? 0` made a blank GLP/filler read as "no posts at all" rather
  than "inherit the default" — so the sum came to 0 against a ceiling of 7 and
  passed. Exactly the case that occurs in practice, since leaving those fields
  alone is the normal thing to do. All three fields now resolve through the
  same effective config the modal shows as its placeholder, and the error names
  which numbers were inherited.

**Also verified in passing:** the checklist's item 1 passed on Profile 9. All
three override rows landed with a `created_at` identical to the microsecond —
one transaction, not three writes — and the audit row was written, which
independently confirms the 09-10 `auditLog` status-check fix is working.

---

## 2026-09-10 — first external code review

**Source: `PM-CODEBASE-REVIEW-2026-09-09.md`,** the first review of this
codebase by someone outside the project. It was carried out against a ZIP
snapshot rather than this repo, so before acting on it every finding was
re-checked against the live code — and the live database, which the review had
no access to.

### Found: the seven content-intelligence tables are empty

Not a code change, but the most important thing learned. The review left the row
counts of the knowledge/carousel tables explicitly unknown. Checked live:

**All seven exist, all seven have zero rows, against 3,468 rows in
`references_unified`.** 3,468 collected sources, none analysed. The schema was
built and nothing was ever wired to fill it.

Deferred to V2 with the carousel generator app that will consume it — see
`BACKLOG.md`.

### Added: the content-intelligence schema is now in the repo

`supabase/migrations/20260909123000_content_intelligence_engine.sql`.

Those seven tables were applied by hand in the SQL editor and never recorded in
`supabase_migrations.schema_migrations`, so **the live database was carrying
seven tables this repository had no record of at all.** Anyone rebuilding from
the migrations folder would have lost them silently.

The committed file is reconstructed from the live catalog and verified against
`pg_constraint`, `pg_indexes` and `information_schema.columns` — it matches the
database, but it is the one file in that folder that is not a byte-identical
replay, and the migrations README now says so.

### Fixed: a broken dashboard no longer looks like a calm one

**The worst class of bug in a monitoring tool: failing quietly.**

- **The incident feed.** All six sources were wrapped in `.catch(() => [])`. If
  every one of them failed, the page still rendered successfully — as an empty,
  reassuring, entirely fictional all-clear. A source that cannot be read now
  becomes a red **Monitoring** row at the top of the feed saying so, which also
  means one dead source no longer blanks the other five.
- **Workflow failures specifically** swallowed their own errors twice over (a
  bare `catch` and an unchecked `res.ok`), so "n8n is unreachable" and "no
  workflow has failed" produced the identical empty list. That read now throws
  and reaches the handler above.
- **The automation card.** A failed n8n read became `null`, which the card drew
  as **"No runs"** — so an unreachable n8n looked like a fleet of idle
  workflows. There is now a distinct `unreachable` state, shown as a red
  **"Can't check"**, kept apart from "this genuinely never ran" all the way to
  the pill.
- **The audit log and the bell.** `fetch` only rejects on a network failure — a
  400 or 500 from PostgREST *resolves*, and both writes treated that as success.
  A rejected audit insert produced no log line at all, so an action could be
  taken with no audit trail and nothing to indicate it. Both now check the
  status and log the body. They still do not throw, which is deliberate: a
  failed audit row must not roll back a completed action.

### Fixed: analytics showed the wrong numbers under the right heading

Two separate faults in the same screen, both putting real data under a label
that did not describe it.

- **Going back to a previous range kept the old data.** The "skip the redundant
  first fetch" check was written as `range === "7d" && platform === "all"` — true
  on first mount, and true again every time you navigated back to those pills.
  So 7d/All → 30d/TikTok → 7d/All skipped the refetch and left TikTok's 30-day
  numbers sitting under a 7-day All header. The page now tracks which slice the
  displayed data actually is, rather than inferring it from the pills.
- **Fast switching could land the wrong response.** Two quick changes meant two
  in-flight requests, and whichever *answered* last won rather than whichever was
  *asked* last. Responses that no longer match the current selection are now
  dropped on arrival.
- **A failed load used to be invisible** — the old numbers stayed and the header
  changed anyway. The numbers still stay (blanking the page helps nobody), but a
  banner now names which slice is actually on screen.

### Fixed: one handle on two platforms could show the other's numbers

The account-analytics cache key was handle + range, with **no platform** — while
the fetch picks a different table per platform (`post_performance` vs
`tt_post_performance`). The same username on both platforms, which is the normal
case here, served whichever platform loaded first under the other one's heading.
Platform is now part of the key, and the key is bumped to `v2` so entries
computed under the ambiguous key cannot be read back.

### Fixed: "Avg views (7d)" was a median

The account detail header read `median_7d_r` and called it an average. Different
statistic, and a materially different number on any feed with one viral post in
it. Relabelled to **"Median views (7d)"**, and the field renamed from
`avgViews7d` to `medianViews7d` so the type says what it holds.

### Fixed: retirement can no longer claim success it cannot prove

The Post-Ban cleanup had three ways of reporting a good outcome it had no
evidence for. All three were reproduced against the real functions before and
after the change.

- **An acknowledgement was read as a result.** Any 2xx whose body was not a
  report got wrapped as `{ raw: … }` and then read as a summary in which every
  field happened to be missing — and a missing field means "nothing needed
  doing". So n8n's own `"Workflow was started"` produced the bell message
  *"Everything was already shut down and there was no content to release"* about
  a cleanup that had not been reported on yet. A reply that isn't a report is
  now recognised as one, and says the outcome is unknown.
- **A failed phone delete was reported as a delete.** `phoneId` only says a
  phone was *found*; the delete's own outcome is `geeErr`, which was on the type
  from the start and **read nowhere**. So `{phoneId, geeErr: "Delete failed"}`
  produced *"Cleanup finished cleanly with no content to release"*. It now
  reads *"Cleanup finished but the cloud phone needs a manual check"*, and the
  incident row spells out "cloud phone could NOT be deleted".
- **A timeout claimed nothing had happened.** The failure message ended "and
  nothing was changed" — but the request had reached n8n, so the workflow may
  have deleted the phone, cancelled the proxy, released the content, or any
  prefix of that. It now says the outcome is unknown, names what to check, and
  warns that a second run is only safe once you know where the first stopped.

A dry run that produces no report is now an error rather than an empty report,
so Execute cannot be armed by a blank one.

### Fixed: settings saves are one transaction each

Three settings actions each wrote several rows with no transaction around them:

- **Saving an account or character override** DELETEd the existing rows and then
  INSERTed replacements. A failed insert left the delete standing: the settings
  were gone, and the helper reported the account as "now on scheduler defaults".
  Real data loss on a failed save.
- **Saving the cadence mix** PATCHed each lane one at a time, then the two
  bucket rows — so a failure midway left some lanes on the new allocation and
  the rest on the old one, adding up to nobody's mix.
- **A lifecycle change** rebalanced the character's other lanes and then flipped
  the target, with the same half-applied failure mode.

All three now go through a database function that applies everything or nothing.
A second benefit falls out of it: **every update checks how many rows it
touched.** A PostgREST PATCH whose filter matches nothing returns a cheerful
204, so a lane sent for the wrong character — the character comes from the
browser — used to save nothing and report success. That now raises an error
naming the lane, which also closes part of the review's cadence finding.

Removing the read-modify-write on `characters.allowed_content_types` deleted two
now-dead helpers; the reasoning they carried is kept as a comment where the
array is now maintained.

**Applied and smoke-tested.** `atomic_settings_writes` ran on 2026-09-10 after
Garreth approved it. Because none of the three functions had ever executed, each
was exercised against the database before being trusted:

| Check | Result |
|---|---|
| Failed insert after the DELETE | **All rows survive** — the old code's data-loss case |
| Empty rows array | Clears correctly (the "everything inherited" path) |
| Row naming a different owner | Refused |
| Same lane listed twice | Refused |
| Lane sent for the wrong character | Raises, instead of silently updating nothing |
| Lifecycle failure after the allowed-list widening | Widening rolled back too |

### Fixed: three new functions were briefly callable with the anon key

Worth writing down because the mistake is easy to repeat and invisible unless
you look for it.

`atomic_settings_writes` ended with `revoke all on function … from public`,
which reads like it closes the functions off. It does not. **Supabase grants
EXECUTE on new public functions to `anon` and `authenticated` by name**, via
`ALTER DEFAULT PRIVILEGES` — and a grant to a named role is untouched by
revoking from PUBLIC. Reading `pg_proc.proacl` back after applying showed all
three still carrying `anon=X`, i.e. exposed on the public PostgREST surface.

A follow-up migration (`atomic_settings_writes_revoke_anon`) revokes the two
roles explicitly; the ACLs now read `postgres` and `service_role` only. The
general rule, and the ACL query to check it with, is written up in
`supabase/migrations/README.md`.

### Recorded, not fixed

Two findings remain: Refresh not reaching every cache, and the rest of the
cadence validation (duplicate lane identities, and the lane character still
coming from the browser rather than the registry — the row-count check above
covers the silent zero-row PATCH half of it). Both are written up with their
evidence in `BACKLOG.md` under V1, along with the smaller items: no pagination
on account performance reads, the profile-card lookup ignoring platform, the
ScrapeCreators probe, the filler lifecycle modal, and the absent test suite.

**The review is not right about everything** — its cadence finding was already
partly fixed by `42af79f`, its "registry identity inconsistency" caution turned
out to be a comment error rather than a bug (`content_type` really is the
primary key), and its file links are all dead.

### Verification

TypeScript passes. Lint is 32 errors and 1 warning, down one from where the day
started and with nothing new — all pre-existing React style rules.
`npm run build -- --webpack` passes.

The retirement fixes were checked by running the real copy functions against the
exact payloads the review used, plus a clean run and a genuinely dormant one; all
four now read correctly. The three database functions were applied and then
exercised directly against the database, including their rollback behaviour —
the table above lists what was checked. Test rows were removed afterwards and no
production setting was changed.

None of the silent-failure work has met a real failure in production, which is
the only test that finally counts for it. And no settings save has yet been made
through the UI against the new functions — the first one is worth watching.

---

## Before 2026-09-10 — summarised from git history

Not itemised. This is the shape of the work, so a newcomer can tell which era a
piece of code belongs to; `git log` has the specifics.

### 2026-09-09 → 09-10 — characters, cadence and posting truth

Per-character cadence replacing a single fleet-wide setting; Character 5
(`cleora`) wired end to end; the age ramp corrected twice — it may now fill an
empty slot where a character has no filler lane, and it clamps the daily cap
rather than raising one you set. "Last Post" stopped counting attempts that
failed, and a persistently failing account stopped reading as `warming`. Paused
characters became visible and previewable without the scheduler seeing them. Six
migrations. The dashboard was also made usable on a phone.

### 2026-09-07 → 09-08 — the design pass

The interface rebuilt around a lit glass design language, light mode settled,
icons moved to Phosphor behind an adapter, the login screen reworked, skeletons
and route-level loading states added across the nav. Bell read state moved from
`localStorage` to the server, per person — browser-local read state was lost by
switching URL, port or machine. Per-account analytics added to the account page.
A Cache Components spike was tried and backed out, keeping the two streaming
fixes it turned up.

### 2026-09-04 → 09-06 — the core product

The v1 pipeline dashboard, then per-account Smart Scheduler overrides, the
Content Calendar (retiring the old Cadence page), the Content Types page, and
press-and-hold retirement. Calendar reads learned to serve last-known-good data
when Supabase is down **and say so** — the same instinct as this release's
silent-failure work, arrived at eight weeks earlier. Migrations started being
tracked in the repo, and the backlog was started and then split into V1/V2.

### 2026-08-31 — start

Initial commit.
