-- The calendar now joins geelark_tasks once per scheduled row. A month grid is
-- ~500 rows against 9.5k tasks, which is 4.7M comparisons per load without an
-- index on the join key. Partial: rows with no source_carousel_id are warmup
-- and login tasks that the calendar never asks about.
create index if not exists geelark_tasks_source_serial
  on public.geelark_tasks (source_carousel_id, serial_name)
  where source_carousel_id is not null;