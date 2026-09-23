# Phone farm (Physical) — design and build tickets

**Status:** opened 2026-09-18 (Garreth). **20 tickets: B1 to B7 are already
built; P1 to P13 are to design and then build, and none of those is started.**
**Each P ticket covers both halves** (Garreth, 2026-09-19): the screen is
designed, he approves it, and then it is built in the app, all under the one
ticket. The matching PF ticket in `BACKLOG.md` is the build half's detail (the
tables, the n8n changes, the done-when).
Ticket names are written as plain tasks (Garreth, 2026-09-19), so this file
and his own to-do list use the same words. The names do not say "design and
build"; every P ticket is both, as set out below. As of 2026-09-19: P1 to P6 were the first pass, and P7 to P13 were added
the next day when Garreth asked whether six really covered everything in the
backlog. They did not; see "How these map to the backlog" below.

**Why this exists.** The phone-farm development tickets (PF-01 to PF-20 in
`BACKLOG.md`) were written without a design step. That was fine for the
plumbing, but the daily manual work is a screen a person lives in: Yurie posts
by hand and logs what she did, from an iPhone, every day. Garreth asked on
2026-09-18 whether a design existed for that; none did. These tickets are that
design, and **inside each ticket the build does not start until the design is
approved**; in particular PF-04's log form and PF-07 are not built until the
designs in P1 to P3 are approved.

Everything here lives on the **Physical** side of the app (the phone icon at
the top right). The Cloud screens are not touched.

Companion documents: `REAL-PHONE-MASTERPLAN.md` (why, and the plan of record),
`PHONE-FARM-TOOLING.md`, and the PF tickets in `BACKLOG.md` (what gets built).

## Decisions these tickets start from (Garreth, 2026-09-18 and 09-19)

1. **The to-do list is grouped by device, then by account inside each device.**
   Yurie works phone by phone: pick up a phone, do everything on it, put it
   down.
2. **Warmup is manual at first and scripted later, so each account has a
   Manual / Automated warmup switch.**
   - *Manual:* the account's warmups appear on the to-do list, and there is a
     form to log one.
   - *Automated:* the warmup script on the MacBook Air does the warmup and logs
     it itself (PF-13). Nothing is added to the to-do list for that account.
   - **Two warmup sessions a day per account** (Garreth, 2026-09-19).
   - *When a warmup counts as done:* Manual, when the minutes logged reach the
     session's target; Automated, when the script has finished its run.
3. **The to-do list is shared, not per person.** Anyone signed in sees the same
   list and the same status for every item. It is the state of the work, not
   one person's checklist.
4. **The to-do list is also on the dashboard (home) page,** at the upper right,
   where the Devices card is today. ~~Automation is removed from the Physical
   dashboard.~~ **Reversed 2026-09-22:** Automation stays, on the dashboard and
   in the menu, because plenty still runs by robot for real phones; it is the
   **Devices card** that leaves the dashboard instead. The right column is
   To-do over Inventory, and Automation sits below the hero beside Proxies and
   the incident feed (2026-09-22). Only the Posting Agent drops out of
   Automation on the Physical side, since posting is by hand.
5. **An unfinished item carries over to tomorrow** (2026-09-19). It does not
   close as missed at midnight. **Except a failed post** (Garreth,
   2026-09-22): "failed posts should be dumped." Failed is the end of it — not
   handed out again, not carried over.
6. **Paused accounts are hidden from the to-do list** (2026-09-19).
7. **A post can be marked Posted without its link, and the link added later,**
   but the item must show which it is: **fully done**, or **posted and still
   waiting for its link** (2026-09-19).

## Already built (2026-09-18)

Major design changes that were built straight into the app, before this design
step existed. Each was looked at in the running app; none has had a design
review, which is what P13 is for. All are on `main`, merged 2026-09-18 in
pull request #7. Small refinements (the empty state filling the page, the
wider switch, the page rename, removing the refresh button) are left out on
purpose; the changelog has them.

| # | Task | Status |
|---|---|---|
| B1 | Add the Cloud / Physical switch at the top right and make the app show one fleet at a time | **Done.** Garreth confirmed the switch works |
| B2 | Build the Settings page for moving accounts between Cloud and Physical | **Done.** No account has actually been moved yet |
| B3 | Build the Devices page: phone list, Add phone form, and a page per phone | **Done.** No phone has been registered yet |
| B4 | Replace the Geelark wallet with a Devices card on the Physical dashboard | **Done.** Only seen empty |
| B5 | Give each fleet its own numbers: Accounts, posting limits, Analytics, Inventory, Proxies & numbers, Incidents | **Done.** Analytics proven by query; Inventory's numbers unproven until accounts are unpaused |
| B6 | Add Facebook as a third platform on the account screens | **Done.** FB filter always offered in Physical, plus a Facebook tab on Analytics, since 2026-09-19 (it was hidden until a Facebook account existed). No Facebook account exists yet to see it with, and Facebook views are not collected |
| B7 | Create one shared empty state for every empty list | **Done** |

## To design and build

| # | Task | Status |
|---|---|---|
| P1 | Put To-do on the Physical dashboard, above Inventory | **Approved 2026-09-22, and REAL since PF-07** the same day: the card reads live deliveries and warmups. `?todo=` still draws the placeholder states for review |
| P2 | Add the To-do today page, grouped by device and then by account | **Approved 2026-09-22, and REAL since PF-07** the same day. `?todo=` still draws the placeholder states for review |
| P3 | Add the Posted, Failed and Log warmup forms | **Approved 2026-09-22.** Built inside P2; the six states around a save that can fail moved to PF-07. **Log warmup is live since PF-04** and **Posted / Failed since PF-07** (both 2026-09-22); the six saving states P3 handed over are built |
| P4 | Add a Manual / Automated warmup switch per account, and a by-phone view on Accounts | **Approved 2026-09-22, and the switch now SAVES** — PF-04 landed the same day. The by-phone view still needs PF-02's real phones to have groups. What an Automated account SHOWS moved to PF-13 |
| P5 | Rework the device page around the phone's daily work | **Approved and built 2026-09-22.** Warmup history is real since PF-04. **One gap, found 2026-09-22: "Today on this phone" is still demo-only** — `device-detail.tsx` reads `demo?.today ?? null`, so a real phone always shows "Nothing due" however many deliveries it has. PF-05 and PF-07 built the tables and the To-do page but nobody rewired this page to them. Small follow-on, not a redesign |
| P6 | Track proxy expiry for real phones on Proxies & numbers | **Approved and built 2026-09-23.** One row per real phone, its accounts, proxy and numbers. Joins proven live with a test phone, since deleted. **Numbers moved from the phone to each account the same day (P14, Garreth)**; the numbers view is now one line per account |
| P7 | Add the before-and-after comparison for moved accounts | Not started |
| P8 | Add the checklist for a ban on a real phone | **Approved and built 2026-09-23** (PF-11). The app releases queued posts itself; the proxy is kept while other accounts use it (Garreth). Proven live with a practice phone, since deleted. `/todo?todo=ban` and `/accounts?demo=1` still draw the sample states |
| P9 | Add the Live view page and link to it from the dashboard | Not started |
| P10 | Move accounts onto phones in one step, and several at once | **APPROVED 2026-09-22** (dark + light, desktop + phone), after five rounds of feedback — the last removed the three-accounts-per-phone limit outright. Settings → Account management: the single move picks the phone in the dialog that flips the fleet, and a Select mode adds the batch. Building is PF-03 then PF-15 |
| P11 | Show hand-made posts on the calendar, and prepare the app for retiring Cloud | Not started |
| P12 | Add the day's-work reminder, overdue items, and bell items that name their fleet | **Built 2026-09-23.** The email was dropped for a bell notification (Garreth), and PF-12's two items are built and live. The fleet label landed the same day with PF-20 — the bell shows both fleets and names which. The stale row is **approved and built 2026-09-23**: a red Overdue pill on the bell's 24-hour rule (Garreth). Not yet seen with a real post |
| P13 | Review and fix everything already built (B1 to B7) at desktop and phone width, in dark then light mode | **Reviewed 2026-09-23** (`docs/P13-REVIEW-FINDINGS.md`). **Six items approved and done the same day:** five fixed (not-found pages, the Physical calendar's short pills, "Infinity days", the WebGL crash, the Facebook tab's range choices) and "No phones yet" found to be correct already. The colour, size and tap-target findings wait for their own approval |
| P14 | Put an account's settings behind a ⋯ menu on its row, with Edit account and Retire account | **Approved and built 2026-09-23.** Live on every Physical row; Cloud unchanged (proven by screenshot). Phone numbers now belong to accounts |

