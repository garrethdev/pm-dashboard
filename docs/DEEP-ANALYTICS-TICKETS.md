# Deep content analytics — tickets

**Status:** opened 2026-10-09 (Czedrick). **Nine tickets, DA-01 to DA-09.
DA-01 is built and live (2026-10-09); the rest are not started.** DA-01 and DA-02 are written in full; the rest are outlines, to
be filled in when the ticket before them is done.

**What this is for.** Today every platform gives us the surface numbers:
views, likes, comments, shares, saves. Czedrick asked on 2026-10-09 for the
numbers underneath: whether the hook held people (skip rate, hook retention),
how long they watched, how many watched to the end, where the views came from,
and whether a post won followers. Most content from here on will be photo
carousels, so the plan has to work for those, not only for videos.

## Decisions these tickets start from (Czedrick, 2026-10-09)

1. **Instagram first, because it is free.** The Instagram connection we
   already have can return reach, skip rate, follows and profile visits. We
   just never asked for them. No Meta approval, no account changes, no cost.
2. **TikTok accounts stay personal.** A Business account would open TikTok's
   own watch-time and retention data, but loses trending music, and "we need
   the TikTok trending music". Switching is ruled out.
3. **Paid dashboards are ruled out.** Metricool and the rest use the same
   official connections we could use ourselves. They cover Facebook **Pages**
   only (our accounts are personal profiles), add nothing on Instagram beyond
   decision 1, and on TikTok personal accounts their watch-time data is
   unconfirmed. No other service covers all three either: the only kind that
   could logs into each account from its own servers, which is how accounts
   get banned.
4. **The deep numbers come from a robot reading each app's own analytics
   screens**, on the account's own phone, through its own proxy (DA-05 to
   DA-08). It is the only way to reach TikTok's retention data while keeping
   personal accounts, and the only way to reach Facebook's at all.
5. **Empty is not 0.** A number a platform does not give (skip rate on a
   carousel, follows on a Reel, views on a Facebook photo post) is stored as
   empty, never as 0. Every average and health check reads 0 as a dead post.
   This is the lesson from Facebook carousels on 2026-10-09 (CHANGELOG).

