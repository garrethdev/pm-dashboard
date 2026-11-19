-- Story wiring: carousel writers take their stories and hooks from the Story
-- Research Agent (docs/STORY-AGENT-WRITER-WIRING-PLAN.md, SW-01b, SW-02, SW-08).
-- Garreth, 2026-11-17: go to build, and it must be easy to add new workflows.
--
-- How a new workflow joins: one row in story_lanes (its key, its theme in plain
-- words, its slide count). Nothing else changes. The lane-fit job then scores
-- every waiting story for it, and next_story('<lane>') starts serving it.
--
-- Nothing reads these yet; each writer switches over on its own (SW-04..07).
-- Service role only, like story_bank and hook_library.

-- 1. Settings shared by all lanes (one row)
create table public.story_wiring_settings (
  id                smallint primary key default 1 check (id = 1),
  max_uses          smallint not null default 5,      -- one story, at most 5 decks in all
  breakout_views    integer  not null default 3000,   -- any one post at this many views = proven hook
  reservation_hours smallint not null default 12,     -- a held story is let go if no deck is recorded by then
  updated_at        timestamptz not null default now()
);
insert into public.story_wiring_settings default values;

-- 2. The lanes that read stories. One row per workflow.
create table public.story_lanes (
  lane            text primary key references public.content_type_registry(content_type),
  display_name    text not null,
  brief           text not null,                   -- what kind of story fits; the lane-fit judge reads this
  slide_count     smallint not null,
  min_score       smallint not null default 8,     -- story score needed
  fallback_score  smallint not null default 7,     -- used when no story at min_score is left
  min_fit         smallint not null default 7,     -- fit score needed for this lane
  breakout_views  integer,                         -- this lane's own bar; empty = the shared one
  active          boolean not null default true,   -- false = not scored, not served
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

insert into public.story_lanes (lane, display_name, slide_count, brief) values
('comparison_carousel', 'Comparison', 8,
 'She tried one way to lose weight, then another, and the deck compares them. Fits stories where diets, exercise or willpower kept failing her, often while someone close (husband, mother, friend) watched or commented, and where a different way could come in late.'),
('jealousy_carousel', 'Jealousy', 6,
 'As she changed, someone close to her (a friend, sister, mother, coworker, in-laws) turned jealous or cutting: backhanded compliments, sabotage, "can you keep it off?". Fits stories with one clear person who resents her change and a line they said.'),
('divorce_recovery', 'Divorce Recovery', 6,
 'After a divorce or separation she rebuilds herself while the ex still leans on her, underestimates her or wants her back. Fits stories about an ex, a long marriage ending, being taken for granted, and her quietly moving on.'),
('viral_theories', 'Viral Theories', 6,
 'A quiet moment where how she sees her body clashes with what she is told: her husband says she is beautiful and she cannot believe it, she hides from photos, a comment lands hard. Fits inner-feeling stories about self-image in her 40s, menopause or feeling unseen.'),
('journey_3slide', '3-Slide Journey', 3,
 'Only the first slide is written; slides 2 and 3 are her before and after pictures. Fits stories with one strong turning-point line about her weight: a goal, a birthday, saying goodbye to the weight, deciding she is done.');

-- 3. How well each story fits each lane (0-10), from the lane-fit judge
create table public.story_lane_fit (
  story_id   bigint not null references public.story_bank(id) on delete cascade,
  lane       text   not null references public.story_lanes(lane) on delete cascade,
  fit        smallint not null check (fit between 0 and 10),
  reason     text,
  judged_by  text,
  judged_at  timestamptz not null default now(),
  primary key (story_id, lane)
);
create index story_lane_fit_lane_idx on public.story_lane_fit (lane, fit desc);

-- 4. Every time a writer takes a story: held for the run, then used (or let go)
create table public.story_uses (
  id               bigint generated always as identity primary key,
  story_id         bigint not null references public.story_bank(id) on delete cascade,
  lane             text   not null references public.story_lanes(lane),
  status           text   not null default 'reserved' check (status in ('reserved','used','released')),
  run_id           text,
  deck_ref         text,          -- the deck's carousel_id in its lane table
  hook_id          bigint references public.hook_library(id) on delete set null,
  hook_text        text,          -- the hook the deck went out with
  best_views       bigint,        -- best single post, from the breakout check
  views_checked_at timestamptz,
  breakout_at      timestamptz,   -- when its hook went into hook_library as proven
  note             text,
  reserved_at      timestamptz not null default now(),
  used_at          timestamptz,
  released_at      timestamptz
);
-- once per lane (a let-go reservation does not count)
create unique index story_uses_once_per_lane on public.story_uses (story_id, lane) where status <> 'released';
create index story_uses_story_idx on public.story_uses (story_id);
create index story_uses_deck_idx  on public.story_uses (deck_ref) where deck_ref is not null;

-- 5. Proven hooks in hook_library: which lane proved it and with how many views
alter table public.hook_library drop constraint hook_library_status_check;
alter table public.hook_library add constraint hook_library_status_check
  check (status in ('pending','approved','rejected','used','retired','proven'));
alter table public.hook_library
  add column lane         text references public.story_lanes(lane),
  add column proven_views bigint,
  add column proven_at    timestamptz,
  add column proven_deck  text;
create index hook_library_proven_idx on public.hook_library (lane, proven_views desc) where status = 'proven';

-- 6. Everything a writer needs about one story, in one row
create view public.v_story_packet with (security_invoker = on) as
select b.id as story_id, b.platform, b.kind, b.source_url, b.community, b.title, b.text, b.slide_text,
       b.summary, b.best_line, b.who_hurt_her, b.detail, b.theme, b.story_format, b.hook_pattern,
       b.product_entry, b.setting, b.emotion, b.action, b.judge_score, b.views, b.likes, b.comments,
       b.talk_ratio, b.reaction_mood, b.reaction_summary, b.reaction_hot_moments, b.reaction_questions,
       b.reaction_pushback, b.reaction_me_too,
       coalesce((
         select jsonb_agg(jsonb_build_object(
                  'likes', r.likes, 'comment', left(r.text, 300),
                  'replies', coalesce((
                     select jsonb_agg(jsonb_build_object('likes', x.likes, 'reply', left(x.text, 200)) order by x.likes desc nulls last)
                     from (select * from public.story_reactions x
                           where x.story_id = r.story_id and x.parent_key = r.comment_key
                           order by x.likes desc nulls last limit 2) x), '[]'::jsonb))
                order by r.likes desc nulls last)
         from (select * from public.story_reactions r
               where r.story_id = b.id and not r.is_reply
               order by r.likes desc nulls last limit 8) r), '[]'::jsonb) as top_comments,
       coalesce((
         select jsonb_agg(jsonb_build_object('hook_id', h.id, 'hook', h.hook, 'pattern', h.hook_pattern, 'status', h.status) order by h.id)
         from public.hook_library h
         where h.story_id = b.id and h.status in ('pending','approved','proven')), '[]'::jsonb) as drafted_hooks,
       (select count(*) from public.story_uses u where u.story_id = b.id and u.status <> 'released') as uses,
       (select coalesce(array_agg(u.lane order by u.lane), '{}') from public.story_uses u
         where u.story_id = b.id and u.status <> 'released') as used_in
from public.story_bank b;

-- 7. Proven hooks for a lane: its own first, then ones on the story's theme, then any
create function public.proven_hooks_for(p_lane text, p_theme text default null, p_limit int default 10)
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('hook_id', id, 'hook', hook, 'lane', lane, 'views', proven_views)), '[]'::jsonb)
  from (select id, hook, lane, proven_views from public.hook_library
        where status = 'proven'
        order by (lane = p_lane) desc nulls last, (theme = p_theme) desc nulls last, proven_views desc nulls last
        limit p_limit) h;
