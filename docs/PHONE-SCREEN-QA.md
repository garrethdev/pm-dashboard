# Phone screen QA — can we check Yurie's manual process?

Findings from a conversation with Garreth, 2026-10-20. The goal: watch the
manual warmup and posting process on the real phones to check that Yurie is
doing the steps right, in a way that stays **truthful**. She already knows
sessions may be recorded for quality checks; what she must not know is **when**
a given session is being checked, so she cannot perform only for the camera.

This is a decisions-and-options note, not a build. The build is ticket
**PF-26** in `BACKLOG.md`. Czedrick owns anything on the Air.

**Updated 2026-10-21 (Garreth).** The scope narrowed to **manual posting**:
once every account is on Automated warmups nothing is warmed by hand, and the
robot warmups are not touched. The plan of record is **record every posting
session, copy nightly to a private bucket on the dashboard, delete from the
Air once the copy is confirmed, and pick sessions at random to review** on a
page only Garreth and Czedrick can see. Picked-days and fixed-interval
recording were both considered and set aside: a picked day leaves a trace on
her Air that says which day was chosen, and a fixed interval is learnable. All
three phones already have the agent and Auto-Lock set to Never. There is no
written step list: Claude reads a session for anomalies and errors rather than
against a fixed sequence. The phases and the page design are in the PF-26
entry in `BACKLOG.md`; the sections below are the 2026-10-20 reasoning and
stand as written.

## The short version

- **Save screenshots, not video**, and read them with Claude against the
  written step list. This is invisible on the phone and is the plan of record.
- **The real dependency is the Air**, not Tailscale. The phones plug into the
  Air by cable, and the recorder runs on the Air, so the Air must be powered on
  and awake during her sessions.
- **Record all the time, review at random.** If every session is capturable,
  there is no "when" to leak. You choose which sessions to read afterwards.
- **A plug-in rule is her hand, not a lock.** Telling her to always connect the
  phone to the Air works only if a session with no screenshots behind it is
  itself treated as a red flag, caught by cross-checking the posted results and
  the phone's own activity.

## Why screenshots, not video

Three ways to capture a screen, only one of which Yurie cannot see:

- **QuickTime on the Air** — ruled out. While it records, the phone's status
  bar switches to the showroom clock (9:41, full bars). That is a tell, and it
  opens a window on the laptop.
- **The phone's built-in Screen Recording** — ruled out. A red pill sits in the
  status bar the whole time, and she has to press it herself.
- **WebDriverAgent screenshots** — chosen. The agent already installed on the
  phones takes screenshots from inside Apple's UI-testing tools. It shows
  nothing on screen, does not change the status bar, and does **not** raise the
  "screen is being captured" flag that TikTok and Instagram can read. A small
  program on the Air asks the agent for one picture every few seconds while she
  works and keeps only the frames where the screen changed.

Screenshots are also the right shape for the check: Claude reads a run of
labelled stills well, the files are tiny (a few hundred images for a 20-minute
session), and it is the same idea the warmup plan already uses to judge whether
content fits (`docs/REAL-PHONE-MASTERPLAN.md`). A 20-minute video would have to
be watched; a run of stills produces a short verdict with the moments to open.

## What this reopens

The live view decided on 2026-10-02 that the agent runs **only while the robot
is warming a phone up**; between warmups a phone is Offline to the Air
(`docs/LIVE-VIEW-TRACKER.md`, Decisions). Taking stills during Yurie's **own**
manual session means the agent and a screenshot poller have to run while she
works, not only during robot warmups.

**Decided 2026-10-20 (Garreth):** this is **not** the 24/7 "phone keeper" that
was turned down on 2026-10-02. Instead the agent and the recorder **start
automatically when the Air is powered on and run for as long as it is open,
then stop when Yurie closes it.** The agent is alive for the whole span she is
working — manual warmups and manual posting alike — not only during robot
warmups. This is lighter than the keeper and tied to exactly the window she is
working in; the phones are never live when no one is at them.

Two tells to remove before the agent goes always-on:

- **Auto-Lock.** A running agent keeps the phone awake. A phone that suddenly
  stops locking is noticeable, so set Auto-Lock to Never on every farm phone
  first, so nothing changes on the day the agent goes always-on.
- **The live view page.** With the agent always on, the phones show live on
  that page all day instead of Offline between warmups. Yurie can reach that
  page from the dashboard. It tells her the agent is alive, which she already
  knows means a check is possible; it tells her nothing about which session is
  read.

## The dependency that actually bites: the Air

Whatever the phones plug into must be powered on and **in the same place as the
phones**, because Yurie taps the phones by hand. So the recording hub is
wherever she and the phones are.

- **The Air must be on and awake.** Phones connect by USB; the agent and the
  recorder both run on the Air. If the Air is asleep or shut down, nothing is
  captured.
- **Tailscale is not part of the capture.** Tailscale only carries remote
  access — Czedrick viewing the live page or pulling files from his own Mac,
  and the nightly copy off the Air. The agent talking to the phones over the
  cable and the recorder saving locally both work with Tailscale down.

