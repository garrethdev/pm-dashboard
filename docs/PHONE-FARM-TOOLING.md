# Phone Farm Tooling: what we borrow from iOS Farm and Kevs-IOS-Agents

Companion to `REAL-PHONE-MASTERPLAN.md`. That doc says what we are doing and
when; this one says which outside tools were looked at, what each one is, what
we take from them, and how it fits our own system. Researched and decided with
Garreth on 2026-09-17.

## The two tools

### iOS Farm by Handler

- **What it is.** A free, open-source program that turns a row of USB-connected
  iPhones into a farm you run from a browser tab on one Mac. Published by the
  company Handler as the engine under their paid TikTok tool. Code:
  https://github.com/Git-Agni/prod-FARM-IOS-Core (Apache 2.0). Pages:
  https://gethandler.ai/ios-farm and https://gethandler.ai/tiktok-iphone-farm.
- **What it does.** A setup wizard that registers each phone; keeps Apple's
  testing agent (WebDriverAgent) running on every phone and restarts it when it
  dies; shows every phone's screen live in the browser with remote tap, swipe,
  buttons and unlock; a scheduler with history in its own PostgreSQL database;
  a TikTok plugin with randomised "doomscroll" warmup sessions in three
  personalities, plus scheduled posting; a plugin system for adding panels,
  routes and phone actions. Finds buttons by image matching and confirms the
  screen with text recognition. Does not touch proxies.
- **What it needs.** A Mac with full Xcode, Node 22, PostgreSQL, iPhones on
  iOS 16 to 18 plugged in by USB with Developer Mode on, and an Apple developer
  login in Xcode.
- **Platforms.** TikTok only, out of the box. No Instagram, no Facebook.
- **Maturity.** Three weeks old at the time of writing, one named author, a few
  thousand GitHub stars, three open issues, no independent user reports. The
  nine-phones-for-21-days case study is Handler's own claim.

### Kevs-IOS-Agents

- **What it is.** https://github.com/kevinbadi/Kevs-IOS-Agents. A manual copy
  of the iOS Farm code, uploaded ten days after the original by Kevin Badi, who
  runs a paid no-code course. The package inside is still named after the
  original author. At least five other accounts have uploaded identical copies,
  so it circulates as a course template rather than a maintained project.
- **What it adds.** Instagram warmup and feed engagement, Instagram cold DMs,
  LinkedIn connection requests and Hinge dating-app automation. Much of it
  written with AI assistance per the commit history. No issue activity, no
  outside evidence it works.
- **Same engine.** Requirements, data storage and detection behaviour are
  identical to iOS Farm because the core is unchanged.

## Decision

| Tool | Verdict | Why |
|---|---|---|
| iOS Farm | Borrow parts | Working reference for exactly the plumbing we have to build. Not run as our farm. |
| Kevs-IOS-Agents | Skip as a tool, skim for ideas | Same engine plus features we do not want. Its Instagram warmup plugin is a head start for ours, nothing more. |

**Why not run iOS Farm as-is.** It brings its own devices list, scheduler,
database and dashboard. We already have all four. Running it means two systems
that do not know about each other, with last warmup living in its database
instead of ours. It also has no documented way to switch posting off, and Yurie
posts by hand. Making it write to our warmup log is engineering work either way,
so the cleaner path is to keep our dashboard and borrow their code.

**What we borrow, and where it goes.**

| Borrowed from iOS Farm | Goes into |
|---|---|
| Keeping WebDriverAgent alive per phone, restart on crash, one port per phone | The warmup runner on the Air |
| Randomised warmup behaviour: watch time, like and save probability, personalities | Our TikTok warmup script |
| Button-finding by image match and screen confirmation by text recognition | Our warmup scripts |
| The live screen view, which is WebDriverAgent's own video stream shown in a page | Our live view page on the Air |

| Borrowed from Kevs-IOS-Agents | Goes into |
|---|---|
| Instagram warmup plugin, read for which screens and buttons it looks for | Our Instagram warmup script, rewritten and tested by us |

Both licences are Apache 2.0, which allows this with a notice kept in our code.

**What stays ours.** The Devices list, the Posting To-Do page, the warmup log,
the Move to phone button, the health check and the comparison page. The warmup
script writes one row to our warmup log after every session, so the dashboard's
last-warmup dot works the same for scripted and hand sessions.

## How the pieces fit

