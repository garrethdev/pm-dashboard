-- Carousel Generator DEV-01/02 preflight. Catalog reads only; no application rows.
-- Run as a database administrator in the intended Supabase environment. Keep the
-- complete result sets with the environment and execution time as the receipt.
-- Deliberately does not call application functions or assume missing tables exist.
begin transaction read only;
set local statement_timeout = '30s';

select current_timestamp as checked_at, current_database() as database_name,
       current_user as inspection_role, current_setting('server_version') as postgres_version;

-- 1. Explicit presence inventory. Missing objects remain visible as NULLs.
with expected(name) as (values
  ('content_type_registry'), ('content_batches'), ('batch_briefs'),
  ('carousel_briefs'), ('carousel_drafts'), ('carousel_draft_slides'),
  ('carousel_templates'), ('carousel_lane_directions'),
  ('image_libraries'), ('image_library_images'), ('v_image_assets'),
  ('glowup_image_bank'), ('covered_eye_image_bank'),
  ('glowup_decks'), ('covered_eye_carousel'), ('music_library'),
  ('dashboard_audit_log'), ('audit_log'), ('audit_logs'), ('references_unified'))
select e.name, c.oid::regclass as relation, c.relkind,
       pg_get_userbyid(c.relowner) as owner,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from expected e
left join pg_class c on c.oid = to_regclass('public.' || e.name)
order by e.name;

-- Subsequent sections include all carousel-prefixed objects, including unexpected
-- prior deployments, so a differently named implementation is not silently missed.
-- 2. Columns, actual PostgreSQL types, defaults, nullability and identity metadata.
select c.relname, a.attnum as ordinal, a.attname as column_name,
       format_type(a.atttypid, a.atttypmod) as data_type,
       a.attnotnull as not_null, a.attidentity as identity_kind,
       a.attgenerated as generated_kind,
       pg_get_expr(d.adbin, d.adrelid) as default_expression
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
where n.nspname = 'public'
  and (c.relname like 'carousel\_%' escape '\'
       or c.relname = any(array['content_type_registry','content_batches','batch_briefs',
         'image_libraries','image_library_images','v_image_assets','glowup_image_bank',
         'covered_eye_image_bank','glowup_decks','covered_eye_carousel','music_library',
         'dashboard_audit_log','audit_log','audit_logs','references_unified']))
order by c.relname, a.attnum;

-- 3. Includes outgoing AND incoming FKs; inspect actual names before any ALTER.
select ns.nspname as relation_schema, c.relname, co.conname, co.contype,
       co.convalidated, co.condeferrable, co.condeferred,
       co.confrelid::regclass as referenced_relation,
       pg_get_constraintdef(co.oid, true) as definition
from pg_constraint co
join pg_class c on c.oid = co.conrelid
join pg_namespace ns on ns.oid = c.relnamespace
where co.conrelid in (
  select x.oid from pg_class x join pg_namespace n on n.oid = x.relnamespace
  where n.nspname = 'public' and (x.relname like 'carousel\_%' escape '\'
    or x.relname = any(array['content_type_registry','content_batches','image_libraries',
      'image_library_images','glowup_decks','covered_eye_carousel'])))
or co.confrelid in (to_regclass('public.carousel_briefs'),
                    to_regclass('public.carousel_drafts'), to_regclass('public.carousel_templates'))
order by ns.nspname, c.relname, co.conname;

-- 4. Unique/partial indexes and their validity; old brief/version uniqueness must
-- not survive beside the new brief/position/version constraint.
select t.relname, i.relname as index_name, ix.indisunique, ix.indisprimary,
       ix.indisvalid, ix.indisready, pg_get_indexdef(ix.indexrelid) as definition
from pg_index ix join pg_class t on t.oid = ix.indrelid
join pg_class i on i.oid = ix.indexrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public' and (t.relname like 'carousel\_%' escape '\'
  or t.relname = any(array['content_type_registry','content_batches','image_libraries',
    'image_library_images','glowup_decks','covered_eye_carousel']))
order by t.relname, i.relname;

-- 5. Policies and effective table ACL entries (PUBLIC is grantee OID zero).
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public'
  and (tablename like 'carousel\_%' escape '\'
    or tablename = any(array['image_libraries','image_library_images','glowup_decks',
      'covered_eye_carousel','content_batches','content_type_registry']))
order by tablename, policyname;

select c.relname, case when acl.grantee = 0 then 'PUBLIC'
       else pg_get_userbyid(acl.grantee) end as grantee,
       acl.privilege_type, acl.is_grantable
from pg_class c join pg_namespace n on n.oid = c.relnamespace
cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
where n.nspname = 'public' and c.relkind in ('r','p','v','m')
  and (c.relname like 'carousel\_%' escape '\'
    or c.relname = any(array['image_libraries','image_library_images','v_image_assets',
      'glowup_decks','covered_eye_carousel','content_batches','content_type_registry']))
order by c.relname, grantee, acl.privilege_type;

-- 6. Function signatures, return shapes, SECURITY DEFINER and search_path.
-- Bodies intentionally excluded: inspect relevant reviewed source separately.
select p.oid::regprocedure as signature, pg_get_function_result(p.oid) as result_type,
       pg_get_userbyid(p.proowner) as owner, p.prosecdef as security_definer,
       p.provolatile as volatility, p.proconfig as function_settings,
       case when acl.grantee = 0 then 'PUBLIC' else pg_get_userbyid(acl.grantee) end as grantee,
       acl.privilege_type, acl.is_grantable
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
where n.nspname = 'public' and p.prokind = 'f'
  and (p.proname like 'carousel\_%' escape '\'
    or p.proname ~ '(glowup|covered_eye|scheduler_ready)')
order by p.oid::regprocedure::text, grantee;

-- 7. Existing defaults can grant new functions to named roles even after a PUBLIC
-- revoke. A new migration must explicitly revoke anon AND authenticated as well.
select pg_get_userbyid(d.defaclrole) as owner,
       coalesce(n.nspname, '(all schemas)') as schema_name, d.defaclobjtype,
       case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as grantee,
       a.privilege_type, a.is_grantable
from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace
cross join lateral aclexplode(d.defaclacl) a
where d.defaclnamespace = 0 or n.nspname = 'public'
order by owner, schema_name, d.defaclobjtype, grantee;

-- 8. Triggers may independently change approval/scheduling state. Capture their
-- function identities without invoking them or selecting posting data.
select c.relname, t.tgname, t.tgenabled, t.tgfoid::regprocedure as trigger_function,
       pg_get_triggerdef(t.oid, true) as definition
from pg_trigger t join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and not t.tgisinternal
  and (c.relname like 'carousel\_%' escape '\'
    or c.relname = any(array['glowup_decks','covered_eye_carousel','content_type_registry']))
order by c.relname, t.tgname;

-- 9. Migration ledger presence/shape only; safe if no migration schema exists.
select to_regclass('supabase_migrations.schema_migrations') as migration_ledger;
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'supabase_migrations' and table_name = 'schema_migrations'
order by ordinal_position;
commit;

-- OPTIONAL SEPARATE READ: run only after section 9 confirms version/name columns.
-- This reads migration identifiers, never statements or application content.
-- select version, name from supabase_migrations.schema_migrations
-- where version >= '20260901' order by version;
