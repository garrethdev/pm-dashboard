# Deep content analytics — tickets

**Status:** opened 2026-10-09 (Czedrick). **Ten tickets, DA-01 to DA-10.
DA-01 and DA-02 are built and live (2026-10-09). DA-03 is live (2026-10-21).
DA-04 is done: pro mode was already on (Yurie, 2026-10-23). DA-05's reader
is built and 8 readings are stored; its photo posts are still with Yurie.
DA-06 is built on both sides and waits for Yurie's first sitting. DA-08 and
DA-09 are done (Garreth, 2026-10-23). DA-07 is not started.** DA-01 and DA-02 are written in full; the rest are outlines, to
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
| DA-02 | Show the new Instagram numbers in the dashboard | Instagram | **Built 2026-10-09, merged (PR #53)** |
| DA-03 | Tag every post with what is in it (AI) | All | **Built 2026-10-20, first live run after merge** |
| DA-04 | Turn on professional mode on the Facebook profiles | Facebook | **Done, already on (Yurie, 2026-10-23)** |
| DA-05 | Screen-reading pilot: Claude reads analytics screenshots | All | **Reader built 2026-10-23; 3 readings stored, photo posts still to come** |
| DA-06 | Robot: open each app's analytics screens on phone 1 | All | **Built 2026-10-23 on both sides, on the pretend phone; first real sitting (A5) needs Yurie and an Air update** |
| DA-07 | Robot: every account on every phone, on a schedule | All | After DA-06 |
| DA-08 | Store the robot's numbers | All | **Done 2026-10-23: table, reader route and All posts columns** |
| DA-09 | The Deep side of each account: watching, sources, audience, For You, and the hooks compared | All | **Done 2026-10-23 (Garreth). Live on real data; the reading cards fill as the robot's Fridays add up** |
| DA-10 | The Deep side of the fleet: the same numbers across characters and content types, on the main Analytics page | All | After DA-07's first weeks; design first |

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
- **Carousel half confirmed live 2026-10-20.** The four carousels posted on
  16 and 18 Oct by trina_triumphs and charlotte459336 came back with reach,
  follows and profile visits, and skip rate empty, as expected.
- **Carousel by-eye check done 2026-10-23.** Yurie's screenshots of the two
  trina_triumphs carousels (16 and 18 Oct) match what the fetch stored:
  views, reach (the app calls it "Viewers"), comments, follows and profile
  visits. One wrinkle, resolved: the 16 Oct post shows profile visits as
  "--" in the app while we stored 0. The stored payload shows Instagram's
  API itself answered 0, so the app hides a small number that the API
  states. Our storage is faithful; nothing to fix.
- **Reel by-eye check done 2026-10-23.** Yurie's screenshots of the
  hey.imani.vaughn Reel (18 Oct) match the fetch: 121 views, 3 likes, skip
  rate 57% (app and table both), average watch 5.7 s stored against "5s" on
  screen, reach 113 against 114 "Viewers" a day later. DA-01 is fully
  confirmed by eye.


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

## DA-02 · Show the new Instagram numbers in the dashboard — Built 2026-10-09

**Built (2026-10-09), checked by Czedrick and merged with PR #53** (he asked
to be the one to check, in place of the picture-for-Garreth step).
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

## DA-03 · Tag every post with what is in it (AI) — Built 2026-10-20

**Built 2026-10-20; the AI half has not run live yet.** It runs once the
change is merged. Settled first (Czedrick, 2026-10-20):
- **Hook types:** each lane keeps the ones its writers recorded. Comparisons
  are within one account, so lanes need not share a list.
- **Face:** tagged on carousels and on videos.

**What looking into it found.** Most of the tags were already written down
when the content was made, in each lane's own table:

| Tag | Where it comes from |
|---|---|
| Words on slide 1 / the first frame | The lane's table, for 20 of 22 lanes (six different column names). The AI reads them off the picture for Char 2 slideshow and Dating genre, which keep none. |
| Hook type | The lane's table, for seven lanes: Viral Theories, Journey 3-slide, Glowup, Covered Eye, Rich Life, before-and-after Journey, Embarrassed Angle. The rest get one from a short list the AI picks from: question, surprising fact, personal story, relatable ("when you…"), progress, talking to, curiosity gap, other. |
| Hook family | Journey has about 30 small types ("talk_to_weight:fired") in two families ("declaration" and "talk_to_weight"). Comparisons group by family, because 30 types over a few posts are too thin to compare. |
| Number of slides | The stored slides |
| Video length | The video file itself |
| Face or no face | The AI, looking at slide 1 or the frame half a second into the video. Any face counts, puppets and illustrated characters included, because Cleora is a clay puppet. |

