-- PF-26: screenshot QA of manual posting (Garreth, decided 2026-10-21).
--
-- WHY. Yurie posts by hand on the real phones, and nobody can see whether the
-- steps were done right. The Air takes invisible WebDriverAgent screenshots of
-- the phone's screen while it is plugged in (one frame each time the screen
-- changes), uploads each finished session here overnight, and deletes its own
-- copy once the dashboard has confirmed every frame landed. Garreth or
-- Czedrick pick sessions at random and have Claude read the frames for
-- anomalies. The reasoning is in docs/PHONE-SCREEN-QA.md.
--
-- Three things live here:
--   phone_sessions    one row per recorded session on one phone
--   phone_plug_events when a phone was plugged into the Air and unplugged,
--                     written every day whether or not frames were kept, so a
--                     post with no recording can be told apart from a recorder
--                     that failed (not plugged in vs. our fault)
--   phone-sessions    the PRIVATE bucket the frames go in, shown only through
--                     short-lived signed links to the reviewer-only page
create table if not exists public.phone_sessions (
  id                  bigint generated always as identity primary key,
  device_id           bigint      not null references public.devices (id) on delete restrict,
  started_at          timestamptz not null,
  ended_at            timestamptz not null,
  -- 'open' while the Air is still putting frames in the bucket; 'stored' once
  -- the dashboard has listed the bucket and found every frame it was told to
  -- expect. Only a stored session is listed for review.
  status              text        not null default 'open'
                      check (status in ('open', 'stored')),
  -- How many frames the Air said it would send, and how many were found.
  expected_frames     integer     not null default 0,
  frame_count         integer     not null default 0,
  stored_at           timestamptz,
  -- The hand-out this session covers (a post_deliveries row flipped to posted
  -- on the same phone inside the session's window). Null when no post was
  -- marked done in the window.
  matched_delivery_id bigint      references public.post_deliveries (id) on delete set null,
  -- Claude's read of the frames, when a reviewer asked for one.
  reviewed_at         timestamptz,
  reviewed_by         text,
  review_model        text,
  review_summary      text,
  review              jsonb,
  created_at          timestamptz not null default now(),
  -- A resent announcement (a retry after a timeout) lands on the same row.
  constraint phone_sessions_once unique (device_id, started_at),
  constraint phone_sessions_order check (ended_at >= started_at)
);

comment on table public.phone_sessions is
  'PF-26: one recorded manual session per phone (invisible screenshots taken on the Air). Frames live in the private phone-sessions bucket under sessions/<id>/.';

create index if not exists idx_phone_sessions_device_started
  on public.phone_sessions (device_id, started_at desc);

create table if not exists public.phone_plug_events (
  id            bigint generated always as identity primary key,
  device_id     bigint      not null references public.devices (id) on delete restrict,
  plugged_in_at timestamptz not null,
  unplugged_at  timestamptz,
  created_at    timestamptz not null default now(),
  constraint phone_plug_events_once unique (device_id, plugged_in_at),
  constraint phone_plug_events_order check (unplugged_at is null or unplugged_at >= plugged_in_at)
);

comment on table public.phone_plug_events is
  'PF-26: when each phone was plugged into the Air and unplugged. Written every day, frames or not, so a post with no recording is either "not plugged in" or "recorder failed", never a guess.';

create index if not exists idx_phone_plug_events_device_time
  on public.phone_plug_events (device_id, plugged_in_at desc);

-- RLS on with no policies, as devices, post_deliveries and warmup_reports:
-- only the service role (the app's route handlers) reads or writes.
alter table public.phone_sessions enable row level security;
alter table public.phone_plug_events enable row level security;
revoke all on table public.phone_sessions from anon, authenticated;
revoke all on table public.phone_plug_events from anon, authenticated;

-- Private bucket for the frames. 2 MB a frame is generous (a changed-screen
-- frame is about 55 KB); JPEG, PNG or WebP. No policies for the public roles,
-- so nobody reads, lists or writes without the service key: the Air uploads
-- through one-time signed links the dashboard hands out, and a reviewer sees
-- a frame through a ten-minute signed link.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('phone-sessions', 'phone-sessions', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
