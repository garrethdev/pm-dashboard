# Claude Design sync

This folder builds the copy of the design system that lives in Claude Design:
project **Peptide Miracles Dashboard**,
https://claude.ai/design/p/26e60fcd-6395-4289-8b68-e9854a21b799.

`src/app/globals.css` is still the source of truth. This folder only makes a copy
of it in the shape Claude Design reads.

## What is here

| File | What it does |
|---|---|
| `build.mjs` | Reads the app and writes the upload bundle to `dist/`. The colour and material tokens and the shared classes (`.glass`, `.glow-layer`, …) are read out of `globals.css`. The 65 icons, the logo mark and the TikTok/Instagram glyphs are generated from `src/components/ui/`, so no value or shape is retyped. |
| `verify.mjs` | Checks `dist/` before upload. Every token must match `globals.css` and every `var()` must resolve. In components, there must be no raw colours or pixel values, every style class must exist, every icon name must be real, every component needs its `.d.ts`, and the logo shapes must match the app. Exits with an error naming whatever is wrong. |
| `static/` | The hand-written parts. `tokens/` has font loading, the type ramp, spacing and radius. `components/` has the 20 components ported from `src/components/ui/` as plain JSX, their shared stylesheet, props docs, usage notes and preview cards. `readme.md` and `SKILL.md` tell Claude Design how to design for this dashboard. |
| `dist/` | The build output. Ignored by git. |

## Checking component cards before an upload

`node scripts/claude-design/build.mjs --preview` also writes `dist/_ds_bundle.js`, a stand-in for the bundle Claude Design compiles itself. With it, the component cards in `dist/components/*/` render in a normal browser for screenshots. **Never upload it.** Run the build again without `--preview` before uploading.

## Re-sending after a token changes

1. Change `src/app/globals.css`, mirror it as usual, and run `npm test`.
2. Run `node scripts/claude-design/build.mjs && node scripts/claude-design/verify.mjs`.
3. Ask Claude to upload the changed files from `dist/` to the Claude Design
   project. Uploads go through Claude Code's DesignSync tool, which shows the
   file list for approval before anything is written.

**A new or renamed token stops the build** with "token grouping out of date".
That is deliberate: the token has to be placed in a group in `build.mjs`, so
nothing gets silently left out of the copy.

## What the check does not cover

**Components are ported by hand.** When a component in `src/components/ui/`
changes, its copy in `static/components/` has to be updated too; nothing
compares the two automatically. Each ported file names the app file it came
from in its header comment. Icons and the brand marks are the exception: they
are regenerated from the app on every build.

The type ramp and the spacing scale in `static/tokens/` are written out by hand,
the same way `docs/DESIGN-TOKENS.md` is. They don't exist as values in
`globals.css` because the app gets them from Tailwind, so there is nothing for
`verify.mjs` to compare against. It checks only the two radius values there.
If the ramp or the spacing changes, edit those files by hand.