**How it works:**
- One row per piece of content in `content_tags`, so a carousel posted to
  TikTok, Instagram and Facebook is tagged once. It joins to the posts on
  `carousel_id`.
- Each field the AI filled says so (`*_source` = `ai`). A tag that could not be
  read stays empty and `problem` says why.
- Runs every Friday at 10:30 am New York time (`/api/content-tags/run`,
  up to 200 pieces; Fridays only from 2026-10-20, Garreth) on
  anything that has posted and has no tags yet.
- Model: Claude Haiku 5.5 through OpenRouter, the key the Carousel Generator
  already uses. About $0.0002 a piece, so the whole back catalogue costs well
  under $1. That replaces the $15–60 a month estimated on 2026-10-09.

**Checked before merging:**
- Dry run on 12 live pieces (everything except the AI and the write): hook
  words, hook types, Journey families, slide counts and video lengths (8 to 68
  seconds) all came out right, in 19 seconds.
- Every one of the 2,895 posted pieces finds the row it was made from.

**Expected gaps in the back catalogue:**
- 173 Rich Life carousels have no stored slides anywhere, so no face tag.
  Their hook and hook type still come from the writer.
- 51 old Filler videos on Backblaze are gone (404).
- Early before-and-after videos are Google Drive links; the tagger rewrites
  them to the file and they read.

**Done 2026-10-20:**
1. **The first live run** (40 pieces). Face tags were checked by eye on four
   pictures. Two fixes followed: shorter AI replies, and a "relatable" hook type.
2. **The catch-up.** All 2,895 posted pieces are tagged: 1,239 in full, and
   173 with no stored pictures. 1,481 Filler pieces have hook words only,
   because the `viral-filler` storage bucket no longer exists. That includes
   59 Filler videos never posted, which would fail if Filler were switched
   back on.

**Not this:** asking the AI to explain why one post did well. On a single post
it gives a confident story about what was mostly luck (research, 2026-10-09).
Separate from the broken "route-and-judge" scoring (PF-25).

---

## DA-04 · Turn on professional mode on the Facebook profiles — Done, already on

**Done 2026-10-23, with nothing to switch.** Yurie said every Facebook
profile has been in professional mode since well before this ticket; she
turned it on herself to check views by hand on her rounds. So the "check
first, on one profile" step below never happened and nothing records what
the switch changes on a profile. DA-05's Facebook screenshots need no wait.


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

## DA-05 · Screen-reading pilot: Claude reads analytics screenshots — Reader built, photo posts to come

**What:** before any robot exists, settle the reading half. Someone takes
the analytics screenshots by hand on phone 1 (Yurie during her rounds, or
Czedrick on the live view):
- TikTok: More insights on a photo post and on a video
- Instagram: insights on a carousel and on a Reel
- Facebook: insights on a reel and on a photo post (DA-04 is done, no wait)

Claude reads each screenshot into the numbers DA-08 will store.

**What this answers:**
- which numbers each app shows for photo posts, which none of our research
  could settle
- whether Claude reads the retention curves accurately enough. A curve is a
  picture, so its reading will be approximate.
- what each screen costs to read

**Done when:** for each of the three apps, a table records what was on
screen, what Claude read and whether they match.

**The reader (built 2026-10-23):** `src/server/screen-readings.ts` turns one
post's screenshots into a `post_screen_readings` row (DA-08), and
`scripts/read-screenshots.ts` runs it over a folder from a short manifest of
which post is which, printing the reading beside what the API stored. The
three posts of the second batch are stored as readings 1 to 3, with their
screenshots in the `post-screens` bucket. Answers to the three questions:

- *Which numbers each app shows for photo posts:* still open; the TikTok and
  Facebook photo posts are with Yurie.
