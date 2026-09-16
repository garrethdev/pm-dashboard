# Real Phone Masterplan

Moving Peptide Miracles accounts off Geelark cloud phones onto real iPhones.
Plan of record from 16 September 2026, agreed with Garreth. The shareable
version is the "Real Phone Masterplan" artifact
(https://claude.ai/artifact/GAW1snVjyEYEBenTJyNZbo); the task-level sheet is
`~/Documents/Geelark Exit Plan.xlsx`, kept outside the repo; the engineering
detail is the V1 entry "Move accounts off Geelark onto real iPhones" in
`BACKLOG.md`.

## The setup in one paragraph

Two iPhones on Yurie's desk, each on Wi-Fi with ShadowRocket pushing everything
through a US mobile proxy. Each phone holds at most two characters: one
character's Instagram and Facebook, and another character's TikTok. A MacBook
Air sits beside them, connected by USB through a powered hub, which Czedrick
controls remotely. **Yurie warms up and posts by hand.** The dashboard gains a
to-do list, a warmup log and a devices list so it keeps showing last post, last
warmup and problems the way it did with Geelark. From the end of week 2 the Air
runs warmup scripts. **Posting stays human throughout.**

Three points settled along the way:

- **No OTG board.** The Mac drives the phones over a plain USB cable through
  Apple's own testing agent. The iMouse / SOME3C board needs a Windows PC and
  Chinese software, and practitioners report its screen mirroring is
  detectable.
- **One proxy per phone.** ShadowRocket applies one proxy to the whole phone.
  The phone gets the TikTok account's old proxy; Instagram and Facebook change
  address on move day.
- **Geelark stays on until move day.** Warmups keep running for everyone. An
  account stops on Geelark the day it moves to a phone.

Who does what:

| Person | Role |
|---|---|
| Garreth | Buys and subscribes |
| Yurie | Phones, the Air, warmup, posting, picking the accounts |
| Czedrick | Dashboard, n8n, remote control of the Air, warmup scripts |

## Immediate: the next 3 days, before the phones arrive (16–19 Sep)

Nothing here needs a phone in hand.

**Garreth**

- Buy and subscribe to everything in the shopping list below. Nothing else.

**Yurie**

- Pick the six accounts using the human health review: no restriction
  messages, steady views, older than a month. Group them per phone as one
  character's Instagram and Facebook plus another character's TikTok.
- Confirm each chosen account's TextVerified number and proxy-cheap proxy are
  live and paid. Renew anything expiring within 60 days.
- Create the two US Apple accounts in Dolphin Anty through the proxies, with a
  Fake XY address and a gift card as billing.
- Prepare the desk: chargers, powered hub, Wi-Fi, room for the Air.

**Czedrick**

- Within the 3 days, needed on move day: the per-account switch for Geelark or
  real phone, the Devices list, the Move to phone button, the warmup log.
- By the end of week 1, needed for the first post: the record of posts handed
  to a person, the fork in the Posting Agent so real-phone accounts get a to-do
  item instead of a Geelark job, the Posting To-Do page built for a phone
  screen.
- Add Facebook as a platform the dashboard tracks.
- Geelark warmups keep running for everyone. Stop the chosen accounts' Geelark
  warmups on the day each phone is moved, not before.
- Remote access: [Tailscale](https://tailscale.com/download) on the Air and on
  his own Mac, then macOS Screen Sharing, which is built in, to control the
  Air. Yurie turns the Air on when he needs it.

## Intermediate: weeks 1 to 2, phones arrive to first posts (20 Sep – 3 Oct)

One change at a time. The phone is new to TikTok even though the account is
not, so a few quiet days come before the first post.

**Week 1, setup and move.** Yurie factory resets each iPhone, sets it as a US
phone with New York time set by hand, signs in with the US Apple account,
installs ShadowRocket with the phone's proxy and Global Routing on, opens
whoer.net to confirm IP, country and time zone all read United States, installs
TikTok, Instagram and Facebook with location and contacts denied, and registers
both phones in the Devices list with the whoer screenshot.

Then, one phone at a time: Czedrick stops that phone's accounts on Geelark,
Yurie logs the three accounts in the same day, expects verification codes,
changes nothing else, and presses Move to phone. The phone gets the TikTok
account's old proxy.

**Week 1 to 2, re-warm and first posts.** Yurie warms each account by hand for
three to five days, 10 to 30 minutes each, logged every time. Then Czedrick
unpauses those accounts and the daily routine starts: every morning Yurie warms
each account and logs it, posts whatever is on each phone's to-do list, and taps
Posted with the link or Failed with the reason.

**Czedrick during weeks 1 to 2.** The health check reads the new record, the
comparison page, the morning reminder and the stuck-post alert, the ban cleanup
for real-phone accounts. On the Air: Yurie installs
[Xcode](https://apps.apple.com/us/app/xcode/id497799835) and signs in the
company's developer Apple ID, switches on Developer Mode on each iPhone and taps
Trust; Czedrick then installs Apple's testing agent
([WebDriverAgent](https://github.com/appium/WebDriverAgent)) on both phones
remotely, ready for the scripts. Until the wake schedule exists, Yurie and
Czedrick agree on when the Air needs to be on.

> **whoer.net** is a free website that shows what the internet sees when the
> phone connects: IP address, country, time zone, and whether a proxy is
> detected. It is the one-minute check before any account touches a phone.
> Wrong country means stop and fix the proxy.

## Long term: from the end of week 2 (from 4 Oct)

Scripts take over warmup, Geelark is switched off, and the fleet grows a few
phones at a time. Only accounts on iPhones keep posting; accounts not yet moved
stay paused on idle cloud phones until they move or are dropped.

**Czedrick**

- Script the TikTok warmup on the Air: open the app, swipe at irregular
  intervals, screenshot now and then and ask Claude whether it is peptide or
  wellness content, like or follow only when it is, stop after 20 minutes,
  write to the warmup log. Set the Air's wake schedule to match the session
  windows. Run it on one phone while the other stays on hand warmup; the
  comparison page decides.
- Copy the script for Instagram Reels and Facebook Reels once TikTok has run
  clean for two weeks.
- Retire Geelark: switch off its automations one by one, delete the cloud
  phones of moved accounts, stop wallet top-ups, cancel the subscription once
  nothing depends on it, remove the Geelark parts of the dashboard, rotate the
  keys.
- Live view of every phone: WebDriverAgent already streams each screen as
  video. Build a small page served from the Air that shows all connected phones
  live, with tap and swipe passed back, reachable over Tailscale and linked from
  the dashboard.

**Yurie**

- Keep the phones on USB and check each morning that they are still connected.
  A loose cable looks like a silent day off.
- Watch the scripted phone more closely than the hand-warmed one for two weeks.
  A restriction message means unplug it and go back to hand warmup for that
  phone.
- Scale: two or three phones at a time, one character's accounts moved per
  week, repeating the week 1 steps for each new phone. One Air with a good hub
  handles up to ten phones.
- Week 6 review with Garreth on the comparison page: restriction messages, and
  views against what the accounts did on Geelark. That decides how fast to
  scale.
- Write the one-page how-to for moving an account onto a phone, from what
  actually worked.

## Software: what runs where

No phone-farm product, a small stack. Most of it is free. The dashboard is the
part that ties it together. Only Czedrick installs the Air tools; Yurie's part
is turning the Air on and plugging the phones in.

| Where | Software | What it does | Cost |
|---|---|---|---|
| Each iPhone | [ShadowRocket](https://apps.apple.com/us/app/shadowrocket/id932747118) | Sends all the phone's traffic through its US proxy | $2.99 |
| Each iPhone | TikTok, Instagram, Facebook | The apps themselves, used by Yurie by hand | free |
| Dashboard | Devices list, Posting To-Do page, warmup log, Move to phone | Where Yurie sees what to post and logs warmups, and where everyone sees last post, last warmup and problems | ours |
| The Air and Czedrick's Mac | [Tailscale](https://tailscale.com/download) + macOS Screen Sharing | Lets Czedrick see and control the Air from his own Mac. Install on both, sign in with the same account | free |
| The Air | [Xcode](https://apps.apple.com/us/app/xcode/id497799835) | Apple's developer tool, about 10 GB. Needed once to put the testing agent on each phone | free |
| The Air, from week 2 | [WebDriverAgent](https://github.com/appium/WebDriverAgent) | Apple's testing agent, packaged by the Appium project. What actually taps and swipes on a real iPhone over USB, no jailbreak. Built once in Xcode, installed on each phone | free |
| The Air, long term | Live view page | Shows every connected phone's screen live in a browser with remote tap and swipe, using the video WebDriverAgent already streams. Reached over Tailscale, linked from the dashboard | ours |
| The Air, from week 2 | The warmup script | Written by Czedrick. Tells WebDriverAgent what to do, takes screenshots, asks Claude whether the content fits, writes to the warmup log | ours, plus a few dollars of Claude usage |

Deliberately not used: iMouse and the OTG board, the iOS Farm product, and any
cloud phone service. The Mac and WebDriverAgent do what the board would have
done, with nothing plugged into the phone that TikTok can notice.

## Shopping: what Garreth buys or subscribes to

| Item | Qty | Rough cost | Note |
|---|---|---|---|
| Powered USB hub with charging on every port | 1 | ₱1,500 – ₱3,000 | The Air has two ports, needed from the second phone |
| Lightning cables, data-capable | 2 | ₱300 each | Charging-only cables will not talk to the Mac |
| [US Apple gift cards](https://dundle.com/itunes/) | 2 | $5 each | Dundle, US$5 code by email. Covers ShadowRocket plus tax in any state. Does not expire, so buy now and redeem when the phones arrive |
| [ShadowRocket](https://apps.apple.com/us/app/shadowrocket/id932747118) | 2 | $2.99 each | US App Store, paid from the gift card balance |
| Anthropic API key | 1 | a few dollars a month | Needed by end of week 2, so the script can judge screenshots |
| Dolphin Anty, Fake XY, Tailscale, Xcode | — | free | |
| [Apple Developer Program](https://developer.apple.com/programs/enroll/) | 1 | $99 per year | Buy now, approval takes a day or two. One membership signs the testing agent for every phone for a year instead of 7 days. Enrol as an individual under a company-controlled Apple ID, not a phone account |

## Background: why this shape

- The Ivaldy iPhone-farm playbook was the starting point. Its principles hold
  (hand-seeded warmup, blank profiles until warm, one proxy per phone, all US
  signals in agreement, a real thumb on the upload). Its rig does not: the OTG
  board is reported detectable, Ivaldy's control dashboard could not be
  reached, and the "64% higher suspension without warmup" figure has no source.
- In this codebase Geelark is only the hands. The Smart Scheduler, the age
  ramp, the content gates, the caption-based analytics matching and Inventory
  never touch it, which is why the migration is a fork at the hand-off point
  rather than a rewrite.
- Moving existing healthy accounts, rather than creating new ones, keeps their
  numbers and history; the cost is a device change on move day, which is why
  the phone inherits the TikTok account's proxy and nothing else changes that
  day.
- Automation is added last and one variable at a time: real phone with human
  first, scripted warmup on one phone after a clean fortnight, posting never
  automated.

Grey-hat automation violates platform terms. Internal use only.
