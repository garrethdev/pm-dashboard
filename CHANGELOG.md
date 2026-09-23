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

## 2026-09-23 — Moving an account onto a phone now saves the phone

**Where it came from:** ticket PF-03, the save behind design ticket P10's
move dialog in Settings, which Garreth approved on 2026-09-22. Until now the
dialog asked which phone and then refused to save, because the save would
have moved the account to Physical and ignored the phone.

**What changed:**

- **Moving a Cloud account onto a phone** in Settings → Account management
  now saves three things at once: the account is on Physical, it is on the
  phone you picked, and the date it moved. They are one save, so an account
  can never end up on Physical with no phone. The date is what the
  before-and-after comparison (PF-10) will use.
- **A move onto a phone is refused** if no phone is picked, or if the phone
  has been switched off.
- **Moving an account back to Cloud now takes it off its phone.** The dialog
  already said it would ("It comes off …"), but until now the account stayed
  listed on the phone.
- **If two people move the same account at the same moment,** the second is
  told it was just moved and nothing of theirs is saved.
- Posting is still not touched. A moved account stays paused.

**The database** gained one new column, the date an account moved onto a
phone. It went in a few hours after the code, because the database itself was
down from about 2:01 to 2:45 am ET. Every log went silent at once and it came
back with a cold start; the cause is not established. Every existing account
reads the new column as empty, meaning never moved.

**Verified:** the code compiles and the existing 187 automated checks pass.
The column was confirmed in the live database by query. No account has been
moved, because no real phone is registered yet, so the save itself has not
met the database.

---

## 2026-09-23 — Physical accounts: a ⋯ menu with Edit account, and each account keeps its own phone number

**Where it came from:** design ticket P14, which Garreth approved the same day
(the drawing is the next entry down). Built to match it.

**What changed, on the Physical side only:**

- **Every account row ends in a ⋯ menu** with **Edit account** and **Retire
  account**. The warmup switch and the Posting button are gone from the row;
  Posting reads as a plain word (Active, Paused or Custom).
- **Edit account saves for real.** It changes the handle, the character, the
  account's phone number, and which phone it is on (or takes it off its
  phone). It also sets posting on or off, the warmup mode, and, behind
  **Edit cadence**, the custom schedule. The Profile name and the platform are
  shown locked. The proxy is shown read-only with a link to the phone,
  because every account on a phone shares it.
- **Only what you changed is saved.** A Save that changes nothing writes
  nothing. If one part fails, the window says which part, says the parts
  before it were saved, and stays open, so nothing claims to be saved when it
  is not.
