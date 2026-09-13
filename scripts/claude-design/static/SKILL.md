---
name: peptide-miracles-dashboard-design
description: Use this skill to design screens and assets for the Peptide Miracles Dashboard, an internal, dark-first operations tool for a fleet of TikTok and Instagram accounts. Contains the colour, material, type and spacing tokens, the rules that are not values, and preview cards.
user-invocable: true
---

Read readme.md first, then explore the token files and the guideline cards.
If creating visual artifacts (mocks, throwaway prototypes), link `styles.css` and build static HTML. For production code, the dashboard's own `src/app/globals.css` is the source of truth; this project restates it.
If the user invokes this skill without other guidance, ask what screen or state they want to design, then act as an expert designer working inside this system.

## Quick reference
- **Mode:** dark is designed. Light is the same markup and token names gone flat (no glow, blur, texture or shadow). Toggle with `data-theme="light"`.
- **Tokens:** link `styles.css`. Use the custom properties, never raw hex.
- **Accent:** one cyan, `--accent` `#22d3ee`. Locked. About one use per screen: the single primary action, the selected segment, the one highlighted bar.
- **Semantic colours carry meaning:** ok → warn → orange → danger → danger-deep, plus info. Never use one for decoration.
- **Material:** glow first, then glass. `.glow-layer`, `.glass`, `.glass-overlay`, `.dot-fade`.
- **Shape:** 24px outside, 16px inside, pill for anything you click.
- **Type:** General Sans throughout, `.t-*` ramp classes, 10px floor, every number `.tnum`.
- **Charts:** TikTok is `--accent`, Instagram is `--info`, always.
- **Voice:** no instruction text on screens. Say what is missing, not that something failed.
- **Components:** load `_ds_bundle.js`, then `const { DashCard, CtaButton, StatusPill, … } = window.PeptideMiraclesDashboard_26e60f`. Each has a `.prompt.md`. Controls work without props for mocks (they hold their own state).