```
Yurie's desk                          Anywhere
+-----------------------------+       +-------------------+
| iPhone 1  iPhone 2  ...     |       | Czedrick's Mac    |
|   |          |              |       |  Screen Sharing   |
|   +----USB---+--- hub ------+       |  browser          |
|              |              |       |  terminal         |
|        MacBook Air          |<------+-------------------+
|  Xcode + WebDriverAgent     |  Tailscale (private link over the internet)
|  warmup runner + scripts    |
|  live view page             |
+-----------------------------+
              |
              v  one row per session
        Supabase warmup log  -->  dashboard (last warmup dot, comparison page)
```

- **WebDriverAgent** is the engine: tap, swipe, type, screenshot, video, on one
  phone at a time. Apple's own UI-testing agent, packaged by the Appium
  project. No jailbreak.
- **The warmup runner** is ours, on the Air: decides which phone runs which
  session when, keeps the agent alive, and calls the per-app script.
- **The scripts** are ours, one per app: TikTok first, then Instagram Reels,
  then Facebook Reels. Open the app, swipe at irregular intervals, screenshot
  now and then and ask Claude whether it is peptide or wellness content, like or
  follow only when it is, stop after about 20 minutes, log the session.
- **The live view page** is ours, on the Air: tiles every connected phone's
  live screen with tap and swipe passed back. Reached over Tailscale only,
  linked from the dashboard. Garreth has said this is required, not optional.
- **Claude Code** pairs with Czedrick on all of it, including reading the two
  repositories and lifting what is useful.

## Findings from Garreth's questions

- **Is iOS Farm free?** Yes. Open source, self-hosted, no account. TikTok only;
  Instagram and Facebook would be written by us regardless of which base we use.
- **What can iOS Farm do that WebDriverAgent cannot?** Nothing fundamental.
  WebDriverAgent is the engine; iOS Farm is the car around it: registration,
  keeping the agent alive, live view, scheduler, history, a ready warmup
  routine. We can build the car ourselves, and are.
- **Does every option need an Apple developer login?** Every scripted option
  does, because WebDriverAgent has to be signed. The manual phase, Yurie by
  hand, needs none.
- **Why the Apple Developer Program if each phone has its own US Apple ID?**
  Two different logins for two different jobs. The phone Apple IDs are for the
  App Store on each phone. The developer login lives in Xcode on the Air, signs
  the testing agent, and the Air installs it onto each phone over USB. One
  membership covers all phones. Free Apple ID: signature expires every 7 days
  and phone count is limited. Paid program, $99 a year: signature lasts a year,
  up to 100 phones. Decision: buy now, enrol as an individual under a
  company-controlled Apple ID, not a phone account. Approval takes a day or two.
- **Is iPhone 8 eligible for iOS 16 to 18?** iPhone 8 stops at iOS 16. That is
  inside the supported range but at the bottom with no more updates coming.
  SE 2020 or XR have more years left.
- **Can Czedrick control it remotely?** Yes. Anything that runs on the Air,
  the live view page included, is reachable from his browser or terminal over
  Tailscale. His laptop can be anywhere; only the phones and the Air have to be
  together, joined by USB.
- **What is Tailscale, and is it free?** An app that joins Czedrick's Mac and
  the Air into a small private network over the internet, as if on the same
  Wi-Fi. No router changes, encrypted. Free plan covers three people and a
  hundred devices. Required.
- **What is Screen Sharing, and is it really needed?** Built into every Mac,
  free. Over Tailscale it lets Czedrick see and drive the Air's screen. Needed
  for setup, Xcode, sign-ins, "Trust this computer" prompts, and for the
  occasional day something needs fixing by hand. Optional after setup.
- **Is Kevs-IOS-Agents more updated than iOS Farm?** More features, not more
  trustworthy. It is a copy with extras; the original is the maintained line
  with the community. Both are under a month old.
- **Can we skip their dashboard and use ours?** Yes. That is the plan.

## Set-up tasks this adds

These are on the Geelark Exit Plan spreadsheet as of 2026-09-17:

- Garreth: enrol in the Apple Developer Program now.
- Yurie, who manages the Air: install Xcode from the Mac App Store and sign
  the company's developer Apple ID into it.
- Yurie, when Czedrick asks: switch on Developer Mode on each iPhone and tap
  Trust when the Air asks.
- Czedrick, remotely, once that is done: install WebDriverAgent on both phones.
- Czedrick, before writing the TikTok script: clone iOS Farm, read the agent
  supervision, the doomscroll plugin and the live view; skim Kevs-IOS-Agents'
  Instagram warmup.
- Czedrick: a write path so the script can log sessions to our warmup log.
- Czedrick: the live view page on the Air, linked from the dashboard.

Grey-hat automation violates platform terms. Internal use only.
