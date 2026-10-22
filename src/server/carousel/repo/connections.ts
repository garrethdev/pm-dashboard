/**
 * The dashboard's connections to outside services (DEV-30, step one):
 * `carousel_connections`, one row per provider. Today that is Higgsfield's
 * MCP server. The row holds the OAuth client registration, the tokens and
 * the sign-in in flight; nothing here is ever sent to a browser.
 */
import { dbDelete, dbGet, dbInsert, dbPatch, enc } from "@/server/carousel/repo/db";

export interface ConnectionRow {
  provider: string;
  server_url: string;
  redirect_uri: string | null;
  client: Record<string, unknown> | null;
  discovery: Record<string, unknown> | null;
  tokens: Record<string, unknown> | null;
  token_expires_at: string | null;
  verifier: string | null;
  state: string | null;
  pending_until: string | null;
  account_email: string | null;
  account_name: string | null;
  connected_by: string | null;
  connected_at: string | null;
  last_used_at: string | null;
  last_error: string | null;
  updated_at: string;
}

const COLS = "provider,server_url,redirect_uri,client,discovery,tokens,token_expires_at,verifier,state,pending_until,account_email,account_name,connected_by,connected_at,last_used_at,last_error,updated_at";

export async function readConnection(provider: string): Promise<ConnectionRow | null> {
  const rows = await dbGet<ConnectionRow[]>(`carousel_connections?select=${COLS}&provider=eq.${enc(provider)}`);
  return rows[0] ?? null;
}

/**
 * Write some columns of the provider's row, creating the row when it is new.
 * A patch first, an insert only when there is no row: an upsert through
 * PostgREST sets every column it was not given back to its default, which
 * on 2026-10-22 wiped the connected account's email and date the moment
 * Reconnect was pressed.
 */
export async function writeConnection(provider: string, serverUrl: string, patch: Partial<Omit<ConnectionRow, "provider" | "updated_at">>): Promise<ConnectionRow> {
  const stamp = new Date().toISOString();
  const updated = await dbPatch<ConnectionRow>(`carousel_connections?provider=eq.${enc(provider)}&select=${COLS}`, { ...patch, updated_at: stamp });
  if (updated[0]) return updated[0];
  const rows = await dbInsert<ConnectionRow>("carousel_connections", { provider, server_url: serverUrl, ...patch, updated_at: stamp });
  return rows[0]!;
}

export async function patchConnection(provider: string, patch: Partial<Omit<ConnectionRow, "provider" | "updated_at">>): Promise<void> {
  await dbPatch(`carousel_connections?provider=eq.${enc(provider)}`, { ...patch, updated_at: new Date().toISOString() });
}

export async function forgetConnection(provider: string): Promise<void> {
  await dbDelete(`carousel_connections?provider=eq.${enc(provider)}`);
}
