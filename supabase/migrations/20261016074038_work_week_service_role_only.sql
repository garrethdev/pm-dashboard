-- work_week is read and written with the service key only (the dashboard's
-- server, n8n). Row security already hides its row from the public roles, but
-- Supabase's default privileges also grant them TRUNCATE, which row security
-- does not stop. Named, because "revoke from public" leaves those grants.
revoke all on table public.work_week from public, anon, authenticated;
