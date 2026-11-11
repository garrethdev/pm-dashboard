-- Retire Cleora and Cleora ASMR, Character 5's two lanes (Garreth, 2026-11-10):
-- the Character 5 accounts are being converted to Character 6.
--
-- Follows the retirement recipe in the wire-new-content-type skill (§13).
-- `lifecycle = 'retired'` switches `active` off through the lifecycle trigger,
-- which stops planning, posting (unified_posts_due) and Inventory demand.
-- The weekly numbers each lane had (9 and 9) are kept in cadence_before_pause.
-- The view branches in unified_posts and cache.v_scheduler_pool stay in place
-- on purpose: removing them would erase the lanes' Analytics history.
-- Character 5's scheduler_overrides rows are left alone.

update content_type_registry
   set lifecycle = 'retired',
       unified_poster_active = false,
       cadence_before_pause = cadence_per_week,
       cadence_per_week = 0,
       lifecycle_note = 'Retired 2026-11-10: Character 5 accounts are being converted to Character 6 (Garreth).'
 where content_type in ('cleora', 'cleora_asmr');

update characters
   set allowed_content_types = array_remove(array_remove(allowed_content_types, 'cleora'), 'cleora_asmr'),
       updated_at = now()
 where allowed_content_types && array['cleora', 'cleora_asmr'];
