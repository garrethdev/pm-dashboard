-- PF-17 bug (found 2026-09-23): Analytics on Physical + "All time" never loads.
--
-- For "All time" (p_days is null) the chart's weeks start at the later of
-- '-infinity' and the first post in range. With no posts in range there is no
-- first post, GREATEST ignores the NULL, and generate_series is asked to count
-- weeks from the beginning of time. It never finishes, so the page spins. The
-- Physical fleet has no posts yet, so it hits this every time.
--
-- The fix touches that one expression, and only when the range is all time:
-- with no first post, start from today, which gives an empty chart. Every
-- other case keeps the exact expression it had.
--
-- Changed in both functions of the pair (supabase/migrations/README.md: "if
-- one of a pair is ever changed, change the other to match"). The original
-- only hits it when there are no posts at all, but the two stay one body.
--
-- Written as a textual edit of the live body rather than a full copy of a
-- 150-line function, so nothing else can drift in. It refuses to run unless
-- the old line appears exactly once. CREATE OR REPLACE keeps each function's
-- grants as they are.
--
-- Proven before applying, against the live functions with the edited body as
-- a temporary copy: analytics_rollup_fleet identical on 7/all/all,
-- 7/all/physical, 7/tiktok/cloud, 30/all/cloud, 90/instagram/all and
-- 30/all/physical, and all-time Cloud identical by fingerprint;
-- analytics_rollup identical on 7/all, 30/tiktok, 90/instagram, 14/all and all
-- time. All-time Physical went from never returning to 0.24 s: 0 posts, an
-- empty chart.
do $$
declare
  fn  regprocedure;
  def text;
  old_line constant text := 'greatest(p.from_ts, (select min(posted_at) from f))';
  new_line constant text :=
    $r$case when p.from_ts = '-infinity' then coalesce((select min(posted_at) from f), now()) else greatest(p.from_ts, (select min(posted_at) from f)) end$r$;
begin
  foreach fn in array array[
    'public.analytics_rollup(integer,text)'::regprocedure,
    'public.analytics_rollup_fleet(integer,text,text)'::regprocedure
  ] loop
    def := pg_get_functiondef(fn);
    if (length(def) - length(replace(def, old_line, ''))) / length(old_line) <> 1 then
      raise exception '%: expected the slots line exactly once; the body has changed, not applying', fn;
    end if;
    execute replace(def, old_line, new_line);
  end loop;
end $$;
