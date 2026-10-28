-- The day a hand-out belongs to (Garreth, 2026-10-27).
--
-- The Smart Scheduler now plans three days at a time, so the Posting Agent can
-- hand Yurie a post before its day. Until now the To-do list read a post's day
-- from post_deliveries.created_at, the moment it was handed out, which was
-- always the morning of its day. A post handed out on Tuesday for Thursday
-- would have landed on Tuesday's list.
--
-- due_at is when the post should go out: the planned posting date and time,
-- set by the Posting Agent. The list files the post under that day, and the
-- overdue clock starts there. created_at keeps meaning what it says.
--
-- Every existing row is due when it was handed out, which is how the list has
-- always read it, so nothing already on the list moves. A row inserted without
-- due_at (the Posting Agent before its own change, a hand-queued post) is due
-- on insert, the same as before.

alter table public.post_deliveries
  add column if not exists due_at timestamptz;

update public.post_deliveries
   set due_at = created_at
 where due_at is null;

alter table public.post_deliveries
  alter column due_at set default now(),
  alter column due_at set not null;
