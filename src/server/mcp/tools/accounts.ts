import { z } from "zod";
import { getAccounts, type AccountRow } from "@/lib/data/accounts";
import { inFleet } from "@/lib/fleet";
import { defineTool } from "@/server/mcp/registry";
import {
  cursorInput,
  detailInput,
  fieldsInput,
  fleetInput,
  fleetOf,
  limitInput,
  listReply,
  only,
  stamp,
} from "@/server/mcp/tools/common";

const SUMMARY_KEYS = [
  "profile",
  "username",
  "displayName",
  "character",
  "platform",
  "deliveryMode",
  "deviceId",
  "isActive",
  "paused",
  "healthStatus",
  "healthReason",
  "healthCaveat",
  "tier",
  "ageDays",
  "med5",
  "med7d",
  "med28d",
  "suppressedPct",
  "postingErrors",
  "warmupErrors",
  "daysSincePost",
  "daysSinceWarmup",
  "bannedAt",
  "statusNote",
] as const satisfies readonly (keyof AccountRow)[];

/** The Accounts page: one row per account, banned and retired included. */
export const pmAccounts = defineTool({
  name: "pm_accounts",
  title: "Accounts",
  description:
    "Every account on one fleet, as the Accounts page shows it: character, platform, health verdict and the reason behind it, tier, account age, median views (last 5 posts, 7 days, 28 days), share of posts suppressed, posting and warmup errors, days since the last post and warmup, ban date. Filter by character, platform, health or active. Use pm_account for one account in depth.",
  pages: ["/accounts", "/settings"],
  input: {
    fleet: fleetInput,
    character: z.string().optional().describe('Only this character, e.g. "Character 6".'),
    platform: z.enum(["tiktok", "instagram", "facebook"]).optional(),
    health: z.string().optional().describe("Only this health verdict, e.g. healthy, watch, collapsing, banned, warming, idle."),
    active: z.boolean().optional().describe("true for active accounts only, false for inactive only."),
    detail: detailInput,
    fields: fieldsInput,
    limit: limitInput,
    cursor: cursorInput,
  },
  run: async (args) => {
    const fleet = fleetOf(args.fleet);
    const accounts = await getAccounts();
    let rows = inFleet(accounts.data, fleet);
    if (args.character) rows = rows.filter((r) => r.character.toLowerCase() === args.character!.toLowerCase());
    if (args.platform) rows = rows.filter((r) => r.platform === args.platform);
    if (args.health) rows = rows.filter((r) => r.healthStatus.toLowerCase() === args.health!.toLowerCase());
    if (args.active !== undefined) rows = rows.filter((r) => r.isActive === args.active);
    const shaped = args.detail === "full" || args.fields?.length ? rows : rows.map((r) => only(r, SUMMARY_KEYS));
    return listReply({ tool: "pm_accounts", view: "list", fleet, ...stamp(accounts) }, shaped, args);
  },
});
