import { z } from "zod";
import type { McpCaller } from "@/server/mcp/auth";
import type { ToolText } from "@/server/mcp/shape";

/**
 * One MCP tool (Garreth, 2026-11-26).
 *
 * Every tool in phase 1 is `kind: "read"`: it calls the readers the matching
 * dashboard page already uses, so Claude and the screens give the same numbers.
 * `pages` names the dashboard pages a tool answers for; coverage.test.ts fails
 * when a page has no tool and no written reason.
 *
 * Writing back is out of scope. When it comes, write tools get their own kind
 * and their own approval, and nothing here changes.
 */
export interface McpTool {
  name: string;
  title: string;
  description: string;
  kind: "read";
  /** Dashboard routes this tool answers for, e.g. "/accounts/[profile]". */
  pages: string[];
  /** Only for REVIEWER_EMAILS, as the Sessions page is. */
  reviewerOnly?: boolean;
  input: z.ZodRawShape;
  run: (args: Record<string, unknown>, caller: McpCaller) => Promise<ToolText>;
}

/** Typed authoring, loose storage: `run` sees its own parsed inputs. */
export function defineTool<S extends z.ZodRawShape>(tool: {
  name: string;
  title: string;
  description: string;
  pages: string[];
  reviewerOnly?: boolean;
  input: S;
  run: (args: z.infer<z.ZodObject<S>>, caller: McpCaller) => Promise<ToolText>;
}): McpTool {
  return {
    ...tool,
    kind: "read",
    run: (args, caller) => tool.run(args as z.infer<z.ZodObject<S>>, caller),
  };
}
