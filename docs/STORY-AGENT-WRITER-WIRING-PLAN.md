# Wiring the carousel writers to the Story Research Agent

Plan, 2026-11-16. Diagram for the team:
https://claude.ai/artifact/SrXti77NWD4Tp11PY9Neng (has a Present mode).

Ticket ids are `SW-` (story wiring). Go-ahead from Garreth 2026-11-17, with
one condition: it must be easy to add new workflows. Built so far: SW-01,
SW-01b, SW-02 and SW-08 (the database side and the lane-fit job), and SW-04
(the Comparison writer, live).

## Adding a new workflow

1. Its content type is wired as usual (the `wire-new-content-type` skill), so
   it has a row in `content_type_registry`.
2. Add one row to `story_lanes`: the lane key (the content type), a display
   name, the slide count, and a **brief**: two or three plain sentences on what
   kind of story fits. Write the brief about what the story must supply, not
   about what the writer adds (see "Lane briefs" below).
3. Within the hour, *Story Lane Fit* scores every waiting story for the new
   lane. Nothing in that job changes.
4. The writer calls `next_story('<lane>', run_id)` once per deck at the start
   of a run, and `finish_story_run(run_id, saved)` once at the end, with the
   saved decks as `[{use_id, deck_ref, hook_text}]` (an empty list when
   nothing was saved). That records the saved ones and lets every other held
   story go. The Comparison writer is the worked example: nodes *Next Story*,
   *Use Story*, *Add Story To Plan*, *Add Story To Hook*, *Close Story Holds*,
   *Finish Story Run*. Copy those and change the lane key.

Proven hooks follow automatically: a new lane gets other lanes' proven hooks
on the same theme until it proves its own.

**Every lane needs her own weight moment** (2026-11-17). The lane-fit job
scores a story 0 to 3 for any lane when it has no moment about her own weight
or body, when she is told she is too thin, or when surgery or a drug changed
her. A brief can opt out (Divorce Recovery does).

