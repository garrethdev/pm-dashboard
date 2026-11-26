-- Women's Complaints music (Garreth, 2026-11-25: "use more recent music"; same rule he set for Story Wall that day):
-- a deck that arrives without a song gets one of the 10 newest songs the music trend refresh added, the one this lane
-- has used least (ties at random). Runs before the ready trigger, since sr_ trigger names sort after pick_.
create or replace function public.trg_womens_complaints_pick_music() returns trigger language plpgsql as $function$
declare s record;
begin
  if new.music is null then
    select m.id, m.title, m.artist into s
    from (select id, title, artist from public.music_library
          where added_by = 'music_trend_refresh' and is_active
          order by created_at desc limit 10) m
    order by (select count(*) from public.womens_complaints_carousel w where w.music_library_id = m.id), random()
    limit 1;
    if found then
      new.music := s.title || ' - ' || s.artist;
      new.music_library_id := s.id;
    end if;
  end if;
  return new;
end $function$;
create trigger pick_music_womens_complaints_carousel before insert on public.womens_complaints_carousel
  for each row execute function public.trg_womens_complaints_pick_music();