-- Small copies of our pictures, made once and kept on Cloudflare R2
-- (Garreth, 2026-11-04).
--
-- WHY. On 2026-10-09 a library page asked Supabase for 217 pictures nobody had
-- opened before. Every one of those requests made the storage service look the
-- picture up in this database, the connection pool filled, and the whole
-- dashboard hung for eight minutes. Pictures have been resized on the fly by
-- Supabase since then, which still costs one database lookup the first time
-- any picture is shown. A copy made in advance and kept outside Supabase costs
-- none: the screens ask Cloudflare, and only fall back to Supabase for a
-- picture whose copy has not been made yet.
--
-- WHAT IS HERE. `picture_copies` records which original has its two copies
-- (540 and 1080 wide, WebP) and for which version of it: the copy job
-- overwrites a picture at the same path, so a changed original is copied
-- again. `picture_copies_todo` lists what is missing, library pictures first
-- (they caused 10-09), then newest first. Both are service-role only.

create table public.picture_copies (
  bucket text not null,
  path text not null,
  version text not null,
  status text not null check (status in ('done', 'failed')),
  error text,
  attempts int not null default 1,
  bytes_540 int,
  bytes_1080 int,
  made_at timestamptz not null default now(),
  primary key (bucket, path)
);

alter table public.picture_copies enable row level security;
revoke all on public.picture_copies from public, anon, authenticated;
grant all on public.picture_copies to service_role;

create function public.picture_copies_todo(p_limit int default 50)
returns table (bucket text, path text, version text, size bigint, mimetype text, attempts int, remaining bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with wanted as (
    select o.bucket_id as bucket,
           o.name as path,
           coalesce(nullif(replace(o.metadata->>'eTag', '"', ''), ''), extract(epoch from o.updated_at)::bigint::text) as version,
           (o.metadata->>'size')::bigint as size,
           o.metadata->>'mimetype' as mimetype,
           o.created_at
    from storage.objects o
    where o.bucket_id in ('rich-life-images', 'reference-slides')
      and o.metadata->>'mimetype' like 'image/%'
  )
  select w.bucket, w.path, w.version, w.size, w.mimetype,
         coalesce(c.attempts, 0) as attempts,
         count(*) over () as remaining
  from wanted w
  left join public.picture_copies c on c.bucket = w.bucket and c.path = w.path
  where c.path is null
     or c.version <> w.version
     or (c.status = 'failed' and c.attempts < 3)
  order by (w.bucket = 'rich-life-images') desc, w.created_at desc
  limit greatest(1, least(p_limit, 500));
$$;

revoke execute on function public.picture_copies_todo(int) from public, anon, authenticated;
grant execute on function public.picture_copies_todo(int) to service_role;