- **Phone numbers now belong to each account, not to the phone** (Garreth,
  reversing this morning's P6 decision). The phone's form no longer has a
  numbers box. **Add account** has a Phone number field. **Proxies & numbers**
  lists one line per account with its own number, still matched to its
  TextVerified rental. The **ban checklist** now always names the banned
  account's own number, which removes the limit noted in the PF-11 entry.
- A number must be a whole number of 10 to 15 digits. A half number is refused
  with a sentence that says so.

**Cloud is untouched, and this was checked.** The custom-schedule form was
moved into a shared file so Edit account uses the very same fields and
warnings as Cloud's Posting window, rather than a copy. Cloud's Posting window
was screenshotted before and after the move and the two pictures are
identical. Cloud's Accounts page is the same too; the only difference in its
screenshots is the bell's dot, from a notification that arrived in between.
The new save route refuses a Cloud account, and the database write is limited
to Physical accounts as well.

**The database** gained one new column, the account's phone number. The
phone's old numbers column is left in place and is no longer read. It never
held a real number, because no phone had been registered yet.

**Confirmed live, 2026-09-23,** with two practice phones and one practice
account, all deleted afterwards:

- An account added through the app saved its number. A half number was
  refused.
- Edit account changed the handle, the number and the phone in one save, and
  the history log recorded the old and the new values. Sent again, it changed
  nothing and logged nothing. A bad number, an unknown character and a Cloud
  account (Profile 8) were all refused. An attempt to rename the Profile or
  change the platform was ignored.
- Through the screen: a changed number saved; turning posting on, setting
  warmup to Automated and saving the cadence each landed, and each wrote its
  own history line.
- Proxies & numbers showed the account's number on its phone. Retire from the
  new menu showed the account's own number, with the proxy switch on because
  it was the last account on that phone.
- Seen in headless Chrome at desktop and phone width, dark mode. Not seen in
  Safari.

**Not done:** moving a Cloud account onto a phone is still PF-03's job in
Settings. Edit account moves an account that is already on the Physical side.

---

## 2026-09-23 — P14 drawn: an account's settings behind a ⋯ menu (design only, not built)

**Where it came from:** Garreth, 2026-09-23. The Accounts row carried three
separate controls (the warmup switch, the Posting pill and Retire) and had
nowhere to change an account's handle, character, phone or phone number.

**Garreth's calls:**

- **Cloud is not touched.** This is Physical only.
- **Phone numbers belong to each account, not to the phone.** This reverses
  this morning's P6 decision. Proxies stay on the phone, because every account
  on a phone shares one.
- The Profile name and the proxy are shown but cannot be changed here. The
  Profile name is how every workflow finds the account, and the proxy is
  changed on the phone's own page.
- The red Retire button that lit up for a likely ban goes, with no replacement
  mark.
- Posting opens as a plain Active / Paused switch; **Edit cadence** unfolds the
  custom schedule underneath.

**What was drawn, with made-up data:** the last column of each row is now a ⋯
button with **Edit account** and **Retire account**. The warmup switch and the
Posting button leave the row; Posting becomes a plain word (Active, Paused or
Custom). **Edit account** gathers Details, Phone (with the account's own
number, and the phone's proxy with a link to the phone), Posting and Warmup in
one window.

Seen on `/accounts?demo=1` in Physical, in headless Chrome at phone and
desktop width, dark and light. **Nothing is built:** Save only closes, and
real Physical rows and every Cloud row are exactly as they were. Four small
icons were added to the app's icon set for the menu.

---

## 2026-09-23 — Retiring a banned account on a real phone now works, and never reaches the Cloud robot

**Where it came from:** backlog ticket PF-11, the build of design ticket P8,
which Garreth approved earlier the same day. Built to match the approved
drawing.

**The danger it closes.** Until now, pressing Retire on any account sent it to
the Cloud Post-Ban robot, including an account that lives on a real phone. The
robot finds a Geelark cloud phone by name and deletes it. If it cannot find an
exact match it takes the first phone the search returns, so for a real-phone
account it could have deleted the wrong cloud phone. It would also have
switched off the renewal of the proxy that the phone's healthy accounts still
use. A real-phone account now never reaches the robot: the Retire button opens
the real-phone dialog instead, chosen by where the account posts from, not by
which side of the app is showing. The robot's own route also refuses a
real-phone account outright, even for a dry run.

**What happens now when a real-phone account is retired:**

- **The dialog shows the real facts before you hold the button:** the phone,
  how many queued posts will go back to the pool, the number, and the proxy
  with how many other accounts still use it. The proxy switch starts off while
  others use it and on when the banned account was the last one (Garreth's
  call on P8).
- **The app does its own half at once, all or nothing:** the account is marked
  retired and banned, its queued posts go back to the pool (the same way the
  robot hands them back), and any of its posts still waiting on the to-do list
  are closed so nobody is asked to post for a banned account.
- **The phone half goes on the To-do page** as a checklist at the top of that
  phone: sign out, retire the number, and retire the proxy only if the switch
  was on. Ticks are saved and shared. A finished checklist stays struck through
  for the rest of that day; an unfinished one carries over every day until it
  is done. The phone's count ("1 of 4") includes the steps, on the page and on
  the dashboard card.
- **The history log records** the retire and every tick. A repeated tick that
  changes nothing is not logged.

**One thing the app cannot know: which number was the banned account's.**
Numbers are recorded on the phone, not on each account (P6). When the phone
holds exactly one number, the step names it. When it holds several, the step
names none rather than guess, because retiring a healthy account's number by
mistake would be worse. Whoever does the step has to check which one it is.

**The database** gained one new table for the checklist steps and two new
functions: one counts what a retire would hand back, and one does the retire
itself in a single step. Nothing existing was changed. Only the app's server
key can call the new functions (checked after applying).

**Confirmed live, 2026-09-23,** against a practice phone with two practice
accounts and one queued post:

- The Cloud route refused the real-phone account. The real-phone route refused
  a Cloud account (Profile 8, a read that changed nothing).
- The dialog showed the phone, the number, and the proxy without its password,
  with the switch off because the second account still used it. Seen in
  headless Chrome at phone and desktop width, dark mode.
- Retiring marked the account retired with the note the Accounts page reads,
  closed its queued post, wrote the sign-out and number steps and no proxy
  step, and left the healthy account next to it untouched. Sending the retire
  a second time changed nothing.
- On the To-do page the checklist sat at the top of the phone. Ticking "Sign
  out" from the page saved it (seen in light mode, desktop width). With both
  steps ticked it showed today and was gone from tomorrow; unticked, it came
  back on tomorrow's list.
- All the practice records and their history-log lines were deleted
  afterwards. The database is back to no phones.

**Not checked:** a retire that hands real content back to the pool (the
practice account had none; the hand-back is the robot's own, long-used
function). Not seen in Safari.

**Not done yet:** the robot's own form in n8n can still be filled in by hand
with a real-phone account's name. The app no longer sends one, but the form
does not refuse one. Guarding the robot itself is a change to a live n8n
workflow and waits on Garreth.

---

## 2026-09-23 — P8 approved: the clean-up after a ban on a real phone (drawing only, not built)

**Where it came from:** design ticket P8 (backlog PF-11). On Cloud, the
Post-Ban robot cleans up a banned account: it deletes the Geelark phone,
switches off the proxy's and the number's renewals, hands the account's
queued posts back to the pool, and marks it retired. On a real phone a person
has to do the phone half, and nothing in the app asked them to.

**Garreth's calls (2026-09-23):**

- **The app hands the queued posts back itself**, the moment the account is
  retired. Nothing on the phone is involved, so it is not a tick.
- **The proxy stays while other accounts still use it.** One proxy serves
  every account on a phone, so retiring it for one ban would cut off the
  healthy accounts beside it.

**What was drawn, with made-up data:**

- **A retire dialog for real-phone accounts.** It says what happens at once
  (the queued posts go back, the account is marked retired) and what is then
  left on the phone: sign out, retire the number, and a switch for retiring
  the proxy. Retiring still needs the button held down, as on Cloud.
- **The checklist on the To-do page**, at the top of the banned account's
  phone. Each step is ticked by hand, the phone's count includes them, and a
  finished checklist stays struck through for the rest of the day. The sample
  shows it not started, part done and done, and a ban on a phone that still
  holds two healthy accounts (no proxy step there).

**Round two, the same day (Garreth):** the checklist no longer lists a kept
proxy, because there is nothing to do about it. It only appears, as "Retire
the proxy", when the banned account was the last one on the phone. The
dialog's two lists were made more visual: each row has its icon in a circle,
with more space and a divider between rows, and what the app does itself is
marked in the app's cyan. And the checklist's header no longer carries the
"Retired 09:40 · 3 queued posts back in the pool" line: it is the account,
the Banned pill and the count, then the steps.

**Round three, the same day (Garreth):** retiring the proxy is now a switch
in the retire dialog. It is on by default when the banned account was the last
one on the phone, and off while others still use it (the row says how many).
"Retire the proxy" only goes on the checklist when the switch is on.

**Garreth approved the drawing the same day.** Building it is PF-11.

Seen with `?todo=ban` on the To-do page and from the Retire buttons on
`/accounts?demo=1`, in headless Chrome at phone and desktop width, dark mode.
**Nothing is built yet:** a real account's Retire button still goes to the
Cloud robot, and the ticks are saved nowhere.

---

## 2026-09-23 — Dashboard tidy-up: the incident feed beside Top posts, the Proxies switch beside its title, no Active Accounts count, centred empty cards

**Where it came from:** Garreth, 2026-09-23: "Put the incident feed below
which is beside the top posts." Asked which he meant, he chose beside Top
posts rather than under it.

On the Physical homepage, the row under the main cards was Proxies, Incident
feed and Automation, three across, with Top posts underneath. It is now
Proxies and Automation side by side, and the bottom row is Top posts with the
Incident feed beside it. The bottom row splits the same way as the main cards
above it, so the Incident feed lines up with To-do and Inventory. On a phone
screen everything still stacks, and the Incident feed now comes after Top
posts. Cloud's homepage keeps its own layout.

**Also the same day (Garreth):** the Proxies / Phone numbers switch on the
Proxies & numbers card sits beside the card's title again. On 2026-09-22 it
was moved onto its own line because the card only had a third of the row.
Now that the card has half the row, there is room beside the name. On a phone
screen it still drops under the title, like every other card.

**And the Accounts card lost its "Active Accounts" count (Garreth, same
day), on both the Cloud and the Physical dashboard.** The card's header is now
the name, the All / Healthy / Needs attention switch, then Filters with View
all beside it at the right-hand edge. The full Accounts page is unchanged.

**Empty cards now look empty the same way (Garreth, same day).** On the
Accounts card, "No accounts yet" sat at the top of a tall empty box. It now
sits in the middle of the card. Proxies & numbers, Top posts and the Incident
feed used to say they were empty in a plain line of text. They now use the
same icon-in-a-circle empty state as the rest of the app, centred in the card:
a globe (or a phone, on the Phone numbers view) for "Nothing needs attention",
a film for "No posts found for this range", and the Incidents page's tick for
"No incidents in the last 48 hours". This applies on both the Cloud and the
Physical dashboard.

Checked in headless Chrome at 1440 and 1920 wide (and 390 for the switch),
dark mode. Not checked in
Safari.

---

## 2026-09-23 — Overdue posts look overdue on the to-do list, and Proxies & numbers shows the real phones

**Where it came from:** design tickets P12 and P6. Both were started on
2026-09-23 because neither needs a real phone to exist. Garreth made the calls
below, approved both drawings the same day, and both were then built.

### P12: an overdue post now says so on the to-do list

The bell already warned, in red, when a post had waited more than 24 hours.
The list did not agree with it: every carried-over post looked the same, with
a quiet grey "Due yesterday". So the post the bell was warning about looked
perfectly normal on the list.

**Garreth's choice: a red Overdue pill, on the bell's own 24-hour rule.** A
post carried over from yesterday afternoon stays quiet, as before. Once it has
waited 24 hours, it gets a red Overdue pill beside its name, and the line
under it says how long it has waited ("Due yesterday · waiting 26 h").

- On its third and last day, the line says "last day on the list" instead,
  because tomorrow it drops off.
- Overdue posts go to the top of their account.
- The pill shows on the To-do page, and inside an opened phone on the
  dashboard card.
- The list and the bell now read the 24 hours from the same place in the
  code, so they cannot drift apart.
- Only today's list says "overdue". Stepping back to an earlier day shows
  that day as it was.

**Found and fixed while building it:** on the real list, a carried-over post
said "Due 2026-09-21" rather than "Due yesterday", unlike the approved design.
It now says it in words, on the card too ("from yesterday").

**Checked:** automated tests for the 24-hour cutoff and the switch from hours
to days. The look was checked with the sample data (`?todo=work`).

**Not checked with a real post:** no real post exists yet. Creating one would
need an unpaused test account, which the scheduler could pick up.

### P6: Proxies & numbers now lists the real phones

On the Physical side, this page could only see Geelark phones. A real phone's
proxy is a line typed on the phone's page, so its expiry appeared nowhere and
an expiring proxy would have gone unnoticed. An account's phone number was
worse off: accounts do not store their own number (checked in the database,
2026-09-23). The only copy was on the account's Geelark phone, and it vanished
when that phone was deleted.

**Garreth's calls:**

- The numbers are recorded **on the phone**, not on each account.
- The page lists **the accounts on each phone, not its characters**, because
  one phone has one proxy and every account on it shares it.

**What changed:**

- **Physical's Proxies & numbers now has one row per real phone.** It keeps
  the same Proxies / Phone numbers switch as the Cloud page. Cloud is
  unchanged.
- **Proxies view:** for each phone, its accounts (one per line with their
  platform mark), its proxy, when that proxy expires, days left, auto-renew
  and Extend. The proxy expiring soonest comes first.
- **Phone numbers view:** each number on each phone, matched to its
  TextVerified rental.
- On a phone screen each phone is a stacked block rather than a wide table.
- There is no Replace proxy button here: a real phone's proxy is changed by
  hand in ShadowRocket.
- **The phone's form has a new Phone numbers box**, on Add phone and on the
  phone's own page. It takes one number per line, and a pasted list separated
  by commas works too. A number with fewer than ten digits is refused by name.
- The database gained one new, empty column on phones to hold the numbers.
  Nothing existing was changed.

**Confirmed live, 2026-09-23:** a test phone was created with a real
proxy-cheap address and a real TextVerified number. The proxy matched its
subscription (expiry, days left, auto-renew) and the number matched its rental
(cycle end, renewal state). A made-up number correctly showed "no rental
match". Saving a pasted, comma-separated list through the app stored it one
per line, and a half-number was refused. The test phone and the audit-log line
from that save were deleted afterwards, so the database is back to no phones.

**Not checked:** the accounts column with a real account on a real phone,
because none has moved yet. The look with several phones was checked with the
sample data (`?demo=1`).

**Left as it was:** the Proxies & numbers card on the Physical homepage still
reads Geelark phones.

Both screens were checked in headless Chrome, at phone and desktop width, in
dark and light mode. They have not been looked at in Safari.

---

## 2026-09-22 — A phone can now carry as many accounts as you want, and two buttons read properly

**Where it came from:** five pieces of feedback from Garreth on the P10
screens, 2026-09-22.

### A phone is no longer capped at three accounts

**"Do not limit the number of accounts in one phone to 3. For now, we will only
have 3 accounts per phone but in the future there will be more in one phone."**

The app used to refuse the fourth account outright, and said so: "iPhone 1
already holds 3 accounts, which is the most a phone can carry." That refusal is
gone everywhere — adding an account on the phone's own page, creating an
account with a phone already chosen, and the new move screens. The database
never enforced it; it was only ever the app.

Three has not disappeared, it has just stopped being a rule. It is now the
number the bulk move fills a phone up to before it starts on the next one,
which is what keeps one character's accounts together on one phone. Change the
number in one place and everything follows.

**What you will see differently.** The Devices page and the phone's own page
used to show "2/3" and turn amber at three; they now just say how many accounts
a phone holds. The move screens say "3 accounts" rather than "2 of 3". The
"Add account" box on a phone no longer disappears once the phone has three. And
nothing is ever "full" — the only phone that refuses an account now is one that
is switched off.

**One consequence worth knowing.** The bulk move can no longer run out of room,
so it no longer tells you that accounts have nowhere to go. Selecting all 32
accounts now reads "32 accounts onto 3 phones" where yesterday it said 4 could
move and 28 could not. You can still set any row to "Not moving" by hand, and
the button still names the number that will actually happen.

### Two buttons that were hard to read

**The blue "Move onto phones" button was wrong in three ways at once** — the
text colour was hard to read in dark mode, hard to read in light mode, and
bolder than the rest of the app. All three had one cause: I had hand-built a
button instead of using the one the app already has. It now IS that button —
the same "Add phone" uses on the Devices page — so it takes its weight and its
colour from there rather than from anything I set. Black text on blue in dark
mode, white on blue in light, and the normal weight, measured as identical to
"Add phone" in both modes.

The press-and-hold buttons inside the dialogs were left alone: their heavier
text already matches Retire and Replace proxy, so changing those would have
made them the odd ones out instead.

**The phone dropdowns in the bulk move were cramped.** The browser draws its own
little arrow inside the box, and the longest option — "iPhone 2 · 2 accounts" —
ran underneath it. The box now uses the app's own arrow, the same way the phone
form and the device page already do, with room set aside for it.

### Checked

All four seen in the running app, dark and light, at desktop and phone width, in
Chrome. The button colours were measured rather than eyeballed. 173 tests pass;
the ones that asserted the three-account refusal now assert the opposite, and
the bulk-move tests cover a batch larger than the phones can hold going round
again instead of stranding anyone.

## 2026-09-22 — Moving an account onto a phone is one step, and can be done in bulk

**Where it came from:** design ticket P10, which you asked for next after PF-20.

**This is a design put up for you to look at, not finished plumbing.** Nothing
saves yet. The screens are real and running, so you can press through them and
say what is wrong; the writes behind them are tickets PF-03 and PF-15, built
once you approve. Everything below is at **Settings**, and
**`/settings?demo=1`** draws four invented phones, because no real phone exists
to design against.

**The problem it fixes.** Moving an account onto a real phone is two steps in
two different places today: flip the account to Physical in Settings, then go
to the phone's page and add the account to it. Nothing joins them. Between the
two the account is on the Physical fleet with no phone — and that is the one
state the To-do list cannot show. The day's work for that account simply does
not appear, and nothing anywhere says why.

**So the move asks which phone, in the dialog that already flips the fleet.**
No new screen. Every phone is listed, including the ones that cannot take the
account, with the reason where the count would be — "iPhone 1 is full at 3
accounts", "iPhone 4 is switched off". A phone that was hidden would just send
somebody looking for it on the Devices page.

**Moving an account back to Cloud has nothing to pick.** It says which phone
the account comes off, and that is the whole decision.

**Both dialogs say "Posting stays paused",** because moving an account and
starting it posting are two different decisions and the ticket asked for that
to be said out loud.

**Several at once, for the day a box of phones arrives.** A **Select** button
next to the search turns on checkboxes; the toolbar becomes the batch bar. The
app then suggests which phone each account goes on, filling one phone before
starting the next so a character's accounts stay together. Every row can be
changed by hand, because you know which phone is on which desk and the app does
not.

**It never quietly moves only some of them.** Select all 32 accounts today and
it says: "4 accounts onto 2 phones. 28 accounts have nowhere to go and will
stay on Cloud." The ones that cannot move stay in the list marked "Not moving",
and the button says "Move 4 accounts" — the number that will actually happen.

**"By character" needed no new control.** The search already matches the
character, so typing "Character 3" and pressing Select all is exactly that. A
character dropdown was considered and left out rather than add a second way to
do what search already does.

**One thing that changed on the live screen, which you should know about.**
Because a move now needs a phone, and no phone is registered yet, **moving an
account from Cloud to Physical is currently held** — the button is there and
will not complete, and the dialog says "No phones yet. Add one on the Devices
page." That is the design working as intended: an account should never land on
the Physical fleet with nowhere to be worked on. But it does mean a control
that worked yesterday does not today. Nothing has actually been lost — no
account has ever been moved this way, the fleet is still 32 Cloud and 0
Physical — and moving an account back to Cloud is untouched.

**What was checked.** Both dialogs seen in the running app, dark and light, on
a desktop screen and at phone width, against the invented phones and against
the real empty state. No sideways scrolling on a phone; the batch list scrolls
inside its own dialog. Sixteen tests cover the rules underneath — how a batch
is spread, what counts as a full phone, and the exact sentences. Checked in
Chrome, not Safari.

**Found while drawing it and deliberately left alone.** The press-and-hold
button's amber colouring measures 3.6 to 1 against its background in light
mode, where 4.5 to 1 is the accepted floor for readable text. It is the shared
hold button, so Retire and the existing fleet switch have always looked like
this; changing it would touch every one of them at once. That belongs to P13,
the ticket for reviewing everything already built in both modes.

## 2026-09-22 — The bell now shows both fleets, and every item says which one it is about

**Where it came from:** ticket PF-20, and the decision Garreth made when asked
to settle it (2026-09-22): "bell shows both fleets and names which."

**The question this answers.** Every screen in the dashboard shows one fleet at
a time — flip the Cloud / Physical switch in the top right and the accounts,
the numbers and the incidents all change with it. The bell was the one place
where that rule was in doubt. Earlier the same day, PF-12's two new items (the
day's work, and the post that has gone stale) were built to appear in Physical
only, and hidden from anyone sitting in Cloud. The worry written down at the
time was that somebody would miss a stuck post simply because their switch
happened to be on the other side. Garreth settled it the other way: the bell
shows everything, and each line says which fleet it came from.

**So the bell no longer follows the switch at all.** Whichever side you are on,
you see the same bell. A warmup problem on the cloud phones and a post stuck on
a real phone now sit in the same list, and each carries a small label — a cloud
saying **Cloud**, or a phone saying **Physical** — so there is no guessing which
half of the operation a line is talking about. Lines that are not about any one
account, such as a robot job that errored or a data feed that has gone quiet,
carry no label, because inventing one for them would be a guess.

**Accounts that have moved keep their history.** If a group of accounts is
failing its warmup and some of them have since moved onto real phones, the bell
now splits that into two lines, one per fleet, rather than one line that could
only name one of them. This follows the rule Garreth set for every per-fleet
number on 2026-09-18: an account's history follows the account, with no
split by the date it moved. Dismissing a notification still works exactly as it
did — it is remembered per account, so a group that splits or shrinks does not
come back unread.

**Clicking an item now takes the switch with it.** This was the one thing the
decision broke. The To-do page only exists on the Physical side, so a stuck-post
alert read from Cloud would have dropped you on the dashboard with no
explanation at all. Opening a notification about the other fleet now moves the
switch for you and lands you on the right page.

**And the switch itself no longer lies.** It used to read which fleet you were
on once, when the page first loaded, which was fine while it was the only way to
change fleets. Now that a notification can change it too, it was possible to be
looking at the Physical To-do page with the switch still showing Cloud. It
follows along properly now. Found by using it, not by reading the code.

**The other half of PF-20 was already done.** The ticket also covered the
Incidents page, and that has followed the switch since 2026-09-18.

**What was checked.** All of the above was seen working in the running app, in
dark mode and light mode, on a desktop screen and at phone width, against a
temporary set-up: one made-up phone, one made-up account, one post left sitting
for thirty hours, and one real account moved to the Physical side and back. Both
fleets were confirmed to show the same four notifications with the right labels,
and clicking the Physical one from the Cloud side was confirmed to switch over
and open the To-do page. **Everything made up for the test was deleted
afterwards, and the database was checked back to where it started** — no
phones, no accounts on phones, no posts. Checked in Chrome, not Safari.

**Not proven with real work:** there is still no real phone, no account on one
and no hand-made post, so the only notification the bell shows today is the
genuine Cloud warmup one. The day-rollover has not been watched happen.

**One thing this uncovered and did not fix.** When a post is queued for an
account whose posting is paused — which is every account today, deliberately,
while the fleet moves off Geelark — the stale-post alert says the post is "past
the three-day carry-over", when the real reason it is off the to-do list is the
pause. The wording predates this ticket and is logged in `BACKLOG.md` rather
than changed here.

## 2026-09-22 — The bell now tells you the day's work, and shouts about a stuck post

**Where it came from:** ticket PF-12, and a decision Garreth made while it was
being scoped.

**It was going to be an email; it is a notification instead.** PF-12 was
written as a robot job that would send a reminder email each morning and a
second email whenever a post got stuck. Garreth replaced both with the bell in
the top right of the dashboard (2026-09-22). That turned out to suit the work
better than the email would have, because neither of these is really an event
worth mailing about — they are conditions. The bell works them out fresh every
time it is opened, so they correct themselves: the moment the last post is
ticked off, both disappear on their own, with nothing left to tidy up and
nothing sitting in an inbox saying something that stopped being true an hour
ago. No robot job was built and nothing new is stored.

**"8 things to do today."** One notification for the whole day, not one per
phone, counting the posts waiting to go out and the warmups owed together —
the same number you see when you open the To-do page. Underneath it says what
those are made of and how many phones they are spread over. Clicking it opens
the To-do list. It can be marked read like anything else in the bell, which
clears it for the rest of the day; tomorrow's arrives as a new one, because
the thing that remembers it was read is stamped with the date. Warmups on an
account set to Automated are left out of the count on purpose: those are the
script's work, and asking Yurie for something she cannot do would make the
number a lie.

**"2 posts overdue," in red.** A post that has sat untouched for a full day
gets its own notification rather than being folded into the daily one, because
"here is today's work" is routine and "this has been sitting for a day" is a
fault, and folding the second into the first is how a fault gets skimmed past.
The day is measured from when the post was handed out; the Posting Agent hands
the day's posts out at 10:00 ET, so anything untouched at the same hour the
next day has had a full working day go by.

**The case that would otherwise be invisible.** An unfinished post drops off
the To-do list after three days and stops being offered. Until now, a post that
got that far simply vanished — still waiting to go out, still counted as unused
content, and shown nowhere in the app. The overdue notification counts those
too, and says so in its own words when it has one: "past the three-day
carry-over, so it is no longer on the to-do list." That way the notification
does not send somebody to a page the post is missing from.

**Both are Physical only.** Neither appears while the switch at the top right
is on Cloud (Garreth's call). Worth writing down that this is the opposite of
what PF-20 proposes for the bell in general — that the bell should be the one
place showing both fleets — so if a stuck post is ever missed because somebody
was sitting in Cloud, this is the decision to revisit.

**One change outside the ticket.** The bell's unread dot is now red on anything
critical instead of always blue. It had to be, for the overdue post to read as
red at all — the bell had never used the seriousness of an item to colour it.
It also colours the alert that was already there: a group of accounts failing
warmup has always been marked critical and has never once looked it.

**How much of this has been proven:** all of it, against test phones and posts
created for the purpose and deleted afterwards — each wording checked with real
rows behind it, including a post pushed past the three-day carry-over, and both
notifications watched disappearing when the work was marked done. The database
is back to exactly the state it started in. **What has not happened:** no real
phone, no real account and no real post has ever been through this, because
none exists yet. And the daily reminder has not yet been seen to roll over a
real midnight — that it will is a matter of the date stamped on it changing,
not of anything that was run.

## 2026-09-22 — Posts made by hand now count everywhere they should

**Where it came from:** tickets PF-09 and PF-19, built together because they
read the same thing.

**The health dot and the Incidents page can see hand-posted work (PF-09).**
Everything the dashboard knew about whether a post actually went out came from
Geelark: the cloud phone posted, and it told us. A real iPhone tells us
nothing, so an account moved to a real phone would have read as one that had
simply stopped — nothing posted, nothing failed, nothing tried, for ever. The
two calculations underneath the health dot now read the hand-posting record as
well, so an account on a real phone is judged by exactly the same rules as one
on Geelark, with a real "last posted" date instead of a blank. The Incidents
page gained a matching entry: a post somebody could not put up appears there
beside the ones Geelark could not deliver, with whatever note they left.

**One thing deliberately left alone.** The "system error" verdict still reads
Geelark only. It means the posting machinery is broken, and it is matched
against Geelark's own failure codes — captcha, account banned — which a
hand-posted row has no equivalent of. A person who could not post something is
a failed delivery, which the app already reports; folding it in would put a red
"broken machinery" verdict on a human typo.

**The Content Calendar and Content Types follow the Cloud / Physical switch
(PF-19).** Both were fleet-wide, so Physical showed Cloud's numbers. They now
show the fleet you are looking at, following the rule that an account's data
follows the account. Every content lane still appears on both fleets showing no
posts, rather than vanishing, so Content Types is readable on Physical from day
one. The scheduler run and its shortfalls stay fleet-wide on purpose: one run
plans everything, and splitting it would invent two runs that never happened.

**Today's numbers did not move.** Every existing calculation was proven
unchanged, in both directions, row by row: the account statistics (64
accounts), last-post dates (55 accounts), the calendar month grid (667 rows),
day totals (100 days), three expanded days (208 rows) and the content-type
numbers over three windows (25 lanes each). Zero differences everywhere. I
checked the two health views myself, separately from the agent that built
them, by fingerprinting them before and after — identical.

**Verification.** Both database changes are applied live. The four new calendar
and content-type functions are executable by the app's own key only — not by
the public key — which was read back rather than assumed, because this project
has been caught before by a revoke that left the public key still named. Both
pages were loaded in a real browser on both fleets with no console errors, and
Cloud still shows the numbers it showed before. **Not proven with real work:**
nothing has ever been posted by hand and no account is on a real phone, so the
new half of every one of these calculations has never had a real row through
it. The first honest test is the day the first account moves to a phone.

**One thing to decide.** On Physical the calendar grid is empty but each day
still carries its amber "N short" badge, because a shortfall belongs to the
scheduler run, which is fleet-wide. It is working as designed, but on an empty
grid it reads as though Physical itself fell short. Changing it is a display
tweak, not a number.

---

## 2026-09-22 — Accounts can be added from the app, with their Profile name typed in

**Where it came from:** ticket PF-21, opened the same day off Garreth's
decision that an account made from scratch on a real iPhone still gets a
"Profile N" name, typed into a form rather than handed out by a robot.

Until today an account row only ever came from the n8n provisioning workflow,
and it arrived half-blank — the handle, the character, the day the account was
made and the active flag were all typed into the database afterwards by hand.
Accounts on real iPhones are not provisioned by anything, so there was no way
to create one at all.

The Accounts page in Physical now has an **Add account** button, opening the
same kind of sheet as Add phone. It asks for the Profile name, the handle, the
character, the platform, which fleet it is on, the phone it lives on, the day
the account was made, and whether it starts paused. The row it writes is
complete, with nothing left to fill in by hand.

**Why the Profile name gets this much care.** It is what ties an account to its
posts, its health verdict, its analytics and its calendar — several database
views join on it — so the form guards it three ways. A name already in use is
refused by name ("Profile 19 already exists — it is @mayas_journey0, retired").
The spelling is settled before saving, because "profile 019", "Profile19" and
"PROFILE 19" are one account to a person and three to a database; the form
shows "Saves as Profile 19" first, so nothing is changed behind your back. And
the number it suggests counts on from the HIGHEST rather than filling a gap:
the fleet runs 8 to 78 with fourteen numbers missing, and those deleted
accounts still have posts and tasks filed under their old names, so reusing a
number would quietly graft a dead account's history onto a new one.

**A new account starts paused** unless you switch it. One that goes live the
moment it is written is picked up by the next planning run, and a day-zero
account has not been warmed.

**Confirmed live.** A real account was written through the finished form, seen
in the Physical list, and deleted again within the minute — the table is back
to its 64 rows. Every refusal above was tried against the live database and
came back with the sentence quoted. **Not checked:** the phone dropdown has
never been seen with a real phone in it, because none is registered; and the
screens were looked at in headless Chrome, not Safari.

---

## 2026-09-22 — Posts for real phones now go to a person, not to Geelark

**Where it came from:** ticket PF-06, the last piece of plumbing the phone farm
needed.

The robot that sends out posts every morning at 10 now looks at each account
first. If the account is on a Geelark cloud phone, nothing has changed. If it
is on a real iPhone, the robot uploads nothing and creates no Geelark job — it
simply writes down that the post has been handed to a person, and it appears on
the To-do list with its caption and its video ready to download.

**A post that's done is now finished with properly.** Handing a post out leaves
it marked "ready", because nobody has posted it yet. Ticking it off marks it
Posted; marking it Failed burns the content with it, the way you asked. Before
this, a handed-out post would have sat marked "ready" for ever and Inventory
would have kept counting it as content nobody had used.

**One thing deliberately not copied.** Every other place this workflow writes
to the database is set to treat a rejection as success. That is how a post can
vanish with the run still reporting a clean night — something this project has
been caught by before. The new step does the opposite: it retries, and if it
still cannot write it says so, while letting the rest of the day's posts carry
on.

**Built for accounts that will never have had Geelark.** You confirmed future
accounts may be set up with no Geelark phone at all. The new branch runs before
every Geelark check for that reason — otherwise those posts would have been
quietly dropped as "not in Geelark" and never reached anyone.

**Verification.** Published and confirmed live, then proven on a real run with a
throwaway phone, account and post: the account got a queued item and **no
Geelark job**, the content row was left untouched, a second run added no
duplicate, the post showed up on the To-do list with its caption and video,
ticking it Posted closed the content row, and marking it Failed burned it and
took it out of the due list for good. Everything was then removed and the
database confirmed back where it started. **Not yet met by real work:** no real
phone or account is on Physical, and while every account is paused the 10am run
does nothing at all.

---

## 2026-09-22 — The to-do list is the real day's work now

**Where it came from:** ticket PF-07, the next one in the phone-farm build
order after PF-04. Its screens were approved on 2026-09-22 (design tickets P1,
P2 and P3); what was missing was the data behind them and the six states P3
deliberately handed over.

The To-do card on the dashboard and the To-do page have been showing an
invented farm since they were designed — made-up phones, made-up handles,
ticks that were forgotten the moment the page reloaded. They now show the real
day, and a tick is written down.

**What the list is made of.** Posts come from the rows the Posting Agent hands
out. Warmups are not stored at all: every account owes two a day, so the list
works them out from what has actually been logged each time it is drawn.
Nothing has to be created at midnight, and a day nobody looked at still reads
correctly afterwards.

**The rules it now keeps, all yours.** Paused accounts stay off the list. An
unfinished post carries over for three days and then stops. A failed post is
dumped — finished, never carried over, never handed out again. An account set
to Automated still shows its two warmups, as items nobody can tick, so a
script that has stopped shows up as work that never gets done rather than as
silence.

**The six states around a save.** These were the real work, and each was a
decision:

1. **While it saves** the sheet holds, with the button reading "Saving…". It
   does not close hopefully. A post believed logged and not logged comes back
   tomorrow as carried over, and that is the failure worth guarding against.
2. **Knowing it took** is the item itself: it re-reads from the database and
   appears struck through with the time. No second message on a screen used
   standing up with a phone in the other hand.
3. **A save that failed** leaves the sheet open holding what you typed, says
   what went wrong, and offers Try again. Try again cannot save twice: if the
   first attempt actually landed and only the reply was lost, the app answers
   "already done" instead of writing again.
4. **A link that is clearly not a link** is warned about, not refused. The
   link is optional, so refusing what somebody pasted could leave them unable
   to record a post they really made.
5. **Somebody else finishing it while your sheet is open** is now caught. The
   save is refused with what they did — "Somebody else already marked this
   posted, with its link" — instead of quietly replacing their answer.
6. **Paste doing nothing** now says why. Safari can refuse the clipboard
   outright, and an empty clipboard is a different answer from a refused one;
   before, both were silence, with a long URL to type by hand as the fallback.

**Two bugs found and fixed while proving it.** Every day the list asked for
came back a day early, because of how the day boundary was built. And a post
carried over from an earlier day vanished the instant it was ticked, instead
of staying struck through for the rest of the day — which on screen looks
exactly like a save that did not work.

**One thing to know.** Until the Posting Agent is forked (PF-06) nothing hands
posts out, so the list will show warmups and nothing else. With no phones
registered it says "No phones yet", which is the true answer today.

**Verification.** Proven against the real database with a throwaway phone and
two throwaway accounts: a post marked posted, the same save repeated to prove
it cannot write twice, a stale save refused as somebody else's, a post marked
posted without its link and the link pasted afterwards, a failed post refusing
to be un-failed, a post carried over from two days earlier appearing and one
from five days earlier correctly not. **The failed save was proven by a real
failure**, not written: the row was deleted out from under an open sheet, and
the sheet stayed open saying "That post is no longer on the list." with Try
again. Every test row, both accounts and the phone were then removed and the
database confirmed back to exactly where it started. Looked at in the running
app in dark mode at 1440 in **headless Chrome, not Safari**; light mode and
phone width have not been looked at for this screen yet.

---

## 2026-09-22 — Warming an account up by hand now counts for something

**Where it came from:** ticket PF-04, the next one in the phone-farm build
order. Its screens were approved on 2026-09-22 (design tickets P3, P4 and P5);
what was missing was everything behind them.

Until today the app had no idea a real phone had been warmed up. Geelark cloud
phones write their own record every time they scroll and like an account, and
the health dot beside every account is read from those records — so an account
moved onto a real iPhone, warmed by hand every morning, would have gone on
looking like an account nobody had touched for weeks. That is now fixed: a
warmup done by hand is recorded, and it counts exactly the same as one a cloud
phone did.

**What you can do that you could not yesterday.**

- **Log a warmup.** There is a **Log warmup** button on a phone's page, beside
  that phone's warmup history, and on an account's own page. It asks for the
  minutes and an optional note, and shows how today's two sessions stand so
  you can see what the minutes are being added to.
- **A warmup can be logged in two goes.** Ten minutes now and eight more after
  the phone has been put down is one session of eighteen, not two failed ones.
  A session counts as done at fifteen minutes, which is the line Garreth set
  on 2026-09-19.
- **See a phone's warmup history.** Each session says which account, when, how
  long, and whether a person or the script did it. It was showing invented
  sessions; now it shows real ones.
- **The Manual / Automated switch remembers.** The hand-and-robot switch on
  the Accounts page has been on screen since 2026-09-22 but forgot the moment
  the page was reloaded — there was nowhere to put the answer. Now a press
  saves, one account at a time or every account on a phone at once. If a save
  is refused the switch goes back where it was and says why, rather than
  sitting there claiming something that never happened.

**One thing worth knowing.** The invented farm on `/accounts?demo=1` uses real
profile names, so now that the switch saves, a press there would have changed
a live account. It deliberately does not save, exactly as it did not before.

**Two things were deliberately NOT done.** The backlog asked for Geelark's
type-90 records to be counted as warmups too; they are the phone *booting*, not
the account being warmed, and treating them as the same thing is a bug this
codebase already fixed once, so the Geelark half is untouched. And the to-do
list still runs on invented data — making it real is the next ticket, PF-07,
and doing half of it here would have collided with that work.

**Verification.** The database change was applied live and checked both ways.
The 52 accounts the health view already answered for come back **byte for byte
identical** to before, so nothing about a Geelark account's dot moved. Then a
throwaway phone and two retired accounts were parked on it, a warmup was logged
through the screen itself, and the health view picked it up for an account that
had never been warmed on Geelark at all — after which every test row, the test
phone and the parked accounts were removed and the view was confirmed back to
exactly 52. Looked at in the running app in dark and light, at 1440 and at 390,
with no console errors — **in headless Chrome, not Safari**, which is what
Garreth uses. **Not yet met by real work:** no phone is registered and no
account is on Physical, so the first genuine warmup has still to be logged.

---

## 2026-09-22 — A post that fails is finished with, not tried again

**Where it came from:** Garreth, 2026-09-22, settling the one question ticket
PF-07 could not build its Failed button without: "failed posts should be
dumped."

When a post cannot be put up, pressing Failed is now the end of that post —
and of the content behind it, which is dumped with it rather than going back
in the pool to be offered another day (Garreth, same day). It is not offered
again, and it does not come back on tomorrow's list. That last
part is the bit that needed changing: the rule until now was that anything
unfinished carries over for three days, and the app counted a failed post as
unfinished — so a post that was meant to be thrown away would have reappeared
three mornings running. It now settles the moment it is marked failed.

**A knock-on worth watching.** The day's counts read "done" for anything
nobody has to touch again, so a post that failed now counts towards them. An
account whose only post failed will say its posts are done, in the same cyan
as an account that actually posted. Nothing is lost — the To-do page still
says Failed beside the post itself — but the pill alone no longer tells the
two apart. Left as is for now; it is a small change to separate them if it
grates.

**Not proven.** No post has ever been marked failed against real data; there
are no real deliveries yet. This is the rule written down and the app changed
to match it, waiting on PF-06 and PF-07.

## 2026-09-22 — A phone's page now opens on that phone's day

**Where it came from:** ticket P5 in `docs/PHONE-FARM-DESIGN-TICKETS.md`.
**Garreth approved it on 2026-09-22**, after three rounds of his feedback on
the day it was drawn. All three changes are in below.

Until now, opening a phone showed you the form you filled in when you
registered it — its name, its model, its proxy — and you had to scroll past
all of that to find out what the phone actually owed today. The order is now the
other way round. A phone’s page opens on **Today on this phone**: a short
overview of how that phone’s day is going, account by account, saying what is
done and what is still owed. Under it, **Accounts** now says for each account
how healthy it is and whether a person or the script warms it up — what you
want to know before you pick the phone up. Under that, **Warmup history** lists
the phone’s recent warmup sessions, with a hand beside the ones a person did
and a robot beside the ones the script did. The phone’s details, its
whoer.net screenshot and its In use switch have moved below all of that,
because they are set once and then left alone.

**That block says how each account stands, and nothing more.** It went through
three rounds in a day. As first drawn it was the To-do page’s own list, ticks
and all, which quietly made a phone’s page a second place to do the same day’s
work; marking something done belongs on the dashboard and the To-do page and
nowhere else. Making it unpressable was not enough — rows with a tick or an
empty box down one side still read as a checklist. So the list is gone
altogether. Each account is now one line: its handle, and how the two halves
of its day stand. **A finished half is cyan and sits still. An unfinished one
is a grey pill you can press, and it takes you to that account on the To-do
page**, which is where the work is actually done. See it here, do it there.

A **Live view** button sits at the top right, where the In use switch used to
be. It does nothing yet on purpose: the page it will open on the MacBook Air is
a separate job (PF-14), and it is drawn now only so its place can be judged.

**Nothing on the screen is real yet.** The tables behind today's work, the
warmup log and the warmup mode do not exist (PF-04, PF-05, PF-07), so the page
is judged against an invented phone: add `?demo=full`, `?demo=new` or
`?demo=off` to a phone's web address to see a phone with three accounts, a
phone registered this morning with none, or a phone that is switched off and
still owes its day. Without that, the page reads the real database exactly as
it always has, and the three new blocks say they have nothing to show — which
is the truth until those tables are built. The invented phone saves nothing: no
button on it writes anything anywhere.

**What was checked:** the page was looked at in the running app, in dark mode,
at 390 pixels wide (a phone) and 1440 (a laptop), in all three states, in
**headless Chrome**. Garreth uses Safari, and Safari was not checked. Light
mode was glanced at and looks right, but P5 only asks for dark. The version
that shows a real whoer.net screenshot could not be seen at all, because the
invented phone has no picture to show and no real phone has been registered
yet; that part of the page is unchanged apart from where it sits.

## 2026-09-22 — The dashboard can now record a post that a person made by hand

**Where it came from:** ticket PF-05 in `BACKLOG.md`, part of moving the fleet
off Geelark's cloud phones onto real iPhones.

**The problem it solves.** On the old fleet, the dashboard knows a post really
went out because the cloud phone tells it so — every screen that says "posted",
every count, every performance number ultimately rests on that one report back.
A real iPhone in somebody's hand reports nothing. So as accounts move across,
there was no way for the dashboard to know whether a post actually happened.

**What is new.** A place to keep that record: one line per post handed to a
person, saying which post it is, which account and which phone it was handed
to, whether it is still waiting, done, failed or skipped, the link to the live
post once it exists, a note, and who finished it and when. That line is now the
"this actually went out" answer for the real-phone fleet, exactly as the cloud
phone's report is for the old one.

**Nothing on screen changes yet, and nothing posts differently.** This is the
record itself and the code that reads and writes it. The to-do list that shows
these to Yurie is PF-07, and the change that makes the posting robot write them
is PF-06. Until those land, the to-do screens keep drawing their made-up
example data.

**Two deliberate safeguards.** The same post can only be handed to the same
account once — hand it out twice and the second attempt quietly changes
nothing. That matters because the robot that will create these lines is n8n,
which retries when it is unsure, and a retry must not put the same post on
somebody's list twice or drag a post already marked done back onto it. And a
line can only be marked done if it carries the time it was done, so nothing can
sit there reading as finished with no date against it. The first of those has a
consequence still to be decided: a post that failed cannot be handed out again
as a second line, it has to be put back on the first one. PF-07 needs that
settled before it builds the Failed button.

**Who can see it.** Only the dashboard's own server, the same as the accounts
and phones tables. The public key that some of our other tools use was checked
against it directly and is refused.

**Confirmed live.** The table was created on the live database, and then a test
line was put through its whole life using the dashboard's own code: handed out,
handed out a second time (which correctly did nothing), marked posted, given
its link, put back on the list, and finally marked skipped. Each step was read
back and was right. Handing a post to a phone that does not exist, or to an
account that does not exist, was refused. The public key was refused on both
reading and writing. The test line was then deleted and the table is empty.

**One thing was tightened straight after.** Supabase's own performance check
pointed out that looking up a person's posts by account would have meant
reading the whole record every time. A second small change the same day fixed
that while the table is still empty, which is the cheap moment to do it. The
check now comes back clean for this table.

**What has not been proved.** No real post has been through this yet — no phone
has been registered, no account has been moved to the real-phone fleet, and the
whole fleet is still paused. The "which phone" part in particular was only
tested with no phone attached and with a made-up one, because there is no real
phone on file to attach.

## 2026-09-22 — Accounts can be read by phone, and each one says who warms it

**Where it came from:** Garreth, 2026-09-22, working through design ticket P4
(`docs/PHONE-FARM-DESIGN-TICKETS.md`). **He approved it the same day**, light
mode included — both views were looked at in dark and light, at desktop and
phone width, before he took it.

**One part of P4 was deferred rather than guessed at.** What an *Automated*
account shows in place of a log form — today's two sessions, each done once the
script has finished, and the loud version of "this script has stopped" — cannot
be drawn while nobody has decided what the new warmup script actually does.
Garreth moved it to PF-13 in `BACKLOG.md` (2026-09-22), to be designed and
built with the script itself. Everything else in P4 is drawn.

**The Accounts page has two views now, in Physical only.** **By account** is
the table exactly as it was, one row per account, and it stays what you land
on — nothing changes for anyone who is not thinking about phones. **By phone**
groups the same accounts under the phone they sit on, **and each group keeps
every column the flat list has**: it is the same table cut into blocks, not a
summary of it, so grouping never sends you back to the other view to read
something. The column widths are fixed there so the blocks line up, with a
minimum width under them so that on a phone each block scrolls sideways — the
same as the flat table — instead of crushing eleven columns into 390px.

**The page takes two lines in Physical:** its name and the view of it on the
first, opposite each other; the filters, Show retired, the search and Select
multiple profiles on the second, arranged as they already are on Cloud. Cloud
has no phones, so it never sees the switcher and keeps its single row on a
desktop.

**On a phone the page is simpler now, on both fleets** (Garreth, 2026-09-22).
The health pills — All, Healthy, Needs attention — moved inside Filters, since
three more pills across the top of a 390px screen left no room for the search.
**Select multiple profiles** is its icon alone, beside the search it belongs
with. And the order reads the way the job runs: the page's name, then the
search, then Filters and Show retired — with **Show retired at the far end of
that line**, opposite Filters, since a checkbox pressed up against the button
reads as part of it. Nothing changed above phone width on
either fleet. This one does touch Cloud, unlike the rest of the phone-farm
work, because one page behaving two different ways at 390px would be worse
than the rule it breaks.

**Every account now says who warms it up: a person, or the script.** A small
pair of icons — a hand and the same robot the To-do list already uses — sits in
the Warmup column beside how long since the last warmup, because they are one
question. Hovering says "Set to manual" or "Set to automated"; there are no
words on screen, because the lit icon already says which way it is set. The
days-since-warmup figure beside it has a fixed width, so **every switch in the
column starts at the same place** rather than trailing however long that row's
word happens to be, and the Warmup column was widened so the switch keeps clear
of Last Post beside it. **One press does it, with no hold to confirm** (Garreth, 2026-09-22) — the press
beside it puts the account straight back.

**A phone can be switched all at once.** In the by-phone view the same pair
sits on the phone's own line, for the day the warmup script is switched on for
that phone. If that phone's accounts disagree — two by hand, one by script —
**neither icon lights**, since lighting one would be a lie about the rest, and
the hover changes to "Set all to manual" / "Set all to automated" so the press
says plainly that it is about to make them agree.

**Accounts not yet on a phone get a group of their own** at the end of the
by-phone view. An account moved to Physical and not yet put on a device would
otherwise simply vanish from the page.

**Nothing here saves yet, and the page says nothing that isn't true.** There is
no warmup-mode column in the database until PF-04, so a press moves the switch
in the browser and forgets it. And because no account has been moved to
Physical and no phone is registered, the by-phone view is genuinely empty —
**`/accounts?demo=1`** draws an invented farm so the design can be judged.
That is never the default: Accounts is a working screen on live rows, and a
placeholder that quietly replaced them would be a lie the day the first account
moves over.

**What was checked:** it compiles, types and lint are clean, 134 tests pass,
and both views were looked at in the running app at 1440 and 390, in dark and
in light. Checked in headless Chrome, so anything Safari-specific was not seen.
No part of this has met real data.

---

## 2026-09-22 — A To-do list for the phone farm, and Automation stays on the Physical side

**Where it came from:** Garreth asked on 2026-09-22 to start the phone-farm
design tickets, P1 and P2 in `docs/PHONE-FARM-DESIGN-TICKETS.md`. He chose to
have them drawn **in the running app** rather than on a design canvas, so what
he reviews is the screen itself and nothing has to be re-made for the build.
Eleven rounds of his feedback followed the same day; the ticket records each.

**A new To-do page, and a To-do card on the Physical dashboard.** This is the
screen Yurie will live in: the day's posts and warmups, grouped by phone and
then by account, because she works phone by phone. On the dashboard each phone
is one line saying how it stands; opening it shows that phone's work. The page
itself shows everything, with a day-stepper to look back at a day that was
missed or forward at the load coming, and a picker for one phone or several.
**A phone holding a post that was marked done but still owes its link shows a
yellow link icon where its phone icon goes**, the same way a phone finished for
the day shows a tick there. That replaced a "1 link to add" filter at the top of
the page (Garreth, 2026-09-22): the phone to go back to points at itself,
rather than a control offering to go and find it.

**An item is ticked off, and the app then asks what happened.** Ticking a post
opens a small sheet: the link (optional — saving without it leaves the item
owing one), or what went wrong from a short list. Ticking a warmup asks for the
minutes. A wrong tap is undone by holding a button in the same sheet. This is
design ticket P3, brought forward, because a tick cannot be judged without the
thing it opens.

**Warmups done by the script stay on the list**, marked with a small robot
badge and with no tick anyone can press. That way a warmup script that has stopped running shows
up as an item that never completes, instead of as silence.

**The To-do page can stand the phones side by side** (Garreth, 2026-09-22).
The page still opens as it did, one phone per full-width row. A **Grid / List**
switch at the end of the filter row now offers a second way to read it: the
phones as cards three across on a wide screen, two on a smaller one, so the
whole farm can be taken in at a glance in the morning rather than scrolled
through. The switch carries the same two symbols as the Carousel Generator's
render screen, so the same control means the same thing in both places, and it
only appears on a screen wide enough for a second column — on a phone there is
no room for one, and a switch that changes nothing would be a broken switch.
A phone's card now measures **itself** rather than the window when it decides
whether to spread its rows out or stack them, which is what lets the same card
be right at full width and in a third of the page. The **day arrows shrank** to
the height of that switch, so the two controls at the top of the page read as
the same weight; the tap area around them is unchanged. On a card in Grid the
task's two fetch buttons **sit side by side and fill the width** rather than
stacking, which took a lot of height out of a card; there is no room for
"Download video" beside "Copy caption" at that width, so they shorten to
**Video** and **Caption** with an icon each. At full width they are unchanged.
And a task's status and buttons now sit on **the centre line of their row**
rather than riding the first line of a two-line task.

**What happened to a task is now said beside its name** (Garreth, 2026-09-22),
where the Automated badge already sat — Link needed, Failed, Skipped —
instead of at the far right of the row, because it is part of reading the task
rather than something to look for at the other end. **A failed post also turns
its own mark red**, the little circle beside the tick that says whether the
item is a post or a warmup, so the row that went wrong is findable at a glance.
The right-hand end of a row is now only the two things you fetch before going
to post, and on a narrow card those two fill the row from edge to edge. And
**the word "Automated" became a robot badge** on both screens (Garreth,
2026-09-22): the label was as wide as some of the tasks it sat beside, and it
is glanced at rather than read. Both screens draw it from one shared piece, so
they cannot drift apart, and the word is still read out to a screen reader.
Hovering the badge spells out **"Automated task"**; nothing depends on that,
since these screens have to work from a phone, where there is no hover.

**What was checked for this part:** it compiles, types and lint are clean, and
both views were looked at in the running app at 1440 and at phone width, in
dark and in light. Checked in headless Chrome, so anything Safari-specific was
not seen. In a narrow column a task's two buttons sit on their own lines, the
same as they already do on a phone; that is the approved phone layout doing its
job, not new breakage.

**Automation stays on the Physical side** (Garreth, 2026-09-22, reversing an
earlier decision). Plenty still runs by robot for real phones — the scheduler,
the warmup scheduler, the pollers and the alarms — so the card and the menu
item both stay; the **Devices card** left the dashboard instead, since the
phones have a page of their own. The one workflow hidden on the Physical side
is the **Posting Agent**, because posting is by hand there. It still shows on
Cloud.

**Smaller things on the dashboard.** The Inventory card's empty state now fills
its card so the "Total to produce" line sits on the bottom edge. The Proxies &
numbers card puts its Proxies / Phone numbers switch on its own line on the
Physical dashboard, where a third of a row leaves no space beside the title.
Cloud's homepage is untouched throughout.

**The list is not real yet, and says so honestly.** Every phone, account, post
and warmup on both screens is invented placeholder content, held in
`src/lib/data/todo-placeholder.ts`, and the ticks live only in the browser for
as long as the page is open. The real list needs `post_deliveries` (PF-05) and
the page behind it (PF-07), neither of which exists; both placeholder files
delete themselves when PF-07 lands. So the Devices card can say "No phones yet"
while the To-do card lists three — that is the placeholder sitting beside true
empty data, not a fault.

**What was checked:** it compiles, types and lint are clean, and both screens
were looked at in the running app at phone width (390) and desktop (1440) in
dark AND light mode, including the empty, all-done, no-phones,
switched-off-phone and long-content cases. Checked in headless Chrome, so
anything Safari-specific was not seen. No part of this has met real data.

**Garreth approved both screens on 2026-09-22**, after fourteen rounds of
feedback that day, **light mode included** — that was taken as the app's
colours already render it, looked at rather than designed in a pass of its own.
A last change went in with the approval: **the dashboard card's phone icon now
carries the yellow link** as well as the page's does, so both say the same
three things in the same place — a cyan tick when the phone is finished, a
yellow link when an account on it owes one, the phone itself otherwise.

**P3 is approved too** — the sheet that every tick opens, which was built early
inside P2 because a tick cannot be judged without the thing it opens. What it
does NOT yet cover is everything around a save that can go wrong: saving,
saved, could not save and nothing was changed, a link that is clearly not a
link, an item someone else finished while your sheet was open, and a Paste the
browser refused. Those are now written out in `BACKLOG.md` as PF-07's
done-when, because nothing can fail against invented data — a save has to be
real before its failure can be designed. Because they were drawn in the running app rather than on a
canvas, approving them closes the design and most of the build at once: the
screens are in the app and on `main`. What they still lack is real data —
`post_deliveries` (PF-05) and the page behind the list (PF-07), plus
`warmup_sessions` (PF-04) for the warmup items — so until those exist the
screens go on showing invented phones and tasks.

**Also corrected:** this file, `BACKLOG.md` and the phone-farm ticket list all
still said the earlier phone-farm work (the Cloud/Physical switch, Devices,
Facebook, the per-fleet numbers) was sitting on a branch waiting to be merged.
It has been on `main` since 2026-09-18, in pull request #7. Six places now say
so.

---

## 2026-09-21 — Strangers can no longer create a login account

**Where it came from:** the 2026-09-09 outside code review's one security
finding. This is the small, separable part of it, written up in `BACKLOG.md` on
2026-09-11 and done on Garreth's say-so, 2026-09-21.

**What was open.** The login system behind the dashboard would make an account
for anyone who asked, using their own email. The allowlist (`ALLOWED_EMAILS`)
still kept them out of the dashboard itself, but they came away with a real,
valid login for the project. That mattered for the bigger fix still to come:
when the database is eventually locked down, "signed-in people" has to mean the
team, not anyone on the internet who registered.

**What changed.** Garreth turned off "Allow new users to sign up" in the
Supabase dashboard. It is a setting, not code, so nothing in the repo changed
apart from this entry and the backlog.

**Confirmed live, 2026-09-21.** The project's public settings now report signup
as off. Two attempts to create an account with a never-seen email, one by magic
link and one by password, were both refused with "Signups not allowed". The
account list still holds the same five people and no test account was left
behind. Checking beforehand showed nothing else uses this login system: all
five accounts are dashboard people, and the n8n workflows reach the database
with keys, which this switch does not touch.

**What is different for the team.** Nothing for the five people who already
have accounts. Adding someone new is now two steps instead of one: add their
email to `ALLOWED_EMAILS` as before, *and* invite them once from Supabase
(Authentication → Users → Invite user). Without the invite, their first
sign-in shows "Couldn't send the link. Try again."

**What this does not fix.** The database itself can still be reached with the
project's public key, no account needed. That is the main finding, it is still
open, and it is still on hold by Garreth's 2026-09-11 instruction. See "Close
the anon-key hole on the database" in `BACKLOG.md`.

## 2026-09-21 — The "data stopped arriving" alarm no longer depends on the public database key

**Where it came from:** the same security finding as the entry above. Before
the database can be locked down, everything that uses the public key has to be
found and moved. Garreth asked for that search on 2026-09-21 and picked this
alarm as the first one to move.

**What the search found.** The public key is in daily use, which nobody knew:
eleven n8n workflows (the whole Cleora line among them), some Python scripts,
and the carousel review pages in the browser all have it pasted in. Locking the
database today would have stopped all of them, and this alarm would have gone
silent rather than loud. The full list is in `BACKLOG.md`; ten workflows are
still to move.

**What changed.** In the n8n workflow `[Health] Analytics Freshness Alarm`, the
step that asks the database whether the feeds are fresh had the public key
typed into it. It now signs in with the saved `Supabase Service Role`
credential. Nothing else in the workflow changed, and nothing in this repo
changed; the workflow lives in n8n.

**How it was checked.** An exact copy of the changed step was run on its own,
with no email step, so Czedrick did not get a duplicate alarm. It returned the
same report the live step returns (two feeds stale, which is expected while
posting is paused), and the database's own request log shows that call arriving
with the master key and succeeding. The change is published and the live
version matches the edited one. **Not yet seen:** a real scheduled run. The
next one is 2026-09-22 at 10:00 ET; if the usual alarm email arrives, it works.

**Nine more moved the same day, on Garreth's instruction.** Cleora Director,
Cleora Writing Agent, Cleora Story Auto-Vetter, Cleora Story Research, Cleora
Instagram Scout, Podcast Clips Ingest, the BA Journey Carousel Posting Agent,
and the Embarrassed Angle Hook Writer and Scriptwriter. Same change in each:
the pasted public key came out and the saved master-key credential went in.
Everything else about each step was kept, including the settings that decide
how a save behaves when the row already exists. One small repair rode along: a
step in the Embarrassed Angle Scriptwriter had no sign-in attached at all and
was already failing; it now has one.

**One needed an extra step: the Cleora ASMR Scriptwriter.** It sits in a
different n8n project from the saved credential and n8n refused the change at
first. Garreth shared the credential with that project and it was moved later
the same day. That makes all eleven: no n8n workflow we know of still uses the
public key.

**Two more workflows had the master key pasted in, and those were moved too**
(Garreth's go-ahead, same day): the TikTok analytics ingest, six steps, and the
Unified Posting Agent, six steps. This is a tidier change than the ones above:
the pasted key and the saved credential are the same master key, confirmed step
by step before editing, so these workflows can do exactly what they could
before. What changes is that the key now lives in one place, which is what
makes replacing it later possible without hunting through workflows. On the
TikTok ingest, the slow-and-steady save settings that fixed the 2026-09-07
overload were read back unchanged. First real runs: Posting Agent 2026-09-22
10:00 ET (with the fleet paused it will read but probably not write), TikTok
ingest 2026-09-23 08:30 ET.

**A second pass the same day found five more and moved them:** the View-Collapse
Detector (the account-health check that runs Tuesdays and Fridays), the BA Older
Woman Hook Generator, the 2-slide BA Scriptwriter, the Pillar A Promoter and the
Pre-Publish Gate. Same change, same checks, none run by hand. That brings the
day to nineteen workflows touched; `BACKLOG.md` lists every one.

**The same pass reviewed the nine database tables that already had access
rules.** Seven of them have a rule that says "anyone with the public key may do
anything", which is no rule at all, so the lockdown now covers 162 tables rather
than 155. Two have real, narrow rules and are fine. Nothing was changed; this
was a read.

**Still open after today.** One public-key caller is not found yet (something
in n8n reads the `conspiracy_kitchen` table a few times a week). Two workflows
still read with the public key from inside a code step and would break at the
lockdown. And one workflow, the Universal Caption Maker, will send the master
key to whatever database address its caller gives it, which should be fixed
before anything else in this list.

**Not done, on purpose.** The Smart Scheduler, the Virlo bridge and two
Embarrassed Angle workflows keep their keys inside code steps, where n8n cannot
use a saved credential. Each needs a small rebuild rather than a swap. They are
listed in `BACKLOG.md`.

**Worth knowing.** Moving a key out of a workflow does not make the old key
safe: n8n keeps every old version of a workflow, pasted key included, and the
keys have been shown in full to tooling more than once. The old keys stop
mattering only when they are replaced, which is still parked until Geelark is
retired.

**How these nine were checked, and what has not been seen yet.** None of them
was run by hand, because they post, email and spend money. Each was checked for
someone else's unfinished edits first, published, and read back to confirm the
live version is the edited one and no public key is left. **No real run has
happened yet for any of the nine.** The hourly Cleora ones run first; some only
run weekly. Three of them carry on quietly when a save fails, so their first
runs need a look at whether rows actually arrived. **If any of these workflows
misbehaves, `BACKLOG.md` has the table of every workflow touched, with the
version to restore in n8n's version history.**

## 2026-09-18 — Phone farm: Cloud and Physical fleets, a Devices page, and Facebook accounts

**Garreth's request, 2026-09-18:** start the first three phone-farm tickets,
PF-01, PF-02 and PF-08 from `BACKLOG.md`. They come from his 2026-09-16
decision to move the accounts off Geelark cloud phones onto real iPhones.
Built by three Claude agents working side by side, then checked together.

**On `main`,** merged the same day in pull request #7. (This entry first said
it was waiting on a branch for Garreth's say-so; that was true for a few hours
and was never corrected until 2026-09-22.) The two database changes below only
add things; nothing existing was altered or removed.

**Cloud and Physical, two fleets in one app (Garreth's design, 2026-09-18).**
The first version of PF-01 put a Geelark / Real phone pill on the account page
and the Accounts table. Garreth did not want the screens that run the Geelark
pipeline to change at all, so the same day it became this instead:

- **A Cloud | Physical switch at the top right, beside your name.** Cloud is
  the app exactly as it was: the same menu, the same Accounts table, no sign of
  phones. Physical is the same screens showing only the accounts on real
  iPhones, plus the pages that only make sense there. Devices is the first;
  the Posting To-Do page and the warmup log will join it.
- **It is per person.** Each person's choice is remembered in their own
  browser for a year, so Yurie working in Physical never changes what anyone
  else is looking at. Everyone starts in Cloud.
- **It only changes what you see.** The scheduler and the posting robot are
  not affected by it in any way.
- **Settings → Account management** (the Settings page was an empty
  placeholder until now) lists every live account with a Cloud or Physical
  pill. Pressing the pill opens a confirm with a press-and-hold button, the
  same as Retire, so an account cannot be moved by a stray tap. Each move is
  written to the audit log with who, when, and the old and new value, and it
  never touches paused or unpaused. Once moved, an account shows on the other
  fleet's screens only.
- **What follows the switch today:** the Accounts table, the Accounts card on
  the homepage, the per-account posting limits on the Content calendar (with
  its blocked, throttled and paused counts redone for the fleet shown), and
  whether Devices is in the menu. An account's own page opens from a direct
  link in either mode, so a link in the bell never lands on nothing.
- **Analytics follows it (PF-17).** The Analytics page, the Top posts card
  and the analysis page's top content show only the fleet being looked at.
  Garreth's rule: an account's data follows the account. Whatever fleet an
  account is in today, all of its history counts there, including everything
  from before it moved. Posts whose handle matches no account count as Cloud,
  so the two fleets always add up to the whole. Checked by query: the new
  calculation set to "all" gives exactly the old answer for 7 days, 28 days
  and all time; Cloud gives exactly the old answer today; Physical is empty.
  In the running app Cloud shows the same 75 posts from 26 accounts over 7
  days that Analytics showed before, and Physical shows none.
- **Inventory follows it (PF-18).** The Inventory page, its window switcher
  and what-if, the production order and the homepage Inventory card. Demand
  comes from the fleet's own accounts. Garreth clarified that Cloud accounts
  will not post any more, so content not yet given to an account is
  Physical's supply and Cloud sees an empty pool. No post is labelled with a
  fleet and the Smart Scheduler was not changed. (An earlier plan that day to
  label every post Cloud or Physical was dropped as unnecessary.) **This one
  could not be proven with real numbers:** every account is paused, paused
  accounts create no demand, so Inventory is empty for both fleets and for
  the old calculation alike. The changes are small and marked line by line in
  the migration, and the check to run once accounts are unpaused is written
  in `supabase/migrations/README.md`.
- **What does not follow it yet:** the Content calendar itself, Content
  types, Incidents and the bell still count both fleets together (PF-19,
  PF-20 in `BACKLOG.md`). The calendar is better done after the posting
  hand-off (PF-05) exists, because without it a Physical post has no record
  of having been delivered.
- **The emails are not touched.** The digest and the Monday production order
  stay fleet-wide; Garreth will retire them once everything is in the
  dashboard. Their calculations (`inventory_check`, `inventory_rollup`,
  `v_scheduler_production_order`, `analytics_rollup`) were left exactly as
  they were; every per-fleet number comes from a new calculation beside them.

**After Garreth tried it (same day).** He confirmed the top-right switch works
in a real browser, and asked for four things, all done:

- **The switch is two icons,** a cloud and a phone, instead of the words. The
  name still shows on hover and is read out by a screen reader.
- **Empty states.** A list with nothing in it used to show its column headings
  over blank space, which reads as broken or still loading. It now shows an
  icon over one quiet line, the same as the Devices page: "No accounts yet"
  (or "No accounts match" when a filter hid them) on the Accounts table, the
  homepage Accounts card and the posting limits; "No demand yet" on Demand vs
  supply and the homepage Inventory card; "Nothing to make yet" on What to make
  next. This is one shared piece, `src/components/ui/empty-state.tsx`. It shows
  in Cloud too wherever a list is empty, which today means Cloud's Inventory,
  since every account is paused.
- **Physical's homepage shows Devices where the GeeLark wallet was.** One row
  per phone in use: its name, model, iOS version and time zone, how many of its
  three places are taken, and a "No proof" flag when it has no whoer screenshot
  yet, with View all going to the Devices page. Cloud keeps the wallet. Last
  warmup per phone will join this card when the warmup log (PF-04) exists.
- **"Proxies & phones" is now "Proxies & numbers"** in the menu, the top bar,
  the page and the homepage card, in both fleets, so "phones" only ever means
  the real devices. The page's second tab was already called Phone numbers.

Looked at in the running app in Physical and in Cloud. The Devices card has
only been seen empty, because no phone is registered yet.

**A second round from Garreth the same day,** all in the app:

- **The refresh button at the top right is gone.** Pages still show fresh
  numbers on their own: everything is re-read within a minute, and straight
  away after a change made in the app (moving an account, pausing, editing a
  phone). What is lost is forcing a re-read on demand.
- **Proxies & numbers and the Incident feed now follow the fleet.** A phone's
  proxy and number, and any incident about an account, show only where that
  account lives. Spare proxies and numbers tied to no phone stay in Cloud,
  where the Replace proxy action that uses them lives. Incidents that are not
  about an account (a failed n8n workflow, a data feed, a scheduled job, a
  character running out of content) also stay in Cloud, because today all of
  that machinery serves the Cloud pipeline; when Physical gets automations of
  its own their failures belong in Physical. This covers the homepage cards,
  both pages, and their range and tab switches. Seen in the running app:
  Physical shows no proxies, numbers or incidents today, which is right with
  no account moved. The Proxies & numbers tables gained the shared empty state
  ("No proxies yet", "No numbers yet", "Nothing matches" under a search).
  **Known gap, written up as design ticket P6:** the page is built from
  Geelark's phone list, so a real phone's own proxy is not tracked for expiry
  anywhere yet.
- **Settings → Account management is four columns** on a desktop (two on a
  tablet, one on a phone), so all 32 accounts fit on one screen.

Also new: `docs/PHONE-FARM-DESIGN-TICKETS.md`, design tickets P1 to P6 for the
Physical side, written because Garreth asked whether the daily to-do list had
a design and it did not. As a design document it gets no entry of its own
here; its record is each ticket's Status line.

**2026-09-19, two design requests from Garreth:**

- **Empty lists now fill the page.** A page whose list is empty used to show
  a short card over a blank screen. The card now reaches the bottom of the
  screen with the message centred in it: Devices, Accounts, Inventory (both
  cards share the space), Proxies & numbers, Incidents and Settings. This is a
  rule for every new screen, and it is built into the shared empty state, so a
  screen gets it by using that piece. Small cards on the dashboard keep their
  size, because the dashboard grid sets it. Analytics got the same icon-and-
  one-line treatment in its three bare spots (the character chart, the content
  types card and the account table). Looked at in the running app in Physical;
  Cloud's Accounts and Analytics were checked and have not moved.
  **It did not work in Safari, which is the browser Garreth uses.** The first
  version leaned on one CSS feature (`:has`) to find a card with an empty list
  in it. Safari supports the feature but does not re-check it for content
  that arrives after the page frame, and every page here arrives that way, so
  his cards stayed short while Chrome, where it was checked, was fine. The
  empty state now also sets the same thing by hand once the page is live
  (`fill-ancestors.tsx`), which does not depend on the browser, and it passes
  the height down through plain wrappers so the message sits in the middle of
  the card (on Accounts it had been near the top). Checked again in Chrome;
  **not yet seen in Safari by anyone but Garreth.**
- **The Cloud / Physical switch is wider,** so each icon is an easier target.

**2026-09-19, Facebook was missing from the platform filters (Garreth).** Two
causes, both choices made the day before rather than faults. The Accounts and
posting-limits filters only offered FB once a Facebook account was in the
list, to keep Cloud's filter as it was; with no Facebook account yet, FB never
appeared anywhere, which read as the feature being missing. And Analytics had
no Facebook tab at all, because there are no Facebook views to chart. Now, in
**Physical**, where Facebook accounts live, FB is always offered on the
Accounts table, the homepage Accounts card and the posting limits, and
Analytics has a **Facebook** tab. That tab does not draw charts of zeros, which
would read as dead accounts; it says "Views are not collected for Facebook
yet". **Cloud keeps All / TT / IG**, since a Cloud account is never Facebook.
Seen in the running app: the FB filter on Physical Accounts and the Facebook
tab on Physical Analytics. Still true: nothing collects Facebook views, and
Top posts and the analysis page have no Facebook because they list measured
posts only.

Two things keep the wrong fleet from posting, and both are just the pause:
**never unpause a Cloud account** (the scheduler would plan it and the robot
would send it to Geelark as it always has), and **keep Physical accounts
paused until PF-05 to PF-07 exist**, because until then the robot would try to
send their posts to a Geelark phone too.

One thing to know: **moving an account to Physical does not stop the robot
yet.** The Posting Agent in n8n does not read the setting until PF-06 is built.
Today a move only records the choice and changes which screens show the
account. An agent had written "Geelark stops posting for this account" into
the confirm; that line was removed because it is not true yet.

**PF-02, the Devices page.** New page in the sidebar under Proxies & phones, in Physical only.
Add phone takes a name, model, iOS version, proxy, time zone, notes and the
whoer.net proof screenshot. Each phone has its own page: switch it in or out
of use, edit its details, replace the screenshot, and add or remove the
accounts it holds. A phone holds at most three accounts. The fourth is refused
with a sentence that names the phone, and so is adding to a phone that is
switched off, a retired account, or an account already on another phone.
Phones are switched off, never deleted. An account that is on a phone shows
that phone on its account page. Proof screenshots show a proxy address, so
they sit in a private storage folder and the app shows them through links that
expire after ten minutes. Only the count of three is enforced, not the
masterplan's mix of one character's Instagram and Facebook plus another
character's TikTok.

**PF-08, Facebook as a platform.** A Facebook account now shows as Facebook
wherever an account is named: the Accounts table (its icon, a link to the
Facebook profile, and an FB filter that appears only when the list holds a
Facebook account, so Cloud keeps its All / TT / IG filter), the account page, the posting
limits table and the calendar day panel. Before this, anything that was not
Instagram was treated as TikTok. That would have made a Facebook account look
dead: its views would have been looked up in the TikTok tables and come back
as zero. Views are not collected for Facebook yet, so those numbers now stay
blank and the account's Analytics tab says so in one line. No Facebook tab was
added to the Analytics page. The three platform names, short labels, icons and
profile links now live in one file, `src/lib/platform.ts`, ready for the
Posting To-Do page and the warmup log.

A Facebook account on a real phone has no Geelark profile, but the dashboard
names every account by its "Profile 12" label and uses it in the web address.
For now such an account simply takes the next Profile number as a label.
Changing how the whole app names accounts would be a much larger job and was
not part of these tickets.

**Database, applied live 2026-09-18** (all five only add things):
`analytics_rollup_fleet`, `analytics_top_content_fleet` and `inventory_fleet`
are the per-fleet calculations described above, plus `accounts_delivery_mode` (the switch,
defaulting to Geelark, so nothing n8n writes behaves differently) and
`devices` (the phones table, a link from each account to its phone, and the
private `device-proofs` storage folder). The devices table can only be reached
by the app itself, not with the public key; this was read back from the
database after applying rather than assumed. All five files
in `supabase/migrations/` match what ran, byte for byte.

**How it was checked.** The code compiles, the lint is clean, and all 134
automated tests pass, 47 of them new (the three-account rule, the Facebook
handling, the fleet rules, the move's validation). The Devices page, the Accounts table, an
account page and Settings were opened in the running app against live data and
looked at. Loaded as Cloud, the Accounts page lists all 32 live accounts and
the menu has no Devices; loaded as Physical, it lists none (nothing has been
moved yet) and Devices is in the menu. The refusals were tried for real: a made-up mode, an unknown account, a
phone with no name, and a phone that does not exist are each turned away with
a plain sentence.

**Not checked yet.** No write has met the live database: no phone has been
registered, no screenshot uploaded, no account put on a phone, and no account
moved to Physical, so no audit-log row for any of these has been seen. A
query after testing confirmed the database holds no phones, no real-phone
accounts and no new audit rows. No screen has seen a real Facebook account,
because none exists. The pages were not seen in light mode, nor at a true
phone width (the test browser cannot go narrower than about 500 pixels). The
first real use by Yurie is the first real test.

Found along the way and written into `BACKLOG.md` rather than fixed: two
places in the database match accounts by handle alone, and the scheduler has
no platform filter. Both matter the day the first Facebook account is created.

## 2026-09-14 (latest) — Carousel Generator: first design, D1 Carousel types

**Garreth's request, 2026-09-14:** design ticket D1 as a clickable prototype,
with the sidebar looking exactly like the app's.

New: `docs/designs/carousel-generator/d1-carousel-types.build.mjs`, which
builds the D1 screens (desktop, phone, and the empty first-run state) for a
Claude Design canvas. It reads the app's own font, logo and icons, so the
design cannot drift from them, and it fills the screens with made-up sample
content. Running it again rebuilds the screens after a change.

Revised the same day after Garreth's reviews. Each card now shows the name;
under it, grey pills for the character and how many slides the template has;
a "View details" row between thin grey lines that opens posts left, days of
cover and median views; then Generate on the right with the last
batch date opposite it, or the status in the date's place when the type has
one. Every Generate button is the same cyan button, at the size of
the grey buttons, with none singled out. The plan, the flows, the design
tickets and the development tickets (DEV-14) say the same.

Garreth approved the dark-mode design the same day, so the D1 ticket is marked
done for dark mode. Light mode was then designed on its own Light page of the
same canvas, using the app's light colours, and the menu's theme switch now
flips any screen between the two. Light mode is awaiting Garreth's review.

Also new: `docs/designs/README.md`, the steps for designing the next tickets
the same way from any Claude Code session: which skills to load, the
sample-data and dark-then-light rules, starting from the D1 build script so
every screen shares the same menu and top bar, and where each canvas link is
recorded.

Nothing in the app changed.

## 2026-09-14 — Carousel Generator: the development tickets

**Garreth's request, 2026-09-14,** once the design tickets existed: turn the
plan and the flows into development tickets, assuming the design step is
finished.

New: `docs/CAROUSEL-GENERATOR-DEV-TICKETS.md`, 36 tickets (DEV-00 to DEV-35)
in the plan's build order: the prerequisites, then the middle of the pipeline
(database, painter, copy writer, quality gate, music lookup, batch screens)
ending with a real batch posted for Glow Up and Covered Eye, then the Studio,
then wiring and image generation, then Trends. Each ticket says what it
depends on, which design and flow it builds, and how to prove it is done.

**Finalised the same day (Garreth):** the Generate form's "How many" now
starts at **50** for every carousel type, instead of the "14-day shortfall"
the plan and flows first described. Nothing in the dashboard calculates a
shortfall per carousel type, so both documents were updated to match. The
question of how wiring adds a new type to the two master lists the scheduler
and poster read is left open, listed at the end of the tickets with the other
questions still to answer. None of them holds up Phase 2. The ticket
document also lists six defaults it proposes where the plan was silent, such
as a "Finish here" button so a stopped batch cannot block its carousel type
forever.

Nothing in the app changed.

## 2026-09-14 — Carousel Generator: the design tickets

**Garreth's request, 2026-09-14,** at the start of the design step.

New: `docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md`, ten design tickets (D1 to
D10) listing which screens to design in Claude Design, in order. The order
follows the path a person takes through the tool rather than the build
phases, as Garreth directed: the landing screen first, then making a batch,
then creating a new carousel type, then the rest of the menu. It also sets the
rules for the designs, including Garreth's instruction that they use made-up
sample content rather than the dashboard's live data.

Nothing in the app changed.

## 2026-09-14 — Sidebar: a Generate page, and the Carousel Generator gets its own menu

**Garreth's requests, 2026-09-14,** after deciding the Carousel Generator stays
inside the dashboard rather than becoming its own app: first the new Content
section and Generate page, then a menu of the generator's own, with the names
"Carousel types" and "History".

**Changed:**

- The sidebar's **Content** section now holds **Generate**, **Content
  calendar** and **Content types**, in that order. The last two used to sit
  under Pipeline. The greyed-out "Carousel Generator" row with its "v2" badge
  is gone; Generate replaces it.
- **New page, Generate** (`/generate`): a row of cards, one per kind of content
  the dashboard can make. Only **Carousel** exists today. Adding another kind
  later is one more card.
- The Carousel card opens the **Carousel Generator**, which swaps the
  dashboard's left menu for one of its own, with **← Dashboard** at the top to
  go back to the Generate page. The top bar, sign-in and data stay the
  dashboard's; only the menu changes.
- That menu holds one item today, **Carousel types**, and its page is a
  placeholder saying it comes in Phase 2. **History**, image libraries, the
  Studio and Trends are added to the menu as each screen is built, rather
  than sitting there greyed out. There is no separate database page; History,
  Carousel types and image libraries already cover what the generator stores.
- The page name in the top bar now reads "Content types" on that page. It used
  to read "Content-types", because the page was missing from the list of
  names.
- `docs/CAROUSEL-GENERATOR-PLAN.md` §6 and `docs/CAROUSEL-GENERATOR-FLOWS.md`
  (§1, F1 and the decisions list) now describe this way in and the
  generator's menu. The screen both documents called "Lanes" is now named
  **Carousel types** there too.

The code compiles and passes the lint check, and the Generate page, the
generator's menu and its phone layout were checked in a local browser.
Nothing about the data changed.

## 2026-09-14 — Written checklist for adding an Instagram account to analytics

**Garreth's direction, 2026-09-14, after connecting Profiles 64 and 65.** Both
accounts were missing from Instagram analytics because they had never given our
app permission to read their numbers. Profile 65's first attempt failed with
"Insufficient developer role": our Meta app is in test mode, so Instagram only
accepts accounts invited as testers. Garreth asked for that to be written down
as the first step, so the next new account doesn't hit the same wall.

New: `docs/INSTAGRAM-ANALYTICS-ONBOARDING.md`, the checklist in order: tester
invite first, then switch to a Creator account, check the handle matches, open
the login link, then confirm. It also covers what each common error means.

No code changed. Confirmed live: both accounts' access is saved in the database
(checked by query), and the 7 accounts that already had it are exactly the 7 on
the tester list. Their posts appear after the next scheduled stats run.

## 2026-09-14 — Carousel Generator: image libraries stand on their own

**Garreth's direction, 2026-09-14, while reading the plain-English walk-through
of the flows.** First: the image library should let you make new images with
AI. Then a correction to how that was first written up: a library is not tied
to one content type. It holds images of a character, a place and anything else
a carousel needs. One content type normally uses it, but another can be pointed
at the same library, so making images inside it must not depend on any content
type. And a content type should be asked which library it uses: when it is
created, and each time a new batch is generated for it, where its library can
be changed (or chosen, if it has none).

**Changed:**

- `docs/CAROUSEL-GENERATOR-FLOWS.md`:
  - F7: libraries are their own thing. Phase 4 adds New library and a
    **Generate images** button (Higgsfield). You write the prompt, say whether
    it shows a character, a place or something else, pick the group it goes
    in, how many and the shape, and for a character, which of its existing
    images keep the face consistent. Nothing is pre-filled from a content
    type. An earlier draft of this same change said the prompt started from
    the content type's instructions; that was wrong and is gone.
  - F8 and F9: the Studio asks for an image library first (an existing one, or
    a new one from Phase 4).
  - F1: the Generate form shows the content type's library with **Change**,
    or asks for one when it has none. A change sticks for later batches, and
    each batch remembers which library it used. Generate is unavailable if
    the library has no images for a group the carousel needs. F5's Run again
    uses the current library.
- `docs/CAROUSEL-GENERATOR-PLAN.md`: the image table is now `image_libraries`
  with no content-type column; a template records which library it points at.
  The Studio, Generate, History, Library and Phase 4 sections say the same.
- `docs/CAROUSEL-TEMPLATE-MODEL.md`: one line saying the pools become a
  library's groups.
- Suggested defaults, which stand unless Garreth changes them: up to 8 images
  per run; portrait, tall or square; new images wait for Keep before use; the
  library is asked for first in the Studio; brand-new libraries arrive in
  Phase 4, when they can be filled.

Nothing the dashboard does has changed. No generator screen exists yet. The
flow diagrams page has not been redrawn for this.

## 2026-09-14 — Carousel Generator: the screens get light mode too

**Garreth's decision, 2026-09-14, while reviewing the flow diagrams:** the
generator lives inside the dashboard, so its screens work in dark and light
mode like every other page, not in dark only.

**Changed:**

- `docs/CAROUSEL-GENERATOR-FLOWS.md` said "dark first", which could be read as
  "dark only". It now says every screen works in both modes, with dark
  designed first and light using the same colour names.
- `docs/CAROUSEL-GENERATOR-PLAN.md`: the screens deliverable now asks for both
  modes to be designed.

Nothing the dashboard does has changed. No generator screen exists yet.

## 2026-09-14 — Carousel Generator: the flows, the template, and the Phase 0 checks

**Garreth's request, 2026-09-14: get the Phase 0 and Phase 1 items of the
generator plan done.** Phase 1 is design only, by Garreth's rule, so nothing
the dashboard does has changed and no screen looks different. What changed is
the paperwork the build will follow.

**Added:**

- `docs/CAROUSEL-GENERATOR-FLOWS.md`: every journey through the generator,
  step by step (making a batch, reviewing it, rendering, resuming, running it
  again, editing a direction, the image library, making and editing a
  template, wiring a new content type, study digests). Each says which button
  is the main one, what needs a press-and-hold, what the empty screens are
  and what the person sees when something fails. It is a draft for sign-off;
  its last section lists the answers it needs.
- `docs/carousel-templates/`: Glow Up and Covered Eye written down as data
  instead of as Python, with `docs/CAROUSEL-TEMPLATE-MODEL.md` explaining the
  format. This is the contract the new painter and the studio will both be
  built to.
- `scripts/carousel-templates/verify.mjs`: compares every number in those two
  files with the Python painters' formulas and the 102 live Glow Up decks.
  **All 134 checks pass**, and it was confirmed to fail when a number is
  changed, so it will catch a template that drifts.

**Checked and written into the plan (`docs/CAROUSEL-GENERATOR-PLAN.md`):**

- **One table per content type works as decided.** The Posting Agent, the
  Smart Scheduler and Inventory were checked by reading their live
  definitions, not by running anything. None of them needs changing for a new
  lane beyond the steps the wiring runbook already lists.
- **Two corrections:** Glow Up deck ids are `GU-153` style, not the format the
  plan guessed; and Glow Up's `slide_1` to `slide_6` text columns are empty,
  so the plan no longer says to fill them. The port spec also said the old
  painter writes slides 1 to 8; it writes 1 to 7.

**Found, and not changed (each is Garreth's call):**

- **Supabase keys sit as plain text in more n8n workflows than we knew.** The
  plan had flagged the Virlo bridge; the Posting Agent and the Smart Scheduler
  carry them too. The keys should move into n8n's credential store before any
  of them is rotated, or posting stops.
- **52 Glow Up decks have a closing line in the database that was never on
  the posted slide.** Every one of the 102 recent decks was painted with the
  same fixed closing line; one batch's column holds a different, AI-written
  line. The posts are fine; the column is misleading.
- **There is no Anthropic key in the local settings**, and the Vercel settings
  could not be checked from this Mac. The generator needs one before Phase 2.
- **Czedrick is not yet on the sign-in list.** The likely address is the one
  the Smart Scheduler already emails, and it needs confirming first.

**Garreth's answers, later the same day, now written into the documents:**

- **A finished deck is called "Generated".** The plan had said "Ready", which
  already means *scheduled for today* elsewhere in the dashboard.
- **Glow Up's closing line is always the fixed one.** The template enforces
  it, and the check script now tests it too (135 checks, all passing).
- **Covered Eye's slide 1 is the hook**, so the hook column will always hold
  the same text.
- **The writer may pick any song on TikTok or Instagram.** Our posting system
  can only attach songs that are in the music library, so a new song is looked
  up on both platforms and added to the library before its deck is handed off
  (flow F14). A live test showed the lookup has to check each post's actual
  sound rather than its caption. An Instagram reel checked out correctly. The
  first TikTok video captioned "Karma - Summer Walker" turned out to be a
  re-upload using its creator's own sound. No genuine TikTok match came up in
  that one test, so the TikTok half is designed but not yet proven.
- **The music library itself needs attention:** 26 of its 76 active songs lack
  a proper Instagram link (11 have no links at all, 15 have a TikTok link
  where the Instagram one belongs). The proposal is that the lookup repairs
  each one when a deck chooses it.

**And a second round of answers, the same evening:**

- **The music lookup checks up to 5 posts on each platform.** If none of them
  carries the right song, the deck is flagged for a person and is not handed
  off.
- **New content types are wired through a reviewed database function**, never
  a direct database connection, so every table the app creates follows one
  checked definition.
- **Where the music lookup sits.** Garreth's "wiring workflow" meant wiring
  new content types, so the lookup is now a named step of that wiring. It also
  runs on every deck the generator makes, Glow Up and Covered Eye included.
  Those lanes' past batches were made outside one pipeline, which is how songs
  were picked without working links; the generator exists so that gap cannot
  reopen.

With these, the flows have nothing left to decide before the screens are
designed.

**Not done yet:** the screen designs, which come after the flows are signed
off.

## 2026-09-14 — The sidebar now says "Carousel Generator"

**Garreth's instruction, 2026-09-14, at the start of planning the generator.**
The greyed-out item under *Content* in the left sidebar was labelled "Generate"
with a "v2" badge, a placeholder carried over from the v1 plan. It now reads
"Carousel Generator". It is still disabled and still carries the badge, because
the page behind it does not exist yet: this session produced the plan for it
(`docs/CAROUSEL-GENERATOR-PLAN.md`), not the page.

Same day, the plan was revised after the source of the existing
`carousel-command-center` Vercel app was recovered. It had never been in Git;
all 25 files were pulled from the Aug 3 deployment through the Vercel API into
`carousel-command-center/` beside this repo. Two finds changed the plan: a
working direction-chat endpoint that is an early version of the per-lane
direction bot, and a July design for batch generation whose lessons are now
§4.5 of the plan.

Later the same day, Garreth's team sent the two Python renderer folders as
zips. Reading them answered who runs the painters (Garreth's own Mac, by hand)
and produced `docs/CAROUSEL-RENDERER-PORT-SPEC.md`: the exact layout numbers,
image-selection rules and status handshake the in-app painter must reproduce.
It also corrected the plan in one place: generated Glow Up rows are written as
`queued`, not `ready`, because the old painter picks up `ready` rows and would
overwrite the app's slides.

Then Garreth widened the scope, and the plan was restructured around the full
pipeline: a studio at the front where a reference or an idea becomes a new
carousel template on a sandbox canvas with AI help, the batch generation in
the middle, and at the back the wiring of an approved new content type into
Supabase so the scheduler, poster and inventory can see it. The two live lanes
enter the pipeline in the middle as the first imported templates. Phase 1 is
now flows and designs, finalised and signed off, with nothing built. The
Covered Eye Aug 13 batch finding is parked at Garreth's instruction. Nothing
else in this repo changed.

---

## 2026-09-13 — Claude Design now has the dashboard's components

**Garreth's go-ahead, 2026-09-13.** This is the second step, which the entry
below left for later. Claude Design already had the colours, type and spacing;
now it has the building blocks too, so designs made there use the dashboard's
real cards, buttons and pills instead of lookalikes.

### What was added to Claude Design

Twenty components, carried over from `src/components/ui/`:

- **Cards:** `Card` and `DashCard`, the section card every page is built from.
- **Buttons:** `CtaButton`, `HoldButton`, `Button` (secondary and ghost), `ExtendButton` and `SortButton`.
- **Pills and filters:** `StatusPill`, `FilterPills` and `FilterChips`.
- **Forms:** `SearchInput`, `Dropdown` and `Stepper`.
- **Feedback:** `Tooltip`, `StaleNotice` and the loading skeletons.
- **Data:** `BarcodeBar`.
- **Identity:** `Avatar`, the atom mark, the TikTok and Instagram glyphs, and
  `Icon` with all 65 of the app's icons.

Each one comes with a description of its options and a short usage note that
carries the dashboard's rules, such as one `CtaButton` per screen and no warning
text above a `HoldButton`. There are also eight preview cards showing them.

Claude Design can't run Tailwind or the app's Next.js code, so each component
was rewritten as plain React with its styles gathered into one stylesheet.

### Where the copies differ from the app

- **`CtaButton` has no moving shine.** In the app, a streak of light follows the
  pointer around the button, drawn in WebGL. Here the rim brightens on hover.
  Colours, shape and size match.
- **`Button` is new as a named component.** In the app, secondary and ghost
  buttons are written out as class strings wherever they are used. Here they
  follow the recipe in `docs/DESIGN-TOKENS.md` under one name.
- **Controls work on their own.** `FilterPills`, `SearchInput`, `Stepper` and
  `Dropdown` keep their own state when nothing is wired to them, so they can be
  clicked in a mock.
- **Left out on purpose:** `SectionStub`, which is temporary scaffolding, and
  `SideRays`, the login-screen decoration.

### In the repo: `scripts/claude-design/` grew

- `static/components/` holds the rewritten components.
- `build.mjs` now generates the icons, the atom mark and the platform glyphs
  straight from the app's source files. That was prompted by a mistake: the
  first attempt copied the logo's shape data by hand, it came out wrong, and it
  was thrown away before anything was uploaded.
- `verify.mjs` now also checks the components, and `build.mjs --preview` makes
  the component cards viewable locally before an upload.

**A new upkeep cost.** The components are copies. When one changes in
`src/components/ui/`, its copy in `scripts/claude-design/static/components/` has
to be updated by hand, and nothing flags it if that is forgotten. The icons and
marks are the exception, because they are regenerated on every build.

**Nothing the dashboard renders changed.**

**How far this was checked.**

- `verify.mjs` passes. All 80 token values still match. The components contain
  no raw colours or pixel values, every style class and icon name they use
  exists, and the logo and platform shapes match the app exactly.
- The code checker (lint) is clean.
- Every component card was rendered in Chrome and looked at, including a hold
  button, an open dropdown and an avatar falling back after its photo failed to
  load.
- All 72 files uploaded.

**Not yet confirmed:** that Claude Design has picked the components up. It
builds its own list of components itself, and straight after the upload that
list was still empty. Opening the project should show a Components section. If
it doesn't, that is the first thing to look at.

---

## 2026-09-13 — The design system now has a copy in Claude Design

**Garreth's decision, 2026-09-13.** Design work is moving to a loop: plan in
Claude Code, design in Claude Design (claude.ai/design), then build it back here.
Claude Design can only design things that match the dashboard once it knows
what the dashboard looks like, so step one was loading the design system into it.
Garreth scoped it to **the design system only, with no page designs yet.**

### What was set up in Claude Design

A new project, **Peptide Miracles Dashboard**, now holds:

- every colour and material value (glass, glow, shadow) in dark and light mode,
  plus the type ramp, spacing and radius;
- the same General Sans font file the app uses;
- 11 preview cards: surfaces and text, accent, semantic colours, status pills,
  chart colours, glass and glow, cards and shadow, type ramp, numbers, spacing,
  and radius;
- a guide covering the rules no colour value can hold: cyan about once per
  screen, no instruction text, TikTok is cyan and Instagram is blue, and 24
  outside, 16 inside, pill for anything you click.

Components are not in it yet. Carrying them over is a separate, later step,
because each one has to be rewritten without Tailwind before Claude Design can use it.

### New in the repo: `scripts/claude-design/`

The scripts that built that copy, saved so the next token change can be sent
without rebuilding them from scratch. `build.mjs` reads `globals.css` directly,
so no value is retyped. `verify.mjs` fails and names the problem if anything in
the copy disagrees with the app. The folder's `README.md` has the three re-send
steps. The build output goes to `dist/`, which git ignores.

`globals.css` is still the source of truth. Claude Design is a copy of it, the
same as `docs/design-system.html` and `docs/DESIGN-TOKENS.md`. The difference is
that `npm test` does not check the Claude Design copy. It gets checked by
`verify.mjs` each time it is re-sent.

**Nothing the dashboard renders changed.**

**How far this was checked.** Before uploading, `verify.mjs` confirmed that all
40 dark and 40 light values match `globals.css`. Every preview card was
screenshotted, and three were fixed. The radius samples all looked like circles.
The numbers card compared two columns that looked identical, because General
Sans already draws its digits at equal width. The third card had spare empty
space. After uploading, the project's file list showed all 22 files, and the
colour file read back intact. The scripts were then run again from their new
place in the repo; they pass and produce files identical to what was uploaded.
**Not yet done:** looking at the cards inside Claude Design's own Design System
tab. The screenshots were taken locally.

---

## 2026-09-12 — Charts are documented, and their last two hardcoded colours are gone

**From the design-system handover.** Charts were the one part of the dashboard
the design system said nothing about, and they were also the last place a colour
was written by hand instead of coming from a token.

### The bug: two colours that could not follow the theme

The chart gridline and the line that follows your pointer across a chart were
written as **white**, directly in the code, in both `analytics-charts.tsx` and
`account-analytics-view.tsx` — four places in total.

White is invisible on a white page. In light mode the grid and the hover line
were effectively not there. Everything else in those files already used tokens,
so this was the only bit that could not follow the theme.

They are now two tokens, `--chart-grid` and `--chart-cursor`, with a dark value
and a light one. Garreth picked the names.

**How far this was checked.** The running dashboard was opened in the browser in
**dark mode** and the charts are unchanged, as expected — the dark values are the
same numbers that were hardcoded, so nothing moved. The **light** values were
checked on `docs/design-system.html`, which carries the identical token block
(the parity test fails if it does not), and there the grid and the hover line are
clearly visible on the pale ground. What has *not* been done is opening the real
dashboard in light mode; headless screenshots of it would not complete. The
mechanism is the same one every other chart colour already uses, so the risk is
low — but it is a desk check, not a live one, and worth thirty seconds of
eyeballing next time the app is open in light mode.

This is **the only change in this entry that the running dashboard renders.**
Everything below is documentation.

### Charts are written down now

A new **Chart** section in `docs/design-system.html` and a matching **§6** in
`docs/DESIGN-TOKENS.md`. The rules were all already in the code; none of them
were anywhere else, so a new chart had to be written by reading the old one.

The one that matters most: **the series colour is the platform.** Cyan is always
TikTok, blue is always Instagram, on every chart on every page. That is why you
can glance at a chart and know which line is which without reading the legend,
and it is why a new chart must not pick its colours for contrast or variety.

Also written down: the dashed grid and matching hover line, the gradient fills,
why the bar chart uses one colour for every bar, why the y-axis labels are pushed
right out to the card edge, and why a sparkline with only one data point draws
nothing at all.

**One divergence is recorded rather than fixed.** The original 2026-09-07 design
notes asked for dotted grids and *no* area fills. The charts that shipped have
dashed grids and do have fills. Since that is what has been on screen for weeks,
the code is treated as the intent and the old note as the stale half. Nothing
about any chart's appearance was changed.

### Three more components documented, two ruled out

`Avatar`, `PeptideMark` and the TikTok / Instagram glyphs now appear in both
documents. The note worth reading is on `Avatar`: it falls back to a drawn
silhouette when the image **fails to load**, not only when there is no image at
all — the platforms hand out photo links that expire after a day or two, and
without that the dashboard would show a browser broken-image icon and look like
it was the thing that was broken.

`SectionStub` and `SideRays` are now explicitly recorded as **not** part of the
design system — one is scaffolding for pages not yet built, the other is
decoration on the login screen — so their absence reads as a decision rather
than an oversight.

### Figma is untouched

It stayed frozen. The two new tokens exist in the repo and not in Figma, and the
`114` on its cover is correct for Figma's own variables and stays as it is. That
gap is now written down in the tokens document, so the next person does not read
it as a mistake.

---

## 2026-09-12 — Figma is frozen; the design system lives in the repo now

**Garreth's decision.** No more design work goes into Figma. From here, the HTML
page and the tokens document are the only places the design system is updated.

### Why this is a good thing

Figma was the one copy nothing could check. The HTML page and the tokens
document are both read by a test that fails if any value drifts from
`globals.css` — Figma is not, and cannot be. It was already slightly wrong in
two ways (one weight light in three places, and a token count on its cover that
is now out of date), and neither showed up as a failure because nothing was
watching.

So the practical effect of freezing it is that **every surface still being
maintained is now covered by the test.** There is no unguarded copy left.

### What the Figma file is now

A dated snapshot — 114 variables, both themes, 6 effect styles, 10 text styles
and 9 components, as of today. Good for moving things around by hand or showing
someone the system without running anything. Not good for looking up a value;
use the HTML page or the tokens document for that.

Nine components that are documented on the HTML page were never built in Figma.
That gap is now permanent by choice rather than an outstanding task, and it is
written down as such.

Nothing in the running dashboard changed.

---

## 2026-09-12 — Icons, tooltip and dropdown added; token count corrected

**From Garreth, after asking what was still missing.**

### Put back what the redesign dropped

The visual rewrite earlier today lost the **Icons** section — the one that says
the icons are Phosphor at fill weight, always inheriting their row's colour, and
that four glyphs are exceptions because filling them changes what they mean
rather than how they look. That was a regression on my part, not a decision. It
is back, and now shows the set, the three sizes, and the four exceptions drawn
the way the code actually draws them.

**Tooltip and Dropdown** were also missing. Both are now on the page and both
are real Figma components.

### The token count was wrong in three places

The page, the tokens document and the Figma cover all still said **111 tokens**.
The real number is **114** — two more colours were added when the amber notice
ground needed a token of its own. The page and the document are corrected. The
number printed on the Figma cover still says 111 and has to be changed by hand,
because that text is General Sans and the automation cannot write it.

### Where things are

The page now has nine sections; Icon sits with the other foundations after Type,
so everything below it shifted by one. Figma gained a sixth board, **Icon &
Overlay**.

Nothing in the running dashboard changed.

---

## 2026-09-12 — Empty and Working states added to the design system

**From Garreth: design the two states the system was missing, show them first,
then add them.** Approved as shown.

These are the two states the Carousel Generator needs on day one and the design
system did not cover.

### Empty is three states, not one

Treating "nothing here" as a single thing is the usual mistake. Each of these
needs a different way out:

- **First run** — nothing created yet. Carries the screen's one accent action.
- **No results** — a filter matched nothing. It shows the filters back to you
  and offers to clear them.
- **All clear** — nothing to report, and that is good news. No action at all.

None of them explains what to do; the button label carries the verb.

### Working is not the same as loading

Loading fetches something that already exists. Generating makes something that
does not, and it can take a minute. Four versions:

- **Starting** — a sweeping bar, because there is no honest percentage yet.
- **Progress** — named steps, a timer, and "3 of 5".
- **Running long** — the bar turns amber and it says plainly what has stalled
  *and when it last moved*.
- **Slides** — once the count is known, seven boxes filling in as each lands.

The third one is the point. This project has been bitten before by work that
reported success and did nothing, and a spinner that turns forever is exactly
how that hides. Telling an operator when something last moved is the difference
between catching a stall in thirty seconds and catching it the next day.

### Where they are

Both are in `docs/design-system.html` under a new **State** section, which also
gathers the loading and degraded states that were previously filed under Data.
Both are also Figma component sets. One new colour token was added for the
amber notice ground.

Nothing in the running dashboard changed.

---

## 2026-09-12 — The Figma design system is on General Sans

**From Garreth: he installed General Sans in Figma and applied it by hand.**

All 188 pieces of text on the Design System page now use the real typeface —
the same one the dashboard itself uses. Nothing is left on the temporary
stand-in.

### Why this had to be done by hand

The automated connection to Figma can only see Google Fonts — 1,938 of them,
and no fonts installed on the Mac. So it could *display* General Sans but never
*apply* it. This is worth remembering: any future font change in Figma is a
manual job, not something that can be scripted from here.

### One rough edge, left as-is by decision

Changing a typeface in Figma resets every weight to Regular, which flattened
the whole type hierarchy. Most of it was rebuilt, but three things ended up one
weight lighter than the app uses:

- card titles
- control labels (pills, buttons, chips)
- the rule lines and the big figures on the cover

Garreth decided not to chase the last pass, which is fine — it is cosmetic, it
only affects the reference boards, and no component or colour token is touched.
`globals.css` is still the authority on weight, and the difference is now
written down in `docs/DESIGN-TOKENS.md` so nobody later assumes Figma and the
code agree on it.

### Also worth knowing

Applying the font by hand broke the link between the text styles and the
font-family variable. That variable still holds the right value but no longer
controls anything, so the "change one value to switch the whole library" trick
no longer works. Not worth rebuilding for ten styles.

---

## 2026-09-12 — The design system got redesigned, and the Figma font question got a real answer

**From Garreth, reviewing the first version: make it look like an
award-winning design system, and cut the text — he wants it visual.**

Fair criticism, and a pointed one. The first version printed the rule *"no
instruction text on a screen"* on a page that was itself mostly paragraphs.

### What changed

Both the HTML page and the Figma boards were rebuilt around the same idea:
**the tokens are the content, not the captions.**

- **Prose is gone.** The explanatory paragraphs under every component were
  deleted. What is left is the component itself plus one line of the actual
  code you would copy.
- **The twelve rules are now twelve single lines** in large type, instead of
  twelve paragraphs. "Glass needs glow." "Every number is tabular."
- **Colour is shown as large blocks** in an uneven mosaic — the accent gets a
  big tile, the status colours get a row — rather than small chips with
  captions underneath.
- **Everything got bolder**: an oversized cover, outlined section numbers,
  hairline column guides, tiny uppercase mono labels, and the ambient glow used
  as an actual design element rather than as background.
- The HTML page also gained a section index, scroll-in animation, and
  a hover lift on the colour tiles. All of it switches off under the system's
  reduce-motion setting.

Explanation now lives only in `docs/DESIGN-TOKENS.md`, which is where a written
reference belongs.

### The font, answered properly

Garreth installed General Sans in Figma, so the substitution should have been
removable. **It could not be, and the reason is worth recording.**

The Figma connection this project drives can see 1,938 font families and every
single one is a Google Font. It has no access to fonts installed on the Mac. So
General Sans is genuinely available in Garreth's Figma, but not to the
automation — trying to use it fails outright with "the font family General Sans
does not exist".

**This is a ten-second fix on Garreth's side**, and only because of a decision
made in the first pass: the font is wired through a single variable rather than
set on each piece of text. Open Variables → Typography → `font-family/sans`,
change the value to "General Sans", and all ten text styles follow at once. The
instruction is written into the variable itself in Figma.

### Nothing was lost in the rebuild

The four component sets and the dialog were moved out before the old boards
were deleted, then moved back into the new ones. All 111 variables, 6 effect
styles and 10 text styles are untouched. The token parity test still passes
(87 tests), and typecheck and lint are clean.

---

## 2026-09-12 — The design system is written down, in three places that check each other

**From Garreth: before the Carousel Generator gets built, capture the look the
dashboard already has, so the new screens inherit it instead of inventing a
second one.**

Nothing about the running dashboard changed. This is documentation plus one new
test.

### What now exists

- **`docs/design-system.html`** — a page you can open by double-clicking. It
  shows every colour, text size, surface and control the dashboard uses, and
  next to each one the actual code that builds it. It has the same dark/light
  switch the app has, so you can see what light mode does to each piece.
- **`docs/DESIGN-TOKENS.md`** — the same information written out, with the
  reasoning behind each decision and a section at the end on what the Carousel
  Generator should reuse.
- **The Figma file** — the *Design System* page of `Peptide Miracles App` now
  holds the real thing: 111 variables across five collections, with Dark and
  Light as switchable modes, 6 effect styles, 10 text styles, and four
  components (status pill, button, card, input) plus a dialog. Changing the
  Color collection from Dark to Light repaints all of it, the same way the app
  does.

### The part that stops this going stale

The values now live in four places, and copies drift. So
**`src/lib/design-tokens.test.ts`** reads `globals.css`, the HTML page and the
markdown, and fails if any value disagrees. Changing a colour in `globals.css`
and forgetting to update the other two now breaks `npm test` and names the
token that drifted. Verified by deliberately changing one colour by a single
digit and watching the test catch it.

Figma is the exception — no test can reach it. When a token changes, the Figma
variable has to be updated by hand.

### Two things worth knowing

- **Figma does not have General Sans.** It is a Fontshare font and Figma's
  renderer does not carry it, which shows up as text getting cut off rather
  than as an error. The Figma library uses Plus Jakarta Sans instead, which is
  the closest available. It is wired through a single variable, so if General
  Sans ever gets installed for Figma, switching the whole library over is one
  change rather than a pass over every piece of text.
- **Nothing was overwritten.** The *Design System* page was empty, and the
  *Individual Accounts Page* was left exactly as it was.

### Still only in the HTML, not in Figma

The segmented filter control, sort button, filter chip, stepper, table layout,
progress bar, loading skeleton, stale-data notice, tooltip and sidebar row.
They are drawn and documented on the HTML page; they just are not Figma
components yet.

---

## 2026-09-12 (later) — Profile 73 was in the database all along, just blank

**From Garreth: a new account, Profile 73, belongs to Character 5 but was
nowhere on the Accounts page.**

### What was actually wrong

Profile 73 was never missing. Its row had been sitting in the database since
30 August, created the moment the phone was provisioned — but every field that
makes an account real was still empty: no TikTok handle, no character, no
created-on date, and the active flag switched off.

That last one is what hid it. The Accounts page shows active accounts by default
and tucks the rest behind **Show retired**, so Profile 73 was on screen only for
anyone who turned that toggle on — and when it did appear it read as a nameless
row with a dash where the character should be.

The blanks were not a mistake. Profile 73 was set up as a phone-number-only
account, meaning the phone and proxy were provisioned automatically but the
TikTok account itself had to be created by hand afterwards. Nothing ever went
back to fill in the handle once it existed.

### What was filled in

- **Handle `sophie.davis83`**, taken from the GLP sheet and checked against
  live TikTok — the account is real, public, and has never posted.
- **Created 31 August**, read from TikTok's own record of when the account was
  opened (14:41 UTC). That puts it in the same signup batch as Profile 71
  (14:31) and Profile 72 (14:36), and it matters because the age ramp counts
  from this date.
- **Character 5**, per Garreth. The GLP sheet still says Character 3, which is
  stale — the same sheet also still has Profiles 70 and 72 on their old
  characters after the 10 September reassignment. The account's own bio,
  *"Forgotten remedies, remembered"*, is the Cleora voice.
- **Health cleared.** The row was carrying a `banned` verdict stamped on
  1 September by the twice-weekly detector, which had judged an account with
  zero posts and zero data. A false positive of exactly the kind seen before.
  The live health view had it right all along at "no data".

### Posting is deliberately still paused

Profile 73 now appears on the Accounts page under Character 5 and the warmup
scheduler can pick it up — warmup runs on paused accounts, which is how
Profiles 64, 65, 70 and 72 warmed up through their own paused spell earlier
this month.

But it is **not** in the posting scheduler yet, on purpose. In its first twelve
days Profile 73 ran no warmup sessions at all, while its four Character 5
siblings ran between 24 and 30 each. Posting from an account that cold is how
accounts get flagged. Unpause it from the dashboard once warmup has run for a
few days.

Confirmed live: Profile 73 resolves to the same caps as Profiles 70 and 72 —
1 post a day, 1 GLP a day, held there by the age ramp until 16 September — and
returns nothing from the live scheduler view while it stays paused.

No code changed. This was a database fix.

---

## 2026-09-12 — The cadence editor now says which character is blocking a save

**From Garreth, after Character 5's second content lane (Cleora ASMR) went live:
the Adjust cadence window would not save anything, for any character, and
nothing on screen said why.**

### The problem

Every character has a weekly allowance for its main content, divided between its
content lanes. The editor refuses to save when a character's lanes do not add up
to its allowance — a sensible rule, and not what went wrong.

Cleora ASMR was switched on directly in the database on the 11th, as part of
getting the new content ready. Its 7 posts a week immediately started counting
toward Character 5's total, making 14, while Character 5's allowance still read 7
— because raising the allowance was the step still outstanding. The sums stopped
matching and the editor locked.

It locked **everything**. The Save button on the Fleet tab checks every character
before it will save anything, so a problem that existed only on Character 5 also
stopped cadence changes for Characters 2, 3 and 4, and stopped the fleet-wide
settings being changed at all. Confirmed live: Characters 2, 3 and 4 all read
11 of 11; only Character 5 was off, at 14 of 7.

Finding that out was the real cost. The screen offered a greyed-out Save button,
a small "needs attention" badge on the Advanced settings row, and a tooltip on
the dead button — none of which named the character. Locating it meant opening
Advanced settings and reading down all four characters looking for the
mismatched pair.

### What changed

A red banner now appears at the top of the Adjust cadence window whenever this
happens, naming the character and both numbers: *"Character 5's lanes add up to
14 a week, but its allowance is 7. Nothing can be saved until the two match."*

- On the **Fleet tab** it lists every character at fault, each as a button that
  jumps straight to that character's tab — because the fix is always on a
  character tab, never on the one where the locked button appears.
- On a **character tab** it offers a one-click **"Set allowance to 14"**, which
  moves the allowance up to whatever the lanes already add up to and leaves the
  lane split alone. (Typing the number into the allowance stepper instead
  re-spreads the lanes evenly, which would turn a deliberate 10 + 4 into 7 + 7.)
- When the daily cap is what's really in the way, it says so instead of offering
  a button that cannot work: *"An allowance of 14 a week needs at least 2 posts a
  day — 1 a day allows only 7. Raise Max posts / day above first."* This was its
  own dead end: at 1 post a day the allowance stepper simply stopped at 7 with
  nothing explaining why.
- The tooltip on the disabled Save button now names the character too.

No rules changed. Nothing can be saved that could not be saved before — the
banner only says who and where, turning a hunt into a few seconds.

### Also: two smaller things in the same window

**Lane names now read as names.** The GLP mix under Advanced settings labelled
each lane by its database handle with the underscores swapped for spaces, so the
new lane read "cleora asmr" and its sibling read "cleora". They now use the name
the registry already stores for them — **Cleora ASMR** and **Cleora (Animated)**.
All 25 lanes in the registry carry one, checked live; the code still falls back to
the handle, because the column is nullable.

**The GLP stepper now says why it has stopped.** The weekly numbers are bounded
by what the daily cap allows — 2 posts a day is 14 a week — so raising GLP past
that does nothing until the daily cap moves first. The + button simply went dead,
with nothing on screen explaining it. Garreth hit this taking Character 5 from 7
a week to 14: at 1 post a day the ceiling was 7, and the order of the two edits
was undiscoverable. A small note now appears beside the field whenever the button
is dead — *"max for 1 post/day"* — naming the field to change.

It stays quiet in the two cases where it would be wrong or useless: when the
70-a-week hard limit is the binding one instead (the daily cap is not to blame
there), and when the field is inheriting the fleet value, where there is no
stepper and no dead button to explain.

### One thing tidied while in there

`"cadence-data"`, the cache key for the cadence payload, was written out as a
literal in four separate files — including the two routes that must expire it
after a save. It is now a single exported `CADENCE_TAG`, the same treatment
`ACCOUNTS_TAG` already had and for the same reason: renaming it in one place and
not the others would leave the editor showing the old lane mix after a save that
had already gone through. Nobody had hit that; it was one rename away.

The tag is also bumped to `cadence-data-v2`, because lanes gained a name field
and a cached copy written by the previous version has no such field — the lane
steppers would have rendered with blank labels for up to a minute after deploy.

### Why this will keep happening

Every new content lane arrives the same way: the content gets made, the lane is
wired up and switched on in the database, and the character's allowance is
raised afterwards — sometimes days later, sometimes by someone else. The gap is
unavoidable because the two changes happen in different places. Cleora ASMR is
simply the first time anyone noticed the side effect.

### Verified

The banner's logic is a tested function (`unbalancedCharacters` in
`cadence-rules.ts`, seven cases) rather than inline screen code, following the
same reasoning as the 2026-09-09 review's #6: every cadence-validation bug that
review found was unreachable by a test while it sat inside the screen. The cases
include the real 09-11 lockout, both directions of mismatch, and the rule that a
character tab never points at a different character's problem.

The banner itself has not yet been seen against a live failure, because the
underlying data was corrected the same day (see below). It can be reached
deliberately: open the Char 5 tab and click "Use fleet default" on GLP, which
sets the allowance to 11 against lanes of 14.

### Separately, in the database, not the repo

Character 5's cadence was set to **14 GLP a week, 2 posts a day, filler 0** on
Garreth's instruction — the step the content handover had left outstanding, and
the one that unlocked the editor. Written through the same database function the
dashboard's own save uses, with a matching audit-log entry.

Worth knowing: this does **not** double Character 5's output immediately. The age
ramp caps GLP at 1 a day for accounts aged 16–22 whatever the daily cap says, so
2 a day starts on 2026-09-13 for Profiles 64 and 65, and 2026-09-23 for Profiles
70 and 72. Output steps 4/day → 6/day → 8/day.

Then, on Garreth spotting that Character 5's budget had converged on the fleet's
- both now 14 posts a week at 2 a day, differing only in the split (14 GLP + 0
filler against 11 + 3) — the daily-cap override was **cleared back to inherit**.
An override row holding a number identical to the fleet's is not harmless: it
silently pins that character against future fleet changes, so raising the fleet
to 3 a day would have moved Characters 2, 3 and 4 and quietly left Character 5
at 2. Only GLP (14) and filler (0) stay overridden now.

Confirmed live: every resolved number is unchanged — 2 a day on Profiles 64/65,
1 on the younger 70/72, 14 a week, no filler, same window and gap — and a
read-only simulation of a fleet move to 3 a day now resolves to 3 for all four
characters, Character 5 included.

## 2026-09-12 (later) — Proxy swaps ring the bell, and read state that would not stick

**From Garreth: "I want the bell notification for swaps, so that other person is
notified for a change in the system by one person." And: "Sometimes, I open the
app, read the notification, then if I reopen again, it is still being marked as
unread."**

### Added: a bell notification when someone swaps a proxy

Replacing a proxy now posts to the bell — "Profile 61 moved to a new proxy",
with the old and new IP and who did it, linking to /proxies. The operator who
made the change already had the on-screen confirmation; this is for everyone
else, who would otherwise find an account on a different IP with no explanation.

It never fails the swap: the notification insert swallows its own errors, and
the `dashboard_audit_log` row is the durable record either way. Confirmed live
by writing a real row, checking how the bell renders it, and deleting it again.

### Fixed: the bell would have relabelled a proxy swap as a retirement

Every stored notification was run through the Post-Ban wording, because until
today every stored notification *was* a Post-Ban one. A proxy swap would have
arrived in the bell titled "Profile 61 retired". Only `retire` rows are
re-worded now; everything else carries the copy it was written with.

### Fixed: a read notification coming back unread

Two real causes, both found in the code and both fixed. Being straight about
this: **neither is proven to be the one Garreth hit**, because the stored
notifications all have their read rows intact and there are no recomputed alerts
firing right now to test against.

**The warmup alert's identity included the accounts in it.** The id carried a
hash of the failing profiles, so any change to that set — one account
recovering, one more starting to fail — produced a different id, and an alert
already read came back unread. Read state is now recorded per account behind the
alert: the group counts as read once every account in it has been seen, so a
shrinking cohort stays read and only a genuinely new failing account reopens it.
That is the behaviour the original design wanted; keying it on the whole cohort
just also re-alerted on the way down.

**A failed save was completely silent.** The dot cleared on click, the write
went off, and a failure was swallowed on the reasoning that the next load would
show it unread again — "the safe direction to be wrong in". It is, but it is
also indistinguishable from this exact complaint, and nothing anywhere recorded
that it happened. A failed save now puts the dot straight back while the row is
still on screen, and logs the reason.

**A third possibility, not a bug:** read state is per person, by design. Of the
six allowlisted emails only one has ever recorded a read. Signing in as a
different address shows that address's read state, which is correct behaviour
but would look identical to the fault.

### Also: the bell's item type was declared twice

`topbar.tsx` kept its own copy of the notification interface rather than
importing the one the endpoint actually returns. That is how a field added on
the server (`markKeys`) could quietly not exist on the client. It now imports
the real type — `import type`, so nothing from the server module reaches the
browser bundle.

## 2026-09-12 — Replace proxy, and three proxies GeeLark never listed

**From Garreth, auditing ten proxy names on proxy-cheap: "check in GeeLark and
in our accounts proxy table in the dashboard if all are matched. Maybe there
was some proxies that got updated in GeeLark but not in our dashboard." The
audit found a mismatch, and then: "can we replace proxies inside our dashboard
app using API on GeeLark?"**

### Fixed: three live accounts were on proxies missing from GeeLark's library

Profiles 8, 28 and 29 were running on proxies that existed nowhere in GeeLark's
Proxy tab. Nothing was broken — all three are live proxy-cheap subscriptions —
but any audit that reads the proxy library came up short, and that is how the
gap stayed invisible.

The cause is that GeeLark accepts a proxy two ways: picked from the library, or
typed straight onto the profile. Its `phone/detail/update` schema takes either a
`proxyId` or an inline `proxyConfig`. The phone list API then returns the
resolved host, port and password **either way, with no proxyId**, so the two are
indistinguishable after the fact. The only tell is whether that endpoint also
appears in the library.

All three were added to the library (`proxy/add`, 2026-09-12). Confirmed live:
the library went 46 → 49, no phone assignment changed, and every phone proxy is
now in the library.

### Added: a Replace proxy button on each proxies row

Sits to the right of Extend. It offers only **spare** subscriptions — ones
proxy-cheap is billing for that no phone is using — and swaps the phone onto the
chosen one via GeeLark.

Decisions worth recording:

- **Picked by id, not typed.** The browser never sees a proxy password; the
  server resolves credentials from proxy-cheap at the moment of the write. A
  free-text host/port field would have invited a typo into a live account's
  network config and could not tell that an IP was already on another phone.
- **Always via the library.** It adds to the library first, then attaches by id
  — never an inline config. That is the exact drift above, and doing it this way
  means it cannot recur.
- **Two phones on one IP is a hard stop**, not a warning. GeeLark allows it;
  this refuses it, because one residential IP behind two accounts is the most
  legible cross-account pattern a platform can see.
- **Held, not clicked.** A swap changes the account's public IP immediately, so
  it gets the same press-and-hold gate as a retire. Retired accounts are refused
  outright, matching the pause route. (A banner spelling out the IP consequence
  shipped first and was removed the same day on Garreth's call — every operator
  here already knows it, so it was clutter on every open. The hold is now the
  only gate.)
- Every swap writes old → new into `dashboard_audit_log`, which also restores
  the proxy history that `proxy_audit_log` stopped recording on 2026-08-31.

### Added: paste credentials, because proxy-cheap's names cannot be fetched

**Garreth: "can the choices be proxy names in proxy cheap? That would be easier
for the people who will replace the proxy."** They can't, and it is worth
recording why so nobody spends another afternoon on it.

proxy-cheap's API has no name field on any response, and it is read-only —
`OPTIONS` on a proxy answers `allow: GET`. The names in their panel are produced
by their own web UI and are not data we can reach.

The obvious workaround was to derive them: the names look like purchase order,
so with two confirmed names the rest should follow. Garreth confirmed two
(`82.47.5.7` is Proxy 56, `216.133.189.97` is Proxy 83) and the idea died on
the numbers. There are 21 active proxies between those two but 27 names —
**six expired proxies hold slots in the sequence and are invisible to the API.**
Extrapolating puts `216.133.189.97` at Proxy 77 when it is really Proxy 83. Any
name computed that way would be confidently wrong, which is worse than no name.

So the dialog now has two tabs, on Garreth's suggestion:

- **Choose from list** — the picker, listing IP, ISP, expiry and days left.
- **Paste credentials** — an `IP:PORT:USERNAME:PASSWORD` box, the exact string
  the SOP already has people copy out of proxy-cheap into GeeLark. Whoever is
  looking at "Proxy 56" on that screen copies its line straight across; no
  translating a name into an IP. It is also the only route for a proxy bought
  somewhere other than proxy-cheap.

The paste box reads back what it understood — host, port and username, never the
password — because the failure that matters is a line that parses cleanly but is
the *wrong proxy*, and only seeing the host can catch that.

Two rounds of wording, both Garreth's: the picker tab was "Choose a spare" until
he pointed out that **"spare" reads as second-hand** — someone who has just
bought a proxy would not think to look for it there. And the sentence above the
paste box explaining where to copy the line from is gone, along with the longer
validation message and the "no spare proxies" empty state.

**That second one is a standing rule from here on: new screens do not stack
instructions on the operator.** The format lives in the placeholder, where it is
needed and where it disappears once typing starts; the explanation lives in the
code comment and in this file, where the next person maintaining it will look.
The people using these screens already know the job.

One parser serves both the dialog and the server, in `proxy-paste.ts`, with
tests. It was briefly two, which is the shape that eventually accepts something
in the browser the server then refuses. The tests cover the cases that would do
real damage: a password containing a colon (kept, not truncated), and a port
like `4e4` or `41802abc` that a looser check would turn into a number and
silently attach to the wrong port.

### The dialog now says which half failed, and in plain English

**Garreth: "if bad proxy, wrong credentials, it should tell the user in the app
... I think the user should be notified that the add succeeds but the phone
update fails. Because the reason why the user wants to replace the proxy is to
update the phone's proxy right?"** Exactly right, and the first version did not
do that.

A replace is two calls to GeeLark, and they fail differently:

- **The proxy check.** GeeLark connects to the proxy before it will accept it.
  A dead endpoint or a mistyped password fails here — *before the phone is
  touched* — and the account keeps the working proxy it already had.
- **Attaching it to the phone.** The proxy passed its check, so this reads like
  success. But the phone is the entire reason anyone opened the dialog, and if
  this fails the account has not moved.

Until now both came out as one red line reading `geelark code 45004: check proxy
failed` — GeeLark's own words, written for whoever built the API, and with no
way to tell the two apart. Now the dialog says which stage failed and what the
phone is actually on:

- Check failed → the reason, then "Nothing was changed."
- Attach failed → the reason, then "Profile 61 was not moved. Still on
  48.47.121.64:46478."

That second line is **read back from GeeLark at the moment of the failure**,
not assumed. A timeout can land after GeeLark has already applied the change,
and telling someone their swap failed when it worked is its own kind of outage —
so if the re-read shows the new proxy did land, it is reported as the success it
was.

The codes are translated rather than shown raw. 45004 becomes "GeeLark could not
connect to that proxy. Check the credentials, or the proxy may be down."
Confirmed live 2026-09-12 against both a real proxy with a wrong password and an
endpoint that does not exist; both produce 45004, both now read in plain English,
and the proxy library was untouched by either attempt.

On success the dialog closes and a green line appears above the table naming the
move — "Profile 61 moved from 48.47.121.64:46478 to 82.47.5.7:41802" — and the
row itself re-reads GeeLark live, so the IP, expiry and auto-renew columns all
update without a manual refresh. There is no bell notification: the action is
synchronous, so the result is on screen within a second or two. Every swap is
still written to `dashboard_audit_log` either way.

### The documentation was wrong about duplicate proxies

GeeLark's docs say adding a proxy that already exists returns the same id. It
does not. Verified live 2026-09-12: it answers `code: 0, msg: "success"` at the
envelope with `successAmount: 0` and a per-item `45007 "proxy already exists"`,
and **no id at all**.

Trusting the documented behaviour would have failed every swap onto a spare that
was already in the library — which is most of them. `addProxyToLibrary` now
resolves a 45007 by looking the endpoint up instead. The wider lesson is in the
shape of that response: the envelope reports success while the only item in it
failed, so any per-item result from this API must be read from `failDetails`,
never from `code`.

Also confirmed live: GeeLark connectivity-tests a proxy before adding it and
rejects an unreachable one with `45004`, so a dead proxy can never be attached.

**Not yet exercised:** `phone/detail/update` — the step that actually moves a
phone — has not been run, because the only way to test it is to change a live
account's IP. Everything up to it is verified end-to-end.

### Also

`geelark-phones` and `proxycheap-proxies` became exported constants
(`GEELARK_PHONES_TAG`, `PROXYCHEAP_PROXIES_TAG`) for the same reason
`ACCOUNTS_TAG` already was: a write route that hard-codes a cache key drifts
silently the day the key is renamed, and the table would then show the old proxy
after a successful swap.

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

**CI runs on every push and pull request**: typecheck, lint, tests and a real
build.

**It earned its place on the very first run**, by failing. `npm run typecheck`
passed on every machine here and failed in CI, because some of the types this
app uses are *generated* by Next when it builds — and a fresh checkout has never
built, so they did not exist yet. Nobody would have found that by hand; it only
appears on a machine that starts from nothing, which is exactly what CI is. The
typecheck now generates those types first, and the whole sequence was re-run
from a genuinely empty state to confirm.

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
