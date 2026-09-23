# P13 — review of B1 to B7 (findings; five fixed and one cleared on 2026-09-23)

**Date:** 2026-09-23. **Code reviewed:** `2dfd69b` (PF-03 on top of `main`).
**The pictures were not kept.** 128 screenshots were taken during the review
and left out of the repo on purpose (Garreth, 2026-09-23), so the file names
in the tables below no longer point at anything. They read
`<ticket>-<screen>-<width>-<theme>.png` and are kept only to say which screen,
width and theme each finding was seen in.

> **Checked in headless Chrome, not Safari.** Garreth uses Safari, and Safari
> draws some things differently (native checkboxes, file pickers, dropdown
> arrows, the glass blur). Anything marked "Safari?" below needs a look on a
> real iPhone or Mac before it is approved.

## How it was checked

- Every B screen at **390 wide (phone) and 1440 wide (desktop), dark and
  light** — four views each. Light mode was seeded before each page loaded, and
  the fleet was set with the `pm_fleet` cookie. That is a view setting only.
- Each view was measured automatically, not just looked at: sideways
  scrolling, tap targets under 44 px on the phone width, text contrast against
  WCAG AA (4.5:1, or 3:1 for large text), clipped text, and whether an empty
  list's card reaches the bottom of the screen. Then each view was looked at.
- **Nothing was saved.** No hold button was held and no Save was pressed. The
  only presses were opening dialogs and menus, choosing Select, and ticking a
  phone in the **demo** move dialog, which saves nothing.
- `?demo=1` placeholder data was used where the real screen is empty. The real
  empty screens were shot as well.

**What the data looked like.** No phone is registered and no account is on
Physical, so every real Physical screen is empty. For a few minutes another
worker's two practice phones were on the Devices page. They were deleted
before the final shots, so the Devices list **with** phones was seen once (at
1440 dark) and has no screenshot. The Devices list has no `?demo` mode.

**Severity words:** **breaks** = wrong or unreadable. **hard to use** = works,
but gets in the way or fails an accessibility minimum. **cosmetic** = looks
off, nothing blocked.

**Where the problem sits:** if the fix belongs in a shared component, the
finding says so. Changing a shared component changes every screen that uses
it.

## Checked and fine

- **No sideways scrolling in any of the 128 views.** Wide tables scroll inside
  their card.
- **Cloud looks the way it did before the phone-farm work (B5).** On Cloud:
  the menu has no To-do or Devices; the dashboard still has the GeeLark wallet
  and the Posting Agent row; the Accounts filter offers TT and IG only; the
  account page, Inventory, Proxies and Incidents show nothing about phones. The
  one intended exception is the Cloud / Physical switch itself (B1).
- **Physical numbers follow the fleet (B5).** Accounts, posting limits,
  Analytics, Inventory, Proxies and Incidents all show Physical's own (empty)
  state and not Cloud's. There is one exception: the calendar's "short" pills
  (B5-1).
- **Empty lists fill the page (B7).** Every full-page empty state checked
  reaches the bottom of the screen with its message centred: Devices, To-do,
  Accounts, Proxies, Incidents, Inventory, posting limits, the Facebook tab.
- **Demo mode saves nothing.** On the demo device page, the fields and buttons
  that would save are switched off.

---

## B1 — the Cloud / Physical switch (top right)

Screens: `b1-dash-physical-*`, `b1-dash-cloud-*` (all four views of each).

| # | Views | Severity | What is wrong | Where | Screenshot | Suggested fix |
|---|---|---|---|---|---|---|
| B1-1 | 390 light, 1440 light (dark is weak too) | hard to use | It is hard to tell which fleet is on. In light mode the "on" side has **the same fill as the track (1.00:1)**, and its only edge is a pale border at 1.19:1. The two icons are both dark grey. In dark mode the "on" side is only 1.10:1 against the track. The switch is there so the fleet is never a mystery, and in light mode that is exactly what it is. | `src/components/shell/fleet-switch.tsx` (the `glass` class on the "on" side, which light mode turns into the plain card colour) | `b1-dash-physical-390-light.png`, `b1-dash-cloud-1440-light.png` | Give the "on" side a filled background that stands out from the track (at least 3:1) in both themes. |
| B1-2 | 390 dark + light | hard to use | Each half of the switch is **56 × 32 px**, under the 44 px minimum for a finger. This switch is on every page. | `fleet-switch.tsx` (`h-8 w-14`) | `b1-dash-physical-390-dark.png` | Make each half 44 px tall on phone widths. |
| B1-3 | 390 dark + light | cosmetic | The switch takes about a third of the phone header, so longer page names get cut off: "Proxies & …", "Content cal…". | `src/components/shell/topbar.tsx` beside the switch | `b5-proxies-physical-390-light.png` | Narrow the switch on phones, or let the page name use the space the breadcrumb leaves. |

