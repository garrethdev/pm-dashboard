/**
 * The dashboard's own line to Higgsfield (DEV-30, step one; Garreth,
 * 2026-10-22: "connect the Higgsfield main account to the app through the
 * MCP server").
 *
 * Higgsfield's MCP server takes no API key. The app signs in once through
 * OAuth, the way the Claude connector does, and from then on holds an access
 * token and a refresh token for ONE Higgsfield account. Which account is
 * decided at the sign-in screen, so Settings says which email is connected.
 *
 * Three things live here:
 *   1. the sign-in: `startConnect` sends the browser to Higgsfield,
 *      `finishConnect` takes the code it comes back with;
 *   2. `withHiggsfield` / `callTool`: an MCP session with the stored tokens,
 *      refreshed before they run out, closed when the call is done;
 *   3. `connectionStatus`: what Settings shows.
 *
 * Everything the sign-in produces sits in one `carousel_connections` row and
 * never reaches a browser. Generations made through this line spend the
 * connected account's plan credits at standard rates (Higgsfield's rule for
 * MCP) and land in that account's Assets.
 */
import { randomBytes, timingSafeEqual } from "node:crypto";
import { auth, UnauthorizedError, type OAuthClientProvider, type OAuthDiscoveryState } from "@modelcontextprotocol/sdk/client/auth.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { OAuthClientInformationMixed, OAuthClientMetadata, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import { forgetConnection, patchConnection, readConnection, writeConnection, type ConnectionRow } from "@/server/carousel/repo/connections";

export const PROVIDER = "higgsfield";
export const SERVER_URL = process.env.HIGGSFIELD_MCP_URL || "https://mcp.higgsfield.ai/mcp";
export const CALLBACK_PATH = "/api/carousel-generator/higgsfield/callback";
const SCOPE = "openid email offline_access";
/** How long a sign-in may take between leaving for Higgsfield and coming back. */
const PENDING_MS = 10 * 60_000;
/** Refresh the access token when it has less than this left. */
const REFRESH_AHEAD_MS = 90_000;
const RECONNECT = "Higgsfield's sign-in has expired. Reconnect it from Settings";

export class NotConnected extends Error {
  constructor(message = "Higgsfield is not connected. Connect it from Settings") {
    super(message);
    this.name = "NotConnected";
  }
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested)

/** The email and name inside an OpenID ID token. Read for display only; the token came straight from the token endpoint over TLS. */
export function decodeIdToken(idToken: string | undefined | null): { email: string | null; name: string | null } {
  if (!idToken) return { email: null, name: null };
  const parts = idToken.split(".");
  if (parts.length < 2) return { email: null, name: null };
  try {
    const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as Record<string, unknown>;
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : null;
    const given = typeof payload.given_name === "string" ? payload.given_name : "";
    const family = typeof payload.family_name === "string" ? payload.family_name : "";
    const name = typeof payload.name === "string" ? payload.name : `${given} ${family}`.trim();
    return { email, name: name || null };
  } catch {
    return { email: null, name: null };
  }
}

/** When an access token runs out, from the `expires_in` the server sent; null when it did not say. */
export function expiresAtFrom(tokens: Pick<OAuthTokens, "expires_in">, now = Date.now()): string | null {
  const s = tokens.expires_in;
  if (typeof s !== "number" || !Number.isFinite(s) || s <= 0) return null;
  return new Date(now + s * 1000).toISOString();
}

/**
 * A refresh reply may leave out the refresh token (when it is not rotated)
 * and the ID token. Keep the ones already held, so one refresh does not
 * strand the connection or forget whose it is.
 */
export function mergeTokens(fresh: OAuthTokens, previous: Record<string, unknown> | null): OAuthTokens {
  const out: OAuthTokens = { ...fresh };
  if (!out.refresh_token && typeof previous?.refresh_token === "string") out.refresh_token = previous.refresh_token;
  if (!out.id_token && typeof previous?.id_token === "string") out.id_token = previous.id_token;
  return out;
}

