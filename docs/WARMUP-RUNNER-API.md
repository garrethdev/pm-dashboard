# Warmup runner API

How the warmup script on the MacBook Air (`garrethdev/warmup-runner`) talks to
the dashboard. Built for PF-13, 2026-09-28. It answers the six operations in
the runner's `docs/DASHBOARD-CONNECTION.md`, and it is the thing that runner
task B10 (`src/logger.ts`) calls.

## Access

Every call sends the token:

```
Authorization: Bearer <WARMUP_RUNNER_TOKEN>
```

The token is a setting on the dashboard (`WARMUP_RUNNER_TOKEN`, in Vercel) and
a secret on the Air (its `.env`, readable only by the Air's user, never in the
repository). It opens these six addresses and nothing else in the app. To
revoke it, change the setting in Vercel and redeploy.

If the setting is missing, every call answers `503 not_configured`: a missing
setting never means an open door.

**Ids are text, both ways.** Nine real account ids are too big for a
JavaScript number. Send `accountId` as a string. A number above 2^53 is
refused, because it has already been rounded. Phone ids come back as text too.
Small numbers are accepted for `deviceId`.

**Times** are ISO 8601 instants (`2026-09-28T13:14:15.123Z`). Days are New
York days.

## The six operations

| # | Call | Body or query | Answer |
|---|---|---|---|
| 1 | `GET /api/warmup-runner/accounts` | — | `{ accounts: [{ id, username, platform, character, deviceId, movedToDeviceAt }] }` |
| 2 | `GET /api/warmup-runner/sessions?date=YYYY-MM-DD` | `date` is optional; it defaults to today in New York | `{ date, sessions: [{ accountId, sessionNo, minutes, mode, startedAt }] }` |
| 3 | `POST /api/warmup-runner/runs` | `{ accountId, deviceId, sessionNo, startedAt }` | `{ ok, run }` |
| 4 | `POST /api/warmup-runner/runs/check-in` | `{ accountId, sessionNo, startedAt }` | `{ ok, run }` |
| 5 | `POST /api/warmup-runner/runs/close` | `{ accountId, sessionNo, startedAt, endedAt, note }` | `{ ok, run, alreadyClosed }` |
| 6 | `POST /api/warmup-runner/sessions` | `{ accountId, deviceId, sessionNo, startedAt, finishedAt, minutes, note }` | `{ ok, id, alreadyRecorded }` |

**What each one does:**

1. **Eligible accounts.** Operation 1 lists the accounts that pass all five
   checks: `is_active`, `delivery_mode = 'manual'`, `warmup_mode = 'script'`,
   a phone set, and not banned. `posting_paused` is not one of the checks.
   Re-read it just before each session, because an account may have been
   flipped back to Manual.
2. **Sessions on a day.** Operation 2 returns every `warmup_sessions` row that
   day for the eligible accounts, by hand or by script. Minutes add up per
   session. A session is done at 15.
3. **Start a run.** A run is named by the account, the session and the start
   instant; the script never needs the row's id. The start must be within the
   last 36 hours and no more than 5 minutes ahead of the dashboard's clock.
4. **Check in.** Send one once a minute. The dashboard records its own clock,
   not the Air's.
5. **Close a run.** Leave `note` empty when the run finished normally. When it
   stopped early, send the short reason (HANDOVER section 16). Closing twice
   keeps the first close.
6. **The finished session.** `startedAt` is the run's start, the same instant
   sent in operation 3. The dashboard sets `mode = 'script'` and
   `logged_by = 'warmup-runner'` itself. Write this before closing the run,
   which is the order the runner already uses.

**Safe to retry.** Starting a run twice returns the same run. Closing twice
keeps the first close. Writing the same session twice answers
`alreadyRecorded: true` and changes nothing. The database has one scripted row
per run, so a retry can never count twice.

## Refusals

Each refusal is `{ error, code }`. `error` is a sentence to log; `code` is
what to branch on.

| HTTP | `code` | Meaning |
|---|---|---|
| 401 | `unauthorized` | Wrong or missing token |
| 503 | `not_configured` | The dashboard has no token set |
| 400 | `invalid_body` | A field is missing or malformed. The sentence names the field |
| 400 | `invalid_date` | `date` is not a real YYYY-MM-DD |
| 400 | `invalid_minutes` | Not a whole number from 1 to 600, or more minutes than passed between `startedAt` and `finishedAt` (one minute of slack is allowed) |
| 409 | `not_eligible` | The account fails the five checks. For operation 6, this only happens when no run was started either (see below) |
| 409 | `wrong_phone` | The account, or its run, is on a different phone than `deviceId` |
| 404 | `run_not_found` | No run was started with that account, session and start |
| 409 | `run_closed` | A check-in arrived for a run already closed |
| 409 | `not_found` | The account or the phone no longer exists |
| 502 | `upstream` | The dashboard could not reach its database. Retry later |

**An account flipped to Manual mid-run** keeps the run's minutes. Operation 6
is accepted if the account is eligible now, *or* if a run was started for it.
The run proves it was eligible when the session began. What the rest of the
day should do after such a flip is still an open question for Garreth
(PF-13, part 3).

## What the dashboard shows

The To-do list, the Physical dashboard's To-do card, the phone's page and the
account's own page all show an Automated warmup with the robot and no way to
tick it, and say:

- **Running** (blue): a run is open and was heard from in the last 3 minutes.
  The second line says when it started.
- **Stopped** (red): a run is open but has been quiet for more than 3 minutes.
  The script died, or the Air lost power or its connection, without closing
  the run. The second line says when it was last heard from.
- Nothing extra once the run is closed or the session reaches 15 minutes. The
  minutes logged show as usual (Done, on the account's page).
- **No warmup in N days** (red), on the account's page and the phone's page,
  once an Automated account has gone 3 New York days without a finished
  warmup (Garreth, 2026-09-28). That is `AUTOMATED_WARMUP_OVERDUE_DAYS`.

If an account is switched back to Manual mid-day, the rest of its day is
Manual. Its warmups go on the To-do list for a person, and the minutes the
script already did still count.

The 3 minutes is `RUN_QUIET_AFTER_MS` in `src/lib/data/warmup-run-state.ts`.
While today's list has a scripted warmup open, the page re-reads itself every
30 seconds, so a change shows up without anyone refreshing.

Storage is `warmup_runs`, one row per run
(`supabase/migrations/20260928120000_warmup_runs.sql`). Like the other phone
tables, only the master key can read or write it.