## B2 — Settings → Account management (moving accounts)

Reviewed as it stands in this worktree. Another worker is changing the batch
dialog in parallel, so B2-6 may already be out of date.
Screens: `b2-settings-real-*`, `b2-settings-demo-*`, `b2-move-dialog-demo-*`,
`b2-move-dialog-demo-picked-*`, `b2-move-dialog-real-*`, `b2-select-mode-demo-*`,
`b2-batch-demo-*`.

| # | Views | Severity | What is wrong | Where | Screenshot | Suggested fix |
|---|---|---|---|---|---|---|
| B2-1 | light (both widths) | hard to use | **The known item, measured.** The shared hold button's `warn` tone, with a phone picked so the button is live: **4.46:1** (needs 4.5:1). It drops to **3.77:1 while the pointer is over it**, because the button fades to 90% on hover. That is almost certainly where the 3.6:1 in P10 came from. On the slightly darker raised panels it is 4.17:1. Dark mode passes at 6.38:1. | `src/components/ui/hold-button.tsx` (`bg-warn/25 text-warn`, `hover:opacity-90`). **Shared:** also Retire, the fleet flip, the batch move and To-do's Undo. | `b2-move-dialog-demo-picked-390-light.png`, `b2-batch-demo-390-light.png` | Lighten the light-mode fill from 25% to 15% (measures 5.26:1), and drop the hover fade on hold buttons. |
| B2-2 | 390 dark + light | hard to use | **The dialog's close ✕ is 20 × 20 px** on a phone, and the tick boxes in Select mode are **16 × 16 px**. The card around a tick box does not tick it, so you have to hit the 16 px square. | `src/components/dashboard/delivery-mode-control.tsx` (Close); `account-management.tsx` (the `size-4` checkbox) | `b2-select-mode-demo-390-dark.png`, `b2-move-dialog-demo-390-dark.png` | Make the ✕ a 44 px target, and let a tap anywhere on the card tick it in Select mode. |
| B2-3 | 390 dark + light | hard to use | The "Cloud" / "Physical" pill on each card is the **only** way to start a move, but it is 53 × 24 px and looks exactly like a status label. Nothing says it can be pressed. | `delivery-mode-control.tsx` (the button labelled "Managed on …") | `b2-settings-real-390-dark.png` | Make it at least 44 px tall on phones and give it a small › so it reads as a button. |
| B2-4 | all four | cosmetic | The switched-off phone's row, including the reason "iPhone 4 is switched off", is faded to **2.57:1 in light** (4.12:1 in dark). WCAG does not score a switched-off control, but the reason is the one thing the reader needs from that row. | `src/components/dashboard/move-phone-picker.tsx` | `b2-move-dialog-demo-1440-light.png` | Keep the row faded, but show the "switched off" reason in normal grey. |
| B2-5 | dark (both widths) | cosmetic | The grey pill text ("Cloud" on every card) is **4.41:1**, just under 4.5:1. The same pill shows "0 accounts", "Not yet due", "Off" and "Posts 1 of 2" all over the app. | **Shared:** `StatusPill` grey tone (`--text-muted` on `--pill-bg`, dark) | `b2-settings-real-1440-dark.png` | Lighten the dark grey pill label a hair, enough to reach 4.5:1. |
| B2-6 | light (both widths) | cosmetic | While nothing is picked, the batch button "Move onto phones" and the dialog's "Move onto a phone" are faded to 1.7–2.7:1 in light. That is allowed while switched off, but they are hard to read. | `CtaButton` / `HoldButton` disabled style (shared) | `b2-batch-demo-390-light.png`, `b2-move-dialog-demo-390-light.png` | Optional: fade switched-off buttons less (60% instead of 40%). |
| B2-7 | — | Safari? | The tick boxes are the browser's own, coloured with `accent-color`, so Safari draws them differently from Chrome. | `account-management.tsx` | — | Look at Select mode once on an iPhone. |

## B3 — Devices page, Add phone, and the page per phone

Screens: `b3-devices-real-*` (real, empty), `b3-add-phone-*`,
`b3-device-demo-full-*`, `b3-device-demo-new-*`, `b3-device-demo-off-*`,
`b3-device-real-*` (a phone that has been deleted).

