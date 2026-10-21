# Warmup runner API

How the warmup script on the MacBook Air (`garrethdev/warmup-runner`) talks to
the dashboard. Built for PF-13, 2026-09-28. It answers the six operations in
the runner's `docs/DASHBOARD-CONNECTION.md`, and it is the thing that runner
task B10 (`src/logger.ts`) calls. A seventh, the warmup's report, was added
2026-10-09 (Garreth, after the first live warmup stopped with `device_lost`
and nobody could see why without the Air's log file). Operations 8 to 11 were
added 2026-10-21 for the session recorder (PF-26, `docs/PHONE-SCREEN-QA.md`):
they are for the recorder on the Air, not the warmup script, but they share
the token and the prefix.

## Access

Every call sends the token:

```
Authorization: Bearer <WARMUP_RUNNER_TOKEN>
```

The token is a setting on the dashboard (`WARMUP_RUNNER_TOKEN`, in Vercel) and
a secret on the Air (its `.env`, readable only by the Air's user, never in the
repository). It opens these eleven addresses and nothing else in the app. To
revoke it, change the setting in Vercel and redeploy.

If the setting is missing, every call answers `503 not_configured`: a missing
setting never means an open door.

**Ids are text, both ways.** Nine real account ids are too big for a
JavaScript number. Send `accountId` as a string. A number above 2^53 is
refused, because it has already been rounded. Phone ids come back as text too.
Small numbers are accepted for `deviceId`.

**Times** are ISO 8601 instants (`2026-09-28T13:14:15.123Z`). Days are New
York days.

## The eleven operations

| # | Call | Body or query | Answer |
|---|---|---|---|
| 1 | `GET /api/warmup-runner/accounts` | — | `{ accounts: [{ id, username, platform, character, deviceId, movedToDeviceAt }] }` |
| 2 | `GET /api/warmup-runner/sessions?date=YYYY-MM-DD` | `date` is optional; it defaults to today in New York | `{ date, sessions: [{ accountId, sessionNo, minutes, mode, startedAt }] }` |
| 3 | `POST /api/warmup-runner/runs` | `{ accountId, deviceId, sessionNo, startedAt }` | `{ ok, run }` |
| 4 | `POST /api/warmup-runner/runs/check-in` | `{ accountId, sessionNo, startedAt }` | `{ ok, run }` |
| 5 | `POST /api/warmup-runner/runs/close` | `{ accountId, sessionNo, startedAt, endedAt, note }` | `{ ok, run, alreadyClosed }` |
| 6 | `POST /api/warmup-runner/sessions` | `{ accountId, deviceId, sessionNo, startedAt, finishedAt, minutes, note }` | `{ ok, id, alreadyRecorded }` |
| 7 | `POST /api/warmup-runner/reports` | `{ accountId, deviceId, sessionNo, startedAt, endedAt, outcome, note, minutes, counts, log, screenshot }` | `{ ok, id, alreadyReported }` (`id` is text) |
| 8 | `POST /api/warmup-runner/recordings` | `{ deviceId, startedAt, endedAt, expectedFrames }` | `{ ok, id, status, alreadyStored }` |
| 9 | `POST /api/warmup-runner/recordings/{id}/frames` | `{ frames: [{ index, elapsedSec, type }] }` | `{ ok, status, uploads: [{ index, path, url }] }` |
| 10 | `POST /api/warmup-runner/recordings/{id}/complete` | — | `{ ok, stored, found, expected }` |
| 11 | `POST /api/warmup-runner/plug-events` | `{ deviceId, pluggedInAt, unpluggedAt }` | `{ ok, id }` |

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
7. **The warmup's report.** Sent once after every warmup that reached the
   phone, finished or stopped for any reason, including a stop before
   Running (`feed_not_loading`, `wrong_account`, ...), which has no run. Not
   sent for a session skipped before the phone was touched.
   - `startedAt` is the run's start (the same instant as operation 3) when
     Running was said; otherwise when the session began on the phone. Same
     window as operation 3: the last 36 hours, at most 5 minutes ahead.
     `endedAt` must not be before it.
   - `outcome` is `"finished"` or `"stopped"`; `note` is the stop reason
     (HANDOVER section 16), `null` when finished. 500 characters at most.
   - `minutes` is the whole minutes recorded, 0 to 600. 0 is allowed here.
   - `counts` is `{ videos, posts, claudeChecks, onTopic, likes, saves,
     follows }`, all seven, each a whole number from 0.
   - `log` is the diary: the runner's own JSON log lines (pino) for this
     warmup, newline-separated, keys already scrubbed. Up to 1,000,000
     characters, or `null`.
   - `screenshot` is the screen at a stop as plain base64 PNG (no `data:`
     prefix), up to 3,000,000 characters, or `null`.
   - **Keep the whole request under 4.5 MB.** That is Vercel's limit on a
     request, and a full-size diary (its quotes escaped in JSON) plus a
     full-size screenshot comes close to it.
   - Accepted for any account and phone that exist, Automated or not: a
     report is history, and the account may have been flipped to Manual
     mid-warmup.
   - The summary is kept for good. `log` and `screenshot` are cleared after
     30 days; the dashboard clears old ones whenever a new report arrives.

8. **Announce a recorded session** (PF-26, 2026-10-21). The recorder on
   the Air kept frames of a manual posting session and wants to send them.
   `deviceId` is the phone; `startedAt` is the first frame's time and names
   the session with the phone, so sending it twice lands on the same row;
   `endedAt` is the last frame's time; `expectedFrames` is how many frames
   will follow, 1 to 3,000. Answer `{ id, status, alreadyStored }`. When
   `alreadyStored` is true the session was confirmed earlier: skip to
   deleting the Air's copy.
9. **Upload links for frames.** Up to 200 frames a call, as many calls as
   needed. Each frame is `{ index, elapsedSec, type }`: `index` its 0-based
   position in the session, `elapsedSec` the seconds since the first frame,
   `type` one of `image/jpeg` (the default), `image/png`, `image/webp`. Each
   answer carries a one-time link per frame: **PUT the frame's bytes to
   `url` with `Content-Type` set.** That goes straight into the private
   bucket, not through the dashboard, so the 4.5 MB request limit does not
   apply; a frame may be up to 2 MB. A link for a frame already uploaded
   overwrites it, so a retry is safe. `uploads` is empty when the session is
   already stored.
10. **Confirm.** No body. The dashboard counts the frames actually in the
    bucket. `{ stored: true, found, expected }` means every expected frame
    is there and **the Air may now delete its copy**. 409 `frames_missing`
    with the same counts means it must not: ask for links for the missing
    indexes (operation 9) and confirm again. Never delete before
    `stored: true`.
11. **The plug-in log.** Send `{ deviceId, pluggedInAt, unpluggedAt: null }`
    when a phone appears on the Air, and the same `pluggedInAt` with
    `unpluggedAt` filled when it goes. **Every day, frames or not**: it is
    what lets the dashboard tell a post made with the phone unplugged from a
    recording that failed.

**Safe to retry.** Starting a run twice returns the same run. Closing twice
keeps the first close. Writing the same session twice answers
`alreadyRecorded: true` and changes nothing. The database has one scripted row
per run, so a retry can never count twice. Sending the same report twice
(same account, session and start) answers `alreadyReported: true` with the
first report's id, and changes nothing. Announcing a session twice returns
the same `id`; asking for a frame's link twice gives a link that overwrites;
confirming a stored session answers `stored: true` again.

## Refusals

Each refusal is `{ error, code }`. `error` is a sentence to log; `code` is
what to branch on.

| HTTP | `code` | Meaning |
|---|---|---|
| 401 | `unauthorized` | Wrong or missing token |
| 503 | `not_configured` | The dashboard has no token set |
| 400 | `invalid_body` | A field is missing or malformed. The sentence names the field |
| 400 | `invalid_field` | Operation 7 only: `log` is over 1,000,000 characters or not text, or `screenshot` is over 3,000,000 characters or not a plain base64 PNG |
| 400 | `invalid_date` | `date` is not a real YYYY-MM-DD |
| 400 | `invalid_minutes` | Not a whole number from 1 to 600 (0 to 600 for operation 7), or more minutes than passed between `startedAt` and `finishedAt` / `endedAt` (one minute of slack is allowed) |
| 409 | `not_eligible` | The account fails the five checks. For operation 6, this only happens when no run was started either (see below) |
| 409 | `wrong_phone` | The account, or its run, is on a different phone than `deviceId` |
| 404 | `run_not_found` | No run was started with that account, session and start |
| 409 | `run_closed` | A check-in arrived for a run already closed |
| 409 | `not_found` | The account or the phone no longer exists |
| 404 | `session_not_found` | Operations 9 and 10: no session with that id |
| 409 | `frames_missing` | Operation 10: fewer frames in the bucket than announced. `found` and `expected` say how many. Keep the Air's copy |
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

**The warmup robot log.** An account the robot has reported on gets a
**Warmup Robot Log** tab on its page, beside the others. One row per warmup,
newest first: when (New York time), Warmup 1 or 2, Finished (green) or
Stopped (red), the minutes, and the stop note with the counts ("videos 128 ·
Claude 12 (5 on topic) · likes 1 · saves 1 · follows 0"). Clicking a row opens
its diary: each line as `HH:MM:SS ET  LEVEL  message` (pino's 30 is info, 40
WARNING, 50 PROBLEM), the stop screenshot if there was one, and two buttons:
**Copy for Claude** (a short header naming the account, phone, warmup, times,
outcome and counts, then the raw JSON lines) and **Download** (the same text as
a `.log` file). After 30 days the row stays and says its diary was cleared.

The list never reads a diary or a screenshot. A row's diary is read when it is
opened, from `GET /api/warmup-reports/:id`, and its screenshot from
`GET /api/warmup-reports/:id/screenshot`. Both are for a signed-in person, like
the rest of the dashboard; the robot's token does not open them.

Storage is `warmup_runs`, one row per run
(`supabase/migrations/20260928120000_warmup_runs.sql`), and `warmup_reports`,
one row per report (`supabase/migrations/20261009171409_warmup_reports.sql`).
Like the other phone tables, only the master key can read or write them.
