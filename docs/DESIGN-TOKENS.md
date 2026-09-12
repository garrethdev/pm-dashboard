# Design tokens — Peptide Miracles Dashboard

The written reference for every visual value the dashboard uses. Written
2026-09-12, ahead of the Carousel Generator, so that feature inherits the
existing look instead of inventing a second one.

## Where the design system lives

| File | What it is | Maintained? |
|---|---|---|
| `src/app/globals.css` | **The source of truth.** The only place a value is defined. | Yes — by the running app |
| `docs/design-system.html` | The rendered catalogue — every token and control, next to the code that builds it. Opens by double-click. | **Yes** |
| `docs/DESIGN-TOKENS.md` | This file. The same values as prose, with the reasoning. | **Yes** |
| Figma → *Design System* page | A snapshot: 114 variables, 2 modes, 6 effect styles, 10 text styles, 9 components. | **No — frozen 2026-09-12** |

**`globals.css` wins every disagreement.** The HTML page and this file restate
its values because neither can run Tailwind. That restating is normally how a
reference goes stale in a week, so it is checked rather than trusted:
`src/lib/design-tokens.test.ts` parses all three and fails with the name of any
token that has drifted.

So the maintenance loop is three steps, and `npm test` tells you if you missed
one:

1. Edit the value in `src/app/globals.css`.
2. Mirror it in `docs/design-system.html` and in the table below.
3. Run `npm test`.

### Figma is frozen (Garreth, 2026-09-12)

**Do not add to it, and do not treat it as current.** New design work goes into
the HTML page and this file only.

The reason to know this rather than discover it: Figma is the one surface no
test can reach, so it is the one that can be wrong without anything failing. It
was already one weight light in three places, and its cover still prints the old
token count. Treating it as a dated snapshot is honest; treating it as a
parallel source of truth is not.

The upside of the decision is that **every surface still being maintained is now
covered by the parity test.** There is no unguarded copy left.

What the snapshot is still good for: hand-editing, exploring a layout, or
showing someone the system without running anything. What it is not good for:
looking up a value.

Nine components are documented in the HTML page but were never built in Figma —
the segmented control, sort button, filter chip, stepper, table pattern,
barcode bar, skeleton, stale notice and sidebar nav row. That gap is now
permanent by choice, not an outstanding task.

## Two non-negotiables

**Never write a hex value inside a component.** Every colour, radius and shadow
comes from a token. Two things depend on it: light mode exists only because the
same markup resolves different token values, and the Figma round-trip only works
because every value has one home. A single literal breaks both, and breaks them
silently — nothing errors, the colour just stops following the theme.

**The exceptions, in full** — checked against the codebase 2026-09-12, not
assumed:

| Where | Colours | Why |
|---|---|---|
| `ui/cta-button.tsx`, `ui/specular-button.tsx` | accent, danger, white/grey | The shine is drawn in WebGL by `ogl`, which parses hex and cannot parse `var()`. These also read the theme in JavaScript rather than from the cascade. |
| `ui/side-rays.tsx` and `app/login/page.tsx` | `#22d3ee`, `#96c8ff`, `#EAB308` | Same reason — WebGL ray colours passed as props. |
| `accounts/[profile]/page.tsx` | `#E4405F` | Instagram's brand colour. A brand asset is not ours to tokenise. |

That table is the whole list. **The chart files used to be on it** — a gridline
and a hover cursor hardcoded as white alphas in `analytics-charts.tsx` and
`account-analytics-view.tsx`, which meant they did not survive the light theme.
They became `--chart-grid` and `--chart-cursor` on 2026-09-12 and are now
covered by the parity test like everything else.

So the rule is better stated as: **a hex literal is only acceptable when the
renderer cannot read a CSS variable (WebGL) or the colour belongs to someone
else (a brand).** Anything else is drift.

Note the practical consequence: **a rebrand does not reach the WebGL surfaces
automatically.** Changing `--accent` updates the whole app except the CTA shine
and the login rays, which carry their own copies.

**Dark is the designed mode.** Light mode keeps every token *name* and resolves
the atmospherics — glow, blur, texture, shadow — to nothing, so the same
components render flat. Never build a light-only component or a parallel layout.

---

## 1. Colour

Every row is one token. The dark value is the designed one; the light value is
what the same name resolves to under `data-theme="light"`.

### Surfaces

| Token | Dark | Light | Tailwind | What it is for |
|---|---|---|---|---|
| `--bg` | `#0b0b0c` | `#eef0f2` | `bg-bg`, `text-bg` | The page ground. Also the *text* colour on top of an accent fill. |
| `--card` | `#111113` | `#f7f7f8` | `bg-card` | The default card. One step up from the page. |
| `--card-sunken` | `#0e0e0f` | `#f2f2f3` | `bg-card-sunken` | A card whose own surface is chrome and whose content carries the weight — the calendar grid, where the day cells are the thing being read. |
| `--card-raised` | `#1a1a1b` | `#eeeef0` | `bg-card-raised` | The ground for controls: segmented pills, dropdown triggers, search fields, skeletons. |
| `--border` | `#242426` | `#e4e4e6` | `border-border` | Every 1px edge and every table row rule. |

