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
