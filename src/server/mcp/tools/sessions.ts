import { z } from "zod";
import { getSession, getSessions } from "@/lib/data/phone-sessions";
import { defineTool } from "@/server/mcp/registry";
import { failure, reply } from "@/server/mcp/shape";
import { cursorInput, fieldsInput, limitInput, listReply, stamp } from "@/server/mcp/tools/common";

/**
 * The Sessions page: recorded posting sessions on the phones. Reviewers only
 * (REVIEWER_EMAILS), exactly as the page is; anyone else is never shown this
 * tool. The recorded frames stay in their private bucket and are not linked.
 */
export const pmSessions = defineTool({
  name: "pm_sessions",
  title: "Recorded sessions",
  description:
    "Recorded posting sessions from the phones and their reviews. view=list: sessions newest first (phone, account, start and end, length, review status and verdict). view=session: one session by id with its review.",
  pages: ["/sessions", "/sessions/[id]"],
  reviewerOnly: true,
  input: {
    view: z.enum(["list", "session"]).optional().describe("list (default) or session."),
    id: z.number().int().optional().describe("For view=session: the session id."),
    since: z.string().optional().describe("For view=list: only sessions started after this ISO date."),
    fields: fieldsInput,
    limit: limitInput,
    cursor: cursorInput,
  },
  run: async (args) => {
    const view = args.view ?? "list";
    const meta = { tool: "pm_sessions", view, fleet: "physical", ...stamp() };
    if (view === "list") {
      const rows = await getSessions({ since: args.since, limit: 500 });
      const note = rows.length >= 500 ? "Only the newest 500 are read, so total is at least 500. Pass since to narrow." : undefined;
      return listReply({ ...meta, note }, rows, args);
    }
    if (args.id === undefined) return failure("pm_sessions", "view=session needs id.");
    const s = await getSession(args.id);
    if (!s) return failure("pm_sessions", `No session with id ${args.id}.`);
    return reply(s, meta);
  },
});
