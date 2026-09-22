-- PF-05: one row per post handed to a person to post by hand.
--
-- On the Geelark fleet, "this post actually went out" is `geelark_tasks.status
-- = 3` — a cloud phone reported back. Nothing reports back from a real iPhone,
-- so on the Physical fleet this table is that signal instead: a row appears
-- when a post is handed out, and it is flipped to `posted` by whoever posted
-- it. Everything downstream that today asks Geelark whether a post landed asks
-- this table for the Physical fleet (PF-06 forks the Posting Agent, PF-07 puts
-- the open rows on the to-do list).
--
-- The content row is named the way `content_type_registry` names it: a source
-- table plus the id in that table's own id column, which the registry records
-- per content type as `source_table` / `source_id_column`. There is no foreign
-- key, because the target table is different for every content type — the same
-- reason `content_quarantine` carries `(content_id, source_table)` as loose
-- text. `content_type` rides along so the to-do list can label an item without
-- having to guess which registry row a shared source table belongs to
-- (`divorce_story_content` is registered twice, under two characters).
create table if not exists public.post_deliveries (
  id           bigint generated always as identity primary key,

  -- Which content row this is. Same shape content_type_registry uses.
  content_type text        not null,
  source_table text        not null,
  source_id    text        not null,

  -- Who posts it, and from which phone. device_id is the phone the account was
  -- on when the post was handed out; it is recorded here rather than read back
  -- through accounts.device_id so history stays true after an account moves.
  account_id   bigint      not null references public.accounts (id) on delete restrict,
  device_id    bigint               references public.devices  (id) on delete restrict,

  status       text        not null default 'queued',
  -- The link to the live post. Nullable on purpose: an item can be ticked off
  -- before its link is pasted, and a posted row still owing one is what the
  -- to-do list shows differently (design decision, Garreth 2026-09-19).
  post_url     text,
  note         text,
  -- Who finished it and when. Nobody is named on screen (the screens show a
  -- status, not a person); this is for the record, the way dashboard_audit_log
  -- is.
  done_by      text,
  done_at      timestamptz,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint post_deliveries_status_check
    check (status in ('queued', 'posted', 'failed', 'skipped')),

  -- An item is finished exactly when it has a finished-at time. Keeps a row
  -- from reading as done with no date, and forces done_at to be cleared if an
  -- item is ever put back on the list.
  constraint post_deliveries_done_at_check
    check ((status = 'queued') = (done_at is null))
);

comment on table public.post_deliveries is
  'PF-05: one row per post handed to a person to post by hand. The Physical fleet''s "actually posted" signal, standing in for geelark_tasks.status = 3.';

comment on column public.post_deliveries.source_table is
  'The table the content row lives in, as content_type_registry.source_table names it.';
comment on column public.post_deliveries.source_id is
  'The content row''s id, in whichever column content_type_registry.source_id_column names for that type (content_id, carousel_id, hook_id).';
comment on column public.post_deliveries.device_id is
  'The phone the post was handed to. Kept on the row so it stays true after the account moves phones.';
comment on column public.post_deliveries.post_url is
  'Link to the live post. NULL means posted but not yet linked, which is not finished as far as attribution is concerned.';

-- One hand-out per content row per account. Two things depend on it: a post
-- cannot quietly appear twice on someone's list, and the Posting Agent fork
-- (PF-06) can insert with an upsert, so an n8n retry adds nothing. Re-offering
-- a skipped post means flipping the existing row back to 'queued', not
-- inserting a second one.
create unique index if not exists post_deliveries_content_account_key
  on public.post_deliveries (source_table, source_id, account_id);

-- The to-do list's own query: what is still open, by phone and by account.
create index if not exists idx_post_deliveries_open
  on public.post_deliveries (device_id, account_id) where status = 'queued';

-- The "actually posted" read: what went out, newest first.
create index if not exists idx_post_deliveries_posted_at
  on public.post_deliveries (done_at desc) where status = 'posted';

-- RLS on with no policies, exactly as devices and accounts are: only the
-- service role (the app's route handlers) reads or writes. The revoke names
-- anon and authenticated, because Supabase's default privileges grant both by
-- name and "revoke from public" leaves those grants standing — the mistake
-- that needed its own follow-up migration on 2026-09-10.
alter table public.post_deliveries enable row level security;
revoke all on table public.post_deliveries from anon, authenticated;