**Do not make Yurie the one who opens the Air for a session.** That hands her
the on-off switch for her own recording: she can post with the Air closed and
capture nothing. The Air's power must be out of her hands.

### If the Air cannot stay on all the time

**Decided 2026-10-20 (Garreth): option 2 — keep Yurie's Air as it is now.** She
opens the Air whenever she does a warmup or a posting session, and the agent and
recorder start on their own when it powers on. No dedicated hub, no change to
where the phones live. This is covert but **not** tamper-proof — a session done
with the Air closed captures nothing — so the cross-checks in the next section
are what make it hold.

Garreth's constraint: the Air cannot be left open the whole time (it is a
laptop, likely hers, that goes home). Three honest options, best first:

1. **A dedicated hub that is not hers.** A cheap Mac mini or spare Mac sits in
   a fixed spot, plugged into power, never sleeps; the phones live on it; the
   agent and recorder auto-start on boot. Yurie does her sessions there and
   never touches the machine's power. **This is the only setup where "she
   cannot fake it" is actually true.** It costs one machine and needs the
   phones to stay in a fixed location rather than travel with her.
2. **Her Air, with auto-start, and accept gaps.** The recorder starts whenever
   the Air powers on, no step for her. You capture every session where the Air
   happens to be open, which is most of them, since she needs it connected for
   the phones anyway. Weakness: she can post with the Air closed and capture
   nothing, so this is covert but not tamper-proof — close the gap with the
   cross-checks below.
3. **Drop covert recording; check the results instead.** No always-on machine.
   Verify sessions three ways that need nothing from the Air: the phone's
   **Screen Time** minutes in TikTok and Instagram, **TikTok's activity log**
   (the likes and follows a session produced), and **unified_posts and the live
   platform** (what actually got posted). These cannot show which buttons she
   pressed, but they confirm the session happened, roughly how long it ran, and
   what it produced — and they raise no privacy question.

If the phones can live in one place, option 1 is worth the one machine. If the
phones travel with Yurie, covert recording cannot be made reliable, and the
result checks in option 3 are the honest fallback.

## The plug-in rule, and why it needs a cross-check

*2026-10-23 (Czedrick): the "Posts with no recording" list that did this
cross-check on the Sessions page is no longer shown. The page lists only
recorded sessions; the check stays in the code, unused. The reasoning below
is kept as written.*

Garreth's plan: tell Yurie that from now on, whenever she posts, the phone must
be connected to the Air. As a standing rule this is good, because she is told
to plug in **every** time, so she never learns which sessions are read.

What it does **not** do is force the recording — plugging in is her hand, and
the Air still has to be on. The gap is closable: **a session that happened but
left no screenshots is itself the red flag.**

- **Manual posting:** every real post shows up in `unified_posts` and on the
  platform. A post with no matching screenshots for that time window means she
  did not plug in. That is a violation you can see, even without seeing the
  process.
- **Manual warmups:** these do not post, so compare the phone's Screen Time
  minutes and TikTok's activity log against the minutes she logs in the
  dashboard. Logged minutes with no screenshots and no matching phone activity
  is the same red flag.

So the honest instruction is: plug in every time, and understand that a post or
a logged session with no recording behind it is treated as not done. That
removes the incentive to skip the plug, which is the only way the rule holds up.

## Reviewing without watching everything

- **Pick by chance, not by suspicion** — say two sessions a week drawn at
  random from the saved frames, matched to the minutes she logged by phone and
  time. Reviewing only after a bad week makes the pattern visible and teaches
  her when to perform.
- **Feed the frames to Claude** against the written step list. The output is a
  short verdict per session: which steps happened, which were skipped, where
  she deviated. A human opens the frames only at the flagged moments.

## Privacy

She is already aware that sessions may be recorded for QA (Garreth,
2026-10-20), which is what makes this fair and is the standard footing for
recording someone's work. Keep that standing notice in writing. The point is to
catch process slips, not to surveil, so the random, never-announced timing is
what keeps the check truthful without hiding the fact of it.

## Where the work sits

- The always-on agent, the screenshot recorder and the nightly copy belong in
  Czedrick's **warmup-runner** repository on the Air, kept separate from the
  runner exactly as the live view is (`docs/LIVE-VIEW-TRACKER.md`).
- Each new phone needs the agent installed first (`docs/PHONE-AGENT-SETUP.md`,
  "Each new phone"). All three farm phones have it as of 2026-10-21.
- The dashboard side, decided 2026-10-21: an upload address for the Air, a
  private storage bucket, and a reviewer-only Sessions page gated by a
  `REVIEWER_EMAILS` setting, since there is no reviewer-only view today and
  Yurie uses the dashboard. Details in the PF-26 entry in `BACKLOG.md`.
- **Open question for Czedrick:** whether the recorder reads the agent's
  picture stream directly, or asks the live view for frames. The first is
  simpler; the second avoids two readers on one phone.
