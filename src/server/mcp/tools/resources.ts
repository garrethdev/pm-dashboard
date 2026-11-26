import { z } from "zod";
import { getFollowBoard } from "@/lib/data/follow-creators";
import { RESOURCES } from "@/lib/resources";
import { defineTool } from "@/server/mcp/registry";
import { reply } from "@/server/mcp/shape";
import { cursorInput, fieldsInput, limitInput, listReply, stamp } from "@/server/mcp/tools/common";

/** The Resources page and Creators to follow. */
export const pmResources = defineTool({
  name: "pm_resources",
  title: "Resources",
  description:
    "The Resources page. view=docs: the source-of-truth documents (Voice Bible, Render Blueprint, Hook Rules and the rest) with a summary and link each; these documents override any other note on the same subject. view=follow_creators: the small creators to follow by hand on the phones, with followers and platform, the accounts, and today's follows.",
  pages: ["/resources", "/resources/follow-creators"],
  input: {
    view: z.enum(["docs", "follow_creators"]).optional().describe("docs (default) or follow_creators."),
    fields: fieldsInput,
    limit: limitInput,
    cursor: cursorInput,
  },
  run: async (args) => {
    const view = args.view ?? "docs";
    if (view === "docs") return reply(RESOURCES, { tool: "pm_resources", view, ...stamp() });
    const board = await getFollowBoard();
    return listReply({ tool: "pm_resources", view, ...stamp() }, board.creators, args, {
      accounts: board.accounts,
      followsToday: board.follows,
    });
  },
});
