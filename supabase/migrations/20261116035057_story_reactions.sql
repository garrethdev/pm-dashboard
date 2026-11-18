-- Story Research Agent: how people reacted to each kept story.
-- story_reactions holds the comments themselves (no usernames); story_bank gets
-- the read of them. Service role only, like story_bank and hook_library.

create table public.story_reactions (
  id          bigint generated always as identity primary key,
  story_id    bigint not null references public.story_bank(id) on delete cascade,
  platform    text not null,
  comment_key text not null,            -- the platform's own comment id
  parent_key  text,                     -- for a reply: the comment_key it answers
  is_reply    boolean not null default false,
  text        text not null,
  likes       bigint,
  reply_count bigint,
  posted_at   timestamptz,
  run_id      text,
  created_at  timestamptz not null default now(),
  unique (platform, comment_key)
);
create index story_reactions_story_id_idx on public.story_reactions (story_id);

alter table public.story_reactions enable row level security;
revoke all on public.story_reactions from anon, authenticated, public;
grant all on public.story_reactions to service_role;

alter table public.story_bank
  add column reactions_read_at     timestamptz,
  add column reaction_count        integer,
  add column reaction_mood         text check (reaction_mood in ('supportive','me_too','split','hostile','joking','mixed')),
  add column reaction_summary      text,
  add column reaction_hot_moments  text[],
  add column reaction_questions    text[],
  add column reaction_pushback     text[],
  add column reaction_me_too       text[],
  add column talk_ratio            numeric generated always as
    (case when views > 0 and comments is not null then round(comments::numeric / views, 5) end) stored;

comment on column public.story_bank.talk_ratio is 'comments per view; high = the story gets people talking';
comment on column public.story_bank.reaction_hot_moments is 'the parts of the story the comments react to most (paraphrased)';
