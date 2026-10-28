-- A fifth state for a hand-out: scheduled (Garreth, 2026-10-28).
--
-- Yurie often schedules posts ahead of time inside TikTok or Instagram rather
-- than posting them live. The post is done on her side, on time, but it is not
-- live yet, so there is no link to paste. Until now the list offered only
-- Posted or Failed, and leaving it open turned it red Overdue the next day even
-- though nothing was late.
--
-- 'scheduled' is a finished row as far as done_at is concerned: it carries the
-- moment she marked it, so post_deliveries_done_at_check needs no change. When
-- she comes back with the link it becomes 'posted'. The To-do list keeps a
-- scheduled post on its due day and carries it to today's list until the link
-- is added; two days after it was due it reads Link needed (todo.ts).
--
-- Nothing in the database reads a status it does not know into the wrong
-- bucket: the calendar functions count 'posted' as done and 'failed' as
-- failed, the mirror trigger fires on insert only, and the retire and
-- move-to-cloud functions act on 'queued' rows alone, which is right for a
-- post already scheduled on the platform.

alter table public.post_deliveries
  drop constraint post_deliveries_status_check,
  add constraint post_deliveries_status_check
    check (status in ('queued', 'scheduled', 'posted', 'failed', 'skipped'));
