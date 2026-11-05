# Caption rules

The one set of rules every post caption follows, whichever content type it is
for. **The goal is engagement** (likes, saves, comments), Garreth, 2026-11-02.

Each content type still has its own caption writer (its voice differs), but they
all apply these rules. **If you change a rule here, change it in the writers
too** — the n8n workflows listed at the bottom carry a copy in their prompts and
checks.

## The rules (version 3, 2026-11-02)

0. **It must read like a real person typed it on her phone**, not a writer or
   an AI (version 3, Garreth). Contractions, never "did not" / "I am" in full.
   Lowercase, "&", "...", one "!" or a feeling emoji are all fine, some of the
   time. Never "quiet", "quietly", "whisper", "testament", "a reminder that",
   three-part lists ("a lab, a gland, and a file"), or the same sentence
   pattern on every post. Journey and Divorce Recovery are real women and lean
   hardest into this. Cleora and Cleora ASMR keep a little mystery but still
   sound typed, not narrated.
1. **Short: Journey up to about 12 words (10 before 3.2), Cleora ASMR up to about 25**, then the
   hashtags. One or two short sentences, sometimes a fragment. Never hashtags
   only. Journey does not have to mention the quiz, the months or the help
   (Garreth, 2026-11-02): each piece mentions none, one or two of them, picked
   at random, so some captions are just a feeling ("slide 2 had everyone
   thinking i failed... nope 🥹"). Top Trends weight-loss posts: 37% under 10
   words.
2. **Add something the post does not say**: a feeling, a small true detail, or
   why it matters to her. Do not repeat or summarise the slides or screens.
3. **About half the captions end with one easy question** to the viewer,
   answerable in a word or two ("Which one would you try first?"). The writer
   picks at random, so we can compare comments with and without one.
4. **"Save this for…" on useful posts.** Where the post carries a tip or a fact
   worth keeping (Cleora, Cleora ASMR), the captions without a question end with
   a save invite instead. Personal-story lanes (3-Slide Journey, Divorce
   Recovery) do not use it.
5. **No engagement bait.** Never "comment YES / comment a word", "follow",
   "share", "tag", "DM me" or "link in bio" in the caption. Instagram and
   Facebook demote posts that bait for comments. (Cleora's spoken ask in the
   video stays.)
6. **Emoji optional, at most one.** On Journey it may be a feeling emoji
   (🥹 😭 🙏), on about half the posts; elsewhere only the literal thing the post
   is about.
7. **4 to 6 hashtags that name the topic of this post** (`#darkcircles`, not
   `#health`). At most one broad tag such as `#fyp`. Never a drug, compound,
   peptide code, brand or regulator (`#BPC157`, `#FDA`).
8. **Never**: GLP-1 / glp1, Ozempic, Wegovy, Mounjaro, Zepbound, semaglutide,
   tirzepatide, cure, guaranteed, miracle, dosing. No em or en dashes, no
   semicolons ("&" is fine since version 3). Each content type adds its own bans on top (for
   example, Divorce Recovery and 3-Slide Journey never say "peptide").

## Character 6 style (version 3.2, 2026-11-02)

Divorce Recovery and 3-Slide Journey follow this caption Garreth chose as the
target feel:

> he asked to borrow the dog for the weekend.
> anyone else's ex do this?

- One flat sentence about one specific, slightly absurd thing that happened.
  On Divorce Recovery it is something *he* did or said. On Journey it is
  something someone said or did, clothes, a photo or the stairs. No build-up,
  no explaining, no adjectives about how she felt.
- Lowercase (always on Divorce Recovery, 8 in 10 on Journey).
- On about half the posts (rule 3), a short natural question to other women
  ("anyone else?", "just mine?", "is this an ex thing?").
- Limits: Journey up to 12 words, Divorce Recovery up to 16, question
  included. Journey mentions at most one of the quiz, the months or the help.
- The example sentences and questions in the instructions are picked at random
  for each piece, so the writer can't copy one.

## What the rules are based on

Caption habits only nudge results; the slides do most of the work. The numbers
below are why each rule leans the way it does, not proof.

**Engagement — our own TikTok posts** (2,372 posts). Engagement is low: the
typical post has 95 views and only 8% of posts get any comment. Captions with a
question drew about 40% more comments (1.19 vs 0.84 per 1,000 views; 12% vs 8%
of posts got one), but only 58 posts had a question, so rule 3 is set up as a
test. Only 8 posts ever asked for comments, too few to judge.

**Engagement — Trends library** (632 TikTok carousels; likes and saves, no
comment counts). Short captions earn more likes and saves per view (under 10
words: 3.9% likes, 1.1% saves; over 30 words: 1.7% and 0.8%). Captions with a
"save this" style ask had more saves (1.07% vs 0.91%). Questions came with
fewer likes, but the library cannot show whether they drew comments.

**Views** (first study, same day). In Trends, caption habits barely tracked
views (rank correlation 0.15 or less). On our own 2,480 posts, very short and
hashtag-only captions got fewer views (0.79× and 0.83× of each account's
typical post), and posts with an emoji did worse (0.70×, 92 posts). Hence rule
1's "a real sentence" and rule 6.

**Tone — Trends top 150 in our niche vs our version 2 captions.** Trends: 49%
have an emoji, 32% a "!", 26% a contraction, 14% start lowercase, 11% use "&"
or "...", typical length 17 words, and 3% write "did not" in full. Our
version 2: no emoji, "!", lowercase or "&" at all; 100% of Journey captions said
"I did not" (the prompt told them to); "quiet/quietly" in 23% of ASMR; typical
length about 30 words. Version 3 closes that gap.

**To check in 2–3 weeks:** comments per 1,000 views on posts with a question
against posts without, per content type. The caption itself shows which group a
post is in (it has a "?" or not).

## Which writer applies them

| Content type | Caption writer (n8n) | Ending split |
|---|---|---|
| Cleora | [Cleora] Writing Agent | question / save |
| Cleora ASMR | [Captions] ASMR + Journey + Viral Caption Writer | question / save |
| 3-Slide Journey | [Captions] ASMR + Journey + Viral Caption Writer | question / none |
| Divorce Recovery | Divorce Recovery: carousel copy writer | question / none |
| Viral Theories | [Captions] ASMR + Journey + Viral Caption Writer (since 2026-11-03) | question / none |
| Jealousy Carousel | None applies these rules yet; first 25 rewritten by hand (2026-11-05) | question / none |

**Jealousy Carousel** (2026-11-05): follows the Character 6 style above, with
Divorce Recovery's limit of 16 words before the hashtags, and never says
"peptide" in the caption even though slide 4 does. On it the flat sentence is
something a friend, mom or sister said or did that the slides don't show. Its
hashtags name the relationship (`#jealousfriend`, `#toxicmom`, `#sisterdrama`),
not weight. The hand rewrite covers batch `jealousy_v2_2026_11_04` only: decks
still being made keep the older caption style until their writer has these rules.

**Viral Theories** (2026-11-03): Character 6 voice like Journey, first person,
one plain sentence with a real detail from her life that the slides don't say,
up to 15 words, never names a product even though slide 5 does. It started
with question / save, but "save this." read as tacked on after a personal
detail, so it was switched to question / none the same day.

**Cleora's writer checks its captions** since 2026-11-03 (5 to 35 words, ends
in one question or a save invite, no bait or banned words, 4 to 6 hashtags). A
caption that fails stops the episode as "failed" with the reason in its notes,
the same as a script problem; set it back to pending to rewrite it.

**Stock already written does not get rewritten by itself.** For the Caption
Writer lanes, emptying a caption makes the writer redo it within the hour, and
it clears the approval so the Pre-Publish Gate checks the new caption.

When a new content type is wired, its writer must apply these rules.

**Divorce Recovery has the rules in three places** (since 2026-11-03): the
request for each deck, the writer's standing instructions, and the step that
repairs a deck that fails its checks. Its checks also enforce the Character 6
style: 16 words before the hashtags, lowercase, no "like…" comparison, at most
one question and only at the end, 4 to 6 hashtags from its list. Change all of
them together. The writer only captions decks as it makes them, so stock
already written keeps its old captions when a rule changes.
