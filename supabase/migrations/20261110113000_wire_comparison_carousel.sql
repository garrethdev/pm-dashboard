-- Wire Comparison Carousel (Character 6) and rebalance Character 6.
-- Garreth, 2026-11-10: "favor newer carousel types over the old ones, and among
-- the old ones favor the ones that do well statistically". Split chosen:
-- Comparison 5, Jealousy 4, Divorce Recovery 4, Journey 3, Viral Theories 2 (= 18,
-- Character 6's weekly cap). Old lanes ranked by Instagram median views over the
-- last ~3 weeks: Divorce Recovery 928, Journey 342, Viral Theories 12.
--
-- Already in place before this file (set up live 2026-11-07, not recorded):
-- the registry row (paused, 0 a week), Character 6's allowed list, the
-- trg_sr_comparison_carousel trigger (checks all 8 slides), the unified_posts
-- branch (8 slide URLs) and the cc-20261107 content_batches row.
--
-- Parts 1-3 were applied live 2026-11-10 as plain statements. Part 4 turned out
-- to be unnecessary (see below).

-- 1. Character 6 cadence
update content_type_registry r set cadence_per_week = v.cad
from (values ('comparison_carousel',5),('jealousy_carousel',4),('divorce_recovery',4),
             ('journey_3slide',3),('viral_theories',2)) v(ct, cad)
where r.content_type = v.ct;

-- 2. Switch the lane on
update content_type_registry set active = true, unified_poster_active = true, lifecycle = 'live'
where content_type = 'comparison_carousel';

-- 3. Release the gated, rendered decks (22). The 3 still waiting for render stay on Hold.
update comparison_carousel set posting_status = null, updated_at = now()
where posting_status = 'Hold' and render_status = 'rendered' and gatekeep_status = 'approved';

insert into content_batches (batch_id, content_type, notes)
values ('jealousy_v3_2026_11_05','jealousy_carousel','25 decks, rendered 2026-11-05'),
       ('jealousy_v4_2026_11_09','jealousy_carousel','24 decks rendered 2026-11-10; captions and music set by hand; 1 left at needs_fix')
on conflict do nothing;

-- 4. Stock view: nothing to do. The Nov 7 set-up appended a live comparison_carousel
--    branch to public.v_scheduler_pool itself (UNION ALL after the cached copy), not to
--    cache.v_scheduler_pool. It counts 22 since the lane was switched on. Read back
--    2026-11-10. Do NOT rebuild the cached copy with a comparison branch while this exists:
--    the skill's recipe replaces public.v_scheduler_pool and would drop this branch, and
--    adding to both would count the lane twice.