| # | Views | Severity | What is wrong | Where | Screenshot | Suggested fix |
|---|---|---|---|---|---|---|
| B3-1 | light (both widths); dark shows the plain default page | **breaks** | **Opening a phone that no longer exists** (`/devices/12`, a practice phone deleted earlier today) shows Next's built-in "404 This page could not be found". **In light mode it paints the whole page black**: the logo and breadcrumb disappear, and the greeting ends up at 2.7:1 on a grey band. A stale link from the bell, a bookmark or the history would land here. | No `not-found.tsx` anywhere under `src/app/`. `devices/[id]/page.tsx:55,61` and `accounts/[profile]/page.tsx:107` both call `notFound()`. | `b3-device-real-1440-light.png`, `b3-device-real-390-light.png` | Add an app-styled "not found" page that uses the shared empty state ("This phone is gone", with a link back to All phones). |
| B3-2 | 390 dark + light | hard to use | Small targets on the phone page, the screen Yurie uses standing up: "← All phones" is **78 × 16 px**; the In use switch is 36 × 20; Live view, Remove, Save and Add screenshot are 34 px tall. The Add phone sheet's ✕ and buttons are 36 px. | `src/components/dashboard/device-detail.tsx`, `add-device-modal.tsx` | `b3-device-demo-full-390-light.png`, `b3-add-phone-390-light.png` | Bring these up to 44 px on phone widths, the back link first. |
| B3-3 | all four | cosmetic | **Add phone:** the sample text in the empty boxes ("iPhone 1", "iPhone 12", "18.5", "America/New_York") looks just like typed values. A quick glance reads the form as already filled in. | `add-device-modal.tsx` / `device-fields.tsx` placeholder colour | `b3-add-phone-390-light.png` | Draw the sample text a clearly lighter grey than typed text (still readable). |
| B3-4 | 1440 dark (seen once, no screenshot) | cosmetic | With two phones listed, the "0 accounts" pill sat **under** the name on one card and **beside** it on the other, so the two cards did not line up. | `src/components/dashboard/devices-view.tsx` (the `flex-wrap` row with the name and pills) | — (phones deleted before the final shots) | Put the account count on its own line, or never let it wrap. |
| B3-5 | — | cosmetic (for reviewing) | The Devices **list** has no `?demo=1`, unlike the device page, Accounts and Settings. Now that no phone exists, the list with phones cannot be looked at. | `src/app/(dashboard)/devices/page.tsx` | — | Add `?demo=1` to the list using the same four invented phones. |
| B3-6 | — | Safari? | The screenshot picker in Add phone is the browser's own file button ("Choose File"), which Safari draws its own way. | `add-device-modal.tsx` | `b3-add-phone-390-light.png` | Look at it once on an iPhone. |

**B3-1 — Fixed 2026-09-23.** A missing phone now shows "This phone is gone" with a link to All phones, and a missing account shows "This account is gone". Any other wrong address shows "This page doesn't exist". All three sit inside the menu and top bar, in dark and light (`src/components/shell/not-found-state.tsx` and the three `not-found.tsx` files).
The missing-account page still logs React's development-only "script tag" warning. The Cloud account page (`accounts/[profile]/page.tsx`) was deliberately not restructured to avoid it, and it has no visible effect. The page stays in the right theme. The unknown-address and missing-phone pages are clean.

The empty Devices page itself is correct: its card fills the page and "No
phones yet" is centred (`b3-devices-real-*`).

## B4 — the Devices card on the Physical dashboard

Screens: `b1-dash-physical-*`.

| # | Views | Severity | What is wrong | Where | Screenshot | Suggested fix |
|---|---|---|---|---|---|---|
| B4-1 | — | cosmetic (housekeeping) | **The Devices card no longer appears anywhere**, which matches Garreth's 2026-09-22 reversal (To-do took its place). Its code is still there: `FleetTopCard` only runs on the Cloud dashboard, so its Physical branch can never show. Nothing on screen is wrong. | `src/components/dashboard/fleet-top-card.tsx`, `devices-card.tsx` | `b1-dash-physical-1440-light.png` | Close B4 as "replaced by P1". Delete the unused card when convenient. |
| B4-2 | all four | **breaks** (wording) | The Physical dashboard's **Proxies & numbers** card says **"0 proxies active, nearest expiry in Infinity days"**. With no proxies, the "nearest expiry" sum has nothing to work on and prints "Infinity". Physical proxies now live on phones (P6), so this line will say 0 until the card counts phone proxies. | `src/components/dashboard/proxies-card-live.tsx:47` | `b1-dash-physical-390-dark.png` | When there are no proxies, say "No proxies yet". On Physical, count the phones' proxies. |

