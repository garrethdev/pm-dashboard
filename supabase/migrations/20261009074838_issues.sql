-- Issues reported from the dashboard itself (Garreth, 2026-10-09).
--
-- Anyone signed in can report a problem from the floating button in the
-- bottom-right corner of every page; Czedrick, Milan and Garreth work through
-- them on the Issues page, which is reached from that same button only.
--
-- reported_at is the moment the report was sent: the reporter never types a
-- date. reported_by is the signed-in email, shown on the Issues page as a
-- first name so the person fixing it knows who to ask. page_path is the page
-- the reporter was on when they pressed the button.
--
-- Written and read only by the dashboard's server with the service key, the
-- same as every other dashboard table: the public key is used daily by n8n
-- and the renderer, so this table is closed to it by name.

create table if not exists public.issues (
  id bigint generated always as identity primary key,
  reported_at timestamptz not null default now(),
  reported_by text not null,
  category text not null check (category in (
    'warmup', 'posting', 'accounts', 'devices', 'content', 'data', 'dashboard', 'other'
  )),
  description text not null check (char_length(btrim(description)) between 1 and 2000),
  screenshot_path text,
  page_path text check (page_path is null or char_length(page_path) <= 300),
  status text not null default 'open' check (status in ('open', 'in_progress', 'fixed')),
  status_changed_at timestamptz
);

create index if not exists issues_reported_at_idx on public.issues (reported_at desc);

alter table public.issues enable row level security;
revoke all on public.issues from public, anon, authenticated;
grant all on public.issues to service_role;

-- Screenshots: a PRIVATE bucket, written with the service key and shown only
-- through hour-long signed links, the way character photos are. The browser
-- shrinks anything large before sending, so 5 MB is generous.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('issue-screenshots', 'issue-screenshots', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
