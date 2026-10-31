-- Outlier radar promotion and decay. Rolled back; read the RESULT in the error.
do $t$
declare
  res jsonb := '{}'::jsonb; ing jsonb; ref bigint; ref2 bigint; r record; ev uuid;
begin
  -- A candidate the radar found: other-niche account, 50k views on 1k followers.
  insert into public.outlier_seed_accounts(handle, followers, niche_match, active) values ('zz_test_handle', 1000, false, true) on conflict do nothing;
  ing := public.outlier_ingest(jsonb_build_object('provider_content_id','ZZTEST1','source_url','https://www.tiktok.com/@zz_test_handle/photo/ZZTEST1','creator_handle','zz_test_handle','views',50000,'likes',3000,'comments',200,'bookmarks',900,'followers',1000,'published_at',to_char(now() - interval '30 hours','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'images',jsonb_build_array('https://example.test/a.jpg'),'description','test'));
  ref := (ing->>'source_reference_id')::bigint; ev := (ing->>'discovery_evidence_id')::uuid;
  select format, niche_tags, trending_at into r from public.references_unified where id = ref;
  res := res || jsonb_build_object('1_candidate_is_hidden', r.format = 'carousel_candidate', '1_tags', r.niche_tags, '1_not_trending', r.trending_at is null);

  -- A partial read must not promote it.
  insert into public.reference_analysis(source_reference_id, analysis_version, inspection_status, inferred) values (ref, 'phase0-multiformat-v2', 'partial', '{"niche":"other"}'::jsonb);
  select format into r from public.references_unified where id = ref;
  res := res || jsonb_build_object('2_partial_read_stays_hidden', r.format = 'carousel_candidate');

  -- A complete read of an off-niche post promotes it to Other niches.
  update public.reference_analysis set inspection_status = 'complete' where source_reference_id = ref;
  select format, status, trending_at, total_score, niche_tags, views_normalized into r from public.references_unified where id = ref;
  res := res || jsonb_build_object('3_promoted', r.format = 'carousel', '3_trending_at_set', r.trending_at is not null, '3_score', r.total_score, '3_score_in_8_to_10', r.total_score >= 8 and r.total_score <= 10, '3_other_niches', 'other_niches' = any(r.niche_tags), '3_not_peptide', not ('peptide_niche' = any(r.niche_tags)), '3_reach', r.views_normalized);
  res := res || jsonb_build_object('3_watch_status', (select status from public.outlier_watch where discovery_evidence_id = ev));

  -- Re-running the read does not move trending_at.
  declare t1 timestamptz; t2 timestamptz; begin
    select trending_at into t1 from public.references_unified where id = ref;
    update public.reference_analysis set topic = 'again' where source_reference_id = ref;
    select trending_at into t2 from public.references_unified where id = ref;
    res := res || jsonb_build_object('4_trending_at_stable', t1 = t2);
  end;

  -- A carousel that is not a radar candidate is never touched.
  insert into public.references_unified(ref_id, format, platform, source_url, total_score, status, niche_tags) values ('REF-ZZTEST-PLAIN','carousel','tiktok','https://www.tiktok.com/@zz/photo/ZZPLAIN',3.5,'active',array['virlo']) returning id into ref2;
  insert into public.reference_analysis(source_reference_id, analysis_version, inspection_status, inferred) values (ref2, 'phase0-multiformat-v2', 'complete', '{"niche":"other"}'::jsonb);
  select total_score, trending_at, niche_tags into r from public.references_unified where id = ref2;
  res := res || jsonb_build_object('5_plain_carousel_untouched', r.total_score = 3.5 and r.trending_at is null and r.niche_tags = array['virlo']);

  -- Decay: not before 7 days, and then down to a normal score.
  perform public.outlier_decay();
  res := res || jsonb_build_object('6_fresh_find_keeps_score', (select total_score >= 8 from public.references_unified where id = ref));
  update public.references_unified set trending_at = now() - interval '8 days' where id = ref;
  perform public.outlier_decay();
  select total_score into r from public.references_unified where id = ref;
  res := res || jsonb_build_object('7_decayed_score', r.total_score, '7_decayed_below_8', r.total_score < 8, '7_decayed_at_least_5', r.total_score >= 5);

  raise exception 'RESULT %', res::text;
end $t$;
