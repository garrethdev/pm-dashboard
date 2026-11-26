import { getAutomationStatuses, workflowsForFleet } from "@/lib/data/automation";
import { getN8nHealth } from "@/lib/data/n8n-health";
import { defineTool } from "@/server/mcp/registry";
import { reply } from "@/server/mcp/shape";
import { fleetInput, fleetOf, stamp } from "@/server/mcp/tools/common";

/** The Automation page: the daily n8n workflows and how their last runs went. */
export const pmAutomation = defineTool({
  name: "pm_automation",
  title: "Automation",
  description:
    "The daily n8n workflows for one fleet, as the Automation page shows them: each workflow's status, when it last ran, whether it succeeded, and its recent errors. Also says whether n8n itself looks down.",
  pages: ["/automation"],
  input: { fleet: fleetInput },
  run: async (args) => {
    const fleet = fleetOf(args.fleet);
    const [statuses, health] = await Promise.all([getAutomationStatuses(), getN8nHealth().catch(() => null)]);
    return reply(
      { workflows: workflowsForFleet(statuses.rows, fleet), n8n: health?.data ?? null },
      { tool: "pm_automation", view: "workflows", fleet, ...stamp({ fetchedAt: statuses.fetchedAt }) },
    );
  },
});
