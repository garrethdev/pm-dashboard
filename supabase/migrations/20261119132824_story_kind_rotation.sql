-- Story kind rotation (Garreth, 2026-11-19: "we are only using 1 story of getting kicked out of the wedding").
-- The best-scoring Jealousy stories are mostly weddings, so next_story kept serving weddings.
-- story_kind() gives each story a coarse kind (wedding, friends, family, partner, work, other) from its
-- text and who hurt her. next_story now prefers a story whose kind differs from the lane's last 2 picks
-- (this run's holds included), and only then falls back to the usual order. Nothing else changes.

create or replace function public.story_kind(p_story_id bigint)
returns text language sql stable as $$
  select case
    when concat_ws(' ', b.title, b.summary, left(b.text, 4000))
         ~* '(wedding|bride|bridal|maid of hono(u)?r|bridesmaid|bachelorette|\mMOH\M)' then 'wedding'
    when b.who_hurt_her ~* '(coworker|co-worker|boss|manager|colleague|work)' then 'work'
    when b.who_hurt_her ~* '(husband|boyfriend|partner|fianc|\mex\M)' then 'partner'
    when b.who_hurt_her ~* '(mother|mom|mum|sister|brother|family|in-law|aunt|cousin|father|dad|daughter|son|grand)' then 'family'
    when b.who_hurt_her ~* '(friend)' then 'friends'
    else 'other'
  end
  from public.story_bank b where b.id = p_story_id;
$$;

create or replace function public.next_story(p_lane text, p_run_id text default null)
returns jsonb language plpgsql as $$
declare
  l        public.story_lanes;
  cfg      public.story_wiring_settings;
  v_floor  smallint;
  v_story  bigint;
  v_use    bigint;
  v_recent text[];
begin
  select * into l from public.story_lanes where lane = p_lane and active;
  if not found then raise exception 'next_story: no active lane %', p_lane; end if;
  select * into cfg from public.story_wiring_settings where id = 1;

  update public.story_uses
     set status = 'released', released_at = now(), note = 'reservation expired'
   where status = 'reserved' and reserved_at < now() - make_interval(hours => cfg.reservation_hours);

  -- Kinds of the lane's last 2 picks that were not let go (a run's own holds count).
  select coalesce(array_agg(k), '{}') into v_recent
    from (select public.story_kind(u.story_id) as k
            from public.story_uses u
           where u.lane = p_lane and u.status <> 'released'
           order by u.id desc limit 2) r;

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
     order by (public.story_kind(b.id) = any (v_recent)) asc,
              b.judge_score desc, (b.reactions_read_at is not null) desc, f.fit desc,
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
             'fit', f.fit, 'fit_reason', f.reason, 'kind', public.story_kind(v_story),
             'story', to_jsonb(p),
             'proven_hooks', public.proven_hooks_for(p_lane, p.theme))
      from public.v_story_packet p
      join public.story_lane_fit f on f.story_id = p.story_id and f.lane = p_lane
     where p.story_id = v_story);
end $$;

revoke all on function public.story_kind(bigint), public.next_story(text, text) from anon, authenticated, public;
grant execute on function public.story_kind(bigint), public.next_story(text, text) to service_role;
