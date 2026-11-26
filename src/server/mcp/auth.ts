import { createHash, timingSafeEqual } from "node:crypto";
import { isEmailAllowed, isReviewer } from "@/lib/auth";

/**
 * The door of the read-only MCP server (/api/mcp, Garreth 2026-11-26).
 *
 * Phase 1 is one person in Claude Code, so the door is a personal token sent as
 * `Authorization: Bearer <token>`. Vercel never holds the token itself, only
 * its SHA-256, in MCP_TOKENS:
 *
 *   MCP_TOKENS=garreth@example.com=3f1c…e9,someone@example.com=a0b2…44
 *
 * `scripts/mcp-token.mjs` makes a token and prints the line to add.
 *
 * Three rules, the same as the warmup robot's door (api-token.ts):
 * - An empty MCP_TOKENS shuts the door (503). A missing setting never opens it.
 * - The email on the token must ALSO be in ALLOWED_EMAILS. The token list can
 *   narrow who gets in, never widen it, so removing someone from
 *   ALLOWED_EMAILS removes their MCP access too.
 * - AUTH_BYPASS is ignored here, in development as well. Claude talks to the
 *   live database through this door, so it always asks for the token.
 *
 * Phase 3 (sign-in for the Claude apps) adds a second branch here and nowhere else.
 */

export interface McpCaller {
  email: string;
  /** May read recorded posting sessions (REVIEWER_EMAILS), as on the Sessions page. */
  reviewer: boolean;
  via: "token";
}

export type McpAuth =
  | { ok: true; caller: McpCaller }
  | { ok: false; status: 401 | 503; error: string; code: string };

interface TokenEntry {
  email: string;
  hash: Buffer;
}

/** Parse MCP_TOKENS. Entries that are not `email=<64 hex>` are skipped, not trusted. */
export function parseTokenList(raw: string | undefined): TokenEntry[] {
  return (raw ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const at = part.lastIndexOf("=");
      if (at <= 0) return [];
      const email = part.slice(0, at).trim().toLowerCase();
      const hex = part.slice(at + 1).trim().toLowerCase();
      if (!email.includes("@") || !/^[0-9a-f]{64}$/.test(hex)) return [];
      return [{ email, hash: Buffer.from(hex, "hex") }];
    });
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function authenticateMcp(
  authorization: string | null,
  env: Record<string, string | undefined> = process.env,
): McpAuth {
  const entries = parseTokenList(env.MCP_TOKENS);
  if (entries.length === 0) {
    return {
      ok: false,
      status: 503,
      error: "The PM Dashboard MCP is not set up: MCP_TOKENS is empty.",
      code: "not_configured",
    };
  }

  const header = authorization ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!given) {
    return { ok: false, status: 401, error: "Missing token.", code: "unauthorized" };
  }

  // Compare every entry, in constant time, and only decide afterwards, so how
  // long a refusal takes says nothing about which entry came close.
  const givenHash = createHash("sha256").update(given).digest();
  let match: TokenEntry | null = null;
  for (const entry of entries) {
    if (timingSafeEqual(givenHash, entry.hash) && !match) match = entry;
  }
  if (!match || !isEmailAllowed(match.email)) {
    return { ok: false, status: 401, error: "Wrong or missing token.", code: "unauthorized" };
  }
  return { ok: true, caller: { email: match.email, reviewer: isReviewer(match.email), via: "token" } };
}
