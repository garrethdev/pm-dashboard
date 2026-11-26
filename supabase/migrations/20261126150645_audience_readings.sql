-- Who an account reaches, for the whole account rather than one post
-- (Garreth, 2026-11-26: every account on every platform should show gender,
-- age and country; only the audience, never the followers' make-up).
-- Not to be confused with the older account_audience (five Geelark-era rows
-- from 2026-08-21, read by nothing).
--
-- Two sources write it:
--   'instagram_api': Instagram's engaged_audience_demographics (people who
--     liked, commented, shared or saved this month), weekly, from
--     src/server/audience-readings.ts. Instagram gives nothing under 100
--     followers and answers "Not enough users" when too few engaged.
--   'robot': the analytics robot's photos of the app's own audience screen
--     (TikTok Analytics > Viewers, Facebook's professional dashboard), read
--     by the dashboard's screen reader.
--
-- One row per account, source and day: a second run the same day replaces it.
--
-- EMPTY IS NOT 0. When the platform shows no audience, gender/age/country stay
-- null and `gap` says why.
create table if not exists public.audience_readings (
  id          bigserial    primary key,
  platform    text         not null check (platform in ('tiktok', 'instagram', 'facebook')),
  -- The account's name as the performance tables name it.
  account     text         not null,
  source      text         not null check (source in ('instagram_api', 'robot')),
  read_at     timestamptz  not null default now(),
  read_on     date         not null default ((now() at time zone 'utc')::date),
  -- What the numbers cover, in the platform's words ('this_month', 'Last 28 days').
  timeframe   text,
  -- How many people the numbers are made of, when the platform says.
  people      integer,
  -- {"Women": 87.5, "Men": 12.5}, {"35-44": 30.5, ...}, {"United States": 38.3, ...}
  gender      jsonb,
  age         jsonb,
  country     jsonb,
  gap         text         check (gap in ('too_few_followers', 'not_enough_engagement', 'not_shown', 'error')),
  notes       text,
  -- Robot readings: the photos in the post-screens bucket.
  screenshots text[],
  model       text,
  raw         jsonb,
  unique (platform, account, source, read_on)
);

create index if not exists audience_readings_latest_idx
  on public.audience_readings (platform, account, read_at desc);

alter table public.audience_readings enable row level security;
-- Named, because "revoke from public" leaves anon and authenticated granted.
revoke all on table public.audience_readings from public, anon, authenticated;
revoke all on sequence public.audience_readings_id_seq from public, anon, authenticated;

comment on table public.audience_readings is
  'Who an account reaches (gender, age, country), for the whole account. '
  'instagram_api = engaged audience this month; robot = the app''s audience screen. '
  'Empty is not 0: null with gap saying why. Written with the service key only.';
