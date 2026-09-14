# Designing the Carousel Generator screens

How D1 was designed, written down so any Claude Code session can design the
next ticket the same way. The tickets themselves are in
`docs/CAROUSEL-GENERATOR-DESIGN-TICKETS.md`; take the lowest one not marked
done.

## The rules

- **Design only.** The app is not changed during a design ticket.
- **Sample content only.** Invented carousel type names, "Character 2",
  "Character 3", "Character 4", made-up numbers, placeholder images. See the
  *Placeholder data* table in the tickets doc.
- **Dark first, then light.** Desktop (1440×900) and phone (390×844). Light
  mode is designed once Garreth approves the dark version.
- **Match the app exactly.** Same sidebar, top bar, font, icons, colours and
  spacing as the running dashboard. Components come from `src/components/ui`
  and `src/app/globals.css`; new pieces extend that vocabulary.
- **Clickable, not static.** Every control that exists on the screen does
  something. A click that leads to a screen not designed yet shows a small
  "Prototype" note naming its ticket.
- **Stop for review** after the first version of a ticket, and after each
  round of feedback.

## The skills

Load all three at the start: `/design` (the Claude Design canvas),
`/emil-design-eng` (motion and interaction feel) and `/ui-ux-pro-max`
(UX rules; run its search for the screen's main concerns, and its checklist
before handing over).

## How a ticket gets built

1. **Start from the D1 build script.** Copy
   `carousel-generator/d1-carousel-types.build.mjs` to
   `carousel-generator/dN-<name>.build.mjs`. It already has the generator's
   shell (menu, top bar, page glow, both themes, the phone drawer, the
   prototype note) and reads the font, logo, logo mark and Phosphor icons from
   the repo, so nothing visual is retyped. Replace the page content, the sample
   data and the behaviour; keep the shell as it is, so every screen matches.
   Set the active menu item to the screen's own.
2. **Build the artboards:**
   `node docs/designs/carousel-generator/dN-<name>.build.mjs <scratch dir>`
   writes one `.dc.html` per screen and state, plus `canvas.json` (a Dark page
   and a Light page).
3. **Make the canvas** with the `/design` skill's helper, which packages the
   artboards into one page and checks it. Look at a local screenshot before
   handing it over.
4. **Save it online** as its own artifact, one canvas per ticket, and record
   the link on the ticket's **Status** line. Feedback rounds republish to that
   same link: from the session that made it, republish the same file; from a
   new session, pass the link as the artifact `url`.
5. **Keep the paperwork in step** in the same pass: the ticket's Status line,
   the plan, flows and dev tickets wherever a design decision changes them, and
   a `CHANGELOG.md` entry. Commits only when Garreth asks.

## Done so far

| Ticket | Dark | Light | Canvas |
|---|---|---|---|
| D1 Carousel types | Approved 2026-09-14 | Designed 2026-09-14, awaiting review | https://claude.ai/code/artifact/d2004744-5f98-4bfa-bddf-71b0d8edcca8 |