$$;

-- 8. "Next story for my lane": picks the best eligible story, holds it, returns its packet
create function public.next_story(p_lane text, p_run_id text default null)
returns jsonb language plpgsql as $$
declare
  l        public.story_lanes;
  cfg      public.story_wiring_settings;
  v_floor  smallint;
  v_story  bigint;
  v_use    bigint;
begin
  select * into l from public.story_lanes where lane = p_lane and active;
  if not found then raise exception 'next_story: no active lane %', p_lane; end if;
  select * into cfg from public.story_wiring_settings where id = 1;

  update public.story_uses
     set status = 'released', released_at = now(), note = 'reservation expired'
   where status = 'reserved' and reserved_at < now() - make_interval(hours => cfg.reservation_hours);

  foreach v_floor in array array[l.min_score, l.fallback_score] loop
    select b.id into v_story
      from public.story_bank b
      join public.story_lane_fit f on f.story_id = b.id and f.lane = p_lane
     where b.status in ('new','approved')
       and b.judge_score >= v_floor
       and f.fit >= l.min_fit
       and not exists (select 1 from public.story_uses u
                        where u.story_id = b.id and u.lane = p_lane and u.status <> 'released')
       and (select count(*) from public.story_uses u
             where u.story_id = b.id and u.status <> 'released') < cfg.max_uses
     order by b.judge_score desc, (b.reactions_read_at is not null) desc, f.fit desc,
              b.talk_ratio desc nulls last, b.views desc nulls last, b.id
     limit 1
     for update of b skip locked;
    exit when v_story is not null;
  end loop;

  if v_story is null then return null; end if;

  insert into public.story_uses (story_id, lane, run_id) values (v_story, p_lane, p_run_id)
  returning id into v_use;

  return (
    select jsonb_build_object(
             'use_id', v_use, 'lane', l.lane, 'lane_brief', l.brief, 'slide_count', l.slide_count,
             'fit', f.fit, 'fit_reason', f.reason,
             'story', to_jsonb(p),
             'proven_hooks', public.proven_hooks_for(p_lane, p.theme))
      from public.v_story_packet p
      join public.story_lane_fit f on f.story_id = p.story_id and f.lane = p_lane
     where p.story_id = v_story);