/** What a tool said: its structured result when it gave one, else the JSON in its text, else the text. */
export function parseToolResult(result: unknown): unknown {
  if (!result || typeof result !== "object") return result;
  const r = result as { structuredContent?: unknown; content?: unknown };
  if (r.structuredContent !== undefined && r.structuredContent !== null) return r.structuredContent;
  const text = textOf(r);
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function textOf(result: { content?: unknown }): string {
  if (!Array.isArray(result.content)) return "";
  return result.content
    .map((c) => (c && typeof c === "object" && (c as { type?: string }).type === "text" ? String((c as { text?: unknown }).text ?? "") : ""))
    .filter(Boolean)
    .join("\n");
}

function sameWord(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// ---------------------------------------------------------------------------
// The OAuth client, backed by the connection row

class StoredProvider implements OAuthClientProvider {
  /** Where the SDK asked to send the browser; read by `startConnect`. */
  authorizationUrl: URL | null = null;

  constructor(
    private row: ConnectionRow | null,
    /** The site the browser is on; null when there is no browser (a refresh from a server call). */
    private readonly origin: string | null,
  ) {}

  private get redirect(): string {
    if (this.origin) return `${this.origin}${CALLBACK_PATH}`;
    return this.row?.redirect_uri ?? "";
  }

  get redirectUrl(): string {
    return this.redirect;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: "PM Dashboard",
      redirect_uris: [this.redirect],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: SCOPE,
    };
  }

  async state(): Promise<string> {
    const word = randomBytes(24).toString("base64url");
    await this.save({ state: word, pending_until: new Date(Date.now() + PENDING_MS).toISOString() });
    return word;
  }

  clientInformation(): OAuthClientInformationMixed | undefined {
    // A registration names one return address. On another site (localhost
    // against the live site) the app registers again.
    if (!this.row?.client || this.row.redirect_uri !== this.redirect) return undefined;
    return this.row.client as unknown as OAuthClientInformationMixed;
  }

  async saveClientInformation(info: OAuthClientInformationMixed): Promise<void> {
    await this.save({ client: info as unknown as Record<string, unknown>, redirect_uri: this.redirect });
  }

  tokens(): OAuthTokens | undefined {
    return (this.row?.tokens as unknown as OAuthTokens | null) ?? undefined;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    const merged = mergeTokens(tokens, this.row?.tokens ?? null);
    const who = decodeIdToken(merged.id_token);
    await this.save({
      tokens: merged as unknown as Record<string, unknown>,
      token_expires_at: expiresAtFrom(merged),
      ...(who.email ? { account_email: who.email, account_name: who.name } : {}),
      last_error: null,
    });
  }

  redirectToAuthorization(url: URL): void {
    this.authorizationUrl = url;
  }

  async saveCodeVerifier(verifier: string): Promise<void> {
    await this.save({ verifier });
  }

  codeVerifier(): string {
    const v = this.row?.verifier;
    if (!v) throw new Error("No sign-in was in progress. Start again from Settings");
    return v;
  }

  async invalidateCredentials(scope: "all" | "client" | "tokens" | "verifier" | "discovery"): Promise<void> {
    const none = { tokens: null, token_expires_at: null };
    if (scope === "all") await this.save({ ...none, client: null, redirect_uri: null, discovery: null, verifier: null, state: null, pending_until: null });
    else if (scope === "client") await this.save({ client: null, redirect_uri: null });
    else if (scope === "tokens") await this.save(none);
    else if (scope === "verifier") await this.save({ verifier: null });
    else if (scope === "discovery") await this.save({ discovery: null });
  }

  discoveryState(): OAuthDiscoveryState | undefined {
    return (this.row?.discovery as unknown as OAuthDiscoveryState | null) ?? undefined;
  }

  async saveDiscoveryState(state: OAuthDiscoveryState): Promise<void> {
    await this.save({ discovery: state as unknown as Record<string, unknown> });
  }

  private async save(patch: Partial<Omit<ConnectionRow, "provider" | "updated_at">>): Promise<void> {
    this.row = await writeConnection(PROVIDER, SERVER_URL, patch);
  }
}

// ---------------------------------------------------------------------------
// The sign-in

/**
 * Begin a sign-in from the site at `origin`. Any tokens already held are
 * dropped first, so Reconnect always shows Higgsfield's account picker and
 * the person chooses afresh. Returns where to send the browser.
 */
export async function startConnect(origin: string): Promise<URL> {
  const provider = new StoredProvider(await readConnection(PROVIDER), origin);
  await provider.invalidateCredentials("tokens");
  const result = await auth(provider, { serverUrl: SERVER_URL });
  if (result !== "REDIRECT" || !provider.authorizationUrl) throw new Error("Higgsfield did not offer a sign-in page");
  return provider.authorizationUrl;
}

/** The browser is back with a code. Check it is the sign-in we started, then trade the code for tokens. */
export async function finishConnect(origin: string, code: string, state: string, by: string): Promise<ConnectionRow> {
  const row = await readConnection(PROVIDER);
  if (!row?.state || !row.pending_until || !row.verifier) throw new Error("No sign-in was in progress. Start again from Settings");
  if (new Date(row.pending_until).getTime() < Date.now()) throw new Error("The sign-in took too long. Start again from Settings");
  if (!sameWord(row.state, state)) throw new Error("This was not the sign-in that was started. Start again from Settings");
  const provider = new StoredProvider(row, origin);
  const result = await auth(provider, { serverUrl: SERVER_URL, authorizationCode: code });
  if (result !== "AUTHORIZED") throw new Error("Higgsfield did not finish the sign-in");
  await patchConnection(PROVIDER, { verifier: null, state: null, pending_until: null, connected_by: by, connected_at: new Date().toISOString(), last_error: null });
  const done = await readConnection(PROVIDER);
  if (!done?.tokens) throw new Error("Higgsfield sent no tokens back");
  return done;
}

/** Drop the connection. The refresh token is revoked at Higgsfield when it can be; the row goes either way. */
export async function disconnect(): Promise<void> {
  const row = await readConnection(PROVIDER);
  if (!row) return;
  const refresh = typeof row.tokens?.refresh_token === "string" ? row.tokens.refresh_token : null;
  const meta = (row.discovery as { authorizationServerMetadata?: { revocation_endpoint?: string } } | null)?.authorizationServerMetadata;
  const clientId = typeof row.client?.client_id === "string" ? row.client.client_id : null;
  if (refresh && meta?.revocation_endpoint && clientId) {
    try {
      await fetch(meta.revocation_endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: refresh, token_type_hint: "refresh_token", client_id: clientId }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      // Best effort: the row is removed either way, and the token runs out by itself.
    }
  }
  await forgetConnection(PROVIDER);
}

// ---------------------------------------------------------------------------
// Using the connection

/**
 * Open an MCP session with the stored tokens, run `fn`, close it. The
 * access token is refreshed first when it is about to run out; a refresh
 * that fails, or a session Higgsfield refuses, surfaces as `NotConnected`
 * and is noted on the row so Settings can say so.
 */
export async function withHiggsfield<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const row = await readConnection(PROVIDER);
  if (!row?.tokens) throw new NotConnected();
  const provider = new StoredProvider(row, null);
  if (row.token_expires_at && new Date(row.token_expires_at).getTime() - Date.now() < REFRESH_AHEAD_MS) {
    let result: string;
    try {
      result = await auth(provider, { serverUrl: SERVER_URL });
    } catch (err) {
      await note(err instanceof Error ? err.message : "refresh failed");
      throw new NotConnected(RECONNECT);
    }
    if (result !== "AUTHORIZED") {
      await note("the refresh token was not accepted");
      throw new NotConnected(RECONNECT);
    }
  }
  const transport = new StreamableHTTPClientTransport(new URL(SERVER_URL), { authProvider: provider });
  const client = new Client({ name: "pm-dashboard", version: "1.0" });
  try {
    await client.connect(transport);
    const out = await fn(client);
    await patchConnection(PROVIDER, { last_used_at: new Date().toISOString() }).catch(() => undefined);
    return out;
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      await note(err.message || "Higgsfield refused the session");
      throw new NotConnected(RECONNECT);
    }
    throw err;
  } finally {
    await client.close().catch(() => undefined);
  }
}

