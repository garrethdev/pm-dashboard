# Live view — build tracker (PF-14, P9)

A web page that shows every phone's screen live, from anywhere, and lets you
tap and swipe on them. It runs on the MacBook Air (where the phones are
plugged in), is reached over Tailscale only, and the dashboard links to it.
Tickets: PF-14 in `BACKLOG.md`, P9 in `docs/PHONE-FARM-DESIGN-TICKETS.md`.

Started 2026-10-01 at Czedrick's request. Update this file as each step moves.

## Start here

**Where it stands (2026-10-02): live on phone 1.** The live view runs on the
Air and shows phone 1 at `https://yuries-macbook-air-1.tail85d8ff.ts.net`;
Czedrick tapped it from his own Mac and the tap landed. `LIVE_VIEW_URL` is set
on Vercel production and the dashboard was redeployed with it, so the Live
view buttons are switched on. Phone 2 has not arrived.

**Next:**

- **The live view is for watching warmups, not always on** (Czedrick,
  2026-10-02; see Decisions). Between warmups a phone shows Offline, and that
  is expected. Phone 1 is live today only because it was set up by hand.
- **When phone 2 arrives:** the agent (`docs/PHONE-AGENT-SETUP.md`, "Each new
  phone") and its entry in the Air's phone list. No connections to open by
  hand: the robot opens them when it starts a warmup.
- **Before the robot's first real run on the Air:** stop the two connections
  opened by hand on 2026-10-02 (`pkill iproxy` in phonefarm). They hold the
  ports Appium will want. A restart of the Air also ends them.

**Optional, any time, no Air needed:**

- Garreth has not looked at the live view; it can be shown on pretend phones
  (warmup-runner `live-view/README.md`, "Try it on pretend phones").
- A test against Apple's pretend iPhone, which runs the real WebDriverAgent:
  needs Xcode on Czedrick's Mac (about 10 GB, no developer account).
- The first seconds of a warmup, before Running, are not marked busy, so a
  tap could land then. Covering it means changing the runner's session steps;
  a decision for Garreth and Czedrick, not urgent.
- The dashboard buttons have not been looked at in production yet. Phone 1
  is registered as dashboard device 25 ("Iphone 1"), so its page and the
  Devices card should both show the link now.

**To pick it up:** the runner is cloned at `~/Documents/warmup-runner` on
Czedrick's Mac. The live view's own notes are `live-view/README.md` there;
its tasks are L1–L6 in that repository's `TASKS.md`.

Status key: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

## Where the code lives

- **The page and its server:** `live-view/` in the `garrethdev/warmup-runner`
  repository. It runs on the Air next to the runner and reads the same
  `config/fleet.json`, so there is one list of which phone is on which port.
  It is **a separate program**: it never starts, stops or imports the warmup
  runner (HANDOVER section 17 says the live view is not part of the runner).
- **The dashboard's links:** this repository (step 5).

## Steps

- [x] **1. A pretend phone.** (2026-10-01) `live-view/pretend-phones.ts`.
  Behaves like WebDriverAgent from the outside, including its one-session
  rule: a stream of pictures, and it takes taps and swipes. It plays the
  runner's 57 labelled TikTok screenshots; a swipe up moves to the next one
  and every tap is printed, so a gesture visibly lands. Any phone can be left
  switched off to see that state.
- [x] **2. The small server for the Air.** (2026-10-01) `live-view/server.ts`.
  Serves the page, reads the fleet list, hands out each phone's newest
  picture, passes taps and swipes on. Listens on the Air itself only, not the
  home Wi-Fi.
- [x] **3. The page.** (2026-10-01) `live-view/public/`. Every phone side by
  side, one phone enlarged (`?phone=<id>`), click to tap, drag to swipe, a
  phone that is off says Offline, and a red line when the Air stops answering.
  The dashboard's colours and font, dark and light.
- [x] **4. Reviewed and approved** (2026-10-01) by Czedrick, in Safari, on
  pretend phones, after four rounds of changes: four to a row, no flicker,
  Settings for phones per row and which phones to show, and rows as tall as
  the window. How to open it: `live-view/README.md`, "Try it on pretend
  phones". Garreth has not looked at it yet.
- [x] **5. The dashboard links.** (2026-10-01) The Live view button on a
  phone's page now opens that phone enlarged in a new tab, and the Devices
  card has a Live view link. Both read the Air's address from `LIVE_VIEW_URL`;
  unset, they stay inert as before. When the Air does not answer, the button
  reads "Air offline" and cannot be pressed. **On `main` since 2026-10-01
  (PR #38).** `LIVE_VIEW_URL` set on Vercel production and redeployed
  2026-10-02.
- [x] **6. Phone day, on the Air** (2026-10-02, phone 1). See "What was done
  on the Air" below. Phone 2 repeats the phone parts when it arrives.
- [~] **7. Done when** Czedrick opens the page from his own Mac, sees both
  phones live and taps one. Phone 1: seen live and tapped, 2026-10-02, on
  connections opened by hand. Phone 2: not here yet. Since the live view only
  runs during warmups (Decisions, 2026-10-02), the real proof is the robot's
  first warmup on the Air (runner M3): the phone shows live while it runs,
  taps are refused, and it goes Offline when the warmup ends.

## Facts checked so far

- **WebDriverAgent's addresses** (read from its source, latest commit
  2026-09-30): a tap is `POST /session/<id>/wda/tap` with `x`, `y`; a swipe is
  `POST /session/<id>/wda/dragfromtoforduration` with `fromX`, `fromY`, `toX`,
  `toY`, `duration`; the screen size is `GET /window/size`, which works without
  a session; the picture stream is its own port (9100 by default).
- **Opening a new session ends the one already open.** WebDriverAgent keeps
  one session per phone, and every answer it gives names the current one. So
  the live view **borrows the session that is already open** (the robot's,
  during a warmup) and only opens its own when none is open. It never cuts the
  robot off.

## What was checked, and how

All on Czedrick's Mac, 2026-10-01, on pretend phones. Built and checked in
headless Chrome; then reviewed and **approved by Czedrick in Safari** (step 4)
after the changes in the log. Nothing has run on a real phone or on the Air.

- **Tests:** 29 for the live view (fleet list, settings, the tap arithmetic,
  reading pictures out of the stream, and the server against pretend phones,
  including that it borrows an open session rather than ending it and refuses
  taps while the robot runs). The runner's other 317 tests pass, 346 in all,
  including 8 for the busy mark. The dashboard's 406 tests pass; types and
  lint are clean.
- **Six pretend phones, one off:** every live phone showed its picture, the
  off one said Offline, the count said "5 of 6 live". Desktop and phone
  widths, dark and light.
- **A real click and drag** on the enlarged phone: the click reached the
  pretend phone as a tap at the same spot (195, 313 on a 390 × 844 screen),
  and the drag as a swipe up, which moved it to the next video.
- **The Air going away:** the server stopped while the page was open; within
  a few seconds a red "Can't reach the Air" line appeared and every phone
  went Offline.
- **The dashboard button**, on the invented phone (`/devices/1?demo=1`): with
  the Air up it was a link to `…/?phone=0`; with it down it read "Air offline"
  and was disabled.
- **The button at a phone's width** (2026-10-01, after approval): 44 pixels
  tall, the height a thumb needs, and it fits beside the phone's name, both as
  Live view and as Air offline.
- **Not seen:** the Devices card link, because no phone is registered and the
  card only shows it when there are phones. Anything on a real phone.

## A change of plan on the way

The page first showed each phone as a continuous video stream. A browser opens
at most six connections to one address, and a stream holds one open for good,
so six phones would have used all six and left nothing for taps. The server
now keeps one stream per phone itself, and the page fetches the newest picture
in a loop. A slow link shows fewer pictures rather than falling behind.

## Decisions

- **The live view only has to work while a warmup is running** (Czedrick,
  2026-10-02). Appium starts and owns the agent on each phone, as the runner's
  plan already says; nothing keeps it running between warmups, so a phone
  shows Offline then. The always-on alternative (a "phone keeper" on the Air
  owning the agent, with Appium plugging into it, the iOS Farm way) was
  offered and turned down. Consequences: taps are refused during warmups and
  the phone is Offline between them, so **in practice the live view is for
  watching**; tapping a phone by hand stays with Screen Sharing. And the robot
  must have Appium open the picture connection when a session starts, or the
  live view shows Offline even during warmups: runner TASKS.md, M3.
- **Taps are refused while the robot is warming a phone up** (Garreth and
  Czedrick, 2026-10-01). Built in the live view the same day: the phone's
  pill reads Running, a tap or swipe shows "The robot is warming up this
  phone", and nothing reaches the phone. It knows from a mark the runner
  keeps per phone (warmup-runner `live-view/README.md`, "The robot's mark").
  **The runner leaves that mark** (runner task L6, built 2026-10-01 with
  Czedrick's OK): up at Running, refreshed every minute, down when the
  session ends however it ends. Checked on the pretend phone only. Not
  covered: the first seconds of a session, before Running, while the robot
  opens TikTok and checks the username.
- **The Air's address is 100.85.112.50** (Garreth and Czedrick,
  2026-10-01): the `yuries-macbook-air-1` entry in Tailscale. **HTTPS certificates were
  switched on for the Tailscale network the same day** (confirmed from
  Czedrick's MacBook Pro, which now reports a certificate address), so the
  live view's address is `https://yuries-macbook-air-1.tail85d8ff.ts.net`,
  the same Air, and `LIVE_VIEW_URL` will be that. Being https is what lets the
  dashboard show "Air offline" instead of a tab that spins. Not tried on the
  Air yet: it was offline.

## What was done on the Air (2026-10-02)

Czedrick at the Air over Screen Sharing, in the **phonefarm** account (its
Tailscale is `yuries-macbook-air-1`, 100.85.112.50), pasting commands.

- **The runner's code** is at `~/warmup-runner`, warmup-runner `main`
  `a3b0bd3`, with `npm ci` run. It was sent from Czedrick's Mac over Tailscale
  (`tailscale file cp`), not cloned: GitHub refused the Air with "Error in the
  HTTP2 framing layer", and this way no GitHub login sits on the Air. **It is
  not a git copy**, so an update means sending a new package.
- **The phone list** (`config/fleet.json` on the Air only) holds phone 1 as
  device `25`, the dashboard's number for it, so the dashboard's button opens
  the right phone. Name "iPhone 1", control port 8100, picture port 9100, no
  accounts. The made-up practice phones were taken out of the Air's copy.
- **The phone's two connections** opened with `iproxy` (8100 and 9100) in the
  background; logs in `~/warmup-runner/logs/`. Started by hand: they do not
  come back after a restart or a log-out.
- **The live view** installed with `live-view/air/install.sh` (starts at
  log-in, restarts if it stops), and put on Tailscale with `tailscale serve
  --bg 4600`. The Tailscale command on this Mac is
  `/Applications/Tailscale.app/Contents/MacOS/Tailscale`; plain `tailscale`
  is not on the path.

**Checked from Czedrick's Mac:** the page loads at the address above; the Air
lists one phone, "iPhone 1", live, robot not running; pictures arrived in 0.35
to 0.6 seconds each, about 55 KB, through Tailscale's Hong Kong relay rather
than a direct connection (so about two a second, the slow case); the Air
answers the dashboard's "is it there?" check for
`https://pm-dashboard-ashen.vercel.app`. **Czedrick tapped the phone from the
page in his browser and the tap landed.** Not measured: several phones at
once, since there is only one.

## Still to do on phone day (step 6)

The checklist is in warmup-runner `live-view/README.md`, "On the Air (phone
day)". Ready in advance (2026-10-01): `live-view/air/install.sh`, which keeps
the live view running on the Air and restarts it if it stops. Checked on
Czedrick's Mac without installing: the file it writes passes macOS's own
check, and the exact command it runs starts the live view. Not yet run on the
Air. In short:

1. Pick the macOS account: the one that runs the runner and whose Tailscale
   is `yuries-macbook-air-1`.
2. Forward each phone's two ports; give each phone a `name` in
   `config/fleet.json`.
3. `live-view/air/install.sh`, then `tailscale serve --bg 4600`.
4. Open `https://yuries-macbook-air-1.tail85d8ff.ts.net` from Czedrick's Mac;
   set it as `LIVE_VIEW_URL` on Vercel.
5. Measure picture speed over Yurie's internet.

## Log

Oldest first.

- **2026-10-01** — Steps written down. WebDriverAgent's addresses and session
  rule checked in its source.
- **2026-10-01** — Steps 1, 2, 3 and 5 built and checked on pretend phones.
  The first design streamed video and would have stalled at six phones (see
  "A change of plan on the way").
- **2026-10-01** — Garreth and Czedrick decided both open questions: taps
  refused while the robot runs (built in the live view, 5 new tests), and the
  Air at 100.85.112.50.
- **2026-10-01** — HTTPS certificates switched on for the Tailscale network.
  The Air steps now use `https://yuries-macbook-air-1.tail85d8ff.ts.net`.
- **2026-10-01** — Runner task L6 built, with Czedrick's OK: the robot marks
  a phone busy while it warms it up, so the refusal works end to end on
  pretend phones.
- **2026-10-01** — Czedrick's first review in Safari: four phones to a row
  (done); the screens flickered several times a second (fixed: pictures are
  painted on a canvas instead of swapped); dragging selected the phone names
  (fixed).
- **2026-10-01** — Settings added at Czedrick's request: phones per row (1–6,
  default 4) and which phones to show (all by default), remembered per
  browser.
- **2026-10-01** — Rows sized to the window's height, phones centred and
  never stretched across the width (Czedrick: one to a row was unreadable).
- **2026-10-01** — **Approved by Czedrick** in Safari (step 4).
- **2026-10-01** — After approval: the dashboard button checked at a phone's
  width; the Air's install script and phone-day checklist written.
- **2026-10-01** — Saved: warmup-runner `main` `a3b0bd3`; dashboard PR #38
  merged into `main`. Next is phone day.
- **2026-10-01** — WebDriverAgent installed on phone 1 by Czedrick on the Air
  and answering (`"ready" : true`). Phone 2 not here yet.
- **2026-10-01** — From Czedrick's Mac: a session on phone 1 through the
  Air's Appium, a screenshot, and a tap that opened General. Runner M1 met.
- **2026-10-02** — Phone day for phone 1. Runner code sent to the Air, phone 1
  in the Air's phone list as device 25, its connections opened, the live view
  installed and put on Tailscale. Live from Czedrick's Mac, and his tap
  landed. `LIVE_VIEW_URL` set on Vercel production; production redeployed.
- **2026-10-02** — Decided (Czedrick): the live view only during warmups, not
  always on. No phone keeper. The robot opens the phone's connections when it
  starts a warmup.
