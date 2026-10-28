-- Claude's read of a warmup report (Garreth, 2026-10-28).
--
-- The Warmups page lets anyone ask Claude what went wrong in a warmup: it is
-- sent the report's diary and its stop screenshot and answers in plain words.
-- The answer is kept on the report, the same way a recorded session keeps its
-- review (phone_sessions.review), for two reasons: nobody pays twice for the
-- same read, and the answer outlives the diary, which is cleared after 30 days.
--
-- Asking again replaces the previous read. warmup_reports stays service-role
-- only (RLS on, no policies); these columns change nothing about who can see it.

alter table public.warmup_reports
  add column reviewed_at timestamptz,
  add column reviewed_by text,
  add column review_model text,
  add column review_summary text,
  add column review jsonb;