Each of these has its full ticket further down. **A ticket moves through four
steps, and its Status line says which it is at:** not started → designed,
waiting for review → approved, building → built. "Built" means what the
changelog means by it: it compiled, it was looked at in the running app, and
what could not be checked is said.

## How these map to the backlog

Every phone-farm ticket in `BACKLOG.md` that puts something on a screen, and
the design ticket that covers it:

| Backlog ticket | What it shows on screen | Design ticket |
|---|---|---|
| PF-01 Cloud / Physical, moving an account | The top-right switch, Settings → Account management | B1, B2 (built); review in P13 |
| PF-02 Devices | Devices list, Add phone, the device page, the dashboard card | B3, B4 (built); P5; review in P13 |
| PF-03 Move to phone | Moving an account onto a phone in one step | P10 |
| PF-04 Warmup log | Log form, warmup mode, warmup history | P3, P4, P5 |
| PF-05 Deliveries table | nothing (data only) | — |
| PF-06 Posting Agent fork | nothing (n8n) | — |
| PF-07 Posting To-Do | The to-do list, on the dashboard and as a page | P1, P2, P3 (all approved 2026-09-22; PF-07 also inherits P3's six saving states) |
| PF-08 Facebook | Facebook on the account screens | B6 (built); review in P13 |
| PF-09 Health + incidents read both sources | nothing new (same screens, more data) | — |
| PF-10 Comparison view | Before and after the move, per account | P7 |
| PF-11 Post-ban for manual accounts | The checklist | P8 |
| PF-12 Day's work + stale-post alert | The two bell items (built 2026-09-22), and the Overdue pill on the to-do list (built 2026-09-23) | P12 |
| PF-13 Script write path | nothing (data only); what it logs shows in P4, P5 | — |
| PF-14 Live view | The page on the Air, and the link to it | P9 |
| PF-15 Batch moves | Moving several accounts at once | P10 |
| PF-16 Retire Geelark | What the app looks like with Cloud gone | P11 |
| PF-17 Analytics per fleet | same screen, one fleet at a time | B5 (built); review in P13 |
| PF-18 Inventory per fleet | same screen, one fleet at a time | B5 (built); review in P13 |
| PF-19 Calendar per fleet | How a hand-made post shows on the calendar | P11 |
| PF-20 Incidents and the bell per fleet | The fleet shown on a bell item | P12 |

## How the tickets are ordered

By the path a person takes through a working day, the same rule the Carousel
Generator tickets follow:

1. The page you land on (the Physical dashboard).
2. The main job from there: working through today's list.
3. Recording what happened to each item.
4. Setting how each account is warmed.
5. The phone's own page.
6. What sits behind the phones (proxies and numbers).
7. The less-than-daily screens, in the order they will be needed: comparing
   before and after (P7), a ban (P8), live view (P9), moving accounts in bulk
   (P10), the calendar and life after Cloud (P11), reminders and the bell
   (P12).
8. Last, a review of what was already built without a design step (P13).

## Rules for every ticket

The Carousel Generator's rules apply (`CAROUSEL-GENERATOR-DESIGN-TICKETS.md`,
"Rules for every ticket"), with one change of emphasis:

- **Phone first.** Design 390 wide before 1440. These screens are used
  standing up, with a farm phone in the other hand. Large tap targets, nothing
  that needs a hover, and the most common action reachable with a thumb.
- **Placeholder data only.** Invented phones ("iPhone 1", "iPhone 2"),
  characters as "Character 2", invented handles, plausible made-up numbers. No
  live accounts, posts or captions.
- **Dark first.** Light mode once the dark version is approved.
- **Existing components.** The shared empty state, status pills, the hold
  button, cards, the bottom sheet the Add phone form already uses.
- **One accent button per screen.** On these screens that is the next thing to
  do, such as Posted.
- **No instruction text.** Formats go in placeholders.
- **The app names nobody.** No "done by" on screen, even though the list is
  shared. The status says what happened ("Posted 10:42", "Failed"); who did it
  lives in the audit log only.
- **Numbers use tabular figures.**
- **Empty lists fill the space below them** (Garreth, 2026-09-19). A page
  whose list is empty shows the shared empty state in a card that reaches the
  bottom of the screen, message centred, never a short card floating over a
  blank page. Built into the app the same day (`empty-state.tsx`), so a new
  screen gets it by using that component. Small cards on the dashboard use the
  compact version, because the dashboard grid sets their height.
- **Review P1's design before anything else is designed or built,** because
  P1 decides the dashboard layout and the look of a to-do item that every later
  screen reuses.
- **Design uses placeholder data; the build uses live data.** The made-up
  phones and numbers are for judging the layout only and never reach the app.
- **The repo's rules apply to the whole ticket:** a changelog entry as it
  lands, database changes added beside what exists rather than altering it,
  and an honest note of what was and was not checked. **These tickets are
  drawn in the running app, so their design half changes the app and is
  written up like any other change** (Garreth, 2026-09-22). The only work that
  gets no changelog entry is the Carousel Generator design screens under
  `docs/designs/`, which touch nothing in the app.

---

## P1. Put To-do on the Physical dashboard, above Inventory

