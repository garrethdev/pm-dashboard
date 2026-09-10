-- "Last Post" in the accounts table counted a post that never went out.
--
-- v_account_last_post grouped every geelark_tasks row carrying a
-- source_carousel_id, with no status filter at all. A task that Geelark
-- accepted and then failed ("Failed to upload video ... (20201)") still set
-- last_post_at. Profile 70 read "1d ago" on 2026-09-09 when its ONE and only
-- post attempt had failed -- the honest answer was "never posted".
--
-- Fleet-wide on 2026-09-10 that was 18 of 53 accounts showing a last-post date
-- more recent than their last successful post, 5 of which had never landed a
-- post at all. Same class of bug as calendar_day_detail_delivery_truth: a row
-- reaching the task table is not the same event as a post reaching TikTok.
--
-- The existing columns are left EXACTLY as they were and the new ones are
-- appended. v_account_health_v3 -- the shared verdict the n8n View-Collapse
-- Detector emails -- reads days_since_post in its "warming" rule:
--
--   days_since_warmup <= 7 AND (posting_paused OR days_since_post IS NULL)
--
-- That rule must keep reading the ANY-outcome column. Switching it to the
-- success-only one would invert its meaning: an account whose posts all FAIL
-- would start reading "warming" (nothing landed => looks like it has not
-- started yet) exactly when it is most broken. Garreth's call, 2026-09-10:
-- an account that should be posting but is erroring is not warming, and is a
-- system error once the errors persist. So this migration is purely additive.
--
-- status 3 = success, 4 = failed, 7 = cancelled, null = not yet resolved.
-- Naming mirrors v_account_warmup_health, which already exposes both a
-- last_warmup_at (any outcome) and a last_success_at (status 3 only).

create or replace view public.v_account_last_post as
  select
    serial_name as geelark_profile,
    max(created_at) as last_post_at,
    (now() at time zone 'America/New_York')::date
      - (max(created_at at time zone 'America/New_York'))::date as days_since_post,
    max(created_at) filter (where status = 3) as last_success_at,
    (now() at time zone 'America/New_York')::date
      - (max(created_at at time zone 'America/New_York') filter (where status = 3))::date
        as days_since_success
  from geelark_tasks
  where source_carousel_id is not null
  group by serial_name;