- *Does Claude read the screens accurately:* yes for every number the API
  also gives (all matched, see below). The retention curve is read by eye:
  three models read the same curve within a few percent of each other, so
  treat curve points as approximate and the other numbers as exact.
- *What each screen costs to read:* a post of ten screens is about 12,500
  tokens in. Opus 5.5 about 7 cents, Sonnet 5.5 3 cents, Haiku 5.5 a fifth
  of a cent, and all three read every number the same on these posts.
  **Haiku 5.5 is the model (Garreth, 2026-10-23)**, through OpenRouter like
  DA-03; twenty posts a week is a few cents.

**Received 2026-10-23, first batch (10 screenshots):** the two Instagram
carousels (trina_triumphs, 16 and 18 Oct), five screens each: Overview,
Overview scrolled, Engagement, Engagement scrolled, Audience. They match the
fetch (see DA-01). What the carousel screens show, beyond what the fetch
already gives: views split Instagram/Facebook for crossposted posts, viewers,
a views-over-time line, top sources of views (Feed, Stories, ...), which slide
people liked on, and a follower/non-follower split. No watch time or
retention curve on a carousel. The 18 Oct post had 619 views, 566 of them on
its Facebook mirror.

**Received 2026-10-23, second batch (27 screenshots, unlabelled, sorted by
Claude; read and stored as readings 1 to 3 the same day):**

- *TikTok video, glow.with.becky, 16 Oct (10 screens).* Overview: views 10,
  total play time 1 min 37 s, average watch time 4.7 s, watched the full video
  19.05%, new followers 0, a views-per-day line, and a **retention rate**
  block: "on average viewers watched 58%", "most viewers stopped at 0:01",
  with the curve. Viewers: 8 total, 64% new / 36% returning, 100%
  non-followers. Traffic sources, search queries, gender, age and location all
  say "shown when this video reaches 100 views". Engagement tab is empty
  (top comment words "not ready", likes chart blank). Two screens are the
  Inspiration tab, which is TikTok's own trending list and not about our
  post. Views match `tt_post_performance` (10). The screens were taken 6.5
  days after posting and the retention data was still there, so the
  "TikTok drops watch time after 7 days" worry is neither confirmed nor
  cleared yet.
- **Finding on that video:** TikTok shows a banner, "Your video is not
  eligible for recommendation in the For You feed. If you disagree with the
  content restriction, you can appeal." That is TikTok saying the post is
  held out of For You, in writing. The robot should read this banner on every
  post; it is a direct suppression signal we have never had.
- *Instagram Reel, hey.imani.vaughn, 18 Oct (10 screens).* Overview: views
  222 (Instagram 121, Facebook 101), viewers 114, average watch time 5 s,
  follows 0, views over time against "your typical reel", then **what impacts
  your views**: skip rate 57.0% (marked Lower), share rate 0.0%, like rate
  2.6% (Higher), save rate 0.0%, repost rate 0.0%, comment rate 0.0%, each
  marked against the account's typical. Then **how long people watched** (a
  retention curve over the 56 s, falling to about 15% by 0:08) and top
  sources: Reels tab 71.9%, Explore 18.2%, Stories 6.6%, Profile 2.5%, Feed
  0.8%. Engagement: likes 3, the rest 0, and a "when people liked" curve.
  Audience: followers 8.3% / non-followers 91.7%; age 25-34 43%, 18-24
  28.1%, 35-44 16.5%; country India 31.4%, United States 14%, Pakistan 8.3%,
  Germany 4.1%, United Kingdom 3.3%; men 55.7%, women 44.3%. Everything the
  fetch stores matches (see DA-01). The demographics are new: the API never
  gave them per post.
- *Facebook Reel, Imani Vaughn, posted 23 Oct 02:04 (7 screens).* Taken two
  hours after posting, so every number is 0 or "not enough data yet". The
  screen layout is the answer here: views, approximate earnings, engagement,
  net follows; Facebook views with viewers and the Instagram original's views
  (122); retention; views breakdown (views, 3-second views); where views came
  from (traffic, source); Facebook engagement (reactions, comments, shares,
  saves, clicks) beside Instagram interactions; reaction by type; followers
  vs non-followers; demographics (age and gender, countries). An older Reel
  with views is needed to see what those blocks hold when filled.

