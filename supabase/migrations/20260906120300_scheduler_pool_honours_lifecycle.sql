-- v_scheduler_pool honours the registry lifecycle.
--
-- The DEMAND side of inventory already gates on content_type_registry.active —
-- inventory_check_detail, inventory_type_breakdown and
-- v_scheduler_production_order all filter on it. The SUPPLY side did not: this
-- view is a hand-maintained UNION with the content type as a literal, and it
-- lists exactly the active lanes only because someone kept it in step by hand.
--
-- That held until a lane could be paused from the dashboard. Pausing `glowup`
-- drops its weekly demand but would leave its ~100 approved pieces counted as
-- available supply, so the character reads as better stocked than it is and the
-- weekly production order under-asks.
--
-- The wrap is applied to the LIVE definition rather than restated here on
-- purpose: the body is fifteen per-table branches, and a second copy in this
-- file would be one more place to forget when a lane is added. Guarded so a
-- re-run cannot double-wrap.
--
-- No-op against today's data — every lane in the UNION is active. Verify with:
--
--   create table _pool_snapshot as select * from v_scheduler_pool;
--   -- apply --
--   select count(*) from (
--     (select * from v_scheduler_pool except select * from _pool_snapshot)
--     union all
--     (select * from _pool_snapshot except select * from v_scheduler_pool)
--   ) d;   -- 0 means nothing moved
--   drop table _pool_snapshot;

do $$
declare
  body text;
begin
  select pg_get_viewdef('public.v_scheduler_pool'::regclass, true) into body;

  if body ilike '%content_type_registry%' then
    raise notice 'v_scheduler_pool already gates on the registry — nothing to do';
    return;
  end if;

  execute format(
    'create or replace view v_scheduler_pool as with raw as (%s) '
    'select raw.content_type, raw."character", raw.bucket, raw.pool_n '
    '  from raw '
    '  join content_type_registry r '
    '    on r.content_type = raw.content_type '
    '   and r.active',
    rtrim(body, ' ;' || chr(10))
  );
end $$;