The research behind these decisions, and the options spreadsheet ("Content
Analytics Options.xlsx"), are from 2026-10-09. Expected new spend: about
$20–90 a month in Claude AI for tagging and screen reading, and no new
subscriptions.

## The tickets

| # | Ticket | Platform | Ready? |
|---|---|---|---|
| DA-01 | Pull Instagram's free deeper numbers | Instagram | **Built 2026-10-09** |
| DA-02 | Show the new Instagram numbers in the dashboard | Instagram | **Built 2026-10-09, awaiting Czedrick's check** |
| DA-03 | Tag every post with what is in it (AI) | All | Ready now, independent |
| DA-04 | Turn on professional mode on the Facebook profiles | Facebook | Ready now, by hand |
| DA-05 | Screen-reading pilot: Claude reads analytics screenshots | All | Ready now |
| DA-06 | Robot: open each app's analytics screens on phone 1 | All | After DA-05 |
| DA-07 | Robot: every account on every phone, on a schedule | All | After DA-06 |
| DA-08 | Store the robot's numbers | All | With DA-06 |
| DA-09 | Hook and retention comparisons in the dashboard | All | After DA-02, DA-03, DA-08 |

---

## DA-01 · Pull Instagram's free deeper numbers — Built 2026-10-09

**Built and live (2026-10-09).**
- Columns: `reach`, `skip_rate`, `follows`, `profile_visits` on
  `post_performance` (migration `20261009130639`).
- n8n "Analysis Engine": Get Insights + Merge Insights became one Code node
  that requests per post and falls back to shorter lists. Normalize Data
  writes the new numbers only when given. Posts are read for 28 days. Only
  posts from the last 7 days get this run's `week_of`, because the weekly
  reports and `v_weekly_outliers` read `week_of` as "this week". The first
  test run re-stamped six September posts; they were put back by the old
  rule.
- Two runs wrote reach and skip rate on all 9 Reels of the 5 connected
  accounts.
- **Still open:** the carousel half, which needs a carousel from a connected
  account. The three-post "match the Instagram app" check below is still to
  do; the per-post requests make a mismatch impossible by construction, but
  nobody has compared by eye.


**What we get, per post:**

| Number | What it means | Reels | Carousels and photos |
|---|---|---|---|
| **Skip rate** (`reels_skip_rate`) | % of viewers who swiped away in the first 3 seconds. Instagram's own hook number: lower is better | ✓ | — not offered |
| **Reach** (`reach`) | Different people who saw it (views counts the same person twice) | ✓ | ✓ |
| **Follows** (`follows`) | People who followed the account from this post | — not offered | ✓ |
| **Profile visits** (`profile_visits`) | People who opened the profile from this post | — not offered | ✓ |

**Checked live on 2026-10-09**, on a Reel posted the day before: reach (96)
and skip rate (53.2) came back. Follows, profile visits and profile activity
were refused on the Reel ("does not support the follows metric for this media
product type"), as Meta's documentation says. **Two things the research
expected but which do not work today:**
- `reposts` is refused on Reels.
- `crossposted_views` / `facebook_views` answer "Fatal".

Both are left out. **Not yet checked live: the carousel half.** Of the
connected accounts, only `nia_thriving` has carousels, and its login is
blocked by Instagram. Check reach, follows and profile visits on the first
carousel a connected account posts.

**Who it covers:**
- All 5 active Instagram accounts are connected. Only `hey.imani.vaughn` is
  posting today.
- 4 inactive accounts still hold dead logins: `kheidrajourney`,
  `itsamarajohnson`, `laylasjourney1` and `nia_thriving`. The workflow reads
  active accounts only, so nothing is missed.

**Where the change goes:** the n8n workflow **"Analysis Engine"**
(`9S5dhM8iwlz4LPma`). It runs Sun/Mon/Wed/Fri at 8 am New York time; its
trigger node says "8 AM PT", but the workflow's timezone is New York. It is
not in this repo. Its chain is: Fetch Accounts → Scrape IG Data (each
account's posts) → Fan Out Posts → **Get Insights** → **Merge Insights** →
**Normalize Data** → Upsert DB (`post_performance`).

**The work:**

1. **Add the columns** to `post_performance` (migration in this repo):
   - `reach integer`
   - `skip_rate numeric`, a percentage such as 53.2
   - `follows integer`
   - `profile_visits integer`

   All allow empty, with no default.
2. **Ask for the right numbers per kind of post.** One number Instagram does
   not offer for that kind of post fails the whole request, so the lists must
   differ:
   - Reels: `views,reach,saved,shares,ig_reels_avg_watch_time,ig_reels_video_view_total_time,reels_skip_rate`
   - Everything else (carousels, photos): `views,reach,saved,shares,follows,profile_visits`
3. **Fix the pairing in Merge Insights first.** Today it pairs each
   Instagram answer with a post by position: answer 3 goes with post 3. Get
   Insights sends failed requests down a separate error path. So one failure
   moves every later post's numbers onto the wrong post, silently. More
   metrics means more ways to fail, so this has to be fixed before step 2. Pair
   by post id, carried through, or by n8n's own item pairing, instead.
4. **Write empty, not 0** (decision 5). Normalize Data today writes
   `post.views || 0`, which turns "not given" into 0. Each new field has to be
   empty when Instagram did not give it. The existing fields can stay as they
   are, since Instagram gives them for every post.
5. **Read posts for longer than 7 days.** Scrape IG Data asks only for
   posts from the last 7 days, so a post's numbers freeze at day 7. Reach and
   follows keep growing after that, and Instagram's data can lag up to 48
   hours. **Proposed: 28 days, matching the health checks' window.** It costs
   nothing; Instagram does not charge for these calls. Needs a yes.
6. **Publish.** In n8n, saving only makes a draft. The change is live only
   when the workflow is published and its live version matches the draft.

**Leave alone:** the workflow holds the Supabase service key as plain text
(a known item, `BACKLOG.md`). Do not copy it into new nodes; reuse the existing
request nodes.

**Done when:**
- The first scheduled run after publishing writes reach and skip rate on
  `hey.imani.vaughn`'s Reels.
- Three of those posts' numbers match what the Instagram app shows for the
  same posts. That proves nothing shifted onto the wrong post.
- The first carousel from a connected account comes back with reach, follows
  and profile visits, and with skip rate empty.

**Cost:** $0.

---

## DA-02 · Show the new Instagram numbers in the dashboard — Built 2026-10-09, awaiting Czedrick's check

**Built (2026-10-09), uncommitted, to be checked by Czedrick** (he asked to be
the one to check, in place of the picture-for-Garreth step).
- The account page gains four tiles on Instagram accounts:
  - Skip rate, weighted by views, with its colours reversed
  - Reach
  - Follows and Profile visits, added at Czedrick's request; "—" when the
    range has no carousels
- Recent post rows show the four numbers when the post has them.
- A skip rate on a post with 0 views is hidden, because Instagram reports 0%.
- Cache key bumped to `account-analytics-v4`, because the payload changed
  shape.
- Alongside it (Czedrick): real-phone accounts no longer show the Geelark
  Automation Logs tab.
- The Analytics-page column described below was left for DA-09: its TikTok
  and Facebook rows would be empty until the robot exists.

**What:**
- On the account page's post list, show skip rate and reach on Reels, and
  follows and profile visits on carousels. A number the post does not have is
  left out, not shown as 0 or "—".
- On the Analytics page, show each account's average skip rate across its
  Reels.

**How:** these are additions to tables that already exist, not a new screen.
Show Garreth a picture of the changed rows before building (the rule for
screens). No instruction text on the screen; what skip rate means goes in the
changelog (the UI copy rule).

**Watch for:** skip rate is "lower is better", unlike every other number on
the page. Its colour or arrow must not read a fall as bad news.

**Done when:** `hey.imani.vaughn`'s account page shows skip rate on its Reels
and leaves it off its carousels.

**Cost:** $0.

---

## DA-03 · Tag every post with what is in it (AI) — Ready now, independent

**What:** for each post, Claude records what the post *is*, as fixed labels
rather than an essay:
- hook type
- the words on slide 1 / the first frame
- face or no face
- number of slides
- video length
- character

The dashboard can then compare tags within the same account: do question
hooks hold better than statement hooks on this account? Comparing across
accounts would mix in each account's own reach.

**Not this:** asking the AI to explain why one post did well. On a single post
it gives a confident story about what was mostly luck (research, 2026-10-09).

**To settle before building:**
- the list of hook types
- whether tagging reads the image file we already hold for each carousel (the
  generator has them), or the published post

This is separate from the broken "route-and-judge" scoring (PF-25).

**Cost:** about $15–60 a month in Claude, depending on post volume.

---

## DA-04 · Turn on professional mode on the Facebook profiles — Ready now, by hand

**What:** switch each Facebook profile to professional mode (free, in the
app). Without it, Facebook keeps no retention or view-rate numbers for a
profile at all, so there is nothing for the robot to read later.

**Check first, on one profile:**
- what the switch changes that a viewer can see
- whether it changes anything about how the account looks to Facebook's
  checks

Do the rest only after that.

**Still impossible after this:** any of it through an API. Meta: "Insights
for Videos on Users … are not available." Professional mode makes the numbers
exist in the app. Only the robot can read them.

---

## DA-05 · Screen-reading pilot: Claude reads analytics screenshots — Ready now

**What:** before any robot exists, settle the reading half. Someone takes
the analytics screenshots by hand on phone 1 (Yurie during her rounds, or
Czedrick on the live view):
- TikTok: More insights on a photo post and on a video
- Instagram: insights on a carousel and on a Reel
- Facebook: insights on a reel and on a photo post, if DA-04 is done

Claude reads each screenshot into the numbers DA-08 will store.

**What this answers:**
- which numbers each app shows for photo posts, which none of our research
  could settle
- whether Claude reads the retention curves accurately enough. A curve is a
  picture, so its reading will be approximate.
- what each screen costs to read

**Done when:** for each of the three apps, a table records what was on
screen, what Claude read and whether they match.

---

## DA-06 · Robot: open each app's analytics screens on phone 1 — After DA-05

**What:** WebDriverAgent (already on phone 1, `docs/PHONE-AGENT-SETUP.md`)
opens each recent post's analytics screen in TikTok, Instagram and Facebook,
scrolls through it and takes the screenshots DA-05 proved readable.

**To design:**
- how it finds the post
- what it does when a screen has changed
- how it avoids looking unlike a person: no rapid-fire screens, and done in
  the quiet hours

**Risk:** reading analytics on a schedule breaks the apps' terms, as the
warmup robot already does. Nothing found says the apps detect it, and nothing
says they do not. Pilot on one account for two weeks before widening.

---

## DA-07 · Robot: every account on every phone, on a schedule — After DA-06

**What:**
- set up the robot on each phone
- switch between the accounts logged in on that phone
- run overnight
- keep clear of warmups and posting

**Time:** roughly 10–20 phone-hours a month (research estimate).

**Timing:** TikTok's watch-time numbers may drop out once a post has been
quiet for 7 days, so each post must be read inside its first week.

---

## DA-08 · Store the robot's numbers — With DA-06

**What:**
- per post, per reading: retention curve points, % still watching at 3
  seconds, average watch time, % watched to the end, traffic sources, new
  followers
- the platform, so one table serves all three
- which reading it came from, keeping the screenshot for a while so a wrong
  read can be checked

Empty, not 0, for anything a screen did not show.

**Shown in the All posts tab** (Czedrick, 2026-10-09): each number the robot
reads becomes a column in that platform's All posts list, beside the ones
there today. Expected:
- TikTok: average watch time, % watched to the end, total watch time, new
  followers, and where views came from.
- Facebook: reach, plus watch time and retention on reels.

The exact list is what DA-05 finds on each app's screens. As today, a post the
robot has not read, or a number its screen did not show, gets a dash.

---

## DA-09 · Hook and retention comparisons in the dashboard — After DA-02, DA-03, DA-08

**What:** where the numbers start to answer questions:
- hook rate and the drop-off point, by hook type (DA-03), within each account
- the account's best and worst hooks this month
- carousels judged on saves, shares and follows per person reached, since no
  platform gives swipe-through

This is a design ticket first: a new screen, so it goes through the design
step before it is built.
