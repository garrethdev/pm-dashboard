-- A name for an account whose handle is not a name (Garreth, 2026-10-02).
--
-- A Facebook account is added by its link, and one with no username is kept
-- as its page number (accounts.username = '61588896089516'), which is what
-- every screen then showed. This is the name the screens show instead. Set
-- from Add account and Edit account for Facebook; empty on everything else.
--
-- Additive and nullable: nothing that reads accounts today selects it, so no
-- workflow or view changes. Deliberately NOT added to
-- accounts_with_content_types, which the public key can read; the app reads
-- it from accounts with the service key.

alter table public.accounts
  add column if not exists display_name text;

alter table public.accounts
  drop constraint if exists accounts_display_name_check;

alter table public.accounts
  add constraint accounts_display_name_check
  check (display_name is null or (display_name = btrim(display_name) and length(display_name) between 1 and 80));

comment on column public.accounts.display_name is
  'The name shown for an account whose handle is not a name: a Facebook account kept as its page number or share code. Set from Add/Edit account in the dashboard; null otherwise.';
