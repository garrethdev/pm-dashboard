-- DA-01: Instagram's free deeper numbers (Czedrick, 2026-10-09;
-- docs/DEEP-ANALYTICS-TICKETS.md).
--
-- The n8n "Analysis Engine" workflow now asks Instagram for four more numbers
-- per post. Each is empty when Instagram does not give it for that kind of
-- post, never 0: skip rate exists for Reels only, follows and profile visits
-- for carousels and photos only.
alter table public.post_performance
  add column reach integer,
  -- % of viewers who swiped away within 3 seconds (Instagram's
  -- reels_skip_rate), e.g. 53.2. Lower is better.
  add column skip_rate numeric,
  add column follows integer,
  add column profile_visits integer;
