import { z } from "zod";
import { getOpenDeliveries, getPostedDeliveries } from "@/lib/data/post-deliveries";
import { getTodoBoard } from "@/lib/data/todo";
import { getDaysOff } from "@/lib/data/work-week";
import { defineTool } from "@/server/mcp/registry";
import { reply } from "@/server/mcp/shape";
import { cursorInput, fieldsInput, limitInput, listReply, stamp } from "@/server/mcp/tools/common";

/** The most posted deliveries one call reads. */
const READ_CAP = 500;

const DAY_NAMES =["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The To-do page. Physical fleet only, as the page is. */
export const pmTodo = defineTool({
  name: "pm_todo",
  title: "Posting to-do",
  description:
    "The physical fleet's hand-posting work, as the To-do page shows it. view=day: each phone's list for a day (posts to make, warmups due, what is done). view=open: posts handed to a person and not yet posted. view=posted: posts a person has marked posted, newest first. view=days_off: the days of the week nobody posts.",
  pages: ["/todo"],
  input: {
    view: z.enum(["day", "open", "posted", "days_off"]).optional().describe("day (default), open, posted or days_off."),
    day: z.number().int().min(-14).max(7).optional().describe("For view=day: 0 is today, -1 yesterday, 1 tomorrow."),
    since: z.string().optional().describe("For view=posted: only posts marked posted after this ISO date."),
    fields: fieldsInput,
    limit: limitInput,
    cursor: cursorInput,
  },
  run: async (args) => {
    const view = args.view ?? "day";
    const meta = { tool: "pm_todo", view, fleet: "physical" };
    if (view === "day") {
      const board = await getTodoBoard(args.day ?? 0);
      return reply({ day: args.day ?? 0, ...board }, { ...meta, ...stamp() });
    }
    if (view === "open") return listReply({ ...meta, ...stamp() }, await getOpenDeliveries(), args);
    if (view === "posted") {
      const rows = await getPostedDeliveries({ since: args.since, limit: READ_CAP });
      const note = rows.length >= READ_CAP ? `Only the newest ${READ_CAP} are read, so total is at least ${READ_CAP}. Pass since to narrow.` : undefined;
      return listReply({ ...meta, ...stamp(), note }, rows, args);
    }
    const off = await getDaysOff();
    return reply({ daysOff: off.map((d) => DAY_NAMES[d] ?? d) }, { ...meta, ...stamp() });
  },
});
