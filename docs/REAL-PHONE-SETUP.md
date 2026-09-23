# Setting up a real phone

The steps to put a new iPhone and its accounts to work in the dashboard.
Written 2026-09-23, before the first real phone had been set up, so the first
run is also the test of these steps.

1. **Add the phone.** Switch to **Physical** (top right) → **Devices** → **Add
   phone**. Fill in the name, model, iOS version, proxy and time zone, and add
   the proof screenshot.
2. **Put accounts on it.** Existing accounts move in **Settings → Account
   management**: pick the phone in the move dialog, or use **Select** to move
   several. A brand-new account goes through **Add account** on the Physical
   Accounts page, where the phone is picked in the form.
3. **Clear Geelark.** For each account moved off Cloud, open Geelark and either
   cancel that profile's queued warmup tasks or delete its cloud phone. The
   dashboard does not do this: Geelark books warmups up to 7 days ahead, and
   they keep running on the cloud phone after the move unless they are cleared.
   Skipping this step means the account is used from two devices at once.
4. **Finish each account.** On its row, **⋯ → Edit account**: add the phone
   number and check that warmups are set to **Manual**.
5. **Warm up.** The **To-do** list shows two warmups a day for every account on
   a phone, from the moment it is moved, even while it is paused. Log 15
   minutes against each.
6. **Start posting when ready.** Unpause the account. From the next morning
   its posts reach To-do at 10:00 ET, to be posted by hand and ticked.

**Never unpause a Cloud account.** Cloud accounts would start posting through
Geelark again.