end $$;

-- 9. After the deck is saved: record it (and the hook it used)
create function public.record_story_use(p_use_id bigint, p_deck_ref text, p_hook_text text, p_hook_id bigint default null)
returns void language plpgsql as $$
declare v_hook bigint := p_hook_id;
begin
  if v_hook is null and p_hook_text is not null then
    select id into v_hook from public.hook_library where hook = p_hook_text;
  end if;
  update public.story_uses
     set status = 'used', used_at = now(), deck_ref = p_deck_ref, hook_text = p_hook_text, hook_id = v_hook
   where id = p_use_id and status = 'reserved';
  if not found then raise exception 'record_story_use: % is not a held story', p_use_id; end if;
  if v_hook is not null then
    update public.hook_library set used_count = coalesce(used_count, 0) + 1, last_used_at = now() where id = v_hook;
  end if;
end $$;

-- 10. A run that failed or wrote nothing: let the story go
create function public.release_story_use(p_use_id bigint, p_note text default null)
returns void language sql as $$
  update public.story_uses set status = 'released', released_at = now(), note = p_note
   where id = p_use_id and status = 'reserved';
$$;

-- 11. Lane-fit work: which waiting stories still need a fit score, and for which lanes.
--     Adding a lane makes every waiting story show up here again for that lane.
create function public.lane_fit_batch(p_limit int default 20)
returns jsonb language sql stable as $$
  with lanes as (select lane, display_name, slide_count, brief from public.story_lanes where active),
  todo as (
    select b.id, array_agg(l.lane order by l.lane) as lanes_missing
      from public.story_bank b cross join lanes l
     where b.status in ('new','approved')
       and b.judge_score >= (select min(fallback_score) from public.story_lanes where active)
       and not exists (select 1 from public.story_lane_fit f where f.story_id = b.id and f.lane = l.lane)
     group by b.id
     order by max(b.judge_score) desc, b.id
     limit p_limit)
  select jsonb_build_object(
    'lanes', (select coalesce(jsonb_agg(to_jsonb(lanes)), '[]'::jsonb) from lanes),
    'left',  (select count(distinct b.id) from public.story_bank b cross join lanes l
               where b.status in ('new','approved')
                 and b.judge_score >= (select min(fallback_score) from public.story_lanes where active)
                 and not exists (select 1 from public.story_lane_fit f where f.story_id = b.id and f.lane = l.lane)),
    'stories', coalesce((select jsonb_agg(jsonb_build_object(
        'story_id', b.id, 'lanes_missing', t.lanes_missing, 'kind', b.kind, 'theme', b.theme,
        'title', b.title, 'summary', b.summary, 'best_line', b.best_line, 'who_hurt_her', b.who_hurt_her,
        'text', left(b.text, 1500), 'reaction_summary', b.reaction_summary) order by b.judge_score desc, b.id)
      from todo t join public.story_bank b on b.id = t.id), '[]'::jsonb));
$$;

