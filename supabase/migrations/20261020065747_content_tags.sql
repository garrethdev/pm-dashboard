-- DA-03: tag every post with what is in it (Czedrick, 2026-10-09;
-- docs/DEEP-ANALYTICS-TICKETS.md). Decisions 2026-10-20: each lane keeps the
-- hook types it was written with, and the face tag covers carousels and
-- videos.
--
-- ONE ROW PER PIECE OF CONTENT, not per post: the same carousel posted to
-- TikTok, Instagram and Facebook is one piece, joined to all three posts by
-- content_id = carousel_id on the performance tables.
--
-- Most of it is copied from what the content was made with (the lane's own
-- table). The AI fills only what no table holds: whether a face shows on the
-- first slide or frame, the hook words for the two lanes that keep none, and a
-- hook type for the lanes whose writers did not record one. Each AI-filled
-- field says so in its *_source column.
--
-- Empty, not a guess: a tag that could not be read stays empty and `problem`
-- says why. Written by the dashboard's tagging job (/api/content-tags/run)
-- with the service key; nothing else writes it.
create table if not exists public.content_tags (
  content_type      text        not null,
  content_id        text        not null,
  character         text,
  -- 'image_carousel' or 'video', from the content type registry.
  media_shape       text,
  -- The words on slide 1 / the first frame.
  hook_text         text,
  hook_text_source  text        check (hook_text_source in ('writer', 'ai')),
  -- As the lane records it, e.g. 'talk_to_weight:fired'.
  hook_type         text,
  -- The part before the colon, e.g. 'talk_to_weight'. What comparisons group
  -- by, because one lane's thirty fine-grained types are too thin to compare.
  hook_family       text,
  hook_type_source  text        check (hook_type_source in ('writer', 'ai')),
  slide_count       integer,
  video_seconds     numeric,
  -- A person's or character's face (puppet and illustrated characters count)
  -- on slide 1 or the frame half a second into the video.
  face              boolean,
  -- Why a tag is empty: the image could not be fetched, the AI's reply could
  -- not be read, and so on.
  problem           text,
  model             text,
  tagged_at         timestamptz not null default now(),
  primary key (content_type, content_id)
);

alter table public.content_tags enable row level security;
-- Named, because "revoke from public" leaves anon and authenticated granted.
revoke all on table public.content_tags from public, anon, authenticated;

comment on table public.content_tags is
  'DA-03: what each posted piece of content is (hook, face, slides, length). '
  'One row per piece, joined to posts by content_id = carousel_id. Written by '
  'the dashboard''s tagging job; *_source says writer or ai.';

-- Posted content with no tags yet, most recently posted first. "Posted" means
-- it has a row in any platform's performance table.
create or replace function public.content_tags_todo(p_limit integer default 40)
returns table (content_type text, content_id text, media_url text, media_urls text[], last_posted_at timestamptz)
language sql
stable
set search_path to 'public', 'pg_temp'
as $function$
  with posted as (
    select p.carousel_id as id, max(p.posted_at) as at
    from (
      select carousel_id, posted_at from post_performance
      union all select carousel_id, posted_at from tt_post_performance
      union all select carousel_id, posted_at from fb_post_performance
    ) p
    where p.carousel_id is not null
    group by p.carousel_id
  ),
  pieces as (
    select distinct on (u.content_type, u.content_id)
      u.content_type, u.content_id, u.media_url, u.media_urls, posted.at
    from posted
    join unified_posts u on u.content_id = posted.id
    order by u.content_type, u.content_id
  )
  select pieces.content_type, pieces.content_id, pieces.media_url, pieces.media_urls, pieces.at
  from pieces
  where not exists (
    select 1 from content_tags t
    where t.content_type = pieces.content_type and t.content_id = pieces.content_id
  )
  order by pieces.at desc nulls last
  limit greatest(p_limit, 0);
$function$;

revoke all on function public.content_tags_todo(integer) from public, anon, authenticated;
grant execute on function public.content_tags_todo(integer) to service_role;
