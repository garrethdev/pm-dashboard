import { z } from "zod";
import { getAccounts } from "@/lib/data/accounts";
import { getCadence } from "@/lib/data/cadence";
import { getCalendarDay, getCalendarMonth, getRecentSchedulerRun } from "@/lib/data/calendar";
import { getFleetDefaultsLive, getSchedulerConfig, limitSchedulerConfig } from "@/lib/data/scheduler-config";
import { inFleet } from "@/lib/fleet";
import { defineTool } from "@/server/mcp/registry";
import { reply } from "@/server/mcp/shape";
import { cursorInput, fieldsInput, fleetInput, fleetOf, limitInput, listReply, stamp, todayEt } from "@/server/mcp/tools/common";

/** The Content calendar page: the month, a day, the scheduler's last run, the cadence and the per-account limits. */
export const pmCalendar = defineTool({
  name: "pm_calendar",
  title: "Content calendar",
  description:
    "The posting schedule, as the Content calendar page shows it. view=month: each day's planned and posted counts for a month. view=day: every post planned for one day, by account and content type. view=last_run: when the Smart Scheduler last ran and what it planned. view=cadence: the lane mix (posts a week per content type) and the fleet defaults (posts a day, gap, window). view=limits: each account's resolved caps today, and which accounts are blocked, throttled or paused.",
  pages: ["/content-calendar"],
  input: {
    view: z.enum(["month", "day", "last_run", "cadence", "limits"]).optional().describe("month (default), day, last_run, cadence or limits."),
    fleet: fleetInput,
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional()
      .describe("For view=month: YYYY-MM. Default this month (New York time)."),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("For view=day: YYYY-MM-DD. Default today (New York time)."),
    fields: fieldsInput,
    limit: limitInput,
    cursor: cursorInput,
  },
  run: async (args) => {
    const view = args.view ?? "month";
    const fleet = fleetOf(args.fleet);
    const meta = { tool: "pm_calendar", view, fleet };

    if (view === "month") {
      const ym = args.month ?? todayEt().slice(0, 7);
      const res = await getCalendarMonth(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), fleet);
      return reply(res.data, { ...meta, ...stamp(res) });
    }
    if (view === "day") {
      const res = await getCalendarDay(args.date ?? todayEt(), fleet);
      return reply(res.data, { ...meta, ...stamp(res) });
    }
    if (view === "last_run") {
      // The scheduler plans every fleet in one run, so this has no fleet.
      return reply(await getRecentSchedulerRun(), { tool: "pm_calendar", view, ...stamp() });
    }
    if (view === "cadence") {
      const [cadence, defaults] = await Promise.all([getCadence(), getFleetDefaultsLive()]);
      return reply({ cadence: cadence.data, fleetDefaults: defaults.data }, { tool: "pm_calendar", view, ...stamp(cadence) });
    }
    // limits: the page narrows the scheduler's rows to the fleet's accounts.
    const [config, accounts] = await Promise.all([getSchedulerConfig(), getAccounts()]);
    const mine = new Set(inFleet(accounts.data, fleet).map((a) => a.profile));
    const data = limitSchedulerConfig(config.data, mine);
    const { rows, ...counts } = data;
    return listReply({ ...meta, ...stamp(config) }, rows, args, counts);
  },
});