**B4-2 — Fixed 2026-09-23.** With no active proxy the card says "No proxies yet". It no longer prints "Infinity days". Counting the phones' own proxies on Physical is not built.

## B5 — each fleet's own numbers

Screens: `b5-{accounts,content-calendar,analytics,inventory,proxies,incidents}-{cloud,physical}-*`.

| # | Views | Severity | What is wrong | Where | Screenshot | Suggested fix |
|---|---|---|---|---|---|---|
| B5-1 | all four | **breaks** (wrong numbers) | **The Physical calendar shows Cloud's "short" pills.** Every past day carries the same "10 short … 39 short" in both fleets (checked by reading both pages), although Physical has no accounts. The pills come from the scheduler's daily run, which covers everyone, not from the fleet being viewed. | `src/components/dashboard/content-calendar.tsx:376` (`run.shortfallCount`) | `b5-content-calendar-physical-1440-light.png` vs `b5-content-calendar-cloud-1440-light.png` | Hide the run's "short" pills on Physical until they can be counted per fleet (PF-19's territory). |
| B5-2 | 390 dark + light | cosmetic | The Physical **To-do card and Proxies page said "No phones yet" while two (practice) phones existed** on the Devices page. They count phones that have unpaused accounts, but the words say there are no phones. | `todo-today-card.tsx`, `proxies-phones-view.tsx` empty messages | `b1-dash-physical-390-dark.png`, `b5-proxies-physical-390-light.png` | Word it for what it counts, such as "No phones with accounts yet". |
| B5-3 | 390 (both) | cosmetic | Physical Analytics on a phone: the empty Views chart draws a bare dotted grid with "0 avg", while every other card on the page uses the shared empty state. | `src/components/dashboard/analytics-charts.tsx` | `b5-analytics-physical-390-dark.png` | Use the shared empty state when the chart has no posts. |
| B5-4 | 390 (both) | cosmetic | On a phone, "Add account" on Physical Accounts shrinks to an icon with no word. | `accounts-views.tsx` / `add-account-modal.tsx` trigger | `b5-accounts-physical-390-dark.png` | Keep the word, or it will be read as a mystery icon. |

**B5-1 — Fixed 2026-09-23.** The run's "N short" pills are left off the Physical calendar. The Cloud calendar was compared pixel by pixel before and after, and it is unchanged.

**B5-2 — Checked 2026-09-23, no change needed.** The wording was already right: both screens say "No phones yet" only when no phone exists. What the review saw was a one-minute cache on the Devices list, still showing phones another session had just deleted. Proven with a practice phone with no accounts: To-do said "Nothing due today" and Proxies listed the phone. The practice phone was deleted afterwards.

The posting-limits table (below the calendar), Inventory, Incidents and
Proxies & numbers are correct in both fleets.

## B6 — Facebook on the account screens

Screens: `b6-accounts-demo-*`, `b6-analytics-facebook-*`, `b6-filters-*`,
`b6-account-detail-cloud-*`.

| # | Views | Severity | What is wrong | Where | Screenshot | Suggested fix |
|---|---|---|---|---|---|---|
| B6-1 | 390 dark + light | hard to use | **The Facebook tab on Analytics is cut off on a phone.** It reads "Faceboo" at the right edge, and you have to know to swipe the tab row. | `analytics-charts.tsx` (the platform tabs in the page header) | `b6-analytics-facebook-390-light.png`, `b5-analytics-physical-390-dark.png` | Put the platform tabs on their own full-width row on phones. |
| B6-2 | all four | cosmetic | The Facebook mark is a small **filled disc**, drawn from the general icon set. TikTok and Instagram use the outline brand marks. At 12–14 px it reads as a dot beside the handle. | `src/components/ui/platform-icon.tsx` (Phosphor `FacebookLogo`) | `b6-accounts-demo-1440-light.png`, `b6-accounts-demo-390-dark.png` | Draw a Facebook "f" in `brand-icons.tsx` in the same outline style as the other two. |
| B6-3 | all four | cosmetic | On the Facebook tab, the 7 days / 2 weeks / 1 month / All time choices stay on screen and do nothing. | `analytics-charts.tsx` | `b6-analytics-facebook-1440-light.png` | Hide the range choices while Facebook is chosen. |

