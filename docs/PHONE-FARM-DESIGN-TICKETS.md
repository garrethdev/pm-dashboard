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
   close as missed at midnight.
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
| P1 | Put To-do on the Physical dashboard, above Inventory | **Designed, waiting for review** (2026-09-22) |
| P2 | Add the To-do today page, grouped by device and then by account | **Designed, waiting for review** (2026-09-22) |
| P3 | Add the Posted, Failed and Log warmup forms | **Drawn early inside P2, waiting for review** (2026-09-22) |
| P4 | Add a Manual / Automated warmup switch per account | Not started. The automated side waits on the warmup script decision |
| P5 | Rework the device page around the phone's daily work | Not started |
| P6 | Track proxy expiry for real phones on Proxies & numbers | Not started |
| P7 | Add the before-and-after comparison for moved accounts | Not started |
| P8 | Add the checklist for a ban on a real phone | Not started |
| P9 | Add the Live view page and link to it from the dashboard | Not started |
| P10 | Move accounts onto phones in one step, and several at once | Not started |
| P11 | Show hand-made posts on the calendar, and prepare the app for retiring Cloud | Not started |
| P12 | Add the morning reminder email, overdue items, and bell items that name their fleet | Not started |
| P13 | Review and fix everything already built (B1 to B7) at desktop and phone width, in dark then light mode | Not started |

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
| PF-07 Posting To-Do | The to-do list, on the dashboard and as a page | P1, P2, P3 |
| PF-08 Facebook | Facebook on the account screens | B6 (built); review in P13 |
| PF-09 Health + incidents read both sources | nothing new (same screens, more data) | — |
| PF-10 Comparison view | Before and after the move, per account | P7 |
| PF-11 Post-ban for manual accounts | The checklist | P8 |
| PF-12 Morning reminder + stale alert | The email, and how a stale item looks in the app | P12 |
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

