# DA-06 handover: the robot that reads each app's analytics screens

For whoever builds the phone half of DA-06 in the warmup robot's repository
(`garrethdev/warmup-runner`; a clone sits at `~/Documents/warmup-runner` on
Czedrick's Mac, the Air's copy at `~/warmup-runner`). Written 2026-10-23 by
Claude at Garreth's request, from the dashboard side, where the reading half
is already built. The ticket itself, with the decisions and the design, is
`docs/DEEP-ANALYTICS-TICKETS.md` in the dashboard repository, sections DA-05
to DA-08. Read that first; this file is the brief for the runner work only.

## What exists already (dashboard side, 2026-10-23)

- **The reader.** `src/server/screen-readings.ts` takes one post's analytics
  screenshots (every tab, scrolled to the bottom) and fills one row of
  `post_screen_readings` with Claude Haiku 5.5 through OpenRouter. Proven on
  five posts against the API's own numbers: every number matched. About a
  tenth of a cent per post.
- **The table.** `post_screen_readings` (migration
  `20261023071133_post_screen_readings.sql`): one row per reading of one
  post, every number nullable, "empty is not 0". Columns are listed in DA-08.
- **The bucket.** `post-screens`, private, holds the screenshots at
  `<platform>/<account>/<yyyy-mm-dd>/<nn>-<name>.jpeg` so a wrong read can be
  checked against the picture.
- **The command-line tool.** `scripts/read-screenshots.ts` reads a folder from
  a manifest. The robot replaces the person taking the screenshots; the
  reading stays on the dashboard.

## What the robot has to do

One job, "read analytics", beside the warmups, on **Fridays only** (Garreth,
2026-10-20), for every account on every phone, reading every post from the
past seven days plus any older post with no reading yet.

Per account:

1. Switch the phone to the account, as a warmup does.
2. Open the app, go to the profile, open posts from the grid newest first.
3. On each post, open its analytics and go through every tab, taking a
   screenshot, scrolling about four fifths of a screen, screenshotting again,
   until the bottom of each tab. Pause a few seconds between taps; use the
   same unhurried swipe as the warmups. At most about a dozen posts per
   account per sitting.
4. Upload the screenshots to the `post-screens` bucket under
   `<platform>/<account>/<date>/`, numbered in the order taken.
5. When the account is done, call the dashboard's route (below) with the list
   of posts and their screenshot paths. The dashboard reads them.

The tabs per app, from Yurie's screenshots (DA-05):

| App | How to reach the analytics | Tabs / parts to capture | Ignore |
|---|---|---|---|
| TikTok | tap the view count under the post, or "More insights" → "Video analysis" | Overview (has the "not eligible for For You" banner when restricted), Viewers, Engagement | Inspiration tab |
| Instagram | "View insights" under the post (a bar at the bottom of a Reel) | Overview, Engagement, Audience with its Age, Country and Gender chips | "Views over time" chips (All / Followers / Non-followers) |
| Facebook | "View insights" / "See insights" under the post | one long page; swipe each pair of side-by-side cards (Traffic and Source; Age and gender and Countries; Facebook and Instagram engagement) | the Creator assistant card, Tips |

Photo posts on TikTok and Facebook have not been seen yet (still with Yurie);
assume the same shape until they are.

## Rules that matter

- **Tap buttons by their name, not their position.** `readScreen()` gives
  every button's spoken label ("View insights", "Audience", "More insights").
  Use coordinates only to scroll. When a name is not on screen, screenshot
  what is there, record the post as a problem with the reason, and move to
  the next post. Never guess a tap.
- **Looks like a person.** No rapid-fire screens. One post at a time, in the
  account's quiet hours, never during a warmup; the planner holds both.
- **Only look.** Never like, comment, follow, post or change a setting.
- **Pilot first.** Phone 1 only, on glow.with.becky (TikTok),
  hey.imani.vaughn (Instagram) and Imani Vaughn's Facebook, the three accounts
  already read by hand as readings 1 to 3, for two Fridays before any
  widening (DA-07).
- **Identify a post by what is on its screen,** the caption's first words
  and the posted date, not by a link. The reader matches those to the
  performance tables by account, caption prefix and date.
- **TikTok's seven-day worry.** Watch time may vanish once a post has been
  quiet for a week. It was still there at six and a half days on the one
  video checked. Read the oldest posts first each Friday until that is known.

## The hand-off to the dashboard (to build on the dashboard side)

A route, `POST /api/screen-readings/run`, guarded by `CRON_SECRET` and listed
in `src/proxy.ts` (or production sends it to the login page), taking:

```json
{ "read_by": "robot",
  "posts": [ { "platform": "tiktok", "account": "glow.with.becky",
               "caption": "The experiment was designed around going without.",
               "posted_at_text": "Oct 16, 2026, 11:43 AM",
               "screenshots": ["tiktok/glow.with.becky/2026-10-24/01-overview.png", "..."],
               "problem": null } ] }
```

The dashboard reads each post's screenshots from the bucket with the reader,
matches the post to its performance row, and writes the reading. Not built
yet; the runner work can start before it exists, uploading to the bucket and
logging what it would have sent. The runner already holds the dashboard token
(`WARMUP_RUNNER_TOKEN`) for its warmup reports; reuse that door.

## What is not decided

- Where the Friday job sits in the runner's planner, and whether it shares a
  sitting with the warmups or gets its own window.
- The exact screenshot format: the driver gives PNG; the reader accepts PNG
  or JPEG, and JPEG at phone size is about 50 KB a screen.
- Whether the robot should also open the account-level insights screens
  (followers over time, profile reach). Not in scope until asked.

## Done when

The robot has read the three pilot accounts on phone 1 on a Friday, the
screenshots are in the bucket, the dashboard has written readings for them,
and the numbers match a by-hand look at the phone the same day.