### Text

| Token | Dark | Light | Tailwind | What it is for |
|---|---|---|---|---|
| `--text-primary` | `#f4f4f5` | `#1b1d21` | `text-text-primary` | Headings, values, anything being read. |
| `--text-muted` | `#8a8a92` | `#515c6b` | `text-text-muted` | Labels, card titles, column heads, inactive controls. The default for chrome. |

### Accent

One accent, three values. **Swapping these three rebrands the app** — that is the
whole point of keeping them to a pair plus a tint.

| Token | Dark | Light | Tailwind | What it is for |
|---|---|---|---|---|
| `--accent` | `#22d3ee` | `#0e7490` | `bg-accent`, `text-accent`, `border-accent` | The one primary action, the selected segment, the single highlighted bar. |
| `--accent-deep` | `#0e9bb5` | `#155e75` | `to-accent-deep` | End stop of the hero gradient, and the CTA's base colour. |
| `--accent-soft` | `rgba(34, 211, 238, 0.12)` | `rgba(14, 116, 144, 0.12)` | `bg-accent-soft` | Tint behind an active sort column or a filter chip. Also the text-selection colour. |

**The cyan is locked.** Garreth confirmed this 2026-09-07. The way to make a
screen calmer is to use the accent *less* — roughly one use per screen — not to
change its hue. Recolouring it would also collide with `--orange` (collapsing)
and `--danger` (banned), which carry meaning rather than style.

Light mode's accent runs a step deeper on purpose: on a near-white ground the
dark-mode cyan reads as washed rather than emphatic.

### Semantic — these carry meaning, never style

A severity ladder. Picking one of these is a statement about state, so do not
reach for `--warn` because a yellow looks nice there.

| Token | Dark | Light | Means |
|---|---|---|---|
| `--ok` | `#4ade80` | `#166534` | Healthy, active, within budget. |
| `--warn` | `#fbbf24` | `#92400e` | Needs attention. Also the stale-data notice. |
| `--orange` | `#fb923c` | `#9a3412` | The step between warn and danger: collapsing, system error. |
| `--danger` | `#f87171` | `#b91c1c` | Banned, failed, or a destructive action. |
| `--danger-deep` | `#dc2626` | `#7f1d1d` | The one state worse than collapsing — shadowbanned. |
| `--info` | `#60a5fa` | `#1d4ed8` | Neutral information, non-urgent. |

### Status-pill palette

A separate, hotter set, and the reason is worth knowing: a small coloured label
on a dark ground needs more saturation than a block of tinted background did. So
pills get their own three hues sitting on **one flat neutral ground**, and only
the label is coloured. A table full of pills then reads as a severity ladder
rather than as a colour chart.

The semantic tokens above are unchanged by this and still serve text, borders,
chart series and alert panels.

| Token | Dark | Light | Used by |
|---|---|---|---|
| `--pill-bg` | `#262627` | `#e4e8ed` | The ground under every pill except `critical`. |
| `--pill-yellow` | `#fff949` | `#6b4f03` | The `warn` pill's label. |
| `--pill-amber` | `#ff9549` | `#8a3f08` | The `orange` pill's label. |
| `--pill-red` | `#ff4949` | `#a11616` | The `danger` pill's label, and the destructive CTA's tint. |

### Chart chrome

Two tokens that exist because Recharts takes colours as strings on props rather
than reading them from the cascade. See §6 for how charts use them.

| Token | Dark | Light | What it is for |
|---|---|---|---|
| `--chart-grid` | `rgba(255, 255, 255, 0.055)` | `rgba(0, 0, 0, 0.06)` | The dashed `CartesianGrid` behind every plot. |
| `--chart-cursor` | `rgba(255, 255, 255, 0.28)` | `rgba(0, 0, 0, 0.32)` | The dashed vertical line that follows the pointer across an area chart. |

**Neither is `--border`, on purpose.** The grid resolves a shade *lighter* than a
row rule — `#1e1e20` against a `#242426` border — and that gap is the reason a
dashed grid sits behind the data rather than competing with it. Pointing it at
`--border` would have strengthened the grid in every chart, which is a change to
the look rather than a refactor.

The light values are black alphas holding the same two relationships: the grid
stays a shade lighter than `--border`, and the cursor lands between the grid and
`--text-muted`. The cursor runs a step deeper than the dark theme's `0.28` for
the same reason every semantic does here — on a near-white ground the mirrored
alpha reads as washed, and a hover crosshair you have to hunt for is not doing
its job.

---

## 2. Material — glass, glow and shadow

This is the part that does not survive being described as a colour list, and the
part a new screen is most likely to get wrong.

**The glow comes first, then the glass.** A blur over a flat fill produces
nothing at all. The light source has to exist before any translucent surface can
read as translucent — which is why the glow layer is a prerequisite and not
decoration, and why a glass card dropped onto a page with no glow looks like a
mistake rather than a style.

### Glass

