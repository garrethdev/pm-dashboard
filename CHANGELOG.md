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

## 2026-09-13 (latest) — Claude Design now has the dashboard's components

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