async function note(message: string): Promise<void> {
  await patchConnection(PROVIDER, { last_error: message.slice(0, 500) }).catch(() => undefined);
}

/** Call one Higgsfield tool and hand back what it said. A tool error becomes a thrown Error with its words. */
export async function callTool<T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  return withHiggsfield(async (client) => {
    const result = await client.callTool({ name, arguments: args });
    if (result.isError) throw new Error(`Higgsfield ${name}: ${textOf(result as { content?: unknown }) || "failed"}`);
    return parseToolResult(result) as T;
  });
}

// ---------------------------------------------------------------------------
// What Settings shows

export interface ConnectionStatus {
  /** Tokens are held. */
  connected: boolean;
  /** The tokens worked just now: a balance came back. */
  reachable: boolean;
  email: string | null;
  name: string | null;
  connectedAt: string | null;
  connectedBy: string | null;
  lastUsedAt: string | null;
  plan: string | null;
  credits: number | null;
  /** Why it is not reachable, in a sentence, when it is not. */
  problem: string | null;
}

export async function connectionStatus(): Promise<ConnectionStatus> {
  const row = await readConnection(PROVIDER);
  const base: ConnectionStatus = {
    connected: Boolean(row?.tokens),
    reachable: false,
    email: row?.account_email ?? null,
    name: row?.account_name ?? null,
    connectedAt: row?.connected_at ?? null,
    connectedBy: row?.connected_by ?? null,
    lastUsedAt: row?.last_used_at ?? null,
    plan: null,
    credits: null,
    problem: row?.last_error ?? null,
  };
  if (!row?.tokens) return base;
  try {
    const b = await callTool<{ credits?: number; subscription_plan_type?: string }>("balance");
    return { ...base, reachable: true, problem: null, plan: typeof b?.subscription_plan_type === "string" ? b.subscription_plan_type : null, credits: typeof b?.credits === "number" ? b.credits : null };
  } catch (err) {
    const problem = err instanceof Error ? err.message : "Higgsfield could not be reached";
    return { ...base, connected: !(err instanceof NotConnected), reachable: false, problem };
  }
}
