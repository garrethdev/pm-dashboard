import { z } from "zod";
import { getCharacterSummaries } from "@/lib/data/characters";
import { CT_DEFAULT_RANGE, getContentTypes } from "@/lib/data/content-types";
import { getFleetDefaults } from "@/lib/data/scheduler-config";
import { defineTool } from "@/server/mcp/registry";
import { reply } from "@/server/mcp/shape";
import { fleetInput, fleetOf, stamp } from "@/server/mcp/tools/common";

/** The Content types page and the characters behind it. */
export const pmContentTypes = defineTool({
  name: "pm_content_types",
  title: "Content types",
  description:
    "The content lanes, as the Content types page shows them. view=lanes: every registered content type with its status, posts a week, how it performed over the range, and which characters may post it. view=characters: each character, whether it is active, its accounts and the lanes it may post.",
  pages: ["/content-types"],
  input: {
    view: z.enum(["lanes", "characters"]).optional().describe("lanes (default) or characters."),
    fleet: fleetInput,
    range: z.enum(["7d", "14d", "30d", "all"]).optional().describe("For view=lanes: the performance window. Default 30d."),
  },
  run: async (args) => {
    const view = args.view ?? "lanes";
    if (view === "characters") {
      return reply(await getCharacterSummaries(), { tool: "pm_content_types", view, ...stamp() });
    }
    const fleet = fleetOf(args.fleet);
    const defaults = await getFleetDefaults();
    const res = await getContentTypes(args.range ?? CT_DEFAULT_RANGE, defaults.data.glpWeek, fleet);
    return reply(res.data, { tool: "pm_content_types", view, fleet, ...stamp(res) });
  },
});
