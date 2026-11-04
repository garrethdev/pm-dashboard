-- Content pipeline job queue: claim and finish. Rolled back; read the RESULT in the error.
-- Uses the retired 'deep_judge' type (the table only allows known types).
do $t$
declare
  res jsonb := '{}'::jsonb; a uuid; b uuid; n int; r public.content_pipeline_jobs; got uuid[]; ok boolean;
begin
  if exists (select 1 from public.content_pipeline_jobs where job_type='deep_judge' and state in ('queued','retry','running')) then raise exception 'ABORT real deep_judge jobs present'; end if;
  insert into public.content_pipeline_jobs(job_type, dedupe_key, state, priority, max_attempts) values ('deep_judge','zz-a','queued',1,3) returning id into a;
  insert into public.content_pipeline_jobs(job_type, dedupe_key, state, priority, max_attempts) values ('deep_judge','zz-b','queued',2,1) returning id into b;

  select * into r from public.claim_content_pipeline_jobs('deep_judge','w1',1);
  res := res || jsonb_build_object('1_claims_best_priority_first', r.id = a, '1_running', r.state = 'running', '1_attempt_counted', r.attempts = 1, '1_owner', r.locked_by = 'w1', '1_lease_set', r.locked_until > now());

  select array_agg(id) into got from public.claim_content_pipeline_jobs('deep_judge','w2',5);
  res := res || jsonb_build_object('2_second_worker_gets_only_the_other', got = array[b]);

  begin
    perform public.finish_content_pipeline_job(a, 'w2', true);
    ok := false;
  exception when others then ok := sqlerrm = 'job is not owned by worker'; end;
  res := res || jsonb_build_object('3_wrong_worker_refused', ok);

  select * into r from public.finish_content_pipeline_job(a, 'w1', true, '{"x":1}'::jsonb);
  res := res || jsonb_build_object('4_succeeded', r.state = 'succeeded', '4_lock_cleared', r.locked_by is null and r.locked_until is null, '4_completed_at', r.completed_at is not null);

  select * into r from public.finish_content_pipeline_job(b, 'w2', false, '{}'::jsonb, 'boom');
  res := res || jsonb_build_object('5_out_of_attempts_is_failed', r.state = 'failed', '5_error_kept', r.last_error = 'boom');

  insert into public.content_pipeline_jobs(job_type, dedupe_key, state, priority, max_attempts) values ('deep_judge','zz-c','queued',1,3) returning id into a;
  perform public.claim_content_pipeline_jobs('deep_judge','w1',1);
  select * into r from public.finish_content_pipeline_job(a, 'w1', false, '{}'::jsonb, 'flaky');
  res := res || jsonb_build_object('6_failure_with_attempts_left_retries', r.state = 'retry', '6_backoff', r.next_attempt_at > now());
  select count(*) into n from public.claim_content_pipeline_jobs('deep_judge','w1',5);
  res := res || jsonb_build_object('7_retry_waits_for_its_time', n = 0);
  update public.content_pipeline_jobs set next_attempt_at = now() - interval '1 minute' where id = a;
  select count(*) into n from public.claim_content_pipeline_jobs('deep_judge','w1',5);
  res := res || jsonb_build_object('8_retry_runs_when_due', n = 1);

  update public.content_pipeline_jobs set locked_at = now() - interval '20 minutes', locked_until = now() - interval '10 minutes' where id = a;
  select array_agg(id) into got from public.claim_content_pipeline_jobs('deep_judge','w3',5);
  res := res || jsonb_build_object('9_expired_lease_is_reclaimed', got = array[a]);
  select * into r from public.content_pipeline_jobs where id = a;
  res := res || jsonb_build_object('9_new_owner', r.locked_by = 'w3', '9_attempts', r.attempts);

  begin perform public.claim_content_pipeline_jobs('deep_judge','',1); ok := false; exception when others then ok := true; end;
  res := res || jsonb_build_object('10_blank_worker_refused', ok);
  begin perform public.claim_content_pipeline_jobs('deep_judge','w',11); ok := false; exception when others then ok := true; end;
  res := res || jsonb_build_object('11_limit_over_10_refused', ok);

  raise exception 'RESULT %', res::text;
end $t$;