| Token | Dark | Light | Notes |
|---|---|---|---|
| `--glass` | `rgba(255, 255, 255, 0.045)` | `var(--card)` | The translucent fill. |
| `--glass-border` | `rgba(255, 255, 255, 0.08)` | `var(--border)` | Its edge. |
| `--glass-highlight` | `inset 0 1px 0 rgba(255, 255, 255, 0.09)` | `0 0 #0000` | The lit top lip. An **inset edge, not a border** — light from above catches the top of a panel and fades down its sides. |
| `--glass-blur` | `blur(16px) saturate(1.15)` | `none` | `saturate` stands in for the way glass concentrates colour behind it. |

Applied together by the `.glass` class in `globals.css`.

### Floating panels

Dropdowns, the notification panel, tooltips and every modal. Applied by
`.glass-overlay`.

| Token | Dark | Light | Notes |
|---|---|---|---|
| `--overlay-veil` | `rgba(22, 22, 26, 0.6)` | `var(--card)` | Dense enough to stop live content reading through it — that is the difference from `--glass`. |
| `--overlay-blur` | `blur(14px) saturate(1.6)` | `none` | |
| `--overlay-rim` | `inset 1px 1px 0 rgba(255, 255, 255, 0.11), inset 2px 2px 7px rgba(255, 255, 255, 0.035), inset -1px -1px 0 rgba(255, 255, 255, 0.03), inset -2px -2px 9px rgba(0, 0, 0, 0.28), inset 0 0 26px rgba(255, 255, 255, 0.025), 0 16px 40px rgba(0, 0, 0, 0.45)` | `var(--sh-card)` | Six stacked insets: a bright rim top-left, a dark one bottom-right, and a soft inner wall standing in for 45px of glass thickness. |

