-- A profile card belongs to a handle ON A PLATFORM, not to a handle.
--
-- From the 2026-09-09 external review (its #7, the smaller half): the dashboard
-- looked `account_profile_cards` up by `username` alone even though the table
-- carries a `platform` column. The review called that an ambiguous read. It was
-- worse than that, because the table's primary key was `username` alone too:
--
--   * the READ could hand @somename's TikTok avatar to @somename on Instagram;
--   * the WRITE (an upsert resolving on the primary key) could not store both.
--     Whichever platform refreshed last overwrote the other one's row outright,
--     flipping `platform` with it.
--
-- Fixing only the read would have made the second problem visible and costly: a
-- lookup filtered on platform would miss the row the other platform had just
-- overwritten, so every page load would pay a fresh ScrapeCreators credit and
-- flip the row back. The key has to move with the filter, so both land here.
--
-- Nothing is being repaired — checked live 2026-09-11, no handle in `accounts`
-- exists on both platforms (59 accounts, 56 handles, the rest null), and all 29
-- stored cards have a non-null platform with no duplicate handles. This closes
-- the door before anyone walks through it.
--
-- Safe to apply: no foreign key, view or materialized view depends on this
-- table (checked against pg_constraint and pg_depend), so the key swap touches
-- nothing but the table's own index.

-- No explicit BEGIN/COMMIT: this was applied through Supabase's migration
-- runner, which wraps the whole file in one transaction already.

-- Belt and braces. The column is already NOT NULL, but a primary key demands it
-- and stating it here means the migration does not depend on that staying true.
alter table public.account_profile_cards
  alter column platform set not null;

alter table public.account_profile_cards
  drop constraint account_profile_cards_pkey;

alter table public.account_profile_cards
  add constraint account_profile_cards_pkey primary key (username, platform);

comment on table public.account_profile_cards is
  'Cached ScrapeCreators profile cards. Keyed by (username, platform): a handle '
  'is unique only within a platform, and the dashboard upserts on this key, so '
  'username alone would let one platform overwrite the other''s card.';
