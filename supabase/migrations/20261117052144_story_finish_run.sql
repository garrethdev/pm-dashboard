-- Story wiring: one call to close a writer run (SW-04, Comparison first).
-- A writer holds one story per deck with next_story(lane, run_id). At the end
-- it calls finish_story_run(run_id, saved) once: every saved deck is recorded
-- (record_story_use), and every story the run held but did not save is let go
-- at once instead of waiting 12 hours. A test run with saving off passes an
-- empty list, so it uses up no stories.
--
-- p_saved: [{"use_id": 12, "deck_ref": "CC-0031", "hook_text": "..."}]
create or replace function public.finish_story_run(p_run_id text, p_saved jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
as $$
declare
  r          jsonb;
  v_recorded int := 0;
  v_released int;
begin
  if p_run_id is null or p_run_id = '' then
    raise exception 'finish_story_run: run id is required';
  end if;

  for r in select * from jsonb_array_elements(coalesce(p_saved, '[]'::jsonb)) loop
    if exists (select 1 from public.story_uses
                where id = (r->>'use_id')::bigint and run_id = p_run_id and status = 'reserved') then
      perform public.record_story_use((r->>'use_id')::bigint, r->>'deck_ref', r->>'hook_text');
      v_recorded := v_recorded + 1;
    end if;
  end loop;

  update public.story_uses
     set status = 'released', released_at = now(), note = 'run ended without saving this deck'
   where run_id = p_run_id and status = 'reserved';
  get diagnostics v_released = row_count;

  return jsonb_build_object('run_id', p_run_id, 'recorded', v_recorded, 'released', v_released);
end $$;

revoke all on function public.finish_story_run(text, jsonb) from anon, authenticated, public;
grant execute on function public.finish_story_run(text, jsonb) to service_role;
