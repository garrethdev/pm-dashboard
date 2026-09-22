-- PF-05 follow-up, same day: an index on post_deliveries.account_id.
--
-- Supabase's performance linter flagged `post_deliveries_account_id_fkey` as a
-- foreign key with nothing covering it, and the two reads the app already makes
-- by account -- what is still waiting, and what actually went out -- would both
-- have to scan the whole table to answer. Cheap to add now while the table is
-- empty; expensive to notice later, when it is the account page that is slow.
--
-- (source_table, source_id, account_id) does not help: account_id is not the
-- leading column, so it cannot be used for a lookup by account alone.
create index if not exists idx_post_deliveries_account
  on public.post_deliveries (account_id, done_at desc);
