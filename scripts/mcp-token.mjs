#!/usr/bin/env node
/**
 * Make a personal token for the dashboard's read-only MCP server (/api/mcp).
 *
 *   node scripts/mcp-token.mjs you@example.com
 *
 * Prints three things:
 *   1. the token itself, which only you keep (it goes into Claude Code);
 *   2. the MCP_TOKENS entry for Vercel, which holds only the token's SHA-256,
 *      so the token never sits in Vercel;
 *   3. the Claude Code command that connects to the server with it.
 *
 * Nothing is saved anywhere and nothing is sent anywhere. Run it again to make
 * a new token; delete the old entry from MCP_TOKENS to switch the old one off.
 */
import { createHash, randomBytes } from "node:crypto";

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email.includes("@")) {
  console.error("Usage: node scripts/mcp-token.mjs you@example.com");
  process.exit(1);
}

const url = process.argv[3] ?? "https://pm-dashboard-ashen.vercel.app/api/mcp";
const token = `pmd_${randomBytes(32).toString("base64url")}`;
const hash = createHash("sha256").update(token).digest("hex");

console.log(`
1. Your token (keep it to yourself; it is shown only now):

   ${token}

2. Add this to MCP_TOKENS in Vercel (Production). If MCP_TOKENS already has
   entries, put a comma between them:

   ${email}=${hash}

3. After Vercel redeploys, connect Claude Code:

   claude mcp add --transport http --scope user pm-dashboard ${url} --header "Authorization: Bearer ${token}"
`);
