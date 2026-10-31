-- NOT a migration. A copy, taken 2026-10-31, of the live Postgres objects the
-- Trends page and the analysis pipeline depend on and that were applied
-- straight to the project without a migration file. It is here so the logic can
-- be read and reviewed in the repo. Running it changes nothing that is not
-- already live; the tables they use (content_pipeline_jobs, outlier_watch,
-- outlier_config, v_outlier_scores) are NOT in this repo and are still live-only
-- (BACKLOG). Not covered here: outlier_ingest, outlier_evaluate,
-- outlier_queue_read, outlier_radar_batch, outlier_snapshot_batch and the other
-- outlier_* helpers; read them with pg_get_functiondef.

create or replace function public.outlier_cfg_num(k text) returns numeric
language sql stable set search_path to 'public' as
$$ select (value #>> '{}')::numeric from public.outlier_config where key = k $$;

create or replace function public.outlier_promote_on_analysis() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare w public.outlier_watch; rr numeric; s record;
begin
  if new.inspection_status is distinct from 'complete' then return new; end if;
  select * into w from public.outlier_watch where source_reference_id = new.source_reference_id order by discovered_at desc limit 1;
  if w.discovery_evidence_id is null then return new; end if;
  select reach_ratio into rr from public.v_outlier_scores where discovery_evidence_id = w.discovery_evidence_id;
  select views, likes, bookmarks into s from public.source_performance_snapshots
   where discovery_evidence_id = w.discovery_evidence_id order by observed_at desc limit 1;
  update public.references_unified u
     set format = 'carousel', status = 'trending', trending_at = coalesce(u.trending_at, now()),
         views_normalized = rr,
         total_score = 8 + least(2, log(10, greatest(coalesce(rr,1),1)::numeric) / 1.5),
         views = coalesce(s.views, u.views), likes = coalesce(s.likes, u.likes), saves = coalesce(s.bookmarks, u.saves),
         niche_tags = case when new.inferred->>'niche' = 'other' and not ('other_niches' = any(coalesce(u.niche_tags,'{}')))
                           then array_remove(array_append(coalesce(u.niche_tags,'{}'), 'other_niches'), 'peptide_niche')
                           else u.niche_tags end
   where u.id = new.source_reference_id and u.format = 'carousel_candidate';
  if found then
    update public.outlier_watch set status = 'banked', status_reason = 'breakdown ready, in Trends', updated_at = now()
     where discovery_evidence_id = w.discovery_evidence_id;
  end if;
  return new;
end $$;

drop trigger if exists outlier_promote_on_analysis on public.reference_analysis;
create trigger outlier_promote_on_analysis after insert or update on public.reference_analysis
  for each row execute function public.outlier_promote_on_analysis();

create or replace function public.outlier_decay() returns integer
language sql security definer set search_path to 'public' as $$
  with d as (
    update public.references_unified
       set total_score = 5 + least(2, log(10, greatest(coalesce(views_normalized,1),1)::numeric) / 1.5)
     where trending_at < now() - interval '7 days' and total_score >= 8
    returning 1)
  select count(*)::int from d;
$$;
-- pg_cron: job 'outlier-decay', '15 4 * * *', select public.outlier_decay()

create or replace function public.claim_content_pipeline_jobs(requested_type text, worker_id text, requested_limit integer default 1)
returns setof content_pipeline_jobs language plpgsql security definer set search_path to 'public' as $$
begin
  if worker_id is null or length(btrim(worker_id)) = 0 then
    raise exception 'worker_id is required';
  end if;
  if requested_limit < 1 or requested_limit > 10 then
    raise exception 'requested_limit must be between 1 and 10';
  end if;
  -- A terminated n8n execution must not strand work forever.
  update public.content_pipeline_jobs
  set state = case when attempts >= max_attempts then 'failed' else 'retry' end,
      locked_at = null, locked_until = null, locked_by = null,
      last_error = coalesce(last_error, 'worker lease expired'),
      next_attempt_at = now(), updated_at = now()
  where job_type = requested_type and state = 'running'
    and coalesce(locked_until, locked_at + interval '15 minutes') < now();
  return query
  with candidates as (
    select id from public.content_pipeline_jobs
    where job_type = requested_type and state in ('queued', 'retry')
      and attempts < max_attempts and next_attempt_at <= now()
    order by priority asc, created_at asc
    for update skip locked
    limit requested_limit
  ), claimed as (
    update public.content_pipeline_jobs j
    set state = 'running', attempts = attempts + 1, locked_at = now(),
        locked_until = now() + interval '10 minutes',
        locked_by = worker_id, updated_at = now()
    from candidates c
    where j.id = c.id
    returning j.*
  )
  select * from claimed;
end;
$$;

create or replace function public.finish_content_pipeline_job(requested_id uuid, worker_id text, succeeded boolean, output jsonb default '{}'::jsonb, error_message text default null)
returns content_pipeline_jobs language plpgsql security definer set search_path to 'public' as $$
declare updated public.content_pipeline_jobs;
begin
  update public.content_pipeline_jobs
  set state = case when succeeded then 'succeeded' when attempts >= max_attempts then 'failed' else 'retry' end,
      result = coalesce(output, '{}'::jsonb),
      last_error = left(error_message, 1000),
      next_attempt_at = case when succeeded then next_attempt_at
        else now() + make_interval(mins => least(1440, (power(2, greatest(attempts - 1, 0)) * 5)::integer)) end,
      completed_at = case when succeeded or attempts >= max_attempts then now() else null end,
      locked_at = null, locked_until = null, locked_by = null, updated_at = now()
  where id = requested_id and state = 'running' and locked_by = worker_id
  returning * into updated;
  if updated.id is null then raise exception 'job is not owned by worker'; end if;
  return updated;
end;
$$;