- **Status:** designed, waiting for review (2026-09-22). Drawn in the running
  app rather than on a canvas (Garreth's choice that day): the card and the new
  dashboard layout are real screens behind placeholder data, so what is
  approved is the screen itself and nothing drifts on the way to the build.
  The placeholder list lives in `src/lib/data/todo-placeholder.ts` and the card
  in `src/components/dashboard/todo-today-card.tsx`; `?todo=work|done|empty|`
  `noPhones|phoneOff` on the dashboard picks which state draws. Both files go
  when PF-07 makes the list real.
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
    enough.
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

- **Status:** designed, waiting for review (2026-09-22). Drawn in the running
  app alongside P1, at Garreth's request, so both can be given feedback
  together. The page is `/todo` (`src/app/(dashboard)/todo/page.tsx` and
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
    six pills never fitted a phone screen. **"n links to add" moved to the far
    end** of the filter row, away from the phone picker, since it is a
    different question. The post and warmup marks are **one circle of one
    size**, no longer stretched to the row. **Download video and Copy caption
    sit at the right-hand end** of their row.
  - **Round five, 2026-09-22 (Garreth's feedback):** each account carries **a
    general picture of its day** beside its handle — "Posts 1 of 2" and
    "Warmup done" — so the account can be read without reading every row. The
    status and the two fetch buttons are **one group on the row's centre
    line**; the pill used to ride the first line of text while the buttons were
    centred against a two-line block. And **an automated warmup is now a list
    item like any other**, with an **Automated** label beside its name and a
    dashed box nobody can tick — which also means a script that has stopped
    running shows up as an item that never completes, instead of as silence.
    This replaces the quiet "Warmup: automated · last ran 09:14" line that P4
    asked for, on both screens.
  - **Round six, 2026-09-22 (Garreth's feedback):** the phone's model sits
    **beside its name** rather than under it; **each account has its own quiet
    panel** inside the phone's card, so two accounts on one phone do not run
    together; the day label sits **closer to its two arrows**; and the phone
    header shows **the count only** here too — a link still owed is the yellow
    box on its row and the filter at the top of the page.
  - **Round seven, 2026-09-22 (Garreth's feedback), phone width:** a task is
    **four columns** — the tick, the mark, the time it is due, and then
    everything about the task itself (its name, its detail, its status, its
    buttons) stacked in one left-aligned column, rather than strung out beside
    the name. Each of the first three sits in the row's 36px first band so they
    line up with the name. An account's verdict pills **flow left with the
    handle** on a phone. From `sm:` up the last column opens back out into a
    row and the status and buttons return to the right-hand end.
  - **Round eight, 2026-09-22 (Garreth's feedback):** the account's own line —
    handle, character and its two verdict pills — has room above and below it
    before the divider its tasks start under, at every width and on every
    phone's card.
  - **Carried-over items sit above today's** inside their account. They are the
    oldest work and the only work with a deadline of its own, since an item
    stops carrying over after three days. The line reads "Due yesterday" or
    "Due 2 days ago".
  - **Links still owed get a filter, not a section of their own** — a count you
    can press ("1 link to add") beside the phone filter. A second copy of the
    item elsewhere on the page would be a second thing to keep straight.
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
    after the day ends, since nothing else will ask for them. A filter or a
    short section of their own.
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

- **Status:** **drawn early, waiting for review** (2026-09-22). Garreth asked
  for ticking an item to open a form, so the form had to exist for the tick to
  be judged. The three forms are **one sheet**, not three
  (`src/components/dashboard/todo-board.tsx`): ticking a post offers
  **Posted / It failed** — Posted takes an optional link with a one-tap Paste,
  It failed takes a reason from a short list plus a note; ticking a warmup
  takes minutes on a stepper that starts at the target, plus a note. A finished
  item's sheet shows when it was done and a **hold-to-undo**. Saving a post
  without its link leaves the item owing one, exactly as decision 7 says. What
  is still P3's own work is the saving states — saving, saved, could not save,
  and an item someone else finished while the sheet was open.
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
- **States:** saving, saved, could not save (nothing was changed), a link that
  is clearly not a link, an item someone else finished while the sheet was
  open.
- **Done when:** the three sheets and their states are approved in dark mode
  at phone width (desktop is the same sheet centred).
  Then built in the app to match, and looked at in the running app at both
  sizes.

## P4. Add a Manual / Automated warmup switch per account

- **Status:** not started.
- **You get here from:** the account's row on its device page (P5). Decide
  whether the same switch also appears on the account's own page in Physical.
- **Build tickets this changes:** PF-04 gains a per-account setting
  (`manual` | `script`, default `manual`); PF-13 (the script's write path) is
  what an Automated account relies on.
- **Design:**
  - A two-way switch per account: **Manual / Automated**. Changing it is a
    hold, like moving an account between fleets, because switching to
    Automated removes that account's warmups from everyone's to-do list.
  - What an Automated account shows where a Manual one shows its log form:
    the two sessions for today, each done once the script has finished its
    run, with when it finished and how long it ran.
  - A way to set every account on one phone at once, for the day the script is
    switched on for that phone.
- **States:**
  - Automated, script logging normally.
  - Automated, but nothing logged for longer than expected. This is the
    failure that matters: the to-do list no longer asks a person to warm the
    account, so a dead script is silent unless the design makes it loud.
  - Manual with today's warmup done / not done.
  - An account flipped back from Automated to Manual mid-day.
- **Done when:** the switch, its confirm and the silent-script state are
  approved.
  Then built in the app to match, and looked at in the running app at both
  sizes.

## P5. Rework the device page around the phone's daily work

- **Status:** not started. A working page already exists (PF-02): details,
  proof screenshot, accounts, in-use switch. This ticket designs what it
  becomes once the phone has daily work.
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

- **Status:** not started. **A gap found on 2026-09-18, not a request.**
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

- **Status:** not started.
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

- **Status:** not started. Today the move is two steps in two places: flip the
  account to Physical in Settings, then add it to a phone on the device page.
- **Backlog:** PF-03, PF-15.
- **Design:** one action that does both: pick the account, pick the phone,
  confirm with a hold. Then the same for several accounts at once, by
  character, for the day a batch of phones arrives. What it says when the
  phone is full, and that it never unpauses anything.
- **Done when:** a single move and a batch move are approved.
  Then built in the app to match, and looked at in the running app at both
  sizes.

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

## P12. Add the morning reminder email, overdue items, and bell items that name their fleet

- **Status:** not started.
- **Backlog:** PF-12, PF-20.
- **Design:** the morning email listing the day's work per device; how an item
  left undone for more than a day looks in the to-do list and on the bell;
  and a bell item that says which fleet it is about, because the bell is the
  one place that shows both.
- **Done when:** the email, the stale state and the bell item are approved.
  Then built: the n8n reminder and alert published and seen to fire once on a
  test item, and the stale state and bell item looked at in the running app.

## P13. Review and fix everything already built (B1 to B7) at desktop and phone width, in dark then light mode

- **Status:** not started. These screens work and were looked at in the app,
  but none went through a design review: the Cloud | Physical switch,
  Settings → Account management, the Devices list and Add phone sheet, the
  device page, the Devices card on the dashboard, the shared empty state,
  Facebook on the account screens, and Analytics and Inventory in Physical.
- **Design:** a pass over each at desktop and phone width, in dark and then
  light, against the rules above. Light mode and true phone width have not
  been seen for any of them.
- **Done when:** each is approved, or has a list of changes, and those
  changes are made in the app and looked at again.

---

## Still open

1. **The automated warmup session.** No decision yet on the new warmup script
   (Garreth, 2026-09-19), so what an automated session looks like and how long
   it runs is unknown. P4 designs around "done when the script finishes".

Settled 2026-09-19: **a manual warmup session is about 15 to 20 minutes**, so
the log sheet starts at 15 and a session counts as done from 15; and **an item
carries over for 3 days, for now**, after which it stops carrying over (what
it becomes then, skipped or missed, is for P2 to show).
