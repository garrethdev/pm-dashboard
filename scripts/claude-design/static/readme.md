# Peptide Miracles Dashboard Design System

**Peptide Miracles Dashboard** is an internal operations tool for running a fleet of TikTok and Instagram accounts: posting schedules, content inventory, account health and analytics. A small team uses it every day, mostly on desktop and sometimes on a phone.

The interface is dark, calm and data-dense. Neutral near-blacks are lit by a faint ambient glow, glass surfaces borrow that light, one cyan accent marks the thing to do, and a ladder of status colours always means something.

**Source of truth.** Every value here is copied from the dashboard's code (`src/app/globals.css`). If this project and the app ever disagree, the app is right. Don't edit token values here; they get re-synced from the code.

---

## Content fundamentals

- **No instruction text on a screen.** Format goes in the placeholder, caution goes in the press-and-hold gate. No helper paragraphs explaining what to do.
- **Echo back, don't explain.** A search that matched nothing repeats the filters rather than describing how filters work.
- **Say what is missing, not that something failed.** A degraded panel states the age of what it shows and what is therefore absent, so the reader can judge whether to act.
- **Cut warnings that state what every operator already knows.**
- **Sentence case** for titles, labels and buttons. Uppercase only for overlines (small, semibold, wide tracking, muted).
- **State words are fixed.** Active, Ramping, Scheduled, Paused, Throttled, Collapsing, Banned, Shadowbanned. A new state maps onto an existing tone instead of getting a new colour.
- **Numbers:** compact on axes and tiles (`1.2M`, `34.5k`, the plain integer below 1,000), always tabular, right-aligned in tables.
- **Working, not loading.** Long-running work shows named steps, elapsed time and `N of M`. When it runs long, it says what stalled and when it last moved.

## Visual foundations

- **Dark is the designed mode.** Grounds step up from `--bg` to `--card` to `--card-raised` (the ground for controls). Text has two tones only: `--text-primary` for anything being read, `--text-muted` for labels and chrome.
- **Accent.** One bright cyan, `--accent` `#22d3ee`, and it is locked. Ration it to about one use per screen: the single primary action, the selected segment, the one highlighted bar. A calmer screen uses it less; it never changes hue.
- **Semantic colours are a severity ladder:** `--ok` → `--warn` → `--orange` → `--danger` → `--danger-deep`, plus `--info`. Picking one is a statement about state. Never reach for one because the colour looks nice.
- **Status pills** sit on one flat `--pill-bg` ground with only the label coloured, and have no leading dot. Their hues (`--pill-yellow`, `--pill-amber`, `--pill-red`) run hotter than the semantics so small labels stay readable. Shadowbanned is the only solid pill.
- **Glow comes first, then glass.** A blur over a flat fill shows nothing, so the light source has to exist first. Two tall, heavily blurred ellipses sit *over* the page as a thin film (`.glow-layer`, `pointer-events: none`). The sidebar rail has its own top band and low bloom (`.rail-glow`).
- **Glass** (`.glass`): a faint white fill, a hairline edge, an inset top highlight (light catching the top lip, not a border) and a background blur.
- **Floating panels** (`.glass-overlay`): dropdowns, tooltips, the notification panel and modals. A denser veil, so live content doesn't read through, with a six-layer lit rim.
- **Texture** (`.dot-fade`): a halftone dither in a tile's top-right corner that fades diagonally out. It is drawn with `currentColor`, so a tile tints its own texture.
- **Elevation** is barely there. `--sh-card` is a 1–2px shadow and the border does most of the work. The hero card (accent gradient) is the only coloured shadow.
- **Light mode** keeps the same markup and token names and goes flat: no glow, blur, texture or shadows, with borders carrying elevation. Accent and semantics run a step deeper for contrast. Never design a light-only component.
- **Shape.** Cards and dialogs are 24px. Anything inside a card is 16px. Every control is a pill. *24 outside, 16 inside, pill for anything you click.*
- **Space.** A 4px scale: 12px between cards, 20px card padding, 24px page padding.
- **No scrollbars anywhere.** Because the scrollbar is gone, a scrollable region has to *look* cut off: a card row cut mid-card, a table that clearly continues.
- **Motion.** The mobile nav drawer slides with `cubic-bezier(0.32, 0.72, 0, 1)` over 280ms, moving `transform` only. Reduced motion drops the slide and keeps the scrim's fade.

## Type

General Sans (variable, 200–700) for everything. Geist Mono for code-like values. Page titles and section headings get `-0.02em` tracking.

| Role | Class | Size / line | Weight |
|---|---|---|---|
| Page title | `.t-page-title` | 20 / 28 | 600 |
| Section heading | `.t-section` | 16 / 24 | 600 |
| Card title | `.t-card-title` | 14 / 20, 16 / 24 on phones | 500, muted |
| Sub-heading | `.t-sub` | 14 / 20 | 600 |
| Overline | `.t-overline` | 12 / 16 | 600, uppercase, muted |
| Control label | `.t-control` | 12 / 16 | 500 |
| Body | `.t-body` | 14 / 20 | 400 |
| Secondary | `.t-secondary` | 12 / 16 | 400 |
| Hint | `.t-hint` | 11 / 15 | 400 |
| Micro | `.t-micro` | 10 / 14 | 600 |

10px is the floor. If something needs to be smaller to fit, the layout is wrong. Every number carries `.tnum`.

## Charts

