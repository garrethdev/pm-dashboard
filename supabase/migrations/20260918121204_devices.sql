-- PF-02: one row per physical phone.
--
-- Real iPhones replace Geelark cloud phones. Each phone carries up to three
-- accounts (one character's Instagram + Facebook, another character's TikTok);
-- that limit is enforced in the app, where the message can say which phone is
-- full. geelark_profile stays as it is for the old fleet.
create table if not exists public.devices (
  id                    bigint generated always as identity primary key,
  name                  text        not null unique,
  model                 text,
  ios_version           text,
  proxy                 text,
  timezone              text,
  -- Path inside the private device-proofs bucket: the whoer.net screenshot that
  -- shows the phone's IP, timezone and location agree.
  whoer_screenshot_path text,
  is_active             boolean     not null default true,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.devices is
  'Physical phones in the real-phone fleet. Phones are switched off with is_active, never deleted, so history keeps pointing at something.';

-- RLS on with no policies, the same as accounts: only the service role (the
-- app's route handlers) reads or writes. A phone's proxy and proof screenshot
-- should not be readable with the public anon key.
alter table public.devices enable row level security;
revoke all on table public.devices from anon, authenticated;

alter table public.accounts
  add column if not exists device_id bigint references public.devices (id) on delete restrict;

create index if not exists idx_accounts_device_id
  on public.accounts (device_id) where device_id is not null;

comment on column public.accounts.device_id is
  'The physical phone this account lives on. NULL for accounts still on Geelark. At most three accounts per device (app-enforced).';

-- Private bucket for the proof screenshots; the app hands out short-lived
-- signed URLs. 5 MB, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('device-proofs', 'device-proofs', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
