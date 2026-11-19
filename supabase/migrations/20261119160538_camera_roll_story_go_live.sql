-- Camera Roll Story goes live. Garreth, 2026-11-20: Character 6's 18 a week
-- re-split so Camera Roll Story and Divorce Recovery come first (5 each).
update content_type_registry set cadence_per_week = v.n
from (values ('camera_roll_story',5),('divorce_recovery',5),('jealousy_carousel',3),
             ('comparison_carousel',2),('journey_3slide',2),('viral_theories',1)) v(t,n)
where content_type = v.t;

update content_type_registry
set lifecycle_note = '2026-11-20: cadence 5 (Garreth). Wired 2026-11-19. Renderer renderers/camera_roll_story.'
where content_type = 'camera_roll_story';

do $$
declare s int; cap int;
begin
  select sum(cadence_per_week) into s from content_type_registry
   where active and quota_bucket = 'glp' and "character" = 'Character 6';
  select coalesce((select weekly_cap from scheduler_overrides where active and scope = 'character'
                    and scope_key = 'Character 6' and bucket = 'glp'),
                  (select weekly_quota from scheduler_buckets where bucket = 'glp')) into cap;
  if s <> cap then raise exception 'Character 6 cadence % does not match its cap %', s, cap; end if;
end $$;

-- Lift Hold on every deck except one with no caption (CRS-0003): released
-- without a caption it would be content-checked empty, and a caption added
-- later would then post unchecked. Status goes to NULL, which is what the
-- scheduler picks; the trigger marks the rest ready on this update.
update camera_roll_story_carousel
set posting_status = null
where posting_status = 'Hold' and geelark_profile is null and caption is not null;

insert into content_batches (batch_id, content_type, notes)
select distinct batch, 'camera_roll_story', 'First 20 decks, written by hand from GLP-1 subreddit posts; rendered 2026-11-19.'
from camera_roll_story_carousel where batch is not null
on conflict do nothing;

-- The 2026-11-19 rebuild of the cached stock copy dropped its read grant;
-- every other cached copy has it.
grant select on cache.v_scheduler_pool to service_role;