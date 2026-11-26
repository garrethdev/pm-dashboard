import { NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateMcp } from "@/server/mcp/auth";
import { buildServer } from "@/server/mcp/server";

/**
 * POST /api/mcp — the read-only MCP server Claude connects to (Garreth,
 * 2026-11-26). Streamable HTTP with no sessions and plain JSON replies: each
 * request gets a fresh server and transport, which suits Vercel, and nothing
 * is kept between calls. `docs/MCP.md` says how to connect.
 *
 * This route is let past the sign-in cookie check in `proxy.ts` and demands
 * its own token instead (`authenticateMcp`).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = authenticateMcp(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      {
        status: auth.status,
        headers: auth.status === 401 ? { "WWW-Authenticate": 'Bearer realm="pm-dashboard"' } : undefined,
      },
    );
  }

  const server = buildServer(auth.caller);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    // Never cached anywhere: every answer is read for the person who asked.
    try {
      response.headers.set("Cache-Control", "private, no-store");
    } catch {
      /* headers already sealed: the transport's own response is still right */
    }
    return response;
  } finally {
    await transport.close().catch(() => {});
    await server.close().catch(() => {});
  }
}

/** No event stream and no sessions in stateless mode: the MCP spec's answer is 405. */
function notAllowed() {
  return NextResponse.json(
    { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed. Send MCP requests as POST." }, id: null },
    { status: 405, headers: { Allow: "POST" } },
  );
}

export const GET = notAllowed;
export const DELETE = notAllowed;