-- 12. Save fit scores: [{"story_id":1,"lane":"jealousy_carousel","fit":8,"reason":"..."}]
create function public.save_lane_fit(p_rows jsonb, p_judged_by text default null)
returns integer language sql as $$
  with ins as (
    insert into public.story_lane_fit (story_id, lane, fit, reason, judged_by)
    select (r->>'story_id')::bigint, r->>'lane', greatest(0, least(10, round((r->>'fit')::numeric)))::smallint,
           left(r->>'reason', 300), p_judged_by
      from jsonb_array_elements(p_rows) r
     where exists (select 1 from public.story_lanes l where l.lane = r->>'lane')
       and exists (select 1 from public.story_bank b where b.id = (r->>'story_id')::bigint)
    on conflict (story_id, lane) do update
      set fit = excluded.fit, reason = excluded.reason, judged_by = excluded.judged_by, judged_at = now()
    returning 1)
  select count(*)::int from ins;
$$;

-- 13. Daily breakout check: best single post per recorded deck; a hook whose
--     deck reached the bar goes into hook_library as proven, with lane and views.
create function public.story_breakout_check()
returns jsonb language plpgsql as $$
declare v_checked int; v_new int := 0; r record; v_hook bigint;
begin
  with best as (
    select u.id, max(v.views) as views
      from public.story_uses u
      join lateral (
        select views from public.post_performance    where carousel_id = u.deck_ref
        union all select views from public.tt_post_performance where carousel_id = u.deck_ref
        union all select views from public.fb_post_performance where carousel_id = u.deck_ref) v on true
     where u.status = 'used' and u.deck_ref is not null
     group by u.id)
  update public.story_uses u set best_views = best.views, views_checked_at = now()
    from best where best.id = u.id and best.views is not null;
  get diagnostics v_checked = row_count;

  for r in
    select u.*, coalesce(l.breakout_views, s.breakout_views) as bar, b.theme
      from public.story_uses u
      join public.story_lanes l on l.lane = u.lane
      join public.story_bank b on b.id = u.story_id
      cross join public.story_wiring_settings s
     where u.status = 'used' and u.breakout_at is null and u.hook_text is not null
       and u.best_views >= coalesce(l.breakout_views, s.breakout_views)
  loop
    insert into public.hook_library (hook, status, source, story_id, lane, theme, proven_views, proven_at, proven_deck, char_count, written_by, notes)
    values (r.hook_text, 'proven', 'breakout', r.story_id, r.lane, r.theme, r.best_views, now(), r.deck_ref,
            length(r.hook_text), 'story_breakout_check', 'deck ' || r.deck_ref || ' reached ' || r.best_views || ' views')
    on conflict (hook) do update
      set status = 'proven',
          lane = coalesce(public.hook_library.lane, excluded.lane),
          proven_views = greatest(coalesce(public.hook_library.proven_views, 0), excluded.proven_views),
          proven_at = coalesce(public.hook_library.proven_at, now()),
          proven_deck = coalesce(public.hook_library.proven_deck, excluded.proven_deck)
    returning id into v_hook;
    update public.story_uses set breakout_at = now(), hook_id = v_hook where id = r.id;
    v_new := v_new + 1;
  end loop;

  -- proven hooks keep their best count up to date
  update public.hook_library h set proven_views = u.best_views
    from public.story_uses u
   where u.hook_id = h.id and h.status = 'proven' and u.best_views > coalesce(h.proven_views, 0);

  return jsonb_build_object('decks_checked', v_checked, 'new_proven_hooks', v_new);
end $$;

-- 14. Locked down: service role only
alter table public.story_wiring_settings enable row level security;
alter table public.story_lanes           enable row level security;
alter table public.story_lane_fit        enable row level security;
alter table public.story_uses            enable row level security;
revoke all on public.story_wiring_settings, public.story_lanes, public.story_lane_fit, public.story_uses, public.v_story_packet
  from anon, authenticated, public;
grant all on public.story_wiring_settings, public.story_lanes, public.story_lane_fit, public.story_uses, public.v_story_packet
  to service_role;
revoke all on function public.proven_hooks_for(text, text, int), public.next_story(text, text),
  public.record_story_use(bigint, text, text, bigint), public.release_story_use(bigint, text),
  public.lane_fit_batch(int), public.save_lane_fit(jsonb, text), public.story_breakout_check()
  from anon, authenticated, public;
grant execute on function public.proven_hooks_for(text, text, int), public.next_story(text, text),
  public.record_story_use(bigint, text, text, bigint), public.release_story_use(bigint, text),
  public.lane_fit_batch(int), public.save_lane_fit(jsonb, text), public.story_breakout_check()
  to service_role;

-- 15. Breakout check every day at 14:00 UTC (9am ET), after the 13:30 view snapshots
select cron.schedule('story-breakout-check', '0 14 * * *', $$select public.story_breakout_check()$$);
