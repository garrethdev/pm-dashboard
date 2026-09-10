-- `revoke ... from public` was not enough.
--
-- Supabase ships ALTER DEFAULT PRIVILEGES granting EXECUTE on new public
-- functions to `anon` and `authenticated` BY NAME, and a grant made to a named
-- role is not touched by revoking from PUBLIC. So the three functions created a
-- moment earlier were left callable with the anon key through PostgREST --
-- exactly the exposure the original revoke was written to prevent. Caught by
-- reading pg_proc.proacl back after applying, which is the only way to see it.
--
-- These are service-role operator actions. Revoke the named roles explicitly.
--
-- The lesson generalises: on this project, `revoke ... from public` on a
-- function is never sufficient on its own. Always name anon and authenticated,
-- and always read proacl back afterwards.
revoke all on function public.replace_scheduler_override(text, text, jsonb) from anon, authenticated;
revoke all on function public.save_cadence_mix(jsonb, jsonb) from anon, authenticated;
revoke all on function public.set_content_type_lifecycle(text, text, text, integer, integer, text, jsonb, boolean) from anon, authenticated;