- **Series colour is the platform.** TikTok is `--accent`, Instagram is `--info`, on every chart, without exception. A new platform gets a new token.
- **Area fills** are a vertical gradient of the line's own colour, 20% opacity at the top fading to 0.
- **Grid** is dashed (`2 4`) in `--chart-grid`. The hover cursor is a vertical line on the same dash in `--chart-cursor`, so it reads as the grid lighting up. Bar charts have no grid.
- **Bars** use one accent for every bar, with a 6px top radius. The categories are peers, so colour carries no meaning.
- **Sparklines** are coloured by direction: rising `--ok`, falling `--danger`, flat `--text-muted`. A single data point draws nothing.
- **Tooltips** use the floating-panel material.

## Iconography

- Phosphor icons in the **fill** weight, always `currentColor`, so an icon takes its row's state colour.
- Sizes: 12px inline with text, 14px in controls, 16px in the nav icon box.
- Four glyphs are exceptions because fill destroys them: the spinner (CircleNotch), carets (bold), X, and Plus/Minus.
- The TikTok and Instagram glyphs are also `currentColor`, not brand-coloured.
- Draw them with `<Icon name="Search" size={14} />`, using the app's own names. The Icons card lists them all.

## Components

Load `_ds_bundle.js` after React, then take what you need from `window.PeptideMiraclesDashboard_26e60f`. Each component has a `.prompt.md` with usage, and its styles come in through `styles.css`. Controls such as `FilterPills`, `SearchInput`, `Stepper` and `Dropdown` hold their own state when given no value, so they work in mocks as they are.

| Group | Components |
|---|---|
| Surfaces | `Card` (default, sunken, glass, hero), `DashCard` |
| Buttons | `CtaButton`, `HoldButton`, `Button` (secondary, ghost), `ExtendButton`, `SortButton` |
| Pills | `StatusPill`, `FilterPills`, `FilterChips` |
| Forms | `SearchInput`, `Dropdown`, `Stepper` |
| Feedback | `Tooltip`, `StaleNotice`, `Skeleton`, `CardSkeleton`, `TableSkeleton` |
| Data | `BarcodeBar` |
| Identity | `Avatar`, `AvatarFallback`, `PeptideMark`, `TikTokIcon`, `InstagramIcon`, `Icon` |

The recipes the components are built from, for anything composed by hand:

- **Card:** 24px radius, 20px padding, `--card`, `--border`, `--sh-card`. Variants: sunken (`--card-sunken`), glass (`.glass`), hero (accent → accent-deep gradient, `--sh-hero`).
- **Primary action:** one per screen, accent. **Destructive:** press-and-hold (1100ms, lets go early to cancel) in danger, with no warning paragraph.
- **Secondary button:** bordered pill on `--card-raised`, 12px medium muted label, brightens to primary on hover. **Ghost:** no border or fill.
- **Segmented control:** `--card-raised` pill track, 2px padding. The selected segment is an accent fill with `--bg` text. **Active sort / filter chip:** `--accent-soft` ground with accent text.
- **Search field and dropdown trigger:** bordered pill on `--card-raised`.
- **Table:** 14px body, 12px muted column heads, `--border` row rules, numeric cells right-aligned and tabular.
- **Skeleton:** pulsing `--card-raised` block, 16px radius. **Stale notice:** warn text on a 10% warn ground, 16px radius.
- **Empty states** are three different things: *First run* (the screen's accent action), *No results* (a secondary action that echoes the filters) and *All clear* (spends `--ok`, offers no action).
- **Working states:** *Indeterminate* (a travelling sweep, not a fill), *Progress* (named steps, elapsed time, `N of M`, a way out) and *Running long* (the bar turns `--warn` and states what stalled and when it last moved).

---

## Index

**Foundations**
- `styles.css`: the global entry point to link. It imports the token files below.
- `tokens/colors.css`: surfaces, text, accent, semantic, status pills, chart chrome (dark and light).
- `tokens/material.css`: glass, floating panels, scrim, glow, texture, shadow (dark and light).
- `tokens/typography.css`: the type ramp as tokens and `.t-*` classes.
- `tokens/spacing.css`: space scale and radius.
- `tokens/fonts.css`: General Sans (self-hosted) and Geist Mono.
- `tokens/utilities.css`: `.glass`, `.glass-overlay`, `.glow-layer`, `.rail-glow`, `.dot-fade`, `.tnum`, base body and heading rules, hidden scrollbars.
- `guidelines/*.card.html`: preview cards for the Design System tab.

**Components** (`components/<group>/`, namespace `window.PeptideMiraclesDashboard_26e60f`)
- `components/components.css`: every component's styles, ported from the app's Tailwind classes.
- `surfaces/`, `buttons/`, `pills/`, `forms/`, `feedback/`, `data/`, `identity/`, `icon/`: each component as `.jsx` with `.d.ts` props and a `.prompt.md`, plus one preview card per group.

**Assets**
- `assets/fonts/GeneralSans-Variable.woff2` and its licence.

**Other:** `SKILL.md` (the Agent Skills wrapper). `_ds_bundle.js`, `_ds_manifest.json` and `_adherence.oxlintrc.json` are generated by Claude Design; never edit them.

## Notes

- **Round 1 (2026-09-13):** foundations (tokens, font, preview cards, this guide).
- **Round 2 (2026-09-13):** components, ported from `src/components/ui/`. Icons and the logo and platform marks are generated from the app's source, so their shapes are exact. Two parts of the app are deliberately left out: `SectionStub`, which is temporary scaffolding, and `SideRays`, the login-screen decoration.
- **`CtaButton` is an approximation.** In the app, a white streak of light follows the pointer around the button's edge, drawn in WebGL. Here the rim brightens on hover instead. Colours, shape and size match.
- **Light mode selector.** The token files also match any element with `data-theme="light"`, not just the root, so a preview can show both modes side by side. The app itself only sets it on `<html>`.
- **Not reproduced:** the WebGL shine on the primary and destructive buttons and the rays on the login screen. Both are drawn in WebGL with their own colour values.
