-- Story bank: add a 'pending' status for stories saved but not judged yet.
--
-- The Story Research Agent saves every candidate first (the unique source_url
-- quietly drops repeats), then judges whatever is still pending. A run that stops
-- halfway leaves its unjudged rows pending, and the next run picks them up.

alter table public.story_bank drop constraint if exists story_bank_status_check;
alter table public.story_bank add constraint story_bank_status_check
  check (status in ('pending', 'new', 'rejected', 'approved', 'used'));
alter table public.story_bank alter column status set default 'pending';
