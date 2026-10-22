-- The dashboard's own connection to Higgsfield (DEV-30, step one; Garreth,
-- 2026-10-22: "connect the Higgsfield main account to the app through the
-- MCP server").
--
-- Higgsfield's MCP server (https://mcp.higgsfield.ai/mcp) takes no API key.
-- An app signs in once through OAuth, as a person would, and from then on
-- holds an access token and a refresh token for that one Higgsfield account.
-- Generations made this way spend that account's plan credits, exactly as
-- the Claude connector does.
--
-- One row per provider; today only 'higgsfield'. The row carries everything
-- the sign-in produced: the client registration the app made for itself
-- with the authorization server, the cached discovery documents, the tokens,
-- and, while a sign-in is in flight, the PKCE verifier and the state word.
-- account_email is read from the ID token so Settings can say which
-- Higgsfield account is connected; there are two (Garreth, 2026-10-22).
--
-- Written and read only by the dashboard's server with the service key. The
-- tokens open the Higgsfield account, so the public key is closed to this
-- table by name, the same as `issues` and `accounts`.

create table if not exists public.carousel_connections (
  provider text primary key,
  server_url text not null,
  -- Where the authorization server sends the browser back. Registered with
  -- the client; a different origin (localhost against the live site) means a
  -- fresh registration.
  redirect_uri text,
  client jsonb,
  discovery jsonb,
  tokens jsonb,
  token_expires_at timestamptz,
  verifier text,
  state text,
  pending_until timestamptz,
  account_email text,
  account_name text,
  connected_by text,
  connected_at timestamptz,
  last_used_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

alter table public.carousel_connections enable row level security;
revoke all on public.carousel_connections from public, anon, authenticated;
grant all on public.carousel_connections to service_role;
