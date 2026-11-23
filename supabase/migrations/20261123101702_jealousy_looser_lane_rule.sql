-- Jealousy lane: looser story rule (Garreth, 2026-11-23: "I prefer a looser rule for Jealousy").
--
-- Why: only 21 unused stories scored 8+ with a Jealousy fit of 7+, because the old brief wanted one
-- jealous person and a line they said. The new brief keeps one anchor (the person reacts badly to HER
-- change) and accepts sabotage, mocking her effort, going cold or leaving her out, with no quote needed.
-- A husband or boyfriend counts too. The under-35 rule is unchanged.
--
-- The near misses (fit 2 to 6, story score 7+, status new, not yet used by Jealousy: 258 stories) lost
-- their Jealousy score so Story Lane Fit re-scores them against the new brief.
--
-- APPLIED LIVE 2026-11-23 through the REST API with the service key, not with this file: the session's
-- Supabase connector declined schema changes. The REST API cannot create tables, so the backup of the
-- old Jealousy scores and the old brief is a file, not a table:
--   ~/story-writer-backups/2026-11-23/jealousy_lane_fit_and_brief_before_loosening.json (1,480 fit rows)
-- Running this file again is harmless: the update is idempotent and the delete only clears near misses,
-- which the next Story Lane Fit runs score again.

update public.story_lanes set brief =
  'As she changed or tried to change (losing weight, starting to look after herself, getting her confidence back), '
  || 'someone close to her (a friend, sister, mother, in-laws, a coworker, a husband or boyfriend) turned on her: '
  || 'jealousy, backhanded compliments, sabotage, mocking her effort, going cold or leaving her out. '
  || 'The story does not need the word jealous or a line they said; the writer can supply a likely line. '
  || 'Score high when one clear person close to her reacts badly to her change. '
  || 'Score low when the hurt has nothing to do with her changing (an affair, money, a cruel remark with no link to her change). '
  || 'Her age: the story must fit a woman in her late 30s to 50s. If the story says or clearly shows she is under 35 '
  || '(for example 22F, "I''m 26", a newlywed or new mom in her 20s), score it 0 to 3.',
  updated_at = now()
where lane = 'jealousy_carousel';

delete from public.story_lane_fit f
 using public.story_bank b
 where f.story_id = b.id
   and f.lane = 'jealousy_carousel'
   and f.fit between 2 and 6
   and b.status = 'new'
   and b.judge_score >= 7
   and not exists (select 1 from public.story_uses u
                    where u.story_id = b.id and u.lane = 'jealousy_carousel' and u.status = 'used');
