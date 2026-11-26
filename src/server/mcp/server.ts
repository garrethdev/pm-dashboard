import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpCaller } from "@/server/mcp/auth";
import { gated } from "@/server/mcp/gate";
import { failure } from "@/server/mcp/shape";
import { TOOLS } from "@/server/mcp/tools";

const INSTRUCTIONS = `Read-only access to the Peptide Miracles PM Dashboard: the same data and numbers its pages show. Nothing here can change anything.

Start with pm_overview for today, pm_accounts for the account list, and pm_account for one account. Every reply is JSON {data, meta}. meta.fetchedAt says when the data was read (the dashboard caches for 60 seconds) and meta.stale is true when a remembered copy was served because a live read failed. Lists come a page at a time: meta.total is how many exist, meta.returned how many came back, and meta.nextCursor goes back as cursor for the next page. meta.cut names any list shortened to fit one reply.

Tools read the physical fleet (real iPhones) unless fleet: "cloud" is passed. Emails, phone numbers and proxy addresses come back masked on purpose. Files in private storage are not linked.`;

/**
 * A fresh server for one request. The transport is stateless, so nothing is
 * kept between calls and every call is checked at the door again.
 */
export function buildServer(caller: McpCaller): McpServer {
  const server = new McpServer({ name: "pm-dashboard", version: "1.0.0" }, { instructions: INSTRUCTIONS });

  for (const tool of TOOLS) {
    if (tool.reviewerOnly && !caller.reviewer) continue;
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.input,
        annotations: { title: tool.title, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      },
      async (args: Record<string, unknown>) => {
        try {
          return await gated(caller.email, tool.name, args, () => tool.run(args, caller));
        } catch (err) {
          return failure(tool.name, err instanceof Error ? err.message : "Something went wrong reading the dashboard.");
        }
      },
    );
  }
  return server;
}
