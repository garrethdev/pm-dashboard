import { z } from "zod";
import { getN8nHealth } from "@/lib/data/n8n-health";
import { getNotifications } from "@/lib/data/notifications";
import { getPipelineFacts } from "@/lib/data/pipeline-health";
import { getPulse } from "@/lib/data/pulse";
import { getTodoBoard } from "@/lib/data/todo";
import { defineTool } from "@/server/mcp/registry";
import { reply } from "@/server/mcp/shape";
import { cursorInput, fleetInput, fleetOf, limitInput, listReply, stamp } from "@/server/mcp/tools/common";

/** The home page and the bell. */
export const pmOverview = defineTool({
  name: "pm_overview",
  title: "Today at a glance",
  description:
    "Start here. view=summary: the headline counts (active accounts, bans today), whether the content pipeline and n8n are healthy, how many bell notifications are open, and, on the physical fleet, the day's posting to-do totals. view=notifications: the bell feed itself, newest first, for both fleets (each item names its fleet).",
  pages: ["/"],
  input: {
    view: z.enum(["summary", "notifications"]).optional().describe("summary (default) or notifications."),
    fleet: fleetInput,
    limit: limitInput,
    cursor: cursorInput,
  },
  run: async (args, caller) => {
    const view = args.view ?? "summary";
    const fleet = fleetOf(args.fleet);

    if (view === "notifications") {
      // The bell shows both fleets on purpose (PF-20), so this does too.
      const items = await getNotifications(caller.email);
      return listReply({ tool: "pm_overview", view, ...stamp() }, items, args);
    }

    const [pulse, pipeline, n8n, notifications, todo] = await Promise.all([
      getPulse(),
      getPipelineFacts().catch((err: unknown) => ({ error: String(err) })),
      getN8nHealth().catch(() => null),
      getNotifications(caller.email).catch(() => []),
      fleet === "physical" ? getTodoBoard().catch(() => null) : Promise.resolve(null),
    ]);

    const todoSummary = todo
      ? {
          dayOff: todo.dayOff,
          phones: todo.devices.length,
          extras: todo.extras,
        }
      : null;

    return reply(
      {
        pulse: pulse.data,
        pipeline,
        n8n: n8n?.data ?? null,
        notifications: {
          open: notifications.length,
          critical: notifications.filter((n) => n.severity === "critical").length,
          newest: notifications.slice(0, 5).map((n) => ({ title: n.title, severity: n.severity, category: n.category, at: n.at })),
        },
        todo: todoSummary,
      },
      { tool: "pm_overview", view, fleet, ...stamp(pulse) },
    );
  },
});
