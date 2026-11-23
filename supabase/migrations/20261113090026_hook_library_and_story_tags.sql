-- Story Research Agent, round 2 (2026-11-13).
-- 1. story_bank gets the catalog tags Garreth asked for (setting, emotion, action),
--    the story-format / hook-pattern / product-entry vocabulary from his Handler
--    recap, a paraphrased summary, slide text read from TikTok photo carousels,
--    and an outlier score.
-- 2. hook_library replaces machine_hooks: one tagged pool of hooks any carousel
--    type can draw from, each linked to the real story it came from.

alter table public.story_bank
  add column if not exists summary text,
  add column if not exists story_format text,
  add column if not exists hook_pattern text,
  add column if not exists product_entry text,
  add column if not exists setting text,
  add column if not exists emotion text,
  add column if not exists action text,
  add column if not exists media_type text,
  add column if not exists slide_images text[],
  add column if not exists slide_text text[],
  add column if not exists followers bigint,
  add column if not exists outlier numeric;

comment on column public.story_bank.summary is 'Paraphrased retelling (1-3 sentences). The original stays in text.';
comment on column public.story_bank.story_format is 'Best way to tell it: message_reveal, counted_timeline, paired_contrast, scene_in_dialogue, claim_text_twist, unsent_draft, inherited_wisdom, list_troll_slide, match_marriage_timeline, confrontation_skit, silent_confession, long_confession_teased_object, public_insult_withheld_comeback, serialized_saga, short_fiction_moral, live_a_day_as_her, reddit_post_update, rated_texts, other.';
comment on column public.story_bank.hook_pattern is 'How the post opens (posts only): promised_message, age_decision_no_villain, public_insult_specifics, withheld_answer, counted_day, line_of_dialogue, paired_caption, private_admission, other.';
comment on column public.story_bank.product_entry is 'Where a quiet product could enter: lock_screen_notification, gift_turning_point, proof_on_phone, tracker_behind_timeline, item_in_advice_list, none.';
comment on column public.story_bank.outlier is 'Views divided by the account''s usual reach (follower count for search results, median of the account''s top posts for watched accounts).';
comment on column public.story_bank.slide_images is 'Slide image links of a TikTok photo carousel at the time it was found. They expire after about two weeks.';

create index if not exists story_bank_format_idx on public.story_bank (story_format);

create table if not exists public.hook_library (
  id bigserial primary key,
  hook text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'used', 'retired')),
  source text not null,
  story_id bigint references public.story_bank (id) on delete set null,
  source_line text,
  theme text,
  story_format text,
  hook_pattern text,
  product_entry text,
  setting text,
  emotion text,
  action text,
  antagonist text,
  char_count integer generated always as (char_length(hook)) stored,
  checks jsonb,
  notes text,
  written_by text,
  run_id text,
  reviewed_at timestamptz,
  reviewed_by text,
  used_count integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.hook_library is 'Tagged hook pool for every carousel type, replacing machine_hooks (Garreth, 2026-11-12). Written by the Story Research Agent (n8n iW82SsE2IcVucaZY) as pending; a person approves. Tags use the same vocabulary as story_bank.';

create index if not exists hook_library_status_idx on public.hook_library (status, created_at desc);
create index if not exists hook_library_tags_idx on public.hook_library (theme, emotion, setting);

alter table public.hook_library enable row level security;
revoke all on table public.hook_library from anon, authenticated;
revoke all on sequence public.hook_library_id_seq from anon, authenticated;