**Still to come:** the TikTok photo post, the Facebook photo post, and one
older Facebook Reel that has views (asked 2026-10-23). One
correction: the doc's link for the TikTok video pointed at the 14 Oct video;
Yurie screenshotted the 16 Oct one (10 views), and the reading carries that
post's link. The first batch's two carousels were re-saved by Garreth the same evening
and read as readings 4 and 5 (Haiku; every API-backed number matched, and
the 16 Oct post's "--" profile visits is stored as empty, as it should be).
The TikTok photo post was to be maya_journey8's newest, but that account was
banned on 2026-10-19
(Garreth remembered, the accounts table confirms). No live TikTok account on
the phones has posted a photo since, so it is now alicia_glow3's photo post
of 11 Sept (112 views, so past TikTok's 100-view threshold for sources and
demographics), with glow.with.becky's 11 Sept photo post as the fallback.

---

## DA-06 · Robot: open each app's analytics screens on phone 1 — After DA-05

**Runs on Fridays only** (Garreth, 2026-10-20; see DA-07).

**What:** WebDriverAgent (already on phone 1, `docs/PHONE-AGENT-SETUP.md`)
opens each recent post's analytics screen in TikTok, Instagram and Facebook,
scrolls through it and takes the screenshots DA-05 proved readable.

**Designed 2026-10-23** (from DA-05's screens and the shape of the warmup
robot; nothing built yet):

- **Where it lives:** in the warmup robot's own repository
  (`garrethdev/warmup-runner`, on the Air), as a new job beside the warmups.
  The robot already has everything the phone side needs: the phone driver
  (tap, swipe, screenshot, and `readScreen`, the list of what is on screen
  with each button's spoken label), opening and closing an app, switching
  the account on a phone, the daily planner with the robot's hours, the
  session recorder and the dashboard token. Its rules are that repository's
  `AGENTS.md` and `HANDOVER.md`; its code is tested on the pretend phone
  before any real one.
- **How it finds the post:** open the app, go to the profile, and open each
  post from the past seven days in grid order, newest first, plus any older
  post that has no reading yet. It does not need the post's link: the
  insights screen itself shows the caption's first words and the posted
  date, and the reader matches those to the performance table by account,
  caption prefix and date, the same match the ingest uses.
- **The screens, per app** (what DA-05 found): TikTok, tap the view count or
  "More insights" to reach Video analysis, then the Overview, Viewers and
  Engagement tabs (never Inspiration). Instagram, "View insights" under the
  post, then Overview, Engagement and Audience, with the Age, Country and
  Gender chips. Facebook, "View insights" or "See insights", one long page,
  swiping each pair of side-by-side cards (Traffic and Source, Age and
  gender and Countries, Facebook and Instagram engagement). On every tab:
  screenshot, scroll about four fifths of a screen, screenshot again, until
  the bottom.
- **Buttons by their label, not their position:** `readScreen` names each
  button ("View insights", "Audience"); the robot taps by name and uses
  coordinates only to scroll. **When a screen has changed** and a name is
  not there, it screenshots what it sees, writes the reason as the post's
  problem and moves to the next post. The reader keeps the screenshots, so
  the change can be seen and the robot taught the new name.
- **Looking like a person:** one post at a time with pauses of a few seconds
  between taps, the same unhurried swipe the warmups use, at most a dozen
  posts per account per sitting, in the account's quiet hours, and never
  during a warmup (the planner holds both). About one to two minutes a post:
  twenty posts a week is under an hour of phone time per phone.
- **The hand-off:** the robot uploads the screenshots to the `post-screens`
  bucket (one folder per post: platform, account, day) and then calls a
  new dashboard route with the list of posts. The dashboard reads them with
  the reader built in DA-05 and writes the rows (DA-08). The AI key and the
  table-writing stay on the dashboard; the Air only takes pictures. That
  route, `POST /api/screen-readings/run`, **was built 2026-10-23** (demands
  CRON_SECRET, listed in `src/proxy.ts`; `?dry=1` to check without reading).
  It matches each post by account and caption prefix, with the date on the
  screen as a tiebreaker, and stores a problem post as a row with the reason
  in `notes`. Verified on the development machine against the real bucket
  and table; not yet called from the live site.
- **The pilot:** phone 1 only, on the three accounts read by hand on
  2026-10-23 (glow.with.becky, hey.imani.vaughn, Imani Vaughn's Facebook),
  so the robot's first readings can be laid beside readings 1 to 3. Two
  Fridays before any widening (DA-07).

**Handed over and built 2026-10-23:** the brief for the runner repository
is `docs/DA-06-ROBOT-HANDOVER.md`; a Claude agent opened through Orca
(worktree `da-06-analytics-robot`) built the robot half the same day on the
pretend phone, as tasks A1 to A4 of the runner's `TASKS.md` ("Analytics
reader (DA-06)"): the walk through each app's tabs, the upload and hand-off,
a Friday slot in the planner with its own window, and Yurie's sitting tool
(`air/Read analytics.command`). 44 tests in `src/analytics/`, 894 in all.
Two choices it made: the job gets its own window in `config/fleet.json`,
kept 35 minutes clear of the warmups (**confirmed by Garreth, 2026-10-23**:
the robot runs outside the warmup windows); and it can read
button names either from the phone's screen description (the brief's way)
or from the words on a screenshot (the warmups' way), switchable without a
code change, because the description jammed TikTok on phone 1's feed on
2026-10-03. **Decided the same evening (Garreth): the Air gets into the bucket the
way the session recorder does**, with one-time upload links from the
dashboard (operation 12) and the hand-off behind the dashboard token
(operation 13), so no bucket key sits on the Air. Both are built on both
sides; the hand-off is now sent on a real run. A5, the first
real sitting on phone 1, needs Yurie and an Air update carrying this work,
which is still uncommitted in that worktree. The first real run is a sitting with
Yurie: the Air is reached over Tailscale, and phone 1 is offline between
warmups by design. As with the warmups, the finished robot reaches the Air as
an update package with instructions for Yurie.

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

**Fridays only (Garreth, 2026-10-20).** The robot runs one day a week, on
Friday, reading every post from the past week.

**Timing:** TikTok's watch-time numbers may drop out once a post has been
quiet for 7 days, so each post must be read inside its first week. With
Fridays only, a post that goes up just after a Friday run is 7 days old at
the next one, right at that edge. DA-05 should show whether TikTok really
drops them. If it does, read the oldest posts first on each Friday.

---

## DA-08 · Store the robot's numbers — Done 2026-10-23

**Built 2026-10-23:** `post_screen_readings` (migration
`20261023071133_post_screen_readings.sql`), one row per reading of one post,
written by the reader in DA-05 with the service key. Columns follow what the
screens showed: counts (views, with Instagram's Instagram/Facebook split,
viewers, likes, comments, shares, saves, reposts, new followers, profile
visits), watching (average and total watch time, % watched to the end,
TikTok's average retention and drop-off second, Instagram's skip rate, the
retention curve as points), who watched (follower %, new-viewer %, sources,
age, country, gender, Instagram's rate signals against the account's
typical), TikTok's For You banner, and bookkeeping (the screenshots' storage
paths, model, tokens, cost, the AI's full reply). Empty is not 0 throughout.

**The All posts columns, built 2026-10-23:** each post carries its newest
reading. TikTok: Watch, Full, Follows, For You. Facebook: Reach. The top
source of views, and an Instagram post's Facebook-copy views, go in small
text under the caption (twelve columns is the width limit). Where the API
already gives a number it stays; the reading fills only what the API never
had. A post nobody has read shows dashes. Checked on glow.with.becky and
hey.imani.vaughn.


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

## DA-09 · The Deep side of each account: watching, sources, audience, For You, and the hooks compared — Done 2026-10-23

(Renamed 2026-10-23 at Garreth's ask: the old title, "Hook and retention comparisons in the dashboard", read as if hooks were all of it.)

**What:** where the numbers start to answer questions:
- hook rate and the drop-off point, by hook type (DA-03), within each account
- the account's best and worst hooks this month
- carousels judged on saves, shares and follows per person reached, since no
  platform gives swipe-through

This is a design ticket first: a new screen, so it goes through the design
step before it is built.

**Direction (Garreth, 2026-10-23):** not a new page. A switch on the
analytics views, the usual numbers on one side ("Overview") and the deep
ones on the other ("Deep"), so the same account page and the same post list
flip between the two. The deep side is where the screen readings (DA-08)
and the tags (DA-03) meet. Until then the only deep numbers on screen are
DA-01's on each Instagram account's Analytics and All posts tabs; the screen
readings are in the table only.

**Status: BUILT 2026-10-23, the same night the design was approved.** The
real loader is `src/lib/data/account-deep-build.ts` (`buildDeep`, pure and
tested; `getAccountDeep`, cached with the Analytics tab's tags), joining the
performance table, `content_tags` and `post_screen_readings` for the last 30
days. "Held past 3s" is the reading's curve at 3 s where a post has been
read, else on Instagram 100 minus the API's skip rate. The sample stays
behind `?deep=demo`. Design APPROVED by Garreth, 2026-10-23, after three changes the
same evening: the switch moved to the right end of the first row, opposite
the range pills; the robot's readings (watching, sources, audience, For You)
added above the hook comparisons; and the three hook cards grouped into one
section headed "Hook Analysis". The sample stays in the code, behind
`?deep=demo`, until the real loader replaces it (Garreth: "keep this dummy
data until we get the actual one"). Drawn in the
running app behind made-up numbers (`src/lib/data/account-deep.ts`,
`SAMPLE_DEEP`), as the phone farm screens were: open any account's page with
`?deep=demo` and press Deep. What is on it. First the numbers the phone
robot reads (DA-08), added the same night at Garreth's ask, in the
Overview's own shapes:

- **Watching:** four tiles with a week-by-week trend line, as the Overview's
  tiles have (average watch time, watched to the end, held past 3 seconds,
  the second most people stop at), beside a chart card with the account's
  average retention curve this period and the drop-off second marked.
- **Where views come from:** bars for the sources, summed over the period's
  readings.
- **Who watches:** followers against non-followers, women against men, new
  against returning viewers on TikTok, then age bands and top countries.
- **For You feed:** how many of the period's TikTok videos the app said it
  held out of the feed, and which ones. TikTok accounts only.

Every reading-based card says how many posts it rests on. Then, in one
section headed "Hook Analysis", the comparisons the ticket asks for:

- **Hooks this month:** one row per hook family (DA-03's grouping) with
  posts, median views, hook rate (% still watching past 3 seconds: 100 minus
  the skip rate on Instagram, the screen reading's number on TikTok),
  drop-off (the second most viewers stopped at, from the reading) and new
  followers per 100 people reached. The best and worst hook rate are
  coloured; a number nobody has yet is a dash.
- **Best hooks / Worst hooks:** three posts each, by hook rate, with the
  words on slide 1, the hook family, date, views and how many held.
- **Carousels:** one row per hook family with posts, median reach, and
  saves, shares and follows per 100 reached, since no platform gives
  swipe-through. Hidden on an account that posts no carousels.
- A status line above: as of when, how many of the period's posts are
  tagged and how many have a phone reading. The switch sits where the tab's
  content starts, Overview first.

Decided while drawing, for Garreth to confirm or change: the Deep side keeps
the Overview's period (a month), rather than its own range pills; "hook
rate" is the word for "still watching past 3 seconds"; and only the best
and worst cells are coloured, nothing else. The build step after approval
is the real loader (tags × performance × readings) and its tests; the
sample stays in the code only until then.

---

## DA-10 · The Deep side of the fleet, on the main Analytics page — After DA-07's first weeks

**What (Garreth, 2026-10-23):** the same Overview / Deep switch on the main
Analytics page, in the same place, with the deep numbers across the whole
fleet: which hook families hold people, which content types get watched to
the end, where the fleet's views come from, who watches, and how many TikTok
videos are being held out of the For You feed this week.

**The twist:** on the fleet page the useful grouping is by character and
content type, not by hook alone. A Journey account and a Cleora account post
different kinds of openings, and comparing them straight across says little;
within a character, hook family against hook family does.

**Why it waits:** every reading-based card would say "2 posts read" until the
robot has run a few Fridays across the phones (DA-07). Designing against
dashes helps nobody. Open it once the first weeks of readings exist.

**This is a design ticket first**, like DA-09: drawn in the running app on
made-up numbers, approved, then built on the DA-09 loader widened to the
fleet.