**Lane briefs.** The first Comparison brief described the deck ("she tried one
way, then another") and matched 0 of 30 stories, because the judge looked for
stories that already compared diets. Asking instead for the person and the
moment around her weight matched 11 of 30. Briefs are rows, editable any
time; delete that lane's `story_lane_fit` rows to have them scored again.

## Decided (Garreth, 2026-11-16)

1. **The agent picks the stories.** A story scoring 8 or more goes to a
   writer without anyone approving it. Garreth still approves each finished
   batch of decks before posting, as today.
2. **Each lane keeps its own writer.** Lanes differ in slide count and theme,
   so there is no single shared writer. All writers follow the same writing
   method and read the Character 6 voice bible.
3. **Hooks must earn their place.** A hook a writer creates is added to
   `hook_library` only after its deck breaks out in views or engagement.
4. **Strong stories can be reused.** Up to 5 uses in all, and only in a lane
   the story really fits, and at most once per lane (confirmed).
5. **Character 6 only.** All other characters are retired. The Character 2
   lanes that read `machine_hooks` are out of scope.

## How a story travels

1. The agent finds, scores and tags stories, reads their comments and drafts
   hooks (built).
2. **Auto-pick** (new): a lane's writer takes a story when it scores 8+, fits
   that lane (a per-lane fit score from the agent), and has been used fewer
   than 5 times. 9s first, then stories with comments read.
3. The writer works in four steps, with peptides threaded through:
   1. **Plan the story** from the real story and its most-liked moment.
      Peptides: plant her low point and the kind person first.
   2. **Find + create hooks.** Find a few library hooks that fit the story,
      and create new ones from the story and its comments; the lane's hook
      check and judge pick one. Peptides: the hook never says
      peptides.
   3. **Plan the slides** from the story plan and the hook, in the lane's own length and
      theme. Peptides: said once, at the turn, through the kind person
      (named by role, never the person who hurt her). No dose, result or
      health claim.
   4. **Validate.** Code checks hard rules; a judge checks voice and flow.
      One repair, then flag.
4. The deck keeps its `story_id`; the story's use count goes up by one.
5. **Breakout check** (new): after posting, a deck with any one post at
   3,000 views or more sends its hook to `hook_library` (Garreth, 2026-11-16). Once decks hit
   3,000 regularly, the bar goes up, roughly doubling.

Supply on 2026-11-16: 102 waiting stories score 8+ (71 posts, 31 from
comments), about 5 to 6 weeks at ~18 decks a week.

## How a writer connects (decided 2026-11-16)

Writers keep their own triggers. On each run:

1. **Ask for a story.** One database call, "next story for my lane", returns
   the story bundle (`v_story_packet`) for the best eligible story and holds
   it for that run. Falls back to 7s when no 8+ is left.
2. **Write**, reading `writer_resources`: the voice bible (how she talks) and
   the method (how a story is put together: story, hook, slides, check).
3. **Record the use.** The deck saves to its lane table as today, plus one
   row in a new `story_uses` table (story, lane, deck, hook). It enforces
   once per lane and at most 5 uses.
4. **Breakout check.** A daily job: any one post of a recorded deck at 3,000+
   views adds its hook to `hook_library` as proven, with lane and views.

Once Jealousy and Viral Theories read stories this way, the agent can stop
copying stories into `jealousy_insights` and `over40_insights`.

## Tickets, in build order

- **SW-01 · Lane fit.** BUILT 2026-11-17: a separate n8n workflow, *Story
  Lane Fit* (`ChyrbxyPvYOppSfQ`, hourly), rather than a step inside the
  agent, so a new lane is scored without touching the agent.
- **SW-01b · The connection.** BUILT 2026-11-17: `next_story`,
  `record_story_use`, `release_story_use`, `story_uses`.
- **SW-02 · Story packet.** BUILT 2026-11-17: `v_story_packet` (story, tags,
  comment read, top comments, its drafted hooks), plus proven hooks.
- **SW-03 · Shared writing method.** The four steps and the peptide rules,
  written once in `writer_resources` next to the voice bible. Must repeat the
  number and time rule (the hand test wrote "weeks" and "months").
  PART BUILT 2026-11-17: `slide_rules_shared` (numbers, counted time, stock
  peptide lines, peptides only for slow weight change, she is divorced), read
  by every slide and repair writer, with matching code checks.
- **SW-04 · Comparison** (5/wk) first. Test on 3 stories with saving off.
  BUILT 2026-11-17 in `rUSLiVHflfg0hJLg` (with the two 11-12 drafts); test
  run 215842 passed, all three stories released. PUBLISHED 2026-11-17
  (`d39dc799`); first save-on run 215863 saved CC-0026 and CC-0027 and
  recorded both stories as used.
- **SW-05 · Jealousy and Viral Theories.** Both off today. BUILT 2026-11-17
  as drafts; one test deck each (215881, 215880), saving off.
- **SW-06 · Divorce Recovery**, at a quiet moment; keeps its British wording.
  BUILT 2026-11-17 as a draft on top of three unpublished 11-16 changes;
  test 215879.
- **SW-07 · 3-Slide Journey** hooks. BUILT 2026-11-17 as a draft; test
  215878. Open question: stories may only constrain this joke format.
- **Story hooks (all lanes).** `writer_resources` keys `story_hook_rules`
  and `story_hook_judge`, read by every writer on story decks (2026-11-17,
  after the first saved decks had narration hooks).
- **SW-08 · Breakout check.** BUILT 2026-11-17: `story_breakout_check()`,
  daily 9am ET by pg_cron. Does nothing until decks are recorded.
  For reference: no Comparison or Jealousy deck has reached 3,000 views on
  one post yet (best 1,700).

## Open details

- When to raise the 3,000-view bar: "regularly" still needs a number (for
  example, most of a month's story decks reach it).
- Divorce Recovery reads the hook rules but not the voice bible today; Viral
  Theories not checked yet.

## Costs to expect

About 10 cents a deck with the extra steps, against about 5 cents now (hand
test). OpenRouter had about $20 left on 2026-11-16, shared by everything.

## Rule changes (Garreth, 2026-11-18) — APPLIED 2026-11-18 together with the taste test results (see CHANGELOG)

Applied to all five story-lane drafts the same day. Garreth asked to combine these with his votes from the taste test page (https://claude.ai/artifact/4tYUbBpfMz5Wc87aZDzx8F, votes in its `votes` collection) and change the writers in one pass.

| Rule | New version |
| --- | --- |
| Peptides | Can come up on more than one slide, never on every slide |
| Weight claims (pounds, sizes, how much, how fast, how long) | Removed |
| Real names | Allowed as first names or nicknames, never full names (the name-leak check goes; flagged the privacy trade-off to him) |
| Slide length | Only: max 30 words per slide, and not all short or all long (drop the 2–6 / 20–30 bands and the evenness math) |
| Petty or funny lines | Any number, not too many and not on every slide |
| Slide 6 (what changed) | Anything (drop the idea list and the clothes/exercise/photo bans) |
| Slide 8 (ending) | Anything, varied across decks, not one repeated line or topic (drop the divorce-ending ban) |
| Casual words | No limit (drop the 3–5 slides quota) |
| Feelings | At least 2 slides, no upper limit |
| "lol" / emoji | At least one in each deck, no upper limit (drop the 2-lol and 1-emoji caps) |
| CAPS words | No limit |
| Peptide slide wording | Anything natural; "looked into them", "did my research", "read up" and "asked questions" are allowed (drop the stock-phrase ban) |

Also fix the contradictions found in the rules review: `slide_rules_shared` bans numbers while `story_voice` asks for ages and years; `hook_rules` says "plain, not messy"; `character6_bible` says show pain instead of naming it and soften toward the person who hurt her; and the prompt examples get copied into every deck ("swore by peptides", "I just…", "SO embarrassed").
