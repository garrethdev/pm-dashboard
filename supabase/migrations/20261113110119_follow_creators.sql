-- Small creators for Yurie to follow by hand (Garreth, 2026-11-13).
--
-- WHY. The Warmup Upgrade Plan's step Y6: when following by hand, pick
-- creators with a few thousand followers or fewer who reply to comments, and
-- skip big accounts and brands. The robot cannot pick them (it would need to
-- read follower counts), so the dashboard holds a list and a page, Creators
-- to follow, reached from Resources. Yurie opens it on the farm phone; the
-- profile link opens the creator in the TikTok or Instagram app there.
--
-- follow_creators: the list. Filled from ScrapeCreators on 2026-11-13 (91
-- TikTok, 18 Instagram): 300 to 6,000 followers, posted in the last month,
-- women sharing their own weight-loss / GLP-1 / midlife journey, and seen
-- replying to comments on their own videos. `retired_at` takes a creator off
-- the page without losing who followed her.
--
-- creator_follows: one row per (creator, our account) once that account
-- follows her, so the follows are spread across our accounts instead of every
-- account following the same people, and so the page can count an account's
-- follows today against the plan's limit of 4 (Y5), the robot's included.
-- No who-did-it column (the app names nobody).
--
-- Service-role only, like accounts, devices and warmup_reports: RLS on, no
-- policies, anon and authenticated revoked.

create table if not exists public.follow_creators (
  id               bigint generated always as identity primary key,
  platform         text        not null,
  handle           text        not null,
  display_name     text,
  followers        integer     not null,
  bio              text,
  -- Rough tags from the bio and captions: GLP-1, Menopause, Over 40/50,
  -- Weight loss, Fitness.
  topics           text[]      not null default '{}',
  -- What the reply check saw, e.g. "12 of 20" (her replies under the first
  -- page of comments on her busiest recent video).
  replies_seen     text,
  -- The video that check read.
  evidence_url     text,
  -- The platform's own user id, so a renamed creator can still be found.
  platform_user_id text,
  -- For an Instagram creator found through her TikTok: that TikTok handle.
  tiktok_twin      text,
  found_on         date        not null default current_date,
  retired_at       timestamptz,
  created_at       timestamptz not null default now(),

  constraint follow_creators_platform_check check (platform in ('tiktok', 'instagram')),
  constraint follow_creators_handle_check check (handle = lower(handle) and handle <> ''),
  constraint follow_creators_followers_check check (followers >= 0),
  constraint follow_creators_platform_handle_key unique (platform, handle)
);

create table if not exists public.creator_follows (
  id          bigint generated always as identity primary key,
  creator_id  bigint      not null references public.follow_creators (id) on delete cascade,
  account_id  bigint      not null references public.accounts (id) on delete cascade,
  followed_at timestamptz not null default now(),
  constraint creator_follows_creator_account_key unique (creator_id, account_id)
);

-- "This account's follows today" reads by account and time.
create index if not exists creator_follows_account_followed_at_idx
  on public.creator_follows (account_id, followed_at);

alter table public.follow_creators enable row level security;
alter table public.creator_follows enable row level security;
revoke all on public.follow_creators from anon, authenticated;
revoke all on public.creator_follows from anon, authenticated;