**B6-3 — Fixed 2026-09-23.** On the Facebook tab the range choices and the "as of" date are hidden. They come back on the other tabs.

Correct: the FB filter is always offered in Physical and never in Cloud
(`b6-filters-physical-390-dark.png`, `b6-filters-cloud-1440-light.png`), and
the Facebook tab's empty message fills the page.

## B7 — the shared empty state

Screens: `b7-todo-real-*`, and every empty screen above.

| # | Views | Severity | What is wrong | Where | Screenshot | Suggested fix |
|---|---|---|---|---|---|---|
| B7-1 | all four | cosmetic | Some empty lists still use plain text instead of the shared empty state. On the account page: "No posts in this range" under Views, Top 5 and Last 5. On Analytics: "No posts in range" in Best performing account. The rule says every empty list uses the shared one, but the account page is a Cloud screen that "must look as before", so this is Garreth's call. | `account-analytics-view.tsx`, `analytics-charts.tsx` | `b6-account-detail-cloud-1440-dark.png` | Decide whether the Cloud screens adopt it. If yes, swap the plain text for `EmptyState compact`. |
| B7-2 | 390 (both) | hard to use | To-do's day arrows (‹ Today ›) are 28 × 28 px on a phone. | `todo-view.tsx` | `b7-todo-real-390-dark.png` | 44 px on phones. |

The empty state itself is right at every width and theme: icon in a soft
circle, one quiet line, card to the bottom of the screen.

---

## Found on the way (shared by every screen, not B1–B7 themselves)

- **breaks, rare device settings:** the glowing accent button (`CtaButton` →
  `SpecularButton`) crashes the **whole page** when the browser cannot start
  WebGL, the graphics feature it draws with (`specular-button.tsx:225`). Seen
  in headless Chrome with graphics switched off. Every page with an accent
  button went to "This page couldn't load". A browser that turns WebGL off, as
  iPhone Lockdown Mode is reported to, may hit this; not tested. Suggested fix:
  if WebGL does not start, draw the button flat instead of throwing.
  **Fixed 2026-09-23:** without WebGL the button shows without its glow and
  the page loads (checked with WebGL switched off). With WebGL on, the
  screenshots are identical before and after.
- **cosmetic:** the avatar initials in the top bar are 3.99:1 in light mode.
  The accent pill ("warming") is 4.35:1 in light. The white "Top up" on red is
  3.33:1 in dark (also on Cloud, from before).
- **cosmetic:** in dark mode the sidebar reads "Dark mode" with its switch
  **off**. In light it reads "Light mode" with the switch on, so the switch
  seems to say dark mode is off while dark mode is on.
- **hard to use, phone:** the shared filter pills (All / Healthy / Needs
  attention, the date ranges) and "View all" buttons are 24–26 px tall at
  390, on every page.

## Not checked

- **Safari**, iPhone or Mac: none of this was seen in Safari.
- A **real** device page: no phone exists. Only the three demo states were seen.
- The Devices list with phones, beyond the one sighting in B3-4.
- Hover and keyboard focus, except where noted (B2-1).
- The Physical dashboard with real to-do items: P1's own states are outside
  B1–B7.

## Top issues, ranked

1. **B3-1 (breaks):** a deleted or unknown phone opens the default 404, which
   blacks out the page in light mode. Add an app-styled "not found" page.
2. **B5-1 (breaks):** the Physical calendar shows Cloud's "short" counts. Hide
   them on Physical until they are per fleet.
3. **B4-2 (breaks):** "nearest expiry in Infinity days" on the Physical
   dashboard. Say "No proxies yet" and count the phones' proxies.
4. **B1-1 (hard to use):** in light mode you cannot tell which fleet is on.
   Give the "on" side a real fill.
5. **B6-1 (hard to use):** the Facebook tab is cut off on phones. Move the
   tabs to their own row.
6. **B2-1 (hard to use):** the hold button's warn tone is 4.46:1, and 3.77:1
   while hovered. Use a 15% fill and drop the hover fade. Shared, so every
   hold button in the app changes.
7. **B2-2, B2-3, B1-2, B3-2, B7-2 (hard to use):** tap targets under 44 px on
   the phone screens: the dialog ✕ (20 px), the tick boxes (16 px), the move
   pill (24 px), the fleet switch (32 px), "← All phones" (16 px).
8. **Shared crash:** the accent button takes the whole page down without
   WebGL. Draw it flat instead.
