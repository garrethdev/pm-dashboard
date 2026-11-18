-- Fix to story_wiring: hook_library.char_count is a generated column, so the
-- breakout check must not write it. Found by the rolled-back test on 2026-11-17
-- before any deck had used the new tables. Same function otherwise.

create or replace function public.story_breakout_check()
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
    insert into public.hook_library (hook, status, source, story_id, lane, theme, proven_views, proven_at, proven_deck, written_by, notes)
    values (r.hook_text, 'proven', 'breakout', r.story_id, r.lane, r.theme, r.best_views, now(), r.deck_ref,
            'story_breakout_check', 'deck ' || r.deck_ref || ' reached ' || r.best_views || ' views')
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
