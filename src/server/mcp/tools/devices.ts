import { z } from "zod";
import { getDevice, getDevices } from "@/lib/data/devices";
import { getPhysicalProfiles, limitProxyData } from "@/lib/data/fleet-accounts";
import { getProxyPhoneData } from "@/lib/data/proxies";
import { getPhoneProxyData } from "@/lib/data/proxies-phones";
import { defineTool } from "@/server/mcp/registry";
import { failure, reply } from "@/server/mcp/shape";
import { cursorInput, fieldsInput, fleetInput, fleetOf, limitInput, listReply, stamp } from "@/server/mcp/tools/common";

/**
 * The Devices pages and the Proxies and numbers page. Proxy addresses and
 * phone numbers come back masked (shape.ts); proxy logins are never read.
 */
export const pmDevices = defineTool({
  name: "pm_devices",
  title: "Phones, proxies and numbers",
  description:
    "The phone fleet. view=list: every real iPhone, its model, iOS version, time zone, whether it is active, and the accounts on it. view=device: one phone by id. view=proxies: the Proxies and numbers page for a fleet: each phone's proxy (address masked), its subscription and days left, and each account's number (masked) with its rental and days left.",
  pages: ["/devices", "/devices/[id]", "/proxies"],
  input: {
    view: z.enum(["list", "device", "proxies"]).optional().describe("list (default), device or proxies."),
    id: z.number().int().optional().describe("For view=device: the phone's id."),
    fleet: fleetInput,
    fields: fieldsInput,
    limit: limitInput,
    cursor: cursorInput,
  },
  run: async (args) => {
    const view = args.view ?? "list";
    if (view === "list") {
      const res = await getDevices();
      return listReply({ tool: "pm_devices", view, fleet: "physical", ...stamp(res) }, res.data, args);
    }
    if (view === "device") {
      if (args.id === undefined) return failure("pm_devices", "view=device needs id. Use view=list to see the ids.");
      const res = await getDevice(args.id);
      if (!res.data) return failure("pm_devices", `No phone with id ${args.id}.`);
      return reply(res.data, { tool: "pm_devices", view, fleet: "physical", ...stamp(res) });
    }
    const fleet = fleetOf(args.fleet);
    if (fleet === "physical") {
      const data = await getPhoneProxyData();
      return listReply({ tool: "pm_devices", view, fleet, ...stamp(data) }, data.rows, args);
    }
    const [data, physical] = await Promise.all([getProxyPhoneData(), getPhysicalProfiles()]);
    const { rows, ...rest } = limitProxyData(data, fleet, new Set(physical.data));
    return listReply({ tool: "pm_devices", view, fleet, ...stamp() }, rows, args, rest);
  },
});
