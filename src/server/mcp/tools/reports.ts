import { z } from "zod";
import { getPhysicalProfiles, limitIncidents } from "@/lib/data/fleet-accounts";
import { getIncidentHistory } from "@/lib/data/incidents";
import { getReports } from "@/lib/data/reports";
import { defineTool } from "@/server/mcp/registry";
import { cursorInput, fieldsInput, fleetInput, fleetOf, limitInput, listReply, stamp } from "@/server/mcp/tools/common";

/** The Reports page (issues and observations) and the Incidents page. */
export const pmReports = defineTool({
  name: "pm_reports",
  title: "Reports and incidents",
  description:
    "What the team has reported and what went wrong. view=reports: issues and observations from the Reports page, newest first, with the accounts and posts each names (screenshots are private and not linked). view=incidents: the incident history (bans, failed posts, proxy and warmup trouble) for a range, limited to the fleet.",
  pages: ["/reports", "/incidents"],
  input: {
    view: z.enum(["reports", "incidents"]).optional().describe("reports (default) or incidents."),
    fleet: fleetInput,
    kind: z.enum(["issue", "observation"]).optional().describe("For view=reports: only issues or only observations."),
    status: z.string().optional().describe("For view=reports: only issues with this status, e.g. open or fixed."),
    range: z.enum(["7d", "30d", "90d", "all"]).optional().describe("For view=incidents. Default 30d."),
    fields: fieldsInput,
    limit: limitInput,
    cursor: cursorInput,
  },
  run: async (args) => {
    const view = args.view ?? "reports";
    if (view === "reports") {
      let rows = await getReports();
      if (args.kind) rows = rows.filter((r) => r.kind === args.kind);
      if (args.status) rows = rows.filter((r) => (r.status ?? "").toLowerCase() === args.status!.toLowerCase());
      return listReply({ tool: "pm_reports", view, ...stamp() }, rows, args);
    }
    const fleet = fleetOf(args.fleet);
    const [history, physical] = await Promise.all([getIncidentHistory(args.range ?? "30d"), getPhysicalProfiles()]);
    const rows = limitIncidents(history.data, fleet, new Set(physical.data));
    return listReply({ tool: "pm_reports", view, fleet, ...stamp(history) }, rows, args, { range: args.range ?? "30d" });
  },
});
