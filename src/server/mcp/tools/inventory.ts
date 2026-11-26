import { z } from "zod";
import { getDemandSupply, getInventory, INVENTORY_RANGES } from "@/lib/data/inventory";
import { defineTool } from "@/server/mcp/registry";
import { reply } from "@/server/mcp/shape";
import { fleetInput, fleetOf, stamp } from "@/server/mcp/tools/common";

/** The Inventory page: ready stock per content type, and demand against supply. */
export const pmInventory = defineTool({
  name: "pm_inventory",
  title: "Inventory",
  description:
    "Content stock, as the Inventory page shows it. view=stock: per content type, how many posts are ready, how many are still to do, and the buffer in days. view=demand: for a 7, 14 or 30 day window, the posts the accounts will ask for against what is ready, per content type, with an optional what-if of extra new accounts for one character.",
  pages: ["/inventory"],
  input: {
    view: z.enum(["stock", "demand"]).optional().describe("stock (default) or demand."),
    fleet: fleetInput,
    range: z.enum(["7d", "14d", "30d"]).optional().describe("For view=demand. Default 14d."),
    newAccounts: z.number().int().min(0).max(50).optional().describe("For view=demand: a what-if of this many new accounts."),
    character: z.string().optional().describe('For the what-if: which character the new accounts are, e.g. "Character 6".'),
  },
  run: async (args) => {
    const view = args.view ?? "stock";
    const fleet = fleetOf(args.fleet);
    if (view === "stock") {
      const res = await getInventory(fleet);
      return reply(res.data, { tool: "pm_inventory", view, fleet, ...stamp(res) });
    }
    const range = INVENTORY_RANGES.find((r) => r.key === (args.range ?? "14d")) ?? INVENTORY_RANGES[1];
    const extra = args.newAccounts ?? 0;
    const res = await getDemandSupply(range.days, extra, extra > 0 ? (args.character ?? null) : null, fleet);
    return reply({ range: range.key, newAccounts: extra, ...res.data }, { tool: "pm_inventory", view, fleet, ...stamp(res) });
  },
});
