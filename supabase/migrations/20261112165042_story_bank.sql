-- Story bank: real first-person stories found by the n8n "Story Research Agent".
--
-- The agent searches Reddit and TikTok (via ScrapeCreators) and our own Virlo
-- story topics, has an AI judge score each story for how well it fits the
-- Character 6 viewer (American woman, 40s-50s, friction with the people close to
-- her), and saves every judged story here, kept or not, so the next run does not
-- pay to judge it again. Strong keepers are also copied into over40_insights and
-- jealousy_insights so the writers that already read those tables see them.
--
-- `text` is always verbatim from the source. `best_line` must be an exact
-- substring of `text` (the agent checks this before saving).

create table if not exists public.story_bank (
  id            bigserial primary key,
  source_url    text not null unique,
  platform      text not null check (platform in ('reddit', 'tiktok', 'instagram', 'virlo')),
  kind          text not null check (kind in ('post', 'comment')),
  parent_url    text,
  community     text,            -- subreddit, or creator handle
  title         text,
  text          text not null,
  views         bigint,
  likes         bigint,
  comments      bigint,
  found_by      text,            -- the search phrase or Virlo topic that found it
  theme         text,
  judge_score   smallint check (judge_score between 0 and 10),
  best_line     text,
  who_hurt_her  text,
  detail        text,
  judge_notes   text,
  status        text not null default 'new'
                check (status in ('new', 'rejected', 'approved', 'used')),
  routed_to     text[] not null default '{}',
  run_id        text,
  judged_by     text,
  reviewed_at   timestamptz,
  reviewed_by   text,
  created_at    timestamptz not null default now()
);

create index if not exists story_bank_status_score_idx
  on public.story_bank (status, judge_score desc);
create index if not exists story_bank_theme_idx on public.story_bank (theme);

-- Internal table: only the service role (n8n, server code) touches it.
alter table public.story_bank enable row level security;
revoke all on table public.story_bank from anon, authenticated;
revoke all on sequence public.story_bank_id_seq from anon, authenticated;
