import { z } from "zod";
import { getWarmupReportDiary } from "@/lib/data/warmup-reports";
import { getWarmupOverview } from "@/lib/data/warmup-overview";
import { getRunsOnDay } from "@/lib/data/warmup-runs";
import { getSessionsOnDay } from "@/lib/data/warmup-sessions";
import { defineTool } from "@/server/mcp/registry";
import { failure, reply } from "@/server/mcp/shape";
import { cursorInput, fieldsInput, limitInput, listReply, stamp } from "@/server/mcp/tools/common";

/** The Warmups page. Physical fleet only, as the page is. */
export const pmWarmups = defineTool({
  name: "pm_warmups",
  title: "Warmups",
  description:
    "Account warm-up on the physical fleet. view=overview: the Warmups page (each account's recent warmups, who did them, gaps and overdue accounts). view=runs: the warmup robot's runs on one day. view=sessions: every warmup session logged on one day, by hand or by the robot. view=diary: one robot report with its step-by-step diary, by report id (pm_account view=warmup_reports lists them).",
  pages: ["/warmups"],
  input: {
    view: z.enum(["overview", "runs", "sessions", "diary"]).optional().describe("overview (default), runs, sessions or diary."),
    day: z.number().int().min(-30).max(0).optional().describe("For runs and sessions: 0 is today, -1 yesterday."),
    id: z.string().optional().describe("For view=diary: the warmup report id."),
    fields: fieldsInput,
    limit: limitInput,
    cursor: cursorInput,
  },
  run: async (args) => {
    const view = args.view ?? "overview";
    const meta = { tool: "pm_warmups", view, fleet: "physical", ...stamp() };
    if (view === "overview") return reply(await getWarmupOverview(), meta);
    if (view === "runs") return listReply(meta, await getRunsOnDay(args.day ?? 0), args, { day: args.day ?? 0 });
    if (view === "sessions") return listReply(meta, await getSessionsOnDay({}, args.day ?? 0), args, { day: args.day ?? 0 });
    if (!args.id) return failure("pm_warmups", "view=diary needs id.");
    const diary = await getWarmupReportDiary(args.id);
    if (!diary) return failure("pm_warmups", `No warmup report with id ${args.id}.`);
    return reply(diary, meta);
  },
});