These values came from a Figma **GLASS** material (node `5:1245`, "Panel /
Notifications"): fill `#16161a` at 60%, stroke white at 11%, radius 16, blur 14,
depth 45, light angle −45°, light intensity 0.8, refraction 1, dispersion 0.43,
splay 0.09.

CSS has no refractive material, so the mapping keeps what carries the look and
drops what it cannot express. Blur, veil, stroke and radius are exact. Depth and
light angle become the inset shadows above. **Refraction, dispersion and splay
are deliberately not faked** — a coloured fringe drawn by hand reads as a
rendering bug rather than as chromatic aberration.

### The drawer scrim

Its own token pair rather than a reuse of `--overlay-veil`: that veil is a
panel's own fill and has to stay dense enough to read text on, where this one
only has to sink the page behind it.

| Token | Dark | Light | Notes |
|---|---|---|---|
| `--scrim` | `rgba(6, 6, 7, 0.6)` | `rgba(27, 29, 33, 0.32)` | In light mode this is a *shade*, not more white — a pale veil over a pale page reads as a wash rather than as a layer. |
| `--scrim-blur` | `blur(2px)` | `none` | A hint, not the glass treatment. A drawer sliding over a heavily blurred page reads as two competing materials. |

Modals use a simpler scrim written inline: `bg-black/60`.

### Ambient glow

Two tall, heavily blurred ellipses — **light shafts, not a vignette**. Geometry
came from Garreth's Figma edit (node `9:2`, "Background light"): 333×845
ellipses at layer blur 131.

These sit **above** the interface as a thin film, not behind it as a ground,
which is why the alphas are a third of the drawn Figma values (20%/15% → 7%/5%).
A film compounds with everything underneath it; at the drawn strength it washed
the whole page.

| Token | Dark | Light | Notes |
|---|---|---|---|
| `--glow-a` | `rgba(217, 217, 217, 0.07)` | `transparent` | The nearer shaft. |
| `--glow-b` | `rgba(217, 217, 217, 0.05)` | `transparent` | The further one. |
| `--glow-blur` | `131px` | `0px` | |
| `--glow-rail` | `linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent 46%)` | `none` | A 420px band of light at the top of the sidebar rail. |
| `--glow-rail-bottom` | `radial-gradient( 78% 30% at 50% 78%, rgba(217, 217, 217, 0.045), transparent 72% )` | `none` | The rail's second light, placed at 78% height rather than at the bottom edge so the very bottom falls dark again and Settings / Logout stay quiet. Neutral grey, not the accent — this is light, not brand. |

The glow layer must carry `pointer-events: none`. Without it, it sits above the
whole page and swallows every click.

### Texture

| Token | Dark | Light | Notes |
|---|---|---|---|
| `--dot-opacity` | `0.34` | `0` | Halftone dither in a tile's top-right corner, masked diagonally out. Drawn with `currentColor`, so a tile tints its own texture. Applied by `.dot-fade`. |

### Shadow

| Token | Dark | Light | Notes |
|---|---|---|---|
| `--sh-card` | `0 1px 2px rgba(0, 0, 0, 0.4)` | `none` | Every ordinary card. Barely there by design — the border does most of the work. |
| `--sh-hero` | `0 8px 40px rgba(34, 211, 238, 0.22)` | `none` | Only the accent-gradient hero card: coloured light under a coloured surface. |
| `--sb-shadow` | `inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 8px 24px rgba(0, 0, 0, 0.25)` | `0 0 #0000` | `SpecularButton`'s own drop shadow. Note the light value is transparent rather than `none`: it feeds a Tailwind shadow utility that composes it into a comma-separated `box-shadow`, where a literal `none` would invalidate the whole declaration. |

**Light mode has no shadows at all** (Garreth, 2026-08-31). Borders carry the
elevation.

---

## 3. Typography

One family throughout. There is no second display face.

| Property | Value |
|---|---|
| Family | **General Sans** — Fontshare, ITF Free Font License |
| Loading | Self-hosted from `src/app/fonts/GeneralSans-Variable.woff2`, so first paint does not wait on a third party |
| Weights | One variable file covering 200–700 |
| Mono | Geist Mono (Google Fonts) — `--font-mono` |
| Display tracking | `-0.02em` on `h1`, `h2` and `.font-display`. At body sizes the default fit is right. |

Exposed to Tailwind as `--font-sans` and `--font-display`, which resolve to the
same stack: `var(--font-general-sans), ui-sans-serif, system-ui, sans-serif`.

### The ramp

| Role | Tailwind | Size / line | Weight |
|---|---|---|---|
| Page title | `text-xl font-semibold` | 20 / 28 | 600 |
| Section heading | `text-base font-semibold` | 16 / 24 | 600 |
| Card title | `text-base font-medium text-text-muted sm:text-sm` | 16 / 24 → 14 / 20 | 500 |
| Sub-heading | `text-sm font-semibold` | 14 / 20 | 600 |
| Overline | `text-xs font-semibold tracking-wide uppercase text-text-muted` | 12 / 16 | 600 |
| Body | `text-sm` | 14 / 20 | 400 |
| Secondary | `text-xs` | 12 / 16 | 400–500 |
| Hint | `text-[11px]` | 11 / 15 | 400 |
| Micro | `text-[10px] font-semibold` | 10 / 14 | 600 |

The card title is a step larger on a phone for a reason: at 14px the card's own
name was quieter than everything inside it, so a scrolling reader lost track of
which card they were in.

**10px is the floor.** Below that a label stops being read and becomes texture.
If something needs to be smaller to fit, the layout is wrong, not the type.

**Every number carries `.tnum`** (`font-variant-numeric: tabular-nums`).
Proportional digits make a column jitter as values change, which is exactly where
the eye is trying to compare. Right-align numeric table columns.

---

## 4. Space and radius

Tailwind's default 4px scale, with only a handful of steps in real use.

| Step | px | Where |
|---|---|---|
| `0.5` | 2 | Segmented-control track padding, pill vertical padding |
| `1` | 4 | Icon-to-label gap, chip internals |
| `2` | 8 | Control gaps |
| `2.5` | 10 | Pill horizontal padding, nav row gap |
| `3` | 12 | **Card-to-card gap** on every page |
| `3.5` | 14 | Search field and dropdown horizontal padding |
| `4` | 16 | Button horizontal padding, header column gap |
| `5` | 20 | **Card padding** (`p-5`), and title-to-content gap (`gap-5`) |
| `6` | 24 | Page padding (`px-6 py-6`), dialog padding |

### Radius

| Token | Value | Tailwind | Where |
|---|---|---|---|
| `--radius-card` | `24px` | `rounded-card` | Cards and dialogs |
| `--radius-nested` | `16px` | `rounded-nested` | Anything inside a card: notices, dropdown panels, steppers, tooltips, skeletons, nav rows |
| — | `999px` | `rounded-full` | **Every control** |
| — | `10px` | `rounded-[10px]` | The nav icon square |
| — | `4px` | `rounded-[4px]` | The barcode bar |

Both radius tokens live in `globals.css` under `@theme inline` rather than
`:root`, because Tailwind reads them from there.

**The nesting rule: 24 outside, 16 inside, pill for anything you click.** That
last part is what separates "a control" from "a surface" at a glance.

---

## 5. Component recipes

The exact class strings, so a new screen composes rather than re-derives. Each
one also renders in `docs/design-system.html`.

### Surfaces

```
Card              rounded-card p-5 border border-border shadow-card bg-card
Card sunken       rounded-card p-5 border border-border shadow-card bg-card-sunken
Card glass        rounded-card p-5 glass
Card hero         rounded-card p-5 border border-accent/40 bg-linear-135
                  from-accent to-accent-deep shadow-hero
Floating panel    rounded-nested border border-border glass-overlay p-3
Modal scrim       fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4
Modal panel       w-full max-w-lg rounded-card border border-border glass-overlay p-6
```

### Controls

```
Primary action    <CtaButton tone="accent">   — one per screen
Destructive       <CtaButton tone="danger">
Secondary         rounded-full border border-border bg-card-raised px-3.5 py-1.5
                  text-xs font-medium text-text-muted transition-colors
                  hover:text-text-primary
Ghost             rounded-full px-4 py-1.5 text-sm font-medium text-text-muted
                  hover:text-text-primary disabled:opacity-40
Destructive hold  <HoldButton tone="danger">  — 1100ms, aborts on early release
Status pill       inline-flex items-center rounded-full px-2.5 py-0.5 text-xs
                  font-medium whitespace-nowrap  + bg-pill-bg text-{tone}
Segmented track   no-scrollbar flex items-center gap-0.5 overflow-x-auto
                  rounded-full bg-card-raised p-0.5
Segment selected  rounded-full px-3 py-1 text-xs font-medium bg-accent text-bg
Sort active       rounded-full px-3 py-1 text-xs font-medium bg-accent-soft text-accent
Filter chip       rounded-full bg-accent-soft py-1 pr-1 pl-2.5 text-xs font-medium
                  text-accent
Search field      rounded-full border border-border bg-card-raised px-3.5 py-1.5,
                  bare input, placeholder:text-text-muted
Dropdown trigger  rounded-full border border-border bg-card-raised px-3.5 py-1.5
                  text-xs font-medium text-text-muted
Stepper           rounded-nested border border-border bg-bg/60, 28px side buttons,
                  border-x on the value, .tnum
```

### Data

```
Table             w-full text-sm [&_td]:pr-4 [&_th]:pr-4
                  [&_td:last-child]:pr-0 [&_th:last-child]:pr-0
Table head row    text-left text-xs text-text-muted
Table head cell   pb-2 font-medium
Table body row    border-t border-border
Numeric cell      text-right tnum
Progress bar      h-3.5 rounded-[4px] bg-text-muted/20, fill masked
                  linear-gradient(to left, #000 0 12px, transparent 44px)
Skeleton          animate-pulse rounded-nested bg-card-raised
Stale notice      role="status" flex items-start gap-2 rounded-nested bg-warn/10
                  px-3 py-2 text-xs text-warn
```

### Status-pill tones

Nine tones, all on `bg-pill-bg` except one.

| Tone | Classes | Reads as |
|---|---|---|
| `ok` | `bg-pill-bg text-ok` | Active, healthy |
| `accent` | `bg-pill-bg text-accent` | Ramping |
| `info` | `bg-pill-bg text-info` | Scheduled, informational |
| `gray` / `neutral` | `bg-pill-bg text-text-muted` | Paused, none |
| `warn` | `bg-pill-bg text-pill-yellow` | Throttled |
| `orange` | `bg-pill-bg text-pill-amber` | Collapsing |
| `danger` | `bg-pill-bg text-pill-red` | Banned |
| `critical` | `bg-danger-deep text-white` | Shadowbanned — **the only solid pill** |

No leading dot on any of them. The tone already carries the state; a coloured dot
in front of a coloured label was saying it twice.

---

## 6. Charts

Three files draw charts, all with `recharts`:

| File | What it draws |
|---|---|
| `dashboard/analytics-charts.tsx` | The fleet page — the views trend, the metric-tile sparklines, avg views by character |
| `dashboard/account-analytics-view.tsx` | The same patterns for one account |
| `dashboard/account-detail-tabs.tsx` | Composes the above; no chart colours of its own |

The rules below were in the code and nowhere else until 2026-09-12. Nothing here
is new — it is what shipped, written down.

### Series colour is the platform

**`--accent` is TikTok. `--info` is Instagram.** Everywhere, without exception.

This is the one rule to keep if you keep only one. It is why a reader can glance
at any chart on any page and know which line is which without consulting a
legend, and it is why a chart must never pick its series colours for contrast or
variety. A new platform gets a new token; it does not get to borrow `--ok`.

```
<Area dataKey="tiktokViews"    stroke="var(--accent)" fill="url(#ttG)" />
<Area dataKey="instagramViews" stroke="var(--info)"   fill="url(#igG)" />
```

The legend dots and the per-platform figures above the plot use the same two
variables, so the legend cannot drift from the lines it labels.

### Area fills

Each series is filled with a vertical gradient **of its own stroke colour**,
`stopOpacity` 0.2 at the top to 0 at the axis:

```
<linearGradient id="ttG" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%"   stopColor="var(--accent)" stopOpacity={0.2} />
  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
</linearGradient>
```

**A divergence worth knowing about.** The 2026-09-07 overhaul notes asked for
*"dotted chart grids with no area fills."* The shipped charts have dashed grids
and they do have fills. The code is what Garreth has been reading for weeks, so
**the code is the intent** and the note is the stale half. Recorded here rather
than quietly corrected in either direction — but do not change a chart's
appearance to close the gap without asking.

Gradient ids are document-global in SVG, which is a real trap: the per-account
sparklines carry an `acct-sp-` prefix precisely so they do not collide with the
fleet page's `sp-`. Any new gradient needs its own prefix.

### Grid and cursor

| | Value | Why |
|---|---|---|
| Grid | `stroke="var(--chart-grid)"` `strokeDasharray="2 4"` | Dashed and very low contrast. A grid is a measuring aid, not content. |
| Hover cursor | `stroke="var(--chart-cursor)"` `strokeDasharray="2 4"` | A vertical line on the same dash, so it reads as the grid lighting up rather than as a new object. |
| Bar cursor | `cursor={{ fill: "var(--card-raised)" }}` | A block, not a line — a bar already owns its column, so the highlight is the column. |
| Active dot | `r={4}` `strokeWidth={2}` `stroke="var(--bg)"` | The page colour as the ring, so the dot sits on the line rather than in it. |

`--chart-grid` and `--chart-cursor` are documented in §1. They exist because
Recharts takes colours as props rather than reading them from the cascade, and
until 2026-09-12 they were hardcoded white alphas that did not survive the light
theme.

The bar chart has **no grid at all** — bars are read against each other and
against their own labels, so gridlines only add ink.

### Axis labels

X axis is `interval="preserveStartEnd"` with `minTickGap={28}`, so labels thin
out as the range widens rather than overlapping.

The Y axis is the unusual one, and it is deliberate:

```
tick={(props) => (
  <text x={0} textAnchor="start" fill="var(--text-muted)" fontSize={11}>…</text>
)}
```

Recharts right-aligns Y labels against the axis line by default, which inset
them from the card edge and left them floating in the middle of the card's left
padding. **Anchoring at `x=0` lines them up with the card title instead.** The
plot keeps its own left/right gutter (`-mb-5` on the wrapper, `padding` on the
XAxis) so nothing runs into the card edge.

Values are formatted by `compact()` — `1.2M`, `34.5k`, or the plain integer
below 1,000. Every axis and every tooltip figure is tabular (`tnum`).

### Bars

One accent, no rainbow:

```
<Bar dataKey="avgViews" radius={[6, 6, 0, 0]} isAnimationActive={false}>
  {data.characters.map((c) => <Cell key={c.character} fill="var(--accent)" />)}
</Bar>
```

The categories are peers — five characters, no ranking beyond their height — so
colour carries no information and giving each one its own hue would invent a
meaning that is not there. `barCategoryGap="18%"`.

### Sparklines

The metric tiles carry a 28px line whose colour is its direction, not its
platform:

| Delta | Tone |
|---|---|
| Rising | `--ok` |
| Falling | `--danger` |
| Flat or unknown | `--text-muted` |

Every metric on these tiles reads better when it rises, so up is green
throughout and no tile needs to invert the mapping. Stroke is `1.5`, `dot={false}`,
gradient `0.18 → 0`, and `-mx-4` cancels the tile's padding so the line runs edge
to edge.

**One bucket draws nothing.** A single data point has no shape, and a flat line
across a tile looks like a finding rather than an absence. The fleet trend does
the same thing at a larger scale: fewer than two buckets and it prints
"Only one day of posts in this range" instead of a plot.

### Tooltip

`glass-overlay rounded-nested border border-border px-3 py-2` — the same
floating-panel material as every other overlay. Label in `text-text-muted`, rows
as name-then-value with the value pushed right and tabular.

---

## 7. Icons

| | |
|---|---|
| Family | `@phosphor-icons/react`, wrapped and renamed in `src/components/ui/icons.tsx` |
| Import from | That module, **never** the package directly — so a weight change is one edit |
| House weight | `fill` |
| Colour | Always `currentColor`. An icon inherits its row's state colour and never carries its own. |
| Sizes | `size-3` (12px) inline with text · `size-3.5` (14px) in controls · `size-4` (16px) in the nav icon box |

Four glyphs are exceptions, because fill destroys them rather than restyling
them: `CircleNotch` (a filled disc spins as a dot, not a spinner), the **carets**
(solid wedges read as a shape rather than a direction — these use `bold`), `X` (a
close affordance wants two thin strokes, not a slab), and `Plus` / `Minus`
(filled signs read as knocked out of a block, which makes a stepper look like two
buttons stamped onto the control instead of two marks inside it).


### Identity marks

Three components draw something other than a Phosphor glyph. All three render in
`docs/design-system.html` §Icon.

| Component | File | What it is |
|---|---|---|
| `PeptideMark` | `ui/peptide-mark.tsx` | The atom from the logo, icon-only. `currentColor`, so it is white on dark and dark on light without a second asset. |
| `TikTokIcon` / `InstagramIcon` | `ui/brand-icons.tsx` | The platform glyphs. Also `currentColor` — they take their row's state colour like any other icon. |
| `Avatar` / `AvatarFallback` | `ui/avatar.tsx` | The account photo, and the silhouette drawn when there isn't one. |

**The brand glyphs are `currentColor`, not brand-coloured.** That surprises
people, so it is worth saying plainly: the one place a brand hex appears is
`accounts/[profile]/page.tsx`, where the Instagram mark is `text-[#E4405F]`
because it is identifying the platform rather than labelling a row's state. A
brand asset is not ours to tokenise — see "Two non-negotiables" — but it is also
not the default.

**`Avatar` falls back on `onError`, not only on a null `src`.** This is the part
worth knowing, because the obvious implementation is wrong here: the platforms
hand out **signed CDN URLs that expire in a day or two**, so a URL we hold can be
perfectly well-formed and still answer 403. A plain `<img>` renders that as the
browser's broken-image glyph, which reads as a bug in the dashboard rather than
as an expired link.

The fallback is drawn rather than imported — a disc of `--card-raised` with a
`--text-muted` figure clipped to it — so it follows the theme instead of being a
fixed grey, and it is the same pairing every empty state uses.

### Not part of the design system

Two components under `ui/` are deliberately **not** documented here, so nobody
reads their absence as an oversight:

| Component | Why not |
|---|---|
| `SectionStub` | Scaffolding. It marks a page that has not been built yet and is deleted as each one lands — documenting it would give a temporary thing the standing of a pattern. |
| `SideRays` | Decoration on the login screen only. It is WebGL, owns its own colours as hex props (already listed under "Two non-negotiables"), and there is nothing about it to reuse. |


---

## 8. Figma mapping

The same system exists on the **Design System** page of the
`Peptide Miracles App` Figma file. Collections and names map one-to-one so a
value can be traced in either direction.

### Variable collections

| Collection | Modes | Holds | Maps to |
|---|---|---|---|
| `Primitives` | `Value` | 53 raw values — 39 solids and 14 alpha | Nothing directly. Hidden from every picker and from publishing, because the app never references a raw value. |
| `Color` | **`Dark`** / `Light` | 29 semantic tokens, every one an alias | `:root` and `:root[data-theme="light"]` |
| `Radius` | `Value` | 5 | `--radius-card`, `--radius-nested`, and the three literals |
| `Spacing` | `Value` | 9 | Tailwind's scale |
| `Typography` | `Value` | 18 | font family, 7 sizes, 7 line heights, 3 weights |

Naming is `color/<group>/<role>` — `color/surface/card`, `color/text/primary`,
`color/pill/red`. Every semantic variable carries its real CSS name as **web
code syntax**, so Dev Mode emits `var(--card)` rather than a hex.

Two naming notes that will otherwise look like mistakes:

- **Spacing variables are named in px** (`spacing/12`), not by Tailwind step,
  because Figma rejects a dot in a variable name and `spacing/2.5` is not
  allowed. The Tailwind step is in each variable's description.
- **Primitive steps are assigned by lightness within the *semantic* family the
  value serves**, not by hue. `#9a3412` is `orange/700` because it is the
  light-mode "collapsing" colour, even though its hue reads closer to red. A
  purely algorithmic ramp filed it under red, which is a name that contradicts
  its meaning.

Two tokens exist in Figma with no CSS custom property — `color/status/danger-soft`
(`bg-danger/25`, the press-and-hold ground) and `color/status/warn-soft`
(`bg-warn/10`, the stale-notice and running-long ground). In code both are
Tailwind opacity modifiers rather than variables, but Figma needs a concrete
value to bind, and paint-level opacity does not survive instancing.

It now runs the other way too. **`--chart-grid` and `--chart-cursor` exist in CSS
with no Figma variable**, because they were added on 2026-09-12, after the
snapshot was frozen. The `114` on the Figma cover is the count of *Figma*
variables and stays 114; it was never the count of CSS custom properties, which
is why the two numbers no longer move together. Anything added from here on
widens that gap by design — see "Figma is frozen" at the top of this file.

### Styles

**Effect styles** — `Shadow/Card`, `Shadow/Hero`, `Glass/Highlight`,
`Glass/Blur`, `Overlay/Rim`, `Overlay/Blur`. Figma has no `saturate()` on a
background blur, so the blur radii are exact and the slight colour
concentration in `--glass-blur` / `--overlay-blur` is not reproduced.

**Text styles** — the ten-step ramp: `Display/Page title`, `Heading/Section`,
`Heading/Card`, `Heading/Sub`, `Label/Overline`, `Body/Default`, `Body/Small`,
`Label/Control`, `Body/Hint`, `Label/Micro`. Each has its font family, size and
line height bound to the Typography variables.

### Components

Seven component sets plus two standalone components, all fully token-bound:

| Component | Variants | Properties |
|---|---|---|
| `StatusPill` | 8 tones — Ok, Accent, Info, Neutral, Warn, Orange, Danger, Critical | `Label` (text) |
| `Button` | 5 kinds — Primary, Secondary, Ghost, Destructive, Hold | `Label` (text) |
| `Card` | 4 surfaces — Default, Sunken, Glass, Hero | — |
| `Input` | 2 kinds — Search, Text | `Placeholder` (text) |
| `EmptyState` | 3 kinds — First run, No results, All clear | — |
| `WorkingState` | 4 kinds — Indeterminate, Progress, Running long, Slides | — |
| `Dropdown` | 2 kinds — Trigger, Panel | `Label` (text) |

Plus two standalone components: `Dialog`, which assembles the modal shape from the others, and `Tooltip`.

A variant grid can only ever show **one** value for a text property, so every
variant of `StatusPill` reads "Label". The severity ladder with its real words
sits beneath the set as instances — that row is the specimen; the set is the
API.

`Button/Primary` and `Button/Destructive` use gradients with hard-coded hex
stops and do **not** follow the Color mode. That is faithful rather than sloppy:
`CtaButton` draws its shine in WebGL via `ogl`, which cannot parse `var()`, so
it is the one hard-coded-colour exception in the codebase too.

Still only in `docs/design-system.html`, not yet in Figma: the segmented filter
control, sort button, filter chip, stepper, table pattern, barcode bar,
skeleton, stale notice and sidebar nav row.

The Figma **Icon & Overlay** board carries the icon set, the size scale and the
four fill exceptions as documentation — icons are a convention, not a component.

**Font: General Sans, applied by hand (2026-09-12).**

The whole page is on the real face — 188 text layers, none left on the
stand-in. Figma renders it correctly.

Three things to know if this is ever redone:

- **An agent driving Figma over MCP cannot set it.** That connection lists 1,938
  font families and every one is a Google Font; it sees no locally installed
  faces. `loadFontAsync` fails with *"the font family General Sans does not
  exist"* for every weight. It can render the font but not write it, so this
  step is always manual.
- **Setting a font by hand drops the variable binding.** The ten text styles are
  no longer bound to `typography/font-family/sans`. That variable holds the
  right value and is now documentation, not a control — changing it will not
  repoint anything.
- **Changing a family in Figma can flatten every weight to Regular.** It did
  here, and the hierarchy had to be rebuilt by hand afterwards.

**The Figma library runs one weight lighter than the app in three places.**
Medium was not applied in the final pass, so where the app uses `font-medium`
(500), Figma uses Regular (400):

| | App | Figma |
|---|---|---|
| Card title | 500 | Regular |
| Control labels (pills, buttons, chips) | 500 | Regular |
| Rule lines and cover figures | 500 | Regular |

This is cosmetic and confined to the reference boards — no component and no
token is affected. `globals.css` remains the authority on weight; if the Figma
boards are ever rebuilt, set these three to Medium.

Figma text styles as built: Display/Page title, Heading/Section, Heading/Sub,
Label/Overline and Label/Micro are **Semibold**; the rest are **Regular**.

---

## 9. The rules that are not values

No token can record these, and a new screen gets them wrong without being told.

1. **Never hardcode a hex value in a component.** One documented exception,
   `CtaButton`, for the WebGL reason above.
2. **One accent use per screen, near enough.** The accent marks the single thing
   the screen is asking you to do.
3. **Dark is designed; light is the same markup gone flat.** No light-only
   components.
4. **No instruction text on a screen.** Format goes in the placeholder, caution
   goes in the press-and-hold gate, explanation goes in the code comment and the
   changelog. Echo back what was understood rather than explaining what to do.
   Warnings that state what every operator already knows get cut.
5. **Every number is tabular,** and numeric columns are right-aligned.
6. **Destructive actions are press-and-hold, not type-to-confirm.** No label
   explaining it — a plain click visibly starts the fill and lets it fall back,
   which is the whole instruction.
7. **Glass needs glow.** A translucent surface on a page with no light source
   renders as a flat grey box.
8. **Controls are pills; surfaces are 24 outside and 16 inside.**
9. **A limit in the UI is the real limit.** Steppers cap at what the budget
   actually has left, so nobody can save a number the scheduler will silently
   refuse.
10. **Say what is missing, not that something failed.** A degraded panel states
    the age of what is shown and what is therefore absent, so the reader can
    judge whether to act on it.
11. **No scrollbars anywhere — so imply the scroll with content.** Track and
    thumb are hidden globally, which removes the only passive hint that a region
    scrolls. A scrollable region has to *look* cut off. A panel that ends on a
    clean edge and looks complete when it is not is the failure mode to watch
    for.
12. **Every change gets a `CHANGELOG.md` entry in the same pass,** in plain
    English, with provenance.

---

## 10. For the Carousel Generator

The feature is a V2 item in `BACKLOG.md`; its backend — the seven
content-intelligence tables — is still empty. When the UI gets built, it adds
nothing to this system. Specifically:

- A slide is a **card**: `rounded-card p-5 bg-card border border-border`. A slide
  being edited is the same card with `.glass`.
- Slide order, counts and character limits are **numbers**, so `.tnum`.
- "Generate" is the screen's one accent action, so it is the only `CtaButton` on
  the page. Regenerate, discard and reorder are secondary pills.
- Draft / generating / approved / failed map onto the existing pill tones
  (`neutral`, `accent`, `ok`, `danger`) — do not introduce a new colour for a new
  state word.
- A destructive step — discarding a draft, overwriting an approved carousel — is
  a `HoldButton`, with no warning paragraph above it.
### Empty and Working — added 2026-09-12

Both states the generator needs now exist, in the HTML page (§State) and as
Figma component sets.

**Empty is three states, not one.** Conflating them is the usual mistake:

| Kind | When | Exit |
|---|---|---|
| First run | Nothing created yet | The screen's single accent action |
| No results | A filter or search matched nothing | Secondary — and it echoes the filters back rather than explaining them |
| All clear | Nothing to report, and that is good | None. It spends `--ok` and offers no action |

No explanatory line on any of them — the button label carries the verb.

**Working is not loading.** Loading fetches something that exists; generating
makes something that does not, and it can take a minute.

| Kind | Shows |
|---|---|
| Indeterminate | A travelling sweep, not a fill — there is no honest percentage yet |
| Progress | Named steps, elapsed time, `N of M`, and a way out |
| Running long | The bar turns `--warn` and it states what has stalled **and when it last moved** |
| Slides | Once the count is known, the shape — filled in as each lands |

`Running long` is the one that matters. This project has been bitten by work
that reported success and did nothing; a spinner that turns forever is how that
failure hides. Saying *when something last moved* is the difference between
catching a stall in thirty seconds and catching it tomorrow.