- **Status:** **approved (Garreth, 2026-09-22)**, after thirteen rounds of his
  feedback recorded below. Drawn in the running
  app rather than on a canvas (Garreth's choice that day): the card and the new
  dashboard layout are real screens behind placeholder data, so what is
  approved is the screen itself and nothing drifts on the way to the build.
  **Because of that, approval closes the design AND most of the build: the
  screen is in the app and on `main`.** What is left is the data behind it —
  the card shows invented phones and tasks until PF-05 and PF-07 exist.
  **Light mode approved the same day** on the strength of what the tokens
  already give it: it was not designed separately, it was looked at, and
  Garreth took it as it stands.
  The placeholder list lives in `src/lib/data/todo-placeholder.ts` and the card
  in `src/components/dashboard/todo-today-card.tsx`; `?todo=work|done|empty|`
  `noPhones|phoneOff` on the dashboard picks which state draws. ~~Both files go
  when PF-07 makes the list real.~~ **Kept (2026-09-22).** They turned out to
  be the review harness rather than a stopgap: `?todo=` and `?demo=` are how a
  screen is judged in states live data will not produce on demand, and P10
  leans on the same invented phones. They go when the designs stop being
  reviewed, not when the tables arrive.
- **Decided in this pass, for Garreth to accept or change:**
  - **Round two, 2026-09-22 (Garreth's feedback):** the card is titled **To-do**,
    and **every phone is one collapsed line until it is opened**. Six phones'
    worth of items made the corner of the homepage a wall of text; the card's
    job there is to say how the day stands, not to lay the day out. Opening a
    phone shows its accounts and items. **An item is ticked off from the card**
    as well as from the page, the same tick and the same sheet.
  - **Round three, 2026-09-22 (Garreth's feedback):** ticks are **cyan**, not
    green, on both screens, and a phone finished for the day carries a cyan
    tick in place of its phone icon. The yellow square stays for a post that is
    done but still owes its link, because that is not a tick. The account line
    on the card is **the handle and its platform only** — the character is on
    the account's own screens and was a third thing to read on every line.
    Each phone sits in **its own quiet container**, so an opened phone reads as
    one block. The time and the task name are **two left-aligned columns** with
    room between them, and the task list sits further below its account line.
  - **Round four, 2026-09-22 (Garreth's feedback):** every leading mark on the
    card — the phone icon, the platform mark and the tick — is the same 24px
    gutter, so the phone name, the handle and the times all start at the same
    x, with more air between the three levels.
  - **Round eleven, 2026-09-22 (Garreth's feedback):** the Inventory card's
    empty state **fills the card**, so "Total to produce" is pinned to the
    bottom edge whether there is demand to list or not. And on the Physical
    dashboard the Proxies & numbers card puts its **Proxies / Phone numbers
    switch on its own line under the card's name** — in a third of a row it has
    no room beside it. `DashCard` grew a `toolbarBelow` option for that; Cloud
    passes nothing and is unchanged.
  - **Round ten, 2026-09-22 (Garreth's feedback):** Automation moves out of
    the right column and down into the row below the hero, **beside Proxies &
    numbers and the incident feed, three across**. It is something you check
    on, not something you work from. The hero's right column is then **To-do
    over Inventory**, and Accounts widens beside it. Physical keeps that
    three-card row at every width, since with only two cards beside Accounts
    the hero has no third column to fold them into.
  - **Round nine, 2026-09-22 (Garreth's feedback) — the Automation decision
    reversed.** Decision 4 said Automation came off the Physical dashboard.
    It stays, and it is **the Devices card that gives up its place**: the right
    column is now **To-do, Automation, Inventory**. Plenty still runs by robot
    for real phones — the Smart Scheduler, the Warmup Scheduler, the pollers
    and the alarms — and that has to stay in sight; the phones have their own
    page in the menu, so the dashboard need not list them too. **Automation
    also stays in the Physical menu.** The one workflow left out of both the
    card and the Automation page on the Physical side is the **Posting Agent**,
    because Yurie posts by hand.
    *For PF-06:* its fork will write the Physical to-do rows rather than call
    Geelark, so when that lands, decide whether the forked workflow earns its
    place back on these screens under its own name.
  - **Round five, 2026-09-22 (Garreth's feedback):** the collapsed phone row
    shows **the count only** — no "1 to add" warning. A link still owed shows
    as the yellow box on its own row once the phone is opened, and that is
    enough. **Extended in round fourteen:** no warning line still, but the
    phone's own icon becomes a **yellow link** when an account on it owes
    one, exactly as on the To-do page. The icon was already carrying a cyan
    tick for a finished phone, so it was the natural place for this too.
  - **To-do today comes first on a phone, above Accounts.** It is the reason
    the app was opened. On a desktop the eye starts left, so Accounts keeps the
    lead there and To-do heads the right column.
  - **A finished phone collapses to one line** with a tick and its count.
  - **The card scrolls** rather than capping how many phones it lists. With
    every phone collapsed (round two) the whole fleet fits without scrolling
    at all.
  - **Carried over is said quietly** — "· from yesterday" in muted text beside
    the item, not a warning pill. It carries over for three days as a matter of
    course, so day one should not look like a fault.
  - **The two Posted states are told apart by a "Link needed" pill** on the
    item and a "1 link to add" line under the phone's block.
  - **When everything is done** the collapsed lines are followed by a quiet
    "All done for today", because two ticked lines over an empty card read as
    half-finished rather than finished.
  - **A phone switched off keeps its block** and carries an "Off" pill; its
    work is still owed.
  - ~~Items are not completed from this card.~~ **Superseded 2026-09-22:** they
    are, by the same tick as on the page.
- **You get here from:** signing in with the fleet switch on Physical, or
  pressing Dashboard in the menu.
- **Becomes:** the home page in Physical only. Cloud's home page does not
  change.
- **Design:**
  - **Left, as today:** the Accounts card (Physical accounts only).
  - **Right column, top to bottom:** **To-do today**, then **Devices**, then
    **Inventory**. No Automation card.
  - **Below the hero, as today:** Proxies & numbers, Incident feed, Top posts.
  - **To-do today card:** a compact version of P2. One block per device with
    the phone's name and how much is left ("3 of 7 done"); under it the
    accounts on that phone, each with its open items as short rows (post or
    warmup, the time it is due, its status). **View all** goes to the full
    page (P2). Items are not completed from the card on a desktop; on a phone,
    tapping an item opens it in P2.
  - How many devices the card shows before it scrolls, and whether finished
    devices collapse to one line.
- **States:**
  - Nothing due today (the shared empty state).
  - Everything done for today.
  - One device finished, others not.
  - An item carried over from yesterday. Unfinished items carry over
    (decision 5), so the card needs a way to show "from yesterday" without
    shouting.
  - A phone that is switched off but still holds accounts with items.
  - No phones registered yet.
  - Phone width: the right column stacks under Accounts; decide whether To-do
    today goes **above** Accounts on a phone, since it is the reason Yurie
    opened the app.
- **Done when:** the dashboard layout and the look of one device block, one
  account group and one item are approved in dark mode at both sizes.
  Then built in the app to match, and looked at in the running app at both
  sizes.

## P2. Add the To-do today page, grouped by device and then by account

- **Status:** **approved (Garreth, 2026-09-22)**, at the same time as P1 and
  after the same thirteen rounds. Drawn in the running
  app alongside P1, at Garreth's request, so both can be given feedback
  together. As with P1, the screen itself is built and on `main`; what is left
  is the real data (PF-05, PF-07, and PF-04 for the warmup items) and the
  freshness behaviour left to the build. **Light mode approved the same day**,
  as P1: looked at rather than designed, and taken as it stands. The page is `/todo` (`src/app/(dashboard)/todo/page.tsx` and
  `src/components/dashboard/todo-view.tsx`), Physical only, with a **To-do**
  menu item second in the Physical menu. `?todo=work|done|empty|noPhones|`
  `phoneOff|stress` picks the state and `?day=tomorrow` the day. The controls
  on an item are drawn but inert: Posted, Failed, Add link and Log warmup are
  P3's sheets.
- **Decided in this pass, for Garreth to accept or change:**
  - **Round two, 2026-09-22 (Garreth's feedback):** the page is titled
    **To-do**; the Today / Tomorrow switch is gone, replaced by **"Today" with
    an arrow either side**, so any day can be stepped to — back to a day that
    was missed as much as forward to the load coming. And **ticking an item is
    the action**: the tick opens a sheet that asks what happened, instead of a
    row of Posted / Failed / Log warmup buttons. Download video and Copy
    caption stay on the row, because they are what you need *before* you go
    and post.
  - **Round four, 2026-09-22 (Garreth's feedback):** each phone on the page
    **folds away like the card's**, but **open by default**, because this page
    is the work and the card is only a summary of it. The row of phone pills is
    a **dropdown that takes more than one phone at a time** ("All phones" by
    default) — two phones side by side on the desk is the ordinary case, and
    six pills never fitted a phone screen. ~~**"n links to add" moved to the
    far end** of the filter row, away from the phone picker, since it is a
    different question.~~ **Superseded by round ten:** the filter is gone and
    the phone itself carries the mark. The post and warmup marks are **one circle of one
    size**, no longer stretched to the row. **Download video and Copy caption
    sit at the right-hand end** of their row.
  - **Round five, 2026-09-22 (Garreth's feedback):** each account carries **a
    general picture of its day** beside its handle — "Posts 1 of 2" and
    "Warmup done" — so the account can be read without reading every row.
    ~~The status and the two fetch buttons are **one group on the row's centre
    line**; the pill used to ride the first line of text while the buttons
    were centred against a two-line block.~~ **Superseded by round twelve:**
    they are not a group at all — the status moved up beside the name and only
    the buttons are left at the right-hand end. And **an automated warmup is now a list
    item like any other**, with an **Automated** label beside its name (a
    robot badge since round thirteen) and a dashed box nobody can tick — which also means a script that has stopped
    running shows up as an item that never completes, instead of as silence.
    This replaces the quiet "Warmup: automated · last ran 09:14" line that P4
    asked for, on both screens.
  - **Round six, 2026-09-22 (Garreth's feedback):** the phone's model sits
    **beside its name** rather than under it; **each account has its own quiet
    panel** inside the phone's card, so two accounts on one phone do not run
    together; the day label sits **closer to its two arrows**; and the phone
    header shows **the count only** here too — a link still owed is the yellow
    box on its row and, since round ten, a yellow link icon in place of the
    phone's own icon.
  - **Round seven, 2026-09-22 (Garreth's feedback), phone width:** a task is
    **four columns** — the tick, the mark, the time it is due, and then
    everything about the task itself (its name, its detail, its status, its
    buttons) stacked in one left-aligned column, rather than strung out beside
    the name. Each of the first three sits in the row's 36px first band so they
    line up with the name. An account's verdict pills **flow left with the
    handle** on a phone. Once there is room the last column opens back out
    into a row and the status and buttons return to the right-hand end — room
    measured on **the phone's own card** since round nine, not on the window,
    because in Grid that card is only a third of the page wide.
  - **Round eight, 2026-09-22 (Garreth's feedback):** the account's own line —
    handle, character and its two verdict pills — has room above and below it
    before the divider its tasks start under, at every width and on every
    phone's card.
  - **Round nine, 2026-09-22 (Garreth's request):** the page offers **two
    views**. **List** is what the
    page already was — one phone per full-width row — and stays the default.
    **Grid** stands the phones side by side as cards, three across on a wide
    screen and two on a smaller one, for the morning look at how the whole
    farm stands rather than working down it. The switch uses **the same two
    symbols as the Carousel Generator's render screen** (D5's Grid / Rows), at
    Garreth's instruction, so one control means one thing across the app; it
    is the app's existing segmented pill, which gained an optional icon for
    this. It **is not shown below `md:`**: a phone has no room for a second
    column, so the switch would change nothing there. A phone's card now sizes
    its own contents against **its own width** (a container query) instead of
    the window's, which is what lets the same card read correctly full-width
    and at a third of the page; in a narrow column a task's rows stack exactly
    as they do on a phone. Still to judge: whether an uneven bottom edge —
    cards are as tall as their work, not stretched to match — is right, and
    whether Grid should also be reachable on a phone.
  - **Round ten, 2026-09-22 (Garreth's feedback):** three changes to the top
    of the page.
    - **The day arrows are 28px**, the height of the Grid / List pills, so the
      page's two switches read as one weight of control. Their tap area stays
      44px, invisibly.
    - **The "n links to add" filter is gone.** A phone with an account owing a
      link now shows **a yellow mark where its phone icon goes** (a dot at
      first; a link icon from round eleven), on the same
      principle as the cyan tick a finished phone already carries: the phone
      that needs going back to points at itself, instead of a control at the
      top of the page offering to find it. The yellow box on the item's own
      row is unchanged, and the dot cannot clash with the tick — an item
      without its link is not counted done, so a phone is never both.
    - **The Grid / List switch takes the filter's place**, at the far end of
      the filter row. The day arrows are alone on the title row again.
  - **Round eleven, 2026-09-22 (Garreth's feedback):** three fixes found by
    looking at the built screen.
    - **The status and the two fetch buttons sit on the row's centre line**,
      not on the first line of a two-line task. This is what round five asked
      for and never actually got: the group was pinned to the row's first
      36px band, so beside a task carrying a "Due yesterday" line it rode
      high. Measured: both the task block and the group now share one centre.
      (Round twelve then moved the status out of that group; the buttons
      still centre.)
    - **In Grid the two fetch buttons share one full-width line**, half each,
      instead of stacking one above the other and making every card taller.
      Half of that column is 79px and "Download video" needs 116px, so on a
      narrow card the label shortens to its noun — **Video** and **Caption** —
      with a download and a copy icon carrying the verb. At full width the
      buttons are untouched: their own width, their own words, no icon.
    - **The phone's link mark is a yellow link icon**, not a plain dot, so it
      says what is owed rather than only that something is.
  - **Round twelve, 2026-09-22 (Garreth's feedback):** two more.
    - **A task's status is said beside its name**, in the place the
      **Automated** badge already holds — Link needed, Failed, Skipped — and
      no longer at the far right of the row. What happened to a task is part
      of reading the task. **And a failed post turns its own mark red**: the
      circle beside the tick that says whether the item is a post or a
      warmup. The right-hand end of a row is now only the two things you
      fetch before going to post.
    - **On a narrow card the two fetch buttons fill the WHOLE row**, edge to
      edge, not just the column beside the name. The row wraps and they take
      a line of their own under it, which both makes them properly tappable
      and takes another step of height out of a Grid card. At full width
      nothing about them changed.
  - **Round fourteen, 2026-09-22 (Garreth):** **light mode approved** for both
    screens, taken as the tokens already render it rather than designed in its
    own pass. Both were looked at in the running app at 1440 and 390 before
    he took it. And the **dashboard card's phone icon now carries the yellow
    link** as well, so the card and the page say the same three things in the
    same place: a cyan tick when the phone is finished, a yellow link when an
    account on it owes one, the phone itself otherwise.
  - **Round thirteen, 2026-09-22 (Garreth's feedback):** the **Automated**
    label is now a **robot badge** rather than the word, on the To-do page and
    on the dashboard card alike. The word was as wide as some of the tasks it
    sat beside, and it is glanced at rather than read. The badge is one shared
    component (`AutomatedMark` in `todo-board.tsx`) so the two screens cannot
    drift apart. **Hovering it says "Automated task"** in the app's own
    tooltip, not the browser's. Nothing depends on that hover — these screens
    have to work from a phone, where there is none — it only spells out a
    badge already understood from its shape, and a screen reader is given the
    same words. On the dashboard card the tooltip sits to the LEFT of the
    badge: the phone blocks there clip what leaves them, and a centred
    tooltip lost its last word over the card's edge.
  - **Carried-over items sit above today's** inside their account. They are the
    oldest work and the only work with a deadline of its own, since an item
    stops carrying over after three days. The line reads "Due yesterday" or
    "Due 2 days ago".
  - ~~**Links still owed get a filter, not a section of their own** — a count
    you can press ("1 link to add") beside the phone filter.~~ **Superseded
    2026-09-22 (round ten):** no filter and no section — **the phone that owes
    a link says so itself**, with a yellow link icon where its phone icon
    goes. A second
    copy of the item elsewhere on the page would still be a second thing to
    keep straight, and now there is not even a control to press.
  - ~~One filled accent button on the whole page, on the next thing to do.~~
    **Superseded 2026-09-22:** with ticking as the action there are no outcome
    buttons on a row at all, so the only accent left on the page is Save inside
    the sheet.
  - **An item already posted without its link offers only "Add link"** —
    offering Posted and Failed again would be asking twice.
  - **A post that has already failed is not offered "Failed" again.** It keeps
    its reason ("Failed 12:26 · Upload kept spinning") and offers Posted, in
    case a retry by hand worked.
  - **A finished item stays for the rest of the day**, greyed, with its status
    pill and the time it was finished.
  - **A warmup logged short stays open** and says how far it got ("8 of 15 min
    logged"). A post whose video has not rendered says "Video not ready" and
    its Download is disabled.
  - **Tomorrow is the same page**, one press away, so the load can be seen
    without leaving the list.
  - **Controls are 40px tall** and nothing needs a hover.
- **Not yet drawn:** freshness (what it looks like when someone else finishes
  an item while you are looking at the page) is left to the build, since it is
  behaviour rather than layout.
- **You get here from:** View all on the dashboard card, or **To-do** in the
  Physical menu (a new menu item, Physical only).
- **Build tickets this unblocks:** PF-07 (and the list half of PF-04).
- **Design:**
  - **Grouped by device, then by account.** Device block: name, model, a
    progress count. Inside it, one group per account (up to three): platform
    icon, handle, character. Inside the account, its items for today in time
    order.
  - **Two kinds of item:**
    - *Post:* content type, due time, a thumbnail, **Download video**,
      **Copy caption**, then **Posted** (accent) and **Failed**.
    - *Warmup* (only for accounts set to Manual, see P4): **two sessions a day
      per account**, each its own item, with its due window and target
      minutes, and **Log warmup**. It is done when the minutes logged reach
      the target; a session logged short stays open and shows how far it got.
  - **Status on every item, the same for everyone who opens the page:** To do,
    **Posted · waiting for link**, **Posted** (fully done, link saved), Logged
    with the time, Failed with the reason, Skipped. The two Posted states must
    be easy to tell apart at a glance, and a device's progress count has to
    say which it is counting ("7 of 7 posted · 2 links to add"). A finished
    item stays on the page for the rest of the day, greyed, so anyone can see
    what happened.
  - **Freshness:** two people may have the page open. Decide how an item
    someone else just finished shows up (the list re-reading itself quietly is
    enough; no live cursor of who is where).
  - **Carried over:** an item not finished yesterday appears in today's list
    under its device and account, marked as carried over and showing the day
    it was due. Decide whether carried-over items sit above today's.
  - **Links still to add:** posts marked Posted without a link stay findable
    after the day ends, since nothing else will ask for them. ~~A filter or a
    short section of their own.~~ **Answered in round ten:** neither — the
    phone holding one wears a yellow link icon.
  - A way to look at **tomorrow**, so the load can be seen.
  - Filter by device, for someone holding one phone.
- **States:**
  - Nothing due today.
  - All done.
  - An account whose warmup is Automated: no warmup item, but decide whether
    the account group shows a quiet "Warmup: automated · last ran 09:14" line
    so a silent script is noticed here and not only on the health dot.
  - Items carried over from one day, and from several days.
  - A post that is Posted and waiting for its link; one whose link was added
    later.
  - A warmup logged short of its target.
  - A post whose video is missing or not ready (Download cannot work).
  - A very long caption, a very long handle, three accounts with six items
    each on one phone.
  - A paused account is hidden (decision 6): its items are not shown, and the
    device's progress count leaves them out. A phone whose accounts are all
    paused shows as having nothing to do.
- **Done when:** the page is approved in dark mode at phone and desktop width,
  with both item kinds and every state above.
  Then built in the app to match, and looked at in the running app at both
  sizes.

## P3. Add the Posted, Failed and Log warmup forms

- **Status:** **approved (Garreth, 2026-09-22)** — approved on the strength of
  a day of using it, since every tick on both screens opens it. Garreth asked
  for ticking an item to open a form, so the form had to exist for the tick to
  be judged. The three forms are **one sheet**, not three
  (`src/components/dashboard/todo-board.tsx`): ticking a post offers
  **Posted / It failed** — Posted takes an optional link with a one-tap Paste,
  It failed takes a reason from a short list plus a note; ticking a warmup
  takes minutes on a stepper that starts at the target, plus a note. A finished
  item's sheet shows when it was done and a **hold-to-undo**. Saving a post
  without its link leaves the item owing one, exactly as decision 7 says.
  **The saving states moved to PF-07** (Garreth, 2026-09-22), where they are
  written out in full as that ticket's done-when. Nothing can fail against
  placeholder data, so drawing them here would have invented behaviour the
  real save may contradict; they are decisions to take against a save that can
  actually go wrong.
- **You get here from:** the buttons on a to-do item (P2).
- **Build tickets this unblocks:** PF-07's Posted / Failed, PF-04's log form.
- **Design:** three small bottom sheets, in the style of Add phone.
  - **Posted:** one field, the post's link (placeholder shows the format),
    then save. **The link is optional** (decision 7): saving without it marks
    the item Posted · waiting for link, and the same sheet opens again later
    to add it. Pasting from the clipboard must be one tap, since the link was
    just copied in the TikTok / Instagram / Facebook app on the other phone.
  - **Failed:** pick a reason (a short fixed list plus Other with a note),
    then save. What happens to the content afterwards (back to the pool or
    not) is a build decision for PF-07; the design only needs the reasons.
  - **Log warmup:** minutes (a stepper that starts at the session's target),
    an optional note, then save. Minutes are what make a manual warmup done,
    so the sheet shows the target and what is already logged for that
    session. The same form is reachable from the device page (P5) and the
    account page, for a warmup done outside the list.
  - **Undo.** A wrong tap on Posted must be reversible for a while. A hold
    button, no warning text.
- **States:** ~~saving, saved, could not save (nothing was changed), a link
  that is clearly not a link, an item someone else finished while the sheet
  was open.~~ **Moved to PF-07 on 2026-09-22**, along with a sixth found in
  the build: **Paste did nothing**, because the one-tap Paste asks the browser
  for the clipboard and Safari can refuse, and it fails silently today.
- **Done when:** ~~the three sheets and their states are approved~~ **Met
  2026-09-22:** the three sheets are approved, built, and were looked at in
  the running app in dark and light at phone and desktop width. The states
  around saving are PF-07's.

## P4. Add a Manual / Automated warmup switch per account, and a by-phone view on Accounts

- **Status:** **approved (Garreth, 2026-09-22)**, light mode included — both
  views were looked at in dark and light, at 1440 and at 390, before he took
  it. What P4 owns is designed and built; what is left is not design but
  data: ~~**PF-04's warmup-mode column**, so a press saves~~ — **done
  2026-09-22, the press saves** — and **PF-02's real phones**, so the by-phone
  view stops needing `?demo=1`. The Accounts page in Physical now has both views and
  both switches: `src/components/dashboard/accounts-views.tsx` (the switcher),
  `accounts-by-phone.tsx` (the by-phone view) and `warmup-mode-switch.tsx`
  (the hand / robot pair). **`?demo=1`** on `/accounts` draws an invented farm
  — four phones, one of them off, and two accounts not yet on a phone — since
  no account has been moved to Physical yet and the real view is empty;
  without it the page reads live rows as it always has
  (`src/lib/data/accounts-phone-placeholder.ts`, ~~deleted when PF-02 and PF-04
  make this real~~ — kept; see P1). ~~**Nothing saves:** `accounts` has no
  warmup-mode column until PF-04, so a press moves the switch in the browser
  and forgets.~~
  **It saves since PF-04 (2026-09-22):** `accounts.warmup_mode` is live and a
  press writes to it. Re-checked 2026-09-22 — the column exists and holds 0
  accounts on `script`, because nothing is automated yet.
  **What an Automated account SHOWS in place of a log form moved to PF-13**
  (Garreth, 2026-09-22), to be designed and built with the warmup script
  itself: it cannot be drawn while what a scripted session IS remains
  undecided. With that gone, **everything P4 still owns is drawn** — what is
  left is ~~Garreth's review, light mode, and PF-04's column so a press saves~~
  **the by-phone view having real phones to group by** — the review, light mode
  and the saving column all landed 2026-09-22.
- **Where it lives — the Accounts page, in Physical (Garreth, 2026-09-22).**
  This answers the question the ticket used to leave open. The switch is a
  per-account setting, and Accounts is where per-account settings are read and
  changed; that page already carries a **Warmup** column and a per-row
  **Posting** pause, so a per-row Manual / Automated control belongs in the
  same row.
- **And the Accounts page gains two views (Garreth, 2026-09-22),** switched
  by the same control the To-do page uses. **The page takes two lines in
  Physical** (Garreth, 2026-09-22): the page's name and the view of it on the
  first, opposite each other; everything that narrows what is listed — the
  health pills, Filters, Show retired, the search and Select multiple
  profiles — on the second, arranged as Cloud's single row already arranges
  them. Cloud, having no phones and so no switch, keeps that single row on a
  desktop.
- **The page was simplified for a phone in the same pass (Garreth,
  2026-09-22), on BOTH fleets** — one page should not behave two ways at
  390px. Under `sm:`: the **health pills move inside Filters** (three more
  pills across the top left no room for the search), **Select multiple
  profiles becomes its icon**, beside the search it belongs with, and the
  order is **title, then search, then Filters and Show retired** — searching
  is what you came to do; filtering is a step you take afterwards. **Show
  retired sits at the far end of its row**, opposite Filters (Garreth,
  2026-09-22): a checkbox pressed against that button reads as part of it. Nothing
  above `sm:` changed, on either fleet.
  - **By account** — the table exactly as it is today, one row per account,
    the same as Cloud's. **This stays the default**, so nothing changes for
    anyone who is not thinking about phones.
  - **By phone** — the same accounts grouped under the phone they sit on,
    **each group keeping every column the flat list has** (Garreth,
    2026-09-22): it is the same table cut into blocks, not a summary of it, so
    grouping never sends you back to the other view to read something. The
    column widths are fixed in this view so the blocks line up with one
    another, over a minimum width so a phone scrolls each block sideways as it
    does the flat table rather than crushing eleven columns into 390px. This view carries a **phone-wide Manual / Automated switch**: one
    press sets every account on that phone. It replaces the bulk flip that this
    ticket used to put on the device page, and it is the view you use on the
    day the script is switched on for a phone.
  - **Physical only.** Cloud has no phones, so it never sees the switcher and
    its Accounts page is untouched — the same rule the rest of this work
    follows.
- **What the to-do list already decided.** P4 was written on the rule that an
  Automated account puts **nothing** on the to-do list. **P2's round five
  overturned that** (Garreth, 2026-09-22): an automated warmup appears as a
  list item like any other, with the robot badge and a dashed box nobody can
  tick, precisely so a script that has stopped shows up as an item that never
  completes rather than as silence. That is most of P4's hardest state solved
  already, and this ticket must be reconciled with it rather than designed as
  first written.
- **Build tickets this changes:** PF-04 gains a per-account setting
  (`manual` | `script`, default `manual`); PF-13 (the script's write path) is
  what an Automated account relies on.
- **Design:**
  - A two-way switch per account: **Manual / Automated**, on the **Accounts
    page in Physical**, in the row with that account's other settings — built
    into the **Warmup column**, beside how long since the last one, because
    they are one question. **Two icons and no words** (Garreth, 2026-09-22): a
    hand for the work a person does, the same robot the to-do list already
    uses for the work the script does. The days-since-warmup figure beside it
    has a fixed width, so **every switch in the column starts at the same x**
    instead of trailing however long that row's word is, and the Warmup column
    is wide enough for both the days and the switch so the switch keeps clear
    of Last Post beside it (Garreth, 2026-09-22). The words are in the hover tooltip —
    "Set to manual", "Set to automated" — and in what a screen reader is
    given. ~~Changing it is a hold, like moving an account between fleets.~~
    **Settled 2026-09-22 (Garreth): a single press, no hold.** The hold was
    borrowed from moving an account between fleets, which is a far heavier
    act; this one is undone by the press beside it.
  - ~~What an Automated account shows where a Manual one shows its log form:
    the two sessions for today, each done once the script has finished its
    run, with when it finished and how long it ran.~~ **Moved to PF-13 on
    2026-09-22** (Garreth), where it is written out in full: it waits on the
    warmup script, and a design drawn before the script exists would be a
    guess at what it does.
  - A way to set every account on one phone at once, for the day the script
    is switched on for that phone: the **phone-wide switch in the by-phone
    view** above — the same hand and robot, on the phone's own line. When its
    accounts disagree neither icon lights, because lighting one would be a lie
    about the rest, and the tooltip becomes **"Set all to manual" / "Set all
    to automated"** so the press says plainly that it is about to make them
    agree (Garreth, 2026-09-22). The device page (P5) still SHOWS which way each of its
    accounts is set, because that is how a phone's day is read, but the
    setting is changed on Accounts.
- **States:**
  - ~~Automated, script logging normally.~~ **PF-13.**
  - ~~Automated, but nothing logged for longer than expected.~~ **PF-13**, and
    note that P2 already shows a stopped script as a to-do item that never
    completes.
  - Manual with today's warmup done / not done — the Warmup column, which says
    how long since the last one.
  - ~~An account flipped back from Automated to Manual mid-day.~~ **PF-13.**
  - In the by-phone view: **a phone whose accounts are not all the same** —
    two Manual and one Automated — so the phone-wide switch has to show a
    third, in-between state rather than lying about one of them.
  - In the by-phone view: **an account not on a phone yet.** A Physical
    account that has not been put on a device has no group to sit in, and it
    must not simply vanish from the page.
- **Done when:** ~~the two views and their switcher, the per-account switch
  and the phone-wide switch are approved (no confirm on either — a single
  press, settled above), in dark and light at both widths.~~ **Met
  2026-09-22:** all of it approved, after being looked at in the running app
  in dark and light at 1440 and 390. ~~and the silent-script
  state~~ — that went to PF-13 with the rest of the Automated side.
  Then built in the app to match, and looked at in the running app at both
  sizes.

## P5. Rework the device page around the phone's daily work

- **Status:** **approved (Garreth, 2026-09-22)**, after three rounds of his
  feedback in one day, all recorded below. Drawn in the running app rather than
  on a canvas, the way P1 to P4 were, so what he approved is the screen itself
  and nothing drifts on the way to the build. **Approval closes the design AND
  the build: the screen is in the app.** What is left is the data behind it —
  PF-04, PF-05 and PF-07 — and two things that could not be checked from here
  (see "Checked" below).

  **Re-checked 2026-09-22, after PF-04/05/07 all landed.** Warmup history is
  real. The daily-work block is NOT: `device-detail.tsx` still reads
  `const today = demo?.today ?? null`, so it only ever draws from the invented
  phone and a real one falls through to "Nothing due" no matter how many posts
  and warmups it is owed. The tables and the To-do page it needs both exist
  now; nothing went back and joined them to this page. That is the whole
  remaining job here, and it is a wiring change rather than a design one.

  **Wired 2026-09-23.** Today on this phone reads `getTodoBoard()` from
  `todo.ts`, the To-do page's own reader, narrowed to this phone, so the two
  screens cannot disagree. It keeps the approved read-only pills. There are no
  ticks here. A failed read says "Couldn't read today's list" instead of
  "Nothing due". `?demo=` still draws the placeholder. Ban clean-ups (P8) are
  left off this block, because it has one line for each account still on the
  phone. *Verified live* with practice rows that have since been deleted:
  the phone's page matched the To-do page, a tick on the To-do page turned the
  pill cyan, a grey pill went to the right account, and an empty phone showed
  the full-card empty state. Checked at 1440 and 390, dark and light, in
  headless Chrome, not Safari.
  Drawn in the running app
  behind placeholder data, the way P1 to P4 were, so what is reviewed is the
  screen itself. The page is
  `src/app/(dashboard)/devices/[id]/page.tsx` and
  `src/components/dashboard/device-detail.tsx`; **`?demo=full|new|off`** on a
  phone's address draws the invented phone (a phone carrying three accounts,
  a phone registered this morning with none, a phone switched off that still
  owes its day). Without it the page reads live rows exactly as it always has
  and the three new blocks show their empty state — the same rule the Accounts
  page's by-phone view follows, because the data behind them is PF-04, PF-05
  and PF-07 and none of it exists yet. Nothing on the invented phone saves.
  The placeholder lives at the end of `src/lib/data/todo-placeholder.ts` and
  goes with the rest of that file.
- **Decided in this pass, for Garreth to accept or change:**
  - **The order is the phone's day, then the things set once.** Today on this
    phone, then Accounts and Warmup history side by side, then Details and the
    whoer.net proof. The page used to open on the registration form.
  - **Today on this phone is two pills per account, not a list** (Garreth,
    2026-09-22, three rounds in one day). Round one, on it being P2's own
    block, ticks and sheet included: "Why does it feel like the device page is
    a duplicate of the to do list page? ... the ability to mark an activity
    done should only be in the dashboard and the to do page." Round two, on
    the read-only version that still had a mark down one side: "This today on
    this phone should not be a checklist at all." Round three, on the
    done/still-to-do summary that replaced it: "we should simplify this.
    Remove the detailed list. And the posts and warmup pills on the right
    side, if that is done, make it cyan. If not done, make it a clickable gray
    pill that when clicked, the user will be led to the to do list page for
    that account."
    So each account is ONE line — platform, handle, character, and the two
    count pills. **Done is cyan and inert; not done is a grey pill that links
    to that account on the To-do page.** No item list, so nothing on this page
    says "Link needed" or "Failed" any more; the To-do page carries that.
    *How the link lands:* `todoAnchor()` in `todo-placeholder.ts` spells the
    id once, the To-do page's account panel carries it, and the pill links to
    it. The device placeholder's third account was renumbered a3 to a4 to
    match the same handle on the To-do page — two invented accounts sharing an
    id sent the link to the wrong one. Real account ids make that moot.
    *Verified:* all five grey pills drive to the right account's panel and
    scroll it into view (headless Chrome, 1440).
    *Consequence:* the block no longer shares a component with the To-do page,
    so the two can drift; the counts come from the same placeholder, which is
    what keeps them honest for now.
  - **Health is the app's own pill, not a bare dot.** The ticket says "health
    dot"; the app has no such thing and every other screen says the word on the
    health ladder's colour. Using the pill reuses what exists and the word is
    there to read. Worth a look at whether it is too loud on this page.
  - **"All phones" goes back with the tailed arrow.** Tried as a caret and
    put back (Garreth, 2026-09-22, round one): the app already splits the two
    marks cleanly, and changing this one alone would have broken it. A tailed
    arrow is every "back to the parent page" link — "All accounts",
    "Analytics", the way out of a forensics report, and this. A caret is the
    steppers: the calendar's previous month, the content-type carousel, the
    to-do day before. Leave that split alone.
  - **The warmup mode is shown, never set.** P4 settled that it changes on
    Accounts, so here it is the same hand and robot as a mark you read.
  - **Accounts does not repeat the day** (Garreth, 2026-09-22, round one).
    The row carried "Last post ... · Last warmup ..."; he had it removed. The
    block above already says how the day stands, so the account row is down to
    health and who warms it.
  - **Live view sits at the top right, where the In use switch was,** and is
    inert until PF-14 builds the page it opens on the MacBook Air. Drawn rather
    than left out so its place can be judged now.
  - **A registered phone with no accounts shows three empty states** — nothing
    due, no accounts, no warmups — rather than hiding the blocks. A phone that
    owes nothing is a fact worth seeing.
- **Not shown yet:** the proof card with a picture in it. The invented phone
  has no screenshot, and no real phone has been registered, so only the "No
  proof yet" half of that card could be looked at. The card itself is unchanged
  apart from where it now sits.
- **Checked:** the running app in dark mode at 390 and at 1440, in all three
  states, with no console errors, in **headless Chrome**. The five grey pills
  were driven and each lands on the right account's panel on the To-do page.
  **Not checked in Safari**, which is what Garreth uses, and **light mode was
  not reviewed** — P5's done-when asks for dark only, unlike P4, which he took
  with light included. Both are open against this screen even though the
  ticket is approved.
- **Left open on approval:** cyan now carries two meanings on this page —
  "this half of the day is finished" in the To-do block, and the `warming`
  health state in Accounts, which has used the accent since 2026-09-07.
  Garreth was told and approved anyway; changing "done" to green is a one-line
  change if it ever grates.
- **Design:**
  - **Today on this phone:** the same device block as P2, for this phone only.
  - **Accounts:** each with its warmup mode (P4), health dot, last post and
    last warmup.
  - **Warmup history:** recent sessions for this phone, manual and scripted
    told apart.
  - **Live view** link once PF-14 exists (it opens the page on the Air; it is
    not embedded).
  - Details, proof screenshot and the in-use switch move below the daily work,
    since they are set once.
- **States:** a new phone with no accounts, a full phone (3/3), a phone
  switched off, no proof screenshot yet.
- **Done when:** approved in dark mode at both sizes.
  Then built in the app to match, and looked at in the running app at both
  sizes.

## P6. Track proxy expiry for real phones on Proxies & numbers

- **Status:** **approved and built 2026-09-23.** A gap found on
  2026-09-18, not a request. Drawn in the running app at `/proxies?demo=1` on
  the Physical side. **Decided (Garreth, 2026-09-23): numbers are recorded on
  the phone**, not on each account. Checked the same day that accounts store
  no number of their own, so without this a number vanishes with its Geelark
  phone. **Round two (Garreth, 2026-09-23): list the accounts on the phone,
  not its characters**, because the accounts all share the phone's one
  proxy. The drawing is the Cloud page's two views with a phone on every row:
  no Replace proxy (a real phone's proxy is changed by hand in ShadowRocket),
  and a stacked block per phone at phone width. **Built the same day:** a
  Phone numbers box on the phone's form (one per line) and a new
  `devices.phone_numbers` column; the proxy matched to proxy-cheap and each
  number to TextVerified, proven live with a test phone that was then deleted.
  `?demo=1` still draws the sample phones. Left as it was: the homepage
  Proxies & numbers card in Physical still reads Geelark phones.
- **The problem:** Proxies & numbers is built from Geelark's phone list, so it
  follows an account's *Geelark* phone. A real phone's proxy is only a line of
  text on the device, and the page cannot see when it expires. Once an
  account's Geelark phone is deleted, its proxy and number appear nowhere, and
  an expiring proxy on a real phone would go unnoticed.
- **Design:** the Physical version of the page listing **devices** rather than
  Geelark profiles: the phone, its proxy matched to the proxy-cheap
  subscription (expiry, days left, auto-renew, Extend), and the numbers of the
  accounts on it. Whether a device should record its numbers at all is part of
  this ticket.
- **Done when:** the page and its "proxy expiring on a real phone" state are
  approved.
  Then built in the app to match, and looked at in the running app at both
  sizes.

## P7. Add the before-and-after comparison for moved accounts

- **Status:** not started.
- **Backlog:** PF-10. Garreth and Yurie read this at the week-6 review.
- **Design:** one moved account on one screen: views per post, the share of
  posts under 10 views, the warmup dot, restrictions and bans, each shown
  before and after the day it moved to a phone; beside it, the Cloud accounts
  of the same character over the same weeks. How to pick the account, and
  whether several accounts can be compared at once.
- **States:** an account moved less than a week ago (too little "after" to
  judge, and the screen must say so rather than draw a confident line); an
  account made fresh on a phone, with no "before" at all.
- **Done when:** one account's before and after can be read in a few seconds.
  Then built in the app to match, and looked at in the running app at both
  sizes.

## P8. Add the checklist for a ban on a real phone

- **Status:** **approved 2026-09-23 (Garreth), after three rounds of
  feedback, and built the same day (PF-11).** A real account's Retire now
  opens this dialog and the checklist is real; see the changelog. Drawn in the
  running app with sample data: the checklist at `/todo?todo=ban`, and the
  retire dialog from any Retire button on `/accounts?demo=1` in Physical.
  **Decided (Garreth, 2026-09-23):**
  - **The app releases the queued posts itself** at the moment of retiring,
    as the Cloud robot does. That is not a tick; the checklist says it as a
    fact ("3 queued posts back in the pool").
  - **Retiring the proxy is a switch in the retire dialog** (round three,
    Garreth: "what if that banned account is the last one that is using that
    proxy"). It is ON by default when the banned account was the last one on
    the phone, and OFF while other accounts still use it, with how many said
    beside the address. "Retire the proxy" goes on the checklist only when it
    is on.

  **Round two (Garreth, 2026-09-23):** "Proxy kept" is gone from the
  checklist and from the dialog. While other accounts remain there is nothing
  to do about the proxy, so it is not listed at all. The dialog's two lists
  are more visual: each row has its mark in a circle, with room and a rule
  between rows, and what the app does itself is marked in cyan. The
  checklist's header lost its "Retired 09:40 · 3 queued posts back in the
  pool" line.

  **Round three (Garreth, 2026-09-23):** the dialog's proxy row became a
  switch rather than something the app decides alone. It is on by default for
  the last account on a phone and off otherwise. Off, the row dims but the
  switch stays at full strength, so it still reads as something you can press.

  What was drawn: the retire dialog shows the two halves before the hold,
  "Now" (what the app does) and "Then on iPhone 1, from the to-do list" (what
  a person does). No dry run, because there is no robot to ask. The checklist
  sits at the top of its phone's block on the To-do page, drawn like an
  account panel with a red Banned pill and a "Clean-up 1 of 2" count. It
  counts in the phone's "x of y", and it stays struck through for the rest of
  the day once finished, like any finished item. Left for review: the
  dashboard card's phone count includes the steps, but the card does not list
  them.
- **Backlog:** PF-11. On Cloud, a ban ends with the Geelark phone being
  deleted by the robot. On a real phone a person has to do the work.
- **Design:** the checklist shown when a Physical account is retired as
  banned: sign out on the device, release its queued content, retire the
  proxy and the number. Each step ticked by hand, shared like the to-do list,
  the account not counted as cleaned up until all are ticked. Where a
  half-finished checklist shows up again (the to-do list is the obvious home).
- **States:** not started, part done, done; a ban on a phone that still holds
  two healthy accounts.
- **Done when:** the checklist and its place in the to-do list are approved.
  Then built in the app to match, and looked at in the running app at both
  sizes.

## P9. Add the Live view page and link to it from the dashboard

- **Status:** not started. Garreth, 2026-09-17: required, not optional.
- **Backlog:** PF-14. The page itself is served from the MacBook Air, not from
  the dashboard, and is reachable over Tailscale only; the dashboard links to
  it.
- **Design:** the tiled page of every connected phone's live screen, with tap
  and swipe passed back; a single phone enlarged; and the link to it from the
  device page and the Devices card. It is a separate small site, so it needs
  the dashboard's look carried over rather than inherited.
- **States:** a phone offline, the Air unreachable (the link must fail
  clearly, not hang), one phone versus six.
- **Done when:** the tiled page, the single-phone view and the unreachable
  state are approved.
  Then built as the small site on the Air, with the dashboard's links to it,
  and seen working from Czedrick's own Mac. The build is blocked until the Air
  has Xcode signed in and the agent is on at least one phone.

## P10. Move accounts onto phones in one step, and several at once

- **Status:** **APPROVED 2026-09-22.** Drawn in the running app, not on a
  canvas, and approved after five rounds of feedback. Nothing saves yet:
  PF-03 builds the single write, PF-15 the batch. Next step is building, not
  designing.
- **Backlog:** PF-03, PF-15.
- **Where to look:** `/settings?demo=1`. The invented phones are the same four
  the Accounts by-phone view and the To-do screens use, so the three screens
  describe one farm. Without `?demo=1` the picker says "No phones yet", which
  is the true state today and is worth seeing too.
- **Design:** one action that does both: pick the account, pick the phone,
  confirm with a hold. Then the same for several accounts at once, by
  character, for the day a batch of phones arrives. What it says when the
  phone is full, and that it never unpauses anything.

### What was drawn, and the decisions behind it

- **The move stays in Settings → Account management**, which already calls
  itself the one place an account crosses between fleets (Garreth,
  2026-09-18). PF-03's text says "button on the account page", but that
  predates the decision that the account page and the Accounts table carry no
  sign of the fleet at all. No new screen was added.
- **The phone is picked in the dialog that already flips the fleet.** The two
  steps were never really two decisions — nobody moves an account to Physical
  and then wonders which phone. Between them the account sat on the Physical
  fleet with no phone, and that is the state the To-do list cannot show: the
  work simply does not appear and nothing says why.
- **Every phone is listed with how many accounts it holds** — "3 accounts",
  "0 accounts". A phone that is switched off says so in place of the count and
  cannot be chosen. Hiding it would leave somebody hunting for a phone that is
  on the Devices page and not here.
- **No phone is ever full** (Garreth, 2026-09-22). The first draft refused a
  fourth account and showed "2 of 3"; he removed the limit, so the count is a
  count and the only refusal left is a phone that is switched off.
- **Moving back to Cloud has no picker.** It names the phone the account comes
  off, and that is all there is to decide.
- **"Posting stays paused" is on both dialogs**, because the ticket asked for
  it in as many words. It is the one line of explanation on the screen.
- **Selecting several is off until asked for.** A checkbox on all thirty-odd
  cards would be permanent clutter on a screen whose everyday job is moving
  one account, and the batch matters on the handful of days a box of phones
  arrives. "Select" turns it on and the toolbar becomes the batch bar.
- **"By character" needs no new control.** The search already matches the
  character, so typing "Character 3" and pressing Select all is exactly that.
  A character dropdown was considered and left out as a second way to do what
  the search already does.
- **The batch plan fills one phone before starting the next**, rather than
  dealing accounts out round-robin, so a character's accounts land together —
  which is the arrangement the three-per-phone rule exists to produce.
- **The plan is a suggestion.** Every row has a dropdown, because the person
  doing the move knows which phone is on which desk and the app does not. A
  phone over-filled by hand is named and the move is refused, rather than
  letting the save fail one row at a time.
- **Nothing runs out of room.** Once every phone has taken its usual three the
  plan starts again at the first, so a batch bigger than the box still lands.
  Select all 32 today reads: "32 accounts onto 3 phones." (Three, not four —
  iPhone 4 is switched off.) The only account that gets no phone is one with
  no phone to go on at all.
- **A row can still be set to "Not moving" by hand**, and then the sentence and
  the button both say so. The button always names the number that will actually
  happen, never the number selected.

### Seen in the running app

Dark and light, desktop and phone width, in Chrome — not Safari. No horizontal
scroll at 390px; the batch list scrolls inside its dialog. The empty picker was
checked on the real page as well as the invented one.

**Found while drawing it, and NOT fixed here:** the hold button's `warn` tone
measures 3.6:1 against its background in light mode, under the 4.5:1 it needs.
It is the shared `HoldButton`, so Retire and the existing fleet flip have
always looked like this; changing it touches every hold in the app. That is
P13's job, not this ticket's.

- **Done when:** ~~a single move and a batch move are approved.~~ **Met
  2026-09-22.** Then built in the app to match, and looked at in the running
  app at both sizes — that half is PF-03 and PF-15.

### Garreth's feedback on the drawn screens, and what it changed

All 2026-09-22, in one pass over the running app:

1. **"The font color here should be black. If white it is hard to read."** —
   the Move onto phones button in dark mode.
2. **"The dropdown button contents is not properly inside the container"** —
   the browser's own arrow was sitting on top of the longest option.
3. **"Do not limit the number of accounts in one phone to 3. For now, we will
   only have 3 accounts per phone but in the future there will be more in one
   phone."** — the cap was removed from every screen and both write paths, not
   just from this design. See `BACKLOG.md` and the changelog.
4. **"In light mode, the font color here should be white."** — the same button.
5. **"The text should not be bold. Just make it the same text as similar
   buttons we have."**

1, 4 and 5 turned out to be one fault: the button was hand-built rather than
being the app's own `CtaButton`, the one "Add phone" uses. Using it made all
three go away at once. **The lesson for the rest of these tickets: a primary
action is `CtaButton`, never a hand-rolled `bg-accent` button.**

## P11. Show hand-made posts on the calendar, and prepare the app for retiring Cloud

- **Status:** not started.
- **Backlog:** PF-19, PF-16.
- **Design:** how a post made by hand shows on the Content calendar (queued,
  posted and waiting for its link, posted, failed), since today the calendar
  reads delivery from Geelark. Then the end state: what the app looks like the
  day Cloud is switched off for good: the top-right switch gone, the Cloud
  menu and the GeeLark wallet gone, and where Cloud's history goes so it can
  still be read.
- **Done when:** the Physical calendar and the after-Cloud app are approved.
  Then built in the app to match, and looked at in the running app at both
  sizes.

## P12. Add the day's-work reminder, overdue items, and bell items that name their fleet

- **Status:** **built 2026-09-23.** The bell half was built 2026-09-22 (PF-12)
  and names its fleet (PF-20); the to-do list half was approved and built on
  2026-09-23.
- **Backlog:** PF-12 (done), PF-20 (done).
- **The email is gone.** Asked who the morning email should go to, Garreth
  answered: no email, a notification in the dashboard instead (2026-09-22).
  There is no n8n workflow in this ticket any more.
- **Built:** the day's-work reminder and the overdue-post alert, as two
  recomputed bell items. One reminder for the whole day, opening the to-do
  list; dismissible and back tomorrow; posts and warmups as one count; the
  stuck post its own item in red. Physical only. See `BACKLOG.md` PF-12 for
  the decisions and what was proven.
- **Still to design and build:**
  - **How a stale item looks ON the to-do list.** The bell now says a post is
    overdue; the row itself still looks like any other. This is the half that
    needs drawing.
  - ~~**A bell item that names its fleet** (PF-20), because the bell is the one
    place that shows both. Note the tension to settle here: PF-12's two items
    were made Physical-only, which is the opposite rule.~~ **Done 2026-09-22.**
    Garreth settled the tension himself: "bell shows both fleets and names
    which." Every item now carries a Cloud or Physical label, PF-12's two are
    shown to everyone, and opening an item about the other fleet switches you
    over. See `BACKLOG.md` PF-20.
- **The stale row, approved and built 2026-09-23.** Garreth chose a
  red **Overdue** pill on the bell's own 24-hour rule, so the list and the bell
  never disagree about the same post. Under 24 hours a carried-over post stays
  quiet ("Due yesterday"). Past it, the row gets the pill and says how long it
  has waited ("Due yesterday · waiting 26 h"). On its third and last day it
  says "last day on the list" instead. Overdue posts sit at the top of their
  account. The same pill shows on the dashboard card once a phone is opened.
  Drawn at `/todo?todo=work` and `/?todo=work`; the real list now works it
  out from the same `OVERDUE_HOURS` the bell reads. Not yet seen with a real
  post. Left open: a folded phone on the dashboard card does not show that it
  holds an overdue post.
- **Done when:** the stale row on the to-do list is approved, then built and
  looked at in the running app. The fleet label is done.

## P13. Review and fix everything already built (B1 to B7) at desktop and phone width, in dark then light mode

- **Status:** **reviewed 2026-09-23**, with findings in `docs/P13-REVIEW-FINDINGS.md`. Six items approved and done the same day: five fixed, one found already correct. The design and accessibility findings are waiting for approval. Before the review: these screens worked and had been looked at in the app,
  but none went through a design review: the Cloud | Physical switch,
  Settings → Account management, the Devices list and Add phone sheet, the
  device page, the Devices card on the dashboard, the shared empty state,
  Facebook on the account screens, and Analytics and Inventory in Physical.
- **Design:** a pass over each at desktop and phone width, in dark and then
  light, against the rules above. Light mode and true phone width have not
  been seen for any of them.
- **Done when:** each is approved, or has a list of changes, and those
  changes are made in the app and looked at again.

## P14. Put an account's settings behind a ⋯ menu on its row, with Edit account and Retire account

- **Status:** **approved and built 2026-09-23** (Garreth approved the drawing
  the same day). Live on every Physical row; `/accounts?demo=1` still draws
  the invented farm, where Save only closes. Cloud rows and Cloud's Posting
  window are unchanged, proven by before-and-after screenshots.
- **Where it came from:** Garreth, 2026-09-23. The row carried three controls
  (the warmup switch, the Posting pill, Retire) and had nowhere to edit the
  handle, the character, the phone or the number. One menu frees the row and
  gives all of that one home.
- **Decided (Garreth, 2026-09-23):**
  - **Cloud is not touched.** The ⋯ menu and Edit account are Physical only.
  - **Phone numbers belong to accounts, not phones.** This reverses P6's "the
    numbers are recorded on the phone" from the same morning. Proxies stay on
    the phone: every account on it shares one.
  - **The Profile name is shown but locked.** Every n8n workflow and every
    content assignment finds an account by it.
  - **The proxy is shown but locked,** with a link to the phone's page, where
    it is changed once for every account on that phone. That already works:
    accounts keep no copy of the proxy.
  - **No red mark for ban signals.** The red Retire button that lit up for a
    likely ban goes with the button; Garreth judged it more confusing than
    useful.
  - **Posting opens as the Active / Paused switch,** and **Edit cadence**
    unfolds the custom cadence under it.
- **What was drawn:**
  - The last column is a ⋯ button. Its menu has **Edit account** and **Retire
    account** (in red). Retire opens the P8 dialog, as before.
  - The row loses its warmup switch (the days since the last warmup stay) and
    its Posting pill, which becomes a plain word: Active, Paused or Custom.
    The phone-level warmup switch in the By phone view stays.
  - **Edit account** has four parts: **Details** (Profile name and Platform
    locked; Handle and Character editable), **Phone** (which phone, the
    account's phone number, and the phone's proxy read-only with a link to the
    phone), **Posting** (the switch, then Edit cadence: posts a day, GLP and
    filler a week, content types, ignore throttling) and **Warmup** (Manual /
    Automated).
  - Seen in headless Chrome at phone and desktop width, dark and light.
- **For the build:**
  - A phone number column on `accounts`, added beside what exists; the
    phone's number box and P6's numbers view move to it. The Add account form
    (PF-21) gains the field. The ban checklist then always names the banned
    account's own number.
  - The cadence reuses the Posting window's own fields and checks rather than
    copying them, so the two cannot disagree. Cloud's window keeps working
    exactly as it does.
  - Changing the phone needs PF-03's write. Until then the field can be drawn
    but must not save a half-move.
- **Done when:** the menu and Edit account are approved, then built for real
  Physical rows, and looked at in the running app at both sizes.

---

## Still open

1. **The automated warmup session.** No decision yet on the new warmup script
   (Garreth, 2026-09-19), so what an automated session looks like and how long
   it runs is unknown. P4 designs around "done when the script finishes".

Settled 2026-09-19: **a manual warmup session is about 15 to 20 minutes**, so
the log sheet starts at 15 and a session counts as done from 15; and **an item
carries over for 3 days, for now**, after which it stops carrying over (what
it becomes then, skipped or missed, is for P2 to show).
